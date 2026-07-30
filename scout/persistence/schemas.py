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
