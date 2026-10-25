import json
from datetime import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Patient, TimelineEvent, User
from backend.schemas import TriageEvaluationRequest, TriageEvaluationResponse, TriageCertifyRequest, PatientResponse
from backend.auth import get_current_user, require_operator_or_admin
from backend.triage import evaluate_patient_triage, TRIAGE_RULES_CATALOG
from backend.websocket_manager import ws_manager
from backend.routes.patients import patient_to_schema

router = APIRouter(prefix="/triage", tags=["Explainable Triage Engine"])

@router.get("/rules", response_model=List[Dict[str, Any]])
def list_triage_rules(current_user: User = Depends(get_current_user)):
    """Returns the full transparent rule catalog configured for demonstration."""
    return TRIAGE_RULES_CATALOG

@router.post("/evaluate", response_model=TriageEvaluationResponse)
def evaluate_observations(
    payload: TriageEvaluationRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Evaluates raw vital parameters through the deterministic demo rules engine.
    Always includes explanation and human review requirement disclaimer.
    """
    res = evaluate_patient_triage(
        heart_rate=payload.heart_rate,
        spo2=payload.spo2,
        systolic_bp=payload.systolic_bp,
        diastolic_bp=payload.diastolic_bp,
        respiratory_rate=payload.respiratory_rate,
        temperature=payload.temperature,
        gcs=payload.gcs,
        pain_level=payload.pain_level,
        tourniquet_applied=payload.tourniquet_applied or False,
        tourniquet_elapsed_mins=payload.tourniquet_elapsed_mins or 0
    )

    return TriageEvaluationResponse(
        priority=res["priority"],
        rule_hits=res["rule_hits"],
        explanation=res["explanation"],
        missing_observations=res["missing_observations"],
        is_clinically_certified=False,
        certification_notice="DEMONSTRATION ONLY: Not clinically certified. Requires human medical review."
    )

@router.post("/patients/{patient_id}/certify", response_model=PatientResponse)
async def certify_patient_triage(
    patient_id: str,
    cert_req: TriageCertifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient '{patient_id}' not found")

    old_pri = patient.triage_priority
    if cert_req.override_priority:
        patient.previous_priority = old_pri
        patient.triage_priority = cert_req.override_priority
        patient.review_status = "OVERRIDDEN"
    else:
        patient.review_status = "VERIFIED"

    patient.reviewed_by = cert_req.reviewer_name or current_user.full_name or current_user.username
    patient.reviewed_at = datetime.utcnow().strftime("%H:%MZ")

    evt = TimelineEvent(
        id=f"EVT-{int(datetime.utcnow().timestamp() * 1000)}",
        zulu_time=datetime.utcnow().strftime("%H:%M:%SZ"),
        category="TRIAGE",
        title=f"{patient.id} triage certified by {patient.reviewed_by}",
        detail=f"Status: {patient.review_status}. Priority: {patient.triage_priority}. Notes: {cert_req.clinical_notes or 'Standard assessment certified.'}",
        severity="INFO",
        patient_id=patient.id
    )
    db.add(evt)
    db.commit()
    db.refresh(patient)

    payload = patient_to_schema(patient)
    await ws_manager.broadcast({"type": "TRIAGE_CERTIFIED", "data": payload})
    return payload
