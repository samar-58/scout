import asyncio
import json
import os
import unittest
from types import SimpleNamespace
from unittest.mock import patch

os.environ.setdefault("GROQ_API_KEY", "test-groq-key")

from fastapi.testclient import TestClient

from main import app
from startup_graph import (
    AgentInsight,
    CompetitorAgentOutput,
    CompetitorSnapshot,
    CustomerAgentOutput,
    CustomerPainAnalysis,
    DimensionScore,
    Experiment,
    ExperimentAgentOutput,
    GTMAgentOutput,
    GTMStrategy,
    MarketAgentOutput,
    MarketAnalysis,
    MoatAgentOutput,
    MoatAnalysis,
    Risk,
    Source,
    StartupStressTestRequest,
    StartupStressTestResponse,
    StartupStressTestV2Draft,
    StartupStressTestV2Request,
    StartupStressTestV2Response,
    SynthesisOutput,
    VCPartnerOutput,
    YCObjection,
    _build_queries,
    _build_v2_queries,
    _compact_agent_outputs,
    _source_digest,
    _invoke_with_retry,
    _normalize_sources,
    _normalize_tavily_payload,
    _strict_structured,
    run_startup_stress_test,
    run_startup_stress_test_v2,
    stream_startup_stress_test_v2,
)


class FakeSearch:
    def __init__(self):
        self.queries = []

    def invoke(self, payload):
        self.queries.append(payload["query"])
        return {
            "query": payload["query"],
            "answer": "Evidence summary",
            "results": [
                {
                    "title": "Market evidence",
                    "url": f"https://example.com/{len(self.queries)}",
                    "content": "Useful market snippet",
                }
            ],
        }


class FakeErrorSearch:
    def __init__(self):
        self.queries = []

    def invoke(self, payload):
        self.queries.append(payload["query"])
        return {"error": RuntimeError("Tavily rejected query")}


class FakeMissingUrlSearch:
    def __init__(self):
        self.queries = []

    def invoke(self, payload):
        self.queries.append(payload["query"])
        return {
            "answer": "Unsupported claim",
            "results": [{"title": "No URL", "content": "No usable citation"}],
        }


class FakeDuplicateSearch:
    def __init__(self):
        self.queries = []

    def invoke(self, payload):
        self.queries.append(payload["query"])
        return {
            "query": payload["query"],
            "answer": "Evidence summary",
            "results": [
                {
                    "title": "Shared evidence",
                    "url": "https://example.com/shared",
                    "content": "Duplicate source snippet",
                },
                {
                    "title": "Unique evidence",
                    "url": f"https://example.com/unique-{len(self.queries)}",
                    "content": "Unique source snippet",
                },
            ],
        }


