from __future__ import annotations

import asyncio
import os
from functools import partial
from typing import Annotated, Any, Literal
from uuid import UUID

from anyio import to_thread
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from scout.core.auth import CurrentUser
from scout.persistence.database import get_db_session, get_session_factory
from scout.persistence.schemas import (
    ProjectCreate,
    ProjectRead,
    ProjectUpdate,
    ReportArtifactRead,
    ResearchRunRead,
    StreamEventRead,
)
from scout.persistence.service import (
    InvalidRunStateError,
    PersistenceService,
    ResourceNotFoundError,
)
from scout.research.startup_graph import (
    StartupStressTestV2Request,
    stream_startup_stress_test_v2,
)
from scout.streaming.ai_sdk import UIMessageStreamFormatter, encode_sse

router = APIRouter(prefix="/api", tags=["authenticated"])
SessionDependency = Annotated[Session, Depends(get_db_session)]


class UIMessage(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    role: Literal["system", "user", "assistant"]
    parts: list[dict[str, Any]] = Field(default_factory=list)


class PersistedStreamRequest(BaseModel):
    messages: list[UIMessage] = Field(min_length=1)
    startup: StartupStressTestV2Request


class PersistedStreamByProjectRequest(PersistedStreamRequest):
    project_id: UUID


def _service(session: Session, user_id: str) -> PersistenceService:
    return PersistenceService(session, user_id)


def _not_found(exc: ResourceNotFoundError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


def _conflict(exc: InvalidRunStateError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))


@router.get("/me")
def authenticated_identity(user: CurrentUser) -> dict[str, str | None]:
    return {
        "user_id": user.user_id,
        "session_id": user.session_id,
        "organization_id": user.organization_id,
    }


@router.post("/projects", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(
    data: ProjectCreate,
    user: CurrentUser,
    session: SessionDependency,
) -> ProjectRead:
    return ProjectRead.model_validate(_service(session, user.user_id).create_project(data))


@router.get("/projects", response_model=list[ProjectRead])
def list_projects(
    user: CurrentUser,
    session: SessionDependency,
    include_archived: bool = False,
) -> list[ProjectRead]:
    projects = _service(session, user.user_id).list_projects(
        include_archived=include_archived
    )
    return [ProjectRead.model_validate(project) for project in projects]


@router.get("/projects/{project_id}", response_model=ProjectRead)
def get_project(
    project_id: UUID,
    user: CurrentUser,
    session: SessionDependency,
) -> ProjectRead:
    try:
        project = _service(session, user.user_id).get_project(project_id)
    except ResourceNotFoundError as exc:
        raise _not_found(exc) from exc
    return ProjectRead.model_validate(project)


@router.patch("/projects/{project_id}", response_model=ProjectRead)
def update_project(
    project_id: UUID,
    data: ProjectUpdate,
    user: CurrentUser,
    session: SessionDependency,
) -> ProjectRead:
    try:
        project = _service(session, user.user_id).update_project(project_id, data)
    except ResourceNotFoundError as exc:
        raise _not_found(exc) from exc
    return ProjectRead.model_validate(project)


@router.delete("/projects/{project_id}", response_model=ProjectRead)
def archive_project(
    project_id: UUID,
    user: CurrentUser,
    session: SessionDependency,
) -> ProjectRead:
    try:
        project = _service(session, user.user_id).archive_project(project_id)
    except ResourceNotFoundError as exc:
        raise _not_found(exc) from exc
    return ProjectRead.model_validate(project)


@router.post(
    "/projects/{project_id}/runs",
    response_model=ResearchRunRead,
    status_code=status.HTTP_201_CREATED,
)
def create_research_run(
    project_id: UUID,
    startup: StartupStressTestV2Request,
    user: CurrentUser,
    session: SessionDependency,
) -> ResearchRunRead:
    try:
        run = _service(session, user.user_id).create_run(
            project_id,
            startup.model_dump(mode="json"),
        )
    except ResourceNotFoundError as exc:
        raise _not_found(exc) from exc
    return ResearchRunRead.model_validate(run)


@router.get("/projects/{project_id}/runs", response_model=list[ResearchRunRead])
def list_research_runs(
    project_id: UUID,
    user: CurrentUser,
    session: SessionDependency,
) -> list[ResearchRunRead]:
    try:
        runs = _service(session, user.user_id).list_runs(project_id)
    except ResourceNotFoundError as exc:
        raise _not_found(exc) from exc
    return [ResearchRunRead.model_validate(run) for run in runs]


@router.post("/runs/stream")
def stream_persisted_research_run_by_project(
    request: PersistedStreamByProjectRequest,
    user: CurrentUser,
    session: SessionDependency,
) -> StreamingResponse:
    try:
        run = _service(session, user.user_id).create_run(
            request.project_id,
            request.startup.model_dump(mode="json"),
        )
    except ResourceNotFoundError as exc:
        raise _not_found(exc) from exc

    return StreamingResponse(
        _persisted_stream(
            project_id=request.project_id,
            run_id=run.id,
            user_id=user.user_id,
            startup=request.startup,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
            "x-vercel-ai-ui-message-stream": "v1",
            "x-scout-run-id": str(run.id),
        },
    )


@router.get("/runs/{run_id}", response_model=ResearchRunRead)
def get_research_run(
    run_id: UUID,
    user: CurrentUser,
    session: SessionDependency,
) -> ResearchRunRead:
    try:
        run = _service(session, user.user_id).get_run(run_id)
    except ResourceNotFoundError as exc:
        raise _not_found(exc) from exc
    return ResearchRunRead.model_validate(run)


@router.post("/runs/{run_id}/cancel", response_model=ResearchRunRead)
def cancel_research_run(
    run_id: UUID,
    user: CurrentUser,
    session: SessionDependency,
) -> ResearchRunRead:
    try:
        run = _service(session, user.user_id).cancel_run(run_id)
    except ResourceNotFoundError as exc:
        raise _not_found(exc) from exc
    except InvalidRunStateError as exc:
        raise _conflict(exc) from exc
    return ResearchRunRead.model_validate(run)


@router.get("/runs/{run_id}/events", response_model=list[StreamEventRead])
def list_run_events(
    run_id: UUID,
    user: CurrentUser,
    session: SessionDependency,
    after: int = Query(default=0, ge=0),
) -> list[StreamEventRead]:
    try:
        events = _service(session, user.user_id).list_events(run_id, after=after)
    except ResourceNotFoundError as exc:
        raise _not_found(exc) from exc
    return [StreamEventRead.model_validate(event) for event in events]


@router.get(
    "/projects/{project_id}/reports",
    response_model=list[ReportArtifactRead],
)
def list_report_artifacts(
    project_id: UUID,
    user: CurrentUser,
    session: SessionDependency,
) -> list[ReportArtifactRead]:
    try:
        reports = _service(session, user.user_id).list_reports(project_id)
    except ResourceNotFoundError as exc:
        raise _not_found(exc) from exc
    return [ReportArtifactRead.model_validate(report) for report in reports]


def _with_service(user_id: str, operation: Any) -> Any:
    session_factory = get_session_factory()
    with session_factory() as session:
        return operation(PersistenceService(session, user_id))


async def _persisted_stream(
    *,
    project_id: UUID,
    run_id: UUID,
    user_id: str,
    startup: StartupStressTestV2Request,
):
    formatter = UIMessageStreamFormatter()
    sequence = 0
    terminal = False

    async def apply(operation: Any) -> Any:
        return await to_thread.run_sync(partial(_with_service, user_id, operation))

    async def persist(event: dict[str, Any]) -> None:
        nonlocal sequence
        sequence += 1
        await apply(
            lambda service: service.append_event(
                run_id,
                sequence=sequence,
                event_type=str(event.get("type") or "unknown"),
                payload=event,
            )
        )

    await apply(lambda service: service.start_run(run_id))
    persisted = {
        "type": "run_persisted",
        "run_id": str(run_id),
        "project_id": str(project_id),
    }
    await persist(persisted)
    for part in formatter.translate(persisted):
        yield encode_sse(part)

    try:
        async for event in stream_startup_stress_test_v2(startup):
            await persist(event)
            if event.get("type") == "run_end":
                report_payload = dict(event.get("report") or {})
                markdown_report = str(report_payload.pop("markdown_report", ""))
                await apply(
                    lambda service: service.complete_run(
                        run_id,
                        report_payload=report_payload,
                        markdown_report=markdown_report,
                        model_metadata={
                            "specialist_model": os.getenv("GROQ_SPECIALIST_MODEL", ""),
                            "synthesis_model": os.getenv("GROQ_SYNTHESIS_MODEL", ""),
                        },
                    )
                )
                terminal = True
            elif event.get("type") == "error":
                await apply(
                    lambda service: service.fail_run(
                        run_id,
                        str(event.get("message") or "Research failed."),
                    )
                )
                terminal = True

            for part in formatter.translate(event):
                yield encode_sse(part)
    except asyncio.CancelledError:
        if not terminal:
            try:
                await apply(lambda service: service.cancel_run(run_id))
            except (InvalidRunStateError, ResourceNotFoundError):
                pass
        raise
    except Exception as exc:
        if not terminal:
            try:
                await apply(lambda service: service.fail_run(run_id, str(exc)))
            except (InvalidRunStateError, ResourceNotFoundError):
                pass
        error_event = {"type": "error", "message": "Research run failed."}
        for part in formatter.translate(error_event):
            yield encode_sse(part)

    yield "data: [DONE]\n\n"


@router.post("/projects/{project_id}/runs/stream")
def stream_persisted_research_run(
    project_id: UUID,
    request: PersistedStreamRequest,
    user: CurrentUser,
    session: SessionDependency,
) -> StreamingResponse:
    try:
        run = _service(session, user.user_id).create_run(
            project_id,
            request.startup.model_dump(mode="json"),
        )
    except ResourceNotFoundError as exc:
        raise _not_found(exc) from exc

    return StreamingResponse(
        _persisted_stream(
            project_id=project_id,
            run_id=run.id,
            user_id=user.user_id,
            startup=request.startup,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
            "x-vercel-ai-ui-message-stream": "v1",
            "x-scout-run-id": str(run.id),
        },
    )
