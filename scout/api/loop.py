"""Authenticated APIs for the evidence-to-decision loop.

Route handlers stay thin: the persistence service owns ownership checks and
state transitions, and the AI workflows only ever return proposals that this
layer validates before committing.
"""

import logging
from typing import Annotated
from uuid import UUID

from anyio import to_thread
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from scout.core.auth import CurrentUser
from scout.persistence.database import get_db_session
from scout.persistence.schemas import (
    AssumptionRead,
    AssumptionReview,
    ClaimRead,
    DecisionConfirm,
    DecisionRead,
    DecisionReject,
    EvidenceRead,
    ExperimentRead,
    ExperimentReviewRead,
    ExperimentUpdate,
    ObservationCreate,
    ObservationRead,
    SprintRequest,
    ThesisVersionRead,
    TimelineEntry,
)
from scout.persistence.service import (
    InvalidRunStateError,
    PersistenceService,
    ResourceNotFoundError,
)
from scout.research.loop_workflows import (
    REVIEW_PROMPT_VERSION,
    SPRINT_PROMPT_VERSION,
    propose_validation_sprint,
    review_experiment_results,
)

logger = logging.getLogger("uvicorn.error")
router = APIRouter(prefix="/api", tags=["loop"])
SessionDependency = Annotated[Session, Depends(get_db_session)]


def _service(session: Session, user_id: str) -> PersistenceService:
    return PersistenceService(session, user_id)


def _not_found(exc: ResourceNotFoundError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


def _conflict(exc: InvalidRunStateError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))


def _unavailable(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=detail)


@router.get("/projects/{project_id}/assumptions", response_model=list[AssumptionRead])
def list_assumptions(
    project_id: UUID,
    user: CurrentUser,
    session: SessionDependency,
) -> list[AssumptionRead]:
    try:
        assumptions = _service(session, user.user_id).list_assumptions(project_id)
    except ResourceNotFoundError as exc:
        raise _not_found(exc) from exc
    return [AssumptionRead.model_validate(item) for item in assumptions]


@router.patch("/assumptions/{assumption_id}", response_model=AssumptionRead)
def review_assumption(
    assumption_id: UUID,
    data: AssumptionReview,
    user: CurrentUser,
    session: SessionDependency,
) -> AssumptionRead:
    try:
        assumption = _service(session, user.user_id).review_assumption(
            assumption_id,
            **data.model_dump(exclude_unset=True),
        )
    except ResourceNotFoundError as exc:
        raise _not_found(exc) from exc
    return AssumptionRead.model_validate(assumption)


@router.get("/projects/{project_id}/claims", response_model=list[ClaimRead])
def list_claims(
    project_id: UUID,
    user: CurrentUser,
    session: SessionDependency,
) -> list[ClaimRead]:
    try:
        claims = _service(session, user.user_id).list_claims(project_id)
    except ResourceNotFoundError as exc:
        raise _not_found(exc) from exc
    return [ClaimRead.model_validate(claim) for claim in claims]


@router.get("/projects/{project_id}/evidence", response_model=list[EvidenceRead])
def list_evidence(
    project_id: UUID,
    user: CurrentUser,
    session: SessionDependency,
) -> list[EvidenceRead]:
    try:
        records = _service(session, user.user_id).list_evidence(project_id)
    except ResourceNotFoundError as exc:
        raise _not_found(exc) from exc
    return [EvidenceRead.model_validate(record) for record in records]


@router.get("/projects/{project_id}/experiments", response_model=list[ExperimentRead])
def list_experiments(
    project_id: UUID,
    user: CurrentUser,
    session: SessionDependency,
) -> list[ExperimentRead]:
    try:
        experiments = _service(session, user.user_id).list_experiments(project_id)
    except ResourceNotFoundError as exc:
        raise _not_found(exc) from exc
    return [ExperimentRead.model_validate(item) for item in experiments]


