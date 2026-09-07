"""Add credits_charged flag to jobs

Revision ID: f2a1c9e6d3b7
Revises: 20260716080804
Create Date: 2026-09-05

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'f2a1c9e6d3b7'
down_revision = '20260716080804'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Tracks whether a job has already deducted credits, so a Celery retry
    # of the same job attempt never charges the user twice.
    op.execute("""
        ALTER TABLE jobs
        ADD COLUMN IF NOT EXISTS credits_charged BOOLEAN NOT NULL DEFAULT false
    """)


def downgrade() -> None:
    op.drop_column('jobs', 'credits_charged')
