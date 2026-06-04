"""Writing AI router — dedicated endpoints for humanize, plagiarism, improve, and stats."""
import json
import re
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_optional_user
from app.models import Document, User
from app.services import llm as llm_service
from app.services.openalex import search_papers, format_citation

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
            "suggestion": "Paraphrase: describe the specific direction and magnitude of the relationship in your own words (e.g. 'X increased significantly as Y decreased').",
        },
        {
            "text": "carries implications for both theoretical development and practical application",
            "reason": "Common concluding boilerplate found across many published papers",
            "suggestion": "Paraphrase: replace with a concrete sentence naming your specific theoretical contribution and one practical use case.",
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
            "and a concrete actionable suggestion. The suggestion should ALWAYS recommend paraphrasing "
            "the flagged text in the author's own words as the primary fix. Only suggest adding a citation "
            "as a secondary option when the content is a specific claim or theory. Keep to genuine concerns only (max 5).\n"
            "- summary: 1-2 sentence plain-English verdict a researcher can act on.\n\n"
            "Be rigorous but fair. Common technical terms do not need citation. "
            "Only flag genuine originality risks."
        ),
        response_json_schema=schema,
    )

    if not llm_service._is_api_key_configured():
        # Extract real phrases from the submitted text so rephrase can find them verbatim
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if s.strip() and len(s.split()) > 4]
        mock_concerns = []
        for sent in sentences[:2]:
            words = sent.split()
            phrase = ' '.join(words[1:min(8, len(words))])
            if phrase:
                mock_concerns.append({
                    "text": phrase,
                    "reason": "Phrase matches common academic writing patterns found in published literature.",
                    "suggestion": "Rephrase this in your own words to strengthen originality.",
                })
        result = {
            "originality_score": 86,
            "concerns": mock_concerns if mock_concerns else _MOCK_PLAGIARISM["concerns"],
            "summary": _MOCK_PLAGIARISM["summary"],
        }

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


class ApplyImprovementsRequest(BaseModel):
    text: str
    suggestions: List[dict]
    citation_style: str = "apa"


class CitedPaper(BaseModel):
    citation: str
    title: str
    authors: List[str]
    year: Optional[int]
    doi: str


class ApplyImprovementsResponse(BaseModel):
    improved_text: str
    citations_added: int
    papers_used: List[CitedPaper]


@router.post("/apply-improvements", response_model=ApplyImprovementsResponse)
def apply_improvements(body: ApplyImprovementsRequest):
    """Rewrite text applying all suggestions and inserting real citations from OpenAlex."""
    text = body.text[:5000]
    style = body.citation_style if body.citation_style in ("apa", "mla", "bibtex") else "apa"

    # ── Step 1: Extract 3 academic search queries from the text ──────────────
    queries_schema = {
        "type": "object",
        "properties": {
            "queries": {"type": "array", "items": {"type": "string"}},
        },
    }
    kw_result = llm_service.invoke_llm(
        prompt=f"Academic text:\n\n{text[:2000]}",
        system_prompt=(
            "Extract exactly 3 distinct academic search queries from this text. "
            "Each query should target a specific claim, concept, or methodology mentioned "
            "so that searching an academic database would find relevant supporting literature. "
            "Keep each query under 10 words. Return valid JSON only."
        ),
        response_json_schema=queries_schema,
    )
    search_queries: List[str] = []
    if isinstance(kw_result, dict):
        search_queries = kw_result.get("queries") or []
    if not search_queries:
        search_queries = [text[:80]]

    # ── Step 2: Search OpenAlex for each query, deduplicate by paper ID ──────
    papers_by_id: dict = {}
    for q in search_queries[:3]:
        result = search_papers(str(q)[:120], per_page=5)
        for p in result.get("results", []):
            pid = p.get("id", "")
            if pid and pid not in papers_by_id:
                papers_by_id[pid] = p

    # Keep top 8 by citation count
    top_papers = sorted(
        papers_by_id.values(),
        key=lambda p: p.get("cited_by_count", 0),
        reverse=True,
    )[:8]

    # ── Step 3: Format each paper as a citation ───────────────────────────────
    formatted: List[CitedPaper] = []
    for p in top_papers:
        formatted.append(CitedPaper(
            citation=format_citation(p, style=style),
            title=p.get("title", ""),
            authors=p.get("authors", []),
            year=p.get("year"),
            doi=p.get("doi", ""),
        ))

    cite_block = "\n".join(f"[{i+1}] {f.citation}" for i, f in enumerate(formatted))

    # ── Step 4: Rewrite with suggestions + inline citations ───────────────────
    suggestions_text = "\n".join(
        f"- [{s.get('type','').upper()}] {s.get('text','')}" for s in body.suggestions
    )
    inline_note = " Use \\cite{key} notation." if style == "bibtex" else " Use [N] notation."

    improved = llm_service.invoke_llm(
        prompt=(
            f"Original text:\n\n{text}\n\n"
            f"Improvement suggestions to apply:\n{suggestions_text}\n\n"
            f"Available references:\n{cite_block}"
        ),
        system_prompt=(
            "You are a senior academic editor. Rewrite the text to:\n"
            "1. Address ALL improvement suggestions listed\n"
            f"2. Insert inline citations ({inline_note.strip()}) wherever a claim, statistic, "
            "or established concept is supported by the provided references\n"
            "3. Add a 'References' section at the very end listing only the references you "
            f"actually cited, formatted in {style.upper()} style\n\n"
            "Rules:\n"
            "- Preserve every factual claim, result, and technical detail exactly\n"
            "- Maintain academic register throughout\n"
            "- Do not cite opinions or novel contributions — only established claims\n"
            "- Only use citations from the provided reference list\n"
            "- Return ONLY the rewritten text + References section, nothing else"
        ),
    )

    if not llm_service._is_api_key_configured():
        # Mock rewrite: apply simple but visible improvements to each paragraph
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        mock_paragraphs = []
        improvements = [
            "The analysis presented here demonstrates significant methodological rigour.",
            "These findings contribute meaningfully to the existing body of literature.",
            "Further empirical investigation would strengthen these conclusions considerably.",
        ]
        for i, para in enumerate(paragraphs):
            mock_paragraphs.append(para)
            if i == 0 and len(paragraphs) > 1:
                mock_paragraphs.append(improvements[0])
        if len(paragraphs) == 1:
            mock_paragraphs.append(improvements[1])
        refs_section = ""
        if formatted:
            refs_section = "\n\n## References\n" + "\n".join(
                f"[{i+1}] {f.citation}" for i, f in enumerate(formatted[:4])
            )
        improved = "\n\n".join(mock_paragraphs) + refs_section

    improved_str = improved if isinstance(improved, str) else text

    # Count unique inline citation markers
    inline_hits = set(re.findall(r'\[(\d+)\]', improved_str))
    citations_added = len(inline_hits)

    return ApplyImprovementsResponse(
        improved_text=improved_str,
        citations_added=citations_added,
        papers_used=formatted,
    )


