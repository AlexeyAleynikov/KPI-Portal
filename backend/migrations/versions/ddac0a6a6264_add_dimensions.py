"""add dimensions
Revision ID: ddac0a6a6264
Revises: 0d1aaf57b86e
Create Date: 2026-02-28 15:50:02.444470
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'ddac0a6a6264'
down_revision: Union[str, None] = '0d1aaf57b86e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table('dimensions',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(128), unique=True, nullable=False),
        sa.Column('name_system', sa.String(64), unique=True, nullable=False),
    )
    op.create_table('dimension_values',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('dimension_id', sa.Integer(), sa.ForeignKey('dimensions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('value', sa.String(256), nullable=False),
    )
    op.add_column('kpi_values',
        sa.Column('dimension_value_id', sa.Integer(), sa.ForeignKey('dimension_values.id'), nullable=True)
    )

def downgrade() -> None:
    op.drop_column('kpi_values', 'dimension_value_id')
    op.drop_table('dimension_values')
    op.drop_table('dimensions')
