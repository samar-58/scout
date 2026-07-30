"""Create projects, research runs, report artifacts, and stream events.

Revision ID: 20260730_0001
Revises:
Create Date: 2026-07-30
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260730_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

json_value = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def upgrade() -> None:
    op.create_table(
        "projects",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("owner_id", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("idea", sa.Text(), nullable=False),
        sa.Column("startup_context", json_value, nullable=False),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_projects")),
    )
    op.create_index(op.f("ix_projects_owner_id"), "projects", ["owner_id"])

    op.create_table(
        "research_runs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("owner_id", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("request_payload", json_value, nullable=False),
        sa.Column("report_payload", json_value, nullable=True),
        sa.Column("markdown_report", sa.Text(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('queued','running','completed','failed','cancelled')",
            name=op.f("ck_research_runs_status"),
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            name=op.f("fk_research_runs_project_id_projects"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_research_runs")),
    )
    op.create_index(op.f("ix_research_runs_owner_id"), "research_runs", ["owner_id"])
    op.create_index(
        "ix_research_runs_project_created",
        "research_runs",
        ["project_id", "created_at"],
    )

    op.create_table(
        "report_artifacts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("run_id", sa.Uuid(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("schema_version", sa.String(length=50), nullable=False),
        sa.Column("payload", json_value, nullable=False),
        sa.Column("markdown_report", sa.Text(), nullable=False),
        sa.Column("model_metadata", json_value, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            name=op.f("fk_report_artifacts_project_id_projects"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["run_id"],
            ["research_runs.id"],
            name=op.f("fk_report_artifacts_run_id_research_runs"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_report_artifacts")),
        sa.UniqueConstraint("project_id", "version", name="uq_report_artifacts_project_version"),
        sa.UniqueConstraint("run_id", name="uq_report_artifacts_run"),
    )

    op.create_table(
        "stream_events",
        sa.Column(
            "id",
            sa.BigInteger().with_variant(sa.Integer(), "sqlite"),
            autoincrement=True,
            nullable=False,
        ),
        sa.Column("run_id", sa.Uuid(), nullable=False),
        sa.Column("sequence", sa.Integer(), nullable=False),
        sa.Column("event_type", sa.String(length=50), nullable=False),
        sa.Column("payload", json_value, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["run_id"],
            ["research_runs.id"],
            name=op.f("fk_stream_events_run_id_research_runs"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_stream_events")),
        sa.UniqueConstraint("run_id", "sequence", name="uq_stream_events_run_sequence"),
    )
    op.create_index(
        "ix_stream_events_run_sequence",
        "stream_events",
        ["run_id", "sequence"],
    )


def downgrade() -> None:
    op.drop_index("ix_stream_events_run_sequence", table_name="stream_events")
    op.drop_table("stream_events")
    op.drop_table("report_artifacts")
    op.drop_index("ix_research_runs_project_created", table_name="research_runs")
    op.drop_index(op.f("ix_research_runs_owner_id"), table_name="research_runs")
    op.drop_table("research_runs")
    op.drop_index(op.f("ix_projects_owner_id"), table_name="projects")
    op.drop_table("projects")
