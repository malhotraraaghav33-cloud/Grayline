import json
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Patient, TimelineEvent, User
from backend.schemas import PatientCreate, PatientUpdate, PatientResponse
from backend.auth import get_current_user, require_operator_or_admin, require_admin
from backend.triage import evaluate_patient_triage
from backend.websocket_manager import ws_manager

router = APIRouter(prefix="/patients", tags=["Patients Telemetry"])

def patient_to_schema(p: Patient) -> dict:
    return {
        "id": p.id,
        "incident_id": p.incident_id,
        "callsign": p.callsign,
        "injury_summary": p.injury_summary,
        "triage_priority": p.triage_priority,
        "previous_priority": p.previous_priority,
        "status": p.status,
        "heart_rate": p.heart_rate,
        "spo2": p.spo2,
        "systolic_bp": p.systolic_bp,
        "diastolic_bp": p.diastolic_bp,
        "respiratory_rate": p.respiratory_rate,
        "temperature": p.temperature,
        "gcs": p.gcs,
        "pain_level": p.pain_level,
        "tourniquet_applied": p.tourniquet_applied,
        "tourniquet_time": p.tourniquet_time,
        "tourniquet_elapsed_mins": p.tourniquet_elapsed_mins,
        "triage_rule_hits": json.loads(p.triage_rule_hits or "[]"),
        "triage_explanation": p.triage_explanation,
        "missing_observations": json.loads(p.missing_observations or "[]"),
        "review_status": p.review_status,
        "reviewed_by": p.reviewed_by,
        "reviewed_at": p.reviewed_at,
        "lat": p.lat,
        "lng": p.lng,
        "location_name": p.location_name,
        "assigned_facility_id": p.assigned_facility_id,
        "assigned_transport": p.assigned_transport,
        "last_observation_timestamp": p.last_observation_timestamp,
        "observation_history": [
            {
                "id": obs.id,
                "patient_id": obs.patient_id,
                "timestamp": obs.timestamp,
                "heart_rate": obs.heart_rate,
                "spo2": obs.spo2,
                "systolic_bp": obs.systolic_bp,
                "diastolic_bp": obs.diastolic_bp,
                "respiratory_rate": obs.respiratory_rate,
                "temperature": obs.temperature,
                "gcs": obs.gcs,
                "pain_level": obs.pain_level
            }
            for obs in p.observations[:10]
        ]
    }

