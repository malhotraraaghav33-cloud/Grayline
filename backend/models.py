from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, ForeignKey, DateTime, Index
)
from sqlalchemy.orm import relationship
from backend.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="operator", nullable=False)  # admin, operator, viewer
    full_name = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Patient(Base):
    __tablename__ = "patients"

    id = Column(String(20), primary_key=True, index=True)  # e.g. P-101
    incident_id = Column(String(50), index=True, nullable=False)
    callsign = Column(String(50), nullable=True)
    injury_summary = Column(Text, nullable=False)
    triage_priority = Column(String(20), index=True, nullable=False)  # CRITICAL, PRIORITY, STABLE, EXPECTANT
    previous_priority = Column(String(20), nullable=True)
    status = Column(String(30), default="WAITING_TRIAGE", index=True)  # WAITING_TRIAGE, TRIAGED, EVAC_PENDING, EN_ROUTE, DELIVERED

    # Current telemetry
    heart_rate = Column(Integer, nullable=False)
    spo2 = Column(Integer, nullable=False)
    systolic_bp = Column(Integer, nullable=False)
    diastolic_bp = Column(Integer, nullable=False)
    respiratory_rate = Column(Integer, nullable=False)
    temperature = Column(Float, nullable=False)
    gcs = Column(Integer, default=15)
    pain_level = Column(Integer, default=0)

    tourniquet_applied = Column(Boolean, default=False)
    tourniquet_time = Column(String(20), nullable=True)
    tourniquet_elapsed_mins = Column(Integer, default=0)

    # Explainable triage
    triage_rule_hits = Column(Text, default="[]")  # JSON serialized list of rule IDs
    triage_explanation = Column(Text, nullable=True)
    missing_observations = Column(Text, default="[]")  # JSON serialized list of missing fields

    # Review status
    review_status = Column(String(20), default="PENDING", index=True)  # PENDING, VERIFIED, OVERRIDDEN
    reviewed_by = Column(String(100), nullable=True)
    reviewed_at = Column(String(30), nullable=True)

    # Geospatial
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    location_name = Column(String(150), nullable=False)

    # Evac logistics
    assigned_facility_id = Column(String(20), nullable=True)
    assigned_transport = Column(String(100), nullable=True)

    last_observation_timestamp = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship to historical observations
    observations = relationship("VitalObservation", back_populates="patient", cascade="all, delete-orphan", order_by="VitalObservation.id.desc()")

    __table_args__ = (
        Index("idx_patient_priority_status", "triage_priority", "status"),
    )

class VitalObservation(Base):
    __tablename__ = "vital_observations"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String(20), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(String(50), nullable=False)
    heart_rate = Column(Integer, nullable=False)
    spo2 = Column(Integer, nullable=False)
    systolic_bp = Column(Integer, nullable=False)
    diastolic_bp = Column(Integer, nullable=False)
    respiratory_rate = Column(Integer, nullable=False)
    temperature = Column(Float, nullable=False)
    gcs = Column(Integer, nullable=True)
    pain_level = Column(Integer, nullable=True)

    patient = relationship("Patient", back_populates="observations")

class MedicalFacility(Base):
    __tablename__ = "medical_facilities"

    id = Column(String(20), primary_key=True, index=True)  # e.g. MED-01
    code = Column(String(50), nullable=False)
    name = Column(String(150), nullable=False)
    type = Column(String(50), nullable=False)  # FORWARD_SURGICAL, REGIONAL_TRAUMA, CLINIC, AUXILIARY_DEPOT
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    total_capacity = Column(Integer, nullable=False)
    occupied_beds = Column(Integer, nullable=False)
    icu_capacity = Column(Integer, nullable=False)
    icu_occupied = Column(Integer, nullable=False)
    surgical_theaters = Column(Integer, default=1)
    blood_units_available = Column(Integer, default=10)
    status = Column(String(30), default="OPERATIONAL")
    receiving_status = Column(Boolean, default=True)
    specialties = Column(Text, default="[]")  # JSON serialized array
    last_updated = Column(String(50), nullable=False)

class Hazard(Base):
    __tablename__ = "hazards"

    id = Column(String(20), primary_key=True, index=True)  # e.g. HZ-021
    code = Column(String(20), nullable=False)
    category = Column(String(50), nullable=False)  # STRUCTURAL, DEBRIS, HAZMAT, FLOOD, POWER_GRID, HOSTILE_ACTION
    title = Column(String(150), nullable=False)
    location_description = Column(String(255), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    radius_meters = Column(Integer, default=200)
    severity = Column(String(20), nullable=False)  # HIGH, MEDIUM, LOW
    description = Column(Text, nullable=False)
    reported_timestamp = Column(String(50), nullable=False)
    verified_timestamp = Column(String(50), nullable=True)
    verification_status = Column(String(20), default="UNVERIFIED")  # VERIFIED, UNVERIFIED
    verified_by = Column(String(100), nullable=True)
    status = Column(String(20), default="ACTIVE", index=True)  # ACTIVE, RESOLVED
    blocks_road_id = Column(String(50), nullable=True)
    estimated_clear_hours = Column(Float, nullable=True)

class RoadNode(Base):
    __tablename__ = "road_nodes"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    elevation_meters = Column(Integer, default=400)
    is_facility = Column(Boolean, default=False)
    facility_id = Column(String(20), nullable=True)

class RoadEdge(Base):
    __tablename__ = "road_edges"

    id = Column(String(50), primary_key=True, index=True)
    from_node_id = Column(String(50), ForeignKey("road_nodes.id"), nullable=False, index=True)
    to_node_id = Column(String(50), ForeignKey("road_nodes.id"), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    distance_km = Column(Float, nullable=False)
    speed_limit_kmh = Column(Integer, default=50)
    is_blocked = Column(Boolean, default=False, index=True)
    blocked_reason = Column(String(255), nullable=True)
    hazard_id = Column(String(20), nullable=True)
    surface_type = Column(String(30), default="PAVED")

class TimelineEvent(Base):
    __tablename__ = "timeline_events"

    id = Column(String(50), primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    zulu_time = Column(String(30), nullable=False)
    category = Column(String(30), index=True, nullable=False)  # TRIAGE, VITALS, HAZARD, FACILITY, EVAC, SIM, SYSTEM, MASCAL
    title = Column(String(255), nullable=False)
    detail = Column(Text, nullable=False)
    severity = Column(String(20), default="INFO")  # CRITICAL, WARNING, SUCCESS, INFO
    patient_id = Column(String(20), nullable=True, index=True)
    facility_id = Column(String(20), nullable=True)
    hazard_id = Column(String(20), nullable=True)

class IncidentStatus(Base):
    __tablename__ = "incident_status"

    id = Column(Integer, primary_key=True)
    code = Column(String(50), default="INC-07-TACTICAL")
    title = Column(String(150), default="FIELD RESPONSE 07 // SECTOR 4")
    mascal_active = Column(Boolean, default=False)
    declared_by = Column(String(100), nullable=True)
    declared_at = Column(String(50), nullable=True)
    sys_net_security = Column(String(50), default="SECURE // 99.8%")
