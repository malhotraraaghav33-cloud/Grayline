"""Initial tactical database schema

Revision ID: 001_initial_tactical_schema
Revises: 
Create Date: 2026-10-25 09:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '001_initial_tactical_schema'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Users
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('username', sa.String(length=50), nullable=False),
        sa.Column('email', sa.String(length=100), nullable=True),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=20), nullable=False),
        sa.Column('full_name', sa.String(length=100), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_users_username', 'users', ['username'], unique=True)

    # Patients
    op.create_table(
        'patients',
        sa.Column('id', sa.String(length=20), primary_key=True),
        sa.Column('incident_id', sa.String(length=50), nullable=False),
        sa.Column('callsign', sa.String(length=50), nullable=True),
        sa.Column('injury_summary', sa.Text(), nullable=False),
        sa.Column('triage_priority', sa.String(length=20), nullable=False),
        sa.Column('previous_priority', sa.String(length=20), nullable=True),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.Column('heart_rate', sa.Integer(), nullable=False),
        sa.Column('spo2', sa.Integer(), nullable=False),
        sa.Column('systolic_bp', sa.Integer(), nullable=False),
        sa.Column('diastolic_bp', sa.Integer(), nullable=False),
        sa.Column('respiratory_rate', sa.Integer(), nullable=False),
        sa.Column('temperature', sa.Float(), nullable=False),
        sa.Column('gcs', sa.Integer(), default=15),
        sa.Column('pain_level', sa.Integer(), default=0),
        sa.Column('tourniquet_applied', sa.Boolean(), default=False),
        sa.Column('tourniquet_time', sa.String(length=20), nullable=True),
        sa.Column('tourniquet_elapsed_mins', sa.Integer(), default=0),
        sa.Column('triage_rule_hits', sa.Text(), default='[]'),
        sa.Column('triage_explanation', sa.Text(), nullable=True),
        sa.Column('missing_observations', sa.Text(), default='[]'),
        sa.Column('review_status', sa.String(length=20), default='PENDING'),
        sa.Column('reviewed_by', sa.String(length=100), nullable=True),
        sa.Column('reviewed_at', sa.String(length=30), nullable=True),
        sa.Column('lat', sa.Float(), nullable=False),
        sa.Column('lng', sa.Float(), nullable=False),
        sa.Column('location_name', sa.String(length=150), nullable=False),
        sa.Column('assigned_facility_id', sa.String(length=20), nullable=True),
        sa.Column('assigned_transport', sa.String(length=100), nullable=True),
        sa.Column('last_observation_timestamp', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )
    op.create_index('idx_patient_priority_status', 'patients', ['triage_priority', 'status'])

    # Vital Observations
    op.create_table(
        'vital_observations',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('patient_id', sa.String(length=20), sa.ForeignKey('patients.id', ondelete='CASCADE'), nullable=False),
        sa.Column('timestamp', sa.String(length=50), nullable=False),
        sa.Column('heart_rate', sa.Integer(), nullable=False),
        sa.Column('spo2', sa.Integer(), nullable=False),
        sa.Column('systolic_bp', sa.Integer(), nullable=False),
        sa.Column('diastolic_bp', sa.Integer(), nullable=False),
        sa.Column('respiratory_rate', sa.Integer(), nullable=False),
        sa.Column('temperature', sa.Float(), nullable=False),
        sa.Column('gcs', sa.Integer(), nullable=True),
        sa.Column('pain_level', sa.Integer(), nullable=True),
    )
    op.create_index('ix_vital_observations_patient_id', 'vital_observations', ['patient_id'])

    # Medical Facilities
    op.create_table(
        'medical_facilities',
        sa.Column('id', sa.String(length=20), primary_key=True),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('lat', sa.Float(), nullable=False),
        sa.Column('lng', sa.Float(), nullable=False),
        sa.Column('total_capacity', sa.Integer(), nullable=False),
        sa.Column('occupied_beds', sa.Integer(), nullable=False),
        sa.Column('icu_capacity', sa.Integer(), nullable=False),
        sa.Column('icu_occupied', sa.Integer(), nullable=False),
        sa.Column('surgical_theaters', sa.Integer(), default=1),
        sa.Column('blood_units_available', sa.Integer(), default=10),
        sa.Column('status', sa.String(length=30), default='OPERATIONAL'),
        sa.Column('receiving_status', sa.Boolean(), default=True),
        sa.Column('specialties', sa.Text(), default='[]'),
        sa.Column('last_updated', sa.String(length=50), nullable=False),
    )

    # Hazards
    op.create_table(
        'hazards',
        sa.Column('id', sa.String(length=20), primary_key=True),
        sa.Column('code', sa.String(length=20), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=150), nullable=False),
        sa.Column('location_description', sa.String(length=255), nullable=False),
        sa.Column('lat', sa.Float(), nullable=False),
        sa.Column('lng', sa.Float(), nullable=False),
        sa.Column('radius_meters', sa.Integer(), default=200),
        sa.Column('severity', sa.String(length=20), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('reported_timestamp', sa.String(length=50), nullable=False),
        sa.Column('verified_timestamp', sa.String(length=50), nullable=True),
        sa.Column('verification_status', sa.String(length=20), default='UNVERIFIED'),
        sa.Column('verified_by', sa.String(length=100), nullable=True),
        sa.Column('status', sa.String(length=20), default='ACTIVE'),
        sa.Column('blocks_road_id', sa.String(length=50), nullable=True),
        sa.Column('estimated_clear_hours', sa.Float(), nullable=True),
    )

    # Road Graph Nodes & Edges
    op.create_table(
        'road_nodes',
        sa.Column('id', sa.String(length=50), primary_key=True),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('lat', sa.Float(), nullable=False),
        sa.Column('lng', sa.Float(), nullable=False),
        sa.Column('elevation_meters', sa.Integer(), default=400),
        sa.Column('is_facility', sa.Boolean(), default=False),
        sa.Column('facility_id', sa.String(length=20), nullable=True),
    )

    op.create_table(
        'road_edges',
        sa.Column('id', sa.String(length=50), primary_key=True),
        sa.Column('from_node_id', sa.String(length=50), sa.ForeignKey('road_nodes.id'), nullable=False),
        sa.Column('to_node_id', sa.String(length=50), sa.ForeignKey('road_nodes.id'), nullable=False),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('distance_km', sa.Float(), nullable=False),
        sa.Column('speed_limit_kmh', sa.Integer(), default=50),
        sa.Column('is_blocked', sa.Boolean(), default=False),
        sa.Column('blocked_reason', sa.String(length=255), nullable=True),
        sa.Column('hazard_id', sa.String(length=20), nullable=True),
        sa.Column('surface_type', sa.String(length=30), default='PAVED'),
    )

    # Timeline Events
    op.create_table(
        'timeline_events',
        sa.Column('id', sa.String(length=50), primary_key=True),
        sa.Column('timestamp', sa.DateTime(), nullable=True),
        sa.Column('zulu_time', sa.String(length=30), nullable=False),
        sa.Column('category', sa.String(length=30), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('detail', sa.Text(), nullable=False),
        sa.Column('severity', sa.String(length=20), default='INFO'),
        sa.Column('patient_id', sa.String(length=20), nullable=True),
        sa.Column('facility_id', sa.String(length=20), nullable=True),
        sa.Column('hazard_id', sa.String(length=20), nullable=True),
    )

    # Incident Status
    op.create_table(
        'incident_status',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('code', sa.String(length=50), default='INC-07-TACTICAL'),
        sa.Column('title', sa.String(length=150), default='FIELD RESPONSE 07 // SECTOR 4'),
        sa.Column('mascal_active', sa.Boolean(), default=False),
        sa.Column('declared_by', sa.String(length=100), nullable=True),
        sa.Column('declared_at', sa.String(length=50), nullable=True),
        sa.Column('sys_net_security', sa.String(length=50), default='SECURE // 99.8%'),
    )

def downgrade() -> None:
    op.drop_table('incident_status')
    op.drop_table('timeline_events')
    op.drop_table('road_edges')
    op.drop_table('road_nodes')
    op.drop_table('hazards')
    op.drop_table('medical_facilities')
    op.drop_table('vital_observations')
    op.drop_table('patients')
    op.drop_table('users')
