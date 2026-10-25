import pytest

def test_login_success(client):
    response = client.post("/api/auth/login", json={
        "username": "operator",
        "password": "tacmed_operator_pass"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "operator"
    assert data["username"] == "operator"

def test_login_invalid_password(client):
    response = client.post("/api/auth/login", json={
        "username": "operator",
        "password": "wrong_password"
    })
    assert response.status_code == 401

def test_read_me_with_token(client, operator_headers):
    response = client.get("/api/auth/me", headers=operator_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "operator"
    assert data["role"] == "operator"

def test_read_me_unauthorized(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401