@router.post(
    "/projects/{project_id}/sprint",
    response_model=list[ExperimentRead],
    status_code=status.HTTP_201_CREATED,
)
async def build_validation_sprint(
    project_id: UUID,
    data: SprintRequest,
    user: CurrentUser,
    session: SessionDependency,
) -> list[ExperimentRead]:
    """Turn the riskiest accepted assumptions into planned experiments.

    The model proposes; this route maps each proposal back to an owned
    assumption by index and the service commits the result.
    """
    service = _service(session, user.user_id)
    try:
        project = service.get_project(project_id)
        assumptions = service.list_assumptions(project_id)
    except ResourceNotFoundError as exc:
        raise _not_found(exc) from exc

    if data.assumption_ids:
        wanted = {assumption_id for assumption_id in data.assumption_ids}
        selected = [item for item in assumptions if item.id in wanted]
    else:
        selected = [
            item
            for item in assumptions
            if item.review_state in {"proposed", "accepted", "edited"}
            and item.status in {"untested", "testing", "inconclusive"}
        ][:3]

    if not selected:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Accept at least one open assumption before building a sprint.",
        )

    thesis = service.latest_thesis(project_id)
    snapshot = [
        {
            "statement": item.statement,
            "category": item.category,
            "why_it_matters": item.why_it_matters,
        }
        for item in selected
    ]

    try:
        proposal = await to_thread.run_sync(
            lambda: propose_validation_sprint(
                idea=project.idea,
                thesis=thesis.fields if thesis is not None else None,
                assumptions=snapshot,
            )
        )
    except Exception as exc:
        logger.exception("Validation sprint generation failed")
        raise _unavailable(
            "Scout could not build a validation sprint right now. Please try again."
        ) from exc

    payloads = []
    for item in proposal.experiments:
        index = item.assumption_index - 1
        if index < 0 or index >= len(selected):
            continue
        payloads.append(
            {
                "assumption_ids": [selected[index].id],
                "name": item.name,
                "goal": item.goal,
                "method": item.method,
                "channel": item.channel,
                "target_participant": item.target_participant,
                "script": item.script,
                "success_metric": item.success_metric,
                "success_threshold": item.success_threshold,
                "failure_threshold": item.failure_threshold,
                "estimated_time": item.estimated_time,
                "estimated_cost": item.estimated_cost,
                "status": "planned",
            }
        )

    if not payloads:
        raise _unavailable("Scout returned a sprint that referenced unknown assumptions.")

    created = service.create_sprint_experiments(
        project_id,
        experiments=payloads,
        provenance={
            "prompt_version": SPRINT_PROMPT_VERSION,
            "focus": proposal.focus,
            "testing_order_rationale": proposal.testing_order_rationale,
        },
    )
    return [ExperimentRead.model_validate(item) for item in created]


@router.patch("/experiments/{experiment_id}", response_model=ExperimentRead)
def update_experiment(
    experiment_id: UUID,
    data: ExperimentUpdate,
    user: CurrentUser,
    session: SessionDependency,
) -> ExperimentRead:
    payload = data.model_dump(exclude_unset=True)
    new_status = payload.pop("status", None)
    try:
        experiment = _service(session, user.user_id).update_experiment(
            experiment_id,
            status=new_status,
            fields=payload,
        )
    except ResourceNotFoundError as exc:
        raise _not_found(exc) from exc
    except InvalidRunStateError as exc:
        raise _conflict(exc) from exc
    return ExperimentRead.model_validate(experiment)


@router.get(
    "/experiments/{experiment_id}/observations",
    response_model=list[ObservationRead],
)
def list_observations(
    experiment_id: UUID,
    user: CurrentUser,
    session: SessionDependency,
) -> list[ObservationRead]:
    try:
        observations = _service(session, user.user_id).list_observations(experiment_id)
    except ResourceNotFoundError as exc:
        raise _not_found(exc) from exc
    return [ObservationRead.model_validate(item) for item in observations]


@router.post(
    "/experiments/{experiment_id}/observations",
    response_model=ObservationRead,
    status_code=status.HTTP_201_CREATED,
)
def add_observation(
    experiment_id: UUID,
    data: ObservationCreate,
    user: CurrentUser,
    session: SessionDependency,
) -> ObservationRead:
    try:
        observation = _service(session, user.user_id).add_observation(
            experiment_id,
            **data.model_dump(),
        )
    except ResourceNotFoundError as exc:
        raise _not_found(exc) from exc
    return ObservationRead.model_validate(observation)


