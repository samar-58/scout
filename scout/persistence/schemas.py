from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    idea: str = Field(min_length=1, max_length=2_000)
    startup_context: dict[str, Any] = Field(default_factory=dict)


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    idea: str | None = Field(default=None, min_length=1, max_length=2_000)
    startup_context: dict[str, Any] | None = None

    @model_validator(mode="after")
    def reject_empty_update(self) -> "ProjectUpdate":
        if not self.model_fields_set:
            raise ValueError("At least one project field must be supplied.")
        return self


class ProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    idea: str
    startup_context: dict[str, Any]
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None


class ProjectSummaryRead(ProjectRead):
    """Project plus list-view aggregates.

    Additive on purpose: `GET /api/projects` still returns every `ProjectRead`
    field, so existing clients keep working while the workspace sidebar and the
    projects list read status, counts, and score from the same single request.
    """

    run_count: int
    version_count: int
    latest_version: int | None
    latest_run_id: UUID | None
    latest_run_status: str | None
    latest_run_checkpoint_stage: str | None
    overall_score: float | None
    last_activity_at: datetime

    @classmethod
    def from_summary(cls, summary: Any) -> "ProjectSummaryRead":
        run = summary.latest_run
        return cls(
            **ProjectRead.model_validate(summary.project).model_dump(),
            run_count=summary.run_count,
            version_count=summary.version_count,
            latest_version=summary.latest_version,
            latest_run_id=run.id if run is not None else None,
            latest_run_status=run.status if run is not None else None,
            latest_run_checkpoint_stage=(
                run.checkpoint_stage if run is not None else None
            ),
            overall_score=summary.overall_score,
            last_activity_at=summary.last_activity_at,
        )


class ResearchRunCreate(BaseModel):
    startup: dict[str, Any]


class ResearchRunRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    status: str
    request_payload: dict[str, Any]
    report_payload: dict[str, Any] | None
    markdown_report: str | None
    error_message: str | None
    checkpoint_stage: str | None
    resume_count: int
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class StreamEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    sequence: int
    event_type: str
    payload: dict[str, Any]
    created_at: datetime


class ReportArtifactRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    run_id: UUID
    version: int
    schema_version: str
    payload: dict[str, Any]
    markdown_report: str
    model_metadata: dict[str, Any]
    created_at: datetime
