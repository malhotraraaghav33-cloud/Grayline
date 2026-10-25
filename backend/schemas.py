from typing import List, Optional, Any
from pydantic import BaseModel, Field, field_validator

# --- Auth Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

class UserLogin(BaseModel):
    username: str = Field(..., min_length=2, max_length=50)
    password: str = Field(..., min_length=4)

class UserResponse(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    role: str
    full_name: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True

# --- Vitals Schemas ---
class VitalObservationCreate(BaseModel):
    heart_rate: int = Field(..., ge=20, le=300, description="Heart rate in BPM (20-300)")
    spo2: int = Field(..., ge=0, le=100, description="Oxygen saturation % (0-100)")
    systolic_bp: int = Field(..., ge=30, le=300, description="Systolic blood pressure in mmHg (30-300)")
    diastolic_bp: int = Field(..., ge=20, le=200, description="Diastolic blood pressure in mmHg (20-200)")
    respiratory_rate: int = Field(..., ge=0, le=80, description="Respiratory rate breaths/min (0-80)")
    temperature: float = Field(..., ge=25.0, le=45.0, description="Core body temperature in Celsius (25-45)")
    gcs: Optional[int] = Field(default=15, ge=3, le=15, description="Glasgow Coma Scale (3-15)")
    pain_level: Optional[int] = Field(default=0, ge=0, le=10, description="Pain rating (0-10)")

    @field_validator("diastolic_bp")
    @classmethod
    def check_bp_consistency(cls, v, values):
        # diastolic should not exceed systolic if systolic is provided
        if "systolic_bp" in values.data and v > values.data["systolic_bp"]:
            raise ValueError("Diastolic blood pressure cannot exceed systolic blood pressure")
        return v

class VitalObservationResponse(VitalObservationCreate):
    id: int
    patient_id: str
    timestamp: str

    class Config:
        from_attributes = True

# --- Patient Schemas ---
class PatientBase(BaseModel):
    callsign: Optional[str] = None
    injury_summary: str = Field(..., min_length=3)
    heart_rate: int = Field(..., ge=20, le=300)
    spo2: int = Field(..., ge=0, le=100)
    systolic_bp: int = Field(..., ge=30, le=300)
    diastolic_bp: int = Field(..., ge=20, le=200)
    respiratory_rate: int = Field(..., ge=0, le=80)
    temperature: float = Field(..., ge=25.0, le=45.0)
    gcs: int = Field(default=15, ge=3, le=15)
    pain_level: int = Field(default=0, ge=0, le=10)
    tourniquet_applied: bool = False
    tourniquet_time: Optional[str] = None
    tourniquet_elapsed_mins: int = 0
    lat: float
    lng: float
    location_name: str

class PatientCreate(PatientBase):
    id: str = Field(..., min_length=2, max_length=20, pattern=r"^[A-Za-z0-9\-_]+$")
    incident_id: str = "INC-07-ALFA"

class PatientUpdate(BaseModel):
    callsign: Optional[str] = None
    injury_summary: Optional[str] = None
    status: Optional[str] = None
    heart_rate: Optional[int] = Field(None, ge=20, le=300)
    spo2: Optional[int] = Field(None, ge=0, le=100)
    systolic_bp: Optional[int] = Field(None, ge=30, le=300)
    diastolic_bp: Optional[int] = Field(None, ge=20, le=200)
    respiratory_rate: Optional[int] = Field(None, ge=0, le=80)
    temperature: Optional[float] = Field(None, ge=25.0, le=45.0)
    gcs: Optional[int] = Field(None, ge=3, le=15)
    pain_level: Optional[int] = Field(None, ge=0, le=10)
    tourniquet_applied: Optional[bool] = None
    tourniquet_time: Optional[str] = None
    tourniquet_elapsed_mins: Optional[int] = None
    assigned_facility_id: Optional[str] = None
    assigned_transport: Optional[str] = None
    triage_priority: Optional[str] = None
    review_status: Optional[str] = None
    reviewed_by: Optional[str] = None

class PatientResponse(PatientBase):
    id: str
    incident_id: str
    triage_priority: str
    previous_priority: Optional[str] = None
    status: str
    triage_rule_hits: List[str] = []
    triage_explanation: Optional[str] = None
    missing_observations: List[str] = []
    review_status: str
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    assigned_facility_id: Optional[str] = None
    assigned_transport: Optional[str] = None
    last_observation_timestamp: str
    observation_history: List[VitalObservationResponse] = []

    class Config:
        from_attributes = True

# --- Triage Rule Schemas ---
class TriageEvaluationRequest(BaseModel):
    heart_rate: Optional[int] = None
    spo2: Optional[int] = None
    systolic_bp: Optional[int] = None
    diastolic_bp: Optional[int] = None
    respiratory_rate: Optional[int] = None
    temperature: Optional[float] = None
    gcs: Optional[int] = None
    pain_level: Optional[int] = None
    tourniquet_applied: Optional[bool] = False
    tourniquet_elapsed_mins: Optional[int] = 0

class TriageEvaluationResponse(BaseModel):
    priority: str
    rule_hits: List[str]
    explanation: str
    missing_observations: List[str]
    is_clinically_certified: bool = False
    certification_notice: str = "DEMONSTRATION ONLY: Not clinically certified. Requires human medical review."

class TriageCertifyRequest(BaseModel):
    reviewer_name: str = Field(..., min_length=2)
    override_priority: Optional[str] = None
    clinical_notes: Optional[str] = None

# --- Evacuation Routing Schemas ---
class RouteRequest(BaseModel):
    origin_id: str = Field(..., min_length=1)
    destination_id: str = Field(..., min_length=1)
    avoid_blocked: bool = True

class RouteResponse(BaseModel):
    origin_id: str
    destination_id: str
    is_viable: bool
    path_node_ids: List[str]
    path_coordinates: List[List[float]]
    total_distance_km: float
    estimated_time_minutes: int
    used_bypass: bool
    avoided_hazards: List[str]
    road_segments: List[str]
    explanation: str

# --- Hazard Schemas ---
class HazardCreate(BaseModel):
    title: str = Field(..., min_length=3)
    category: str = "DEBRIS"
    severity: str = "MEDIUM"
    location_description: str
    lat: float
    lng: float
    radius_meters: int = 200
    description: str
    blocks_road_id: Optional[str] = None
    estimated_clear_hours: Optional[float] = None

class HazardUpdate(BaseModel):
    title: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    verification_status: Optional[str] = None
    verified_by: Optional[str] = None
    blocks_road_id: Optional[str] = None

class HazardResponse(BaseModel):
    id: str
    code: str
    category: str
    title: str
    location_description: str
    lat: float
    lng: float
    radius_meters: int
    severity: str
    description: str
    reported_timestamp: str
    verified_timestamp: Optional[str] = None
    verification_status: str
    verified_by: Optional[str] = None
    status: str
    blocks_road_id: Optional[str] = None
    estimated_clear_hours: Optional[float] = None

    class Config:
        from_attributes = True

# --- Facility Schemas ---
class FacilityResponse(BaseModel):
    id: str
    code: str
    name: str
    type: str
    lat: float
    lng: float
    total_capacity: int
    occupied_beds: int
    icu_capacity: int
    icu_occupied: int
    surgical_theaters: int
    blood_units_available: int
    status: str
    receiving_status: bool
    specialties: List[str] = []
    last_updated: str

    class Config:
        from_attributes = True

class FacilityUpdate(BaseModel):
    occupied_beds: Optional[int] = None
    icu_occupied: Optional[int] = None
    receiving_status: Optional[bool] = None
    status: Optional[str] = None

# --- Incident & Status Schemas ---
class IncidentStatusResponse(BaseModel):
    code: str
    title: str
    mascal_active: bool
    declared_by: Optional[str] = None
    declared_at: Optional[str] = None
    sys_net_security: str
    total_patients: int
    critical_count: int
    priority_count: int
    stable_count: int
    active_hazards_count: int

class MascalToggleRequest(BaseModel):
    declare: bool
    declared_by: str = "MAJ. V. CHEN"

class TimelineEventResponse(BaseModel):
    id: str
    timestamp: str
    zulu_time: str
    category: str
    title: str
    detail: str
    severity: str
    patient_id: Optional[str] = None
    facility_id: Optional[str] = None
    hazard_id: Optional[str] = None

# --- GPU / Inference Schemas ---
class GPUStatusResponse(BaseModel):
    gpu_service_configured: bool
    service_url: Optional[str] = None
    status: str
    hardware_acceleration: str
    validation_status: str = "UNVALIDATED_DEMO_ALGORITHM"
    notice: str = "No GPU inference service configured; using verified deterministic demo triage rules."

class InferenceRequest(BaseModel):
    patient_id: Optional[str] = None
    vitals: VitalObservationCreate
    trauma_mechanism: Optional[str] = None

class InferenceResponse(BaseModel):
    triage_priority: str
    confidence_score: float
    rationale: str
    rule_crosscheck: List[str]
    model_source: str
    validation_status: str
    requires_human_certification: bool = True
