import os
import unittest
from types import SimpleNamespace
from unittest.mock import patch

os.environ.setdefault("GROQ_API_KEY", "test-groq-key")

from fastapi.testclient import TestClient

from main import app
from startup_graph import (
    Source,
    StartupStressTestRequest,
    StartupStressTestResponse,
    run_startup_stress_test,
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


class FakeStructuredLLM:
    def invoke(self, messages):
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


class FakeLLM:
    def invoke(self, messages):
        return SimpleNamespace(content="Mock agent notes")

    def with_structured_output(self, schema):
        return FakeStructuredLLM()


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


if __name__ == "__main__":
    unittest.main()
