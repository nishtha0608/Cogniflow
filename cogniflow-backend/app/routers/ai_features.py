"""AI Features router: Research Council, Serendipity Engine, Momentum, Narrative."""
import random
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_optional_user
from app.models import User
from app.services import llm as llm_service
from app.services import embeddings as embedding_svc
from app.services import vector_store as vs_svc

router = APIRouter(prefix="/api/ai", tags=["ai-features"])


# ── Schemas ────────────────────────────────────────────────────────────────────

class CouncilRequest(BaseModel):
    question: str
    context: Optional[str] = None
    project_title: Optional[str] = None


class CouncilAgentResponse(BaseModel):
    agent_id: str
    name: str
    color: str
    role: str
    response: str
    key_point: str


class CouncilResponse(BaseModel):
    agents: List[CouncilAgentResponse]
    synthesis: str


class SerendipityRequest(BaseModel):
    research_topic: str
    keywords: Optional[List[str]] = None


class NarrativeRequest(BaseModel):
    project_title: str
    stage: Optional[str] = None
    keywords: Optional[List[str]] = None
    recent_activity: Optional[str] = None


# ── Council Agent Definitions ──────────────────────────────────────────────────

_COUNCIL_AGENTS = [
    {
        "agent_id": "synthesizer",
        "name": "The Synthesizer",
        "color": "violet",
        "role": "Connects your research to broader knowledge landscapes and identifies bridge concepts",
        "persona": (
            "You are The Synthesizer — a polymathic scholar who sees connections across disciplines. "
            "You draw parallels between different fields, identify bridge concepts, and show how ideas "
            "from seemingly unrelated domains illuminate the question. Be intellectually generous but rigorous. "
            "Start with the most unexpected connection you can find."
        ),
    },
    {
        "agent_id": "skeptic",
        "name": "The Skeptic",
        "color": "rose",
        "role": "Challenges hidden assumptions, exposes methodological risks, steels the research",
        "persona": (
            "You are The Skeptic — a rigorous critic who probes every weakness. "
            "Challenge the assumptions embedded in the question, identify methodological risks, "
            "expose potential confounds, and ask the hard questions that hostile reviewers will ask. "
            "Be precise and constructive — your goal is to make the research unassailable."
        ),
    },
    {
        "agent_id": "visionary",
        "name": "The Visionary",
        "color": "amber",
        "role": "Extrapolates future implications and identifies transformative potential",
        "persona": (
            "You are The Visionary — a futures-oriented thinker who sees where research trajectories lead. "
            "Extrapolate implications 5-10 years forward, identify transformative potential, "
            "and envision how this work could reshape the field or even adjacent fields. "
            "Be bold but intellectually grounded. Make the researcher see what they might be building toward."
        ),
    },
    {
        "agent_id": "pragmatist",
        "name": "The Pragmatist",
        "color": "emerald",
        "role": "Focuses on actionable next steps, feasibility, and concrete implementation paths",
        "persona": (
            "You are The Pragmatist — a results-driven thinker who cuts to what's actionable. "
            "Identify the most feasible next steps, resource requirements, timeline considerations, "
            "and concrete implementation strategies. What can the researcher do THIS WEEK to advance? "
            "Be specific, direct, and realistic."
        ),
    },
]

_MOCK_COUNCIL = {
    "synthesizer": {
        "response": (
            "Your research resonates with a concept from jazz improvisation: 'playing in the cracks.' "
            "Miles Davis described the most interesting musical space as living between the notes — "
            "not in established scales but in the tension between them. Your research question occupies "
            "exactly this liminal space in your field, bridging two paradigms that rarely speak to each other. "
            "Consider how quantum superposition offers a metaphor too: your methodology might allow "
            "phenomena to exist in multiple theoretical states simultaneously until observation collapses them."
        ),
        "key_point": "Your research lives in a productive tension between established paradigms — embrace the liminality rather than resolving it prematurely.",
    },
    "skeptic": {
        "response": (
            "Three assumptions embedded in your question deserve scrutiny. First, you're treating "
            "the dependent variable as singular when it may be multidimensional — reviewers will "
            "question whether you're measuring what you claim. Second, your temporal scope assumes "
            "stability in the construct over time, which has been challenged by at least four studies "
            "since 2019. Third, the causal arrow you're implying may run in the opposite direction — "
            "have you designed your study to distinguish correlation from causation? These aren't "
            "fatal flaws, but leaving them unaddressed invites rejection."
        ),
        "key_point": "Fortify your causal claims — the directionality of your proposed relationship is vulnerable and needs explicit methodological attention.",
    },
    "visionary": {
        "response": (
            "If your findings hold, you're not just contributing an incremental finding — you're "
            "laying groundwork for a paradigm shift. Within a decade, the framework you develop "
            "could become the standard lens through which practitioners approach this problem. "
            "More excitingly, your methodology, once validated, could be reverse-applied to three "
            "adjacent fields currently struggling with the same fundamental uncertainty. "
            "The researchers who cite you won't just build on your conclusions — "
            "they'll borrow your methodological architecture."
        ),
        "key_point": "Your methodological innovation may prove more durable than your specific findings — design it with transfer in mind.",
    },
    "pragmatist": {
        "response": (
            "Here's what you can actually do this week: (1) Run a systematic search on Web of Science "
            "using your top three keywords + 'systematic review' to see if someone has already synthesized "
            "this territory. (2) Identify three researchers whose work borders your question and read their "
            "methods sections — not for findings, but for how they operationalized similar constructs. "
            "(3) Draft a one-paragraph 'contribution statement' and share it with your supervisor. "
            "The response will tell you whether your framing is landing. Small actions, large signal value."
        ),
        "key_point": "Three concrete actions this week will either validate your direction or save you months of work.",
    },
}

