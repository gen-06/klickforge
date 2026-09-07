"""Add clip analytics and credit purchases

Revision ID: 20260716080804
Revises: aab14aaf9aea
Create Date: 2026-07-16

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20260716080804'
down_revision = 'aab14aaf9aea'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add analytics counters to clips if they don't already exist.
    op.execute("""
        ALTER TABLE clips
        ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS download_count INTEGER NOT NULL DEFAULT 0
    """)

    # Track Paddle customers and subscriptions (referenced by credit_purchases below).
    op.execute("""
        CREATE TABLE IF NOT EXISTS customers (
            customer_id VARCHAR(255) NOT NULL PRIMARY KEY,
            user_id UUID NOT NULL UNIQUE REFERENCES users(id),
            email VARCHAR(255) NOT NULL,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS subscriptions (
            subscription_id VARCHAR(255) NOT NULL PRIMARY KEY,
            customer_id VARCHAR(255) NOT NULL REFERENCES customers(customer_id),
            status VARCHAR(50) NOT NULL,
            price_id VARCHAR(255) NOT NULL,
            product_id VARCHAR(255) NOT NULL,
            next_billed_at TIMESTAMP WITHOUT TIME ZONE,
            scheduled_change_action VARCHAR(50),
            scheduled_change_at TIMESTAMP WITHOUT TIME ZONE,
            credits_granted INTEGER NOT NULL DEFAULT 0,
            last_credit_grant_at TIMESTAMP WITHOUT TIME ZONE,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_subscriptions_customer_id ON subscriptions (customer_id)")

    # Track one-time credit top-up purchases from Paddle transactions.
    op.execute("""
        CREATE TABLE IF NOT EXISTS credit_purchases (
            id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
            transaction_id VARCHAR(255) NOT NULL UNIQUE,
            customer_id VARCHAR(255) NOT NULL REFERENCES customers(customer_id),
            price_id VARCHAR(255) NOT NULL,
            credits INTEGER NOT NULL,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_credit_purchases_customer_id ON credit_purchases (customer_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_credit_purchases_transaction_id ON credit_purchases (transaction_id)")


def downgrade() -> None:
    op.drop_index('ix_credit_purchases_transaction_id', table_name='credit_purchases')
    op.drop_index('ix_credit_purchases_customer_id', table_name='credit_purchases')
    op.drop_table('credit_purchases')
    op.drop_index('ix_subscriptions_customer_id', table_name='subscriptions')
    op.drop_table('subscriptions')
    op.drop_table('customers')
    op.drop_column('clips', 'download_count')
    op.drop_column('clips', 'view_count')
