"""Add is_demo flag to videos

Revision ID: a3f5c9b1d2e4
Revises: 6043a6dd957d
Create Date: 2026-09-08

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = 'a3f5c9b1d2e4'
down_revision = '6043a6dd957d'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Opt-in flag: only videos explicitly marked true are eligible for the
    # public "See it in action" homepage section. Defaults false so nothing
    # a customer uploads is ever shown publicly without consent.
    op.execute("""
        ALTER TABLE videos
        ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false
    """)


def downgrade() -> None:
    op.drop_column('videos', 'is_demo')
