"""Initial schema

Revision ID: 001
Revises:
Create Date: 2024-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('email', sa.String(255), nullable=False, unique=True, index=True),
        sa.Column('full_name', sa.String(255), nullable=True),
        sa.Column('avatar_url', sa.Text, nullable=True),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('created_date', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_date', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    op.create_table(
        'research_projects',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_by', sa.String(255), nullable=False, index=True),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('abstract', sa.Text, nullable=True),
        sa.Column('field', sa.String(100), nullable=True),
        sa.Column('stage', sa.String(100), nullable=True),
        sa.Column('target_journal', sa.String(255), nullable=True),
        sa.Column('deadline', sa.String(50), nullable=True),
        sa.Column('research_questions', sa.JSON, nullable=True),
        sa.Column('keywords', sa.JSON, nullable=True),
        sa.Column('health_scores', sa.JSON, nullable=True),
        sa.Column('progress', sa.Integer, default=0),
        sa.Column('created_date', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_date', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    op.create_table(
        'documents',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_by', sa.String(255), nullable=False, index=True),
        sa.Column('project_id', sa.String(36), nullable=True),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('content', sa.Text, nullable=True),
        sa.Column('document_type', sa.String(100), nullable=True),
        sa.Column('type', sa.String(100), nullable=True),
        sa.Column('file_url', sa.Text, nullable=True),
        sa.Column('file_name', sa.String(500), nullable=True),
        sa.Column('file_size', sa.Integer, nullable=True),
        sa.Column('word_count', sa.Integer, default=0),
        sa.Column('page_count', sa.Integer, default=0),
        sa.Column('tags', sa.JSON, nullable=True),
        sa.Column('is_indexed', sa.Boolean, default=False),
        sa.Column('created_date', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_date', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    op.create_table(
        'conversations',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_by', sa.String(255), nullable=False, index=True),
        sa.Column('project_id', sa.String(36), nullable=True),
        sa.Column('title', sa.String(500), nullable=True),
        sa.Column('type', sa.String(100), nullable=True),
        sa.Column('mode', sa.String(100), nullable=True),
        sa.Column('messages', sa.JSON, nullable=True),
        sa.Column('context', sa.JSON, nullable=True),
        sa.Column('created_date', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_date', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    op.create_table(
        'research_gaps',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_by', sa.String(255), nullable=False, index=True),
        sa.Column('project_id', sa.String(36), nullable=True),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('gap_type', sa.String(100), nullable=True),
        sa.Column('significance', sa.String(100), nullable=True),
        sa.Column('status', sa.String(100), nullable=True),
        sa.Column('potential_contribution', sa.Text, nullable=True),
        sa.Column('related_keywords', sa.JSON, nullable=True),
        sa.Column('confidence_score', sa.Float, nullable=True),
        sa.Column('evidence', sa.JSON, nullable=True),
        sa.Column('related_papers', sa.JSON, nullable=True),
        sa.Column('created_date', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_date', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('research_gaps')
    op.drop_table('conversations')
    op.drop_table('documents')
    op.drop_table('research_projects')
    op.drop_table('users')
