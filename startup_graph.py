import json
import os
import re
import threading
import time
from collections.abc import AsyncIterator, Callable
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Annotated, Any, TypedDict

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_tavily import TavilySearch
from langgraph.config import get_stream_writer
from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, ConfigDict, Field

from llm import llm, specialist_llm


SSE_REPORT_CHUNK_SIZE = 500
MAX_EVIDENCE_ANSWER_CHARS = 500
MAX_EVIDENCE_SNIPPET_CHARS = 300
MAX_SEARCH_WORKERS = 4
MAX_SYNTHESIS_VALUE_CHARS = 90
MAX_SYNTHESIS_LIST_ITEMS = 2
MAX_SYNTHESIS_SOURCE_COUNT = 5
MAX_SYNTHESIS_SOURCE_SNIPPET_CHARS = 80
MAX_SYNTHESIS_AGENT_CONTEXT_CHARS = 8_000
MAX_SPECIALIST_LLM_CONCURRENCY = int(os.getenv("GROQ_SPECIALIST_CONCURRENCY", "1"))
LLM_MAX_ATTEMPTS = int(os.getenv("GROQ_LLM_MAX_ATTEMPTS", "3"))
LLM_RETRY_MAX_SECONDS = float(os.getenv("GROQ_RETRY_MAX_SECONDS", "8"))
SPECIALIST_LLM_SEMAPHORE = threading.BoundedSemaphore(
    max(1, MAX_SPECIALIST_LLM_CONCURRENCY)
)

AGENT_EVIDENCE_INDEXES: dict[str, tuple[int, ...]] = {
    "market_analyst": (1, 2),
    "competitor_analyst": (3, 4),
    "customer_analyst": (5, 6),
    "gtm_agent": (5, 6, 7),
    "vc_partner": (1, 2, 3, 8),
    "moat_agent": (3, 8),
    "experiment_agent": (5, 6, 7),
}

AGENT_DISPLAY_NAMES = {
    "market_analyst": "Market Analyst",
    "competitor_analyst": "Competitor Analyst",
    "customer_analyst": "Customer Analyst",
    "gtm_agent": "GTM Agent",
    "vc_partner": "VC Partner Agent",
    "moat_agent": "Moat Agent",
    "experiment_agent": "Experiment Agent",
}

SCORE_OWNERS = {
    "market": "market_analyst",
    "competition": "competitor_analyst",
    "distribution": "gtm_agent",
    "execution": "experiment_agent",
    "timing": "market_analyst",
    "monetization": "gtm_agent",
}


def _merge_dict_updates(left: dict, right: dict) -> dict:
    """Reducer for disjoint outputs from parallel LangGraph branches."""
    return {**left, **right}


def _stream_writer() -> Callable[[dict[str, Any]], None]:
    try:
        return get_stream_writer()
    except RuntimeError:
        return lambda _event: None


def _public_error(exc: Exception) -> str:
    message = str(exc).strip()
    lowered = message.lower()
    if "rate limit" in lowered or "429" in lowered:
        return "The model provider is temporarily rate-limited after bounded retries."
    if "tool choice" in lowered or "tool call validation" in lowered:
        return "The model provider could not produce the required structured response."
    if "timeout" in lowered or "timed out" in lowered:
        return "The provider request timed out after bounded retries."
    return _truncate(message or type(exc).__name__, 300)


class StartupStressTestRequest(BaseModel):
    idea: str = Field(min_length=1, description="The startup idea to stress test.")
    target_customer: str | None = Field(
        default=None,
        description="Optional target customer or ICP for the startup idea.",
    )
    geography: str | None = Field(
        default=None,
        description="Optional target geography or market.",
    )
    business_model: str | None = Field(
        default=None,
        description="Optional business model or monetization approach.",
    )


class Source(BaseModel):
    title: str | None = None
    url: str
    snippet: str | None = None


class StartupStressTestResponse(BaseModel):
    verdict: str
    score: int = Field(ge=0, le=100)
    summary: str
    research_findings: list[str]
    risks: list[str]
    assumptions_to_validate: list[str]
    recommended_experiments: list[str]
    agent_notes: dict[str, str]
    sources: list[Source]


class StartupStressTestV2Request(BaseModel):
    idea: str = Field(
        min_length=1,
        max_length=2_000,
        description="The startup idea to stress test.",
    )
    problem: str | None = Field(default=None, max_length=2_000)
    target_customer: str | None = Field(default=None, max_length=1_000)
    geography: str | None = Field(default=None, max_length=500)
    business_model: str | None = Field(default=None, max_length=1_000)
    current_alternatives: list[str] | None = Field(default=None, max_length=20)
    customer_pain: str | None = Field(default=None, max_length=2_000)
    proposed_solution: str | None = Field(default=None, max_length=2_000)
    gtm_constraints: str | None = Field(default=None, max_length=2_000)
    pricing_hypothesis: str | None = Field(default=None, max_length=1_000)
    stage: str | None = Field(default=None, max_length=200)
    traction: str | None = Field(default=None, max_length=2_000)
    team_context: str | None = Field(default=None, max_length=2_000)
    known_competitors: list[str] | None = Field(default=None, max_length=20)


class DimensionScore(BaseModel):
    model_config = ConfigDict(extra="forbid")

    score: int = Field(ge=0, le=10)
    rationale: str
    evidence: str


class StartupScores(BaseModel):
    market: DimensionScore
    competition: DimensionScore
    distribution: DimensionScore
    execution: DimensionScore
    timing: DimensionScore
    monetization: DimensionScore
    overall: int = Field(ge=0, le=100)


