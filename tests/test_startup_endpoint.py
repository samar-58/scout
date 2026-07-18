import os
import unittest
from types import SimpleNamespace
from unittest.mock import patch

os.environ.setdefault("GROQ_API_KEY", "test-groq-key")

from fastapi.testclient import TestClient

from main import app
from startup_graph import (
    AgentInsight,
    CompetitorSnapshot,
    CustomerPainAnalysis,
    DimensionScore,
    Experiment,
    GTMStrategy,
    MarketAnalysis,
    MoatAnalysis,
    Risk,
    Source,
    StartupStressTestRequest,
    StartupStressTestResponse,
    StartupStressTestV2Draft,
    StartupStressTestV2Request,
    StartupStressTestV2Response,
    YCObjection,
    run_startup_stress_test,
    run_startup_stress_test_v2,
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
        if self.schema is AgentInsight:
            return build_agent_insight()
        if self.schema is StartupStressTestV2Draft:
            report = build_v2_report()
            return StartupStressTestV2Draft.model_validate(report.model_dump())
        raise AssertionError(f"Unexpected schema: {self.schema}")


class FakeLLM:
    def invoke(self, messages):
        return SimpleNamespace(content="Mock agent notes")

    def with_structured_output(self, schema):
        return FakeStructuredLLM(schema)


class StartupStressTestEndpointTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

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

    def test_graph_runs_three_research_queries_and_attaches_sources(self):
        fake_search = FakeSearch()

        with (
            patch("startup_graph._get_tavily_search", return_value=fake_search),
            patch("startup_graph.llm", FakeLLM()),
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
        self.assertEqual(len({source.url for source in report.sources}), len(report.sources))
        self.assertEqual(len(report.sources), 9)


if __name__ == "__main__":
    unittest.main()
