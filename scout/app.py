from __future__ import annotations

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from scout.api.legacy import router as legacy_router
from scout.api.persisted import router as persisted_router
from scout.core.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    application = FastAPI(
        title="Scout API",
        version="1.0.0",
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.frontend_origins),
        allow_credentials=False,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
        expose_headers=["x-scout-run-id", "x-vercel-ai-ui-message-stream"],
    )
    application.include_router(legacy_router)
    application.include_router(persisted_router)
    return application


app = create_app()
