import json
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import MedicalFacility, User
from backend.schemas import FacilityResponse, FacilityUpdate
from backend.auth import get_current_user, require_operator_or_admin
from backend.websocket_manager import ws_manager

router = APIRouter(prefix="/facilities", tags=["Medical Facilities"])

def facility_to_schema(f: MedicalFacility) -> dict:
    return {
        "id": f.id,
        "code": f.code,
        "name": f.name,
        "type": f.type,
        "lat": f.lat,
        "lng": f.lng,
        "total_capacity": f.total_capacity,
        "occupied_beds": f.occupied_beds,
        "icu_capacity": f.icu_capacity,
        "icu_occupied": f.icu_occupied,
        "surgical_theaters": f.surgical_theaters,
        "blood_units_available": f.blood_units_available,
        "status": f.status,
        "receiving_status": f.receiving_status,
        "specialties": json.loads(f.specialties or "[]"),
        "last_updated": f.last_updated
    }

@router.get("", response_model=List[FacilityResponse])
def list_facilities(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    facilities = db.query(MedicalFacility).order_by(MedicalFacility.id.asc()).all()
    return [facility_to_schema(f) for f in facilities]

@router.patch("/{facility_id}", response_model=FacilityResponse)
async def update_facility(
    facility_id: str,
    update_in: FacilityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    fac = db.query(MedicalFacility).filter(MedicalFacility.id == facility_id).first()
    if not fac:
        raise HTTPException(status_code=404, detail=f"Facility '{facility_id}' not found")

    if update_in.occupied_beds is not None:
        fac.occupied_beds = max(0, min(fac.total_capacity, update_in.occupied_beds))
    if update_in.icu_occupied is not None:
        fac.icu_occupied = max(0, min(fac.icu_capacity, update_in.icu_occupied))
    if update_in.receiving_status is not None:
        fac.receiving_status = update_in.receiving_status
    if update_in.status is not None:
        fac.status = update_in.status

    fac.last_updated = datetime.utcnow().strftime("%H:%MZ")
    db.commit()
    db.refresh(fac)

    payload = facility_to_schema(fac)
    await ws_manager.broadcast({"type": "FACILITY_UPDATED", "data": payload})
    return payload
