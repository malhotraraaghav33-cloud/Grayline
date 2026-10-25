import pytest
from backend.routing import TacticalRoutingEngine

def test_routing_normal_viable_route(db_session):
    engine = TacticalRoutingEngine(db_session)
    route = engine.calculate_route(origin_id="CAS-104", destination_id="MED-01", avoid_blocked=True)
    assert route["is_viable"] is True
    assert route["total_distance_km"] > 0
    assert "MED-01" in route["path_node_ids"]
    assert len(route["path_coordinates"]) > 1

def test_routing_hazard_bypass_rerouting(db_session):
    # Route from CAS-104 to MED-02 passes near the blocked HWY 12 Bridge.
    # With avoid_blocked=True, it should divert via Bypass 4C.
    engine = TacticalRoutingEngine(db_session)
    route = engine.calculate_route(origin_id="CAS-104", destination_id="MED-02", avoid_blocked=True)
    assert route["is_viable"] is True
    assert route["used_bypass"] is True
    assert "DIVERSION ACTIVE" in route["explanation"]
    assert "HZ-021" in route["avoided_hazards"]

def test_routing_unreachable_node(db_session):
    engine = TacticalRoutingEngine(db_session)
    # ISOLATED-OUTPOST-X has no connected road edges
    route = engine.calculate_route(origin_id="CAS-104", destination_id="ISOLATED-OUTPOST-X", avoid_blocked=True)
    assert route["is_viable"] is False
    assert "NO VIABLE GROUND CORRIDOR" in route["explanation"]

def test_routing_api_endpoint(client, viewer_headers):
    response = client.post("/api/evac/route", headers=viewer_headers, json={
        "origin_id": "CAS-104",
        "destination_id": "MED-01",
        "avoid_blocked": True
    })
    assert response.status_code == 200
    data = response.json()
    assert data["is_viable"] is True
    assert data["total_distance_km"] > 0
