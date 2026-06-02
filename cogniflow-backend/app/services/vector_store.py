"""
ChromaDB embedded vector store for RAG document management.

Uses PersistentClient (file-backed, no separate server process needed).
All document chunks are stored in a single collection with `doc_id` metadata
so they can be filtered per-document at query time.
"""
from __future__ import annotations

import os
import uuid
from typing import List, Optional

from app.core.config import settings

_COLLECTION_NAME = "cogniflow_docs"

# Module-level singletons — initialised lazily on first call
_client = None
_collection = None


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _get_collection():
    global _client, _collection
    if _collection is not None:
        return _collection

    try:
        import chromadb
        from chromadb.config import Settings as _ChromaSettings

        persist_dir: str = getattr(settings, "CHROMA_PATH", "/app/chroma")
        os.makedirs(persist_dir, exist_ok=True)

        _client = chromadb.PersistentClient(
            path=persist_dir,
            settings=_ChromaSettings(anonymized_telemetry=False),
        )
        _collection = _client.get_or_create_collection(
            name=_COLLECTION_NAME,
            # cosine distance so that semantic similarity is well-calibrated
            metadata={"hnsw:space": "cosine"},
        )
        return _collection

    except Exception as exc:
        raise RuntimeError(f"[VectorStore] ChromaDB init failed: {exc}") from exc


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def ingest_document(
    doc_text: str,
    doc_name: str,
    chunks: List[str],
    embeddings: List[List[float]],
    doc_id: Optional[str] = None,
) -> str:
    """
    Store document chunks + embeddings in ChromaDB.

    Returns the doc_id (auto-generated UUID if not supplied).
    Raises RuntimeError if ChromaDB is unavailable.
    """
    if not chunks:
        raise ValueError("chunks list is empty")
    if len(chunks) != len(embeddings):
        raise ValueError("chunks and embeddings must have the same length")

    if not doc_id:
        doc_id = str(uuid.uuid4())

    collection = _get_collection()

    ids = [f"{doc_id}::chunk::{i}" for i in range(len(chunks))]
    metadatas = [
        {"doc_id": doc_id, "doc_name": doc_name, "chunk_index": i}
        for i in range(len(chunks))
    ]

    collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=chunks,
        metadatas=metadatas,
    )

    return doc_id


def retrieve_chunks(
    doc_id: str,
    query_embedding: List[float],
    top_k: int = 6,
) -> List[str]:
    """
    Return the `top_k` chunks most semantically similar to `query_embedding`
    from the document identified by `doc_id`.

    Returns an empty list if the document is not found or ChromaDB is unavailable.
    """
    try:
        collection = _get_collection()

        # Guard against requesting more results than exist for this doc
        count_result = collection.get(where={"doc_id": doc_id}, include=[])
        n_available = len(count_result.get("ids", []))
        if n_available == 0:
            return []

        k = min(top_k, n_available)

        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=k,
            where={"doc_id": doc_id},
            include=["documents"],
        )
        return results.get("documents", [[]])[0]

    except Exception as exc:
        print(f"[VectorStore] retrieve_chunks error: {exc}")
        return []


def delete_document(doc_id: str) -> None:
    """Remove all chunks for a document. Silently ignores unknown doc_ids."""
    try:
        collection = _get_collection()
        result = collection.get(where={"doc_id": doc_id}, include=[])
        ids_to_delete = result.get("ids", [])
        if ids_to_delete:
            collection.delete(ids=ids_to_delete)
    except Exception as exc:
        print(f"[VectorStore] delete_document error: {exc}")


def document_chunk_count(doc_id: str) -> int:
    """Return how many chunks are stored for a document (0 if unknown)."""
    try:
        collection = _get_collection()
        result = collection.get(where={"doc_id": doc_id}, include=[])
        return len(result.get("ids", []))
    except Exception:
        return 0
