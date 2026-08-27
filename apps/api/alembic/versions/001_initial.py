"""Initial migration

Revision ID: 001_initial
Revises:
Create Date: 2026-07-06

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('clerk_id', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('plan', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('clerk_id')
    )
    op.create_index('ix_users_clerk_id', 'users', ['clerk_id'], unique=False)

    op.create_table(
        'videos',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('source_key', sa.String(length=1024), nullable=False),
        sa.Column('source_url', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum('PENDING', 'UPLOADED', 'PROCESSING', 'DONE', 'FAILED', name='videostatus'), nullable=True),
        sa.Column('duration', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_videos_user_id', 'videos', ['user_id'], unique=False)

    op.create_table(
        'jobs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('video_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=True),
        sa.Column('status', sa.Enum('QUEUED', 'PROCESSING', 'DONE', 'FAILED', name='jobstatus'), nullable=True),
        sa.Column('progress', sa.Integer(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['video_id'], ['videos.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_jobs_video_id', 'jobs', ['video_id'], unique=False)

    op.create_table(
        'clips',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('video_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('start_time', sa.Float(), nullable=False),
        sa.Column('end_time', sa.Float(), nullable=False),
        sa.Column('score', sa.Float(), nullable=True),
        sa.Column('output_key', sa.String(length=1024), nullable=True),
        sa.Column('output_url', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum('PENDING', 'PROCESSING', 'DONE', 'FAILED', name='clipstatus'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['video_id'], ['videos.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_clips_video_id', 'clips', ['video_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_clips_video_id', table_name='clips')
    op.drop_table('clips')
    op.drop_index('ix_jobs_video_id', table_name='jobs')
    op.drop_table('jobs')
    op.drop_index('ix_videos_user_id', table_name='videos')
    op.drop_table('videos')
    op.drop_index('ix_users_clerk_id', table_name='users')
    op.drop_table('users')
    op.execute('DROP TYPE IF EXISTS videostatus')
    op.execute('DROP TYPE IF EXISTS jobstatus')
    op.execute('DROP TYPE IF EXISTS clipstatus')
