"""phase_c_collection_schedules

Revision ID: 642d24fde210
Revises: c51be9afe7ce
Create Date: 2026-11-12 23:04:33.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '642d24fde210'
down_revision: Union[str, Sequence[str], None] = 'c51be9afe7ce'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema for Phase C: Ward Collection Schedules & Overrides."""
    bind = op.get_bind()
    insp = sa.inspect(bind)
    tables = insp.get_table_names()

    if 'ward_collection_schedules' not in tables:
        op.create_table(
            'ward_collection_schedules',
            sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
            sa.Column('ward_id', sa.String(length=36), sa.ForeignKey('wards.id', ondelete='CASCADE'), nullable=False),
            sa.Column('waste_type', sa.String(length=30), nullable=False),
            sa.Column('day_of_week', sa.Integer(), nullable=False),
            sa.Column('frequency', sa.String(length=30), server_default='WEEKLY', nullable=False),
            sa.Column('start_time', sa.String(length=10), nullable=False),
            sa.Column('end_time', sa.String(length=10), nullable=False),
            sa.Column('vehicle_number', sa.String(length=50), nullable=True),
            sa.Column('supervisor_name', sa.String(length=100), nullable=True),
            sa.Column('supervisor_contact', sa.String(length=30), nullable=True),
            sa.Column('instructions', sa.Text(), nullable=True),
            sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('ix_ward_collection_schedules_ward_id', 'ward_collection_schedules', ['ward_id'], unique=False)
        op.create_index('ix_ward_collection_schedules_waste_type', 'ward_collection_schedules', ['waste_type'], unique=False)
        op.create_index('ix_ward_collection_schedules_day_of_week', 'ward_collection_schedules', ['day_of_week'], unique=False)

    if 'schedule_overrides' not in tables:
        op.create_table(
            'schedule_overrides',
            sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
            sa.Column('ward_id', sa.String(length=36), sa.ForeignKey('wards.id', ondelete='CASCADE'), nullable=False),
            sa.Column('override_date', sa.Date(), nullable=False),
            sa.Column('waste_type', sa.String(length=30), nullable=True),
            sa.Column('is_cancelled', sa.Boolean(), server_default='0', nullable=False),
            sa.Column('rescheduled_date', sa.Date(), nullable=True),
            sa.Column('rescheduled_start_time', sa.String(length=10), nullable=True),
            sa.Column('rescheduled_end_time', sa.String(length=10), nullable=True),
            sa.Column('reason', sa.String(length=255), nullable=False),
            sa.Column('created_by_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('ix_schedule_overrides_ward_id', 'schedule_overrides', ['ward_id'], unique=False)
        op.create_index('ix_schedule_overrides_override_date', 'schedule_overrides', ['override_date'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('schedule_overrides')
    op.drop_table('ward_collection_schedules')