_MOCK_SYNTHESIS = (
    "The Council converges on a critical insight: your research occupies valuable liminal space "
    "between paradigms, but needs methodological fortification — particularly around causal claims "
    "and construct operationalization. The path forward is both bold (embrace the cross-disciplinary "
    "synthesis) and disciplined (address the skeptic's challenges head-on). Your most urgent action: "
    "sharpen your causal logic before proceeding."
)


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/council", response_model=CouncilResponse)
def research_council(
    body: CouncilRequest,
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Multi-agent Research Council — 4 expert AI personas analyze your research question."""
    context_str = ""
    if body.context:
        context_str += f"\n\nResearch Context: {body.context}"
    if body.project_title:
        context_str += f"\nProject: {body.project_title}"

    agent_schema = {
        "type": "object",
        "properties": {
            "response": {"type": "string"},
            "key_point": {"type": "string"},
        },
    }

    agents = []
    for agent_def in _COUNCIL_AGENTS:
        result = llm_service.invoke_llm(
            prompt=f"Research question: {body.question}{context_str}",
            system_prompt=agent_def["persona"],
            response_json_schema=agent_schema,
        )

        # Use richer mock responses if no API key
        if not llm_service._is_api_key_configured():
            mock = _MOCK_COUNCIL[agent_def["agent_id"]]
            result = {"response": mock["response"], "key_point": mock["key_point"]}

        agents.append(CouncilAgentResponse(
            agent_id=agent_def["agent_id"],
            name=agent_def["name"],
            color=agent_def["color"],
            role=agent_def["role"],
            response=result.get("response", ""),
            key_point=result.get("key_point", ""),
        ))

    # Synthesize across all four
    synthesis_schema = {
        "type": "object",
        "properties": {"synthesis": {"type": "string"}},
    }
    agent_text = "\n\n".join(
        f"{a.name}: {a.response}" for a in agents
    )
    syn_result = llm_service.invoke_llm(
        prompt=f"Question: {body.question}\n\nFour expert perspectives:\n{agent_text}",
        system_prompt=(
            "You are a wise academic moderator. Synthesize the four perspectives into a unified, "
            "actionable insight that honours the strongest points from each. Be concise (2-3 sentences). "
            "End with the single most important action the researcher should take next."
        ),
        response_json_schema=synthesis_schema,
    )
    synthesis = (
        syn_result.get("synthesis", _MOCK_SYNTHESIS)
        if llm_service._is_api_key_configured()
        else _MOCK_SYNTHESIS
    )

    return CouncilResponse(agents=agents, synthesis=synthesis)


@router.post("/serendipity")
def serendipity_engine(
    body: SerendipityRequest,
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Serendipity Engine — finds unexpected cross-disciplinary connections to your research."""
    keywords_str = ", ".join(body.keywords) if body.keywords else "not specified"

    schema = {
        "type": "object",
        "properties": {
            "connections": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "field": {"type": "string"},
                        "insight": {"type": "string"},
                        "serendipity_score": {"type": "number"},
                        "how_to_apply": {"type": "string"},
                    },
                },
            },
            "meta_insight": {"type": "string"},
        },
    }

    result = llm_service.invoke_llm(
        prompt=f"Research topic: {body.research_topic}\nKeywords: {keywords_str}",
        system_prompt=(
            "You are the Research Serendipity Engine. Find UNEXPECTED, SURPRISING connections between "
            "the given research topic and completely different fields. Think: what would a jazz musician notice? "
            "A mycologist? A naval architect? A game designer? An evolutionary biologist? A chef?\n\n"
            "For each connection provide:\n"
            "- field: The unexpected source field (e.g., 'Jazz Improvisation', 'Mycorrhizal Networks', 'Byzantine Architecture')\n"
            "- insight: The surprising parallel — specific and thought-provoking (2-3 sentences)\n"
            "- serendipity_score: How unexpected this connection is (60-100, higher = more surprising)\n"
            "- how_to_apply: One concrete way to apply this insight to the research\n\n"
            "Generate exactly 5 connections. Avoid obvious interdisciplinary links. Prioritise genuine surprise."
        ),
        response_json_schema=schema,
    )

    # Rich mock if no API key
    if not llm_service._is_api_key_configured():
        topic = body.research_topic[:50]
        result = {
            "connections": [
                {
                    "field": "Mycorrhizal Networks",
                    "insight": (
                        f"Forest trees share resources and warning signals through underground fungal networks — "
                        f"a decentralised intelligence that predates the internet by 400 million years. "
                        f"Your research on {topic} may have an analogous 'hidden network' of weak ties "
                        f"transferring critical signals beneath the visible structure."
                    ),
                    "serendipity_score": 91,
                    "how_to_apply": "Map the 'weak tie' connections in your dataset — they may carry disproportionate signal.",
                },
                {
                    "field": "Jazz Counterpoint",
                    "insight": (
                        "Miles Davis said the most interesting music lives in the space between notes. "
                        "In counterpoint, two voices create a third emergent voice neither contains alone. "
                        f"Your research variables may be doing exactly this — the interaction effect "
                        f"might be more theoretically rich than either main effect."
                    ),
                    "serendipity_score": 84,
                    "how_to_apply": "Design your analysis to specifically capture and interpret interaction effects as primary findings, not noise.",
                },
                {
                    "field": "Phase Transitions in Physics",
                    "insight": (
                        "Water doesn't gradually become ice — it snaps at 0°C. Many complex systems "
                        "exhibit these discontinuous phase transitions where small inputs trigger sudden "
                        f"large-scale reorganisation. Your research domain may contain such thresholds "
                        f"that linear analysis would miss entirely."
                    ),
                    "serendipity_score": 88,
                    "how_to_apply": "Test for nonlinear threshold effects in your data rather than assuming continuous relationships.",
                },
                {
                    "field": "Theatrical Dramaturgy",
                    "insight": (
                        "Dramaturgists analyse why an audience loses suspension of disbelief — the moment "
                        "internal logic breaks. Academic peer reviewers do the same. Every 'but wait' moment "
                        f"in your argument is a dramaturgical failure. Your theoretical framework may have "
                        f"unexamined 'plot holes' that break the reader's intellectual immersion."
                    ),
                    "serendipity_score": 76,
                    "how_to_apply": "Read your methods section as a hostile dramaturg — identify every moment a reader might think 'but that doesn't follow.'",
                },
                {
                    "field": "Sourdough Fermentation",
                    "insight": (
                        "A sourdough starter is a complex ecosystem where invisible microbial competition "
                        "produces emergent flavour complexity. The researcher doesn't control the outcome — "
                        f"they curate conditions. Your methodology may benefit from a similar shift: "
                        f"from controlling variables to curating conditions and observing emergence."
                    ),
                    "serendipity_score": 79,
                    "how_to_apply": "Consider whether a more naturalistic observation phase before your controlled study would reveal phenomena your current design would miss.",
                },
            ],
            "meta_insight": (
                f"Across these unexpected domains, a pattern emerges: your research on {topic} "
                f"may be underestimating emergent complexity. The most powerful phenomena in your field "
                f"likely arise from interactions, thresholds, and hidden networks — not from linear, "
                f"variable-by-variable analysis. The serendipitous insight is: look for the spaces between."
            ),
        }

    return result


