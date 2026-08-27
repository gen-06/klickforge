"""add waitlist

Revision ID: aab14aaf9aea
Revises: b91f3d457d02
Create Date: 2026-07-13 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'aab14aaf9aea'
down_revision = 'b91f3d457d02'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'waitlist',
        sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('source', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    op.create_index('ix_waitlist_email', 'waitlist', ['email'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_waitlist_email', table_name='waitlist')
    op.drop_table('waitlist')