class MarketAnalysis(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tam: str
    sam: str
    som: str
    cagr: str
    trends: list[str]
    why_now: str
    why_not_already_won: str


class CompetitorSnapshot(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    icp: str
    pricing: str
    weakness: str
    opportunity: str


class CustomerPainAnalysis(BaseModel):
    model_config = ConfigDict(extra="forbid")

    pain_points: list[str]
    switching_triggers: list[str]
    current_workarounds: list[str]
    why_users_switch: str


class GTMStrategy(BaseModel):
    model_config = ConfigDict(extra="forbid")

    first_customer: str
    acquisition_channels: list[str]
    pricing: str
    first_100_customers: str


class YCObjection(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question: str
    why_it_matters: str
    best_answer: str


class MoatAnalysis(BaseModel):
    model_config = ConfigDict(extra="forbid")

    data_moat: str
    workflow_lock_in: str
    switching_cost: str
    distribution_moat: str
    network_effects: str
    realistic_moat: str


class Risk(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    reason: str
    evidence: str
    mitigation: str


class Experiment(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    goal: str
    method: str
    success_criteria: str
    failure_criteria: str
    time: str
    cost: str


class AgentInsight(BaseModel):
    model_config = ConfigDict(extra="allow")

    summary: str = ""
    findings: list[str] = Field(default_factory=list)
    dimension_scores: dict[str, DimensionScore] = Field(default_factory=dict)
    market_analysis: MarketAnalysis | None = None
    competitor_snapshot: list[CompetitorSnapshot] = Field(default_factory=list)
    customer_pain: CustomerPainAnalysis | None = None
    gtm_strategy: GTMStrategy | None = None
    yc_objections: list[YCObjection] = Field(default_factory=list)
    moat_analysis: MoatAnalysis | None = None
    risks: list[Risk] = Field(default_factory=list)
    opportunities: list[str] = Field(default_factory=list)
    experiments: list[Experiment] = Field(default_factory=list)


class MarketAgentOutput(BaseModel):
    summary: str
    findings: list[str]
    market_analysis: MarketAnalysis
    market_score: DimensionScore
    timing_score: DimensionScore


class CompetitorAgentOutput(BaseModel):
    summary: str
    findings: list[str]
    competitor_snapshot: list[CompetitorSnapshot]
    competition_score: DimensionScore


class CustomerAgentOutput(BaseModel):
    summary: str
    findings: list[str]
    customer_pain: CustomerPainAnalysis


class GTMAgentOutput(BaseModel):
    summary: str
    findings: list[str]
    gtm_strategy: GTMStrategy
    distribution_score: DimensionScore
    monetization_score: DimensionScore


class VCPartnerOutput(BaseModel):
    summary: str
    findings: list[str]
    yc_objections: list[YCObjection]
    risks: list[Risk]
    opportunities: list[str]


class MoatAgentOutput(BaseModel):
    summary: str
    findings: list[str]
    moat_analysis: MoatAnalysis
    risks: list[Risk]


class ExperimentAgentOutput(BaseModel):
    summary: str
    findings: list[str]
    experiments: list[Experiment]
    execution_score: DimensionScore


ROLE_OUTPUT_SCHEMAS: dict[str, type[BaseModel]] = {
    "market_analyst": MarketAgentOutput,
    "competitor_analyst": CompetitorAgentOutput,
    "customer_analyst": CustomerAgentOutput,
    "gtm_agent": GTMAgentOutput,
    "vc_partner": VCPartnerOutput,
    "moat_agent": MoatAgentOutput,
    "experiment_agent": ExperimentAgentOutput,
}


class StartupStressTestV2Draft(BaseModel):
    verdict: str
    investment_recommendation: str
    confidence: int = Field(ge=0, le=100)
    score_explanation: str
    market_analysis: MarketAnalysis
    competitor_snapshot: list[CompetitorSnapshot]
    customer_pain: CustomerPainAnalysis
    gtm_strategy: GTMStrategy
    yc_objections: list[YCObjection]
    moat_analysis: MoatAnalysis
    risks: list[Risk]
    opportunities: list[str]
    experiments: list[Experiment]
    agent_notes: dict[str, str]


class SynthesisOutput(BaseModel):
    verdict: str
    investment_recommendation: str
    confidence: int = Field(ge=0, le=100)
    market_analysis: MarketAnalysis
    competitor_snapshot: list[CompetitorSnapshot]
    customer_pain: CustomerPainAnalysis
    gtm_strategy: GTMStrategy
    yc_objections: list[YCObjection]
    moat_analysis: MoatAnalysis
    risks: list[Risk]
    opportunities: list[str]
    experiments: list[Experiment]
    synthesizer_note: str


class StartupStressTestV2Response(StartupStressTestV2Draft):
    scores: StartupScores
    sources: list[Source]
    markdown_report: str


class StartupStressTestState(TypedDict, total=False):
    idea: str
    target_customer: str | None
    geography: str | None
    business_model: str | None
    research_notes: str
    critique: str
    sources: list[Source]
    final_report: StartupStressTestResponse


class StartupStressTestV2State(TypedDict, total=False):
    idea: str
    problem: str | None
    target_customer: str | None
    geography: str | None
    business_model: str | None
    current_alternatives: list[str] | None
    customer_pain: str | None
    proposed_solution: str | None
    gtm_constraints: str | None
    pricing_hypothesis: str | None
    stage: str | None
    traction: str | None
    team_context: str | None
    known_competitors: list[str] | None
    evidence: str
    evidence_sections: dict[int, str]
    sources: list[Source]
    agent_outputs: Annotated[dict[str, AgentInsight], _merge_dict_updates]
    final_report: StartupStressTestV2Response


def _startup_context(state: StartupStressTestState) -> str:
    fields = [
        f"Idea: {state['idea']}",
        f"Target customer: {state.get('target_customer') or 'Not provided'}",
        f"Geography: {state.get('geography') or 'Not provided'}",
        f"Business model: {state.get('business_model') or 'Not provided'}",
    ]
    return "\n".join(fields)


def _startup_context_v2(state: StartupStressTestV2State) -> str:
    fields = [
        ("Idea", state["idea"]),
        ("Problem", state.get("problem")),
        ("Target customer", state.get("target_customer")),
        ("Geography", state.get("geography")),
        ("Business model", state.get("business_model")),
        ("Current alternatives", state.get("current_alternatives")),
        ("Customer pain", state.get("customer_pain")),
        ("Proposed solution", state.get("proposed_solution")),
        ("GTM constraints", state.get("gtm_constraints")),
        ("Pricing hypothesis", state.get("pricing_hypothesis")),
        ("Stage", state.get("stage")),
        ("Traction", state.get("traction")),
        ("Team context", state.get("team_context")),
        ("Known competitors", state.get("known_competitors")),
    ]
    lines = []
    for label, value in fields:
        if not value:
            continue
        if isinstance(value, list):
            rendered = ", ".join(_truncate(item, 120) for item in value[:8])
        else:
            rendered = _truncate(value, 500 if label == "Idea" else 350)
        lines.append(f"{label}: {rendered}")
    return "\n".join(lines)


def _bounded_query(*parts: Any, limit: int = 380) -> str:
    return _truncate(" ".join(str(part).strip() for part in parts if part), limit)


def _build_queries(state: StartupStressTestState) -> list[str]:
    idea = _search_phrase(state["idea"], 180)
    target_customer = _search_phrase(
        state.get("target_customer") or "target customers",
        100,
    )
    geography = _search_phrase(state.get("geography") or "global market", 60)

    return [
        _bounded_query(idea, "market demand", target_customer, geography),
        _bounded_query(idea, "competitors alternatives startups", geography),
        _bounded_query(idea, "risks challenges monetization adoption", target_customer),
    ]


def _search_phrase(value: Any, limit: int) -> str:
    text = " ".join(str(value or "").split())
    for marker in (" that ", " which ", ". ", "; ", "\n"):
        prefix = text.split(marker, 1)[0].strip()
        if len(prefix) >= 24:
            text = prefix
            break
    return _truncate(text, limit)


def _search_terms(values: list[str] | None, limit: int = 240) -> str:
    return _truncate(
        " ".join(_search_phrase(value, 60) for value in (values or [])[:5]),
        limit,
    )


def _build_v2_queries(state: StartupStressTestV2State) -> list[str]:
    idea = _search_phrase(state["idea"], 180)
    target_customer = _search_phrase(
        state.get("target_customer") or "target customers",
        100,
    )
    geography = _search_phrase(state.get("geography") or "global", 60)
    alternatives = _search_terms(state.get("current_alternatives"))
    competitors = _search_terms(state.get("known_competitors"))

    return [
        _bounded_query(idea, geography, "market size growth industry"),
        _bounded_query(idea, geography, "adoption trends timing drivers"),
        _bounded_query(
            idea,
            "competitors alternatives software pricing",
            competitors,
            alternatives,
        ),
        _bounded_query(idea, "competitor complaints reviews weaknesses", competitors),
        _bounded_query(target_customer, "administrative pain workflow reviews complaints"),
        _bounded_query(
            target_customer,
            "workflow pain feature requests software reviews",
            idea,
        ),
        _bounded_query(
            idea,
            "go to market channels partnerships",
            target_customer,
            geography,
        ),
        _bounded_query(idea, "defensibility integrations switching costs investor risks"),
    ]


def _get_tavily_search() -> TavilySearch:
    if not os.getenv("TAVILY_API_KEY"):
        raise RuntimeError(
            "TAVILY_API_KEY is required to run startup stress-test research."
        )

    return TavilySearch(
        max_results=4,
        search_depth="advanced",
        include_answer=True,
        topic="general",
    )


def _normalize_tavily_payload(value: Any, query: str) -> dict[str, Any]:
    if isinstance(value, BaseModel):
        value = value.model_dump()
    if hasattr(value, "artifact") and getattr(value, "artifact") is not None:
        value = value.artifact
    if isinstance(value, tuple) and len(value) == 2:
        value = value[1]
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except json.JSONDecodeError as exc:
            raise RuntimeError(f"Tavily search returned no result payload for: {query}") from exc
    if not isinstance(value, dict):
        raise RuntimeError(
            f"Tavily search returned unsupported {type(value).__name__} data."
        )
    if value.get("error"):
        raise RuntimeError(f"Tavily search failed: {value['error']}")
    if isinstance(value.get("artifact"), dict):
        value = value["artifact"]
    results = value.get("results")
    if not isinstance(results, list) or not results:
        raise RuntimeError(f"Tavily search returned no sources for: {query}")
    normalized_results = [
        result
        for result in results
        if isinstance(result, dict)
        and str(result.get("url") or "").startswith(("https://", "http://"))
    ]
    if not normalized_results:
        raise RuntimeError(f"Tavily search returned no usable source URLs for: {query}")
    return {
        **value,
        "query": value.get("query") or query,
        "results": normalized_results,
    }


def _normalize_sources(search_payloads: list[dict]) -> list[Source]:
    sources: list[Source] = []
    seen_urls: set[str] = set()

    for payload in search_payloads:
        for result in payload.get("results", []):
            url = result.get("url")
            if not url or url in seen_urls:
                continue
            seen_urls.add(url)
            sources.append(
                Source(
                    title=result.get("title"),
                    url=url,
                    snippet=_truncate(result.get("content"), 500),
                )
            )

    return sources[:15]


def _format_search_payloads(search_payloads: list[dict]) -> str:
    sections: list[str] = []
    for payload in search_payloads:
        query = payload.get("query", "Unknown query")
        answer = _truncate(
            payload.get("answer") or "No direct answer returned.",
            MAX_EVIDENCE_ANSWER_CHARS,
        )
        result_lines = []
        for result in payload.get("results", []):
            result_lines.append(
                "- "
                f"{result.get('title', 'Untitled')} | "
                f"{result.get('url', 'No URL')} | "
                f"{_truncate(result.get('content', 'No snippet'), MAX_EVIDENCE_SNIPPET_CHARS)}"
            )
        sections.append(
            f"Query: {query}\nTavily answer: {answer}\nResults:\n"
            + "\n".join(result_lines)
        )
    return "\n\n".join(sections)


def _truncate(value: Any, limit: int) -> str:
    text = str(value or "")
    if len(text) <= limit:
        return text
    return text[: limit - 3].rstrip() + "..."


def _model_dump(value: Any) -> Any:
    if isinstance(value, BaseModel):
        return value.model_dump()
    if isinstance(value, dict):
        return {key: _model_dump(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_model_dump(item) for item in value]
    return value


def _elapsed_ms(started_at: float) -> int:
    return round((time.perf_counter() - started_at) * 1000)


def _search_purpose(index: int) -> str:
    purposes = {
        1: "Market size, TAM/SAM/SOM, and growth trends",
        2: "Timing, adoption drivers, and why now",
        3: "Competitor alternatives, pricing, and positioning",
        4: "Competitor weaknesses and customer complaints",
        5: "Customer pain from reviews, forums, and communities",
        6: "Workflow pain, feature requests, and switching triggers",
        7: "GTM channels, marketplaces, and partnerships",
        8: "Moat, defensibility, switching costs, and investor objections",
    }
    return purposes.get(index, "Startup research")


def _source_preview(payload: dict) -> list[dict]:
    return [
        {
            "title": result.get("title"),
            "url": result.get("url"),
            "snippet": _truncate(result.get("content"), 300),
        }
        for result in payload.get("results", [])[:3]
    ]


def _collect_v2_evidence(
    state: StartupStressTestV2State,
    emit: Callable[[dict[str, Any]], None] | None = None,
) -> list[dict]:
    """Run independent Tavily queries concurrently and retain partial results."""
    writer = emit or (lambda _event: None)
    search = _get_tavily_search()
    queries = _build_v2_queries(state)
    completed: dict[int, dict] = {}
    failures = 0
    started_at: dict[int, float] = {}

    with ThreadPoolExecutor(max_workers=min(MAX_SEARCH_WORKERS, len(queries))) as pool:
        futures = {}
        for index, query in enumerate(queries, start=1):
            writer(
                {
                    "type": "search_start",
                    "status": "running",
                    "index": index,
                    "total": len(queries),
                    "query": query,
                    "purpose": _search_purpose(index),
                }
            )
            started_at[index] = time.perf_counter()
            futures[pool.submit(search.invoke, {"query": query})] = (index, query)

        for future in as_completed(futures):
            index, query = futures[future]
            try:
                payload = _normalize_tavily_payload(future.result(), query)
                payload["_search_index"] = index
                completed[index] = payload
                writer(
                    {
                        "type": "search_end",
                        "status": "completed",
                        "index": index,
                        "total": len(queries),
                        "query": query,
                        "result_count": len(payload.get("results", [])),
                        "answer": _truncate(payload.get("answer"), 300),
                        "top_results": _source_preview(payload),
                        "elapsed_ms": _elapsed_ms(started_at[index]),
                    }
                )
            except Exception as exc:
                failures += 1
                writer(
                    {
                        "type": "search_end",
                        "status": "failed",
                        "index": index,
                        "total": len(queries),
                        "query": query,
                        "result_count": 0,
                        "top_results": [],
                        "error": _public_error(exc),
                        "elapsed_ms": _elapsed_ms(started_at[index]),
                    }
                )

    if not completed:
        raise RuntimeError(
            "Startup research failed because all Tavily searches failed."
        )

    payloads = [completed[index] for index in sorted(completed)]
    writer(
        {
            "type": "evidence_ready",
            "search_count": len(payloads),
            "failed_search_count": failures,
        }
    )
    return payloads


def _role_evidence(state: StartupStressTestV2State, agent_name: str) -> str:
    sections = state.get("evidence_sections") or {}
    selected = [
        sections[index]
        for index in AGENT_EVIDENCE_INDEXES.get(agent_name, ())
        if index in sections
    ]
    return "\n\n".join(selected) or state.get("evidence", "No research evidence.")


def _merge_agent_outputs(
    name: str,
    output: AgentInsight,
) -> StartupStressTestV2State:
    return {"agent_outputs": {name: output}}


STRICT_JSON_SCHEMA_MODELS = {"openai/gpt-oss-20b", "openai/gpt-oss-120b"}


def _strict_structured(model: Any, schema: type[BaseModel]) -> Any:
    """Return structured output compatible with the configured Groq model.

    GPT-OSS supports Groq constrained JSON schema; Qwen uses JSON object mode
    and Pydantic parsing, which avoids unreliable forced tool calls.
    """
    model_name = str(getattr(model, "model_name", ""))
    if model_name and model_name not in STRICT_JSON_SCHEMA_MODELS:
        return model.with_structured_output(schema, method="function_calling")
    return model.with_structured_output(
        schema,
        method="json_schema",
        strict=True,
    )


def _retry_delay_seconds(exc: Exception, attempt: int) -> float:
    match = re.search(
        r"try again in\s+([0-9.]+)\s*(ms|s)",
        str(exc),
        flags=re.IGNORECASE,
    )
    if match:
        value = float(match.group(1))
        if match.group(2).lower() == "ms":
            value /= 1_000
        return min(LLM_RETRY_MAX_SECONDS, max(0.25, value + 0.25))
    return min(LLM_RETRY_MAX_SECONDS, float(2 ** (attempt - 1)))


def _is_retryable_provider_error(exc: Exception) -> bool:
    status_code = getattr(exc, "status_code", None)
    text = str(exc).lower()
    return status_code in {429, 500, 502, 503, 504} or any(
        marker in text
        for marker in ("rate limit", "429", "timeout", "timed out", "temporarily unavailable")
    )


def _invoke_with_retry(
    runnable: Any,
    messages: list[Any],
    *,
    writer: Callable[[dict[str, Any]], None] | None = None,
    agent_name: str | None = None,
    display_name: str | None = None,
    semaphore: threading.BoundedSemaphore | None = None,
) -> Any:
    lock = semaphore or threading.BoundedSemaphore(1)
    with lock:
        for attempt in range(1, LLM_MAX_ATTEMPTS + 1):
            try:
                return runnable.invoke(messages)
            except Exception as exc:
                if attempt >= LLM_MAX_ATTEMPTS or not _is_retryable_provider_error(exc):
                    raise
                delay = _retry_delay_seconds(exc, attempt)
                if writer and agent_name and display_name:
                    writer(
                        {
                            "type": "agent_status",
                            "agent": agent_name,
                            "display_name": display_name,
                            "status": "running",
                            "message": (
                                f"{display_name} hit a temporary provider limit; "
                                f"retrying in {delay:.1f}s ({attempt}/{LLM_MAX_ATTEMPTS - 1})."
                            ),
                        }
                    )
                time.sleep(delay)
    raise RuntimeError("Provider retry loop exited unexpectedly.")


def _to_agent_insight(agent_name: str, response: BaseModel | dict) -> AgentInsight:
    schema = ROLE_OUTPUT_SCHEMAS[agent_name]
    output = response if isinstance(response, schema) else schema.model_validate(response)
    common = {
        "summary": output.summary,
        "findings": output.findings,
    }
    if isinstance(output, MarketAgentOutput):
        insight = AgentInsight(
            **common,
            market_analysis=output.market_analysis,
            dimension_scores={
                "market": output.market_score,
                "timing": output.timing_score,
            },
        )
    elif isinstance(output, CompetitorAgentOutput):
        insight = AgentInsight(
            **common,
            competitor_snapshot=output.competitor_snapshot,
            dimension_scores={"competition": output.competition_score},
        )
    elif isinstance(output, CustomerAgentOutput):
        insight = AgentInsight(**common, customer_pain=output.customer_pain)
    elif isinstance(output, GTMAgentOutput):
        insight = AgentInsight(
            **common,
            gtm_strategy=output.gtm_strategy,
            dimension_scores={
                "distribution": output.distribution_score,
                "monetization": output.monetization_score,
            },
        )
    elif isinstance(output, VCPartnerOutput):
        insight = AgentInsight(
            **common,
            yc_objections=output.yc_objections,
            risks=output.risks,
            opportunities=output.opportunities,
        )
    elif isinstance(output, MoatAgentOutput):
        insight = AgentInsight(
            **common,
            moat_analysis=output.moat_analysis,
            risks=output.risks,
        )
    elif isinstance(output, ExperimentAgentOutput):
        insight = AgentInsight(
            **common,
            experiments=output.experiments,
            dimension_scores={"execution": output.execution_score},
        )
    else:
        raise TypeError(f"Unsupported specialist output for {agent_name}.")
    return _normalize_agent_insight(insight)


def _run_structured_agent(
    state: StartupStressTestV2State,
    agent_name: str,
    role_prompt: str,
    task_prompt: str,
) -> AgentInsight:
    writer = _stream_writer()
    display_name = AGENT_DISPLAY_NAMES[agent_name]
    started_at = time.perf_counter()
    writer(
        {
            "type": "agent_status",
            "agent": agent_name,
            "display_name": display_name,
            "status": "running",
            "message": f"{display_name} is analyzing scoped evidence.",
        }
    )

    try:
        schema = ROLE_OUTPUT_SCHEMAS[agent_name]
        structured_llm = _strict_structured(specialist_llm, schema)
        messages = [
            SystemMessage(
                content=(
                    f"{role_prompt} Use only supplied evidence for factual claims. "
                    "If evidence is missing, say 'Not found in current evidence' rather "
                    "than inventing numbers, names, or citations. Return only the "
                    "requested structured result. Use at most five items in any list and "
                    "keep each item concise."
                )
            ),
            HumanMessage(
                content=(
                    f"Startup context:\n{_startup_context_v2(state)}\n\n"
                    f"Role-scoped evidence:\n{_role_evidence(state, agent_name)}\n\n"
                    f"Task:\n{task_prompt}\n\n"
                    "Make findings specific and cite source URLs in evidence fields or text."
                )
            ),
        ]
        response = _invoke_with_retry(
            structured_llm,
            messages,
            writer=writer,
            agent_name=agent_name,
            display_name=display_name,
            semaphore=SPECIALIST_LLM_SEMAPHORE,
        )
        output = _to_agent_insight(agent_name, response)
        writer(
            {
                "type": "agent_status",
                "agent": agent_name,
                "display_name": display_name,
                "status": "completed",
                "message": output.summary,
                "summary": output.summary,
                "findings": output.findings[:5],
                "dimension_scores": _model_dump(output.dimension_scores),
                "elapsed_ms": _elapsed_ms(started_at),
            }
        )
        return output
    except Exception as exc:
        message = _public_error(exc)
        writer(
            {
                "type": "agent_status",
                "agent": agent_name,
                "display_name": display_name,
                "status": "failed",
                "message": message,
                "error": message,
                "elapsed_ms": _elapsed_ms(started_at),
            }
        )
        return AgentInsight(
            summary=f"{display_name} failed; synthesis continued with other specialists.",
            findings=[],
        )


def _normalize_string_list(value: list[str] | str) -> list[str]:
    if isinstance(value, list):
        return value
    if not value:
        return []
    return [value]


def _normalize_agent_insight(output: AgentInsight) -> AgentInsight:
    if output.market_analysis:
        market_extra = output.market_analysis.model_extra or {}
        output.market_analysis.tam = output.market_analysis.tam or market_extra.get("TAM", "")
        output.market_analysis.sam = output.market_analysis.sam or market_extra.get("SAM", "")
        output.market_analysis.som = output.market_analysis.som or market_extra.get("SOM", "")
        output.market_analysis.cagr = output.market_analysis.cagr or market_extra.get("CAGR", "")
        output.market_analysis.why_now = (
            output.market_analysis.why_now
            or market_extra.get("timing", "")
            or market_extra.get("why_now", "")
        )
        output.market_analysis.trends = _normalize_string_list(
            output.market_analysis.trends
        )
        for dimension in ("market", "timing"):
            raw_score = market_extra.get(f"score_dimension_{dimension}")
            if raw_score is not None and dimension not in output.dimension_scores:
                output.dimension_scores[dimension] = DimensionScore(
                    score=_coerce_score(raw_score),
                    rationale=(
                        f"Recovered from {dimension} score returned by the specialist agent."
                    ),
                    evidence=", ".join(_normalize_string_list(market_extra.get("evidence", ""))),
                )
    if output.customer_pain:
        output.customer_pain.pain_points = _normalize_string_list(
            output.customer_pain.pain_points
        )
        output.customer_pain.switching_triggers = _normalize_string_list(
            output.customer_pain.switching_triggers
        )
        output.customer_pain.current_workarounds = _normalize_string_list(
            output.customer_pain.current_workarounds
        )
    if output.gtm_strategy:
        output.gtm_strategy.acquisition_channels = _normalize_string_list(
            output.gtm_strategy.acquisition_channels
        )
    if not output.summary:
        output.summary = "Agent completed analysis."
    return output


def _coerce_score(value: Any) -> int:
    try:
        score = int(float(value))
    except (TypeError, ValueError):
        return 5
    return max(0, min(10, score))


def _fallback_score(label: str, outputs: dict[str, AgentInsight]) -> DimensionScore:
    owner = SCORE_OWNERS[label]
    output = outputs.get(owner)
    if output and label in output.dimension_scores:
        return output.dimension_scores[label]
    return DimensionScore(
        score=5,
        rationale=(
            f"{label.title()} could not be scored by its owner, "
            f"{AGENT_DISPLAY_NAMES[owner]}."
        ),
        evidence="Insufficient structured evidence was returned by the assigned specialist.",
    )


def _compute_scores(outputs: dict[str, AgentInsight]) -> StartupScores:
    market = _fallback_score("market", outputs)
    competition = _fallback_score("competition", outputs)
    distribution = _fallback_score("distribution", outputs)
    execution = _fallback_score("execution", outputs)
    timing = _fallback_score("timing", outputs)
    monetization = _fallback_score("monetization", outputs)

    weighted = (
        market.score * 0.20
        + competition.score * 0.15
        + distribution.score * 0.20
        + execution.score * 0.15
        + timing.score * 0.15
        + monetization.score * 0.15
    )
    overall = round(weighted * 10)

    return StartupScores(
        market=market,
        competition=competition,
        distribution=distribution,
        execution=execution,
        timing=timing,
        monetization=monetization,
        overall=overall,
    )


def _dimension_point_loss(label: str, dimension: DimensionScore, weight: float) -> str:
    lost = round((10 - dimension.score) * weight * 10)
    return f"{label}: lost {lost} points. {dimension.rationale}"


def _build_score_explanation(scores: StartupScores) -> str:
    dimensions = [
        ("Market", scores.market, 0.20),
        ("Competition", scores.competition, 0.15),
        ("Distribution", scores.distribution, 0.20),
        ("Execution", scores.execution, 0.15),
        ("Timing", scores.timing, 0.15),
        ("Monetization", scores.monetization, 0.15),
    ]
    return " ".join(
        _dimension_point_loss(label, dimension, weight)
        for label, dimension, weight in dimensions
        if dimension.score < 10
    )


def _stars(score: int) -> str:
    filled = max(0, min(5, round(score / 2)))
    return "*" * filled + "-" * (5 - filled)


def _markdown_cell(value: Any) -> str:
    return str(value or "Not found in current evidence").replace("|", "\\|").replace("\n", " ")


def _markdown_bullets(values: list[str] | str, empty: str) -> str:
    items = _normalize_string_list(values)
    return "\n".join(f"- {item}" for item in items) if items else f"- {empty}"


def _build_markdown_report(
    report: StartupStressTestV2Draft,
    scores: StartupScores,
    sources: list[Source],
) -> str:
    failed_agents = [
        name.replace("_", " ").title()
        for name, note in report.agent_notes.items()
        if "failed" in note.lower()
    ]
    evidence_note = (
        f"{len(sources)} verified web sources informed this report."
        if sources
        else "No verified web sources were available; treat all conclusions as hypotheses."
    )
    if failed_agents:
        evidence_note += " Incomplete specialist coverage: " + ", ".join(failed_agents) + "."

    risks = "\n".join(
        f"{index}. **{risk.name or 'Unnamed risk'}** — {risk.reason or 'Reason not provided'} "
        f"Evidence: {risk.evidence or 'Not found in current evidence'}. "
        f"Mitigation: {risk.mitigation or 'Define a mitigation test.'}"
        for index, risk in enumerate(report.risks[:5], start=1)
    )
    opportunities = _markdown_bullets(
        report.opportunities[:5],
        "No evidence-backed opportunity was returned.",
    )
    competitors = "\n".join(
        "| {name} | {icp} | {pricing} | {weakness} | {opportunity} |".format(
            name=_markdown_cell(competitor.name),
            icp=_markdown_cell(competitor.icp),
            pricing=_markdown_cell(competitor.pricing),
            weakness=_markdown_cell(competitor.weakness),
            opportunity=_markdown_cell(competitor.opportunity),
        )
        for competitor in report.competitor_snapshot[:8]
    )
    objections = "\n".join(
        f"{index}. **{objection.question}** Why it matters: {objection.why_it_matters} "
        f"Best current answer: {objection.best_answer}"
        for index, objection in enumerate(report.yc_objections[:5], start=1)
    )
    experiments = "\n\n".join(
        f"### {index}. {experiment.name}\n"
        f"- **Goal:** {experiment.goal}\n"
        f"- **Method:** {experiment.method}\n"
        f"- **Success:** {experiment.success_criteria}\n"
        f"- **Failure:** {experiment.failure_criteria}\n"
        f"- **Time / cost:** {experiment.time} / {experiment.cost}"
        for index, experiment in enumerate(report.experiments[:4], start=1)
    )
    source_links = "\n".join(
        f"{index}. [{source.title or source.url}]({source.url})"
        for index, source in enumerate(sources, start=1)
    )
    market = report.market_analysis
    customer = report.customer_pain
    gtm = report.gtm_strategy
    moat = report.moat_analysis

    return (
        "# Startup Stress Test\n\n"
        f"## Verdict\n{report.verdict}\n\n"
        f"**Investment recommendation:** {report.investment_recommendation}\n\n"
        f"**Overall score:** {scores.overall}/100 · **Confidence:** {report.confidence}%\n\n"
        f"> Evidence coverage: {evidence_note}\n\n"
        "## Scorecard\n"
        f"- Market: {_stars(scores.market.score)} ({scores.market.score}/10) — {scores.market.rationale}\n"
        f"- Competition: {_stars(scores.competition.score)} ({scores.competition.score}/10) — {scores.competition.rationale}\n"
        f"- Distribution: {_stars(scores.distribution.score)} ({scores.distribution.score}/10) — {scores.distribution.rationale}\n"
        f"- Execution: {_stars(scores.execution.score)} ({scores.execution.score}/10) — {scores.execution.rationale}\n"
        f"- Timing: {_stars(scores.timing.score)} ({scores.timing.score}/10) — {scores.timing.rationale}\n"
        f"- Monetization: {_stars(scores.monetization.score)} ({scores.monetization.score}/10) — {scores.monetization.rationale}\n\n"
        f"**Why points were lost:** {report.score_explanation}\n\n"
        "## Market and Timing\n"
        f"- **TAM:** {market.tam or 'Not found in current evidence'}\n"
        f"- **SAM:** {market.sam or 'Not found in current evidence'}\n"
        f"- **SOM:** {market.som or 'Not found in current evidence'}\n"
        f"- **Growth:** {market.cagr or 'Not found in current evidence'}\n"
        f"- **Why now:** {market.why_now or 'Not found in current evidence'}\n"
        f"- **Why not already won:** {market.why_not_already_won or 'Not found in current evidence'}\n"
        f"- **Trends:**\n{_markdown_bullets(market.trends, 'No trend evidence found.')}\n\n"
        "## Customer Evidence\n"
        f"### Pain points\n{_markdown_bullets(customer.pain_points, 'No direct pain evidence found.')}\n\n"
        f"### Current workarounds\n{_markdown_bullets(customer.current_workarounds, 'No workaround evidence found.')}\n\n"
        f"**Switching case:** {customer.why_users_switch or 'Not found in current evidence'}\n\n"
        f"**Switching triggers:**\n{_markdown_bullets(customer.switching_triggers, 'No switching trigger evidence found.')}\n\n"
        "## Competitor Snapshot\n"
        "| Competitor | ICP | Pricing | Weakness | Opening |\n"
        "| --- | --- | --- | --- | --- |\n"
        f"{competitors or '| Not found | Not found | Not found | Not found | Not found |'}\n\n"
        "## Go-to-Market and Monetization\n"
        f"- **First customer:** {gtm.first_customer or 'Not defined'}\n"
        f"- **Acquisition channels:** {', '.join(_normalize_string_list(gtm.acquisition_channels)) or 'Not defined'}\n"
        f"- **Pricing:** {gtm.pricing or 'Not validated'}\n"
        f"- **First 100 customers:** {gtm.first_100_customers or 'Not defined'}\n\n"
        f"## Top Risks\n{risks or 'No structured risks returned.'}\n\n"
        f"## Opportunities\n{opportunities}\n\n"
        "## Defensibility\n"
        f"- **Data moat:** {moat.data_moat or 'Not demonstrated'}\n"
        f"- **Workflow lock-in:** {moat.workflow_lock_in or 'Not demonstrated'}\n"
        f"- **Switching cost:** {moat.switching_cost or 'Not demonstrated'}\n"
        f"- **Distribution moat:** {moat.distribution_moat or 'Not demonstrated'}\n"
        f"- **Network effects:** {moat.network_effects or 'Not demonstrated'}\n"
        f"- **Most realistic moat:** {moat.realistic_moat or 'Not demonstrated'}\n\n"
        f"## Investor Objections\n{objections or 'No structured investor objections returned.'}\n\n"
        f"## Validation Plan\n{experiments or 'No structured experiments returned.'}\n\n"
        f"## Sources\n{source_links or 'No verified sources available.'}\n"
    )


def researcher_node(state: StartupStressTestState) -> StartupStressTestState:
    search = _get_tavily_search()
    queries = _build_queries(state)
    search_payloads = [
        _normalize_tavily_payload(search.invoke({"query": query}), query)
        for query in queries
    ]
    search_context = _format_search_payloads(search_payloads)
    sources = _normalize_sources(search_payloads)

    response = llm.invoke(
        [
            SystemMessage(
                content=(
                    "You are a startup market researcher. Use only the supplied "
                    "Tavily search results. Extract concrete evidence about demand, "
                    "competitors, alternatives, market timing, and adoption barriers."
                )
            ),
            HumanMessage(
                content=(
                    f"Startup context:\n{_startup_context(state)}\n\n"
                    f"Search evidence:\n{search_context}\n\n"
                    "Write concise research notes with evidence-backed bullets."
                )
            ),
        ]
    )

    return {
        "research_notes": response.content,
        "sources": sources,
    }


def critic_node(state: StartupStressTestState) -> StartupStressTestState:
    response = llm.invoke(
        [
            SystemMessage(
                content=(
                    "You are a rigorous startup critic. Stress-test the idea against "
                    "the research. Focus on weak assumptions, unclear differentiation, "
                    "monetization risk, distribution risk, and execution difficulty."
                )
            ),
            HumanMessage(
                content=(
                    f"Startup context:\n{_startup_context(state)}\n\n"
                    f"Research notes:\n{state['research_notes']}\n\n"
                    "Write a direct critique with the strongest reasons this could fail "
                    "and the strongest evidence that it might work."
                )
            ),
        ]
    )

    return {"critique": response.content}


def synthesizer_node(state: StartupStressTestState) -> StartupStressTestState:
    structured_llm = _strict_structured(llm, StartupStressTestResponse)
    response = structured_llm.invoke(
        [
            SystemMessage(
                content=(
                    "You are a startup strategy advisor. Return a balanced, concise "
                    "stress-test report. Score should reflect evidence quality, market "
                    "pull, differentiation, monetization, and execution risk. Return only "
                    "the requested structured result."
                )
            ),
            HumanMessage(
                content=(
                    f"Startup context:\n{_startup_context(state)}\n\n"
                    f"Researcher notes:\n{state['research_notes']}\n\n"
                    f"Critic notes:\n{state['critique']}\n\n"
                    "Return the final report. Put useful notes for researcher, critic, "
                    "and synthesizer in agent_notes. Leave sources empty; the system "
                    "will attach verified Tavily sources."
                )
            ),
        ]
    )

    if not isinstance(response, StartupStressTestResponse):
        response = StartupStressTestResponse.model_validate(response)

    report = response.model_copy(
        update={
            "sources": state.get("sources", []),
            "agent_notes": {
                **response.agent_notes,
                "researcher": state["research_notes"],
                "critic": state["critique"],
            },
        }
    )

    return {"final_report": report}


def v2_evidence_node(state: StartupStressTestV2State) -> StartupStressTestV2State:
    writer = _stream_writer()
    search_payloads = _collect_v2_evidence(state, writer)
    evidence_sections = {
        payload["_search_index"]: _format_search_payloads([payload])
        for payload in search_payloads
    }
    for agent_id, display_name in AGENT_DISPLAY_NAMES.items():
        writer(
            {
                "type": "agent_status",
                "agent": agent_id,
                "display_name": display_name,
                "status": "queued",
                "message": f"{display_name} is queued.",
            }
        )
    return {
        "evidence": _format_search_payloads(search_payloads),
        "evidence_sections": evidence_sections,
        "sources": _normalize_sources(search_payloads),
        "agent_outputs": {},
    }


def market_analyst_node(state: StartupStressTestV2State) -> StartupStressTestV2State:
    output = _run_structured_agent(
        state,
        "market_analyst",
        (
            "You are a startup market analyst. Estimate market attractiveness, "
            "TAM/SAM/SOM, CAGR, trends, timing, and why this has not already won."
        ),
        (
            "Return market_analysis. Score dimensions market and timing from 0-10. "
            "Use evidence from independent sources, not generic AI-market claims."
        ),
    )
    return _merge_agent_outputs("market_analyst", output)


def competitor_analyst_node(state: StartupStressTestV2State) -> StartupStressTestV2State:
    output = _run_structured_agent(
        state,
        "competitor_analyst",
        (
            "You are a competitor analyst. Identify direct and adjacent competitors, "
            "their ICP, pricing, positioning, weaknesses, and openings."
        ),
        (
            "Return competitor_snapshot with specific competitors. Score competition "
            "from 0-10 where a higher score means the startup has a better competitive "
            "opening despite alternatives."
        ),
    )
    return _merge_agent_outputs("competitor_analyst", output)


def customer_analyst_node(state: StartupStressTestV2State) -> StartupStressTestV2State:
    output = _run_structured_agent(
        state,
        "customer_analyst",
        (
            "You are a customer analyst. Extract pain points, switching triggers, "
            "current workarounds, and evidence from reviews, forums, and communities."
        ),
        (
            "Return customer_pain. Focus on what founders need to know: why users "
            "would switch, what they currently tolerate, and what pain is urgent."
        ),
    )
    return _merge_agent_outputs("customer_analyst", output)


def gtm_agent_node(state: StartupStressTestV2State) -> StartupStressTestV2State:
    output = _run_structured_agent(
        state,
        "gtm_agent",
        (
            "You are a GTM strategist for early-stage startups. Design a practical "
            "first-customer and first-100-customers motion."
        ),
        (
            "Return gtm_strategy. Score distribution and monetization from 0-10. "
            "Respect provided constraints and pricing hypothesis if present."
        ),
    )
    return _merge_agent_outputs("gtm_agent", output)


def vc_partner_node(state: StartupStressTestV2State) -> StartupStressTestV2State:
    output = _run_structured_agent(
        state,
        "vc_partner",
        (
            "You are a YC-style startup investor. Be skeptical, direct, and focused "
            "on wedge, market pull, incumbents, defensibility, and urgency."
        ),
        (
            "Return yc_objections, risks, and opportunities. Ask hard questions like "
            "why this team, why now, why users switch, and why incumbents do not win."
        ),
    )
    return _merge_agent_outputs("vc_partner", output)


def moat_agent_node(state: StartupStressTestV2State) -> StartupStressTestV2State:
    output = _run_structured_agent(
        state,
        "moat_agent",
        (
            "You are a moat analyst. Evaluate realistic defensibility for an early "
            "startup: data, workflow lock-in, switching costs, distribution, and network effects."
        ),
        (
            "Return moat_analysis and any risks. Be realistic about what moat can "
            "exist in the first 12-24 months."
        ),
    )
    return _merge_agent_outputs("moat_agent", output)


def experiment_agent_node(state: StartupStressTestV2State) -> StartupStressTestV2State:
    output = _run_structured_agent(
        state,
        "experiment_agent",
        (
            "You are an experiment designer for founders. Convert uncertainty into "
            "fast, cheap validation experiments."
        ),
        (
            "Return experiments with goal, method, success criteria, failure criteria, "
            "time, and cost. Also score execution from 0-10 based on how testable and "
            "operationally feasible the idea is."
        ),
    )
    return _merge_agent_outputs("experiment_agent", output)


def _compact_for_synthesis(value: Any) -> Any:
    if isinstance(value, BaseModel):
        value = value.model_dump(exclude_none=True, exclude_defaults=True)
    if isinstance(value, str):
        return _truncate(value, MAX_SYNTHESIS_VALUE_CHARS)
    if isinstance(value, list):
        return [
            _compact_for_synthesis(item)
            for item in value[:MAX_SYNTHESIS_LIST_ITEMS]
        ]
    if isinstance(value, dict):
        return {
            key: _compact_for_synthesis(item)
            for key, item in value.items()
        }
    return value


def _compact_agent_outputs(outputs: dict[str, AgentInsight]) -> str:
    compact = {
        name: _compact_for_synthesis(output)
        for name, output in outputs.items()
    }
    serialized = json.dumps(compact, default=str, separators=(",", ":"))
    if len(serialized) > MAX_SYNTHESIS_AGENT_CONTEXT_CHARS:
        raise RuntimeError(
            "Specialist context exceeded the configured synthesis budget."
        )
    return serialized


def _source_digest(sources: list[Source]) -> str:
    return json.dumps(
        [
            {
                "title": _truncate(source.title, MAX_SYNTHESIS_VALUE_CHARS),
                "url": source.url,
                "snippet": _truncate(
                    source.snippet,
                    MAX_SYNTHESIS_SOURCE_SNIPPET_CHARS,
                ),
            }
            for source in sources[:MAX_SYNTHESIS_SOURCE_COUNT]
        ],
        separators=(",", ":"),
    )


def _merge_unique_models(values: list[BaseModel], key: str, limit: int) -> list:
    merged = []
    seen = set()
    for value in values:
        identity = str(getattr(value, key, "")).strip().lower()
        if not identity or identity in seen:
            continue
        seen.add(identity)
        merged.append(value)
        if len(merged) >= limit:
            break
    return merged


def _backfill_synthesis(
    draft: StartupStressTestV2Draft,
    outputs: dict[str, AgentInsight],
    scores: StartupScores,
    source_count: int,
) -> StartupStressTestV2Draft:
    market = outputs.get("market_analyst")
    competitor = outputs.get("competitor_analyst")
    customer = outputs.get("customer_analyst")
    gtm = outputs.get("gtm_agent")
    vc = outputs.get("vc_partner")
    moat = outputs.get("moat_agent")
    experiment = outputs.get("experiment_agent")

    risks = _merge_unique_models(
        [
            *(vc.risks if vc else []),
            *(moat.risks if moat else []),
            *draft.risks,
        ],
        "name",
        6,
    )
    opportunities = list(
        dict.fromkeys([*(vc.opportunities if vc else []), *draft.opportunities])
    )[:6]
    agent_notes = {name: output.summary for name, output in outputs.items()}
    agent_notes["synthesizer"] = draft.agent_notes.get(
        "synthesizer",
        "Structured report assembled from specialist outputs.",
    )
    successful_agents = sum(
        1 for output in outputs.values() if "failed;" not in output.summary.lower()
    )
    confidence_cap = round(35 + 65 * (successful_agents / max(1, len(AGENT_DISPLAY_NAMES))))
    if source_count < 5:
        confidence_cap = min(confidence_cap, 55)

    return draft.model_copy(
        update={
            "confidence": min(draft.confidence, confidence_cap),
            "score_explanation": _build_score_explanation(scores),
            "market_analysis": (
                market.market_analysis
                if market and market.market_analysis
                else draft.market_analysis
            ),
            "competitor_snapshot": (
                competitor.competitor_snapshot
                if competitor and competitor.competitor_snapshot
                else draft.competitor_snapshot
            ),
            "customer_pain": (
                customer.customer_pain
                if customer and customer.customer_pain
                else draft.customer_pain
            ),
            "gtm_strategy": (
                gtm.gtm_strategy if gtm and gtm.gtm_strategy else draft.gtm_strategy
            ),
            "yc_objections": (
                vc.yc_objections if vc and vc.yc_objections else draft.yc_objections
            ),
            "moat_analysis": (
                moat.moat_analysis
                if moat and moat.moat_analysis
                else draft.moat_analysis
            ),
            "risks": risks or draft.risks,
            "opportunities": opportunities or draft.opportunities,
            "experiments": (
                experiment.experiments
                if experiment and experiment.experiments
                else draft.experiments
            ),
            "agent_notes": agent_notes,
        }
    )


def v2_synthesizer_node(state: StartupStressTestV2State) -> StartupStressTestV2State:
    writer = _stream_writer()
    started_at = time.perf_counter()
    writer(
        {
            "type": "agent_status",
            "agent": "synthesizer",
            "display_name": "Synthesizer",
            "status": "running",
            "message": "Synthesizer is assembling the final report.",
        }
    )
    try:
        scores = _compute_scores(state["agent_outputs"])
        structured_llm = _strict_structured(llm, SynthesisOutput)
        messages = [
            SystemMessage(
                content=(
                    "You are the final startup stress-test synthesizer. Produce a "
                    "decision-grade founder report from verified sources and compact "
                    "specialist outputs. Never invent market numbers, pricing, users, "
                    "or citations. Use 'Not found in current evidence' when support is "
                    "missing. Return only the requested structured result. Keep every "
                    "list to at most two concise entries and every text field to one short "
                    "sentence. Do not invent scores; they are deterministic."
                )
            ),
            HumanMessage(
                content=(
                    f"Startup context:\n{_startup_context_v2(state)}\n\n"
                    f"Verified source digest:\n{_source_digest(state.get('sources', []))}\n\n"
                    f"Specialist outputs:\n{_compact_agent_outputs(state['agent_outputs'])}\n\n"
                    f"Deterministic scores:\n{json.dumps(scores.model_dump(), separators=(',', ':'))}\n\n"
                    "Be specific: name the buyer, geography, concrete competitors, "
                    "workflow pains, acquisition channels, pricing hypothesis, and the "
                    "single strongest reason to proceed or stop. Risks need evidence and "
                    "mitigation. Experiments need measurable success/failure thresholds, "
                    "time, and cost. Preserve source URLs in evidence text."
                )
            ),
        ]
        response = _invoke_with_retry(
            structured_llm,
            messages,
            writer=writer,
            agent_name="synthesizer",
            display_name="Synthesizer",
        )
        synthesis = (
            response
            if isinstance(response, SynthesisOutput)
            else SynthesisOutput.model_validate(response)
        )
        response_draft = StartupStressTestV2Draft(
            verdict=synthesis.verdict,
            investment_recommendation=synthesis.investment_recommendation,
            confidence=synthesis.confidence,
            score_explanation=_build_score_explanation(scores),
            market_analysis=synthesis.market_analysis,
            competitor_snapshot=synthesis.competitor_snapshot,
            customer_pain=synthesis.customer_pain,
            gtm_strategy=synthesis.gtm_strategy,
            yc_objections=synthesis.yc_objections,
            moat_analysis=synthesis.moat_analysis,
            risks=synthesis.risks,
            opportunities=synthesis.opportunities,
            experiments=synthesis.experiments,
            agent_notes={"synthesizer": synthesis.synthesizer_note},
        )

        sources = state.get("sources", [])
        draft = _backfill_synthesis(
            response_draft,
            state["agent_outputs"],
            scores,
            len(sources),
        )
        markdown_report = _build_markdown_report(draft, scores, sources)
        report = StartupStressTestV2Response(
            **draft.model_dump(),
            scores=scores,
            sources=state.get("sources", []),
            markdown_report=markdown_report,
        )
        writer(
            {
                "type": "agent_status",
                "agent": "synthesizer",
                "display_name": "Synthesizer",
                "status": "completed",
                "message": report.verdict,
                "summary": report.verdict,
                "findings": [
                    report.investment_recommendation,
                    f"Overall score: {report.scores.overall}/100",
                ],
                "elapsed_ms": _elapsed_ms(started_at),
            }
        )
        return {"final_report": report}
    except Exception as exc:
        writer(
            {
                "type": "agent_status",
                "agent": "synthesizer",
                "display_name": "Synthesizer",
                "status": "failed",
                "message": _public_error(exc),
                "error": _public_error(exc),
                "elapsed_ms": _elapsed_ms(started_at),
            }
        )
        raise


V2_AGENT_STEPS = [
    ("market_analyst", "Market Analyst", market_analyst_node),
    ("competitor_analyst", "Competitor Analyst", competitor_analyst_node),
    ("customer_analyst", "Customer Analyst", customer_analyst_node),
    ("gtm_agent", "GTM Agent", gtm_agent_node),
    ("vc_partner", "VC Partner Agent", vc_partner_node),
    ("moat_agent", "Moat Agent", moat_agent_node),
    ("experiment_agent", "Experiment Agent", experiment_agent_node),
]


startup_graph_builder = StateGraph(StartupStressTestState)
startup_graph_builder.add_node("researcher", researcher_node)
startup_graph_builder.add_node("critic", critic_node)
startup_graph_builder.add_node("synthesizer", synthesizer_node)
startup_graph_builder.add_edge(START, "researcher")
startup_graph_builder.add_edge("researcher", "critic")
startup_graph_builder.add_edge("critic", "synthesizer")
startup_graph_builder.add_edge("synthesizer", END)

startup_graph = startup_graph_builder.compile()


startup_graph_v2_builder = StateGraph(StartupStressTestV2State)
startup_graph_v2_builder.add_node("evidence", v2_evidence_node)
startup_graph_v2_builder.add_node("market_analyst", market_analyst_node)
startup_graph_v2_builder.add_node("competitor_analyst", competitor_analyst_node)
startup_graph_v2_builder.add_node("customer_analyst", customer_analyst_node)
startup_graph_v2_builder.add_node("gtm_agent", gtm_agent_node)
startup_graph_v2_builder.add_node("vc_partner", vc_partner_node)
startup_graph_v2_builder.add_node("moat_agent", moat_agent_node)
startup_graph_v2_builder.add_node("experiment_agent", experiment_agent_node)
startup_graph_v2_builder.add_node("synthesizer", v2_synthesizer_node)
startup_graph_v2_builder.add_edge(START, "evidence")
V2_AGENT_IDS = [agent_id for agent_id, _display, _node in V2_AGENT_STEPS]
for agent_id in V2_AGENT_IDS:
    startup_graph_v2_builder.add_edge("evidence", agent_id)
startup_graph_v2_builder.add_edge(V2_AGENT_IDS, "synthesizer")
startup_graph_v2_builder.add_edge("synthesizer", END)

startup_graph_v2 = startup_graph_v2_builder.compile()


def run_startup_stress_test(
    request: StartupStressTestRequest,
) -> StartupStressTestResponse:
    result = startup_graph.invoke(request.model_dump())
    return result["final_report"]


def run_startup_stress_test_v2(
    request: StartupStressTestV2Request,
) -> StartupStressTestV2Response:
    result = startup_graph_v2.invoke(request.model_dump())
    return result["final_report"]


async def stream_startup_stress_test_v2(
    request: StartupStressTestV2Request,
) -> AsyncIterator[dict[str, Any]]:
    run_started_at = time.perf_counter()
    yield {
        "type": "run_start",
        "idea": request.idea,
        "message": "Starting startup stress test v2.",
    }

    try:
        report: StartupStressTestV2Response | None = None
        async for mode, chunk in startup_graph_v2.astream(
            request.model_dump(),
            stream_mode=["updates", "custom"],
        ):
            if mode == "custom" and isinstance(chunk, dict):
                yield chunk
                continue
            if mode == "updates" and isinstance(chunk, dict):
                synthesis_update = chunk.get("synthesizer")
                if isinstance(synthesis_update, dict):
                    candidate = synthesis_update.get("final_report")
                    if isinstance(candidate, StartupStressTestV2Response):
                        report = candidate
                    elif candidate is not None:
                        report = StartupStressTestV2Response.model_validate(candidate)

        if report is None:
            raise RuntimeError("The startup stress test completed without a final report.")

        yield {
            "type": "score",
            "scores": report.scores.model_dump(),
            "score_explanation": report.score_explanation,
        }
        for index, source in enumerate(report.sources, start=1):
            yield {
                "type": "source",
                "index": index,
                "source": source.model_dump(),
            }
        for start in range(0, len(report.markdown_report), SSE_REPORT_CHUNK_SIZE):
            yield {
                "type": "report_delta",
                "delta": report.markdown_report[start : start + SSE_REPORT_CHUNK_SIZE],
            }
        yield {
            "type": "run_end",
            "elapsed_ms": _elapsed_ms(run_started_at),
            "report": report.model_dump(),
        }
    except Exception as exc:
        yield {
            "type": "error",
            "message": _public_error(exc),
            "error_type": type(exc).__name__,
            "elapsed_ms": _elapsed_ms(run_started_at),
        }
