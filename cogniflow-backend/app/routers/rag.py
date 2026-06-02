"""RAG document management endpoints — ingest, delete."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_optional_user
from app.models import User
from app.services import chunker as chunker_svc
from app.services import embeddings as embedding_svc
from app.services import vector_store as vs_svc

router = APIRouter(prefix="/api/ai/documents", tags=["rag"])


# ── Schemas ────────────────────────────────────────────────────────────────────

class IngestRequest(BaseModel):
    doc_text: str = Field(..., min_length=10)
    doc_name: Optional[str] = "document"


class IngestResponse(BaseModel):
    doc_id: str
    chunk_count: int
    doc_name: str


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/ingest", response_model=IngestResponse)
def ingest_document(
    body: IngestRequest,
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """
    Chunk, embed, and store a document in the vector store.

    The returned `doc_id` should be passed to downstream AI endpoints
    (/api/ai/chat, /api/ai/viva/*, /api/ai/gap-analysis) in place of
    raw `doc_text` so that only the most semantically relevant excerpts
    are injected into each prompt.
    """
    try:
        chunks = chunker_svc.chunk_text(body.doc_text)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Chunking failed: {exc}")

    if not chunks:
        raise HTTPException(
            status_code=422,
            detail="No text chunks could be extracted from the document. "
                   "Ensure the file contains readable text.",
        )

    try:
        embeddings = embedding_svc.embed_texts(chunks)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Embedding failed: {exc}")

    try:
        doc_id = vs_svc.ingest_document(
            doc_text=body.doc_text,
            doc_name=body.doc_name or "document",
            chunks=chunks,
            embeddings=embeddings,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Vector store ingestion failed: {exc}")

    return IngestResponse(
        doc_id=doc_id,
        chunk_count=len(chunks),
        doc_name=body.doc_name or "document",
    )


@router.delete("/{doc_id}", status_code=204)
def delete_document(
    doc_id: str,
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Delete all chunks for a document from the vector store."""
    try:
        vs_svc.delete_document(doc_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Deletion failed: {exc}")
