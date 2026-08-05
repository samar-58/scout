from __future__ import annotations

import asyncio
import logging
import os
from collections.abc import Callable
from datetime import timedelta
from typing import Any
from uuid import UUID

import inngest

from scout.core.config import get_settings
from scout.persistence.database import get_session_factory
from scout.persistence.service import InvalidRunStateError, PersistenceService
from scout.research.startup_graph import (
    SSE_REPORT_CHUNK_SIZE,
    V2_AGENT_IDS,
    execute_startup_v2_stage,
)

RESEARCH_REQUESTED_EVENT = "scout/research.requested"
RESEARCH_CANCELLED_EVENT = "scout/research.cancelled"
SYNTHESIS_STAGE = "synthesizer"

settings = get_settings()
if os.getenv("VERCEL") and (
    not settings.inngest_event_key or not settings.inngest_signing_key
):
    raise RuntimeError(
        "INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY are required on Vercel."
    )

inngest_client = inngest.Inngest(
    app_id=settings.inngest_app_id,
    event_key=settings.inngest_event_key,
    signing_key=settings.inngest_signing_key,
    is_production=(
        settings.inngest_signing_key is not None
        and os.getenv("INNGEST_DEV") is None
    ),
    logger=logging.getLogger("uvicorn.error"),
)


def _with_service(owner_id: str, operation: Callable[[PersistenceService], Any]) -> Any:
    with get_session_factory()() as session:
        return operation(PersistenceService(session, owner_id))


def _run_snapshot(run_id: UUID, owner_id: str) -> tuple[str, dict[str, Any]]:
    def load(service: PersistenceService) -> tuple[str, dict[str, Any]]:
        run = service.get_run(run_id)
        return run.status, {
            **run.request_payload,
            **(run.checkpoint_payload or {}),
        }

    return _with_service(owner_id, load)


def _stage_already_complete(state: dict[str, Any], stage: str) -> bool:
    if stage == "evidence":
        return bool(
            state.get("evidence")
            and state.get("evidence_sections")
            and state.get("sources")
        )
    if stage == SYNTHESIS_STAGE:
        return False
    return stage in state.get("agent_outputs", {})


def _ensure_executable(status: str) -> None:
    if status == "completed":
        return
    if status != "running":
        raise inngest.NonRetriableError(
            f"Research run is no longer executable because it is '{status}'."
        )


def _begin_run(run_id: str, owner_id: str, resumed: bool) -> dict[str, Any]:
    run_uuid = UUID(run_id)
    run = _with_service(
        owner_id,
        lambda service: service.begin_background_run(run_uuid, resumed=resumed),
    )
    return {"run_id": str(run.id), "status": run.status}


def _execute_stage(run_id: str, owner_id: str, stage: str) -> dict[str, Any]:
    run_uuid = UUID(run_id)
    status, state = _run_snapshot(run_uuid, owner_id)
    if status == "completed":
        return {"stage": stage, "status": "already-completed"}
    _ensure_executable(status)
    if _stage_already_complete(state, stage):
        return {"stage": stage, "status": "restored"}

    update, events = execute_startup_v2_stage(state, stage)
    _with_service(
        owner_id,
        lambda service: service.commit_background_stage(
            run_uuid,
            stage=stage,
            update=update,
            events=events,
        ),
    )
    return {"stage": stage, "status": "completed"}


