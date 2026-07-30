import unittest
from types import SimpleNamespace
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from main import app
from scout.core.auth import AuthenticatedUser, get_current_user
from scout.core.config import Settings
from scout.persistence.database import create_database_engine, get_db_session
from scout.persistence.models import Base


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

    def test_persisted_stream_records_run_events_and_versioned_report(self):
        project = self.create_project()

        async def fake_stream(request):
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
        with (
            patch("scout.api.persisted.get_session_factory", return_value=self.session_factory),
            patch("scout.api.persisted.stream_startup_stress_test_v2", fake_stream),
        ):
            response = self.client.post("/api/runs/stream", json=payload)

        self.assertEqual(response.status_code, 200, response.text)
        self.assertIn("data: [DONE]", response.text)
        self.assertIsNotNone(response.headers.get("x-scout-run-id"))

        runs = self.client.get(f"/api/projects/{project['id']}/runs").json()
        self.assertEqual(len(runs), 1)
        self.assertEqual(runs[0]["status"], "completed")
        self.assertEqual(runs[0]["report_payload"]["verdict"], "Proceed carefully")
        self.assertEqual(runs[0]["markdown_report"], "# Saved report")

        events = self.client.get(f"/api/runs/{runs[0]['id']}/events").json()
        self.assertEqual([event["sequence"] for event in events], [1, 2, 3, 4])
        self.assertEqual(events[0]["event_type"], "run_persisted")
        self.assertEqual(events[-1]["event_type"], "run_end")

        reports = self.client.get(f"/api/projects/{project['id']}/reports").json()
        self.assertEqual(len(reports), 1)
        self.assertEqual(reports[0]["version"], 1)
        self.assertEqual(reports[0]["payload"]["verdict"], "Proceed carefully")


if __name__ == "__main__":
    unittest.main()
