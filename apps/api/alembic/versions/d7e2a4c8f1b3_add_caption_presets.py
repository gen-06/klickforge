"""Add caption_presets table

Revision ID: d7e2a4c8f1b3
Revises: a3f5c9b1d2e4
Create Date: 2026-09-09

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = 'd7e2a4c8f1b3'
down_revision = 'a3f5c9b1d2e4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS caption_presets (
            id UUID PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name VARCHAR(100) NOT NULL,
            source_language VARCHAR(10) DEFAULT 'en',
            target_language VARCHAR(10),
            subtitle_font VARCHAR(255) NOT NULL DEFAULT 'Arial',
            subtitle_size INTEGER NOT NULL DEFAULT 56,
            subtitle_color VARCHAR(32) NOT NULL DEFAULT '#FFFFFF',
            subtitle_position VARCHAR(32) NOT NULL DEFAULT 'bottom',
            subtitle_outline INTEGER NOT NULL DEFAULT 2,
            subtitle_outline_color VARCHAR(32) NOT NULL DEFAULT '#000000',
            audio_mode VARCHAR(32) NOT NULL DEFAULT 'subtitles_only',
            voice VARCHAR(32) NOT NULL DEFAULT 'alloy',
            is_default BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_caption_presets_user_id ON caption_presets (user_id)")


def downgrade() -> None:
    op.drop_index('ix_caption_presets_user_id', table_name='caption_presets')
    op.drop_table('caption_presets')
