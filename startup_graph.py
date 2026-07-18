import os
from typing import TypedDict

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_tavily import TavilySearch
from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, Field

from llm import llm


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
    idea: str = Field(min_length=1, description="The startup idea to stress test.")
    problem: str | None = None
    target_customer: str | None = None
    geography: str | None = None
    business_model: str | None = None
    current_alternatives: list[str] | None = None
    customer_pain: str | None = None
    proposed_solution: str | None = None
    gtm_constraints: str | None = None
    pricing_hypothesis: str | None = None
    stage: str | None = None
    traction: str | None = None
    team_context: str | None = None
    known_competitors: list[str] | None = None


class DimensionScore(BaseModel):
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
    tam: str
    sam: str
    som: str
    cagr: str
    trends: list[str]
    why_now: str
    why_not_already_won: str


class CompetitorSnapshot(BaseModel):
    name: str
    icp: str
    pricing: str
    weakness: str
    opportunity: str


class CustomerPainAnalysis(BaseModel):
    pain_points: list[str]
    switching_triggers: list[str]
    current_workarounds: list[str]
    why_users_switch: str


class GTMStrategy(BaseModel):
    first_customer: str
    acquisition_channels: list[str]
    pricing: str
    first_100_customers: str


class YCObjection(BaseModel):
    question: str
    why_it_matters: str
    best_answer: str


class MoatAnalysis(BaseModel):
    data_moat: str
    workflow_lock_in: str
    switching_cost: str
    distribution_moat: str
    network_effects: str
    realistic_moat: str


class Risk(BaseModel):
    name: str
    reason: str
    evidence: str
    mitigation: str


class Experiment(BaseModel):
    name: str
    goal: str
    method: str
    success_criteria: str
    failure_criteria: str
    time: str
    cost: str


class AgentInsight(BaseModel):
    summary: str
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
    sources: list[Source]
    agent_outputs: dict[str, AgentInsight]
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
        if isinstance(value, list):
            rendered = ", ".join(value) if value else "Not provided"
        else:
            rendered = value or "Not provided"
        lines.append(f"{label}: {rendered}")
    return "\n".join(lines)


def _build_queries(state: StartupStressTestState) -> list[str]:
    idea = state["idea"]
    target_customer = state.get("target_customer") or "target customers"
    geography = state.get("geography") or "global market"

    return [
        f"{idea} market demand {target_customer} {geography}",
        f"{idea} competitors alternatives startups {geography}",
        f"{idea} risks challenges monetization adoption {target_customer}",
    ]


def _build_v2_queries(state: StartupStressTestV2State) -> list[str]:
    idea = state["idea"]
    target_customer = state.get("target_customer") or "target customers"
    geography = state.get("geography") or "global market"
    alternatives = " ".join(state.get("current_alternatives") or [])
    competitors = " ".join(state.get("known_competitors") or [])

    return [
        f"{idea} {geography} market size TAM SAM SOM CAGR trend",
        f"{idea} why now market timing adoption drivers {geography}",
        f"{idea} competitors alternatives pricing positioning {competitors} {alternatives}",
        f"{idea} competitor weaknesses customer complaints pricing {competitors}",
        f"site:reddit.com OR site:g2.com OR site:capterra.com {idea} {target_customer} pain points reviews complaints",
        f"{target_customer} workflow pain feature requests forum app reviews {idea}",
        f"{idea} go to market channels marketplace partnerships {target_customer}",
        f"{idea} moat defensibility switching costs data moat investor objections",
    ]


def _get_tavily_search() -> TavilySearch:
    if not os.getenv("TAVILY_API_KEY"):
        raise RuntimeError(
            "TAVILY_API_KEY is required to run startup stress-test research."
        )

    return TavilySearch(
        max_results=5,
        search_depth="advanced",
        include_answer=True,
        topic="general",
    )


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
                    snippet=result.get("content"),
                )
            )

    return sources[:15]


