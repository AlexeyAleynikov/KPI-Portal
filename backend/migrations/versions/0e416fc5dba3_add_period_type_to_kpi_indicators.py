"""add period_type to kpi_indicators
Revision ID: 0e416fc5dba3
Revises: ddac0a6a6264
Create Date: 2026-02-28
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0e416fc5dba3'
down_revision: Union[str, None] = 'ddac0a6a6264'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

period_type_enum = sa.Enum(
    'constant', 'day', 'week', 'decade', 'month', 'quarter', 'year', 'on_date',
    name='periodtype'
)

def upgrade() -> None:
    op.add_column('kpi_indicators',
        sa.Column('period_type', sa.String(16), nullable=False, server_default='month')
    )

def downgrade() -> None:
    op.drop_column('kpi_indicators', 'period_type')
