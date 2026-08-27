"""Add source and target language columns to videos

Revision ID: 002_add_languages
Revises: 001_initial
Create Date: 2026-07-10

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '002_add_languages'
down_revision = '001_initial'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('videos', sa.Column('source_language', sa.String(length=10), nullable=True))
    op.add_column('videos', sa.Column('target_language', sa.String(length=10), nullable=True))
    op.execute("UPDATE videos SET source_language = 'en' WHERE source_language IS NULL")
    op.alter_column('videos', 'source_language', nullable=False)


def downgrade() -> None:
    op.drop_column('videos', 'target_language')
    op.drop_column('videos', 'source_language')
