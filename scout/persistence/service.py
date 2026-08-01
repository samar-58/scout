from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import func, select, tuple_
from sqlalchemy.orm import Session, selectinload

from scout.persistence.loop_materializer import (
    THESIS_FIELDS,
    build_materialization,
)
from scout.persistence.models import (
    Assumption,
    Claim,
    Decision,
    Evidence,
    Experiment,
    ExperimentObservation,
    Project,
    ProjectThesisVersion,
    ReportArtifact,
    ResearchRun,
    StreamEvent,
)
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

# Loop collections are read whole by the workspace, so each query is capped.
# A project that legitimately exceeds these needs pagination, not a bigger read.
MAX_ASSUMPTIONS = 200
MAX_EXPERIMENTS = 200
MAX_OBSERVATIONS = 500
MAX_DECISIONS = 200
MAX_THESIS_VERSIONS = 200
MAX_CLAIMS = 500
MAX_EVIDENCE = 500
MAX_TIMELINE_ENTRIES = 400


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
        self._materialize_loop(run, report_payload)
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
        self._materialize_loop(run, report_payload)
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

    # --- Evidence-to-decision loop ---------------------------------------------

    def _materialize_loop(self, run: ResearchRun, report_payload: dict[str, Any]) -> None:
        """Turn a completed report into loop records inside the caller's transaction.

        Idempotent per run: a retried or duplicated completion finds the run's
        assumptions already present and does nothing.
        """
        existing = self.session.scalar(
            select(func.count())
            .select_from(Assumption)
            .where(Assumption.run_id == run.id)
        )
        if existing:
            return

        plan = build_materialization(
            request_payload=run.request_payload or {},
            report_payload=report_payload or {},
        )
        provenance = plan["provenance"]

        for claim in plan["claims"]:
            self.session.add(
                Claim(
                    project_id=run.project_id,
                    run_id=run.id,
                    owner_id=self.owner_id,
                    stance=claim["stance"],
                    text=claim["text"],
                    origin=claim["origin"],
                )
            )
        for record in plan["evidence"]:
            self.session.add(
                Evidence(
                    project_id=run.project_id,
                    run_id=run.id,
                    owner_id=self.owner_id,
                    **record,
                )
            )

        assumptions: dict[str, Assumption] = {}
        for item in plan["assumptions"]:
            assumption = Assumption(
                project_id=run.project_id,
                run_id=run.id,
                owner_id=self.owner_id,
                source_key=item["source_key"],
                statement=item["statement"],
                category=item["category"],
                kind=item["kind"],
                why_it_matters=item.get("why_it_matters"),
                suggested_response=item.get("suggested_response"),
                risk_rank=item["risk_rank"],
                status="untested",
                review_state="proposed",
                provenance=provenance,
            )
            assumptions[item["source_key"]] = assumption
            self.session.add(assumption)
            evidence_text = item.get("evidence_text")
            if evidence_text:
                self.session.add(
                    Claim(
                        project_id=run.project_id,
                        run_id=run.id,
                        owner_id=self.owner_id,
                        stance="contradicting",
                        text=evidence_text,
                        origin="Risk evidence",
                    )
                )

        experiments: dict[str, Experiment] = {}
        for item in plan["experiments"]:
            experiment = Experiment(
                project_id=run.project_id,
                run_id=run.id,
                owner_id=self.owner_id,
                provenance=provenance,
                **item,
            )
            experiments[item["source_key"]] = experiment
            self.session.add(experiment)

        for assumption_key, experiment_keys in plan["links"].items():
            assumption = assumptions.get(assumption_key)
            if assumption is None:
                continue
            for experiment_key in experiment_keys:
                experiment = experiments.get(experiment_key)
                if experiment is not None:
                    experiment.assumptions.append(assumption)

        has_thesis = self.session.scalar(
            select(func.count())
            .select_from(ProjectThesisVersion)
            .where(ProjectThesisVersion.project_id == run.project_id)
        )
        if not has_thesis and plan["thesis"]:
            # Version 1 is the only thesis version not created by a confirmed
            # decision: there is nothing to decide against yet. Every later
            # version comes from confirm_decision.
            self.session.add(
                ProjectThesisVersion(
                    project_id=run.project_id,
                    owner_id=self.owner_id,
                    run_id=run.id,
                    version=1,
                    fields=plan["thesis"],
                    summary=plan["thesis_summary"],
                    change_note="Initial thesis from the first completed research run.",
                )
            )

    def list_assumptions(self, project_id: UUID) -> list[Assumption]:
        self.get_project(project_id)
        statement = (
            select(Assumption)
            .where(
                Assumption.project_id == project_id,
                Assumption.owner_id == self.owner_id,
            )
            .order_by(Assumption.risk_rank, Assumption.created_at)
            .limit(MAX_ASSUMPTIONS)
        )
        return list(self.session.scalars(statement))

    def get_assumption(self, assumption_id: UUID) -> Assumption:
        assumption = self.session.scalar(
            select(Assumption).where(
                Assumption.id == assumption_id,
                Assumption.owner_id == self.owner_id,
            )
        )
        if assumption is None:
            raise ResourceNotFoundError("Assumption not found.")
        return assumption

    def review_assumption(
        self,
        assumption_id: UUID,
        *,
        statement: str | None = None,
        category: str | None = None,
        review_state: str | None = None,
        status: str | None = None,
        risk_rank: int | None = None,
        confidence: int | None = None,
        founder_note: str | None = None,
    ) -> Assumption:
        """Founder review. Editing the statement records the edit rather than
        silently rewriting Scout's original proposal."""
        assumption = self.get_assumption(assumption_id)
        if statement is not None and statement.strip() != assumption.statement:
            provenance = dict(assumption.provenance or {})
            history = list(provenance.get("statement_history") or [])
            history.append(assumption.statement)
            provenance["statement_history"] = history[-10:]
            provenance["edited_by_founder"] = True
            assumption.provenance = provenance
            assumption.statement = statement.strip()
            if review_state is None:
                review_state = "edited"
        if category is not None:
            assumption.category = category
        if review_state is not None:
            assumption.review_state = review_state
        if status is not None:
            assumption.status = status
        if risk_rank is not None:
            assumption.risk_rank = risk_rank
        if confidence is not None:
            assumption.confidence = confidence
        if founder_note is not None:
            assumption.founder_note = founder_note.strip() or None
        self.session.commit()
        self.session.refresh(assumption)
        return assumption

    def list_experiments(self, project_id: UUID) -> list[Experiment]:
        self.get_project(project_id)
        statement = (
            select(Experiment)
            .where(
                Experiment.project_id == project_id,
                Experiment.owner_id == self.owner_id,
            )
            # Both relationships are always serialized, so load them in two
            # extra queries rather than two per experiment.
            .options(
                selectinload(Experiment.assumptions),
                selectinload(Experiment.observations),
            )
            .order_by(Experiment.sprint_position, Experiment.created_at)
            .limit(MAX_EXPERIMENTS)
        )
        return list(self.session.scalars(statement))

    def get_experiment(self, experiment_id: UUID) -> Experiment:
        experiment = self.session.scalar(
            select(Experiment).where(
                Experiment.id == experiment_id,
                Experiment.owner_id == self.owner_id,
            )
        )
        if experiment is None:
            raise ResourceNotFoundError("Experiment not found.")
        return experiment

    def create_sprint_experiments(
        self,
        project_id: UUID,
        *,
        experiments: list[dict[str, Any]],
        provenance: dict[str, Any] | None = None,
    ) -> list[Experiment]:
        """Commit a proposed validation sprint. Assumption links are validated
        against owned assumptions so a model cannot invent relationships."""
        self.get_project(project_id)
        owned = {
            assumption.id: assumption for assumption in self.list_assumptions(project_id)
        }
        position = self.session.scalar(
            select(func.max(Experiment.sprint_position)).where(
                Experiment.project_id == project_id
            )
        )
        next_position = int(position or 0) + 1
        created: list[Experiment] = []

        for offset, item in enumerate(experiments):
            assumption_ids = item.pop("assumption_ids", []) or []
            experiment = Experiment(
                project_id=project_id,
                owner_id=self.owner_id,
                provenance=provenance or {},
                sprint_position=next_position + offset,
                **item,
            )
            for assumption_id in assumption_ids:
                assumption = owned.get(assumption_id)
                if assumption is None:
                    continue
                experiment.assumptions.append(assumption)
                if assumption.status == "untested":
                    assumption.status = "testing"
            self.session.add(experiment)
            created.append(experiment)

        self.session.commit()
        for experiment in created:
            self.session.refresh(experiment)
        return created

    _EXPERIMENT_TRANSITIONS = {
        "suggested": {"planned", "running", "abandoned"},
        "planned": {"running", "abandoned", "suggested"},
        "running": {"completed", "abandoned"},
        "completed": set(),
        "abandoned": {"planned"},
    }

    def update_experiment(
        self,
        experiment_id: UUID,
        *,
        status: str | None = None,
        fields: dict[str, Any] | None = None,
    ) -> Experiment:
        experiment = self.get_experiment(experiment_id)

        # Validate before mutating: a rejected transition must not leave edited
        # fields behind in the session.
        if status is not None and status != experiment.status:
            allowed = self._EXPERIMENT_TRANSITIONS.get(experiment.status, set())
            if status not in allowed:
                raise InvalidRunStateError(
                    f"Cannot move an experiment from '{experiment.status}' to '{status}'."
                )

        for key, value in (fields or {}).items():
            setattr(experiment, key, value)

        if status is not None and status != experiment.status:
            experiment.status = status
            now = datetime.now(UTC)
            if status == "running" and experiment.started_at is None:
                experiment.started_at = now
                for assumption in experiment.assumptions:
                    if assumption.status == "untested":
                        assumption.status = "testing"
            if status in {"completed", "abandoned"}:
                experiment.completed_at = now

        self.session.commit()
        self.session.refresh(experiment)
        return experiment

    def add_observation(
        self,
        experiment_id: UUID,
        *,
        kind: str,
        text: str,
        numeric_value: float | None = None,
        participant_count: int | None = None,
        source_url: str | None = None,
    ) -> ExperimentObservation:
        experiment = self.get_experiment(experiment_id)
        observation = ExperimentObservation(
            experiment_id=experiment.id,
            project_id=experiment.project_id,
            owner_id=self.owner_id,
            kind=kind,
            text=text,
            numeric_value=numeric_value,
            participant_count=participant_count,
            source_url=source_url,
        )
        self.session.add(observation)
        self.session.commit()
        self.session.refresh(observation)
        return observation

    def list_observations(self, experiment_id: UUID) -> list[ExperimentObservation]:
        experiment = self.get_experiment(experiment_id)
        statement = (
            select(ExperimentObservation)
            .where(ExperimentObservation.experiment_id == experiment.id)
            .order_by(ExperimentObservation.created_at)
            .limit(MAX_OBSERVATIONS)
        )
        return list(self.session.scalars(statement))

    def record_experiment_result(
        self,
        experiment_id: UUID,
        *,
        result: str,
        result_summary: str | None,
        review_payload: dict[str, Any] | None = None,
    ) -> Experiment:
        """Persist the reviewed outcome and propagate it to the tested assumptions."""
        experiment = self.get_experiment(experiment_id)
        experiment.result = result
        experiment.result_summary = result_summary
        if review_payload is not None:
            experiment.review_payload = review_payload
        experiment.review_at = datetime.now(UTC)
        if experiment.status != "completed":
            experiment.status = "completed"
            experiment.completed_at = datetime.now(UTC)
        for assumption in experiment.assumptions:
            assumption.status = result
        self.session.commit()
        self.session.refresh(experiment)
        return experiment

    def create_decision(
        self,
        project_id: UUID,
        *,
        proposal: str,
        kind: str = "thesis_change",
        rationale: str | None = None,
        supporting_evidence: list[Any] | None = None,
        contradicting_evidence: list[Any] | None = None,
        confidence: int | None = None,
        reversal_conditions: str | None = None,
        thesis_changes: dict[str, Any] | None = None,
        experiment_id: UUID | None = None,
        assumption_id: UUID | None = None,
        provenance: dict[str, Any] | None = None,
    ) -> Decision:
        self.get_project(project_id)
        if experiment_id is not None:
            self.get_experiment(experiment_id)
        if assumption_id is not None:
            self.get_assumption(assumption_id)
        decision = Decision(
            project_id=project_id,
            owner_id=self.owner_id,
            experiment_id=experiment_id,
            assumption_id=assumption_id,
            kind=kind,
            proposal=proposal,
            rationale=rationale,
            supporting_evidence=supporting_evidence or [],
            contradicting_evidence=contradicting_evidence or [],
            confidence=confidence,
            reversal_conditions=reversal_conditions,
            thesis_changes={
                key: value
                for key, value in (thesis_changes or {}).items()
                if key in THESIS_FIELDS and isinstance(value, str) and value.strip()
            },
            status="proposed",
            provenance=provenance or {},
        )
        self.session.add(decision)
        self.session.commit()
        self.session.refresh(decision)
        return decision

    def list_decisions(self, project_id: UUID) -> list[Decision]:
        self.get_project(project_id)
        statement = (
            select(Decision)
            .where(
                Decision.project_id == project_id,
                Decision.owner_id == self.owner_id,
            )
            .order_by(Decision.created_at.desc())
            .limit(MAX_DECISIONS)
        )
        return list(self.session.scalars(statement))

    def get_decision(self, decision_id: UUID) -> Decision:
        decision = self.session.scalar(
            select(Decision).where(
                Decision.id == decision_id,
                Decision.owner_id == self.owner_id,
            )
        )
        if decision is None:
            raise ResourceNotFoundError("Decision not found.")
        return decision

    def confirm_decision(
        self,
        decision_id: UUID,
        *,
        thesis_changes: dict[str, Any] | None = None,
        change_note: str | None = None,
    ) -> tuple[Decision, ProjectThesisVersion | None]:
        """Only a founder-confirmed decision may change the canonical thesis."""
        decision = self.get_decision(decision_id)
        if decision.status == "confirmed":
            return decision, self.latest_thesis(decision.project_id)
        if decision.status != "proposed":
            raise InvalidRunStateError(
                f"Cannot confirm a decision in '{decision.status}' state."
            )

        if thesis_changes is not None:
            decision.thesis_changes = {
                key: value
                for key, value in thesis_changes.items()
                if key in THESIS_FIELDS and isinstance(value, str) and value.strip()
            }
        decision.status = "confirmed"
        decision.confirmed_at = datetime.now(UTC)

        version: ProjectThesisVersion | None = None
        if decision.thesis_changes:
            self.get_project(decision.project_id, for_update=True)
            current = self.latest_thesis(decision.project_id)
            fields = dict(current.fields) if current is not None else {}
            for key, value in decision.thesis_changes.items():
                fields[key] = {"value": value.strip(), "origin": "decision"}
            version = ProjectThesisVersion(
                project_id=decision.project_id,
                owner_id=self.owner_id,
                decision_id=decision.id,
                version=(current.version if current is not None else 0) + 1,
                fields=fields,
                summary=decision.proposal,
                change_note=change_note or decision.rationale,
            )
            self.session.add(version)

        self.session.commit()
        self.session.refresh(decision)
        if version is not None:
            self.session.refresh(version)
        return decision, version

    def reject_decision(self, decision_id: UUID, *, note: str | None = None) -> Decision:
        decision = self.get_decision(decision_id)
        if decision.status == "rejected":
            return decision
        if decision.status != "proposed":
            raise InvalidRunStateError(
                f"Cannot reject a decision in '{decision.status}' state."
            )
        decision.status = "rejected"
        if note:
            decision.rationale = (
                f"{decision.rationale}\n\nFounder: {note}"
                if decision.rationale
                else f"Founder: {note}"
            )
        self.session.commit()
        self.session.refresh(decision)
        return decision

    def list_thesis_versions(self, project_id: UUID) -> list[ProjectThesisVersion]:
        self.get_project(project_id)
        statement = (
            select(ProjectThesisVersion)
            .where(
                ProjectThesisVersion.project_id == project_id,
                ProjectThesisVersion.owner_id == self.owner_id,
            )
            .order_by(ProjectThesisVersion.version.desc())
            .limit(MAX_THESIS_VERSIONS)
        )
        return list(self.session.scalars(statement))

    def latest_thesis(self, project_id: UUID) -> ProjectThesisVersion | None:
        return self.session.scalar(
            select(ProjectThesisVersion)
            .where(
                ProjectThesisVersion.project_id == project_id,
                ProjectThesisVersion.owner_id == self.owner_id,
            )
            .order_by(ProjectThesisVersion.version.desc())
            .limit(1)
        )

    def list_claims(self, project_id: UUID) -> list[Claim]:
        self.get_project(project_id)
        statement = (
            select(Claim)
            .where(Claim.project_id == project_id, Claim.owner_id == self.owner_id)
            .order_by(Claim.created_at)
            .limit(MAX_CLAIMS)
        )
        return list(self.session.scalars(statement))

    def list_evidence(self, project_id: UUID) -> list[Evidence]:
        self.get_project(project_id)
        statement = (
            select(Evidence)
            .where(Evidence.project_id == project_id, Evidence.owner_id == self.owner_id)
            .order_by(Evidence.created_at)
            .limit(MAX_EVIDENCE)
        )
        return list(self.session.scalars(statement))

    def project_timeline(self, project_id: UUID) -> list[dict[str, Any]]:
        """The project's learning history in one ordered list.

        Assembled from the same records the canvas reads, so the timeline cannot
        drift from the underlying state. Ownership is checked once here; the
        queries below are all filtered by the same owner.
        """
        self.get_project(project_id)
        entries: list[dict[str, Any]] = []

        for run in self.list_runs(project_id):
            entries.append(
                {
                    "kind": "run",
                    "id": str(run.id),
                    "at": run.completed_at or run.started_at or run.created_at,
                    "title": (
                        "Research completed"
                        if run.status == "completed"
                        else f"Research {run.status}"
                    ),
                    "detail": run.error_message,
                    "status": run.status,
                }
            )

        for report in self.list_reports(project_id):
            entries.append(
                {
                    "kind": "report",
                    "id": str(report.id),
                    "at": report.created_at,
                    "title": f"Report version {report.version}",
                    "detail": (report.payload or {}).get("verdict"),
                    "status": "completed",
                }
            )

        for experiment in self.list_experiments(project_id):
            if experiment.started_at is not None:
                entries.append(
                    {
                        "kind": "experiment_started",
                        "id": str(experiment.id),
                        "at": experiment.started_at,
                        "title": f"Started: {experiment.name}",
                        "detail": experiment.success_metric,
                        "status": "running",
                    }
                )
            if experiment.completed_at is not None:
                entries.append(
                    {
                        "kind": "experiment_completed",
                        "id": str(experiment.id),
                        "at": experiment.completed_at,
                        "title": f"Completed: {experiment.name}",
                        "detail": experiment.result_summary,
                        "status": experiment.result or experiment.status,
                    }
                )
            for observation in experiment.observations:
                entries.append(
                    {
                        "kind": "observation",
                        "id": str(observation.id),
                        "at": observation.created_at,
                        "title": f"{observation.kind.title()} recorded",
                        "detail": observation.text,
                        "status": observation.kind,
                    }
                )

        for decision in self.list_decisions(project_id):
            entries.append(
                {
                    "kind": "decision",
                    "id": str(decision.id),
                    "at": decision.confirmed_at or decision.created_at,
                    "title": decision.proposal,
                    "detail": decision.rationale,
                    "status": decision.status,
                }
            )

        for version in self.list_thesis_versions(project_id):
            entries.append(
                {
                    "kind": "thesis_version",
                    "id": str(version.id),
                    "at": version.created_at,
                    "title": f"Thesis version {version.version}",
                    "detail": version.change_note or version.summary,
                    "status": "confirmed",
                }
            )

        entries.sort(key=lambda entry: entry["at"], reverse=True)
        return entries[:MAX_TIMELINE_ENTRIES]
