"""stage_4_dry_waste_engine

Revision ID: e5f9a2b3c4d5
Revises: d4e8b3a1c2f5
Create Date: 2026-11-13 23:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e5f9a2b3c4d5'
down_revision: Union[str, Sequence[str], None] = 'd4e8b3a1c2f5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema for Stage 4: Category-based dry-waste earning system."""
    bind = op.get_bind()
    try:
        insp = sa.inspect(bind)
        tables = insp.get_table_names()
    except Exception:
        insp = None
        tables = []

    # 1. Create dry_waste_categories table
    if 'dry_waste_categories' not in tables:
        op.create_table(
            'dry_waste_categories',
            sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
            sa.Column('code', sa.String(length=50), nullable=False),
            sa.Column('name', sa.String(length=100), nullable=False),
            sa.Column('rate_per_kg', sa.Float(), nullable=False),
            sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('ix_dry_waste_categories_code', 'dry_waste_categories', ['code'], unique=True)
        op.create_index('ix_dry_waste_categories_is_active', 'dry_waste_categories', ['is_active'])

    # 2. Create dry_waste_rate_history table
    if 'dry_waste_rate_history' not in tables:
        op.create_table(
            'dry_waste_rate_history',
            sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
            sa.Column('category_id', sa.String(length=36), sa.ForeignKey('dry_waste_categories.id', ondelete='CASCADE'), nullable=False),
            sa.Column('previous_rate', sa.Float(), nullable=False),
            sa.Column('new_rate', sa.Float(), nullable=False),
            sa.Column('changed_by_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('change_reason', sa.Text(), nullable=True),
            sa.Column('changed_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('ix_dry_waste_rate_history_category_id', 'dry_waste_rate_history', ['category_id'])

    # 3. Create waste_collection_items table
    if 'waste_collection_items' not in tables:
        op.create_table(
            'waste_collection_items',
            sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
            sa.Column('waste_entry_id', sa.String(length=36), sa.ForeignKey('waste_entries.id', ondelete='CASCADE'), nullable=False),
            sa.Column('category_id', sa.String(length=36), sa.ForeignKey('dry_waste_categories.id', ondelete='RESTRICT'), nullable=False),
            sa.Column('category_code', sa.String(length=50), nullable=False),
            sa.Column('category_name', sa.String(length=100), nullable=False),
            sa.Column('rate_per_kg', sa.Float(), nullable=False),
            sa.Column('weight_kg', sa.Float(), nullable=False),
            sa.Column('points_earned', sa.Float(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('ix_waste_collection_items_waste_entry_id', 'waste_collection_items', ['waste_entry_id'])
        op.create_index('ix_waste_collection_items_category_id', 'waste_collection_items', ['category_id'])

    # 4. Add total_weight_kg and journey_stage to waste_entries if not present
    if not tables or 'waste_entries' in tables:
        we_cols = [c['name'] for c in insp.get_columns('waste_entries')] if insp else []
        with op.batch_alter_table('waste_entries', schema=None) as batch_op:
            if 'total_weight_kg' not in we_cols:
                batch_op.add_column(sa.Column('total_weight_kg', sa.Float(), server_default='0.0', nullable=False))
            if 'journey_stage' not in we_cols:
                batch_op.add_column(sa.Column('journey_stage', sa.String(length=50), server_default='Collection', nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('waste_collection_items')
    op.drop_table('dry_waste_rate_history')
    op.drop_table('dry_waste_categories')
