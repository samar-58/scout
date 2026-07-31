import logging

from fastapi import APIRouter, HTTPException, status

from scout.core.auth import CurrentUser
from scout.research.startup_extraction import (
    StartupBriefExtraction,
    StartupBriefExtractionRequest,
    extract_startup_brief,
)

logger = logging.getLogger("uvicorn.error")
router = APIRouter(prefix="/api/startup", tags=["authenticated"])


@router.post("/extract", response_model=StartupBriefExtraction)
def extract_startup_context(
    request: StartupBriefExtractionRequest,
    user: CurrentUser,
) -> StartupBriefExtraction:
    # Authentication is intentionally required because this endpoint consumes
    # model capacity. The extracted context is not persisted until a run starts.
    del user
    try:
        return extract_startup_brief(request.text)
    except Exception as exc:
        logger.exception("Startup brief extraction failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Scout could not extract that brief right now. "
                "The pasted text is still available to edit manually."
            ),
        ) from exc
