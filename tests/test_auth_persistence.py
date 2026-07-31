import unittest
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from uuid import UUID

from fastapi.testclient import TestClient
from sqlalchemy import event as sqlalchemy_event
from sqlalchemy.orm import sessionmaker

from main import app
from scout.core.auth import AuthenticatedUser, get_current_user
from scout.core.config import Settings
from scout.persistence.database import create_database_engine, get_db_session
from scout.persistence.models import Base
from scout.persistence.service import PersistenceService


class AuthPersistenceApiTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_database_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.session_factory = sessionmaker(bind=self.engine, expire_on_commit=False)
        self.user_id = "user_alpha"

        def override_session():
            with self.session_factory() as session:
                yield session

        def override_user():
            return AuthenticatedUser(
                user_id=self.user_id,
                session_id="session_test",
                claims={"sub": self.user_id},
            )

        self.override_user = override_user
        app.dependency_overrides[get_db_session] = override_session
        app.dependency_overrides[get_current_user] = override_user
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()
        self.engine.dispose()

    def create_project(self):
        response = self.client.post(
            "/api/projects",
            json={
                "name": "Accounting copilot",
                "idea": "AI workflow for small accounting firms",
                "startup_context": {"target_customer": "CPA firms"},
            },
        )
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def test_protected_api_requires_bearer_authentication(self):
        app.dependency_overrides.pop(get_current_user)
        response = self.client.get("/api/me")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["detail"], "Authentication required.")
        extraction = self.client.post(
            "/api/startup/extract",
            json={"text": "A detailed startup brief. " * 10},
        )
        self.assertEqual(extraction.status_code, 401)
        app.dependency_overrides[get_current_user] = self.override_user

    def test_clerk_subject_becomes_authenticated_user(self):
        app.dependency_overrides.pop(get_current_user)
        settings = Settings(
            database_url=None,
            clerk_secret_key="sk_test_example",
            clerk_jwt_key=None,
            clerk_audience=None,
            clerk_authorized_parties=("http://localhost:3001",),
            frontend_origins=("http://localhost:3001",),
        )
        clerk = SimpleNamespace(
            authenticate_request=lambda request, options: SimpleNamespace(
                is_signed_in=True,
                payload={"sub": "user_from_clerk", "sid": "session_from_clerk"},
            )
        )
        with (
            patch("scout.core.auth.get_settings", return_value=settings),
            patch("scout.core.auth._clerk_client", return_value=clerk),
        ):
            response = self.client.get(
                "/api/me",
                headers={"Authorization": "Bearer valid-session-token"},
            )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["user_id"], "user_from_clerk")
        self.assertEqual(response.json()["session_id"], "session_from_clerk")
        app.dependency_overrides[get_current_user] = self.override_user

    def test_startup_brief_extraction_is_authenticated_and_structured(self):
        extracted = {
            "idea": "AI close automation for accounting firms",
            "problem": "Month-end close is manual.",
            "target_customer": "Independent accounting firms",
            "geography": None,
            "business_model": "B2B SaaS",
            "current_alternatives": ["Spreadsheets", "QuickBooks"],
            "customer_pain": "Teams lose two days each month.",
            "proposed_solution": "Automated reconciliation and close checklists.",
            "gtm_constraints": None,
            "pricing_hypothesis": "$99 per firm per month",
            "stage": "Prototype",
            "traction": "Three design partners",
            "team_context": "Former accountant and ML engineer",
            "known_competitors": ["Digits", "Puzzle"],
        }
        brief = "A detailed startup brief. " * 10
        with patch(
            "scout.api.extraction.extract_startup_brief",
            return_value=extracted,
        ) as extractor:
            response = self.client.post(
                "/api/startup/extract",
                json={"text": brief},
            )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["target_customer"], "Independent accounting firms")
        self.assertEqual(response.json()["known_competitors"], ["Digits", "Puzzle"])
        extractor.assert_called_once_with(brief.strip())

        too_short = self.client.post(
            "/api/startup/extract",
            json={"text": "Short idea"},
        )
        self.assertEqual(too_short.status_code, 422)

    def test_projects_are_isolated_by_clerk_owner(self):
        project = self.create_project()

        self.user_id = "user_beta"
        self.assertEqual(self.client.get("/api/projects").json(), [])
        hidden = self.client.get(f"/api/projects/{project['id']}")
        self.assertEqual(hidden.status_code, 404)

        self.user_id = "user_alpha"
        visible = self.client.get(f"/api/projects/{project['id']}")
        self.assertEqual(visible.status_code, 200)
        self.assertEqual(visible.json()["name"], "Accounting copilot")

    def test_project_list_carries_run_and_report_summaries(self):
        project = self.create_project()
        project_id = UUID(project["id"])

        with self.session_factory() as session:
            service = PersistenceService(session, self.user_id)
            first = service.create_run(project_id, {"idea": project["idea"]})
            service.start_run(first.id)
            service.complete_run(
                first.id,
                report_payload={"verdict": "Narrow", "scores": {"overall": 58}},
                markdown_report="# v1",
            )
            second = service.create_run(project_id, {"idea": project["idea"]})
            service.start_run(second.id)
            service.complete_run(
                second.id,
                report_payload={"verdict": "Proceed", "scores": {"overall": 71}},
                markdown_report="# v2",
            )
            # A third run left mid-flight: the summary must report the newest run,
            # not the newest completed one. Timestamps are set explicitly because
            # SQLite's CURRENT_TIMESTAMP has one-second resolution, so three runs
            # created inside one test would otherwise share a creation time.
            third = service.create_run(project_id, {"idea": project["idea"]})
            service.start_run(third.id)
            service.save_checkpoint(third.id, payload={"idea": "x"}, stage="evidence")
            for offset, run_id in enumerate((first.id, second.id, third.id)):
                run = service.get_run(run_id)
                run.created_at = datetime(2026, 7, 30, 9, offset, tzinfo=UTC)
                run.updated_at = datetime(2026, 7, 30, 9, offset, 30, tzinfo=UTC)
            session.commit()

        listed = self.client.get("/api/projects")
        self.assertEqual(listed.status_code, 200, listed.text)
        summary = listed.json()[0]

        self.assertEqual(summary["run_count"], 3)
        self.assertEqual(summary["version_count"], 2)
        self.assertEqual(summary["latest_version"], 2)
        self.assertEqual(summary["latest_run_id"], str(third.id))
        self.assertEqual(summary["latest_run_status"], "running")
        self.assertEqual(summary["latest_run_checkpoint_stage"], "evidence")
        # Score comes from the newest report version, not the first one.
        self.assertEqual(summary["overall_score"], 71)
        self.assertIsNotNone(summary["last_activity_at"])
        # Still a full project payload, so existing clients keep working.
        self.assertEqual(summary["name"], "Accounting copilot")
        self.assertEqual(summary["startup_context"], {"target_customer": "CPA firms"})

    def test_project_summaries_stay_zeroed_without_runs(self):
        self.create_project()
        summary = self.client.get("/api/projects").json()[0]
        self.assertEqual(summary["run_count"], 0)
        self.assertEqual(summary["version_count"], 0)
        self.assertIsNone(summary["latest_run_status"])
        self.assertIsNone(summary["latest_version"])
        self.assertIsNone(summary["overall_score"])

    def test_project_summaries_do_not_leak_across_owners(self):
        project = self.create_project()
        with self.session_factory() as session:
            service = PersistenceService(session, self.user_id)
            run = service.create_run(UUID(project["id"]), {"idea": project["idea"]})
            service.start_run(run.id)
            service.complete_run(
                run.id,
                report_payload={"scores": {"overall": 44}},
                markdown_report="# v1",
            )

        self.user_id = "user_beta"
        self.assertEqual(self.client.get("/api/projects").json(), [])

    def test_durable_run_dispatch_returns_queued_run(self):
        project = self.create_project()
        payload = {
            "project_id": project["id"],
            "messages": [
                {
                    "id": "user-1",
                    "role": "user",
                    "parts": [{"type": "text", "text": "Research this"}],
                }
            ],
            "startup": {"idea": project["idea"]},
        }
        dispatch = AsyncMock(return_value=["inngest-event-1"])
        with patch("scout.api.persisted.dispatch_research_run", dispatch):
            response = self.client.post("/api/runs", json=payload)

        self.assertEqual(response.status_code, 202, response.text)
        run = response.json()
        self.assertEqual(run["status"], "queued")
        dispatch.assert_awaited_once()
        self.assertEqual(dispatch.await_args.kwargs["owner_id"], self.user_id)
        self.assertEqual(dispatch.await_args.kwargs["resume_count"], 0)

    def test_failed_initial_dispatch_can_resume_from_stage_zero(self):
        project = self.create_project()
        payload = {
            "project_id": project["id"],
            "messages": [
                {
                    "id": "user-1",
                    "role": "user",
                    "parts": [{"type": "text", "text": "Research this"}],
                }
            ],
            "startup": {"idea": project["idea"]},
        }
        with patch(
            "scout.api.persisted.dispatch_research_run",
            AsyncMock(side_effect=RuntimeError("dispatch unavailable")),
        ):
            failed_response = self.client.post("/api/runs", json=payload)

        self.assertEqual(failed_response.status_code, 503, failed_response.text)
        with self.session_factory() as session:
            failed_run = PersistenceService(session, self.user_id).list_runs(
                UUID(project["id"])
            )[0]
            self.assertEqual(failed_run.status, "failed")
            self.assertIsNone(failed_run.checkpoint_payload)
            run_id = failed_run.id

        dispatch = AsyncMock(return_value=["inngest-event-retry"])
        with patch("scout.api.persisted.dispatch_research_run", dispatch):
            resumed_response = self.client.post(f"/api/runs/{run_id}/resume")

        self.assertEqual(resumed_response.status_code, 202, resumed_response.text)
        resumed = resumed_response.json()
        self.assertEqual(resumed["status"], "queued")
        self.assertEqual(resumed["resume_count"], 1)
        dispatch.assert_awaited_once()
        self.assertEqual(dispatch.await_args.kwargs["resume_count"], 1)
        self.assertFalse(dispatch.await_args.kwargs["resumed"])

    def test_background_specialist_deltas_merge_idempotently(self):
        project = self.create_project()
        with self.session_factory() as session:
            service = PersistenceService(session, self.user_id)
            run = service.create_run(
                UUID(project["id"]),
                {"idea": project["idea"]},
            )
            service.begin_background_run(run.id, resumed=False)
            service.commit_background_stage(
                run.id,
                stage="evidence",
                update={
                    "evidence": "Saved evidence",
                    "evidence_sections": {"1": "Saved evidence"},
                    "sources": [{"url": "https://example.com/source"}],
                    "agent_outputs": {},
                },
                events=[{"type": "evidence_ready"}],
            )
            service.commit_background_stage(
                run.id,
                stage="market_analyst",
                update={"agent_outputs": {"market_analyst": {"summary": "Market"}}},
                events=[{"type": "agent_status", "agent": "market_analyst"}],
            )
            service.commit_background_stage(
                run.id,
                stage="competitor_analyst",
                update={
                    "agent_outputs": {
                        "competitor_analyst": {"summary": "Competition"}
                    }
                },
                events=[{"type": "agent_status", "agent": "competitor_analyst"}],
            )
            service.commit_background_stage(
                run.id,
                stage="market_analyst",
                update={"agent_outputs": {"market_analyst": {"summary": "Duplicate"}}},
                events=[{"type": "duplicate"}],
            )
            stored = service.get_run(run.id)
            events = service.list_events(run.id)

        outputs = stored.checkpoint_payload["agent_outputs"]
        self.assertEqual(set(outputs), {"market_analyst", "competitor_analyst"})
        self.assertEqual(outputs["market_analyst"]["summary"], "Market")
        self.assertEqual([event.sequence for event in events], list(range(1, 6)))
        self.assertNotIn("duplicate", [event.event_type for event in events])

    def test_persisted_stream_records_run_events_and_versioned_report(self):
        project = self.create_project()

        async def fake_stream(
            request,
            *,
            resume_state=None,
            checkpoint_callback=None,
        ):
            self.assertIsNone(resume_state)
            if checkpoint_callback:
                await checkpoint_callback(
                    {
                        **request.model_dump(mode="json"),
                        "evidence": "Saved evidence",
                        "evidence_sections": {"1": "Saved evidence"},
                        "sources": [{"url": "https://example.com/source"}],
                        "agent_outputs": {},
                    },
                    "evidence",
                )
            yield {
                "type": "run_start",
                "idea": request.idea,
                "message": "Starting test research.",
            }
            yield {"type": "report_delta", "delta": "# Saved report"}
            yield {
                "type": "run_end",
                "elapsed_ms": 25,
                "report": {
                    "verdict": "Proceed carefully",
                    "scores": {"overall": 61},
                    "markdown_report": "# Saved report",
                },
            }

        payload = {
            "project_id": project["id"],
            "messages": [
                {
                    "id": "user-1",
                    "role": "user",
                    "parts": [{"type": "text", "text": "Research this"}],
                }
            ],
            "startup": {"idea": project["idea"]},
        }
        commit_count = 0

        def count_commit(_session):
            nonlocal commit_count
            commit_count += 1

        sqlalchemy_event.listen(
            self.session_factory.class_,
            "after_commit",
            count_commit,
        )
        try:
            with (
                patch(
                    "scout.api.persisted.get_session_factory",
                    return_value=self.session_factory,
                ),
                patch(
                    "scout.api.persisted.stream_startup_stress_test_v2",
                    fake_stream,
                ),
            ):
                response = self.client.post("/api/runs/stream", json=payload)
        finally:
            sqlalchemy_event.remove(
                self.session_factory.class_,
                "after_commit",
                count_commit,
            )

        self.assertEqual(commit_count, 4)

        self.assertEqual(response.status_code, 200, response.text)
        self.assertIn("data: [DONE]", response.text)
        self.assertIsNotNone(response.headers.get("x-scout-run-id"))

        runs = self.client.get(f"/api/projects/{project['id']}/runs").json()
        self.assertEqual(len(runs), 1)
        self.assertEqual(runs[0]["status"], "completed")
        self.assertEqual(runs[0]["report_payload"]["verdict"], "Proceed carefully")
        self.assertEqual(runs[0]["markdown_report"], "# Saved report")
        self.assertEqual(runs[0]["checkpoint_stage"], "evidence")
        with self.session_factory() as session:
            stored_run = PersistenceService(session, self.user_id).get_run(
                UUID(runs[0]["id"])
            )
            self.assertEqual(stored_run.checkpoint_payload["evidence"], "Saved evidence")

        events = self.client.get(f"/api/runs/{runs[0]['id']}/events").json()
        self.assertEqual([event["sequence"] for event in events], [1, 2, 3, 4])
        self.assertEqual(events[0]["event_type"], "run_persisted")
        self.assertEqual(events[-1]["event_type"], "run_end")

        reports = self.client.get(f"/api/projects/{project['id']}/reports").json()
        self.assertEqual(len(reports), 1)
        self.assertEqual(reports[0]["version"], 1)
        self.assertEqual(reports[0]["payload"]["verdict"], "Proceed carefully")

    def test_high_volume_stream_batches_event_transactions(self):
        project = self.create_project()

        async def noisy_stream(
            request,
            *,
            resume_state=None,
            checkpoint_callback=None,
        ):
            yield {
                "type": "run_start",
                "idea": request.idea,
                "message": "Starting noisy research.",
            }
            for index in range(70):
                yield {"type": "report_delta", "delta": f"chunk-{index}"}
            yield {
                "type": "run_end",
                "elapsed_ms": 10,
                "report": {
                    "verdict": "Batched",
                    "scores": {"overall": 60},
                    "markdown_report": "# Batched",
                },
            }

        payload = {
            "project_id": project["id"],
            "messages": [
                {
                    "id": "user-1",
                    "role": "user",
                    "parts": [{"type": "text", "text": "Research this"}],
                }
            ],
            "startup": {"idea": project["idea"]},
        }
        commit_count = 0

        def count_commit(_session):
            nonlocal commit_count
            commit_count += 1

        sqlalchemy_event.listen(
            self.session_factory.class_,
            "after_commit",
            count_commit,
        )
        try:
            with (
                patch(
                    "scout.api.persisted.get_session_factory",
                    return_value=self.session_factory,
                ),
                patch(
                    "scout.api.persisted.stream_startup_stress_test_v2",
                    noisy_stream,
                ),
            ):
                response = self.client.post("/api/runs/stream", json=payload)
        finally:
            sqlalchemy_event.remove(
                self.session_factory.class_,
                "after_commit",
                count_commit,
            )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(commit_count, 5)
        run_id = response.headers["x-scout-run-id"]
        events = self.client.get(f"/api/runs/{run_id}/events").json()
        self.assertEqual(len(events), 73)
        self.assertEqual([event["sequence"] for event in events], list(range(1, 74)))

    def test_failed_run_resumes_from_checkpoint_and_continues_event_sequence(self):
        project = self.create_project()
        with self.session_factory() as session:
            service = PersistenceService(session, self.user_id)
            run = service.create_run(
                UUID(project["id"]),
                {"idea": project["idea"]},
            )
            service.start_run(run.id)
            service.save_checkpoint(
                run.id,
                payload={
                    "idea": project["idea"],
                    "evidence": "Research already completed",
                    "evidence_sections": {"1": "Research already completed"},
                    "sources": [{"url": "https://example.com/evidence"}],
                    "agent_outputs": {"market_analyst": {"summary": "Saved"}},
                },
                stage="market_analyst",
            )
            service.append_event(
                run.id,
                sequence=1,
                event_type="error",
                payload={"type": "error", "message": "Invalid synthesis JSON"},
            )
            service.fail_run(run.id, "Invalid synthesis JSON")
            run_id = str(run.id)

        async def fake_resume(
            request,
            *,
            resume_state=None,
            checkpoint_callback=None,
        ):
            self.assertEqual(resume_state["evidence"], "Research already completed")
            self.assertIn("market_analyst", resume_state["agent_outputs"])
            yield {
                "type": "run_start",
                "idea": request.idea,
                "message": "Resuming saved research.",
            }
            yield {
                "type": "run_end",
                "elapsed_ms": 5,
                "report": {
                    "verdict": "Recovered report",
                    "scores": {"overall": 64},
                    "markdown_report": "# Recovered report",
                },
            }

        with (
            patch("scout.api.persisted.get_session_factory", return_value=self.session_factory),
            patch("scout.api.persisted.stream_startup_stress_test_v2", fake_resume),
        ):
            response = self.client.post(f"/api/runs/{run_id}/resume/stream")

        self.assertEqual(response.status_code, 200, response.text)
        resumed = self.client.get(f"/api/runs/{run_id}").json()
        self.assertEqual(resumed["status"], "completed")
        self.assertEqual(resumed["resume_count"], 1)
        self.assertEqual(resumed["report_payload"]["verdict"], "Recovered report")
        events = self.client.get(f"/api/runs/{run_id}/events").json()
        self.assertEqual([event["sequence"] for event in events], [1, 2, 3, 4])
        self.assertEqual(events[1]["event_type"], "run_resumed")

    def test_cross_owner_resume_is_hidden_and_checkpoint_is_required(self):
        project = self.create_project()
        with self.session_factory() as session:
            service = PersistenceService(session, self.user_id)
            resumable = service.create_run(
                UUID(project["id"]),
                {"idea": project["idea"]},
            )
            service.start_run(resumable.id)
            service.save_checkpoint(
                resumable.id,
                payload={"idea": project["idea"], "evidence": "saved"},
                stage="evidence",
            )
            service.fail_run(resumable.id, "Synthesis failed")

            without_checkpoint = service.create_run(
                UUID(project["id"]),
                {"idea": project["idea"]},
            )
            service.start_run(without_checkpoint.id)
            service.fail_run(without_checkpoint.id, "Evidence failed")

        self.user_id = "user_beta"
        hidden = self.client.post(f"/api/runs/{resumable.id}/resume/stream")
        self.assertEqual(hidden.status_code, 404)

        self.user_id = "user_alpha"
        conflict = self.client.post(
            f"/api/runs/{without_checkpoint.id}/resume/stream"
        )
        self.assertEqual(conflict.status_code, 409)
        self.assertIn("no completed stage", conflict.json()["detail"])


if __name__ == "__main__":
    unittest.main()
