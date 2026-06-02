from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, EmailStr


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenRefresh(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    created_date: Optional[datetime] = None
    updated_date: Optional[datetime] = None

    class Config:
        from_attributes = True


class InvokeLLMRequest(BaseModel):
    prompt: str
    system_prompt: Optional[str] = None
    add_context_from_internet: Optional[bool] = False
    response_json_schema: Optional[Dict] = None
    mode: Optional[str] = None
    file_urls: Optional[List[str]] = None


class InvokeLLMResponse(BaseModel):
    output: Any


class UploadFileResponse(BaseModel):
    file_url: str
    file_id: str


class ExtractDataRequest(BaseModel):
    file_url: str
    json_schema: Optional[Dict] = None


class ExtractDataResponse(BaseModel):
    output: Any
