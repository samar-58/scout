from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import func, select, tuple_
from sqlalchemy.orm import Session

from scout.persistence.models import Project, ReportArtifact, ResearchRun, StreamEvent
from scout.persistence.schemas import ProjectCreate, ProjectUpdate


class ResourceNotFoundError(LookupError):
    pass


class InvalidRunStateError(RuntimeError):
    pass


@dataclass(frozen=True)
class ProjectSummary:
    """A project with the aggregates a list view needs, and nothing more."""

    project: Project
    run_count: int
    version_count: int
    latest_version: int | None
    latest_run: ResearchRun | None
    overall_score: float | None

    @property
    def last_activity_at(self) -> datetime:
        candidates = [self.project.updated_at]
        if self.latest_run is not None:
            candidates.append(self.latest_run.updated_at)
        return max(candidate for candidate in candidates if candidate is not None)


PersistedEvent = tuple[int, str, dict[str, Any]]


class PersistenceService:
    """Ownership-scoped persistence operations.

    Every project/run lookup includes the Clerk user id. This keeps authorization
    in the same service that reads or mutates the resource rather than relying on
    route middleware alone.
    """

    def __init__(self, session: Session, owner_id: str) -> None:
        self.session = session
        self.owner_id = owner_id

    def _add_events(
        self,
        run_id: UUID,
        events: list[PersistedEvent],
    ) -> list[StreamEvent]:
        records = [
            StreamEvent(
                run_id=run_id,
                sequence=sequence,
                event_type=event_type,
                payload=payload,
            )
            for sequence, event_type, payload in events
        ]
        self.session.add_all(records)
        return records

    def _sequence_domain_events(
        self,
        run_id: UUID,
        payloads: list[dict[str, Any]],
    ) -> list[PersistedEvent]:
        latest = self.session.scalar(
            select(func.max(StreamEvent.sequence)).where(StreamEvent.run_id == run_id)
        )
        start = int(latest or 0) + 1
        return [
            (
                start + index,
                str(payload.get("type") or "unknown"),
                payload,
            )
            for index, payload in enumerate(payloads)
        ]

    @staticmethod
    def _merge_checkpoint_update(
        checkpoint: dict[str, Any],
        update: dict[str, Any],
    ) -> dict[str, Any]:
        merged = dict(checkpoint)
        for key, value in update.items():
            if key == "final_report":
                continue
            if key == "agent_outputs" and isinstance(value, dict):
                merged[key] = {**merged.get(key, {}), **value}
            else:
                merged[key] = value
        return merged

    @staticmethod
    def _stage_is_complete(checkpoint: dict[str, Any], stage: str) -> bool:
        if stage == "evidence":
            return bool(
                checkpoint.get("evidence")
                and checkpoint.get("evidence_sections")
                and checkpoint.get("sources")
            )
        if stage == "synthesizer":
            return False
        return stage in checkpoint.get("agent_outputs", {})

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

    def list_project_summaries(
        self,
        *,
        include_archived: bool = False,
    ) -> list[ProjectSummary]:
        """Projects plus the aggregates every project list needs.

        The frontend used to derive these by fetching every run and every report
        version for every project — 2N requests to render one list, with whole
        report payloads crossing the wire for a single score. The aggregates are
        computed here instead: three grouped queries, and payloads read only for
        the newest artifact of each project.
        """
        projects = self.list_projects(include_archived=include_archived)
        if not projects:
            return []

        project_ids = [project.id for project in projects]

        run_rows = self.session.execute(
            select(
                ResearchRun.project_id,
                func.count(ResearchRun.id),
            )
            .where(ResearchRun.project_id.in_(project_ids))
            .group_by(ResearchRun.project_id)
        ).all()
        run_counts = {row[0]: int(row[1]) for row in run_rows}

        version_rows = self.session.execute(
            select(
                ReportArtifact.project_id,
                func.count(ReportArtifact.id),
                func.max(ReportArtifact.version),
            )
            .where(ReportArtifact.project_id.in_(project_ids))
            .group_by(ReportArtifact.project_id)
        ).all()
        version_counts = {row[0]: int(row[1]) for row in version_rows}
        latest_versions = {row[0]: int(row[2]) for row in version_rows if row[2]}

        latest_runs: dict[UUID, ResearchRun] = {}
        for run in self.session.scalars(
            select(ResearchRun)
            .where(ResearchRun.project_id.in_(project_ids))
            .order_by(ResearchRun.created_at.asc(), ResearchRun.id.asc())
        ):
            latest_runs[run.project_id] = run

        overall_scores: dict[UUID, float] = {}
        if latest_versions:
            newest_artifacts = self.session.scalars(
                select(ReportArtifact).where(
                    tuple_(ReportArtifact.project_id, ReportArtifact.version).in_(
                        list(latest_versions.items())
                    )
                )
            )
            for artifact in newest_artifacts:
                score = self._overall_score(artifact.payload)
                if score is not None:
                    overall_scores[artifact.project_id] = score

        summaries = [
            ProjectSummary(
                project=project,
                run_count=run_counts.get(project.id, 0),
                version_count=version_counts.get(project.id, 0),
                latest_version=latest_versions.get(project.id),
                latest_run=latest_runs.get(project.id),
                overall_score=overall_scores.get(project.id),
            )
            for project in projects
        ]
        # Most recent activity first: a project whose run moved five minutes ago
        # outranks one whose row was merely touched later.
        summaries.sort(key=lambda summary: summary.last_activity_at, reverse=True)
        return summaries

    @staticmethod
    def _overall_score(payload: dict[str, Any] | None) -> float | None:
        scores = (payload or {}).get("scores")
        if not isinstance(scores, dict):
            return None
        overall = scores.get("overall")
        return float(overall) if isinstance(overall, (int, float)) else None

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
        now = datetime.now(UTC)
        run = ResearchRun(
            project_id=project_id,
            owner_id=self.owner_id,
            status="queued",
            request_payload=request_payload,
            created_at=now,
            updated_at=now,
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

    def save_checkpoint(
        self,
        run_id: UUID,
        *,
        payload: dict[str, Any],
        stage: str,
        events: list[PersistedEvent] | None = None,
    ) -> ResearchRun:
        run = self.get_run(run_id, for_update=True)
        if run.status not in {"queued", "running"}:
            raise InvalidRunStateError(
                f"Cannot checkpoint a run in '{run.status}' state."
            )
        if run.status == "queued":
            run.status = "running"
            run.started_at = datetime.now(UTC)
        run.checkpoint_payload = payload
        run.checkpoint_stage = stage
        self._add_events(run_id, events or [])
        self.session.commit()
        self.session.refresh(run)
        return run

    def prepare_resume(
        self,
        run_id: UUID,
        *,
        allow_restart_from_start: bool = False,
    ) -> ResearchRun:
        run = self.get_run(run_id, for_update=True)
        if run.status not in {"failed", "cancelled"}:
            raise InvalidRunStateError(f"Cannot resume a run in '{run.status}' state.")
        if not run.checkpoint_payload and not allow_restart_from_start:
            raise InvalidRunStateError("This run has no completed stage to resume from.")
        run.status = "queued"
        run.error_message = None
        run.completed_at = None
        run.resume_count += 1
        self.session.commit()
        self.session.refresh(run)
        return run

    def last_event_sequence(self, run_id: UUID) -> int:
        self.get_run(run_id)
        latest = self.session.scalar(
            select(func.max(StreamEvent.sequence)).where(StreamEvent.run_id == run_id)
        )
        return int(latest or 0)

    def get_run_stage_state(self, run_id: UUID) -> dict[str, Any]:
        run = self.get_run(run_id)
        return {
            **run.request_payload,
            **(run.checkpoint_payload or {}),
        }

    def begin_background_run(self, run_id: UUID, *, resumed: bool) -> ResearchRun:
        run = self.get_run(run_id, for_update=True)
        if run.status == "running":
            return run
        if run.status != "queued":
            raise InvalidRunStateError(
                f"Cannot begin a background run in '{run.status}' state."
            )
        run.status = "running"
        run.started_at = datetime.now(UTC)
        events = [
            {
                "type": "run_resumed" if resumed else "run_persisted",
                "run_id": str(run.id),
                "project_id": str(run.project_id),
            },
            {
                "type": "run_start",
                "idea": str(run.request_payload.get("idea") or ""),
                "message": (
                    "Resuming startup stress test from the saved checkpoint."
                    if resumed
                    else "Starting durable startup stress test."
                ),
            },
        ]
        self._add_events(run.id, self._sequence_domain_events(run.id, events))
        self.session.commit()
        self.session.refresh(run)
        return run

    def commit_background_stage(
        self,
        run_id: UUID,
        *,
        stage: str,
        update: dict[str, Any],
        events: list[dict[str, Any]],
    ) -> dict[str, Any]:
        run = self.get_run(run_id, for_update=True)
        if run.status != "running":
            raise InvalidRunStateError(
                f"Cannot commit a background stage in '{run.status}' state."
            )
        checkpoint = dict(run.checkpoint_payload or {})
        if self._stage_is_complete(checkpoint, stage):
            return {**run.request_payload, **checkpoint}

        checkpoint = self._merge_checkpoint_update(checkpoint, update)
        run.checkpoint_payload = checkpoint
        run.checkpoint_stage = stage
        self._add_events(run.id, self._sequence_domain_events(run.id, events))
        self.session.commit()
        return {**run.request_payload, **checkpoint}

    def complete_background_run(
        self,
        run_id: UUID,
        *,
        report_payload: dict[str, Any],
        markdown_report: str,
        events: list[dict[str, Any]],
        model_metadata: dict[str, Any] | None = None,
    ) -> ResearchRun:
        run = self.get_run(run_id, for_update=True)
        if run.status == "completed":
            return run
        if run.status != "running":
            raise InvalidRunStateError(
                f"Cannot complete a background run in '{run.status}' state."
            )
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
        self._add_events(run.id, self._sequence_domain_events(run.id, events))
        self.session.commit()
        self.session.refresh(run)
        return run

    def fail_background_run(self, run_id: UUID, message: str) -> ResearchRun:
        run = self.get_run(run_id, for_update=True)
        if run.status in {"completed", "cancelled", "failed"}:
            return run
        run.status = "failed"
        run.error_message = message
        run.completed_at = datetime.now(UTC)
        event = {"type": "error", "message": message}
        self._add_events(run.id, self._sequence_domain_events(run.id, [event]))
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
        events: list[PersistedEvent] | None = None,
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
        self._add_events(run_id, events or [])
        self.session.commit()
        self.session.refresh(run)
        return run

    def fail_run(
        self,
        run_id: UUID,
        message: str,
        *,
        events: list[PersistedEvent] | None = None,
    ) -> ResearchRun:
        run = self.get_run(run_id, for_update=True)
        if run.status in {"completed", "cancelled"}:
            raise InvalidRunStateError(f"Cannot fail a run in '{run.status}' state.")
        run.status = "failed"
        run.error_message = message
        run.completed_at = datetime.now(UTC)
        self._add_events(run_id, events or [])
        self.session.commit()
        self.session.refresh(run)
        return run

    def cancel_run(
        self,
        run_id: UUID,
        *,
        events: list[PersistedEvent] | None = None,
    ) -> ResearchRun:
        run = self.get_run(run_id, for_update=True)
        if run.status not in {"queued", "running"}:
            raise InvalidRunStateError(f"Cannot cancel a run in '{run.status}' state.")
        run.status = "cancelled"
        run.completed_at = datetime.now(UTC)
        self._add_events(run_id, events or [])
        self.session.commit()
        self.session.refresh(run)
        return run

    def append_events(
        self,
        run_id: UUID,
        events: list[PersistedEvent],
    ) -> list[StreamEvent]:
        self.get_run(run_id)
        records = self._add_events(run_id, events)
        self.session.commit()
        return records

    def append_event(
        self,
        run_id: UUID,
        *,
        sequence: int,
        event_type: str,
        payload: dict[str, Any],
    ) -> StreamEvent:
        return self.append_events(
            run_id,
            [(sequence, event_type, payload)],
        )[0]

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