def build_v2_report():
    return StartupStressTestV2Response(
        verdict="Proceed with validation",
        investment_recommendation="Validate before building",
        confidence=81,
        scores={
            "market": {"score": 8, "rationale": "Large market", "evidence": "Source A"},
            "competition": {"score": 5, "rationale": "Crowded", "evidence": "Source B"},
            "distribution": {"score": 4, "rationale": "Unclear channel", "evidence": "Source C"},
            "execution": {"score": 6, "rationale": "Buildable", "evidence": "Source D"},
            "timing": {"score": 9, "rationale": "Strong timing", "evidence": "Source E"},
            "monetization": {"score": 5, "rationale": "Pricing unproven", "evidence": "Source F"},
            "overall": 62,
        },
        score_explanation="Distribution and monetization caused the largest losses.",
        market_analysis={
            "tam": "$10B+",
            "sam": "$1B",
            "som": "$50M",
            "cagr": "20%+",
            "trends": ["AI adoption", "Workflow automation"],
            "why_now": "LLMs are good enough for workflow copilots.",
            "why_not_already_won": "Trust and distribution remain hard.",
        },
        competitor_snapshot=[
            {
                "name": "Digits",
                "icp": "Startups",
                "pricing": "$$$",
                "weakness": "Not CPA-workflow first",
                "opportunity": "Serve small CPA firms",
            }
        ],
        customer_pain={
            "pain_points": ["Month-end close is slow"],
            "switching_triggers": ["Client pressure"],
            "current_workarounds": ["Spreadsheets"],
            "why_users_switch": "Saves time inside existing workflow.",
        },
        gtm_strategy={
            "first_customer": "Small CPA firms under 20 employees",
            "acquisition_channels": ["LinkedIn outbound", "QuickBooks Marketplace"],
            "pricing": "$79/month",
            "first_100_customers": "Founder-led outbound into niche CPA communities.",
        },
        yc_objections=[
            {
                "question": "Why won't QuickBooks build this?",
                "why_it_matters": "Platform risk",
                "best_answer": "Start with CPA-specific workflow depth.",
            }
        ],
        moat_analysis={
            "data_moat": "Workflow data improves templates.",
            "workflow_lock_in": "Embedded monthly close process.",
            "switching_cost": "Historical client explanations.",
            "distribution_moat": "Accounting community partnerships.",
            "network_effects": "Weak initially.",
            "realistic_moat": "Workflow lock-in plus niche distribution.",
        },
        risks=[
            {
                "name": "Distribution risk",
                "reason": "Accounting firms buy through trust.",
                "evidence": "Ecosystem-led software buying.",
                "mitigation": "Launch as QuickBooks plugin first.",
            }
        ],
        opportunities=["Own a narrow CPA workflow wedge."],
        experiments=[
            {
                "name": "Willingness-to-pay test",
                "goal": "Validate paid demand",
                "method": "Cold email 100 CPA firms",
                "success_criteria": "10 demos booked",
                "failure_criteria": "Fewer than 3 replies",
                "time": "5 days",
                "cost": "$50",
            }
        ],
        agent_notes={"synthesizer": "Report generated."},
        sources=[{"title": "Example", "url": "https://example.com", "snippet": "Snippet"}],
        markdown_report="# Startup Stress Test\n\n62/100",
    )


def build_agent_insight():
    return AgentInsight(
        summary="Specialist notes",
        findings=["Evidence-backed finding"],
        dimension_scores={
            "market": DimensionScore(score=8, rationale="Large market", evidence="Source A"),
            "competition": DimensionScore(score=5, rationale="Crowded", evidence="Source B"),
            "distribution": DimensionScore(score=4, rationale="Unclear channel", evidence="Source C"),
            "execution": DimensionScore(score=6, rationale="Buildable", evidence="Source D"),
            "timing": DimensionScore(score=9, rationale="Strong timing", evidence="Source E"),
            "monetization": DimensionScore(score=5, rationale="Pricing unproven", evidence="Source F"),
        },
        market_analysis=MarketAnalysis(
            tam="$10B+",
            sam="$1B",
            som="$50M",
            cagr="20%+",
            trends=["AI adoption"],
            why_now="LLMs are good enough.",
            why_not_already_won="Trust is hard.",
        ),
        competitor_snapshot=[
            CompetitorSnapshot(
                name="Digits",
                icp="Startups",
                pricing="$$$",
                weakness="Not CPA-first",
                opportunity="SMB firms",
            )
        ],
        customer_pain=CustomerPainAnalysis(
            pain_points=["Slow close"],
            switching_triggers=["Time savings"],
            current_workarounds=["Spreadsheets"],
            why_users_switch="Less manual work.",
        ),
        gtm_strategy=GTMStrategy(
            first_customer="Small CPA firms",
            acquisition_channels=["LinkedIn"],
            pricing="$79/month",
            first_100_customers="Founder-led outbound.",
        ),
        yc_objections=[
            YCObjection(
                question="Why now?",
                why_it_matters="Timing",
                best_answer="LLMs are mature.",
            )
        ],
        moat_analysis=MoatAnalysis(
            data_moat="Workflow data",
            workflow_lock_in="Close process",
            switching_cost="History",
            distribution_moat="Communities",
            network_effects="Weak",
            realistic_moat="Workflow lock-in",
        ),
        risks=[
            Risk(
                name="Distribution risk",
                reason="Trust-led buying",
                evidence="Source C",
                mitigation="QuickBooks plugin",
            )
        ],
        opportunities=["Narrow wedge"],
        experiments=[
            Experiment(
                name="Cold email test",
                goal="Validate demand",
                method="Email 100 firms",
                success_criteria="10 demos",
                failure_criteria="<3 replies",
                time="5 days",
                cost="$50",
            )
        ],
    )


