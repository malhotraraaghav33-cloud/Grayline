from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import IncidentStatus, Patient, Hazard, TimelineEvent, User
from backend.schemas import IncidentStatusResponse, MascalToggleRequest, TimelineEventResponse
from backend.auth import get_current_user, require_operator_or_admin
from backend.websocket_manager import ws_manager

router = APIRouter(prefix="/incidents", tags=["Incident Command & Timeline"])

@router.get("/status", response_model=IncidentStatusResponse)
def get_incident_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inc = db.query(IncidentStatus).first()
    if not inc:
        inc = IncidentStatus(
            code="INC-07-TACTICAL",
            title="FIELD RESPONSE 07 // SECTOR 4",
            mascal_active=False
        )
        db.add(inc)
        db.commit()

    total_patients = db.query(Patient).count()
    crit_count = db.query(Patient).filter(Patient.triage_priority == "CRITICAL").count()
    prio_count = db.query(Patient).filter(Patient.triage_priority == "PRIORITY").count()
    stbl_count = db.query(Patient).filter(Patient.triage_priority == "STABLE").count()
    hazards_count = db.query(Hazard).filter(Hazard.status == "ACTIVE").count()

    return IncidentStatusResponse(
        code=inc.code,
        title=inc.title,
        mascal_active=inc.mascal_active,
        declared_by=inc.declared_by,
        declared_at=inc.declared_at,
        sys_net_security=inc.sys_net_security or "SECURE // 99.8%",
        total_patients=total_patients,
        critical_count=crit_count,
        priority_count=prio_count,
        stable_count=stbl_count,
        active_hazards_count=hazards_count
    )

@router.post("/mascal", response_model=IncidentStatusResponse)
async def toggle_mascal(
    req: MascalToggleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    inc = db.query(IncidentStatus).first()
    if not inc:
        inc = IncidentStatus(code="INC-07-TACTICAL", title="FIELD RESPONSE 07 // SECTOR 4")
        db.add(inc)

    inc.mascal_active = req.declare
    inc.declared_by = req.declared_by or current_user.full_name or current_user.username
    inc.declared_at = datetime.utcnow().strftime("%H:%MZ") if req.declare else None

    evt = TimelineEvent(
        id=f"EVT-{int(datetime.utcnow().timestamp() * 1000)}",
        zulu_time=datetime.utcnow().strftime("%H:%M:%SZ"),
        category="MASCAL",
        title="🚨 MASS CASUALTY (MASCAL) DECLARED" if req.declare else "MASCAL STAND-DOWN CONFIRMED",
        detail=f"Posture changed by {inc.declared_by}. Aeromedical priority corridor escalation {'ACTIVE' if req.declare else 'NORMALIZED'}.",
        severity="CRITICAL" if req.declare else "SUCCESS"
    )
    db.add(evt)
    db.commit()
    db.refresh(inc)

    status_resp = get_incident_status(db=db, current_user=current_user)
    await ws_manager.broadcast({"type": "MASCAL_STATUS_CHANGED", "data": status_resp.model_dump()})
    return status_resp

@router.get("/timeline", response_model=List[TimelineEventResponse])
def get_timeline(
    category: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(TimelineEvent)
    if category and category != "ALL":
        query = query.filter(TimelineEvent.category == category.upper())
    if severity and severity != "ALL":
        query = query.filter(TimelineEvent.severity == severity.upper())

    events = query.order_by(TimelineEvent.timestamp.desc()).limit(limit).all()
    return [
        TimelineEventResponse(
            id=e.id,
            timestamp=e.timestamp.isoformat() if e.timestamp else "",
            zulu_time=e.zulu_time,
            category=e.category,
            title=e.title,
            detail=e.detail,
            severity=e.severity,
            patient_id=e.patient_id,
            facility_id=e.facility_id,
            hazard_id=e.hazard_id
        )
        for e in events
    ]
