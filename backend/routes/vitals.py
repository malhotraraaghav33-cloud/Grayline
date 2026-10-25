import json
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Patient, VitalObservation, TimelineEvent, User
from backend.schemas import VitalObservationCreate, VitalObservationResponse, PatientResponse
from backend.auth import require_operator_or_admin, get_current_user
from backend.triage import evaluate_patient_triage
from backend.websocket_manager import ws_manager
from backend.routes.patients import patient_to_schema

router = APIRouter(prefix="/patients", tags=["Vitals & Observations"])

@router.post("/{patient_id}/vitals", response_model=PatientResponse)
async def submit_vital_observation(
    patient_id: str,
    obs_in: VitalObservationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient '{patient_id}' not found")

    timestamp_str = datetime.utcnow().strftime("%H:%MZ")
    iso_now = datetime.utcnow().isoformat() + "Z"

    # Save to history
    observation = VitalObservation(
        patient_id=patient.id,
        timestamp=timestamp_str,
        heart_rate=obs_in.heart_rate,
        spo2=obs_in.spo2,
        systolic_bp=obs_in.systolic_bp,
        diastolic_bp=obs_in.diastolic_bp,
        respiratory_rate=obs_in.respiratory_rate,
        temperature=obs_in.temperature,
        gcs=obs_in.gcs,
        pain_level=obs_in.pain_level
    )
    db.add(observation)

    # Update patient current readings
    patient.heart_rate = obs_in.heart_rate
    patient.spo2 = obs_in.spo2
    patient.systolic_bp = obs_in.systolic_bp
    patient.diastolic_bp = obs_in.diastolic_bp
    patient.respiratory_rate = obs_in.respiratory_rate
    patient.temperature = obs_in.temperature
    if obs_in.gcs is not None:
        patient.gcs = obs_in.gcs
    if obs_in.pain_level is not None:
        patient.pain_level = obs_in.pain_level
    patient.last_observation_timestamp = iso_now

    # Re-evaluate triage
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

    old_priority = patient.triage_priority
    if triage_res["priority"] != old_priority:
        patient.previous_priority = old_priority
        patient.triage_priority = triage_res["priority"]
        evt = TimelineEvent(
            id=f"EVT-{int(datetime.utcnow().timestamp() * 1000)}",
            zulu_time=datetime.utcnow().strftime("%H:%M:%SZ"),
            category="VITALS",
            title=f"{patient.id} vitals shift auto-triaged to {patient.triage_priority}",
            detail=f"Telemetry: HR {patient.heart_rate}, SpO2 {patient.spo2}%. {triage_res['explanation']}",
            severity="CRITICAL" if patient.triage_priority == "CRITICAL" else "WARNING",
            patient_id=patient.id
        )
        db.add(evt)

    patient.triage_rule_hits = json.dumps(triage_res["rule_hits"])
    patient.triage_explanation = triage_res["explanation"]
    patient.missing_observations = json.dumps(triage_res["missing_observations"])

    db.commit()
    db.refresh(patient)

    payload = patient_to_schema(patient)
    await ws_manager.broadcast({"type": "VITALS_UPDATED", "patient_id": patient.id, "data": payload})
    return payload

@router.get("/{patient_id}/vitals", response_model=List[VitalObservationResponse])
def get_patient_vital_history(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient '{patient_id}' not found")

    observations = db.query(VitalObservation).filter(VitalObservation.patient_id == patient_id).order_by(VitalObservation.id.desc()).all()
    return observations
