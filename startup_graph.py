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


class StartupStressTestState(TypedDict, total=False):
    idea: str
    target_customer: str | None
    geography: str | None
    business_model: str | None
    research_notes: str
    critique: str
    sources: list[Source]
    final_report: StartupStressTestResponse


def _startup_context(state: StartupStressTestState) -> str:
    fields = [
        f"Idea: {state['idea']}",
        f"Target customer: {state.get('target_customer') or 'Not provided'}",
        f"Geography: {state.get('geography') or 'Not provided'}",
        f"Business model: {state.get('business_model') or 'Not provided'}",
    ]
    return "\n".join(fields)


def _build_queries(state: StartupStressTestState) -> list[str]:
    idea = state["idea"]
    target_customer = state.get("target_customer") or "target customers"
    geography = state.get("geography") or "global market"

    return [
        f"{idea} market demand {target_customer} {geography}",
        f"{idea} competitors alternatives startups {geography}",
        f"{idea} risks challenges monetization adoption {target_customer}",
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


startup_graph_builder = StateGraph(StartupStressTestState)
startup_graph_builder.add_node("researcher", researcher_node)
startup_graph_builder.add_node("critic", critic_node)
startup_graph_builder.add_node("synthesizer", synthesizer_node)
startup_graph_builder.add_edge(START, "researcher")
startup_graph_builder.add_edge("researcher", "critic")
startup_graph_builder.add_edge("critic", "synthesizer")
startup_graph_builder.add_edge("synthesizer", END)

startup_graph = startup_graph_builder.compile()


def run_startup_stress_test(
    request: StartupStressTestRequest,
) -> StartupStressTestResponse:
    result = startup_graph.invoke(request.model_dump())
    return result["final_report"]
