"""PDF text extraction using PyMuPDF (fitz)."""
from pathlib import Path
from typing import Optional


def extract_pdf(file_bytes: bytes) -> dict:
    """
    Extract text and metadata from a PDF.
    Returns { text_content, page_count, word_count }.
    Falls back gracefully if PyMuPDF is unavailable.
    """
    try:
        import fitz  # PyMuPDF

        doc = fitz.open(stream=file_bytes, filetype="pdf")
        pages = []
        for page in doc:
            pages.append(page.get_text())
        doc.close()

        text_content = "\n".join(pages)
        page_count = len(pages)
        word_count = len(text_content.split())

        return {
            "text_content": text_content,
            "page_count": page_count,
            "word_count": word_count,
        }

    except ImportError:
        return {"text_content": "", "page_count": 0, "word_count": 0}
    except Exception as e:
        print(f"[PDF] Extraction error: {e}")
        return {"text_content": "", "page_count": 0, "word_count": 0}


def extract_from_path(path: Path) -> dict:
    return extract_pdf(path.read_bytes())
