from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Type

from sqlalchemy import desc, asc
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password


def get_or_create_demo_user(db: Session):
    from app.models import User

    user = db.query(User).filter(User.email == settings.DEMO_USER_EMAIL).first()
    if not user:
        user = User(
            id=str(uuid.uuid4()),
            email=settings.DEMO_USER_EMAIL,
            full_name=settings.DEMO_USER_NAME,
            avatar_url=None,
            hashed_password=hash_password(settings.DEMO_USER_PASSWORD),
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def _parse_sort(sort_str: str):
    if sort_str.startswith("-"):
        return sort_str[1:], True
    return sort_str, False


def entity_list(db: Session, model: Type, owner_id: str, sort: str = "-updated_date", limit: int = 50) -> List:
    col_name, descending = _parse_sort(sort)
    col = getattr(model, col_name, None) or getattr(model, "updated_date", model.created_date)
    q = db.query(model).filter(model.created_by == owner_id)
    q = q.order_by(desc(col) if descending else asc(col))
    return q.limit(limit).all()


def entity_filter(db: Session, model: Type, owner_id: str, filters: Dict[str, Any], sort: str = "-updated_date", limit: int = 50) -> List:
    col_name, descending = _parse_sort(sort)
    col = getattr(model, col_name, None) or getattr(model, "updated_date", model.created_date)
    q = db.query(model).filter(model.created_by == owner_id)
    for field, value in filters.items():
        if hasattr(model, field):
            q = q.filter(getattr(model, field) == value)
    q = q.order_by(desc(col) if descending else asc(col))
    return q.limit(limit).all()


def entity_get(db: Session, model: Type, owner_id: str, record_id: str) -> Optional[Any]:
    return db.query(model).filter(model.id == record_id, model.created_by == owner_id).first()


def entity_create(db: Session, model: Type, owner_id: str, data: Dict[str, Any]) -> Any:
    valid_cols = {c.name for c in model.__table__.columns}
    clean = {k: v for k, v in data.items() if k in valid_cols}
    clean["id"] = str(uuid.uuid4())
    clean["created_by"] = owner_id
    clean["created_date"] = datetime.now(timezone.utc)
    clean["updated_date"] = datetime.now(timezone.utc)
    record = model(**clean)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def entity_update(db: Session, model: Type, owner_id: str, record_id: str, data: Dict[str, Any]) -> Optional[Any]:
    record = entity_get(db, model, owner_id, record_id)
    if not record:
        return None
    valid_cols = {c.name for c in model.__table__.columns}
    for key, value in data.items():
        if key in valid_cols and key not in ("id", "created_by", "created_date"):
            setattr(record, key, value)
    record.updated_date = datetime.now(timezone.utc)
    db.commit()
    db.refresh(record)
    return record


def entity_delete(db: Session, model: Type, owner_id: str, record_id: str) -> bool:
    record = entity_get(db, model, owner_id, record_id)
    if not record:
        return False
    db.delete(record)
    db.commit()
    return True
