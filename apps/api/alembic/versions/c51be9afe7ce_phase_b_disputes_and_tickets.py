"""phase_b_disputes_and_tickets

Revision ID: c51be9afe7ce
Revises: 8b3b9f748bd7
Create Date: 2026-11-12 22:22:18.319804

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c51be9afe7ce'
down_revision: Union[str, Sequence[str], None] = '8b3b9f748bd7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    insp = sa.inspect(bind)
    tables = insp.get_table_names()

    if 'dispute_tickets' not in tables:
        op.create_table(
            'dispute_tickets',
            sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
            sa.Column('ticket_number', sa.String(length=50), nullable=False),
            sa.Column('citizen_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('weighment_id', sa.String(length=36), sa.ForeignKey('waste_entries.id', ondelete='SET NULL'), nullable=True),
            sa.Column('ward_id', sa.String(length=36), sa.ForeignKey('wards.id'), nullable=False),
            sa.Column('category', sa.String(length=50), nullable=False),
            sa.Column('description', sa.Text(), nullable=False),
            sa.Column('photo_path', sa.String(length=255), nullable=True),
            sa.Column('photo_filename', sa.String(length=255), nullable=True),
            sa.Column('photo_content_type', sa.String(length=100), nullable=True),
            sa.Column('status', sa.String(length=30), nullable=False, server_default='OPEN'),
            sa.Column('retention_until', sa.DateTime(timezone=True), nullable=False),
            sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('resolved_by_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('resolution_notes', sa.Text(), nullable=True),
            sa.Column('points_adjustment', sa.Float(), nullable=True, server_default='0.0'),
            sa.Column('reversal_transaction_id', sa.String(length=36), sa.ForeignKey('credit_transactions.id', ondelete='SET NULL'), nullable=True),
            sa.Column('citizen_response', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('ix_dispute_tickets_ticket_number', 'dispute_tickets', ['ticket_number'], unique=True)
        op.create_index('ix_dispute_tickets_citizen_id', 'dispute_tickets', ['citizen_id'], unique=False)
        op.create_index('ix_dispute_tickets_weighment_id', 'dispute_tickets', ['weighment_id'], unique=False)
        op.create_index('ix_dispute_tickets_ward_id', 'dispute_tickets', ['ward_id'], unique=False)
        op.create_index('ix_dispute_tickets_category', 'dispute_tickets', ['category'], unique=False)
        op.create_index('ix_dispute_tickets_status', 'dispute_tickets', ['status'], unique=False)

    columns = [c['name'] for c in insp.get_columns('waste_entries')]
    with op.batch_alter_table('waste_entries', schema=None) as batch_op:
        if 'dispute_status' not in columns:
            batch_op.add_column(sa.Column('dispute_status', sa.String(length=30), nullable=False, server_default='PENDING_CONFIRMATION'))
            batch_op.create_index(batch_op.f('ix_waste_entries_dispute_status'), ['dispute_status'], unique=False)
        if 'confirmation_date' not in columns:
            batch_op.add_column(sa.Column('confirmation_date', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('waste_entries', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_waste_entries_dispute_status'))
        batch_op.drop_column('confirmation_date')
        batch_op.drop_column('dispute_status')

    op.drop_table('dispute_tickets')

