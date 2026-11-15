"""phase_d_credit_redemptions

Revision ID: d4e8b3a1c2f5
Revises: 642d24fde210
Create Date: 2026-11-12 23:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4e8b3a1c2f5'
down_revision: Union[str, Sequence[str], None] = '642d24fde210'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema for Phase D: Credit Redemption, Certificates, Clean-Up Donations, and Partner Coupons."""
    bind = op.get_bind()
    try:
        insp = sa.inspect(bind)
        tables = insp.get_table_names()
    except Exception:
        insp = None
        tables = []

    # 1. Add clean_up_fund_credits to wards if not present
    if not tables or 'wards' in tables:
        ward_columns = [c['name'] for c in insp.get_columns('wards')] if insp else []
        if 'clean_up_fund_credits' not in ward_columns:
            op.add_column(
                'wards',
                sa.Column('clean_up_fund_credits', sa.Float(), server_default='0.0', nullable=False)
            )

    # 2. Create redemption_items table
    if 'redemption_items' not in tables:
        op.create_table(
            'redemption_items',
            sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
            sa.Column('item_type', sa.String(length=50), nullable=False),
            sa.Column('title', sa.String(length=200), nullable=False),
            sa.Column('description', sa.Text(), nullable=False),
            sa.Column('credit_cost', sa.Float(), nullable=False),
            sa.Column('stock_limit', sa.Integer(), nullable=True),
            sa.Column('stock_remaining', sa.Integer(), nullable=True),
            sa.Column('partner_name', sa.String(length=150), nullable=True),
            sa.Column('badge_text', sa.String(length=100), nullable=True),
            sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('ix_redemption_items_item_type', 'redemption_items', ['item_type'], unique=False)
        op.create_index('ix_redemption_items_is_active', 'redemption_items', ['is_active'], unique=False)

    # 3. Create partner_coupons table
    if 'partner_coupons' not in tables:
        op.create_table(
            'partner_coupons',
            sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
            sa.Column('item_id', sa.String(length=36), sa.ForeignKey('redemption_items.id', ondelete='CASCADE'), nullable=False),
            sa.Column('coupon_code', sa.String(length=100), nullable=False),
            sa.Column('is_redeemed', sa.Boolean(), server_default='0', nullable=False),
            sa.Column('redeemed_by_user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('redeemed_at', sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index('ix_partner_coupons_item_id', 'partner_coupons', ['item_id'], unique=False)
        op.create_index('ix_partner_coupons_coupon_code', 'partner_coupons', ['coupon_code'], unique=True)
        op.create_index('ix_partner_coupons_is_redeemed', 'partner_coupons', ['is_redeemed'], unique=False)

    # 4. Create redemption_transactions table
    if 'redemption_transactions' not in tables:
        op.create_table(
            'redemption_transactions',
            sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
            sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('pseudonymous_owner', sa.String(length=50), nullable=True),
            sa.Column('item_id', sa.String(length=36), sa.ForeignKey('redemption_items.id', ondelete='SET NULL'), nullable=True),
            sa.Column('item_type', sa.String(length=50), nullable=False),
            sa.Column('credits_spent', sa.Float(), nullable=False),
            sa.Column('idempotency_key', sa.String(length=100), nullable=True),
            sa.Column('certificate_number', sa.String(length=50), nullable=True),
            sa.Column('certificate_qr_data', sa.Text(), nullable=True),
            sa.Column('coupon_code', sa.String(length=100), nullable=True),
            sa.Column('ward_id', sa.String(length=36), sa.ForeignKey('wards.id', ondelete='SET NULL'), nullable=True),
            sa.Column('donor_display_name', sa.String(length=100), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('ix_redemption_transactions_user_id', 'redemption_transactions', ['user_id'], unique=False)
        op.create_index('ix_redemption_transactions_certificate_number', 'redemption_transactions', ['certificate_number'], unique=True)
        op.create_index('ix_redemption_transactions_idempotency_key', 'redemption_transactions', ['idempotency_key'], unique=False)


def downgrade() -> None:
    """Downgrade schema for Phase D."""
    op.drop_table('redemption_transactions')
    op.drop_table('partner_coupons')
    op.drop_table('redemption_items')
    with op.batch_alter_table('wards') as batch_op:
        batch_op.drop_column('clean_up_fund_credits')
