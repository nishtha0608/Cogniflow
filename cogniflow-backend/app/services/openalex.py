"""OpenAlex API service — paper search, DOI lookup, recommendations, citation formatting."""
import re
from typing import Any, Optional
import requests

from app.core.config import settings

BASE_URL = "https://api.openalex.org"
TIMEOUT = 15


def _params(**kwargs) -> dict:
    p = {"api_key": settings.OPENALEX_API_KEY}
    p.update({k: v for k, v in kwargs.items() if v is not None})
    return p


def _reconstruct_abstract(inverted_index: Optional[dict]) -> str:
    if not inverted_index:
        return ""
    positions = []
    for word, idxs in inverted_index.items():
        for i in idxs:
            positions.append((i, word))
    positions.sort()
    return " ".join(w for _, w in positions)


def _format_authors(authorships: list) -> list[str]:
    return [
        a.get("author", {}).get("display_name", "Unknown")
        for a in (authorships or [])[:6]
    ]


def _clean_paper(work: dict) -> dict:
    authors = _format_authors(work.get("authorships", []))
    abstract = _reconstruct_abstract(work.get("abstract_inverted_index"))
    doi = work.get("doi", "") or ""
    doi_clean = doi.replace("https://doi.org/", "") if doi else ""
    journal = (
        (work.get("primary_location") or {})
        .get("source", {}) or {}
    ).get("display_name", "")
    pdf_url = (
        (work.get("open_access") or {}).get("oa_url") or
        (work.get("primary_location") or {}).get("pdf_url") or ""
    )
    concepts = [
        c.get("display_name", "")
        for c in (work.get("concepts") or [])[:5]
    ]
    return {
        "id": work.get("id", ""),
        "doi": doi_clean,
        "title": work.get("title", "Untitled"),
        "authors": authors,
        "year": work.get("publication_year"),
        "cited_by_count": work.get("cited_by_count", 0),
        "abstract": abstract[:600] if abstract else "",
        "journal": journal,
        "pdf_url": pdf_url,
        "concepts": concepts,
        "is_open_access": (work.get("open_access") or {}).get("is_oa", False),
    }


def search_papers(
    query: str,
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    page: int = 1,
    per_page: int = 20,
) -> dict:
    filters = []
    if year_from:
        filters.append(f"publication_year:>{year_from - 1}")
    if year_to:
        filters.append(f"publication_year:<{year_to + 1}")

    params = _params(
        search=query,
        per_page=min(per_page, 50),
        page=page,
        select="id,doi,title,authorships,publication_year,cited_by_count,abstract_inverted_index,primary_location,open_access,concepts",
    )
    if filters:
        params["filter"] = ",".join(filters)

    try:
        r = requests.get(f"{BASE_URL}/works", params=params, timeout=TIMEOUT)
        r.raise_for_status()
        data = r.json()
        return {
            "results": [_clean_paper(w) for w in data.get("results", [])],
            "total": data.get("meta", {}).get("count", 0),
            "page": page,
            "per_page": per_page,
        }
    except Exception as e:
        return {"results": [], "total": 0, "page": page, "per_page": per_page, "error": str(e)}


def get_paper_by_doi(doi: str) -> Optional[dict]:
    doi_clean = doi.strip().lstrip("https://doi.org/").lstrip("doi:")
    try:
        r = requests.get(
            f"{BASE_URL}/works/https://doi.org/{doi_clean}",
            params=_params(
                select="id,doi,title,authorships,publication_year,cited_by_count,abstract_inverted_index,primary_location,open_access,concepts"
            ),
            timeout=TIMEOUT,
        )
        r.raise_for_status()
        return _clean_paper(r.json())
    except Exception:
        return None


def get_recommendations(keywords: list[str], limit: int = 10) -> list[dict]:
    if not keywords:
        return []
    query = " ".join(keywords[:5])
    try:
        r = requests.get(
            f"{BASE_URL}/works",
            params=_params(
                search=query,
                sort="cited_by_count:desc",
                per_page=limit,
                page=1,
                select="id,doi,title,authorships,publication_year,cited_by_count,abstract_inverted_index,primary_location,open_access,concepts",
            ),
            timeout=TIMEOUT,
        )
        r.raise_for_status()
        return [_clean_paper(w) for w in r.json().get("results", [])]
    except Exception:
        return []


# ── Citation formatters ────────────────────────────────────────────────────────

def _author_apa(name: str) -> str:
    parts = name.strip().split()
    if len(parts) < 2:
        return name
    last = parts[-1]
    initials = " ".join(p[0] + "." for p in parts[:-1])
    return f"{last}, {initials}"


def format_citation(paper: dict, style: str = "apa") -> str:
    authors = paper.get("authors", [])
    title = paper.get("title", "")
    year = paper.get("year", "n.d.")
    journal = paper.get("journal", "")
    doi = paper.get("doi", "")
    doi_url = f"https://doi.org/{doi}" if doi else ""

    if style == "apa":
        author_str = ", ".join(_author_apa(a) for a in authors[:6])
        if len(paper.get("authors", [])) > 6:
            author_str += ", et al."
        parts = [f"{author_str} ({year}). {title}."]
        if journal:
            parts.append(f" {journal}.")
        if doi_url:
            parts.append(f" {doi_url}")
        return "".join(parts)

    elif style == "mla":
        if authors:
            first = authors[0].strip().split()
            first_str = f"{first[-1]}, {' '.join(first[:-1])}" if len(first) > 1 else authors[0]
            others = ", ".join(authors[1:6])
            author_str = f"{first_str}{', ' + others if others else ''}."
        else:
            author_str = ""
        parts = [f'{author_str} "{title}."']
        if journal:
            parts.append(f" {journal},")
        if year:
            parts.append(f" {year}.")
        if doi_url:
            parts.append(f" {doi_url}.")
        return "".join(parts)

    elif style == "bibtex":
        first_author_last = (
            authors[0].strip().split()[-1].lower() if authors else "unknown"
        )
        key = re.sub(r"[^a-z0-9]", "", f"{first_author_last}{year or ''}")
        author_bib = " and ".join(authors[:6])
        lines = [
            f"@article{{{key},",
            f"  author = {{{author_bib}}},",
            f"  title = {{{title}}},",
            f"  year = {{{year}}},",
        ]
        if journal:
            lines.append(f"  journal = {{{journal}}},")
        if doi:
            lines.append(f"  doi = {{{doi}}},")
        lines.append("}")
        return "\n".join(lines)

    return f"{', '.join(authors)} ({year}). {title}."