class FakeStructuredLLM:
    def __init__(self, schema):
        self.schema = schema

    def invoke(self, messages):
        if self.schema is StartupStressTestResponse:
            return StartupStressTestResponse(
                verdict="Testable niche",
                score=68,
                summary="The idea has a plausible buyer but needs validation.",
                research_findings=["Evidence suggests adjacent demand."],
                risks=["Differentiation is not yet clear."],
                assumptions_to_validate=["The target customer has urgent pain."],
                recommended_experiments=["Run 5 problem interviews."],
                agent_notes={"synthesizer": "Structured report generated."},
                sources=[],
            )
        insight = build_agent_insight()
        if self.schema is MarketAgentOutput:
            return MarketAgentOutput(
                summary=insight.summary,
                findings=insight.findings,
                market_analysis=insight.market_analysis,
                market_score=insight.dimension_scores["market"],
                timing_score=insight.dimension_scores["timing"],
            )
        if self.schema is CompetitorAgentOutput:
            return CompetitorAgentOutput(
                summary=insight.summary,
                findings=insight.findings,
                competitor_snapshot=insight.competitor_snapshot,
                competition_score=insight.dimension_scores["competition"],
            )
        if self.schema is CustomerAgentOutput:
            return CustomerAgentOutput(
                summary=insight.summary,
                findings=insight.findings,
                customer_pain=insight.customer_pain,
            )
        if self.schema is GTMAgentOutput:
            return GTMAgentOutput(
                summary=insight.summary,
                findings=insight.findings,
                gtm_strategy=insight.gtm_strategy,
                distribution_score=insight.dimension_scores["distribution"],
                monetization_score=insight.dimension_scores["monetization"],
            )
        if self.schema is VCPartnerOutput:
            return VCPartnerOutput(
                summary=insight.summary,
                findings=insight.findings,
                yc_objections=insight.yc_objections,
                risks=insight.risks,
                opportunities=insight.opportunities,
            )
        if self.schema is MoatAgentOutput:
            return MoatAgentOutput(
                summary=insight.summary,
                findings=insight.findings,
                moat_analysis=insight.moat_analysis,
                risks=insight.risks,
            )
        if self.schema is ExperimentAgentOutput:
            return ExperimentAgentOutput(
                summary=insight.summary,
                findings=insight.findings,
                experiments=insight.experiments,
                execution_score=insight.dimension_scores["execution"],
            )
        if self.schema is SynthesisOutput:
            report = build_v2_report()
            return SynthesisOutput(
                verdict=report.verdict,
                investment_recommendation=report.investment_recommendation,
                confidence=report.confidence,
                market_analysis=report.market_analysis,
                competitor_snapshot=report.competitor_snapshot,
                customer_pain=report.customer_pain,
                gtm_strategy=report.gtm_strategy,
                yc_objections=report.yc_objections,
                moat_analysis=report.moat_analysis,
                risks=report.risks,
                opportunities=report.opportunities,
                experiments=report.experiments,
                synthesizer_note="Report generated.",
            )
        raise AssertionError(f"Unexpected schema: {self.schema}")


class FakeLLM:
    def invoke(self, messages):
        return SimpleNamespace(content="Mock agent notes")

    def with_structured_output(self, schema, **kwargs):
        return FakeStructuredLLM(schema)


class RecordingStructuredModel:
    def __init__(self, model_name=""):
        self.model_name = model_name
        self.calls = []

    def with_structured_output(self, schema, **kwargs):
        self.calls.append((schema, kwargs))
        return self


class RateLimitError(RuntimeError):
    status_code = 429


class FlakyRunnable:
    def __init__(self):
        self.calls = 0

    def invoke(self, messages):
        self.calls += 1
        if self.calls == 1:
            raise RateLimitError("429 rate limit; Please try again in 250ms")
        return {"ok": True}


def stream_request(idea="AI copilot for small accounting firms"):
    return {
        "messages": [
            {
                "id": "user-1",
                "role": "user",
                "parts": [{"type": "text", "text": f"Stress-test: {idea}"}],
            }
        ],
        "startup": {"idea": idea},
    }


def parse_sse(response_text):
    frames = []
    for block in response_text.split("\n\n"):
        if not block.startswith("data: "):
            continue
        payload = block.removeprefix("data: ")
        frames.append(payload if payload == "[DONE]" else json.loads(payload))
    return frames


