import pytest

def test_vitals_validation_out_of_bounds_spo2(client, operator_headers):
    # SpO2 > 100 should be rejected by Pydantic
    response = client.post("/api/patients/P-104/vitals", headers=operator_headers, json={
        "heart_rate": 110,
        "spo2": 105,  # Invalid: > 100
        "systolic_bp": 120,
        "diastolic_bp": 80,
        "respiratory_rate": 16,
        "temperature": 37.0
    })
    assert response.status_code == 422
    assert "spo2" in str(response.json())

def test_vitals_validation_diastolic_greater_than_systolic(client, operator_headers):
    # Diastolic BP cannot exceed Systolic BP
    response = client.post("/api/patients/P-104/vitals", headers=operator_headers, json={
        "heart_rate": 80,
        "spo2": 98,
        "systolic_bp": 90,
        "diastolic_bp": 120,  # Invalid: diastolic > systolic
        "respiratory_rate": 16,
        "temperature": 37.0
    })
    assert response.status_code == 422
    assert "Diastolic blood pressure cannot exceed systolic" in str(response.json())

def test_vitals_validation_negative_heart_rate(client, operator_headers):
    response = client.post("/api/patients/P-104/vitals", headers=operator_headers, json={
        "heart_rate": -10,  # Invalid
        "spo2": 95,
        "systolic_bp": 110,
        "diastolic_bp": 70,
        "respiratory_rate": 14,
        "temperature": 36.8
    })
    assert response.status_code == 422
