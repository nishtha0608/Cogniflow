"""Writing AI router — dedicated endpoints for humanize, plagiarism, improve, and stats."""
import re
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_optional_user
from app.models import Document, User
from app.services import llm as llm_service

router = APIRouter(prefix="/api/ai/writing", tags=["writing"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class HumanizeRequest(BaseModel):
    text: str
    doc_id: Optional[str] = None


class HumanizeResponse(BaseModel):
    humanized_text: str
    ai_risk_before: int
    ai_risk_after: int
    changes: List[str]


class PlagiarismRequest(BaseModel):
    text: str
    doc_id: Optional[str] = None


class PlagiarismConcern(BaseModel):
    text: str
    reason: str
    suggestion: str


class PlagiarismResponse(BaseModel):
    originality_score: int
    concerns: List[PlagiarismConcern]
    summary: str


class ImproveRequest(BaseModel):
    text: str
    doc_id: Optional[str] = None


class ImproveSuggestion(BaseModel):
    type: str
    text: str
    severity: str
    location: str


class ImproveResponse(BaseModel):
    suggestions: List[ImproveSuggestion]
    overall_quality: int
    readability_score: int


class StatsRequest(BaseModel):
    text: str


class StatsResponse(BaseModel):
    word_count: int
    sentence_count: int
    paragraph_count: int
    avg_sentence_length: float
    long_sentence_count: int  # sentences > 35 words
    unique_word_ratio: float  # vocabulary richness 0–1
    reading_time_minutes: float
    flesch_reading_ease: float  # 0–100, higher = easier
    passive_voice_count: int


# ── Pure-Python writing stats (no LLM, instant) ──────────────────────────────

_PASSIVE_PATTERN = re.compile(
    r'\b(is|are|was|were|be|been|being)\s+\w+ed\b',
    re.IGNORECASE
)

_SENTENCE_SPLITTER = re.compile(r'(?<=[.!?])\s+')


def compute_stats(text: str) -> StatsResponse:
    text = text.strip()
    if not text:
        return StatsResponse(
            word_count=0, sentence_count=0, paragraph_count=0,
            avg_sentence_length=0.0, long_sentence_count=0,
            unique_word_ratio=0.0, reading_time_minutes=0.0,
            flesch_reading_ease=0.0, passive_voice_count=0,
        )

    words = text.split()
    word_count = len(words)
    sentences = [s.strip() for s in _SENTENCE_SPLITTER.split(text) if s.strip()]
    sentence_count = max(1, len(sentences))
    paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
    paragraph_count = max(1, len(paragraphs))

    sentence_lengths = [len(s.split()) for s in sentences]
    avg_sentence_length = word_count / sentence_count
    long_sentence_count = sum(1 for l in sentence_lengths if l > 35)

    unique_words = {w.lower().strip('.,;:!?"\'()[]') for w in words if w.isalpha()}
    unique_word_ratio = round(len(unique_words) / max(1, word_count), 3)

    # Average 238 words/minute for academic reading
    reading_time_minutes = round(word_count / 238, 1)

    # Flesch Reading Ease approximation (Kincaid formula needs syllables;
    # we approximate syllable count as max(1, len(w) * 0.33) per word)
    total_syllables = sum(max(1, int(len(w) * 0.33)) for w in words if w.isalpha())
    if word_count > 0 and sentence_count > 0:
        flesch = 206.835 - 1.015 * (word_count / sentence_count) - 84.6 * (total_syllables / max(1, word_count))
        flesch = round(max(0.0, min(100.0, flesch)), 1)
    else:
        flesch = 0.0

    passive_voice_count = len(_PASSIVE_PATTERN.findall(text))

    return StatsResponse(
        word_count=word_count,
        sentence_count=sentence_count,
        paragraph_count=paragraph_count,
        avg_sentence_length=round(avg_sentence_length, 1),
        long_sentence_count=long_sentence_count,
        unique_word_ratio=unique_word_ratio,
        reading_time_minutes=reading_time_minutes,
        flesch_reading_ease=flesch,
        passive_voice_count=passive_voice_count,
    )


# ── Mock responses ─────────────────────────────────────────────────────────────

_MOCK_HUMANIZE = {
    "humanized_text": (
        "The findings suggest a meaningful relationship between the variables studied, "
        "though the magnitude of this effect varies considerably across subgroups. "
        "While prior work has largely treated these constructs as independent, the present "
        "analysis reveals important interaction effects that complicate this view. "
        "These results carry implications for both theoretical development and practical application."
    ),
    "ai_risk_before": 74,
    "ai_risk_after": 19,
    "changes": [
        "Varied sentence openings to break uniform AI-typical structure",
        "Replaced generic transitional phrases with more natural connectives",
        "Softened overconfident hedging language to match academic register",
        "Restructured two run-on sentences for better rhetorical rhythm",
    ],
}

_MOCK_PLAGIARISM = {
    "originality_score": 86,
    "concerns": [
        {
            "text": "meaningful relationship between the variables",
            "reason": "Frequently used phrase in quantitative research literature",
            "suggestion": "Rephrase to be more specific about the nature of the relationship, or cite the framework you're drawing from.",
        },
        {
            "text": "carries implications for both theoretical development and practical application",
            "reason": "Common concluding boilerplate found across many published papers",
            "suggestion": "State the specific implication rather than using this generic framing.",
        },
    ],
    "summary": (
        "The text is largely original. Two phrases match common academic boilerplate "
        "that should be rephrased for uniqueness. No verbatim matches with published sources were detected."
    ),
}

_MOCK_IMPROVE = {
    "suggestions": [
        {
            "type": "clarity",
            "text": "The opening sentence is dense — consider splitting it at the clause boundary for easier parsing.",
            "severity": "medium",
            "location": "Opening paragraph",
        },
        {
            "type": "argument structure",
            "text": "The transition between the literature review and your methodology is abrupt. A bridging sentence explaining why the gap you identified justifies your design would strengthen the flow.",
            "severity": "high",
            "location": "Methods section transition",
        },
        {
            "type": "citation",
            "text": "The claim about effect magnitude is unqualified. This type of assertion typically requires empirical support — add a citation or hedge appropriately.",
            "severity": "high",
            "location": "Results paragraph",
        },
        {
            "type": "style",
            "text": "Passive constructions appear 4+ times in quick succession. Mixing in active voice will improve readability without reducing academic register.",
            "severity": "low",
            "location": "Discussion section",
        },
    ],
    "overall_quality": 71,
    "readability_score": 64,
}


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/humanize", response_model=HumanizeResponse)
def humanize_text(
    body: HumanizeRequest,
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Rewrite text to reduce AI-detection risk while preserving academic accuracy."""
    text = body.text[:5000]

    schema = {
        "type": "object",
        "properties": {
            "humanized_text": {"type": "string"},
            "ai_risk_before": {"type": "number"},
            "ai_risk_after": {"type": "number"},
            "changes": {"type": "array", "items": {"type": "string"}},
        },
    }

    result = llm_service.invoke_llm(
        prompt=f"Academic text to humanize:\n\n{text}",
        system_prompt=(
            "You are an expert academic writing editor specialising in making AI-generated text "
            "indistinguishable from human-written prose.\n\n"
            "Your task:\n"
            "1. Rewrite the text so it sounds authentically human — vary sentence rhythm, "
            "avoid AI-typical structures (excessive hedging, uniform clause length, formulaic transitions).\n"
            "2. Preserve all technical content, citations, and academic register exactly.\n"
            "3. Do NOT simplify the vocabulary or reduce rigour.\n\n"
            "Return:\n"
            "- humanized_text: the fully rewritten text\n"
            "- ai_risk_before: estimated AI-detection probability of the ORIGINAL (0-100)\n"
            "- ai_risk_after: estimated AI-detection probability of your rewrite (0-100, aim < 25)\n"
            "- changes: up to 4 concise bullet points describing the main edits you made\n\n"
            "Be precise. Do not invent content. Preserve every factual claim."
        ),
        response_json_schema=schema,
    )

    if not llm_service._is_api_key_configured():
        result = _MOCK_HUMANIZE

    # Persist scores to the document if doc_id provided
    if body.doc_id and current_user:
        doc = db.query(Document).filter(
            Document.id == body.doc_id,
            Document.created_by == current_user.email,
        ).first()
        if doc:
            doc.ai_risk_score = int(result.get("ai_risk_after", 0))
            db.commit()

    return HumanizeResponse(
        humanized_text=result.get("humanized_text", text),
        ai_risk_before=int(result.get("ai_risk_before", 50)),
        ai_risk_after=int(result.get("ai_risk_after", 20)),
        changes=result.get("changes", []),
    )


@router.post("/plagiarism", response_model=PlagiarismResponse)
def check_plagiarism(
    body: PlagiarismRequest,
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Check text originality and identify phrases that may need attribution."""
    text = body.text[:5000]

    schema = {
        "type": "object",
        "properties": {
            "originality_score": {"type": "number"},
            "concerns": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "text": {"type": "string"},
                        "reason": {"type": "string"},
                        "suggestion": {"type": "string"},
                    },
                },
            },
            "summary": {"type": "string"},
        },
    }

    result = llm_service.invoke_llm(
        prompt=f"Academic text to review for originality:\n\n{text}",
        system_prompt=(
            "You are an academic integrity specialist reviewing text for potential plagiarism concerns.\n\n"
            "Analyse the text and identify:\n"
            "1. Phrases or sentences that closely match known academic boilerplate\n"
            "2. Technical definitions or claims that appear verbatim from common sources without citation\n"
            "3. Ideas or frameworks that are clearly derived from specific theoretical traditions "
            "and should be attributed\n\n"
            "Return:\n"
            "- originality_score (0-100): 100 = fully original, 0 = entirely derivative. "
            "Score above 80 is acceptable for publication.\n"
            "- concerns: list of specific passages (include the exact phrase), the reason for concern, "
            "and a concrete actionable suggestion. Keep to genuine concerns only (max 5).\n"
            "- summary: 1-2 sentence plain-English verdict a researcher can act on.\n\n"
            "Be rigorous but fair. Common technical terms do not need citation. "
            "Only flag genuine originality risks."
        ),
        response_json_schema=schema,
    )

    if not llm_service._is_api_key_configured():
        result = _MOCK_PLAGIARISM

    # Persist originality score to the document
    if body.doc_id and current_user:
        doc = db.query(Document).filter(
            Document.id == body.doc_id,
            Document.created_by == current_user.email,
        ).first()
        if doc:
            doc.originality_score = int(result.get("originality_score", 85))
            db.commit()

    concerns = [
        PlagiarismConcern(**c)
        for c in (result.get("concerns") or [])
        if isinstance(c, dict)
    ]

    return PlagiarismResponse(
        originality_score=int(result.get("originality_score", 85)),
        concerns=concerns,
        summary=result.get("summary", ""),
    )


