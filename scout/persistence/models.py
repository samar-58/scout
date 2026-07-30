from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import (
    JSON,
    BigInteger,
    CheckConstraint,
    DateTime,
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
        UniqueConstraint("project_id", "version", name="project_version"),
        UniqueConstraint("run_id", name="run"),
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
        UniqueConstraint("run_id", "sequence", name="run_sequence"),
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