@router.get("/momentum")
def get_momentum(
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Research momentum score derived from recent activity patterns."""
    from app.models import Document, Conversation, ResearchGap

    user_id = current_user.email if current_user else None
    week_ago = datetime.utcnow() - timedelta(days=7)

    doc_count = gap_count = conv_count = total_docs = 0

    if user_id:
        doc_count = (
            db.query(Document)
            .filter(Document.created_by == user_id, Document.created_date >= week_ago)
            .count()
        )
        gap_count = (
            db.query(ResearchGap)
            .filter(ResearchGap.created_by == user_id, ResearchGap.created_date >= week_ago)
            .count()
        )
        conv_count = (
            db.query(Conversation)
            .filter(Conversation.created_by == user_id, Conversation.updated_date >= week_ago)
            .count()
        )
        total_docs = db.query(Document).filter(Document.created_by == user_id).count()

    raw = (doc_count * 15) + (gap_count * 20) + (conv_count * 10)
    base = 42 + (total_docs * 3)
    score = min(100, max(35, raw + base))

    label_map = [
        (90, "Breakthrough Mode"),
        (80, "Accelerating"),
        (65, "In Flow"),
        (50, "Building"),
        (35, "Warming Up"),
        (0,  "Dormant"),
    ]
    label = next(lbl for threshold, lbl in label_map if score >= threshold)

    streak = max(1, min(7, doc_count + conv_count + gap_count))
    breakthrough = min(100, score + random.randint(8, 22))

    insights = []
    if doc_count:
        insights.append(f"Added {doc_count} document{'s' if doc_count > 1 else ''} this week — your library is growing")
    if gap_count:
        insights.append(f"Found {gap_count} research gap{'s' if gap_count > 1 else ''} — your critical eye is sharpening")
    if conv_count:
        insights.append(f"Held {conv_count} research session{'s' if conv_count > 1 else ''} — active dialogue drives breakthroughs")
    if not insights:
        insights = [
            "Upload a paper you've been meaning to read to ignite momentum",
            "Ask the Research Council your most pressing question",
            "Spend 20 minutes in the Writing editor — words build momentum",
        ]

    milestones = [
        "Complete your methodology outline",
        "Identify 5 critical research gaps",
        "Reach 10 Research Council sessions",
        "Upload 10 reference papers",
        "Write 1,000 words this week",
        "Run your first full gap analysis",
    ]

    return {
        "score": score,
        "label": label,
        "streak_days": streak,
        "documents_this_week": doc_count,
        "gaps_found": gap_count,
        "breakthrough_proximity": breakthrough,
        "next_milestone": milestones[total_docs % len(milestones)],
        "insights": insights[:3],
    }


@router.post("/narrative")
def living_narrative(
    body: NarrativeRequest,
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Living Thesis Narrative — AI synthesises your research into an evolving story."""
    schema = {
        "type": "object",
        "properties": {
            "narrative": {"type": "string"},
            "research_direction": {"type": "string"},
            "predicted_contribution": {"type": "string"},
            "next_steps": {
                "type": "array",
                "items": {"type": "string"},
            },
        },
    }

    keywords_str = ", ".join(body.keywords) if body.keywords else "not yet defined"

    result = llm_service.invoke_llm(
        prompt=(
            f"Project: {body.project_title}\n"
            f"Stage: {body.stage or 'early exploration'}\n"
            f"Keywords: {keywords_str}\n"
            f"Recent activity: {body.recent_activity or 'Getting started'}"
        ),
        system_prompt=(
            "You are a research narrative synthesiser. Write as if you are the researcher's inner voice, "
            "articulating the emerging story of their work.\n\n"
            "Return:\n"
            "- narrative: 2-3 sentences describing the living research journey in first person. "
            "Make it feel alive, forward-looking, and intellectually exciting.\n"
            "- research_direction: A bold, specific phrase for where the research is heading "
            "(e.g. 'Towards a unified theory of cognitive load under uncertainty')\n"
            "- predicted_contribution: A specific, bold prediction of what this research will contribute "
            "to the field (1-2 sentences)\n"
            "- next_steps: 3 specific, actionable next steps\n\n"
            "Be inspirational but academically grounded. Avoid vague generalities."
        ),
        response_json_schema=schema,
    )

    if not llm_service._is_api_key_configured():
        kw = body.keywords[0] if body.keywords else "this phenomenon"
        result = {
            "narrative": (
                f"I am beginning to see the shape of something important. My work on {body.project_title} "
                f"is moving beyond description toward explanation — I'm not just asking what happens "
                f"with {kw}, but why the field has failed to see it clearly until now."
            ),
            "research_direction": f"Challenging the foundational assumptions about {kw}",
            "predicted_contribution": (
                f"This research will provide the first empirically-validated framework for understanding "
                f"{kw} in context, offering practitioners a decision-making tool where none currently exists."
            ),
            "next_steps": [
                "Draft a one-page position statement articulating your core theoretical claim",
                "Identify the three papers your work most directly challenges or extends",
                "Run a gap analysis on your most recent literature to find your exact entry point",
            ],
        }

    return result


# ── AutoPilot Agent ────────────────────────────────────────────────────────────

class AutopilotRequest(BaseModel):
    question: str
    context: Optional[str] = None
    max_steps: Optional[int] = 4


class AutopilotStep(BaseModel):
    step: int
    type: str  # "plan" | "search" | "analyze" | "synthesize" | "reflect"
    thought: str
    action: str
    observation: str


class AutopilotResponse(BaseModel):
    steps: List[AutopilotStep]
    final_report: str
    confidence: int
    next_questions: List[str]


_MOCK_AUTOPILOT_STEPS = [
    {
        "type": "plan",
        "thought": "Let me break this research question into its core components and identify what I need to find out.",
        "action": "Decomposing question into: (1) theoretical foundations, (2) empirical evidence gaps, (3) methodological considerations, (4) adjacent field connections.",
        "observation": "Four distinct sub-problems identified. Starting with theoretical foundations as they constrain everything downstream.",
    },
    {
        "type": "search",
        "thought": "Scanning the theoretical landscape — what frameworks currently exist, and where do they break down?",
        "action": "Searching: existing theoretical models, critical literature, key contradictions in the field.",
        "observation": "Found three competing theoretical camps. The tension between camps 1 and 3 is where the most interesting unresolved questions live.",
    },
    {
        "type": "analyze",
        "thought": "The empirical record has a suspicious pattern — most studies stop before the effect should peak.",
        "action": "Analyzing: temporal scope of existing studies, sample characteristics, measurement instruments used.",
        "observation": "Critical insight: 87% of studies use cross-sectional designs when longitudinal data is theoretically required. This is a systemic methodological gap.",
    },
    {
        "type": "synthesize",
        "thought": "I can now see how the pieces connect. The theoretical tension I found maps directly onto the methodological gap.",
        "action": "Cross-referencing theoretical predictions with empirical designs — looking for where theory demands data that doesn't exist.",
        "observation": "The core gap: theory predicts temporal dynamics, but no study has captured them. Your research could be the first to close this loop.",
    },
]

_MOCK_AUTOPILOT_REPORT = (
    "**AutoPilot Research Report**\n\n"
    "After 4 investigative steps, a clear picture emerges. The field has a structurally predictable gap: "
    "theoretical models demand longitudinal evidence, but the entire empirical literature relies on "
    "cross-sectional designs. This is not a minor oversight — it means the foundational causal claims "
    "in the field are empirically unvalidated.\n\n"
    "**Your strategic position**: You are not entering a crowded field — you are entering a field with "
    "a known, acknowledged gap that no one has closed. The path to a high-impact publication is clearer "
    "than most researchers encounter.\n\n"
    "**Critical watch-out**: The reason no one has closed this gap yet is likely practical — longitudinal "
    "studies are expensive and slow. Your proposal will need to address feasibility explicitly."
)


@router.post("/autopilot", response_model=AutopilotResponse)
def autopilot_agent(
    body: AutopilotRequest,
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """AutoPilot — autonomous multi-step ReAct agent that researches your question."""
    step_types = ["plan", "search", "analyze", "synthesize"]
    steps = []

    step_schema = {
        "type": "object",
        "properties": {
            "thought": {"type": "string"},
            "action": {"type": "string"},
            "observation": {"type": "string"},
        },
    }

    for i, step_type in enumerate(step_types[: body.max_steps]):
        if llm_service._is_api_key_configured():
            system = (
                f"You are an autonomous research agent executing step {i+1} of {body.max_steps}: {step_type.upper()}.\n"
                f"Prior steps completed: {i}.\n"
                "You are doing deep research using a ReAct (Reason + Act) loop.\n"
                f"For this {step_type} step:\n"
                "- thought: Your internal reasoning (1-2 sentences — what you're thinking)\n"
                "- action: What you're doing (specific search/analysis action)\n"
                "- observation: What you discovered (specific, surprising if possible)\n"
                "Be intellectually honest and specific. Avoid vague generalities."
            )
            result = llm_service.invoke_llm(
                prompt=f"Research question: {body.question}\n\nContext: {body.context or 'None provided'}",
                system_prompt=system,
                response_json_schema=step_schema,
            )
        else:
            mock = _MOCK_AUTOPILOT_STEPS[i] if i < len(_MOCK_AUTOPILOT_STEPS) else _MOCK_AUTOPILOT_STEPS[-1]
            result = {"thought": mock["thought"], "action": mock["action"], "observation": mock["observation"]}

        steps.append(AutopilotStep(
            step=i + 1,
            type=step_type,
            thought=result.get("thought", ""),
            action=result.get("action", ""),
            observation=result.get("observation", ""),
        ))

    # Final report
    report_schema = {
        "type": "object",
        "properties": {
            "final_report": {"type": "string"},
            "confidence": {"type": "number"},
            "next_questions": {"type": "array", "items": {"type": "string"}},
        },
    }

    if llm_service._is_api_key_configured():
        steps_text = "\n\n".join(f"Step {s.step} ({s.type}): {s.observation}" for s in steps)
        report_result = llm_service.invoke_llm(
            prompt=f"Question: {body.question}\n\nResearch steps completed:\n{steps_text}",
            system_prompt=(
                "You are completing an autonomous research agent run. Write a final research report "
                "synthesizing all steps. Include: key findings, strategic position of the researcher, "
                "critical watch-outs. Also provide 3 follow-up questions to investigate next. "
                "Confidence (0-100) reflects how well-defined the research opportunity appears."
            ),
            response_json_schema=report_schema,
        )
    else:
        report_result = {
            "final_report": _MOCK_AUTOPILOT_REPORT,
            "confidence": 81,
            "next_questions": [
                "What longitudinal datasets exist in this domain that could be repurposed?",
                "Which of the three theoretical camps has the most empirical support despite the gap?",
                "Has anyone attempted a proxy measure for the longitudinal variable using retrospective data?",
            ],
        }

    return AutopilotResponse(
        steps=steps,
        final_report=report_result.get("final_report", ""),
        confidence=int(report_result.get("confidence", 75)),
        next_questions=report_result.get("next_questions", []),
    )


# ── Agent Debate Chamber ───────────────────────────────────────────────────────

class DebateRequest(BaseModel):
    hypothesis: str
    context: Optional[str] = None
    rounds: Optional[int] = 3


class DebateExchange(BaseModel):
    round: int
    agent: str  # "proponent" | "challenger"
    agent_name: str
    argument: str
    key_claim: str


class DebateResponse(BaseModel):
    hypothesis: str
    exchanges: List[DebateExchange]
    verdict: str
    strongest_argument: str
    weakest_link: str


_MOCK_DEBATE = [
    {
        "round": 1, "agent": "proponent", "agent_name": "Dr. Advocate",
        "argument": "This hypothesis stands on solid empirical and theoretical ground. The mechanism is well-understood: the relationship between these variables has been observed across multiple contexts, and the theoretical framework predicts the direction of effect with precision. Three independent research groups have found convergent evidence. The novelty isn't whether this is true — it's in establishing the boundary conditions and magnitude of the effect.",
        "key_claim": "Convergent evidence from independent sources makes this hypothesis highly defensible.",
    },
    {
        "round": 1, "agent": "challenger", "agent_name": "Dr. Contradict",
        "argument": "The convergence you cite is illusory — all three research groups used the same instrument, developed by the same lab, and share the same measurement assumptions. This isn't independent replication; it's coordinated repetition. More critically, the 'mechanism' you describe is a post-hoc narrative fitted to correlational data. The field has confused operationalisation for explanation. Your hypothesis may be measuring a measurement artifact.",
        "key_claim": "Apparent convergence masks shared methodological DNA — the evidence base is more fragile than it looks.",
    },
    {
        "round": 2, "agent": "proponent", "agent_name": "Dr. Advocate",
        "argument": "The shared instrument concern is real but overstated — construct validity has been established through multi-trait multi-method studies. More importantly, even if the measurement were noisy, the signal-to-noise ratio across the literature is too consistent for artifact alone to explain. That said, I concede the causal mechanism needs a stronger test: a pre-registered longitudinal design would address both concerns simultaneously.",
        "key_claim": "Conceding the measurement concern while pivoting to pre-registered longitudinal design as the definitive test.",
    },
    {
        "round": 2, "agent": "challenger", "agent_name": "Dr. Contradict",
        "argument": "The concession on mechanism is significant — you've tacitly admitted the hypothesis is currently correlational. More precisely: what you're calling a hypothesis is actually a research question dressed up as a claim. This isn't weakness — it's honesty. A truly falsifiable hypothesis would specify the effect direction, magnitude, and time course. Can you predict, in advance, the effect size you expect to find? Without that, you're doing exploratory research calling itself confirmatory.",
        "key_claim": "The hypothesis needs to be more precisely specified — direction, magnitude, and time course must be pre-committed.",
    },
    {
        "round": 3, "agent": "proponent", "agent_name": "Dr. Advocate",
        "argument": "Fair challenge — and valuable. The predicted effect size, based on meta-analytic estimates, is d=0.45-0.65. Time course prediction: effects emerge within 4-6 weeks of exposure and plateau at 12 weeks. These are falsifiable claims. The challenger has done me a service: this debate has sharpened my hypothesis from a general directional claim into a precise, pre-registerable prediction. That is exactly what a rigorous pilot debate should accomplish.",
        "key_claim": "Pre-committing to d=0.45-0.65 with a 4-12 week emergence window makes this genuinely falsifiable.",
    },
    {
        "round": 3, "agent": "challenger", "agent_name": "Dr. Contradict",
        "argument": "I accept the pre-committed effect size — that's a testable claim. My remaining concern is theoretical: you've described the what and when, but not convincingly the why. The mechanism still reads as plausible narrative rather than theory with predictive power. The hypothesis will survive empirical testing, but without a mechanistic account, it will sit in the literature as a robust fact with no theoretical home. Build the mechanism now, before you collect data.",
        "key_claim": "Final challenge: a mechanistic account must be developed before data collection, not reverse-engineered afterward.",
    },
]


@router.post("/debate", response_model=DebateResponse)
def agent_debate(
    body: DebateRequest,
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Debate Chamber — two AI agents argue opposing sides of your research hypothesis."""
    exchanges = []
    exchange_schema = {
        "type": "object",
        "properties": {
            "argument": {"type": "string"},
            "key_claim": {"type": "string"},
        },
    }

    proponent_persona = (
        "You are Dr. Advocate — a passionate defender of the research hypothesis in a formal academic debate. "
        "Your goal: build the strongest possible case FOR the hypothesis. Cite mechanisms, evidence, and logic. "
        "Respond directly to the challenger's previous argument. Be intellectually honest — concede valid points "
        "but reframe them as strengths. Never be dismissive. 2-3 sentences of argument + one key claim."
    )
    challenger_persona = (
        "You are Dr. Contradict — a rigorous academic skeptic arguing AGAINST the hypothesis in formal debate. "
        "Your goal: expose weaknesses, question assumptions, demand higher standards of evidence. "
        "Respond directly to the proponent's latest argument. Be precise and constructive — not nihilistic. "
        "2-3 sentences of argument + one key claim."
    )

    prior_exchange = ""
    for round_num in range(1, min(body.rounds, 3) + 1):
        for agent, persona, name in [
            ("proponent", proponent_persona, "Dr. Advocate"),
            ("challenger", challenger_persona, "Dr. Contradict"),
        ]:
            if llm_service._is_api_key_configured():
                prompt = (
                    f"Hypothesis under debate: {body.hypothesis}\n"
                    f"Context: {body.context or 'None'}\n"
                    f"Round {round_num}, your turn.\n"
                    f"Prior exchange:\n{prior_exchange or 'Opening round — no prior exchange.'}"
                )
                result = llm_service.invoke_llm(
                    prompt=prompt,
                    system_prompt=persona,
                    response_json_schema=exchange_schema,
                )
                argument = result.get("argument", "")
                key_claim = result.get("key_claim", "")
            else:
                mock_idx = (round_num - 1) * 2 + (0 if agent == "proponent" else 1)
                mock = _MOCK_DEBATE[min(mock_idx, len(_MOCK_DEBATE) - 1)]
                argument = mock["argument"]
                key_claim = mock["key_claim"]

            prior_exchange += f"\n{name}: {argument}"
            exchanges.append(DebateExchange(
                round=round_num,
                agent=agent,
                agent_name=name,
                argument=argument,
                key_claim=key_claim,
            ))

    # Verdict
    verdict_schema = {
        "type": "object",
        "properties": {
            "verdict": {"type": "string"},
            "strongest_argument": {"type": "string"},
            "weakest_link": {"type": "string"},
        },
    }

    if llm_service._is_api_key_configured():
        debate_text = "\n".join(f"{e.agent_name} (R{e.round}): {e.argument}" for e in exchanges)
        verdict_result = llm_service.invoke_llm(
            prompt=f"Hypothesis: {body.hypothesis}\n\nDebate transcript:\n{debate_text}",
            system_prompt=(
                "You are an impartial academic judge. Deliver a verdict on the debate. "
                "verdict: Which side made the stronger case and why (2-3 sentences). "
                "strongest_argument: The single most intellectually powerful argument made. "
                "weakest_link: The most significant unresolved weakness in the hypothesis."
            ),
            response_json_schema=verdict_schema,
        )
    else:
        verdict_result = {
            "verdict": (
                "The Challenger won on points, but the Proponent showed intellectual flexibility that ultimately "
                "strengthened the hypothesis. By round 3, the hypothesis had evolved from a vague directional "
                "claim into a pre-registered, falsifiable prediction with a specific effect size and time course. "
                "The debate served its purpose: the hypothesis is now sharper than when it entered the chamber."
            ),
            "strongest_argument": (
                "Dr. Contradict's Round 2 challenge — distinguishing genuine independent replication from "
                "coordinated repetition using the same instrument — is the most intellectually precise argument. "
                "It exposes a structural weakness in how the field has interpreted convergent evidence."
            ),
            "weakest_link": (
                "The theoretical mechanism remains under-specified. The hypothesis can predict what will happen "
                "and when, but not convincingly why. Without a mechanistic account, the finding will be empirically "
                "robust but theoretically homeless."
            ),
        }

    return DebateResponse(
        hypothesis=body.hypothesis,
        exchanges=exchanges,
        verdict=verdict_result.get("verdict", ""),
        strongest_argument=verdict_result.get("strongest_argument", ""),
        weakest_link=verdict_result.get("weakest_link", ""),
    )


# ── Research Genome ────────────────────────────────────────────────────────────

@router.get("/genome")
def research_genome(
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Research Genome — analyses all your data to produce a unique research DNA profile."""
    from app.models import Document, ResearchGap, ResearchProject, Conversation

    user_id = current_user.email if current_user else None

    doc_count = proj_count = gap_count = conv_count = 0
    empirical_docs = theoretical_docs = methodological_gaps = theoretical_gaps = 0

    if user_id:
        proj_count = db.query(ResearchProject).filter(ResearchProject.created_by == user_id).count()
        doc_count = db.query(Document).filter(Document.created_by == user_id).count()
        gap_count = db.query(ResearchGap).filter(ResearchGap.created_by == user_id).count()
        conv_count = db.query(Conversation).filter(Conversation.created_by == user_id).count()

        empirical_docs = db.query(Document).filter(
            Document.created_by == user_id,
            Document.document_type.in_(["research_paper", "data"])
        ).count()
        theoretical_docs = db.query(Document).filter(
            Document.created_by == user_id,
            Document.document_type.in_(["literature_review", "book_chapter"])
        ).count()
        methodological_gaps = db.query(ResearchGap).filter(
            ResearchGap.created_by == user_id,
            ResearchGap.gap_type == "methodological"
        ).count()
        theoretical_gaps = db.query(ResearchGap).filter(
            ResearchGap.created_by == user_id,
            ResearchGap.gap_type == "theoretical"
        ).count()

    total = max(1, doc_count + gap_count + conv_count + proj_count)

    empiricism = min(100, 20 + (empirical_docs * 15) + (doc_count * 5))
    theorism = min(100, 20 + (theoretical_docs * 15) + (theoretical_gaps * 10))
    criticality = min(100, 25 + (gap_count * 18) + (methodological_gaps * 12))
    breadth = min(100, 20 + (conv_count * 8) + (proj_count * 20))
    momentum_trait = min(100, 30 + (doc_count + gap_count + conv_count) * 7)

    traits = {
        "empiricism": empiricism,
        "theorism": theorism,
        "criticality": criticality,
        "breadth": breadth,
        "momentum": momentum_trait,
    }

    archetypes = [
        ("The Pioneer", empiricism > 60 and criticality > 50, "You challenge boundaries with evidence-first thinking."),
        ("The Theorist", theorism > 60, "You build frameworks that others use for decades."),
        ("The Critic", criticality > 65, "You see what others miss — the gaps in the gaps."),
        ("The Polymath", breadth > 55 and theorism > 40 and empiricism > 40, "You weave across disciplines with rare fluency."),
        ("The Builder", momentum_trait > 60 and empiricism > 40, "You ship. Research becomes reality in your hands."),
        ("The Explorer", breadth > 50, "You map territories others haven't named yet."),
    ]

    archetype = next(
        ((name, desc) for name, cond, desc in archetypes if cond),
        ("The Emerging Scholar", "Your research DNA is still forming — each project sharpens the pattern.")
    )

    dominant = max(traits, key=traits.get)
    dominant_labels = {
        "empiricism": "You are drawn to evidence — data is your primary language.",
        "theorism": "You are drawn to frameworks — you think in structures.",
        "criticality": "You are drawn to gaps — you see what's missing.",
        "breadth": "You are drawn to connections — breadth is your superpower.",
        "momentum": "You are drawn to progress — you build relentlessly.",
    }

    return {
        "traits": traits,
        "archetype": archetype[0],
        "archetype_description": archetype[1],
        "dominant_trait": dominant,
        "dominant_description": dominant_labels.get(dominant, ""),
        "strengths": [
            f"{'High empirical instinct' if empiricism > 50 else 'Growing empirical base'} — {empirical_docs} empirical documents",
            f"{'Sharp critical eye' if criticality > 50 else 'Developing critical lens'} — {gap_count} research gaps identified",
            f"{'Active engagement' if conv_count > 2 else 'Emerging engagement'} — {conv_count} research sessions",
        ],
        "blind_spots": [
            "Theoretical grounding" if theorism < 40 else None,
            "Cross-project synthesis" if breadth < 40 else None,
            "Methodological gap hunting" if criticality < 40 else None,
            "Empirical validation" if empiricism < 40 else None,
        ],
        "total_research_events": total,
    }


# ── Breakthrough Oracle ────────────────────────────────────────────────────────

class BreakthroughRequest(BaseModel):
    hypothesis: str
    research_area: Optional[str] = None
    current_approach: Optional[str] = None


@router.post("/breakthrough")
def breakthrough_oracle(
    body: BreakthroughRequest,
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Breakthrough Oracle — estimates breakthrough probability and maps the path to impact."""
    schema = {
        "type": "object",
        "properties": {
            "score": {"type": "number"},
            "verdict": {"type": "string"},
            "factors": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "factor": {"type": "string"},
                        "impact": {"type": "string"},
                        "score_contribution": {"type": "number"},
                    },
                },
            },
            "missing_ingredients": {"type": "array", "items": {"type": "string"}},
            "analogous_breakthroughs": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "field": {"type": "string"},
                        "breakthrough": {"type": "string"},
                        "lesson": {"type": "string"},
                    },
                },
            },
            "unlock_actions": {"type": "array", "items": {"type": "string"}},
        },
    }

    result = llm_service.invoke_llm(
        prompt=(
            f"Hypothesis: {body.hypothesis}\n"
            f"Research area: {body.research_area or 'Not specified'}\n"
            f"Current approach: {body.current_approach or 'Not specified'}"
        ),
        system_prompt=(
            "You are the Breakthrough Oracle — an AI that estimates the probability and pathway to "
            "a genuine scientific breakthrough.\n\n"
            "Analyse the hypothesis and return:\n"
            "- score (0-100): Breakthrough probability. Be honest — most work scores 30-60. "
            "Scores above 80 should be rare and justified.\n"
            "- verdict: 2-sentence assessment of breakthrough potential\n"
            "- factors: 4 factors (positive and negative) affecting breakthrough probability. "
            "Each with factor name, impact description, score_contribution (+/-)\n"
            "- missing_ingredients: 3 specific things that, if added, would significantly raise the score\n"
            "- analogous_breakthroughs: 3 breakthroughs from OTHER fields that used similar logic, "
            "with the lesson transferable to this hypothesis\n"
            "- unlock_actions: 3 specific, concrete actions that would move the needle most"
        ),
        response_json_schema=schema,
    )

    if not llm_service._is_api_key_configured():
        hyp = body.hypothesis[:60]
        result = {
            "score": 67,
            "verdict": (
                f"The hypothesis on '{hyp}' has genuine breakthrough potential — it addresses a real gap "
                f"and has a plausible mechanism. The main barrier to breakthrough status is specificity: "
                f"the current framing is directional but not predictive enough to generate surprise if confirmed."
            ),
            "factors": [
                {
                    "factor": "Novel Gap Identification",
                    "impact": "You've identified a gap that the field acknowledges but hasn't closed",
                    "score_contribution": 18,
                },
                {
                    "factor": "Mechanism Clarity",
                    "impact": "The causal mechanism is plausible but underspecified",
                    "score_contribution": -12,
                },
                {
                    "factor": "Methodological Appropriateness",
                    "impact": "Your proposed approach matches the theoretical demands of the question",
                    "score_contribution": 15,
                },
                {
                    "factor": "Predictive Precision",
                    "impact": "The hypothesis doesn't yet commit to a specific effect size or time course",
                    "score_contribution": -8,
                },
            ],
            "missing_ingredients": [
                "A pre-committed quantitative prediction (effect size + direction) — what would falsify this?",
                "A theoretical mechanism with independent testable predictions beyond the main hypothesis",
                "A boundary condition: under what circumstances would this NOT hold?",
            ],
            "analogous_breakthroughs": [
                {
                    "field": "Epidemiology",
                    "breakthrough": "Helicobacter pylori and ulcers (Barry Marshall, 1984)",
                    "lesson": "Marshall's breakthrough came from rejecting the field consensus. Your hypothesis may require similar intellectual courage to challenge what 'everyone knows' is true.",
                },
                {
                    "field": "Physics",
                    "breakthrough": "Dark matter via gravitational lensing",
                    "lesson": "The breakthrough came from looking for effects of an unobserved cause. If your construct is hard to measure directly, consider measuring its gravitational shadow — downstream effects.",
                },
                {
                    "field": "Psychology",
                    "breakthrough": "Kahneman & Tversky's Prospect Theory",
                    "lesson": "They didn't just describe how people behave — they built a formal model that made wrong-direction predictions that turned out to be right. Breakthrough = model precision, not just direction.",
                },
            ],
            "unlock_actions": [
                "Write a one-paragraph 'if I'm wrong' statement — what data would definitively falsify your hypothesis?",
                "Find the most recent paper that directly contradicts your hypothesis and engage with it head-on in your framing",
                "Pre-register your effect size prediction on OSF before collecting data — public commitment forces precision",
            ],
        }

    return result


# ── Project Insights ──────────────────────────────────────────────────────────

class ProjectInsightsRequest(BaseModel):
    project_id: str
    title: str
    stage: Optional[str] = None
    field: Optional[str] = None
    abstract: Optional[str] = None
    keywords: Optional[List[str]] = None
    research_questions: Optional[List[str]] = None
    target_journal: Optional[str] = None
    deadline: Optional[str] = None
    progress: Optional[int] = None


@router.post("/project-insights")
def project_insights(
    body: ProjectInsightsRequest,
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """AI-powered project health analysis and next-step recommendations."""
    schema = {
        "type": "object",
        "properties": {
            "health_score": {"type": "number"},
            "health_label": {"type": "string"},
            "narrative": {"type": "string"},
            "next_actions": {"type": "array", "items": {"type": "string"}},
            "risks": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "risk": {"type": "string"},
                        "severity": {"type": "string"},
                        "mitigation": {"type": "string"},
                    },
                },
            },
            "velocity_tip": {"type": "string"},
            "predicted_contribution": {"type": "string"},
        },
    }

    kw_str = ", ".join(body.keywords) if body.keywords else "not specified"
    rq_str = "\n".join(f"- {q}" for q in (body.research_questions or [])) or "not specified"

    result = llm_service.invoke_llm(
        prompt=(
            f"Project: {body.title}\n"
            f"Field: {body.field or 'not specified'}\n"
            f"Stage: {body.stage or 'ideation'}\n"
            f"Progress: {body.progress or 0}%\n"
            f"Abstract: {body.abstract or 'none provided'}\n"
            f"Keywords: {kw_str}\n"
            f"Research questions:\n{rq_str}\n"
            f"Target journal: {body.target_journal or 'not set'}\n"
            f"Deadline: {body.deadline or 'not set'}"
        ),
        system_prompt=(
            "You are a senior research advisor giving a confidential project health review.\n\n"
            "Return:\n"
            "- health_score (0-100): Overall project health. Be honest — consider stage clarity, "
            "question specificity, and momentum.\n"
            "- health_label: One of 'Critical', 'At Risk', 'On Track', 'Thriving', 'Breakthrough Ready'\n"
            "- narrative: 2 sentences about the project's current trajectory in first person, "
            "forward-looking and specific.\n"
            "- next_actions: 3 high-leverage, specific next steps the researcher should take NOW.\n"
            "- risks: 2 risks with fields: risk (name), severity ('low'|'medium'|'high'), mitigation.\n"
            "- velocity_tip: One concrete habit or practice that would most accelerate this project.\n"
            "- predicted_contribution: One sentence predicting the likely academic contribution if completed."
        ),
        response_json_schema=schema,
    )

    if not llm_service._is_api_key_configured():
        stage_label = body.stage or "ideation"
        result = {
            "health_score": 72,
            "health_label": "On Track",
            "narrative": (
                f"My work on '{body.title}' is building momentum at the {stage_label} stage — "
                f"the core questions are taking shape and the theoretical territory is becoming clearer. "
                f"The next 4-6 weeks are critical for locking in my methodological approach."
            ),
            "next_actions": [
                f"Draft a one-page theoretical framework connecting your {kw_str.split(',')[0].strip() if body.keywords else 'core concept'} to the empirical claims you intend to make",
                "Identify the 3 papers most directly in conversation with your work and map where yours fits in the dialogue",
                "Write a 200-word 'contribution statement' — what does this add that doesn't exist yet?",
            ],
            "risks": [
                {
                    "risk": "Scope creep",
                    "severity": "medium",
                    "mitigation": "Write a one-sentence boundary statement: 'This project will NOT address...'",
                },
                {
                    "risk": "Delayed methodology decision",
                    "severity": "high" if (body.progress or 0) > 30 else "low",
                    "mitigation": "Commit to a methodological approach before the literature review is complete — late pivots are expensive.",
                },
            ],
            "velocity_tip": "Block 90 uninterrupted minutes each morning for deep research work — your best insights won't come from fragmented sessions.",
            "predicted_contribution": (
                f"If completed rigorously, this research will provide an empirically-validated framework "
                f"for understanding {kw_str.split(',')[0].strip() if body.keywords else 'the phenomena'} "
                f"that currently lacks consensus in the {body.field or 'research'} community."
            ),
        }

    return result


# ── Research Chat ─────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    mode: Optional[str] = "general"
    doc_id: Optional[str] = None    # RAG: preferred over doc_text
    doc_name: Optional[str] = None
    doc_text: Optional[str] = None  # legacy fallback
    image_base64: Optional[str] = None
    image_media_type: Optional[str] = None
    project_title: Optional[str] = None
    project_field: Optional[str] = None
    project_abstract: Optional[str] = None
    project_research_questions: Optional[List[str]] = None
    project_keywords: Optional[List[str]] = None
    project_stage: Optional[str] = None
    project_target_journal: Optional[str] = None


@router.post("/chat")
def research_chat(
    body: ChatRequest,
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Research assistant chat with optional document context via RAG."""
    schema = {
        "type": "object",
        "properties": {
            "response":       {"type": "string"},
            "suggestions":    {"type": "array", "items": {"type": "string"}},
            "confidence":     {"type": "number"},
            "sources_needed": {"type": "boolean"},
        },
    }

    # RAG: retrieve relevant chunks when doc_id is provided
    rag_chunks: List[str] = []
    if body.doc_id:
        query_vec = embedding_svc.embed_query(body.message)
        rag_chunks = vs_svc.retrieve_chunks(body.doc_id, query_vec, top_k=6)

    project_ctx = ""
    if body.project_title:
        project_ctx += f"\nResearch project: {body.project_title}"
    if body.project_field:
        project_ctx += f"\nField: {body.project_field}"
    if body.project_abstract:
        project_ctx += f"\nAbstract: {body.project_abstract}"
    if body.project_research_questions:
        project_ctx += f"\nResearch questions: {'; '.join(body.project_research_questions)}"
    if body.project_keywords:
        project_ctx += f"\nKeywords: {', '.join(body.project_keywords)}"
    if body.project_stage:
        project_ctx += f"\nStage: {body.project_stage}"
    if body.project_target_journal:
        project_ctx += f"\nTarget journal: {body.project_target_journal}"

    if rag_chunks:
        doc_context = "\n\n".join(f"[Excerpt {i+1}]\n{c}" for i, c in enumerate(rag_chunks))
        system_prompt = (
            f"You are an expert research assistant in {body.mode or 'general'} mode. "
            f"Answer using ONLY the document excerpts provided. Do not use outside knowledge about the document content."
            f"{project_ctx}"
        )
        user_prompt = (
            f'--- DOCUMENT: "{body.doc_name or "Uploaded Document"}" (relevant excerpts) ---\n'
            f"{doc_context}\n"
            f"--- END OF EXCERPTS ---\n\n"
            f"Question: {body.message}"
        )
    elif body.doc_text:
        system_prompt = f"You are an expert research assistant in {body.mode or 'general'} mode.{project_ctx}"
        user_prompt = (
            f'--- DOCUMENT: "{body.doc_name}" ---\n{body.doc_text}\n--- END OF DOCUMENT ---\n\n'
            f"Question: {body.message}"
        )
    else:
        system_prompt = f"You are an expert research assistant in {body.mode or 'general'} mode.{project_ctx}"
        user_prompt = body.message

    result = llm_service.invoke_llm(
        prompt=user_prompt,
        system_prompt=system_prompt,
        response_json_schema=schema,
        image_base64=body.image_base64,
        image_media_type=body.image_media_type,
    )

    if not llm_service._is_api_key_configured():
        result = {
            "response": llm_service._MOCK_STRINGS.get("response", "This is a mock research assistant response. Configure an OpenAI API key for real responses."),
            "suggestions": ["Explore related literature", "Refine your research question", "Consider methodological alternatives"],
            "confidence": 0.85,
            "sources_needed": True,
        }

    return result


# ── Viva Simulator ────────────────────────────────────────────────────────────

_EXAMINER_PERSONAS = {
    "supportive": (
        "You are a Supportive Examiner — warm, encouraging, and constructive. "
        "You ask probing questions but frame them to help the candidate demonstrate their knowledge. "
        "You acknowledge good answers and guide candidates toward stronger responses."
    ),
    "neutral": (
        "You are a Neutral Examiner — professional, fair, and thorough. "
        "You ask clear, direct questions that test genuine understanding. "
        "You neither encourage nor discourage — you simply seek accurate, complete answers."
    ),
    "challenging": (
        "You are a Challenging Examiner — rigorous, demanding, and intellectually uncompromising. "
        "You push candidates to defend every claim, question every assumption, and demonstrate mastery. "
        "You respect intellectual honesty over confident bluffing."
    ),
    "skeptical": (
        "You are a Skeptical Examiner — critical, probing, and hard to satisfy. "
        "You question methodology, challenge conclusions, and probe for weaknesses. "
        "A good answer only prompts a harder follow-up."
    ),
}


class VivaQuestionRequest(BaseModel):
    examiner_type: Optional[str] = "neutral"
    question_history: Optional[List[str]] = None
    doc_id: Optional[str] = None    # RAG: preferred over doc_text
    doc_name: Optional[str] = None
    doc_text: Optional[str] = None  # legacy fallback
    project_title: Optional[str] = None
    project_field: Optional[str] = None
    project_abstract: Optional[str] = None
    project_research_questions: Optional[List[str]] = None
    project_keywords: Optional[List[str]] = None


class VivaEvaluateRequest(BaseModel):
    examiner_type: Optional[str] = "neutral"
    question: str
    question_type: Optional[str] = None
    expected_topics: Optional[List[str]] = None
    answer: str
    doc_id: Optional[str] = None    # RAG: preferred over doc_text
    doc_name: Optional[str] = None
    doc_text: Optional[str] = None  # legacy fallback


@router.post("/viva/question")
def viva_question(
    body: VivaQuestionRequest,
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Generate a viva examination question from the candidate's document or project."""
    schema = {
        "type": "object",
        "properties": {
            "question":        {"type": "string"},
            "question_type":   {"type": "string"},
            "difficulty":      {"type": "number"},
            "expected_topics": {"type": "array", "items": {"type": "string"}},
            "follow_up_areas": {"type": "array", "items": {"type": "string"}},
            "examiner_intent": {"type": "string"},
        },
    }

    persona = _EXAMINER_PERSONAS.get(body.examiner_type or "neutral", _EXAMINER_PERSONAS["neutral"])
    prev_questions = "; ".join(body.question_history) if body.question_history else "None yet"

    # RAG retrieval
    rag_chunks: List[str] = []
    if body.doc_id:
        query_parts = [body.examiner_type or "viva examination question"]
        if body.question_history:
            query_parts.append("areas not yet covered: " + "; ".join(body.question_history[-3:]))
        query_vec = embedding_svc.embed_query(" ".join(query_parts))
        rag_chunks = vs_svc.retrieve_chunks(body.doc_id, query_vec, top_k=6)

    if rag_chunks:
        doc_context = "\n\n".join(f"[Excerpt {i+1}]\n{c}" for i, c in enumerate(rag_chunks))
        prompt = (
            f"{persona}\n\n"
            f"The candidate has submitted a written work for examination. "
            f"Use ONLY the excerpts below — do not use outside knowledge.\n\n"
            f'--- DOCUMENT: "{body.doc_name or "Candidate\'s Work"}" (relevant excerpts) ---\n'
            f"{doc_context}\n--- END OF EXCERPTS ---\n\n"
            f"Previous questions asked: {prev_questions}\n\n"
            f"Generate a new viva question probing a specific claim, methodology, result, "
            f"or contribution in the excerpts not yet covered."
        )
    elif body.doc_text:
        prompt = (
            f"{persona}\n\n"
            f"The candidate has submitted the following written work. "
            f"Read it carefully — this is the ONLY source. Do not use outside knowledge.\n\n"
            f'--- DOCUMENT: "{body.doc_name}" ---\n'
            f"{body.doc_text}\n--- END OF DOCUMENT ---\n\n"
            f"Previous questions asked: {prev_questions}\n\n"
            f"Generate a new viva question probing a specific claim, methodology, result, "
            f"or contribution not yet covered."
        )
    else:
        project_ctx = f"Research topic: {body.project_title or 'General research methodology'}\n"
        project_ctx += f"Research field: {body.project_field or 'Academic research'}\n"
        if body.project_abstract:
            project_ctx += f"Abstract: {body.project_abstract}\n"
        if body.project_research_questions:
            project_ctx += f"Research questions: {'; '.join(body.project_research_questions)}\n"
        if body.project_keywords:
            project_ctx += f"Keywords: {', '.join(body.project_keywords)}\n"
        prompt = (
            f"{persona}\n\n"
            f"Generate a viva voce examination question for a PhD candidate.\n"
            f"{project_ctx}"
            f"Previous questions asked: {prev_questions}\n\n"
            f"Generate a new question that hasn't been asked yet."
        )

    result = llm_service.invoke_llm(prompt=prompt, response_json_schema=schema)

    if not llm_service._is_api_key_configured():
        result = {
            "question": "Can you explain the theoretical framework underpinning your methodology and justify why it is the most appropriate approach for your research questions?",
            "question_type": "Methodology",
            "difficulty": 3,
            "expected_topics": ["theoretical framework", "methodology justification", "research design"],
            "follow_up_areas": ["alternative methodologies", "validity and reliability", "ethical considerations"],
            "examiner_intent": "Assess depth of methodological understanding and ability to defend design choices.",
        }

    return result


@router.post("/viva/evaluate")
def viva_evaluate(
    body: VivaEvaluateRequest,
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Evaluate a candidate's viva answer and return detailed feedback."""
    schema = {
        "type": "object",
        "properties": {
            "overall_score":           {"type": "number"},
            "content_score":           {"type": "number"},
            "critical_thinking_score": {"type": "number"},
            "communication_score":     {"type": "number"},
            "feedback_summary":        {"type": "string"},
            "strengths":               {"type": "array", "items": {"type": "string"}},
            "improvements":            {"type": "array", "items": {"type": "string"}},
            "model_answer_points":     {"type": "array", "items": {"type": "string"}},
            "follow_up_question":      {"type": "string"},
        },
    }

    examiner_name = {
        "supportive": "Supportive Examiner",
        "neutral": "Neutral Examiner",
        "challenging": "Challenging Examiner",
        "skeptical": "Skeptical Examiner",
    }.get(body.examiner_type or "neutral", "Neutral Examiner")

    # RAG retrieval
    rag_chunks: List[str] = []
    if body.doc_id:
        query_vec = embedding_svc.embed_query(body.question + " " + body.answer[:200])
        rag_chunks = vs_svc.retrieve_chunks(body.doc_id, query_vec, top_k=6)

    if rag_chunks:
        doc_context = "\n\n".join(f"[Excerpt {i+1}]\n{c}" for i, c in enumerate(rag_chunks))
        prompt = (
            f"As a {examiner_name}, evaluate this viva answer.\n\n"
            f"Use the document excerpts to assess factual accuracy and completeness.\n\n"
            f'--- DOCUMENT: "{body.doc_name or "Candidate\'s Work"}" (relevant excerpts) ---\n'
            f"{doc_context}\n--- END OF EXCERPTS ---\n\n"
            f"Question asked: {body.question}\n\nCandidate's Answer:\n{body.answer}\n\n"
            f"Evaluate: (1) accuracy vs document, (2) critical thinking, "
            f"(3) academic communication, (4) areas to improve, (5) key points missed."
        )
    elif body.doc_text:
        prompt = (
            f"As a {examiner_name}, evaluate this viva answer.\n\n"
            f'--- DOCUMENT: "{body.doc_name}" ---\n{body.doc_text}\n--- END OF DOCUMENT ---\n\n'
            f"Question asked: {body.question}\n\nCandidate's Answer:\n{body.answer}\n\n"
            f"Evaluate: (1) accuracy vs document, (2) critical thinking, "
            f"(3) academic communication, (4) areas to improve, (5) key points missed."
        )
    else:
        topics_str = ", ".join(body.expected_topics) if body.expected_topics else "not specified"
        prompt = (
            f"As a {examiner_name}, evaluate this viva answer.\n\n"
            f"Question: {body.question}\nQuestion Type: {body.question_type or 'General'}\n"
            f"Expected Topics: {topics_str}\n\nCandidate's Answer:\n{body.answer}\n\n"
            f"Provide detailed feedback on: content accuracy, critical thinking, "
            f"academic communication, areas for improvement, suggested follow-up study areas."
        )

    result = llm_service.invoke_llm(prompt=prompt, response_json_schema=schema)

    if not llm_service._is_api_key_configured():
        result = {
            "overall_score": 74,
            "content_score": 76,
            "critical_thinking_score": 72,
            "communication_score": 74,
            "feedback_summary": "Your answer demonstrates a reasonable understanding of the core concepts but lacks depth in methodological justification. You correctly identified the main approach but missed key nuances in the theoretical framework.",
            "strengths": ["Clear articulation of main argument", "Good use of relevant terminology", "Logical structure in response"],
            "improvements": ["Provide more specific evidence from your research", "Address potential limitations proactively", "Connect your answer more explicitly to the theoretical framework"],
            "model_answer_points": ["Define the theoretical framework explicitly", "Justify methodology against alternatives", "Acknowledge limitations and how they were mitigated"],
            "follow_up_question": "How would you respond to a critic who argues your methodology introduces selection bias?",
        }

    return result


# ── Gap Analyzer ──────────────────────────────────────────────────────────────

class GapAnalysisRequest(BaseModel):
    topic: Optional[str] = None
    doc_id: Optional[str] = None    # RAG: preferred over doc_text
    doc_name: Optional[str] = None
    doc_text: Optional[str] = None  # legacy fallback
    project_title: Optional[str] = None
    project_abstract: Optional[str] = None
    project_research_questions: Optional[List[str]] = None
    project_keywords: Optional[List[str]] = None


@router.post("/gap-analysis")
def gap_analysis(
    body: GapAnalysisRequest,
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Identify research gaps from a topic description or uploaded document text."""
    schema = {
        "type": "object",
        "properties": {
            "gaps": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "title":                  {"type": "string"},
                        "description":            {"type": "string"},
                        "gap_type":               {"type": "string", "enum": ["methodological", "theoretical", "empirical", "contextual", "temporal"]},
                        "significance":           {"type": "string", "enum": ["low", "medium", "high", "critical"]},
                        "potential_contribution": {"type": "string"},
                        "related_keywords":       {"type": "array", "items": {"type": "string"}},
                        "confidence_score":       {"type": "number"},
                    },
                },
            },
            "field_overview":    {"type": "string"},
            "research_maturity": {"type": "string"},
        },
    }

    # RAG retrieval
    rag_chunks: List[str] = []
    if body.doc_id:
        gap_query = f"research gaps limitations future work {body.topic or body.project_title or ''}"
        query_vec = embedding_svc.embed_query(gap_query)
        rag_chunks = vs_svc.retrieve_chunks(body.doc_id, query_vec, top_k=8)

    if rag_chunks:
        doc_context = "\n\n".join(f"[Excerpt {i+1}]\n{c}" for i, c in enumerate(rag_chunks))
        prompt = (
            f"Analyze these research document excerpts to identify research gaps.\n\n"
            f'--- DOCUMENT: "{body.doc_name or "Research Document"}" (relevant excerpts) ---\n'
            f"{doc_context}\n--- END OF EXCERPTS ---\n\n"
            f"Identify: (1) research questions addressed, (2) methodological limitations, "
            f"(3) areas mentioned but not fully explored, (4) future work suggested, "
            f"(5) theoretical gaps remaining.\n\n"
            f"For each significant gap provide title, explanation, type, significance, and contribution opportunities."
        )
    elif body.doc_text:
        prompt = (
            f"Analyze this research document to identify research gaps.\n\n"
            f'--- DOCUMENT: "{body.doc_name}" ---\n{body.doc_text}\n--- END OF DOCUMENT ---\n\n'
            f"Identify: (1) research questions addressed, (2) methodological limitations, "
            f"(3) areas mentioned but not fully explored, (4) future work suggested, "
            f"(5) theoretical gaps remaining.\n\n"
            f"For each significant gap provide title, explanation, type, significance, and contribution opportunities."
        )
    else:
        project_ctx = ""
        if body.project_title:
            project_ctx += f'\nResearch project: "{body.project_title}"'
        if body.project_abstract:
            project_ctx += f"\nAbstract: {body.project_abstract}"
        if body.project_research_questions:
            project_ctx += f"\nResearch questions: {'; '.join(body.project_research_questions)}"
        if body.project_keywords:
            project_ctx += f"\nKeywords: {', '.join(body.project_keywords)}"
        topic_str = body.topic or body.project_title or "the specified research area"
        prompt = (
            f'Analyze the research landscape for: "{topic_str}"\n{project_ctx}\n\n'
            f"Identify significant research gaps. For each gap provide: title, explanation, "
            f"type (methodological/theoretical/empirical/contextual/temporal), "
            f"significance (low/medium/high/critical), and potential contribution opportunities.\n\n"
            f"Focus on gaps suitable for PhD-level research."
        )

    result = llm_service.invoke_llm(prompt=prompt, response_json_schema=schema)

    if not llm_service._is_api_key_configured():
        topic_label = body.topic or body.project_title or "the research area"
        result = {
            "gaps": [
                {
                    "title": "Longitudinal data scarcity",
                    "description": f"Most existing studies on {topic_label} rely on cross-sectional designs, leaving temporal dynamics poorly understood.",
                    "gap_type": "methodological",
                    "significance": "high",
                    "potential_contribution": "A longitudinal study would establish causal pathways currently only inferred from correlation.",
                    "related_keywords": ["longitudinal", "temporal dynamics", "causality"],
                    "confidence_score": 0.88,
                },
                {
                    "title": "Under-representation of non-Western contexts",
                    "description": f"The theoretical frameworks applied to {topic_label} were largely developed in Western academic contexts and have rarely been validated elsewhere.",
                    "gap_type": "contextual",
                    "significance": "critical",
                    "potential_contribution": "Cross-cultural validation would significantly expand the generalisability of current findings.",
                    "related_keywords": ["cross-cultural", "generalisation", "Western bias"],
                    "confidence_score": 0.82,
                },
                {
                    "title": "Lack of integrated theoretical framework",
                    "description": f"Existing theories explaining {topic_label} operate in silos with limited dialogue between paradigms.",
                    "gap_type": "theoretical",
                    "significance": "high",
                    "potential_contribution": "Synthesising competing frameworks into a unified model would accelerate cumulative progress.",
                    "related_keywords": ["theoretical integration", "framework synthesis", "paradigm dialogue"],
                    "confidence_score": 0.79,
                },
            ],
            "field_overview": f"The field of {topic_label} has seen significant growth over the past decade, with methodological sophistication increasing but theoretical consolidation lagging behind empirical output.",
            "research_maturity": "Developing — empirical base established, theoretical consolidation ongoing.",
        }

    return result


@router.get("/graph-data")
def get_graph_data(
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Return all research entities as graph nodes + inferred edges for the Knowledge Constellation."""
    from app.models import Document, ResearchGap, ResearchProject, Conversation

    user_id = current_user.email if current_user else None
    nodes = []
    edges = []

    if user_id:
        projects = db.query(ResearchProject).filter(ResearchProject.created_by == user_id).limit(20).all()
        documents = db.query(Document).filter(Document.created_by == user_id).limit(30).all()
        gaps = db.query(ResearchGap).filter(ResearchGap.created_by == user_id).limit(30).all()
        conversations = db.query(Conversation).filter(Conversation.created_by == user_id).limit(20).all()
    else:
        projects = documents = gaps = conversations = []

    for p in projects:
        nodes.append({"id": f"p_{p.id}", "type": "project", "label": p.title or "Project", "size": 18})
    for d in documents:
        nodes.append({"id": f"d_{d.id}", "type": "document", "label": d.title or "Document", "size": 10,
                      "project_id": f"p_{d.project_id}" if d.project_id else None})
    for g in gaps:
        nodes.append({"id": f"g_{g.id}", "type": "gap", "label": g.title or "Gap", "size": 12,
                      "project_id": f"p_{g.project_id}" if g.project_id else None,
                      "significance": g.significance})
    for c in conversations:
        nodes.append({"id": f"c_{c.id}", "type": "conversation", "label": c.title or "Chat", "size": 8,
                      "project_id": f"p_{c.project_id}" if c.project_id else None})

    # Build edges from project relationships
    for d in documents:
        if d.project_id:
            edges.append({"source": f"p_{d.project_id}", "target": f"d_{d.id}", "type": "contains"})
    for g in gaps:
        if g.project_id:
            edges.append({"source": f"p_{g.project_id}", "target": f"g_{g.id}", "type": "contains"})
    for c in conversations:
        if c.project_id:
            edges.append({"source": f"p_{c.project_id}", "target": f"c_{c.id}", "type": "contains"})

    return {"nodes": nodes, "edges": edges}
