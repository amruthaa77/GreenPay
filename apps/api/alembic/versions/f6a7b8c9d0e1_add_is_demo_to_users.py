"""add is_demo to users table

Revision ID: f6a7b8c9d0e1
Revises: e5f9a2b3c4d5
Create Date: 2026-11-15 14:26:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f6a7b8c9d0e1'
down_revision: Union[str, Sequence[str], None] = 'e5f9a2b3c4d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    cols = [c['name'] for c in insp.get_columns('users')]
    if 'is_demo' not in cols:
        op.add_column(
            'users',
            sa.Column('is_demo', sa.Boolean(), server_default='0', nullable=False)
        )


def downgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    cols = [c['name'] for c in insp.get_columns('users')]
    if 'is_demo' in cols:
        op.drop_column('users', 'is_demo')
