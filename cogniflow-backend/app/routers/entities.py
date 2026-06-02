from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_optional_user
from app.models import ENTITY_MAP, User
from app.services import crud

router = APIRouter(prefix="/api/entities", tags=["entities"])


def _get_model(entity_name: str):
    model = ENTITY_MAP.get(entity_name)
    if not model:
        raise HTTPException(status_code=404, detail=f"Entity '{entity_name}' not found")
    return model


def _model_to_dict(record) -> Dict[str, Any]:
    d = {}
    for col in record.__table__.columns:
        val = getattr(record, col.name)
        if hasattr(val, "isoformat"):
            val = val.isoformat()
        d[col.name] = val
    return d


@router.get("/{entity_name}/list")
def list_entities(
    entity_name: str,
    sort: str = Query(default="-updated_date"),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_user),
) -> List[Dict]:
    model = _get_model(entity_name)
    records = crud.entity_list(db, model, current_user.id, sort=sort, limit=limit)
    return [_model_to_dict(r) for r in records]


@router.get("/{entity_name}/filter")
def filter_entities(
    entity_name: str,
    sort: str = Query(default="-updated_date"),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_user),
    project_id: Optional[str] = Query(default=None),
    type: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    gap_type: Optional[str] = Query(default=None),
    field: Optional[str] = Query(default=None),
    stage: Optional[str] = Query(default=None),
    document_type: Optional[str] = Query(default=None),
) -> List[Dict]:
    model = _get_model(entity_name)
    raw_filters = {
        "project_id": project_id,
        "type": type,
        "status": status,
        "gap_type": gap_type,
        "field": field,
        "stage": stage,
        "document_type": document_type,
    }
    filters = {k: v for k, v in raw_filters.items() if v is not None}
    records = crud.entity_filter(db, model, current_user.id, filters, sort=sort, limit=limit)
    return [_model_to_dict(r) for r in records]


@router.get("/{entity_name}/{record_id}")
def get_entity(
    entity_name: str,
    record_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_user),
) -> Dict:
    model = _get_model(entity_name)
    record = crud.entity_get(db, model, current_user.id, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return _model_to_dict(record)


@router.post("/{entity_name}", status_code=201)
def create_entity(
    entity_name: str,
    body: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_user),
) -> Dict:
    model = _get_model(entity_name)
    record = crud.entity_create(db, model, current_user.id, body)
    return _model_to_dict(record)


@router.put("/{entity_name}/{record_id}")
def update_entity(
    entity_name: str,
    record_id: str,
    body: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_user),
) -> Dict:
    model = _get_model(entity_name)
    record = crud.entity_update(db, model, current_user.id, record_id, body)
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return _model_to_dict(record)


@router.delete("/{entity_name}/{record_id}")
def delete_entity(
    entity_name: str,
    record_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_user),
) -> Dict:
    model = _get_model(entity_name)
    deleted = crud.entity_delete(db, model, current_user.id, record_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"deleted": True}
