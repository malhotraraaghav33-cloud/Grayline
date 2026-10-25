from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Hazard, RoadEdge, TimelineEvent, User
from backend.schemas import HazardCreate, HazardUpdate, HazardResponse
from backend.auth import get_current_user, require_operator_or_admin
from backend.websocket_manager import ws_manager

router = APIRouter(prefix="/hazards", tags=["Hazard Management"])

@router.get("", response_model=List[HazardResponse])
def list_hazards(
    status: Optional[str] = Query(None, description="Filter by ACTIVE or RESOLVED"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Hazard)
    if status and status != "ALL":
        query = query.filter(Hazard.status == status.upper())
    return query.order_by(Hazard.id.asc()).all()

@router.post("", response_model=HazardResponse, status_code=status.HTTP_201_CREATED)
async def create_hazard(
    h_in: HazardCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    count = db.query(Hazard).count()
    code = f"HZ-0{count + 25}"
    h_id = code

    new_hazard = Hazard(
        id=h_id,
        code=code,
        category=h_in.category,
        title=h_in.title,
        location_description=h_in.location_description,
        lat=h_in.lat,
        lng=h_in.lng,
        radius_meters=h_in.radius_meters,
        severity=h_in.severity,
        description=h_in.description,
        reported_timestamp=datetime.utcnow().strftime("%H:%MZ"),
        verification_status="UNVERIFIED",
        status="ACTIVE",
        blocks_road_id=h_in.blocks_road_id,
        estimated_clear_hours=h_in.estimated_clear_hours
    )
    db.add(new_hazard)

    # If hazard closes a road segment, update RoadEdge
    if h_in.blocks_road_id:
        edge = db.query(RoadEdge).filter(RoadEdge.id == h_in.blocks_road_id).first()
        if edge:
            edge.is_blocked = True
            edge.blocked_reason = f"{new_hazard.code}: {new_hazard.title}"
            edge.hazard_id = new_hazard.id

    evt = TimelineEvent(
        id=f"EVT-{int(datetime.utcnow().timestamp() * 1000)}",
        zulu_time=datetime.utcnow().strftime("%H:%M:%SZ"),
        category="HAZARD",
        title=f"New hazard logged: {new_hazard.code} ({new_hazard.title})",
        detail=f"Severity: {new_hazard.severity}. Location: {new_hazard.location_description}. Blocks: {new_hazard.blocks_road_id or 'None'}",
        severity="CRITICAL" if new_hazard.severity == "HIGH" else "WARNING",
        hazard_id=new_hazard.id
    )
    db.add(evt)
    db.commit()
    db.refresh(new_hazard)

    await ws_manager.broadcast({
        "type": "HAZARD_CREATED",
        "data": {
            "id": new_hazard.id,
            "code": new_hazard.code,
            "title": new_hazard.title,
            "severity": new_hazard.severity,
            "status": new_hazard.status,
            "blocks_road_id": new_hazard.blocks_road_id
        }
    })
    return new_hazard

@router.post("/{hazard_id}/verify", response_model=HazardResponse)
async def verify_hazard(
    hazard_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    hazard = db.query(Hazard).filter(Hazard.id == hazard_id).first()
    if not hazard:
        raise HTTPException(status_code=404, detail=f"Hazard '{hazard_id}' not found")

    hazard.verification_status = "VERIFIED"
    hazard.verified_timestamp = datetime.utcnow().strftime("%H:%MZ")
    hazard.verified_by = current_user.full_name or current_user.username

    evt = TimelineEvent(
        id=f"EVT-{int(datetime.utcnow().timestamp() * 1000)}",
        zulu_time=datetime.utcnow().strftime("%H:%M:%SZ"),
        category="HAZARD",
        title=f"{hazard.code} verified by {hazard.verified_by}",
        detail="Recon observation confirmed. Field intelligence authenticated.",
        severity="INFO",
        hazard_id=hazard.id
    )
    db.add(evt)
    db.commit()
    db.refresh(hazard)

    await ws_manager.broadcast({"type": "HAZARD_VERIFIED", "hazard_id": hazard.id})
    return hazard

@router.post("/{hazard_id}/resolve", response_model=HazardResponse)
async def resolve_hazard(
    hazard_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    hazard = db.query(Hazard).filter(Hazard.id == hazard_id).first()
    if not hazard:
        raise HTTPException(status_code=404, detail=f"Hazard '{hazard_id}' not found")

    hazard.status = "RESOLVED"

    # Unblock any associated road segment
    if hazard.blocks_road_id:
        edge = db.query(RoadEdge).filter(RoadEdge.id == hazard.blocks_road_id).first()
        if edge and edge.hazard_id == hazard.id:
            edge.is_blocked = False
            edge.blocked_reason = None
            edge.hazard_id = None

    evt = TimelineEvent(
        id=f"EVT-{int(datetime.utcnow().timestamp() * 1000)}",
        zulu_time=datetime.utcnow().strftime("%H:%M:%SZ"),
        category="HAZARD",
        title=f"{hazard.code} marked RESOLVED",
        detail="Arterial cleared of obstructions. Routing engine restored corridor.",
        severity="SUCCESS",
        hazard_id=hazard.id
    )
    db.add(evt)
    db.commit()
    db.refresh(hazard)

    await ws_manager.broadcast({"type": "HAZARD_RESOLVED", "hazard_id": hazard.id})
    return hazard
