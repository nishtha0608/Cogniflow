"""Token-aware recursive text splitter for RAG ingestion."""
from __future__ import annotations

from typing import List

CHUNK_SIZE = 500     # target tokens per chunk
CHUNK_OVERLAP = 100  # overlap tokens between consecutive chunks
MIN_CHUNK = 50       # discard tiny trailing fragments

# ---------------------------------------------------------------------------
# Token counter — uses tiktoken when available, falls back to char / 4
# ---------------------------------------------------------------------------

try:
    import tiktoken as _tiktoken

    _enc = _tiktoken.get_encoding("cl100k_base")

    def _token_len(text: str) -> int:
        return len(_enc.encode(text, disallowed_special=()))

except Exception:  # tiktoken not installed or encoding download failed

    def _token_len(text: str) -> int:  # type: ignore[misc]
        return max(1, len(text) // 4)


# ---------------------------------------------------------------------------
# Overlap helper
# ---------------------------------------------------------------------------

def _tail_overlap(text: str, n_tokens: int) -> str:
    """Return the last `n_tokens` tokens of `text` as a string."""
    if not text or n_tokens <= 0:
        return ""
    words = text.split()
    kept: List[str] = []
    acc = 0
    for word in reversed(words):
        wt = _token_len(word + " ")
        if acc + wt > n_tokens:
            break
        kept.insert(0, word)
        acc += wt
    return " ".join(kept)


# ---------------------------------------------------------------------------
# Core splitter
# ---------------------------------------------------------------------------

_SEPARATORS = ["\n\n", "\n", ". ", "! ", "? ", "; ", ", ", " "]


def chunk_text(
    text: str,
    chunk_size: int = CHUNK_SIZE,
    overlap: int = CHUNK_OVERLAP,
) -> List[str]:
    """
    Split `text` into overlapping token-sized chunks, preferring natural
    paragraph / sentence boundaries.

    Returns an ordered list of non-empty string chunks.
    """
    text = text.strip()
    if not text:
        return []

    if _token_len(text) <= chunk_size:
        return [text] if _token_len(text) >= MIN_CHUNK else []

    for sep in _SEPARATORS:
        parts = text.split(sep) if sep else list(text)
        if len(parts) < 2:
            continue

        chunks: List[str] = []
        current = ""
        current_tokens = 0

        for part in parts:
            segment = part + sep
            seg_tokens = _token_len(segment)

            if current_tokens + seg_tokens > chunk_size and current:
                # Flush current chunk
                stripped = current.strip()
                if _token_len(stripped) >= MIN_CHUNK:
                    chunks.append(stripped)
                # Start next chunk with overlap tail
                overlap_prefix = _tail_overlap(current, overlap)
                current = overlap_prefix + (" " if overlap_prefix else "") + segment
                current_tokens = _token_len(current)
            else:
                current += segment
                current_tokens += seg_tokens

        # Flush final window
        stripped = current.strip()
        if stripped and _token_len(stripped) >= MIN_CHUNK:
            chunks.append(stripped)

        if chunks:
            return chunks

    # Absolute fallback: hard-split by token window
    words = text.split()
    chunks = []
    bucket: List[str] = []
    bucket_tokens = 0

    for word in words:
        wt = _token_len(word + " ")
        if bucket_tokens + wt > chunk_size and bucket:
            joined = " ".join(bucket)
            if _token_len(joined) >= MIN_CHUNK:
                chunks.append(joined)
            overlap_words: List[str] = []
            acc = 0
            for w in reversed(bucket):
                wt2 = _token_len(w + " ")
                if acc + wt2 > overlap:
                    break
                overlap_words.insert(0, w)
                acc += wt2
            bucket = overlap_words + [word]
            bucket_tokens = _token_len(" ".join(bucket))
        else:
            bucket.append(word)
            bucket_tokens += wt

    if bucket:
        joined = " ".join(bucket)
        if _token_len(joined) >= MIN_CHUNK:
            chunks.append(joined)

    return chunks
