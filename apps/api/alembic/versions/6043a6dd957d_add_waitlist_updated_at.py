"""Add missing updated_at column to waitlist

Revision ID: 6043a6dd957d
Revises: f2a1c9e6d3b7
Create Date: 2026-09-06

The waitlist model has always declared `updated_at`, but the migration that
created the table (aab14aaf9aea) never added the column — this patches
already-applied databases; aab14aaf9aea itself has also been fixed for
fresh installs.
"""
from alembic import op
import sqlalchemy as sa

revision = '6043a6dd957d'
down_revision = 'f2a1c9e6d3b7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE waitlist
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
    """)


def downgrade() -> None:
    op.drop_column('waitlist', 'updated_at')
