"""File storage service — saves to local disk at UPLOAD_DIR."""
from __future__ import annotations

import uuid
from pathlib import Path
from typing import Optional, Tuple

from app.core.config import settings


def _ensure_upload_dir():
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)


def save_file(file_bytes: bytes, original_filename: str) -> Tuple[str, str]:
    """Save bytes to disk. Returns (file_url, file_id)."""
    _ensure_upload_dir()
    ext = Path(original_filename).suffix.lower()
    file_id = str(uuid.uuid4())
    stored_name = f"{file_id}{ext}"
    dest = Path(settings.UPLOAD_DIR) / stored_name
    dest.write_bytes(file_bytes)
    return f"/api/files/{stored_name}", file_id


def get_file_path(filename: str) -> Optional[Path]:
    """Return the absolute path to a stored file, or None if not found."""
    path = Path(settings.UPLOAD_DIR) / filename
    return path if path.exists() else None