class RephraseConcernsRequest(BaseModel):
    text: str
    concerns: List[dict]  # each has 'text' (flagged phrase) and 'suggestion'


class RephraseConcernsResponse(BaseModel):
    rephrased_text: str
    changes_made: int


@router.post("/rephrase-concerns", response_model=RephraseConcernsResponse)
def rephrase_concerns(body: RephraseConcernsRequest):
    """Rewrite flagged plagiarism concerns in-place using LLM suggestions."""
    text = body.text[:5000]
    concerns = body.concerns[:5]

    concerns_block = "\n".join(
        f'- Phrase: "{c.get("text", "")}" → Suggestion: {c.get("suggestion", "rephrase in your own words")}'
        for c in concerns
        if c.get("text")
    )

    rephrased = llm_service.invoke_llm(
        prompt=f"Original text:\n\n{text}\n\nFlagged phrases to rephrase:\n{concerns_block}",
        system_prompt=(
            "You are an academic editor fixing originality concerns in a research paper.\n\n"
            "For each flagged phrase listed, find it in the original text and rewrite it "
            "in the author's own words following the suggestion given. "
            "Keep all other text exactly as-is. "
            "Preserve technical terms, citations, and academic register. "
            "Return ONLY the full rewritten text — no preamble, no commentary."
        ),
    )

    if not llm_service._is_api_key_configured():
        # Mock: replace each flagged phrase with a paraphrased version
        rephrased_text = text
        changes = 0
        for c in concerns:
            phrase = c.get("text", "")
            if phrase and phrase in rephrased_text:
                # Simple mock rephrase: wrap in paraphrase markers
                replacement = f"[rephrased: {phrase[:40]}...]" if len(phrase) > 40 else f"[rephrased: {phrase}]"
                rephrased_text = rephrased_text.replace(phrase, replacement, 1)
                changes += 1
        rephrased = rephrased_text if changes else text + "\n\n[Note: Flagged phrases were not found verbatim — manual review recommended.]"
        return RephraseConcernsResponse(rephrased_text=rephrased, changes_made=changes)

    rephrased_str = rephrased if isinstance(rephrased, str) else text
    changes_made = sum(1 for c in concerns if c.get("text") and c["text"] not in rephrased_str)

    return RephraseConcernsResponse(rephrased_text=rephrased_str, changes_made=changes_made)


@router.post("/stats", response_model=StatsResponse)
def writing_stats(body: StatsRequest):
    """Instant writing statistics — no LLM, pure Python computation."""
    return compute_stats(body.text)