@router.post("/improve", response_model=ImproveResponse)
def improve_writing(
    body: ImproveRequest,
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Analyse academic text quality and return targeted improvement suggestions."""
    text = body.text[:5000]

    schema = {
        "type": "object",
        "properties": {
            "suggestions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "type": {"type": "string"},
                        "text": {"type": "string"},
                        "severity": {"type": "string"},
                        "location": {"type": "string"},
                    },
                },
            },
            "overall_quality": {"type": "number"},
            "readability_score": {"type": "number"},
        },
    }

    result = llm_service.invoke_llm(
        prompt=f"Academic text to review:\n\n{text}",
        system_prompt=(
            "You are a senior academic editor reviewing a research paper draft.\n\n"
            "Provide targeted, actionable improvement suggestions covering:\n"
            "- clarity: sentences that are dense, ambiguous, or hard to parse\n"
            "- argument structure: logical gaps, missing warrants, weak transitions\n"
            "- citation: claims that need attribution or are over-cited\n"
            "- style: passive voice overuse, repetitive phrasing, hedging problems\n"
            "- grammar: only flag genuine errors, not stylistic preferences\n\n"
            "Return:\n"
            "- suggestions: up to 6 issues. Each with:\n"
            "  - type: one of 'clarity', 'argument structure', 'citation', 'style', 'grammar'\n"
            "  - text: specific, actionable suggestion (1-2 sentences)\n"
            "  - severity: 'low' | 'medium' | 'high'\n"
            "  - location: where in the text (e.g. 'Opening paragraph', 'Methods section')\n"
            "- overall_quality (0-100): holistic quality score\n"
            "- readability_score (0-100): academic readability (80+ = excellent, 50-79 = acceptable, <50 = needs work)\n\n"
            "Be specific and constructive. Avoid vague advice like 'improve clarity.'"
        ),
        response_json_schema=schema,
    )

    if not llm_service._is_api_key_configured():
        result = _MOCK_IMPROVE

    suggestions = [
        ImproveSuggestion(**s)
        for s in (result.get("suggestions") or [])
        if isinstance(s, dict)
    ]

    return ImproveResponse(
        suggestions=suggestions,
        overall_quality=int(result.get("overall_quality", 70)),
        readability_score=int(result.get("readability_score", 65)),
    )


@router.post("/stats", response_model=StatsResponse)
def writing_stats(body: StatsRequest):
    """Instant writing statistics — no LLM, pure Python computation."""
    return compute_stats(body.text)
