"""Evidence-to-decision loop entities.

Revision ID: 20260731_0003
Revises: 20260731_0002
Create Date: 2026-07-31
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260731_0003"
down_revision: str | None = "20260731_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

json_value = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def _timestamps() -> list[sa.Column]:
    return [
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
    ]


def upgrade() -> None:
    op.create_table(
        "claims",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("run_id", sa.Uuid(), nullable=True),
        sa.Column("owner_id", sa.String(length=255), nullable=False),
        sa.Column("stance", sa.String(length=20), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("origin", sa.String(length=120), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "stance IN ('supporting','contradicting','unknown','competitor','pain')",
            name=op.f("ck_claims_stance"),
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            name=op.f("fk_claims_project_id_projects"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["run_id"],
            ["research_runs.id"],
            name=op.f("fk_claims_run_id_research_runs"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_claims")),
    )
    op.create_index(op.f("ix_claims_owner_id"), "claims", ["owner_id"])
    op.create_index("ix_claims_project_stance", "claims", ["project_id", "stance"])

    op.create_table(
        "evidence",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("claim_id", sa.Uuid(), nullable=True),
        sa.Column("run_id", sa.Uuid(), nullable=True),
        sa.Column("owner_id", sa.String(length=255), nullable=False),
        sa.Column("source_url", sa.Text(), nullable=True),
        sa.Column("source_title", sa.Text(), nullable=True),
        sa.Column("snippet", sa.Text(), nullable=True),
        sa.Column("workflow", sa.String(length=120), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["claim_id"],
            ["claims.id"],
            name=op.f("fk_evidence_claim_id_claims"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            name=op.f("fk_evidence_project_id_projects"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["run_id"],
            ["research_runs.id"],
            name=op.f("fk_evidence_run_id_research_runs"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_evidence")),
    )
    op.create_index(op.f("ix_evidence_owner_id"), "evidence", ["owner_id"])
    op.create_index(
        "ix_evidence_project_created",
        "evidence",
        ["project_id", "created_at"],
    )

    op.create_table(
        "assumptions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("run_id", sa.Uuid(), nullable=True),
        sa.Column("owner_id", sa.String(length=255), nullable=False),
        sa.Column("source_key", sa.String(length=120), nullable=True),
        sa.Column("statement", sa.Text(), nullable=False),
        sa.Column("category", sa.String(length=40), nullable=False),
        sa.Column("kind", sa.String(length=20), nullable=False),
        sa.Column("why_it_matters", sa.Text(), nullable=True),
        sa.Column("suggested_response", sa.Text(), nullable=True),
        sa.Column("risk_rank", sa.Integer(), nullable=False),
        sa.Column("confidence", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("review_state", sa.String(length=20), nullable=False),
        sa.Column("founder_note", sa.Text(), nullable=True),
        sa.Column("provenance", json_value, nullable=False),
        *_timestamps(),
        sa.CheckConstraint(
            "status IN ('untested','testing','supported','contradicted','inconclusive')",
            name=op.f("ck_assumptions_status"),
        ),
        sa.CheckConstraint(
            "review_state IN ('proposed','accepted','edited','rejected')",
            name=op.f("ck_assumptions_review_state"),
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            name=op.f("fk_assumptions_project_id_projects"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["run_id"],
            ["research_runs.id"],
            name=op.f("fk_assumptions_run_id_research_runs"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_assumptions")),
        sa.UniqueConstraint("run_id", "source_key", name="uq_assumptions_run_source_key"),
    )
    op.create_index(op.f("ix_assumptions_owner_id"), "assumptions", ["owner_id"])
    op.create_index(
        "ix_assumptions_project_rank",
        "assumptions",
        ["project_id", "risk_rank"],
    )

    op.create_table(
        "experiments",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("run_id", sa.Uuid(), nullable=True),
        sa.Column("owner_id", sa.String(length=255), nullable=False),
        sa.Column("source_key", sa.String(length=120), nullable=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("goal", sa.Text(), nullable=True),
        sa.Column("method", sa.Text(), nullable=True),
        sa.Column("channel", sa.Text(), nullable=True),
        sa.Column("target_participant", sa.Text(), nullable=True),
        sa.Column("script", sa.Text(), nullable=True),
        sa.Column("success_metric", sa.Text(), nullable=True),
        sa.Column("success_threshold", sa.Text(), nullable=True),
        sa.Column("failure_threshold", sa.Text(), nullable=True),
        sa.Column("estimated_time", sa.String(length=120), nullable=True),
        sa.Column("estimated_cost", sa.String(length=120), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("sprint_position", sa.Integer(), nullable=False),
        sa.Column("result", sa.String(length=20), nullable=True),
        sa.Column("result_summary", sa.Text(), nullable=True),
        sa.Column("review_payload", json_value, nullable=True),
        sa.Column("provenance", json_value, nullable=False),
        sa.Column("review_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        *_timestamps(),
        sa.CheckConstraint(
            "status IN ('suggested','planned','running','completed','abandoned')",
            name=op.f("ck_experiments_status"),
        ),
        sa.CheckConstraint(
            "result IS NULL OR result IN ('supported','contradicted','inconclusive')",
            name=op.f("ck_experiments_result"),
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            name=op.f("fk_experiments_project_id_projects"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["run_id"],
            ["research_runs.id"],
            name=op.f("fk_experiments_run_id_research_runs"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_experiments")),
        sa.UniqueConstraint("run_id", "source_key", name="uq_experiments_run_source_key"),
    )
    op.create_index(op.f("ix_experiments_owner_id"), "experiments", ["owner_id"])
    op.create_index(
        "ix_experiments_project_status",
        "experiments",
        ["project_id", "status"],
    )

    op.create_table(
        "experiment_assumptions",
        sa.Column("experiment_id", sa.Uuid(), nullable=False),
        sa.Column("assumption_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(
            ["assumption_id"],
            ["assumptions.id"],
            name=op.f("fk_experiment_assumptions_assumption_id_assumptions"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["experiment_id"],
            ["experiments.id"],
            name=op.f("fk_experiment_assumptions_experiment_id_experiments"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint(
            "experiment_id",
            "assumption_id",
            name=op.f("pk_experiment_assumptions"),
        ),
    )

    op.create_table(
        "experiment_observations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("experiment_id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("owner_id", sa.String(length=255), nullable=False),
        sa.Column("kind", sa.String(length=20), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("numeric_value", sa.Float(), nullable=True),
        sa.Column("participant_count", sa.Integer(), nullable=True),
        sa.Column("source_url", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "kind IN ('metric','quote','note','surprise','constraint')",
            name=op.f("ck_experiment_observations_kind"),
        ),
        sa.ForeignKeyConstraint(
            ["experiment_id"],
            ["experiments.id"],
            name=op.f("fk_experiment_observations_experiment_id_experiments"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            name=op.f("fk_experiment_observations_project_id_projects"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_experiment_observations")),
    )
    op.create_index(
        op.f("ix_experiment_observations_owner_id"),
        "experiment_observations",
        ["owner_id"],
    )
    op.create_index(
        "ix_experiment_observations_experiment",
        "experiment_observations",
        ["experiment_id", "created_at"],
    )

    op.create_table(
        "decisions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("owner_id", sa.String(length=255), nullable=False),
        sa.Column("experiment_id", sa.Uuid(), nullable=True),
        sa.Column("assumption_id", sa.Uuid(), nullable=True),
        sa.Column("kind", sa.String(length=40), nullable=False),
        sa.Column("proposal", sa.Text(), nullable=False),
        sa.Column("rationale", sa.Text(), nullable=True),
        sa.Column("supporting_evidence", json_value, nullable=False),
        sa.Column("contradicting_evidence", json_value, nullable=False),
        sa.Column("confidence", sa.Integer(), nullable=True),
        sa.Column("reversal_conditions", sa.Text(), nullable=True),
        sa.Column("thesis_changes", json_value, nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("provenance", json_value, nullable=False),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('proposed','confirmed','rejected')",
            name=op.f("ck_decisions_status"),
        ),
        sa.ForeignKeyConstraint(
            ["assumption_id"],
            ["assumptions.id"],
            name=op.f("fk_decisions_assumption_id_assumptions"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["experiment_id"],
            ["experiments.id"],
            name=op.f("fk_decisions_experiment_id_experiments"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            name=op.f("fk_decisions_project_id_projects"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_decisions")),
    )
    op.create_index(op.f("ix_decisions_owner_id"), "decisions", ["owner_id"])
    op.create_index(
        "ix_decisions_project_created",
        "decisions",
        ["project_id", "created_at"],
    )

    op.create_table(
        "project_thesis_versions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("owner_id", sa.String(length=255), nullable=False),
        sa.Column("decision_id", sa.Uuid(), nullable=True),
        sa.Column("run_id", sa.Uuid(), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("fields", json_value, nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("change_note", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["decision_id"],
            ["decisions.id"],
            name=op.f("fk_project_thesis_versions_decision_id_decisions"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            name=op.f("fk_project_thesis_versions_project_id_projects"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["run_id"],
            ["research_runs.id"],
            name=op.f("fk_project_thesis_versions_run_id_research_runs"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_project_thesis_versions")),
        sa.UniqueConstraint(
            "project_id",
            "version",
            name="uq_project_thesis_versions_project_version",
        ),
    )
    op.create_index(
        op.f("ix_project_thesis_versions_owner_id"),
        "project_thesis_versions",
        ["owner_id"],
    )


def downgrade() -> None:
    op.drop_table("project_thesis_versions")
    op.drop_table("decisions")
    op.drop_table("experiment_observations")
    op.drop_table("experiment_assumptions")
    op.drop_table("experiments")
    op.drop_table("assumptions")
    op.drop_table("evidence")
    op.drop_table("claims")
