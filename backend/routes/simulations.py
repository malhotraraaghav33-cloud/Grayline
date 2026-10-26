import asyncio
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.database import get_db, SessionLocal
from backend.models import SimulationRun, User, RoadEdge, Hazard, Patient
from backend.schemas import (
    SimulationStartRequest,
    SimulationCancelRequest,
    SimulationResponse
)
from backend.auth import get_current_user, require_operator_or_admin
from backend.simulation_orchestrator import (
    start_simulation_task,
    format_simulation_response,
    registry
)
from backend.websocket_manager import ws_manager

router = APIRouter(prefix="/simulations", tags=["Emergency Simulation Orchestrator"])

@router.post("", response_model=SimulationResponse, status_code=status.HTTP_201_CREATED)
async def create_simulation(
    req: SimulationStartRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    """
    Launch an authoritative tactical emergency simulation across all 6 stages:
    1. initializing
    2. patient_update
    3. triage_recalculation
    4. road_closure
    5. route_recalculation
    6. gpu_inference
    """
    # Check if a simulation is already actively running
    active_run = db.query(SimulationRun).filter(
        SimulationRun.status.in_(["initializing", "running"])
    ).order_by(SimulationRun.start_time.desc()).first()

    # Double-click prevention: return active run if started recently
    if active_run:
        # Check idempotency or return active run
        if req.idempotency_key and active_run.idempotency_key == req.idempotency_key:
            return format_simulation_response(active_run)
        
        # If active run is genuinely running right now, return it rather than running conflicting state mutations
        return format_simulation_response(active_run)

    initial_state = start_simulation_task(
        scenario_type=req.scenario_type or "EMERGENCY_DECOMPENSATION",
        patient_id=req.patient_id,
        road_edge_id=req.road_edge_id,
        idempotency_key=req.idempotency_key,
        db=db
    )

    return initial_state

@router.get("", response_model=List[SimulationResponse])
def list_simulations(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    runs = db.query(SimulationRun).order_by(SimulationRun.start_time.desc()).limit(limit).all()
    return [format_simulation_response(run) for run in runs]

@router.get("/{simulation_id}", response_model=SimulationResponse)
def get_simulation(
    simulation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    run = db.query(SimulationRun).filter(SimulationRun.id == simulation_id).first()
    if run:
        return format_simulation_response(run)
    runner = registry.get_runner(simulation_id)
    if runner:
        return runner.to_response()
    raise HTTPException(status_code=404, detail=f"Simulation '{simulation_id}' not found.")

@router.post("/{simulation_id}/cancel")
async def cancel_simulation(
    simulation_id: str,
    req: Optional[SimulationCancelRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    run = db.query(SimulationRun).filter(SimulationRun.id == simulation_id).first()
    runner = registry.get_runner(simulation_id)
    if not run and not runner:
        raise HTTPException(status_code=404, detail=f"Simulation '{simulation_id}' not found.")

    if run and run.status in ["completed", "completed_with_warnings", "failed", "cancelled"]:
        return {
            "simulation_id": simulation_id,
            "status": run.status,
            "message": f"Simulation is already in terminal state '{run.status}'."
        }

    # Request graceful cancellation
    registry.request_cancellation(simulation_id)
    if run:
        run.status = "cancelled"
        run.current_stage = "cancelled"
        run.error_message = req.reason if req else "Operator cancelled simulation."
        db.commit()
    if runner:
        runner.status = "cancelled"
        runner.current_stage = "cancelled"
        runner.error_message = req.reason if req else "Operator cancelled simulation."

    return {
        "simulation_id": simulation_id,
        "status": "cancelled",
        "message": "Simulation cancellation requested successfully."
    }

@router.get("/{simulation_id}/events")
async def stream_simulation_events(
    simulation_id: str,
    db: Session = Depends(get_db)
):
    """
    Server-Sent Events (SSE) stream for real-time stage progress updates.
    """
    run = db.query(SimulationRun).filter(SimulationRun.id == simulation_id).first()
    if not run:
        raise HTTPException(status_code=404, detail=f"Simulation '{simulation_id}' not found.")

    async def event_generator():
        # Yield current status first
        initial_data = format_simulation_response(run)
        yield f"event: current_state\ndata: {json.dumps(initial_data)}\n\n"

        if run.status in ["completed", "completed_with_warnings", "failed", "cancelled"]:
            yield f"event: close\ndata: {{\"status\": \"{run.status}\"}}\n\n"
            return

        queue = registry.subscribe_events(simulation_id)
        try:
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=20.0)
                    yield f"event: {event.get('type', 'message')}\ndata: {json.dumps(event)}\n\n"
                    if event.get("type") in ["SIMULATION_COMPLETED", "SIMULATION_FAILED", "SIMULATION_CANCELLED"]:
                        break
                except asyncio.TimeoutError:
                    # Keep-alive heartbeat comment
                    yield ": heartbeat\n\n"
        finally:
            registry.unsubscribe_events(simulation_id, queue)

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.post("/reset-environment")
async def reset_simulation_environment(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    """
    Helper endpoint to unblock all simulation-injected road blocks and reset target patient.
    """
    blocked_sim_edges = db.query(RoadEdge).filter(
        RoadEdge.blocked_reason.like("%SIMULATION%")
    ).all()

    unblocked_count = len(blocked_sim_edges)
    for edge in blocked_sim_edges:
        edge.is_blocked = False
        edge.blocked_reason = None
        edge.hazard_id = None

    # Remove simulation hazards
    sim_hazards = db.query(Hazard).filter(Hazard.id.like("HZ-SIM-%")).all()
    for h in sim_hazards:
        db.delete(h)

    db.commit()

    await ws_manager.broadcast({
        "type": "SIMULATION_ENVIRONMENT_RESET",
        "unblocked_edges": unblocked_count
    })

    return {
        "status": "RESET_SUCCESSFUL",
        "unblocked_edges_count": unblocked_count,
        "removed_hazards_count": len(sim_hazards)
    }
