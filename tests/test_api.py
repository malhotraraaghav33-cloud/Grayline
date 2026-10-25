import pytest

def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database_connected"] is True
    assert data["demo_mode"] is True

def test_list_patients(client, viewer_headers):
    response = client.get("/api/patients", headers=viewer_headers)
    assert response.status_code == 200
    patients = response.json()
    assert len(patients) >= 20
    assert any(p["id"] == "P-104" for p in patients)

def test_create_and_update_patient(client, operator_headers):
    new_patient = {
        "id": "P-999-TEST",
        "incident_id": "INC-07-TEST",
        "callsign": "Test 1-1",
        "injury_summary": "Test shrapnel laceration to thigh",
        "heart_rate": 115,
        "spo2": 95,
        "systolic_bp": 110,
        "diastolic_bp": 70,
        "respiratory_rate": 18,
        "temperature": 37.0,
        "gcs": 15,
        "pain_level": 6,
        "tourniquet_applied": False,
        "lat": 34.2100,
        "lng": -118.4500,
        "location_name": "Sector 4 Test Rally Point"
    }
    create_res = client.post("/api/patients", headers=operator_headers, json=new_patient)
    assert create_res.status_code == 201
    created_data = create_res.json()
    assert created_data["id"] == "P-999-TEST"

    # Update patient vitals to critical
    update_res = client.patch("/api/patients/P-999-TEST", headers=operator_headers, json={
        "spo2": 85  # Severe hypoxia
    })
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["spo2"] == 85
    assert updated_data["triage_priority"] == "CRITICAL"

def test_viewer_cannot_create_patient(client, viewer_headers):
    # Authorization test: viewer role has read-only access
    response = client.post("/api/patients", headers=viewer_headers, json={
        "id": "P-UNAUTH",
        "incident_id": "INC-07",
        "injury_summary": "Test injury",
        "heart_rate": 80,
        "spo2": 98,
        "systolic_bp": 120,
        "diastolic_bp": 80,
        "respiratory_rate": 16,
        "temperature": 37.0,
        "lat": 34.2,
        "lng": -118.4,
        "location_name": "Test Point"
    })
    assert response.status_code == 403

def test_hazard_lifecycle_and_verification(client, operator_headers):
    # 1. Create hazard that blocks road RD-01
    haz_res = client.post("/api/hazards", headers=operator_headers, json={
        "title": "Fallen Power Lines",
        "category": "POWER_GRID",
        "severity": "HIGH",
        "location_description": "South Approach Junction",
        "lat": 34.175,
        "lng": -118.505,
        "radius_meters": 150,
        "description": "High voltage live cables across highway",
        "blocks_road_id": "RD-01"
    })
    assert haz_res.status_code == 201
    h_data = haz_res.json()
    h_id = h_data["id"]
    assert h_data["verification_status"] == "UNVERIFIED"

    # 2. Verify hazard
    verify_res = client.post(f"/api/hazards/{h_id}/verify", headers=operator_headers)
    assert verify_res.status_code == 200
    assert verify_res.json()["verification_status"] == "VERIFIED"

    # 3. Resolve hazard
    resolve_res = client.post(f"/api/hazards/{h_id}/resolve", headers=operator_headers)
    assert resolve_res.status_code == 200
    assert resolve_res.json()["status"] == "RESOLVED"

def test_facility_capacity_and_surge(client, viewer_headers):
    response = client.get("/api/facilities", headers=viewer_headers)
    assert response.status_code == 200
    facilities = response.json()
    assert len(facilities) == 4
    med01 = next(f for f in facilities if f["id"] == "MED-01")
    assert med01["total_capacity"] == 25
    assert med01["occupied_beds"] == 21

def test_incident_status_and_mascal(client, operator_headers):
    # Read status
    status_res = client.get("/api/incidents/status", headers=operator_headers)
    assert status_res.status_code == 200
    assert "mascal_active" in status_res.json()

    # Toggle MASCAL
    toggle_res = client.post("/api/incidents/mascal", headers=operator_headers, json={
        "declare": True,
        "declared_by": "MAJ. V. CHEN"
    })
    assert toggle_res.status_code == 200
    assert toggle_res.json()["mascal_active"] is True

def test_sitrep_csv_export(client, viewer_headers):
    response = client.get("/api/reports/csv", headers=viewer_headers)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    csv_text = response.text
    assert "Patient ID" in csv_text
    assert "P-104" in csv_text

def test_gpu_inference_status_endpoint(client, viewer_headers):
    response = client.get("/api/inference/status", headers=viewer_headers)
    assert response.status_code == 200
    data = response.json()
    assert "gpu_service_configured" in data
    assert data["validation_status"] == "UNVALIDATED_DEMO_ALGORITHM"
