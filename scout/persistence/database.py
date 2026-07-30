from __future__ import annotations

from collections.abc import Generator
from functools import lru_cache

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from scout.core.config import get_settings


def normalize_database_url(url: str) -> str:
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url.removeprefix("postgres://")
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url.removeprefix("postgresql://")
    return url


def create_database_engine(url: str) -> Engine:
    normalized = normalize_database_url(url)
    kwargs: dict[str, object] = {"pool_pre_ping": True}
    if normalized in {"sqlite://", "sqlite:///:memory:"}:
        kwargs.update(
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
    elif normalized.startswith("sqlite:"):
        kwargs["connect_args"] = {"check_same_thread": False}
    return create_engine(normalized, **kwargs)


@lru_cache(maxsize=1)
def get_engine() -> Engine:
    return create_database_engine(get_settings().require_database_url())


@lru_cache(maxsize=1)
def get_session_factory() -> sessionmaker[Session]:
    return sessionmaker(bind=get_engine(), expire_on_commit=False)


def get_db_session() -> Generator[Session, None, None]:
    session = get_session_factory()()
    try:
        yield session
    finally:
        session.close()
