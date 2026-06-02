"""Add writing fields to documents table

Revision ID: 002
Revises: 001
Create Date: 2026-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # SQLite requires individual ADD COLUMN statements
    with op.batch_alter_table('documents') as batch_op:
        batch_op.add_column(sa.Column('section', sa.String(100), nullable=True))
        batch_op.add_column(sa.Column('status', sa.String(50), nullable=True, server_default='draft'))
        batch_op.add_column(sa.Column('originality_score', sa.Integer, nullable=True))
        batch_op.add_column(sa.Column('ai_risk_score', sa.Integer, nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('documents') as batch_op:
        batch_op.drop_column('ai_risk_score')
        batch_op.drop_column('originality_score')
        batch_op.drop_column('status')
        batch_op.drop_column('section')
