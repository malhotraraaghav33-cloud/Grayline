import pytest
from backend.triage import evaluate_patient_triage

def test_triage_severe_hypoxia_rule01():
    res = evaluate_patient_triage(
        heart_rate=88,
        spo2=86,  # <90%
        systolic_bp=120,
        diastolic_bp=80,
        respiratory_rate=18
    )
    assert res["priority"] == "CRITICAL"
    assert "RULE-01" in res["rule_hits"]
    assert "SpO2 86%" in res["explanation"]

def test_triage_shock_rule03():
    res = evaluate_patient_triage(
        heart_rate=135,
        spo2=96,
        systolic_bp=82,  # Shock: SBP < 90 and HR > 120
        diastolic_bp=50,
        respiratory_rate=22
    )
    assert res["priority"] == "CRITICAL"
    assert "RULE-03" in res["rule_hits"]

def test_triage_missing_observations_penalty():
    # When multiple observations are missing, priority must be flagged as PRIORITY with alert
    res = evaluate_patient_triage(
        heart_rate=75,
        spo2=None,
        systolic_bp=None,
        diastolic_bp=None,
        respiratory_rate=None
    )
    assert res["priority"] == "PRIORITY"
    assert "ALERT-MISSING-DATA" in res["rule_hits"]
    assert len(res["missing_observations"]) >= 2

def test_triage_normal_stable_baseline_rule09():
    res = evaluate_patient_triage(
        heart_rate=72,
        spo2=99,
        systolic_bp=120,
        diastolic_bp=80,
        respiratory_rate=14
    )
    assert res["priority"] == "STABLE"
    assert "RULE-09" in res["rule_hits"]

def test_triage_api_endpoint(client, viewer_headers):
    response = client.post("/api/triage/evaluate", headers=viewer_headers, json={
        "heart_rate": 138,
        "spo2": 88,
        "systolic_bp": 82,
        "diastolic_bp": 54,
        "respiratory_rate": 28
    })
    assert response.status_code == 200
    data = response.json()
    assert data["priority"] == "CRITICAL"
    assert "RULE-01" in data["rule_hits"]
    assert not data["is_clinically_certified"]
    assert "Not clinically certified" in data["certification_notice"]
