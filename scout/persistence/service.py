from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from scout.persistence.models import Project, ReportArtifact, ResearchRun, StreamEvent
from scout.persistence.schemas import ProjectCreate, ProjectUpdate


class ResourceNotFoundError(LookupError):
    pass


class InvalidRunStateError(RuntimeError):
    pass


class PersistenceService:
    """Ownership-scoped persistence operations.

    Every project/run lookup includes the Clerk user id. This keeps authorization
    in the same service that reads or mutates the resource rather than relying on
    route middleware alone.
    """

    def __init__(self, session: Session, owner_id: str) -> None:
        self.session = session
        self.owner_id = owner_id

    def create_project(self, data: ProjectCreate) -> Project:
        project = Project(
            owner_id=self.owner_id,
            name=data.name.strip(),
            idea=data.idea.strip(),
            startup_context=data.startup_context,
        )
        self.session.add(project)
        self.session.commit()
        self.session.refresh(project)
        return project

    def list_projects(self, *, include_archived: bool = False) -> list[Project]:
        statement = select(Project).where(Project.owner_id == self.owner_id)
        if not include_archived:
            statement = statement.where(Project.archived_at.is_(None))
        statement = statement.order_by(Project.updated_at.desc(), Project.id.desc())
        return list(self.session.scalars(statement))

    def get_project(self, project_id: UUID, *, for_update: bool = False) -> Project:
        statement = select(Project).where(
            Project.id == project_id,
            Project.owner_id == self.owner_id,
        )
        if for_update:
            statement = statement.with_for_update()
        project = self.session.scalar(statement)
        if project is None:
            raise ResourceNotFoundError("Project not found.")
        return project

    def update_project(self, project_id: UUID, data: ProjectUpdate) -> Project:
        project = self.get_project(project_id, for_update=True)
        updates = data.model_dump(exclude_unset=True)
        for field, value in updates.items():
            if isinstance(value, str):
                value = value.strip()
            setattr(project, field, value)
        self.session.commit()
        self.session.refresh(project)
        return project

    def archive_project(self, project_id: UUID) -> Project:
        project = self.get_project(project_id, for_update=True)
        if project.archived_at is None:
            project.archived_at = datetime.now(UTC)
            self.session.commit()
            self.session.refresh(project)
        return project

    def create_run(self, project_id: UUID, request_payload: dict[str, Any]) -> ResearchRun:
        self.get_project(project_id)
        run = ResearchRun(
            project_id=project_id,
            owner_id=self.owner_id,
            status="queued",
            request_payload=request_payload,
        )
        self.session.add(run)
        self.session.commit()
        self.session.refresh(run)
        return run

    def list_runs(self, project_id: UUID) -> list[ResearchRun]:
        self.get_project(project_id)
        statement = (
            select(ResearchRun)
            .where(
                ResearchRun.project_id == project_id,
                ResearchRun.owner_id == self.owner_id,
            )
            .order_by(ResearchRun.created_at.desc(), ResearchRun.id.desc())
        )
        return list(self.session.scalars(statement))

    def get_run(self, run_id: UUID, *, for_update: bool = False) -> ResearchRun:
        statement = select(ResearchRun).where(
            ResearchRun.id == run_id,
            ResearchRun.owner_id == self.owner_id,
        )
        if for_update:
            statement = statement.with_for_update()
        run = self.session.scalar(statement)
        if run is None:
            raise ResourceNotFoundError("Research run not found.")
        return run

    def start_run(self, run_id: UUID) -> ResearchRun:
        run = self.get_run(run_id, for_update=True)
        if run.status != "queued":
            raise InvalidRunStateError(f"Cannot start a run in '{run.status}' state.")
        run.status = "running"
        run.started_at = datetime.now(UTC)
        self.session.commit()
        self.session.refresh(run)
        return run

    def complete_run(
        self,
        run_id: UUID,
        *,
        report_payload: dict[str, Any],
        markdown_report: str,
        model_metadata: dict[str, Any] | None = None,
    ) -> ResearchRun:
        run = self.get_run(run_id, for_update=True)
        if run.status not in {"queued", "running"}:
            raise InvalidRunStateError(f"Cannot complete a run in '{run.status}' state.")

        self.get_project(run.project_id, for_update=True)
        latest_version = self.session.scalar(
            select(func.max(ReportArtifact.version)).where(
                ReportArtifact.project_id == run.project_id
            )
        )
        artifact = ReportArtifact(
            project_id=run.project_id,
            run_id=run.id,
            version=(latest_version or 0) + 1,
            schema_version="v2",
            payload=report_payload,
            markdown_report=markdown_report,
            model_metadata=model_metadata or {},
        )
        run.status = "completed"
        run.report_payload = report_payload
        run.markdown_report = markdown_report
        run.error_message = None
        run.completed_at = datetime.now(UTC)
        self.session.add(artifact)
        self.session.commit()
        self.session.refresh(run)
        return run

    def fail_run(self, run_id: UUID, message: str) -> ResearchRun:
        run = self.get_run(run_id, for_update=True)
        if run.status in {"completed", "cancelled"}:
            raise InvalidRunStateError(f"Cannot fail a run in '{run.status}' state.")
        run.status = "failed"
        run.error_message = message
        run.completed_at = datetime.now(UTC)
        self.session.commit()
        self.session.refresh(run)
        return run

    def cancel_run(self, run_id: UUID) -> ResearchRun:
        run = self.get_run(run_id, for_update=True)
        if run.status not in {"queued", "running"}:
            raise InvalidRunStateError(f"Cannot cancel a run in '{run.status}' state.")
        run.status = "cancelled"
        run.completed_at = datetime.now(UTC)
        self.session.commit()
        self.session.refresh(run)
        return run

    def append_event(
        self,
        run_id: UUID,
        *,
        sequence: int,
        event_type: str,
        payload: dict[str, Any],
    ) -> StreamEvent:
        self.get_run(run_id)
        event = StreamEvent(
            run_id=run_id,
            sequence=sequence,
            event_type=event_type,
            payload=payload,
        )
        self.session.add(event)
        self.session.commit()
        self.session.refresh(event)
        return event

    def list_events(self, run_id: UUID, *, after: int = 0) -> list[StreamEvent]:
        self.get_run(run_id)
        statement = (
            select(StreamEvent)
            .where(StreamEvent.run_id == run_id, StreamEvent.sequence > after)
            .order_by(StreamEvent.sequence)
        )
        return list(self.session.scalars(statement))

    def list_reports(self, project_id: UUID) -> list[ReportArtifact]:
        self.get_project(project_id)
        statement = (
            select(ReportArtifact)
            .where(ReportArtifact.project_id == project_id)
            .order_by(ReportArtifact.version.desc())
        )
        return list(self.session.scalars(statement))