def _format_search_payloads(search_payloads: list[dict]) -> str:
    sections: list[str] = []
    for payload in search_payloads:
        query = payload.get("query", "Unknown query")
        answer = payload.get("answer") or "No direct answer returned."
        result_lines = []
        for result in payload.get("results", []):
            result_lines.append(
                "- "
                f"{result.get('title', 'Untitled')} | "
                f"{result.get('url', 'No URL')} | "
                f"{result.get('content', 'No snippet')}"
            )
        sections.append(
            f"Query: {query}\nTavily answer: {answer}\nResults:\n"
            + "\n".join(result_lines)
        )
    return "\n\n".join(sections)


def _merge_agent_outputs(
    state: StartupStressTestV2State,
    name: str,
    output: AgentInsight,
) -> StartupStressTestV2State:
    return {
        "agent_outputs": {
            **state.get("agent_outputs", {}),
            name: output,
        }
    }


def _run_structured_agent(
    state: StartupStressTestV2State,
    agent_name: str,
    role_prompt: str,
    task_prompt: str,
) -> AgentInsight:
    structured_llm = llm.with_structured_output(AgentInsight)
    response = structured_llm.invoke(
        [
            SystemMessage(content=role_prompt),
            HumanMessage(
                content=(
                    f"Startup context:\n{_startup_context_v2(state)}\n\n"
                    f"Research evidence:\n{state['evidence']}\n\n"
                    f"Task:\n{task_prompt}\n\n"
                    "Reference source URLs from the evidence when making claims. "
                    "Return only fields relevant to your role."
                )
            ),
        ]
    )
    if isinstance(response, AgentInsight):
        return response
    return AgentInsight.model_validate(response)


