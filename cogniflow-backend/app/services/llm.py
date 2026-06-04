"""LLM service: OpenAI calls with full mock fallback when no API key."""
import json
import random
from typing import Any, Optional

from app.core.config import settings

# ── Mock data generators ───────────────────────────────────────────────────────

_MOCK_STRINGS = {
    "response": (
        "This is a mock AI response for demonstration purposes. "
        "The research assistant would normally provide detailed, contextually-aware insights here. "
        "To enable real AI responses, set your OPENAI_API_KEY environment variable. "
        "Your research shows great promise — consider exploring interdisciplinary connections "
        "and leveraging mixed-methods approaches to strengthen your methodology."
    ),
    "question": (
        "Can you explain the theoretical framework underpinning your research methodology "
        "and how it addresses the identified research gaps in the current literature?"
    ),
    "feedback_summary": (
        "Your answer demonstrates a solid foundational understanding of the topic. "
        "You effectively identified key concepts and articulated your methodology clearly. "
        "To strengthen your response, consider incorporating more specific empirical examples "
        "and directly addressing potential criticisms of your approach."
    ),
    "field_overview": (
        "This research area has seen significant growth over the past decade, with major advances "
        "in both theoretical frameworks and empirical methodologies. However, several critical "
        "gaps remain underexplored, particularly at the intersection of emerging technologies "
        "and traditional research paradigms."
    ),
    "research_maturity": "Developing — active area with substantial room for novel contributions",
    "summary": (
        "The text demonstrates good originality with clear academic voice. "
        "Some passages may benefit from additional citations to strengthen claims."
    ),
    "humanized_text": (
        "The findings point to a meaningful relationship between the constructs examined, "
        "though effect sizes varied considerably across subgroups. "
        "Where earlier work treated these variables as independent, the present analysis "
        "surfaces interaction effects that complicate that picture. "
        "The implications reach both theoretical development and practical application in the field."
    ),
    "examiner_intent": "Assess depth of understanding and ability to defend methodological choices",
    "question_type": "Methodology",
    "location": "Opening paragraph",
    "type": "clarity",
    "text": "Consider adding more specific citations to support this argument.",
    "reason": "This phrase is commonly used in academic literature and may need citation.",
    "suggestion": "Add a citation to the original source or rephrase to make it clearly original.",
}

_MOCK_NUMBERS = {
    "confidence": 78,
    "overall_score": 74,
    "content_score": 76,
    "critical_thinking_score": 72,
    "communication_score": 74,
    "overall_quality": 72,
    "readability_score": 68,
    "originality_score": 86,
    "ai_risk_before": 74,
    "ai_risk_after": 19,
    "difficulty": 3,
    "confidence_score": 82.0,
    "page_count": 12,
}

_MOCK_BOOLEANS = {
    "sources_needed": True,
}


def _mock_string(key: str, prompt: str = "") -> str:
    return _MOCK_STRINGS.get(key, f"[Mock {key}] This would contain real AI-generated content.")


def _mock_number(key: str) -> float:
    return _MOCK_NUMBERS.get(key, random.randint(60, 90))


def _mock_boolean(key: str) -> bool:
    return _MOCK_BOOLEANS.get(key, False)


def _mock_array(key: str, items_schema: dict, prompt: str = "") -> list:
    if key == "suggestions":
        return [
            "Consider broadening your literature review to include recent publications from 2022-2024",
            "Explore mixed-methods approaches to strengthen the validity of your findings",
            "Investigate potential confounding variables in your research design",
        ]
    if key == "expected_topics":
        return ["Research methodology", "Theoretical framework", "Empirical evidence"]
    if key == "follow_up_areas":
        return ["Statistical analysis methods", "Sampling strategy", "Validity and reliability"]
    if key == "strengths":
        return [
            "Clear articulation of core concepts",
            "Good understanding of the theoretical framework",
            "Confident delivery of key arguments",
        ]
    if key == "improvements":
        return [
            "Include more specific empirical examples",
            "Address potential methodological limitations proactively",
            "Strengthen connections to existing literature",
        ]
    if key == "model_answer_points":
        return [
            "Define the theoretical framework and its relevance to the research question",
            "Explain the methodological choices and justify them with literature",
            "Acknowledge limitations and discuss mitigation strategies",
            "Connect findings back to the broader field",
        ]
    if key == "related_keywords":
        return ["machine learning", "methodology", "research design", "empirical study"]
    if key == "changes":
        return [
            "Varied sentence openings to break uniform AI-typical structure",
            "Replaced formulaic transitions with more natural connectives",
            "Softened overconfident hedging language to match academic register",
            "Restructured two run-on sentences for better rhetorical rhythm",
        ]
    if key == "concerns":
        return [
            {
                "text": "meaningful relationship between the variables",
                "reason": "Frequently used phrase in quantitative research — may trigger similarity detection",
                "suggestion": "Rephrase to describe the specific direction and magnitude of the relationship.",
            },
            {
                "text": "implications for both theoretical development and practical application",
                "reason": "Common concluding boilerplate found across many published papers",
                "suggestion": "Replace with a concrete statement of your specific contribution.",
            },
        ]
    if key == "gaps":
        return _mock_gaps(prompt)
    if items_schema.get("type") == "string":
        return ["Item 1", "Item 2", "Item 3"]
    return []