@router.post(
    "/experiments/{experiment_id}/review",
    response_model=ExperimentReviewRead,
    status_code=status.HTTP_201_CREATED,
)
async def review_experiment(
    experiment_id: UUID,
    user: CurrentUser,
    session: SessionDependency,
) -> ExperimentReviewRead:
    """Review recorded observations and propose a decision for confirmation."""
    service = _service(session, user.user_id)
    try:
        experiment = service.get_experiment(experiment_id)
        project = service.get_project(experiment.project_id)
        observations = service.list_observations(experiment_id)
    except ResourceNotFoundError as exc:
        raise _not_found(exc) from exc

    if not observations:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Record at least one observation before requesting a review.",
        )

    thesis = service.latest_thesis(experiment.project_id)
    experiment_snapshot = {
        "name": experiment.name,
        "goal": experiment.goal,
        "method": experiment.method,
        "success_metric": experiment.success_metric,
        "success_threshold": experiment.success_threshold,
        "failure_threshold": experiment.failure_threshold,
    }
    assumption_snapshot = [
        {"statement": item.statement, "category": item.category}
        for item in experiment.assumptions
    ]
    observation_snapshot = [
        {
            "kind": item.kind,
            "text": item.text,
            "numeric_value": item.numeric_value,
            "participant_count": item.participant_count,
        }
        for item in observations
    ]

    try:
        proposal = await to_thread.run_sync(
            lambda: review_experiment_results(
                idea=project.idea,
                experiment=experiment_snapshot,
                assumptions=assumption_snapshot,
                observations=observation_snapshot,
                thesis=thesis.fields if thesis is not None else None,
            )
        )
    except Exception as exc:
        logger.exception("Experiment review failed")
        raise _unavailable(
            "Scout could not review this experiment right now. Your observations are saved."
        ) from exc

    review_payload = proposal.model_dump(mode="json")
    reviewed = service.record_experiment_result(
        experiment_id,
        result=proposal.result,
        result_summary=proposal.result_summary,
        review_payload={**review_payload, "prompt_version": REVIEW_PROMPT_VERSION},
    )
    decision = service.create_decision(
        experiment.project_id,
        proposal=proposal.decision_proposal,
        kind="thesis_change" if proposal.thesis_changes else "no_change",
        rationale=proposal.decision_rationale,
        supporting_evidence=list(proposal.supporting_evidence),
        contradicting_evidence=list(proposal.contradicting_evidence),
        confidence=proposal.confidence,
        reversal_conditions=proposal.reversal_conditions,
        thesis_changes={
            change.field: change.new_value for change in proposal.thesis_changes
        },
        experiment_id=experiment_id,
        assumption_id=(
            experiment.assumptions[0].id if experiment.assumptions else None
        ),
        provenance={
            "prompt_version": REVIEW_PROMPT_VERSION,
            "evidence_quality": proposal.evidence_quality,
            "evidence_quality_reason": proposal.evidence_quality_reason,
            "recommended_next_action": proposal.recommended_next_action,
        },
    )
    return ExperimentReviewRead(
        experiment=ExperimentRead.model_validate(reviewed),
        decision=DecisionRead.from_decision(decision),
        evidence_quality=proposal.evidence_quality,
        recommended_next_action=proposal.recommended_next_action,
    )


@router.get("/projects/{project_id}/decisions", response_model=list[DecisionRead])
def list_decisions(
    project_id: UUID,
    user: CurrentUser,
    session: SessionDependency,
) -> list[DecisionRead]:
    try:
        decisions = _service(session, user.user_id).list_decisions(project_id)
    except ResourceNotFoundError as exc:
        raise _not_found(exc) from exc
    return [DecisionRead.from_decision(item) for item in decisions]


@router.post("/decisions/{decision_id}/confirm", response_model=DecisionRead)
def confirm_decision(
    decision_id: UUID,
    data: DecisionConfirm,
    user: CurrentUser,
    session: SessionDependency,
) -> DecisionRead:
    try:
        decision, _version = _service(session, user.user_id).confirm_decision(
            decision_id,
            thesis_changes=data.thesis_changes,
            change_note=data.change_note,
        )
    except ResourceNotFoundError as exc:
        raise _not_found(exc) from exc
    except InvalidRunStateError as exc:
        raise _conflict(exc) from exc
    return DecisionRead.from_decision(decision)


@router.post("/decisions/{decision_id}/reject", response_model=DecisionRead)
def reject_decision(
    decision_id: UUID,
    data: DecisionReject,
    user: CurrentUser,
    session: SessionDependency,
) -> DecisionRead:
    try:
        decision = _service(session, user.user_id).reject_decision(
            decision_id,
            note=data.note,
        )
    except ResourceNotFoundError as exc:
        raise _not_found(exc) from exc
    except InvalidRunStateError as exc:
        raise _conflict(exc) from exc
    return DecisionRead.from_decision(decision)


@router.get("/projects/{project_id}/thesis", response_model=list[ThesisVersionRead])
def list_thesis_versions(
    project_id: UUID,
    user: CurrentUser,
    session: SessionDependency,
) -> list[ThesisVersionRead]:
    try:
        versions = _service(session, user.user_id).list_thesis_versions(project_id)
    except ResourceNotFoundError as exc:
        raise _not_found(exc) from exc
    return [ThesisVersionRead.model_validate(item) for item in versions]


@router.get("/projects/{project_id}/timeline", response_model=list[TimelineEntry])
def project_timeline(
    project_id: UUID,
    user: CurrentUser,
    session: SessionDependency,
) -> list[TimelineEntry]:
    try:
        entries = _service(session, user.user_id).project_timeline(project_id)
    except ResourceNotFoundError as exc:
        raise _not_found(exc) from exc
    return [TimelineEntry.model_validate(entry) for entry in entries]