def _fallback_score(label: str, outputs: dict[str, AgentInsight]) -> DimensionScore:
    for output in outputs.values():
        if label in output.dimension_scores:
            return output.dimension_scores[label]
    return DimensionScore(
        score=5,
        rationale=f"{label.title()} could not be scored confidently from agent output.",
        evidence="Insufficient structured evidence was returned by the specialist agents.",
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


def _build_markdown_report(report: StartupStressTestV2Draft, scores: StartupScores) -> str:
    risks = "\n".join(
        f"{index}. {risk.name}: {risk.reason} Mitigation: {risk.mitigation}"
        for index, risk in enumerate(report.risks[:3], start=1)
    )
    opportunities = "\n".join(
        f"{index}. {opportunity}"
        for index, opportunity in enumerate(report.opportunities[:3], start=1)
    )
    competitors = "\n".join(
        "| {name} | {icp} | {pricing} | {weakness} | {opportunity} |".format(
            name=competitor.name,
            icp=competitor.icp,
            pricing=competitor.pricing,
            weakness=competitor.weakness,
            opportunity=competitor.opportunity,
        )
        for competitor in report.competitor_snapshot
    )
    first_experiment = report.experiments[0] if report.experiments else None
    experiment_text = (
        f"**{first_experiment.name}**\n\n"
        f"Goal: {first_experiment.goal}\n\n"
        f"Method: {first_experiment.method}\n\n"
        f"Success: {first_experiment.success_criteria}\n\n"
        f"Failure: {first_experiment.failure_criteria}\n\n"
        f"Time: {first_experiment.time}\n\n"
        f"Cost: {first_experiment.cost}"
        if first_experiment
        else "No experiment returned."
    )

    return (
        "# Startup Stress Test\n\n"
        f"## Overall Score\n{scores.overall}/100\n\n"
        f"## Investment Recommendation\n{report.investment_recommendation}\n\n"
        f"## Confidence\n{report.confidence}%\n\n"
        "## Scorecard\n"
        f"- Market: {_stars(scores.market.score)} ({scores.market.score}/10)\n"
        f"- Competition: {_stars(scores.competition.score)} ({scores.competition.score}/10)\n"
        f"- Distribution: {_stars(scores.distribution.score)} ({scores.distribution.score}/10)\n"
        f"- Execution: {_stars(scores.execution.score)} ({scores.execution.score}/10)\n"
        f"- Timing: {_stars(scores.timing.score)} ({scores.timing.score}/10)\n"
        f"- Monetization: {_stars(scores.monetization.score)} ({scores.monetization.score}/10)\n\n"
        f"## Verdict\n{report.verdict}\n\n"
        f"## Score Explanation\n{report.score_explanation}\n\n"
        f"## Top Risks\n{risks or 'No risks returned.'}\n\n"
        f"## Top Opportunities\n{opportunities or 'No opportunities returned.'}\n\n"
        f"## First Experiment\n{experiment_text}\n\n"
        "## Competitor Snapshot\n"
        "| Competitor | ICP | Pricing | Weakness | Opportunity |\n"
        "| --- | --- | --- | --- | --- |\n"
        f"{competitors or '| Not found | Not found | Not found | Not found | Not found |'}\n"
    )


def researcher_node(state: StartupStressTestState) -> StartupStressTestState:
    search = _get_tavily_search()
    search_payloads = [
        search.invoke({"query": query})
        for query in _build_queries(state)
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
    structured_llm = llm.with_structured_output(StartupStressTestResponse)
    response = structured_llm.invoke(
        [
            SystemMessage(
                content=(
                    "You are a startup strategy advisor. Return a balanced, concise "
                    "stress-test report. Score should reflect evidence quality, market "
                    "pull, differentiation, monetization, and execution risk."
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
    search = _get_tavily_search()
    search_payloads = [
        search.invoke({"query": query})
        for query in _build_v2_queries(state)
    ]
    return {
        "evidence": _format_search_payloads(search_payloads),
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
    return _merge_agent_outputs(state, "market_analyst", output)


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
    return _merge_agent_outputs(state, "competitor_analyst", output)


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
    return _merge_agent_outputs(state, "customer_analyst", output)


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
    return _merge_agent_outputs(state, "gtm_agent", output)


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
    return _merge_agent_outputs(state, "vc_partner", output)


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
    return _merge_agent_outputs(state, "moat_agent", output)


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
    return _merge_agent_outputs(state, "experiment_agent", output)


def v2_synthesizer_node(state: StartupStressTestV2State) -> StartupStressTestV2State:
    scores = _compute_scores(state["agent_outputs"])
    structured_llm = llm.with_structured_output(StartupStressTestV2Draft)
    response = structured_llm.invoke(
        [
            SystemMessage(
                content=(
                    "You are the final startup stress-test synthesizer. Produce a "
                    "founder-grade report from specialist agent outputs. Do not invent "
                    "an overall score; the system will compute it deterministically."
                )
            ),
            HumanMessage(
                content=(
                    f"Startup context:\n{_startup_context_v2(state)}\n\n"
                    f"Sources/evidence:\n{state['evidence']}\n\n"
                    f"Specialist outputs:\n{state['agent_outputs']}\n\n"
                    f"Deterministic scores:\n{scores.model_dump()}\n\n"
                    "Synthesize across sources. Include competitor table entries, "
                    "specific risks with evidence and mitigation, YC objections, moat, "
                    "opportunities, and concrete experiments."
                )
            ),
        ]
    )
    if not isinstance(response, StartupStressTestV2Draft):
        response = StartupStressTestV2Draft.model_validate(response)

    score_explanation = _build_score_explanation(scores)
    draft = response.model_copy(update={"score_explanation": score_explanation})
    markdown_report = _build_markdown_report(draft, scores)
    report = StartupStressTestV2Response(
        **draft.model_dump(),
        scores=scores,
        sources=state.get("sources", []),
        markdown_report=markdown_report,
    )

    return {"final_report": report}


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
startup_graph_v2_builder.add_edge("evidence", "market_analyst")
startup_graph_v2_builder.add_edge("market_analyst", "competitor_analyst")
startup_graph_v2_builder.add_edge("competitor_analyst", "customer_analyst")
startup_graph_v2_builder.add_edge("customer_analyst", "gtm_agent")
startup_graph_v2_builder.add_edge("gtm_agent", "vc_partner")
startup_graph_v2_builder.add_edge("vc_partner", "moat_agent")
startup_graph_v2_builder.add_edge("moat_agent", "experiment_agent")
startup_graph_v2_builder.add_edge("experiment_agent", "synthesizer")
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