def _mock_gaps(prompt: str = "") -> list:
    topic = "your research field" if not prompt else prompt[:80]
    return [
        {
            "title": f"Longitudinal Impact Studies in {topic[:40]}",
            "description": (
                "While cross-sectional studies abound, there is a notable absence of "
                "longitudinal research that tracks the evolution of key variables over time. "
                "This gap limits our understanding of causal relationships."
            ),
            "gap_type": "empirical",
            "significance": "high",
            "potential_contribution": (
                "A multi-year longitudinal study could provide causal evidence "
                "and significantly advance theoretical models in the field."
            ),
            "related_keywords": ["longitudinal", "causality", "time-series", "panel data"],
            "confidence_score": 87,
        },
        {
            "title": "Cross-Cultural Validation of Theoretical Frameworks",
            "description": (
                "Most existing theoretical frameworks have been developed and validated "
                "in Western academic contexts. Their applicability across diverse cultural "
                "settings remains largely untested."
            ),
            "gap_type": "contextual",
            "significance": "high",
            "potential_contribution": (
                "Cross-cultural studies would either validate existing frameworks globally "
                "or lead to culturally-sensitive theoretical refinements."
            ),
            "related_keywords": ["cross-cultural", "generalizability", "cultural context"],
            "confidence_score": 79,
        },
        {
            "title": "Integration of Emerging AI Methodologies",
            "description": (
                "Current methodological approaches have not fully incorporated recent advances "
                "in machine learning and AI-driven analysis, which could reveal patterns "
                "invisible to traditional statistical methods."
            ),
            "gap_type": "methodological",
            "significance": "critical",
            "potential_contribution": (
                "Pioneering the integration of AI methods could establish new standards "
                "for data analysis in the field and yield novel theoretical insights."
            ),
            "related_keywords": ["AI", "machine learning", "computational methods", "big data"],
            "confidence_score": 91,
        },
    ]


def _mock_object(key: str, schema: dict, prompt: str = "") -> dict:
    props = schema.get("properties", {})
    return {k: _generate_mock_value(k, v, prompt) for k, v in props.items()}


def _generate_mock_value(key: str, schema: dict, prompt: str = "") -> Any:
    t = schema.get("type", "string")
    if t == "string":
        return _mock_string(key, prompt)
    elif t == "number":
        return _mock_number(key)
    elif t == "boolean":
        return _mock_boolean(key)
    elif t == "array":
        return _mock_array(key, schema.get("items", {}), prompt)
    elif t == "object":
        return _mock_object(key, schema, prompt)
    return None


def generate_mock_from_schema(schema: dict, prompt: str = "") -> dict:
    """Generate plausible mock data matching a JSON schema."""
    if not schema or schema.get("type") != "object":
        return {"response": _MOCK_STRINGS["response"]}
    properties = schema.get("properties", {})
    return {k: _generate_mock_value(k, v, prompt) for k, v in properties.items()}


# ── Real OpenAI call ───────────────────────────────────────────────────────────

def _is_api_key_configured() -> bool:
    key = settings.OPENAI_API_KEY.strip()
    return bool(key) and key not in ("", "your_key_here", "sk-placeholder")


def invoke_llm(
    prompt: str,
    system_prompt: Optional[str] = None,
    response_json_schema: Optional[dict] = None,
    add_context_from_internet: bool = False,
    image_base64: Optional[str] = None,
    image_media_type: Optional[str] = None,
    **kwargs,
) -> Any:
    """Call OpenAI GPT-4o (or return mock data if API key not configured)."""

    if not _is_api_key_configured():
        return generate_mock_from_schema(response_json_schema or {}, prompt)

    try:
        from openai import OpenAI

        client = OpenAI(api_key=settings.OPENAI_API_KEY)

        sys_parts = []
        if system_prompt:
            sys_parts.append(system_prompt)

        if response_json_schema:
            sys_parts.append(
                f"You MUST respond with valid JSON that strictly matches this schema:\n"
                f"{json.dumps(response_json_schema, indent=2)}\n"
                f"Return ONLY the JSON object — no markdown fences, no extra text."
            )
        else:
            sys_parts.append("Be helpful, concise, and academically rigorous.")

        final_system = "\n\n".join(sys_parts) if sys_parts else "Be helpful and concise."

        # Build user content — plain text or vision (text + image)
        if image_base64:
            media_type = image_media_type or "image/jpeg"
            user_content = [
                {"type": "text", "text": prompt},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{media_type};base64,{image_base64}",
                        "detail": "high",
                    },
                },
            ]
        else:
            user_content = prompt

        messages = [
            {"role": "system", "content": final_system},
            {"role": "user", "content": user_content},
        ]

        # Use JSON mode when a schema is requested
        kwargs_extra = {}
        if response_json_schema:
            kwargs_extra["response_format"] = {"type": "json_object"}

        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=messages,
            max_tokens=4096,
            **kwargs_extra,
        )

        raw = response.choices[0].message.content.strip()

        if response_json_schema:
            # Strip markdown fences if GPT wraps anyway
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
                raw = raw.strip()
            return json.loads(raw)

        return raw

    except Exception as e:
        print(f"[LLM] OpenAI error: {e}. Falling back to mock.")
        return generate_mock_from_schema(response_json_schema or {}, prompt)
