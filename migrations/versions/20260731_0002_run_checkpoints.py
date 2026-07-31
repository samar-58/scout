"""Add resumable graph checkpoints to research runs.

Revision ID: 20260731_0002
Revises: 20260730_0001
Create Date: 2026-07-31
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260731_0002"
down_revision: str | None = "20260730_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

json_value = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def upgrade() -> None:
    op.add_column(
        "research_runs",
        sa.Column("checkpoint_payload", json_value, nullable=True),
    )
    op.add_column(
        "research_runs",
        sa.Column("checkpoint_stage", sa.String(length=50), nullable=True),
    )
    op.add_column(
        "research_runs",
        sa.Column(
            "resume_count",
            sa.Integer(),
            server_default=sa.text("0"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("research_runs", "resume_count")
    op.drop_column("research_runs", "checkpoint_stage")
    op.drop_column("research_runs", "checkpoint_payload")
