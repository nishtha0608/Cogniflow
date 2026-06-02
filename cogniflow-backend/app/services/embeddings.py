"""OpenAI text-embedding-3-small wrapper with deterministic mock fallback."""
from __future__ import annotations

import hashlib
import math
import random
from typing import List

from app.core.config import settings
from app.services.llm import _is_api_key_configured

EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIM = 1536
_BATCH_SIZE = 100  # OpenAI accepts up to 2048; stay conservative


# ---------------------------------------------------------------------------
# Mock embeddings — deterministic per text, unit-normalised
# ---------------------------------------------------------------------------

def _mock_embedding(text: str) -> List[float]:
    """Deterministic pseudo-unit-vector derived from text hash (dev / mock only)."""
    digest = hashlib.sha256(text.encode("utf-8", errors="replace")).digest()
    seed = int.from_bytes(digest[:8], "big")
    rng = random.Random(seed)
    vec = [rng.gauss(0, 1) for _ in range(EMBEDDING_DIM)]
    norm = math.sqrt(sum(x * x for x in vec)) or 1.0
    return [x / norm for x in vec]


# ---------------------------------------------------------------------------
# Real OpenAI call
# ---------------------------------------------------------------------------

def embed_texts(texts: List[str]) -> List[List[float]]:
    """
    Embed a list of strings.

    Falls back to deterministic mock vectors when no OpenAI key is configured
    or the API call fails.
    """
    if not texts:
        return []

    if not _is_api_key_configured():
        return [_mock_embedding(t) for t in texts]

    try:
        from openai import OpenAI

        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        all_embeddings: List[List[float]] = []

        for i in range(0, len(texts), _BATCH_SIZE):
            batch = [t.replace("\n", " ") for t in texts[i : i + _BATCH_SIZE]]
            resp = client.embeddings.create(model=EMBEDDING_MODEL, input=batch)
            # Preserve order returned by the API
            ordered = sorted(resp.data, key=lambda e: e.index)
            all_embeddings.extend(item.embedding for item in ordered)

        return all_embeddings

    except Exception as exc:
        print(f"[Embeddings] OpenAI error: {exc} — using mock vectors.")
        return [_mock_embedding(t) for t in texts]


def embed_query(query: str) -> List[float]:
    """Convenience wrapper to embed a single query string."""
    return embed_texts([query])[0]
