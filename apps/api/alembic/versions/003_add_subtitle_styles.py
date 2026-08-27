"""Add subtitle style columns to videos

Revision ID: 003_add_subtitle_styles
Revises: 002_add_languages
Create Date: 2026-07-10

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '003_add_subtitle_styles'
down_revision = '002_add_languages'
branch_labels = None
depends_on = None


def _add_column(table: str, col: sa.Column):
    try:
        op.add_column(table, col)
    except Exception:
        pass


def upgrade() -> None:
    _add_column('videos', sa.Column('subtitle_font', sa.String(length=255), nullable=True))
    _add_column('videos', sa.Column('subtitle_size', sa.Integer(), nullable=True))
    _add_column('videos', sa.Column('subtitle_color', sa.String(length=32), nullable=True))
    _add_column('videos', sa.Column('subtitle_position', sa.String(length=32), nullable=True))
    _add_column('videos', sa.Column('subtitle_outline', sa.Integer(), nullable=True))
    _add_column('videos', sa.Column('subtitle_outline_color', sa.String(length=32), nullable=True))

    op.execute("""
        UPDATE videos SET
            subtitle_font = COALESCE(subtitle_font, 'Arial'),
            subtitle_size = COALESCE(subtitle_size, 56),
            subtitle_color = COALESCE(subtitle_color, '#FFFFFF'),
            subtitle_position = COALESCE(subtitle_position, 'bottom-center'),
            subtitle_outline = COALESCE(subtitle_outline, 2),
            subtitle_outline_color = COALESCE(subtitle_outline_color, '#000000')
        WHERE subtitle_font IS NULL
           OR subtitle_size IS NULL
           OR subtitle_color IS NULL
           OR subtitle_position IS NULL
           OR subtitle_outline IS NULL
           OR subtitle_outline_color IS NULL
    """)

    op.alter_column('videos', 'subtitle_font', existing_type=sa.String(length=255), nullable=False)
    op.alter_column('videos', 'subtitle_size', existing_type=sa.Integer(), nullable=False)
    op.alter_column('videos', 'subtitle_color', existing_type=sa.String(length=32), nullable=False)
    op.alter_column('videos', 'subtitle_position', existing_type=sa.String(length=32), nullable=False)
    op.alter_column('videos', 'subtitle_outline', existing_type=sa.Integer(), nullable=False)
    op.alter_column('videos', 'subtitle_outline_color', existing_type=sa.String(length=32), nullable=False)


def downgrade() -> None:
    op.drop_column('videos', 'subtitle_outline_color')
    op.drop_column('videos', 'subtitle_outline')
    op.drop_column('videos', 'subtitle_position')
    op.drop_column('videos', 'subtitle_color')
    op.drop_column('videos', 'subtitle_size')
    op.drop_column('videos', 'subtitle_font')
