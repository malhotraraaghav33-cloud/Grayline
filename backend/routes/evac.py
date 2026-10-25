from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import RoadNode, RoadEdge, TimelineEvent, User
from backend.schemas import RouteRequest, RouteResponse
from backend.auth import get_current_user, require_operator_or_admin
from backend.routing import TacticalRoutingEngine
from backend.websocket_manager import ws_manager

router = APIRouter(prefix="/evac", tags=["Evacuation Logistics & Routing"])

@router.post("/route", response_model=RouteResponse)
def compute_route(
    req: RouteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    router_engine = TacticalRoutingEngine(db)
    result = router_engine.calculate_route(
        origin_id=req.origin_id,
        destination_id=req.destination_id,
        avoid_blocked=req.avoid_blocked
    )
    return RouteResponse(**result)

@router.get("/roads")
def list_road_edges(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    edges = db.query(RoadEdge).all()
    return [
        {
            "id": e.id,
            "from_node_id": e.from_node_id,
            "to_node_id": e.to_node_id,
            "name": e.name,
            "distance_km": e.distance_km,
            "speed_limit_kmh": e.speed_limit_kmh,
            "is_blocked": e.is_blocked,
            "blocked_reason": e.blocked_reason,
            "hazard_id": e.hazard_id,
            "surface_type": e.surface_type
        }
        for e in edges
    ]

@router.get("/nodes")
def list_road_nodes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    nodes = db.query(RoadNode).all()
    return [
        {
            "id": n.id,
            "name": n.name,
            "lat": n.lat,
            "lng": n.lng,
            "elevation_meters": n.elevation_meters,
            "is_facility": n.is_facility,
            "facility_id": n.facility_id
        }
        for n in nodes
    ]

@router.post("/roads/{edge_id}/toggle")
async def toggle_road_status(
    edge_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    edge = db.query(RoadEdge).filter(RoadEdge.id == edge_id).first()
    if not edge:
        raise HTTPException(status_code=404, detail=f"Road edge '{edge_id}' not found")

    edge.is_blocked = not edge.is_blocked
    if edge.is_blocked:
        edge.blocked_reason = f"Closed by command order ({current_user.username})"
    else:
        edge.blocked_reason = None
        edge.hazard_id = None

    db.commit()
    db.refresh(edge)

    await ws_manager.broadcast({
        "type": "ROAD_STATUS_CHANGED",
        "edge_id": edge.id,
        "is_blocked": edge.is_blocked
    })

    return {
        "id": edge.id,
        "name": edge.name,
        "is_blocked": edge.is_blocked,
        "blocked_reason": edge.blocked_reason
    }
