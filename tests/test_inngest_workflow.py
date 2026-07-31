import asyncio
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from scout.research.startup_graph import V2_AGENT_IDS
from scout.workflows.research import (
    _failure_run_data,
    durable_startup_research,
    durable_startup_research_handler,
)


class FakeStep:
    def __init__(self):
        self.ids = []

    async def run(self, step_id, handler, *args):
        self.ids.append(step_id)
        return await handler(*args)


class FakeGroup:
    def __init__(self):
        self.parallel_width = 0

    async def parallel(self, callables):
        self.parallel_width = len(callables)
        return await asyncio.gather(*(callable_() for callable_ in callables))


class InngestWorkflowTests(unittest.TestCase):
    def test_registration_serializes_durability_controls(self):
        config = durable_startup_research.get_config(
            "https://example.com/api/inngest"
        ).main.model_dump(mode="json", exclude_none=True)

        self.assertEqual(config["id"], "scout-durable-startup-research")
        self.assertEqual(config["timeouts"]["finish"], "30m")
        self.assertEqual(config["singleton"]["key"], "event.data.run_id")
        self.assertEqual(config["cancel"][0]["event"], "scout/research.cancelled")

    def test_workflow_uses_evidence_parallel_specialists_and_synthesis_steps(self):
        step = FakeStep()
        group = FakeGroup()
        context = SimpleNamespace(
            event=SimpleNamespace(
                data={
                    "run_id": "11111111-1111-1111-1111-111111111111",
                    "owner_id": "user_alpha",
                    "resumed": False,
                }
            ),
            step=step,
            group=group,
        )
        begin = AsyncMock(return_value={"status": "running"})
        execute = AsyncMock(return_value={"status": "completed"})
        synthesis = AsyncMock(return_value={"status": "completed"})

        with (
            patch("scout.workflows.research._begin_run_async", begin),
            patch("scout.workflows.research._execute_stage_async", execute),
            patch("scout.workflows.research._execute_synthesis_async", synthesis),
        ):
            result = asyncio.run(durable_startup_research_handler(context))

        self.assertEqual(result["status"], "completed")
        self.assertEqual(group.parallel_width, 7)
        self.assertEqual(step.ids[0:2], ["begin-run", "collect-evidence"])
        self.assertEqual(
            set(step.ids[2:-1]),
            {f"specialist-{agent_id}" for agent_id in V2_AGENT_IDS},
        )
        self.assertEqual(step.ids[-1], "synthesize-report")
        begin.assert_awaited_once()
        self.assertEqual(execute.await_count, 8)
        synthesis.assert_awaited_once()

    def test_failure_handler_extracts_original_run_identity(self):
        context = SimpleNamespace(
            event=SimpleNamespace(
                data={
                    "event": {
                        "data": {
                            "run_id": "11111111-1111-1111-1111-111111111111",
                            "owner_id": "user_alpha",
                        }
                    },
                    "error": {"message": "Provider exhausted retries"},
                }
            )
        )

        run_id, owner_id, message = _failure_run_data(context)

        self.assertEqual(run_id, "11111111-1111-1111-1111-111111111111")
        self.assertEqual(owner_id, "user_alpha")
        self.assertEqual(message, "Provider exhausted retries")


if __name__ == "__main__":
    unittest.main()