async def async_events(events):
    for event in events:
        yield event


async def collect_stream(stream):
    return [event async for event in stream]


class StartupStressTestEndpointTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_groq_structured_output_uses_strict_json_schema(self):
        model = RecordingStructuredModel()
        runnable = _strict_structured(model, MarketAgentOutput)
        self.assertIs(runnable, model)
        self.assertEqual(model.calls[0][0], MarketAgentOutput)
        self.assertEqual(
            model.calls[0][1],
            {"method": "json_schema", "strict": True},
        )

    def test_qwen_structured_output_uses_function_calling(self):
        model = RecordingStructuredModel("qwen/qwen3.6-27b")
        runnable = _strict_structured(model, MarketAgentOutput)
        self.assertIs(runnable, model)
        self.assertEqual(model.calls[0][0], MarketAgentOutput)
        self.assertEqual(model.calls[0][1], {"method": "function_calling"})

    def test_llm_rate_limit_is_retried_with_provider_delay(self):
        runnable = FlakyRunnable()
        with patch("startup_graph.time.sleep") as sleep:
            result = _invoke_with_retry(runnable, [])
        self.assertEqual(result, {"ok": True})
        self.assertEqual(runnable.calls, 2)
        sleep.assert_called_once_with(0.5)

    def test_tavily_payload_normalizes_artifact_and_rejects_error_dict(self):
        artifact = {
            "answer": "Market evidence",
            "results": [
                {
                    "title": "Verified source",
                    "url": "https://example.com/verified",
                    "content": "Specific evidence",
                }
            ],
        }
        payload = _normalize_tavily_payload(("content", artifact), "query")
        sources = _normalize_sources([payload])
        self.assertEqual(payload["query"], "query")
        self.assertEqual(len(sources), 1)
        self.assertEqual(sources[0].url, "https://example.com/verified")
        with self.assertRaisesRegex(RuntimeError, "Tavily search failed"):
            _normalize_tavily_payload(
                {"error": RuntimeError("provider rejected query")},
                "query",
            )

    def test_startup_queries_are_bounded_and_do_not_repeat_long_idea(self):
        idea = (
            "An AI operating system for veterinary clinics that automates SOAP notes, "
            "summarizes consultations, manages patient histories, drafts treatment "
            "plans, sends reminders, predicts shortages, and integrates with payments. "
        ) * 4
        long_terms = [f"Competitor {index} " + "x" * 280 for index in range(20)]
        request = StartupStressTestV2Request(
            idea=idea,
            target_customer="Independent veterinary clinics with 2-50 staff",
            geography="India",
            known_competitors=long_terms,
            current_alternatives=long_terms,
        )
        queries = _build_v2_queries(request.model_dump())
        legacy_queries = _build_queries(request.model_dump())
        self.assertEqual(len(queries), 8)
        self.assertEqual(len(legacy_queries), 3)
        self.assertTrue(all(len(query) <= 380 for query in queries + legacy_queries))
        self.assertTrue(all(idea not in query for query in queries + legacy_queries))

    def test_synthesis_context_is_bounded_for_free_tier(self):
        outputs = {
            f"agent_{index}": AgentInsight(
                summary="S" * 10_000,
                findings=["F" * 10_000 for _ in range(10)],
            )
            for index in range(7)
        }
        compact = json.loads(_compact_agent_outputs(outputs))
        self.assertLess(len(json.dumps(compact)), 8_000)
        self.assertTrue(all(len(output["summary"]) <= 90 for output in compact.values()))
        self.assertTrue(all(len(output["findings"]) == 2 for output in compact.values()))

        digest = json.loads(
            _source_digest(
                [
                    Source(
                        title="T" * 10_000,
                        url=f"https://example.com/{index}",
                        snippet="S" * 10_000,
                    )
                    for index in range(20)
                ]
            )
        )
        self.assertEqual(len(digest), 5)
        self.assertTrue(all(len(source["title"]) <= 90 for source in digest))
        self.assertTrue(all(len(source["snippet"]) <= 80 for source in digest))

    def test_health_still_works(self):
        response = self.client.get("/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "Server is running"})

    def test_valid_idea_returns_stress_test_report(self):
        report = StartupStressTestResponse(
            verdict="Promising but risky",
            score=72,
            summary="There is demand, but distribution is the main risk.",
            research_findings=["Teams already pay for adjacent workflow tools."],
            risks=["Crowded competitor landscape."],
            assumptions_to_validate=["Users will switch from spreadsheets."],
            recommended_experiments=["Interview 10 target users."],
            agent_notes={
                "researcher": "Market evidence found.",
                "critic": "Distribution risk is high.",
                "synthesizer": "Proceed with validation.",
            },
            sources=[
                Source(
                    title="Example source",
                    url="https://example.com",
                    snippet="Example snippet",
                )
            ],
        )

        with patch("main.run_startup_stress_test", return_value=report):
            response = self.client.post(
                "/startup/stress-test",
                json={"idea": "AI copilot for small accounting firms"},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["verdict"], "Promising but risky")
        self.assertEqual(payload["score"], 72)
        self.assertIn("research_findings", payload)
        self.assertIn("risks", payload)
        self.assertIn("assumptions_to_validate", payload)
        self.assertIn("recommended_experiments", payload)
        self.assertIn("agent_notes", payload)
        self.assertEqual(payload["sources"][0]["url"], "https://example.com")

    def test_empty_idea_fails_validation(self):
        response = self.client.post(
            "/startup/stress-test",
            json={"idea": ""},
        )

        self.assertEqual(response.status_code, 422)

    def test_v1_tavily_error_payload_is_rejected(self):
        fake_search = FakeErrorSearch()
        with (
            patch("startup_graph._get_tavily_search", return_value=fake_search),
            patch("startup_graph.llm", FakeLLM()),
        ):
            with self.assertRaisesRegex(RuntimeError, "Tavily search failed"):
                run_startup_stress_test(
                    StartupStressTestRequest(idea="AI assistant for restaurants")
                )
        self.assertEqual(len(fake_search.queries), 1)

    def test_v1_tavily_result_without_url_is_rejected(self):
        fake_search = FakeMissingUrlSearch()
        with (
            patch("startup_graph._get_tavily_search", return_value=fake_search),
            patch("startup_graph.llm", FakeLLM()),
        ):
            with self.assertRaisesRegex(RuntimeError, "no usable source URLs"):
                run_startup_stress_test(
                    StartupStressTestRequest(idea="AI assistant for restaurants")
                )
        self.assertEqual(len(fake_search.queries), 1)

    def test_missing_tavily_key_returns_clear_error(self):
        with patch.dict(os.environ, {"TAVILY_API_KEY": ""}, clear=False):
            response = self.client.post(
                "/startup/stress-test",
                json={"idea": "AI assistant for local restaurants"},
            )

        self.assertEqual(response.status_code, 503)
        self.assertIn("TAVILY_API_KEY is required", response.json()["detail"])

    def test_v2_accepts_idea_only_and_returns_rich_report(self):
        report = build_v2_report()

        with patch("main.run_startup_stress_test_v2", return_value=report):
            response = self.client.post(
                "/startup/stress-test/v2",
                json={"idea": "AI copilot for small accounting firms"},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["scores"]["overall"], 62)
        self.assertIn("markdown_report", payload)
        self.assertIn("competitor_snapshot", payload)
        self.assertEqual(payload["competitor_snapshot"][0]["name"], "Digits")

    def test_v2_accepts_richer_founder_context(self):
        report = build_v2_report()

        with patch("main.run_startup_stress_test_v2", return_value=report):
            response = self.client.post(
                "/startup/stress-test/v2",
                json={
                    "idea": "AI copilot for small accounting firms",
                    "problem": "Month-end close is slow.",
                    "target_customer": "CPA firms with 5-20 employees",
                    "geography": "US",
                    "business_model": "SaaS",
                    "current_alternatives": ["QuickBooks", "spreadsheets"],
                    "customer_pain": "Manual categorization and client explanations.",
                    "proposed_solution": "QuickBooks plugin for AI-assisted close.",
                    "gtm_constraints": "Founder-led outbound only.",
                    "pricing_hypothesis": "$79/month",
                    "stage": "idea",
                    "traction": "No users yet",
                    "team_context": "Solo technical founder",
                    "known_competitors": ["Digits", "Botkeeper"],
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["investment_recommendation"], "Validate before building")

    def test_v2_missing_tavily_key_returns_clear_error(self):
        with patch.dict(os.environ, {"TAVILY_API_KEY": ""}, clear=False):
            response = self.client.post(
                "/startup/stress-test/v2",
                json={"idea": "AI assistant for local restaurants"},
            )

        self.assertEqual(response.status_code, 503)
        self.assertIn("TAVILY_API_KEY is required", response.json()["detail"])

    def test_v2_stream_endpoint_emits_ai_sdk_ui_message_protocol(self):
        events = [
            {"type": "run_start", "idea": "Test idea", "message": "Starting"},
            {
                "type": "search_start",
                "status": "running",
                "index": 1,
                "total": 1,
                "query": "test query",
                "purpose": "Market evidence",
            },
            {
                "type": "search_end",
                "status": "completed",
                "index": 1,
                "total": 1,
                "query": "test query",
                "result_count": 1,
                "top_results": [{"title": "Result", "url": "https://example.com"}],
                "elapsed_ms": 5,
            },
            {
                "type": "agent_status",
                "agent": "market_analyst",
                "display_name": "Market Analyst",
                "status": "completed",
                "message": "Market analysis complete.",
            },
            {
                "type": "score",
                "scores": build_v2_report().scores.model_dump(),
                "score_explanation": "Evidence-backed score.",
            },
            {
                "type": "source",
                "index": 1,
                "source": {"title": "Example", "url": "https://example.com"},
            },
            {"type": "report_delta", "delta": "# Report"},
            {"type": "run_end", "elapsed_ms": 10, "report": build_v2_report().model_dump()},
        ]

        with patch(
            "main.stream_startup_stress_test_v2",
            return_value=async_events(events),
        ):
            response = self.client.post(
                "/startup/stress-test/v2/stream",
                json=stream_request(),
            )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.headers["content-type"].startswith("text/event-stream"))
        self.assertEqual(response.headers["x-vercel-ai-ui-message-stream"], "v1")
        frames = parse_sse(response.text)
        self.assertEqual(frames[-1], "[DONE]")
        parts = frames[:-1]
        part_types = [part["type"] for part in parts]
        for expected in (
            "start",
            "start-step",
            "reasoning-start",
            "reasoning-delta",
            "tool-input-available",
            "tool-output-available",
            "data-search",
            "data-agent",
            "data-score",
            "source-url",
            "text-start",
            "text-delta",
            "text-end",
            "data-report",
            "finish-step",
            "finish",
        ):
            self.assertIn(expected, part_types)
        self.assertEqual(part_types[-1], "finish")
        text_parts = [part for part in parts if part["type"].startswith("text-")]
        self.assertEqual({part["id"] for part in text_parts}, {text_parts[0]["id"]})
        self.assertEqual(
            next(part for part in parts if part["type"] == "text-delta")["delta"],
            "# Report",
        )
        report_part = next(part for part in parts if part["type"] == "data-report")
        self.assertNotIn("markdown_report", report_part["data"]["report"])

    def test_v2_stream_validates_nested_startup_idea(self):
        payload = stream_request("")
        response = self.client.post("/startup/stress-test/v2/stream", json=payload)
        self.assertEqual(response.status_code, 422)

    def test_v2_stream_requires_ui_messages(self):
        response = self.client.post(
            "/startup/stress-test/v2/stream",
            json={"messages": [], "startup": {"idea": "Test idea"}},
        )
        self.assertEqual(response.status_code, 422)

    def test_v2_stream_missing_tavily_key_emits_protocol_error(self):
        with patch.dict(os.environ, {"TAVILY_API_KEY": ""}, clear=False):
            response = self.client.post(
                "/startup/stress-test/v2/stream",
                json=stream_request("AI assistant for local restaurants"),
            )

        self.assertEqual(response.status_code, 200)
        frames = parse_sse(response.text)
        error_part = next(
            part for part in frames if isinstance(part, dict) and part["type"] == "error"
        )
        self.assertIn("TAVILY_API_KEY is required", error_part["errorText"])
        self.assertEqual(frames[-2]["type"], "finish")
        self.assertEqual(frames[-1], "[DONE]")

    def test_v2_stream_cors_allows_only_configured_frontend(self):
        allowed = self.client.options(
            "/startup/stress-test/v2/stream",
            headers={
                "Origin": "http://localhost:3001",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )
        denied = self.client.options(
            "/startup/stress-test/v2/stream",
            headers={
                "Origin": "https://untrusted.example",
                "Access-Control-Request-Method": "POST",
            },
        )
        self.assertEqual(allowed.status_code, 200)
        self.assertEqual(
            allowed.headers["access-control-allow-origin"],
            "http://localhost:3001",
        )
        self.assertNotIn("access-control-allow-origin", denied.headers)

    def test_graph_runs_three_research_queries_and_attaches_sources(self):
        fake_search = FakeSearch()

        with (
            patch("startup_graph._get_tavily_search", return_value=fake_search),
            patch("startup_graph.llm", FakeLLM()),
            patch("startup_graph.specialist_llm", FakeLLM()),
        ):
            report = run_startup_stress_test(
                StartupStressTestRequest(
                    idea="AI copilot for accountants",
                    target_customer="small accounting firms",
                )
            )

        self.assertEqual(len(fake_search.queries), 3)
        self.assertEqual(report.verdict, "Testable niche")
        self.assertIn("researcher", report.agent_notes)
        self.assertIn("critic", report.agent_notes)
        self.assertEqual(len(report.sources), 3)
        self.assertEqual(report.sources[0].url, "https://example.com/1")

    def test_v2_graph_runs_eight_queries_dedupes_sources_and_computes_score(self):
        fake_search = FakeDuplicateSearch()

        with (
            patch("startup_graph._get_tavily_search", return_value=fake_search),
            patch("startup_graph.llm", FakeLLM()),
            patch("startup_graph.specialist_llm", FakeLLM()),
        ):
            report = run_startup_stress_test_v2(
                StartupStressTestV2Request(
                    idea="AI copilot for accountants",
                    target_customer="small accounting firms",
                    known_competitors=["Digits", "Botkeeper"],
                )
            )

        self.assertEqual(len(fake_search.queries), 8)
        self.assertEqual(report.scores.overall, 62)
        self.assertEqual(report.scores.distribution.score, 4)
        self.assertIn("lost", report.score_explanation)
        self.assertIn("# Startup Stress Test", report.markdown_report)
        self.assertIn("## Market and Timing", report.markdown_report)
        self.assertIn("## Customer Evidence", report.markdown_report)
        self.assertIn("## Go-to-Market and Monetization", report.markdown_report)
        self.assertIn("## Validation Plan", report.markdown_report)
        self.assertIn("## Sources", report.markdown_report)
        self.assertIn("[Shared evidence](https://example.com/shared)", report.markdown_report)
        self.assertEqual(len({source.url for source in report.sources}), len(report.sources))
        self.assertEqual(len(report.sources), 9)

    def test_v2_streaming_runner_emits_search_agent_score_source_and_report_events(self):
        fake_search = FakeDuplicateSearch()

        with (
            patch("startup_graph._get_tavily_search", return_value=fake_search),
            patch("startup_graph.llm", FakeLLM()),
            patch("startup_graph.specialist_llm", FakeLLM()),
        ):
            events = asyncio.run(
                collect_stream(
                    stream_startup_stress_test_v2(
                        StartupStressTestV2Request(
                            idea="AI copilot for accountants",
                            target_customer="small accounting firms",
                        )
                    )
                )
            )

        event_types = [event["type"] for event in events]
        self.assertEqual(event_types.count("search_start"), 8)
        self.assertEqual(event_types.count("search_end"), 8)
        agent_events = [event for event in events if event["type"] == "agent_status"]
        self.assertTrue(any(event["status"] == "queued" for event in agent_events))
        self.assertTrue(any(event["status"] == "running" for event in agent_events))
        self.assertTrue(any(event["status"] == "completed" for event in agent_events))
        self.assertIn("score", event_types)
        self.assertIn("source", event_types)
        self.assertIn("report_delta", event_types)
        self.assertIn("run_end", event_types)
        self.assertEqual(events[-1]["type"], "run_end")
        self.assertEqual(events[-1]["report"]["scores"]["overall"], 62)


if __name__ == "__main__":
    unittest.main()
