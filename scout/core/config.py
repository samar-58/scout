from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[2]
ROOT_ENV_FILE = PROJECT_ROOT / ".env"


@lru_cache(maxsize=1)
def load_environment() -> bool:
    """Load only the repository-root dotenv without overriding real env vars."""
    return load_dotenv(dotenv_path=ROOT_ENV_FILE, override=False)


load_environment()


def _csv_env(name: str, default: str = "") -> tuple[str, ...]:
    return tuple(
        value.strip().rstrip("/")
        for value in os.getenv(name, default).split(",")
        if value.strip()
    )


@dataclass(frozen=True)
class Settings:
    database_url: str | None
    clerk_secret_key: str | None
    clerk_jwt_key: str | None
    clerk_audience: str | None
    clerk_authorized_parties: tuple[str, ...]
    frontend_origins: tuple[str, ...]
    inngest_event_key: str | None = None
    inngest_signing_key: str | None = None
    inngest_app_id: str = "scout"

    @classmethod
    def from_env(cls) -> "Settings":
        frontend_origins = _csv_env(
            "FRONTEND_ORIGINS",
            "http://localhost:3001,http://127.0.0.1:3001",
        )
        return cls(
            database_url=os.getenv("DATABASE_URL") or None,
            clerk_secret_key=os.getenv("CLERK_SECRET_KEY") or None,
            clerk_jwt_key=os.getenv("CLERK_JWT_KEY") or None,
            clerk_audience=os.getenv("CLERK_AUDIENCE") or None,
            clerk_authorized_parties=_csv_env(
                "CLERK_AUTHORIZED_PARTIES",
                ",".join(frontend_origins),
            ),
            frontend_origins=frontend_origins,
            inngest_event_key=os.getenv("INNGEST_EVENT_KEY") or None,
            inngest_signing_key=os.getenv("INNGEST_SIGNING_KEY") or None,
            inngest_app_id=os.getenv("INNGEST_APP_ID", "scout").strip() or "scout",
        )

    def require_database_url(self) -> str:
        if not self.database_url:
            raise RuntimeError("DATABASE_URL is required for persisted Scout APIs.")
        return self.database_url

    def require_clerk_secret_key(self) -> str:
        if not self.clerk_secret_key:
            raise RuntimeError("CLERK_SECRET_KEY is required for authenticated Scout APIs.")
        return self.clerk_secret_key


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings.from_env()
