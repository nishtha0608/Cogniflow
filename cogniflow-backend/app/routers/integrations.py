"""Integrations router: InvokeLLM, UploadFile, ExtractDataFromUploadedFile."""
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_optional_user
from app.models import User
from app.schemas import (
    ExtractDataRequest,
    ExtractDataResponse,
    InvokeLLMRequest,
    InvokeLLMResponse,
    UploadFileResponse,
)
from app.services import llm as llm_service
from app.services import storage
from app.services import pdf as pdf_service

router = APIRouter(prefix="/api/integrations/Core", tags=["integrations"])


@router.post("/InvokeLLM", response_model=InvokeLLMResponse)
def invoke_llm(
    body: InvokeLLMRequest,
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Call Claude (or return mock) and return structured output."""
    result = llm_service.invoke_llm(
        prompt=body.prompt,
        system_prompt=body.system_prompt,
        response_json_schema=body.response_json_schema,
        add_context_from_internet=body.add_context_from_internet or False,
    )
    return InvokeLLMResponse(output=result)


@router.post("/UploadFile", response_model=UploadFileResponse)
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Accept multipart file upload, save to disk, return accessible URL."""
    MAX_SIZE = 50 * 1024 * 1024  # 50 MB

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 50 MB)")

    file_url, file_id = storage.save_file(content, file.filename or "upload.bin")
    return UploadFileResponse(file_url=file_url, file_id=file_id)


@router.post("/ExtractDataFromUploadedFile", response_model=ExtractDataResponse)
def extract_data(
    body: ExtractDataRequest,
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Extract text/metadata from an uploaded file (PDF supported)."""
    # file_url is like /api/files/{filename} — map to disk path
    file_url = body.file_url
    if file_url.startswith("/api/files/"):
        filename = file_url.split("/api/files/")[-1]
    else:
        filename = Path(file_url).name

    file_path = storage.get_file_path(filename)
    if not file_path:
        raise HTTPException(status_code=404, detail="File not found")

    if filename.lower().endswith(".pdf"):
        result = pdf_service.extract_from_path(file_path)
    else:
        # Plain text
        try:
            text = file_path.read_text(errors="replace")
        except Exception:
            text = ""
        result = {
            "text_content": text,
            "page_count": 1,
            "word_count": len(text.split()),
        }

    return ExtractDataResponse(output=result)