def _terminal_events(report: dict[str, Any], stage_events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    events = list(stage_events)
    events.append(
        {
            "type": "score",
            "scores": dict(report.get("scores") or {}),
            "score_explanation": str(report.get("score_explanation") or ""),
        }
    )
    for index, source in enumerate(report.get("sources") or [], start=1):
        events.append({"type": "source", "index": index, "source": source})
    markdown = str(report.get("markdown_report") or "")
    for start in range(0, len(markdown), SSE_REPORT_CHUNK_SIZE):
        events.append(
            {
                "type": "report_delta",
                "delta": markdown[start : start + SSE_REPORT_CHUNK_SIZE],
            }
        )
    events.append(
        {
            "type": "run_end",
            "report": report,
        }
    )
    return events


def _execute_synthesis(run_id: str, owner_id: str) -> dict[str, Any]:
    run_uuid = UUID(run_id)
    status, state = _run_snapshot(run_uuid, owner_id)
    if status == "completed":
        return {"stage": SYNTHESIS_STAGE, "status": "already-completed"}
    _ensure_executable(status)

    update, stage_events = execute_startup_v2_stage(state, SYNTHESIS_STAGE)
    report = dict(update.get("final_report") or {})
    if not report:
        raise RuntimeError("Synthesis completed without a final report.")
    markdown = str(report.get("markdown_report") or "")
    report_payload = dict(report)
    report_payload.pop("markdown_report", None)
    _with_service(
        owner_id,
        lambda service: service.complete_background_run(
            run_uuid,
            report_payload=report_payload,
            markdown_report=markdown,
            events=_terminal_events(report, stage_events),
            model_metadata={
                "specialist_model": os.getenv("GROQ_SPECIALIST_MODEL", ""),
                "synthesis_model": os.getenv("GROQ_SYNTHESIS_MODEL", ""),
                "orchestrator": "inngest",
            },
        ),
    )
    return {"stage": SYNTHESIS_STAGE, "status": "completed"}


async def _begin_run_async(run_id: str, owner_id: str, resumed: bool) -> dict[str, Any]:
    return await asyncio.to_thread(_begin_run, run_id, owner_id, resumed)


async def _execute_stage_async(run_id: str, owner_id: str, stage: str) -> dict[str, Any]:
    return await asyncio.to_thread(_execute_stage, run_id, owner_id, stage)


async def _execute_synthesis_async(run_id: str, owner_id: str) -> dict[str, Any]:
    return await asyncio.to_thread(_execute_synthesis, run_id, owner_id)


def _failure_run_data(ctx: inngest.Context) -> tuple[str | None, str | None, str]:
    data = dict(ctx.event.data or {})
    original = data.get("event")
    original_data = (
        dict(original.get("data") or {}) if isinstance(original, dict) else {}
    )
    run_id = original_data.get("run_id") or data.get("run_id")
    owner_id = original_data.get("owner_id") or data.get("owner_id")
    error = data.get("error")
    if isinstance(error, dict):
        message = str(error.get("message") or "Durable research workflow failed.")
    else:
        message = str(error or "Durable research workflow failed.")
    return (
        str(run_id) if run_id else None,
        str(owner_id) if owner_id else None,
        message,
    )


async def _on_research_failure(ctx: inngest.Context) -> None:
    run_id, owner_id, message = _failure_run_data(ctx)
    if not run_id or not owner_id:
        ctx.logger.error("Inngest failure event did not include Scout run ownership data.")
        return
    await asyncio.to_thread(
        _with_service,
        owner_id,
        lambda service: service.fail_background_run(UUID(run_id), message),
    )


async def durable_startup_research_handler(ctx: inngest.Context) -> dict[str, Any]:
    data = dict(ctx.event.data or {})
    run_id = str(data["run_id"])
    owner_id = str(data["owner_id"])
    resumed = bool(data.get("resumed"))

    await ctx.step.run(
        "begin-run",
        _begin_run_async,
        run_id,
        owner_id,
        resumed,
    )
    await ctx.step.run(
        "collect-evidence",
        _execute_stage_async,
        run_id,
        owner_id,
        "evidence",
    )

    specialist_steps = tuple(
        (
            lambda agent_id=agent_id: ctx.step.run(
                f"specialist-{agent_id}",
                _execute_stage_async,
                run_id,
                owner_id,
                agent_id,
            )
        )
        for agent_id in V2_AGENT_IDS
    )
    await ctx.group.parallel(specialist_steps)
    await ctx.step.run(
        "synthesize-report",
        _execute_synthesis_async,
        run_id,
        owner_id,
    )
    return {"run_id": run_id, "status": "completed"}


durable_startup_research = inngest_client.create_function(
    fn_id="durable-startup-research",
    name="Durable startup research",
    trigger=inngest.TriggerEvent(event=RESEARCH_REQUESTED_EVENT),
    idempotency="event.data.dispatch_id",
    singleton=inngest.Singleton(key="event.data.run_id", mode="skip"),
    concurrency=[inngest.Concurrency(limit=5)],
    cancel=[
        inngest.Cancel(
            event=RESEARCH_CANCELLED_EVENT,
            if_exp="event.data.run_id == async.data.run_id",
        )
    ],
    retries=2,
    timeouts=inngest.Timeouts(finish=timedelta(minutes=30)),
    on_failure=_on_research_failure,
)(durable_startup_research_handler)


async def dispatch_research_run(
    *,
    run_id: UUID,
    owner_id: str,
    resume_count: int,
    resumed: bool | None = None,
) -> list[str]:
    dispatch_id = f"{run_id}:{resume_count}"
    return await inngest_client.send(
        inngest.Event(
            id=dispatch_id,
            name=RESEARCH_REQUESTED_EVENT,
            data={
                "dispatch_id": dispatch_id,
                "run_id": str(run_id),
                "owner_id": owner_id,
                "resume_count": resume_count,
                "resumed": resume_count > 0 if resumed is None else resumed,
            },
        )
    )


async def dispatch_run_cancellation(
    *,
    run_id: UUID,
    owner_id: str,
    resume_count: int,
) -> list[str]:
    return await inngest_client.send(
        inngest.Event(
            id=f"cancel:{run_id}:{resume_count}",
            name=RESEARCH_CANCELLED_EVENT,
            data={"run_id": str(run_id), "owner_id": owner_id},
        )
    )


INNGEST_FUNCTIONS = [durable_startup_research]
