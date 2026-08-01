from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
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


# --- Evidence-to-decision loop -------------------------------------------------


class AssumptionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    run_id: UUID | None
    statement: str
    category: str
    kind: str
    why_it_matters: str | None
    suggested_response: str | None
    risk_rank: int
    confidence: int | None
    status: str
    review_state: str
    founder_note: str | None
    created_at: datetime
    updated_at: datetime


class AssumptionReview(BaseModel):
    statement: str | None = Field(default=None, min_length=1, max_length=2_000)
    category: str | None = Field(default=None, max_length=40)
    review_state: Literal["proposed", "accepted", "edited", "rejected"] | None = None
    status: Literal[
        "untested", "testing", "supported", "contradicted", "inconclusive"
    ] | None = None
    risk_rank: int | None = Field(default=None, ge=1, le=100)
    confidence: int | None = Field(default=None, ge=0, le=100)
    founder_note: str | None = Field(default=None, max_length=2_000)

    @model_validator(mode="after")
    def reject_empty_review(self) -> "AssumptionReview":
        if not self.model_fields_set:
            raise ValueError("At least one assumption field must be supplied.")
        return self


class ExperimentAssumptionRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    statement: str
    category: str
    status: str


class ObservationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    experiment_id: UUID
    kind: str
    text: str
    numeric_value: float | None
    participant_count: int | None
    source_url: str | None
    created_at: datetime


class ObservationCreate(BaseModel):
    kind: Literal["metric", "quote", "note", "surprise", "constraint"] = "note"
    text: str = Field(min_length=1, max_length=4_000)
    numeric_value: float | None = None
    participant_count: int | None = Field(default=None, ge=0, le=100_000)
    source_url: str | None = Field(default=None, max_length=2_000)


class ExperimentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    run_id: UUID | None
    name: str
    goal: str | None
    method: str | None
    channel: str | None
    target_participant: str | None
    script: str | None
    success_metric: str | None
    success_threshold: str | None
    failure_threshold: str | None
    estimated_time: str | None
    estimated_cost: str | None
    status: str
    sprint_position: int
    result: str | None
    result_summary: str | None
    review_payload: dict[str, Any] | None
    assumptions: list[ExperimentAssumptionRef]
    observations: list[ObservationRead]
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class ExperimentUpdate(BaseModel):
    status: Literal["suggested", "planned", "running", "completed", "abandoned"] | None = None
    name: str | None = Field(default=None, min_length=1, max_length=300)
    goal: str | None = Field(default=None, max_length=1_000)
    method: str | None = Field(default=None, max_length=4_000)
    channel: str | None = Field(default=None, max_length=500)
    target_participant: str | None = Field(default=None, max_length=500)
    script: str | None = Field(default=None, max_length=4_000)
    success_metric: str | None = Field(default=None, max_length=500)
    success_threshold: str | None = Field(default=None, max_length=500)
    failure_threshold: str | None = Field(default=None, max_length=500)
    estimated_time: str | None = Field(default=None, max_length=120)
    estimated_cost: str | None = Field(default=None, max_length=120)

    @model_validator(mode="after")
    def reject_empty_update(self) -> "ExperimentUpdate":
        if not self.model_fields_set:
            raise ValueError("At least one experiment field must be supplied.")
        return self


class SprintRequest(BaseModel):
    """Which assumptions to build the sprint around.

    Defaults to the founder-accepted assumptions in risk order when omitted.
    """

    assumption_ids: list[UUID] | None = Field(default=None, max_length=3)


class DecisionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    experiment_id: UUID | None
    assumption_id: UUID | None
    kind: str
    proposal: str
    rationale: str | None
    supporting_evidence: list[Any]
    contradicting_evidence: list[Any]
    confidence: int | None
    reversal_conditions: str | None
    thesis_changes: dict[str, Any]
    status: str
    confirmed_at: datetime | None
    created_at: datetime


class DecisionConfirm(BaseModel):
    thesis_changes: dict[str, str] | None = None
    change_note: str | None = Field(default=None, max_length=2_000)


class DecisionReject(BaseModel):
    note: str | None = Field(default=None, max_length=2_000)


class ThesisVersionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    decision_id: UUID | None
    run_id: UUID | None
    version: int
    fields: dict[str, Any]
    summary: str | None
    change_note: str | None
    created_at: datetime


class ClaimRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    run_id: UUID | None
    stance: str
    text: str
    origin: str
    created_at: datetime


class EvidenceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    claim_id: UUID | None
    run_id: UUID | None
    source_url: str | None
    source_title: str | None
    snippet: str | None
    workflow: str | None
    created_at: datetime


class TimelineEntry(BaseModel):
    kind: str
    id: str
    at: datetime
    title: str
    detail: str | None = None
    status: str | None = None


class ExperimentReviewRead(BaseModel):
    """The AI review plus the decision it proposed, which the founder confirms."""

    experiment: ExperimentRead
    decision: DecisionRead
    evidence_quality: str
    recommended_next_action: str
