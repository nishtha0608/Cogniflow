"""Static file serving for uploaded files."""
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.services import storage

router = APIRouter(prefix="/api/files", tags=["files"])


@router.get("/{filename}")
def serve_file(filename: str):
    """Serve an uploaded file by name."""
    # Basic path traversal protection
    if ".." in filename or "/" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    path = storage.get_file_path(filename)
    if not path:
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(path=str(path), filename=filename)
