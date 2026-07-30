from __future__ import annotations

from functools import lru_cache
from typing import Annotated, Any

from clerk_backend_api import Clerk
from clerk_backend_api.security.types import AuthenticateRequestOptions
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from scout.core.config import get_settings


class AuthenticatedUser(BaseModel):
    user_id: str
    session_id: str | None = None
    organization_id: str | None = None
    claims: dict[str, Any]


_bearer = HTTPBearer(auto_error=False)


@lru_cache(maxsize=1)
def _clerk_client(secret_key: str) -> Clerk:
    return Clerk(bearer_auth=secret_key)


def get_current_user(
    request: Request,
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(_bearer),
    ],
) -> AuthenticatedUser:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    settings = get_settings()
    try:
        client = _clerk_client(settings.require_clerk_secret_key())
        request_state = client.authenticate_request(
            request,
            AuthenticateRequestOptions(
                jwt_key=settings.clerk_jwt_key,
                audience=settings.clerk_audience,
                authorized_parties=list(settings.clerk_authorized_parties) or None,
                accepts_token=["session_token"],
            ),
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    payload = request_state.payload or {}
    user_id = payload.get("sub")
    if not request_state.is_signed_in or not isinstance(user_id, str) or not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return AuthenticatedUser(
        user_id=user_id,
        session_id=payload.get("sid") if isinstance(payload.get("sid"), str) else None,
        organization_id=(
            payload.get("org_id") if isinstance(payload.get("org_id"), str) else None
        ),
        claims=payload,
    )


CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]
