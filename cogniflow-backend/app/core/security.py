from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt as _bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db

bearer_scheme = HTTPBearer(auto_error=False)


# ── Firebase ID token verification ────────────────────────────────────────────

_firebase_app = None

def _get_firebase_app():
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app
    try:
        import firebase_admin
        from firebase_admin import credentials
        import os

        sa_path = os.path.join(os.path.dirname(__file__), "../../firebase-service-account.json")
        sa_path = os.path.abspath(sa_path)
        if os.path.exists(sa_path):
            cred = credentials.Certificate(sa_path)
            _firebase_app = firebase_admin.initialize_app(cred)
        elif settings.FIREBASE_PROJECT_ID:
            _firebase_app = firebase_admin.initialize_app()
    except Exception:
        pass
    return _firebase_app


def verify_firebase_token(id_token: str) -> Optional[dict]:
    """Verify a Firebase ID token using firebase-admin SDK. Returns decoded payload or None."""
    try:
        from firebase_admin import auth as _fb_auth
        _get_firebase_app()
        decoded = _fb_auth.verify_id_token(id_token)
        return decoded
    except Exception:
        return None


def hash_password(password: str) -> str:
    return _bcrypt.hashpw(password.encode("utf-8"), _bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return _bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    """Require authenticated user — raises 401 if no/invalid token."""
    from app.models import User

    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = db.query(User).filter(User.id == payload.get("sub")).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return user


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    """Return authenticated user or auto-create and return demo user if no token."""
    from app.models import User
    from app.services.crud import get_or_create_demo_user

    if not credentials:
        return get_or_create_demo_user(db)

    payload = decode_token(credentials.credentials)
    if not payload:
        return get_or_create_demo_user(db)

    user = db.query(User).filter(User.id == payload.get("sub")).first()
    if not user or not user.is_active:
        return get_or_create_demo_user(db)

    return user
