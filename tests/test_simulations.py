import asyncio
import pytest
from fastapi.testclient import TestClient

def test_simulation_start_and_lifecycle(client: TestClient, operator_token: str):
    headers = {"Authorization": f"Bearer {operator_token}"}

    # 1. Start simulation
    resp = client.post(
        "/api/simulations",
        json={"scenario_type": "EMERGENCY_DECOMPENSATION", "idempotency_key": "test-key-01"},
        headers=headers
    )
    assert resp.status_code == 201
    data = resp.json()
    assert "simulation_id" in data
    sim_id = data["simulation_id"]
    assert data["status"] in ["initializing", "running", "completed", "completed_with_warnings"]

    # 2. Query simulation status
    resp_get = client.get(f"/api/simulations/{sim_id}", headers=headers)
    assert resp_get.status_code == 200
    sim_data = resp_get.json()
    assert sim_data["simulation_id"] == sim_id
    assert "stages" in sim_data
    assert "initializing" in sim_data["stages"]
    assert "patient_update" in sim_data["stages"]
    assert "triage_recalculation" in sim_data["stages"]
    assert "road_closure" in sim_data["stages"]
    assert "route_recalculation" in sim_data["stages"]
    assert "gpu_inference" in sim_data["stages"]
    assert isinstance(sim_data["event_log"], list)

def test_simulation_double_click_idempotency(client: TestClient, operator_token: str):
    headers = {"Authorization": f"Bearer {operator_token}"}
    key = "idem-key-double-click-test"

    resp1 = client.post(
        "/api/simulations",
        json={"scenario_type": "EMERGENCY_DECOMPENSATION", "idempotency_key": key},
        headers=headers
    )
    assert resp1.status_code in [200, 201]
    id1 = resp1.json()["simulation_id"]

    # Immediate second call with identical idempotency key
    resp2 = client.post(
        "/api/simulations",
        json={"scenario_type": "EMERGENCY_DECOMPENSATION", "idempotency_key": key},
        headers=headers
    )
    assert resp2.status_code in [200, 201]
    id2 = resp2.json()["simulation_id"]
    assert id1 == id2

def test_simulation_cancel(client: TestClient, operator_token: str):
    headers = {"Authorization": f"Bearer {operator_token}"}
    resp = client.post(
        "/api/simulations",
        json={"scenario_type": "EMERGENCY_DECOMPENSATION"},
        headers=headers
    )
    sim_id = resp.json()["simulation_id"]

    cancel_resp = client.post(
        f"/api/simulations/{sim_id}/cancel",
        json={"reason": "Operator test cancellation"},
        headers=headers
    )
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "cancelled"

def test_simulation_reset_environment(client: TestClient, operator_token: str):
    headers = {"Authorization": f"Bearer {operator_token}"}
    resp = client.post("/api/simulations/reset-environment", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "RESET_SUCCESSFUL"
