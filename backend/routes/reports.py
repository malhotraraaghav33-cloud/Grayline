import csv
import io
from datetime import datetime
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Patient, MedicalFacility, Hazard, TimelineEvent, IncidentStatus, User
from backend.auth import get_current_user

router = APIRouter(prefix="/reports", tags=["Reporting & SITREP"])

@router.get("/summary")
def get_report_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    total = db.query(Patient).count()
    crit = db.query(Patient).filter(Patient.triage_priority == "CRITICAL").count()
    prio = db.query(Patient).filter(Patient.triage_priority == "PRIORITY").count()
    stbl = db.query(Patient).filter(Patient.triage_priority == "STABLE").count()

    waiting = db.query(Patient).filter(Patient.status == "WAITING_TRIAGE").count()
    triaged = db.query(Patient).filter(Patient.status == "TRIAGED").count()
    evac_pending = db.query(Patient).filter(Patient.status == "EVAC_PENDING").count()
    en_route = db.query(Patient).filter(Patient.status == "EN_ROUTE").count()
    delivered = db.query(Patient).filter(Patient.status == "DELIVERED").count()

    facilities = db.query(MedicalFacility).all()
    total_beds = sum(f.total_capacity for f in facilities)
    occupied_beds = sum(f.occupied_beds for f in facilities)

    hazards = db.query(Hazard).filter(Hazard.status == "ACTIVE").all()
    roadblocks = [h for h in hazards if h.blocks_road_id]

    inc = db.query(IncidentStatus).first()

    return {
        "report_id": f"SITREP-{datetime.utcnow().strftime('%Y%m%d-%H%M')}",
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "generated_by": current_user.full_name or current_user.username,
        "mascal_active": inc.mascal_active if inc else False,
        "casualty_metrics": {
            "total": total,
            "critical": crit,
            "priority": prio,
            "stable": stbl,
            "pipeline": {
                "waiting_triage": waiting,
                "triaged": triaged,
                "evac_pending": evac_pending,
                "en_route": en_route,
                "delivered": delivered
            }
        },
        "facility_metrics": {
            "total_beds": total_beds,
            "occupied_beds": occupied_beds,
            "occupancy_rate_percent": round((occupied_beds / max(1, total_beds)) * 100, 1)
        },
        "hazard_metrics": {
            "active_hazards": len(hazards),
            "roadblocks": len(roadblocks)
        }
    }

@router.get("/csv")
def export_sitrep_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

    writer.writerow([
        "Patient ID",
        "Callsign",
        "Incident ID",
        "Triage Priority",
        "Status",
        "Heart Rate (BPM)",
        "SpO2 (%)",
        "Systolic BP (mmHg)",
        "Diastolic BP (mmHg)",
        "Respiratory Rate (/min)",
        "Temp (C)",
        "GCS",
        "Pain (0-10)",
        "Tourniquet",
        "Location",
        "Assigned Facility",
        "Assigned Transport",
        "Review Status",
        "Reviewed By",
        "Clinical Explanation",
        "Last Observation"
    ])

    patients = db.query(Patient).all()
    for p in patients:
        writer.writerow([
            p.id,
            p.callsign or "",
            p.incident_id,
            p.triage_priority,
            p.status,
            p.heart_rate,
            p.spo2,
            p.systolic_bp,
            p.diastolic_bp,
            p.respiratory_rate,
            p.temperature,
            p.gcs,
            p.pain_level,
            f"YES ({p.tourniquet_elapsed_mins}m)" if p.tourniquet_applied else "NO",
            p.location_name,
            p.assigned_facility_id or "UNASSIGNED",
            p.assigned_transport or "NONE",
            p.review_status,
            p.reviewed_by or "",
            p.triage_explanation or "",
            p.last_observation_timestamp
        ])

    csv_data = output.getvalue()
    filename = f"GRAYLINE_SITREP_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