@router.get("", response_model=List[PatientResponse])
def list_patients(
    priority: Optional[str] = Query(None, description="Filter by triage priority: CRITICAL, PRIORITY, STABLE, EXPECTANT"),
    status: Optional[str] = Query(None, description="Filter by status: WAITING_TRIAGE, TRIAGED, EVAC_PENDING, EN_ROUTE, DELIVERED"),
    search: Optional[str] = Query(None, description="Search ID, callsign, injury summary"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Patient)
    if priority and priority != "ALL":
        query = query.filter(Patient.triage_priority == priority.upper())
    if status and status != "ALL":
        query = query.filter(Patient.status == status.upper())
    if search:
        s = f"%{search}%"
        query = query.filter(
            (Patient.id.ilike(s)) |
            (Patient.callsign.ilike(s)) |
            (Patient.injury_summary.ilike(s)) |
            (Patient.location_name.ilike(s))
        )
    patients = query.all()
    return [patient_to_schema(p) for p in patients]

@router.post("", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
async def create_patient(
    patient_in: PatientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    existing = db.query(Patient).filter(Patient.id == patient_in.id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Patient with ID '{patient_in.id}' already exists."
        )

    triage_res = evaluate_patient_triage(
        heart_rate=patient_in.heart_rate,
        spo2=patient_in.spo2,
        systolic_bp=patient_in.systolic_bp,
        diastolic_bp=patient_in.diastolic_bp,
        respiratory_rate=patient_in.respiratory_rate,
        temperature=patient_in.temperature,
        gcs=patient_in.gcs,
        pain_level=patient_in.pain_level,
        tourniquet_applied=patient_in.tourniquet_applied,
        tourniquet_elapsed_mins=patient_in.tourniquet_elapsed_mins
    )

    now_iso = datetime.utcnow().isoformat() + "Z"
    new_patient = Patient(
        id=patient_in.id,
        incident_id=patient_in.incident_id,
        callsign=patient_in.callsign,
        injury_summary=patient_in.injury_summary,
        triage_priority=triage_res["priority"],
        status="WAITING_TRIAGE" if triage_res["priority"] == "CRITICAL" else "TRIAGED",
        heart_rate=patient_in.heart_rate,
        spo2=patient_in.spo2,
        systolic_bp=patient_in.systolic_bp,
        diastolic_bp=patient_in.diastolic_bp,
        respiratory_rate=patient_in.respiratory_rate,
        temperature=patient_in.temperature,
        gcs=patient_in.gcs,
        pain_level=patient_in.pain_level,
        tourniquet_applied=patient_in.tourniquet_applied,
        tourniquet_time=patient_in.tourniquet_time,
        tourniquet_elapsed_mins=patient_in.tourniquet_elapsed_mins,
        triage_rule_hits=json.dumps(triage_res["rule_hits"]),
        triage_explanation=triage_res["explanation"],
        missing_observations=json.dumps(triage_res["missing_observations"]),
        review_status="PENDING",
        lat=patient_in.lat,
        lng=patient_in.lng,
        location_name=patient_in.location_name,
        last_observation_timestamp=now_iso
    )
    db.add(new_patient)

    # Log event
    evt = TimelineEvent(
        id=f"EVT-{int(datetime.utcnow().timestamp() * 1000)}",
        zulu_time=datetime.utcnow().strftime("%H:%M:%SZ"),
        category="TRIAGE",
        title=f"New casualty registered: {new_patient.id}",
        detail=f"{new_patient.injury_summary} -> Triaged as {new_patient.triage_priority}",
        severity="WARNING" if new_patient.triage_priority == "CRITICAL" else "INFO",
        patient_id=new_patient.id
    )
    db.add(evt)
    db.commit()
    db.refresh(new_patient)

    payload = patient_to_schema(new_patient)
    await ws_manager.broadcast({"type": "PATIENT_CREATED", "data": payload})
    return payload

@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient '{patient_id}' not found")
    return patient_to_schema(patient)

@router.patch("/{patient_id}", response_model=PatientResponse)
async def update_patient(
    patient_id: str,
    updates: PatientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient '{patient_id}' not found")

    old_priority = patient.triage_priority
    update_data = updates.model_dump(exclude_unset=True)

    for field, val in update_data.items():
        if hasattr(patient, field):
            setattr(patient, field, val)

    # Re-evaluate triage rules if vitals were updated
    vitals_fields = {"heart_rate", "spo2", "systolic_bp", "diastolic_bp", "respiratory_rate", "temperature", "gcs", "pain_level", "tourniquet_applied", "tourniquet_elapsed_mins"}
    if any(k in update_data for k in vitals_fields):
        triage_res = evaluate_patient_triage(
            heart_rate=patient.heart_rate,
            spo2=patient.spo2,
            systolic_bp=patient.systolic_bp,
            diastolic_bp=patient.diastolic_bp,
            respiratory_rate=patient.respiratory_rate,
            temperature=patient.temperature,
            gcs=patient.gcs,
            pain_level=patient.pain_level,
            tourniquet_applied=patient.tourniquet_applied,
            tourniquet_elapsed_mins=patient.tourniquet_elapsed_mins
        )
        if not updates.triage_priority:
            patient.triage_priority = triage_res["priority"]
        patient.triage_rule_hits = json.dumps(triage_res["rule_hits"])
        patient.triage_explanation = triage_res["explanation"]
        patient.missing_observations = json.dumps(triage_res["missing_observations"])

    patient.last_observation_timestamp = datetime.utcnow().isoformat() + "Z"

    # If priority escalated
    if patient.triagePriority if hasattr(patient, 'triagePriority') else patient.triage_priority != old_priority:
        patient.previous_priority = old_priority
        evt = TimelineEvent(
            id=f"EVT-{int(datetime.utcnow().timestamp() * 1000)}",
            zulu_time=datetime.utcnow().strftime("%H:%M:%SZ"),
            category="TRIAGE",
            title=f"{patient.id} Triage priority shifted to {patient.triage_priority}",
            detail=f"{old_priority} -> {patient.triage_priority}. {patient.triage_explanation}",
            severity="CRITICAL" if patient.triage_priority == "CRITICAL" else "WARNING",
            patient_id=patient.id
        )
        db.add(evt)

    db.commit()
    db.refresh(patient)

    payload = patient_to_schema(patient)
    await ws_manager.broadcast({"type": "PATIENT_UPDATED", "data": payload})
    return payload

@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_patient(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient '{patient_id}' not found")
    db.delete(patient)
    db.commit()
    await ws_manager.broadcast({"type": "PATIENT_DELETED", "patient_id": patient_id})
    return None
