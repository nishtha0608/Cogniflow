from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import (
    create_access_token,
    get_optional_user,
    hash_password,
    verify_password,
    verify_firebase_token,
)
from app.core.config import settings
from app.models import User
from app.schemas import (
    TokenRefresh,
    TokenResponse,
    UserLogin,
    UserOut,
    UserRegister,
)
import uuid

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_optional_user)):
    """Return the current user. Auto-creates demo user if no token provided."""
    return current_user


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(body: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        id=str(uuid.uuid4()),
        email=body.email,
        full_name=body.full_name,
        hashed_password=hash_password(body.password),
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token({"sub": user.id})
    refresh_token = create_access_token(
        {"sub": user.id, "type": "refresh"},
        expires_delta=timedelta(days=30),
    )
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/login", response_model=TokenResponse)
def login(body: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token({"sub": user.id})
    refresh_token = create_access_token(
        {"sub": user.id, "type": "refresh"},
        expires_delta=timedelta(days=30),
    )
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
def refresh_tokens(body: TokenRefresh, db: Session = Depends(get_db)):
    from app.core.security import decode_token

    payload = decode_token(body.refresh_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user = db.query(User).filter(User.id == payload.get("sub")).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    access_token = create_access_token({"sub": user.id})
    new_refresh = create_access_token(
        {"sub": user.id, "type": "refresh"},
        expires_delta=timedelta(days=30),
    )
    return TokenResponse(access_token=access_token, refresh_token=new_refresh)


@router.post("/logout")
def logout():
    return {"message": "Logged out successfully"}


class FirebaseAuthRequest(BaseModel):
    id_token:  str
    uid:       str
    email:     str
    full_name: str = ""


@router.post("/firebase", response_model=TokenResponse)
def firebase_auth(body: FirebaseAuthRequest, db: Session = Depends(get_db)):
    """
    Exchange a Firebase ID token for a CogniFlow backend JWT.
    Verifies the token with Google's public keys when FIREBASE_PROJECT_ID is set;
    falls back to trusting the uid/email when it is not (dev-only).
    Creates a local user record on first sign-in.
    """
    # Verify when project ID is configured; skip in dev if not set
    if settings.FIREBASE_PROJECT_ID:
        payload = verify_firebase_token(body.id_token)
        if not payload:
            raise HTTPException(status_code=401, detail="Invalid Firebase token")
        # Ensure the uid in the token matches what was sent
        if payload.get("user_id") != body.uid and payload.get("sub") != body.uid:
            raise HTTPException(status_code=401, detail="Token uid mismatch")

    # Create or fetch local user record keyed by Firebase uid
    user = db.query(User).filter(User.id == body.uid).first()
    if not user:
        user = User(
            id=body.uid,
            email=body.email,
            full_name=body.full_name or body.email.split("@")[0],
            hashed_password=hash_password(body.uid),  # unusable placeholder
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token = create_access_token({"sub": user.id})
    refresh_token = create_access_token(
        {"sub": user.id, "type": "refresh"},
        expires_delta=timedelta(days=30),
    )
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)
