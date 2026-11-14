import pytest
from app.core.security import create_access_token
from app.models.user import User

def test_citizen_login_and_bearer_auth(client, test_citizen, seed_wards_and_schedule):
    client.cookies.clear()
    
    # 1. Login with citizen meter
    res = client.post("/api/v1/auth/login", json={
        "meter_number_or_email": "BESCOM-IND-TEST01",
        "password": "Password123!"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "CITIZEN"
    token = data["access_token"]
    
    # Clear client cookies to prove Bearer token works without cookies
    client.cookies.clear()
    
    # 2. Access profile via Bearer header
    prof_res = client.get("/api/v1/citizen/profile", headers={"Authorization": f"Bearer {token}"})
    assert prof_res.status_code == 200
    assert prof_res.json()["name"] == "Test Citizen"

def test_supervisor_login_and_bearer_auth(client, test_supervisor, seed_wards_and_schedule):
    client.cookies.clear()
    
    # 1. Login supervisor
    res = client.post("/api/v1/auth/admin-login", json={
        "meter_number_or_email": "supervisor.test@greenpay.blr",
        "password": "AdminSecret123!"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "SUPERVISOR"
    token = data["access_token"]
    
    client.cookies.clear()
    
    # 2. Access /auth/me via Bearer header
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["role"] == "SUPERVISOR"

def test_admin_login_and_bearer_auth(client, test_super_admin, seed_wards_and_schedule):
    client.cookies.clear()
    
    # 1. Login admin
    res = client.post("/api/v1/auth/admin-login", json={
        "meter_number_or_email": "admin.test@greenpay.blr",
        "password": "AdminSecret123!"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "SUPER_ADMIN"
    token = data["access_token"]
    
    client.cookies.clear()
    
    # 2. Access /auth/me via Bearer header
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["role"] == "SUPER_ADMIN"

def test_invalid_credentials_rejected(client, test_citizen):
    client.cookies.clear()
    res = client.post("/api/v1/auth/login", json={
        "meter_number_or_email": "BESCOM-IND-TEST01",
        "password": "CompletelyWrongPassword123!"
    })
    assert res.status_code == 401
    assert "Invalid credentials" in res.json().get("detail", "")

def test_citizen_cannot_use_admin_login(client, test_citizen):
    client.cookies.clear()
    res = client.post("/api/v1/auth/admin-login", json={
        "meter_number_or_email": "BESCOM-IND-TEST01",
        "password": "Password123!"
    })
    assert res.status_code == 403
    assert "Access restricted" in res.json().get("detail", "")

def test_unauthenticated_request_blocked(client):
    client.cookies.clear()
    res = client.get("/api/v1/citizen/profile")
    assert res.status_code == 401
