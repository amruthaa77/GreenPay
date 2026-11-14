import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from app.models.invite import SupervisorInvite
from app.models.user import User

def test_citizen_registration_success(client, seed_wards_and_schedule):
    payload = {
        "meter_number": "BESCOM-IND-778899",
        "password": "SecurePassword123!",
        "name": "Ananya Sen",
        "ward_name": "Koramangala",
        "is_adult_declared": True,
        "terms_privacy_consent": True,
        "marketing_consent": False,
        "email": "ananya@greenpay.blr"
    }
    res = client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["role"] == "CITIZEN"
    assert data["user_status"] == "PENDING" # Pending doorstep verification
    assert data["greenpay_id"].startswith("GP-")
    assert "access_token" in data
    assert "csrf_token" in data
    assert data["masked_meter"] == "BESCOM-***-8899"

def test_minor_registration_blocked(client, seed_wards_and_schedule):
    payload = {
        "meter_number": "BESCOM-IND-999000",
        "password": "SecurePassword123!",
        "name": "Minor Citizen",
        "ward_name": "Koramangala",
        "is_adult_declared": False, # Minor!
        "terms_privacy_consent": True
    }
    res = client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == 400
    assert "DPDP Act 2023 Section 9" in res.json()["detail"]

def test_duplicate_meter_registration_conflict(client, test_citizen):
    payload = {
        "meter_number": "BESCOM-IND-TEST01", # Existing meter
        "password": "AnotherPassword123!",
        "name": "Duplicate Person",
        "ward_name": "Koramangala",
        "is_adult_declared": True,
        "terms_privacy_consent": True
    }
    res = client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == 409
    assert "already registered" in res.json()["detail"]

def test_supervisor_single_use_expiring_invite(client, db_session, seed_wards_and_schedule, test_super_admin):
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    
    # 1. Create invite expiring in 48 hours
    invite = SupervisorInvite(
        token_hash=token_hash,
        email="new.supervisor@greenpay.blr",
        name="Sunil Kumar",
        assigned_ward_id=seed_wards_and_schedule["Indiranagar"].id,
        created_by_id=test_super_admin.id,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=48),
        used=False
    )
    db_session.add(invite)
    db_session.commit()
    
    # 2. Accept invite
    accept_res = client.post("/api/v1/auth/accept-invite", json={
        "token": raw_token,
        "password": "SupervisorSecret123!"
    })
    assert accept_res.status_code == 200
    data = accept_res.json()
    assert data["role"] == "SUPERVISOR"
    assert data["user_status"] == "ACTIVE"
    assert data["ward_name"] == "Indiranagar"
    
    # 3. Attempting to redeem the same token again must fail (single-use)
    replay_res = client.post("/api/v1/auth/accept-invite", json={
        "token": raw_token,
        "password": "SupervisorSecret123!"
    })
    assert replay_res.status_code == 400
    assert "already been redeemed" in replay_res.json()["detail"]
