"""Paper search, DOI lookup, recommendations, and citation export via OpenAlex."""
from typing import Optional
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel

from app.services.openalex import (
    search_papers,
    get_paper_by_doi,
    get_recommendations,
    format_citation,
)

router = APIRouter(prefix="/api/papers", tags=["papers"])


@router.get("/search")
def search(
    q: str = Query(..., min_length=2),
    year_from: Optional[int] = Query(None),
    year_to: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
):
    return search_papers(q, year_from=year_from, year_to=year_to, page=page, per_page=per_page)


@router.get("/doi")
def by_doi(doi: str = Query(...)):
    paper = get_paper_by_doi(doi)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    return paper


@router.get("/recommendations")
def recommendations(
    keywords: str = Query(..., description="Comma-separated keywords"),
    limit: int = Query(10, ge=1, le=25),
):
    kw_list = [k.strip() for k in keywords.split(",") if k.strip()]
    return {"results": get_recommendations(kw_list, limit=limit)}


class CitationRequest(BaseModel):
    paper: dict
    style: str = "apa"


@router.post("/cite")
def cite(req: CitationRequest):
    if req.style not in ("apa", "mla", "bibtex"):
        raise HTTPException(status_code=400, detail="style must be apa, mla, or bibtex")
    return {"citation": format_citation(req.paper, style=req.style)}
