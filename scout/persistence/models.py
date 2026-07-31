from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import (
    JSON,
    BigInteger,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    MetaData,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}
JSON_VALUE = JSON().with_variant(JSONB(), "postgresql")


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class Project(TimestampMixin, Base):
    __tablename__ = "projects"

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    owner_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    idea: Mapped[str] = mapped_column(Text, nullable=False)
    startup_context: Mapped[dict[str, Any]] = mapped_column(
        JSON_VALUE,
        nullable=False,
        default=dict,
    )
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    runs: Mapped[list[ResearchRun]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    reports: Mapped[list[ReportArtifact]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class ResearchRun(TimestampMixin, Base):
    __tablename__ = "research_runs"
    __table_args__ = (
        CheckConstraint(
            "status IN ('queued','running','completed','failed','cancelled')",
            name="status",
        ),
        Index("ix_research_runs_project_created", "project_id", "created_at"),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    project_id: Mapped[UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    owner_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="queued")
    request_payload: Mapped[dict[str, Any]] = mapped_column(JSON_VALUE, nullable=False)
    report_payload: Mapped[dict[str, Any] | None] = mapped_column(JSON_VALUE)
    markdown_report: Mapped[str | None] = mapped_column(Text)
    error_message: Mapped[str | None] = mapped_column(Text)
    checkpoint_payload: Mapped[dict[str, Any] | None] = mapped_column(JSON_VALUE)
    checkpoint_stage: Mapped[str | None] = mapped_column(String(50))
    resume_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    project: Mapped[Project] = relationship(back_populates="runs")
    events: Mapped[list[StreamEvent]] = relationship(
        back_populates="run",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="StreamEvent.sequence",
    )
    artifact: Mapped[ReportArtifact | None] = relationship(
        back_populates="run",
        uselist=False,
        passive_deletes=True,
    )


class ReportArtifact(Base):
    __tablename__ = "report_artifacts"
    __table_args__ = (
        UniqueConstraint(
            "project_id",
            "version",
            name="uq_report_artifacts_project_version",
        ),
        UniqueConstraint("run_id", name="uq_report_artifacts_run"),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    project_id: Mapped[UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    run_id: Mapped[UUID] = mapped_column(
        ForeignKey("research_runs.id", ondelete="CASCADE"),
        nullable=False,
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    schema_version: Mapped[str] = mapped_column(String(50), nullable=False, default="v2")
    payload: Mapped[dict[str, Any]] = mapped_column(JSON_VALUE, nullable=False)
    markdown_report: Mapped[str] = mapped_column(Text, nullable=False)
    model_metadata: Mapped[dict[str, Any]] = mapped_column(
        JSON_VALUE,
        nullable=False,
        default=dict,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    project: Mapped[Project] = relationship(back_populates="reports")
    run: Mapped[ResearchRun] = relationship(back_populates="artifact")


class StreamEvent(Base):
    __tablename__ = "stream_events"
    __table_args__ = (
        UniqueConstraint(
            "run_id",
            "sequence",
            name="uq_stream_events_run_sequence",
        ),
        Index("ix_stream_events_run_sequence", "run_id", "sequence"),
    )

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
    )
    run_id: Mapped[UUID] = mapped_column(
        ForeignKey("research_runs.id", ondelete="CASCADE"),
        nullable=False,
    )
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON_VALUE, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    run: Mapped[ResearchRun] = relationship(back_populates="events")


# --- Evidence-to-decision loop -------------------------------------------------
#
# The report artifact stays immutable and point-in-time. These tables carry the
# living validation state: what Scout claimed, what evidence backs it, which
# assumptions matter, which experiments test them, what the founder observed,
# and which confirmed decisions moved the thesis. Every AI-authored row records
# provenance so "why did this change?" is answerable without asking a model.

ASSUMPTION_STATUSES = ("untested", "testing", "supported", "contradicted", "inconclusive")
ASSUMPTION_REVIEW_STATES = ("proposed", "accepted", "edited", "rejected")
EXPERIMENT_STATUSES = ("suggested", "planned", "running", "completed", "abandoned")
EXPERIMENT_RESULTS = ("supported", "contradicted", "inconclusive")
DECISION_STATUSES = ("proposed", "confirmed", "rejected")


class Claim(Base):
    __tablename__ = "claims"
    __table_args__ = (
        CheckConstraint(
            "stance IN ('supporting','contradicting','unknown','competitor','pain')",
            name="stance",
        ),
        Index("ix_claims_project_stance", "project_id", "stance"),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    project_id: Mapped[UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    run_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("research_runs.id", ondelete="SET NULL")
    )
    owner_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    stance: Mapped[str] = mapped_column(String(20), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    origin: Mapped[str] = mapped_column(String(120), nullable=False, default="scout")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    evidence: Mapped[list[Evidence]] = relationship(
        back_populates="claim",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class Evidence(Base):
    __tablename__ = "evidence"
    __table_args__ = (Index("ix_evidence_project_created", "project_id", "created_at"),)

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    project_id: Mapped[UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    claim_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("claims.id", ondelete="CASCADE")
    )
    run_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("research_runs.id", ondelete="SET NULL")
    )
    owner_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    source_url: Mapped[str | None] = mapped_column(Text)
    source_title: Mapped[str | None] = mapped_column(Text)
    snippet: Mapped[str | None] = mapped_column(Text)
    workflow: Mapped[str | None] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    claim: Mapped[Claim | None] = relationship(back_populates="evidence")


class Assumption(TimestampMixin, Base):
    __tablename__ = "assumptions"
    __table_args__ = (
        CheckConstraint(
            "status IN ('untested','testing','supported','contradicted','inconclusive')",
            name="status",
        ),
        CheckConstraint(
            "review_state IN ('proposed','accepted','edited','rejected')",
            name="review_state",
        ),
        UniqueConstraint("run_id", "source_key", name="uq_assumptions_run_source_key"),
        Index("ix_assumptions_project_rank", "project_id", "risk_rank"),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    project_id: Mapped[UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    run_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("research_runs.id", ondelete="SET NULL")
    )
    owner_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    # Stable per-run identity of the report element this came from, so repeated
    # materialization of the same run cannot duplicate assumptions.
    source_key: Mapped[str | None] = mapped_column(String(120))
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(40), nullable=False, default="general")
    kind: Mapped[str] = mapped_column(String(20), nullable=False, default="risk")
    why_it_matters: Mapped[str | None] = mapped_column(Text)
    suggested_response: Mapped[str | None] = mapped_column(Text)
    risk_rank: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    confidence: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="untested")
    review_state: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="proposed",
    )
    founder_note: Mapped[str | None] = mapped_column(Text)
    provenance: Mapped[dict[str, Any]] = mapped_column(
        JSON_VALUE,
        nullable=False,
        default=dict,
    )

    experiments: Mapped[list[Experiment]] = relationship(
        secondary="experiment_assumptions",
        back_populates="assumptions",
    )


class ExperimentAssumption(Base):
    """An experiment tests one or more assumptions."""

    __tablename__ = "experiment_assumptions"

    experiment_id: Mapped[UUID] = mapped_column(
        ForeignKey("experiments.id", ondelete="CASCADE"),
        primary_key=True,
    )
    assumption_id: Mapped[UUID] = mapped_column(
        ForeignKey("assumptions.id", ondelete="CASCADE"),
        primary_key=True,
    )


class Experiment(TimestampMixin, Base):
    __tablename__ = "experiments"
    __table_args__ = (
        CheckConstraint(
            "status IN ('suggested','planned','running','completed','abandoned')",
            name="status",
        ),
        CheckConstraint(
            "result IS NULL OR result IN ('supported','contradicted','inconclusive')",
            name="result",
        ),
        UniqueConstraint("run_id", "source_key", name="uq_experiments_run_source_key"),
        Index("ix_experiments_project_status", "project_id", "status"),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    project_id: Mapped[UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    run_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("research_runs.id", ondelete="SET NULL")
    )
    owner_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    source_key: Mapped[str | None] = mapped_column(String(120))
    name: Mapped[str] = mapped_column(Text, nullable=False)
    goal: Mapped[str | None] = mapped_column(Text)
    method: Mapped[str | None] = mapped_column(Text)
    channel: Mapped[str | None] = mapped_column(Text)
    target_participant: Mapped[str | None] = mapped_column(Text)
    script: Mapped[str | None] = mapped_column(Text)
    success_metric: Mapped[str | None] = mapped_column(Text)
    success_threshold: Mapped[str | None] = mapped_column(Text)
    failure_threshold: Mapped[str | None] = mapped_column(Text)
    estimated_time: Mapped[str | None] = mapped_column(String(120))
    estimated_cost: Mapped[str | None] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="suggested")
    sprint_position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    result: Mapped[str | None] = mapped_column(String(20))
    result_summary: Mapped[str | None] = mapped_column(Text)
    review_payload: Mapped[dict[str, Any] | None] = mapped_column(JSON_VALUE)
    provenance: Mapped[dict[str, Any]] = mapped_column(
        JSON_VALUE,
        nullable=False,
        default=dict,
    )
    review_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    assumptions: Mapped[list[Assumption]] = relationship(
        secondary="experiment_assumptions",
        back_populates="experiments",
    )
    observations: Mapped[list[ExperimentObservation]] = relationship(
        back_populates="experiment",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="ExperimentObservation.created_at",
    )


class ExperimentObservation(Base):
    __tablename__ = "experiment_observations"
    __table_args__ = (
        CheckConstraint(
            "kind IN ('metric','quote','note','surprise','constraint')",
            name="kind",
        ),
        Index("ix_experiment_observations_experiment", "experiment_id", "created_at"),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    experiment_id: Mapped[UUID] = mapped_column(
        ForeignKey("experiments.id", ondelete="CASCADE"),
        nullable=False,
    )
    project_id: Mapped[UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    owner_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    kind: Mapped[str] = mapped_column(String(20), nullable=False, default="note")
    text: Mapped[str] = mapped_column(Text, nullable=False)
    numeric_value: Mapped[float | None] = mapped_column(Float)
    participant_count: Mapped[int | None] = mapped_column(Integer)
    source_url: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    experiment: Mapped[Experiment] = relationship(back_populates="observations")


class Decision(Base):
    __tablename__ = "decisions"
    __table_args__ = (
        CheckConstraint(
            "status IN ('proposed','confirmed','rejected')",
            name="status",
        ),
        Index("ix_decisions_project_created", "project_id", "created_at"),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    project_id: Mapped[UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    owner_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    experiment_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("experiments.id", ondelete="SET NULL")
    )
    assumption_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("assumptions.id", ondelete="SET NULL")
    )
    kind: Mapped[str] = mapped_column(String(40), nullable=False, default="thesis_change")
    proposal: Mapped[str] = mapped_column(Text, nullable=False)
    rationale: Mapped[str | None] = mapped_column(Text)
    supporting_evidence: Mapped[list[Any]] = mapped_column(
        JSON_VALUE,
        nullable=False,
        default=list,
    )
    contradicting_evidence: Mapped[list[Any]] = mapped_column(
        JSON_VALUE,
        nullable=False,
        default=list,
    )
    confidence: Mapped[int | None] = mapped_column(Integer)
    reversal_conditions: Mapped[str | None] = mapped_column(Text)
    thesis_changes: Mapped[dict[str, Any]] = mapped_column(
        JSON_VALUE,
        nullable=False,
        default=dict,
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="proposed")
    provenance: Mapped[dict[str, Any]] = mapped_column(
        JSON_VALUE,
        nullable=False,
        default=dict,
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )


class ProjectThesisVersion(Base):
    """Immutable thesis snapshot. Only a confirmed decision creates a new one."""

    __tablename__ = "project_thesis_versions"
    __table_args__ = (
        UniqueConstraint(
            "project_id",
            "version",
            name="uq_project_thesis_versions_project_version",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    project_id: Mapped[UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    owner_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    decision_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("decisions.id", ondelete="SET NULL")
    )
    run_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("research_runs.id", ondelete="SET NULL")
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    fields: Mapped[dict[str, Any]] = mapped_column(
        JSON_VALUE,
        nullable=False,
        default=dict,
    )
    summary: Mapped[str | None] = mapped_column(Text)
    change_note: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
