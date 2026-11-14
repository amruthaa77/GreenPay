from app.core.security import create_access_token
from app.models.user import User, UserProfile
from app.models.ward import Ward
from app.core.security import hash_meter_for_lookup, encrypt_meter_number, hash_password

def test_citizen_cannot_access_supervisor_or_admin_endpoints(client, test_citizen):
    token = create_access_token(test_citizen.id, test_citizen.role)
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Citizen probing supervisor endpoint
    res_sup = client.get("/api/v1/supervisor/lookup-citizen/GP-999001", headers=headers)
    assert res_sup.status_code == 403
    
    # 2. Citizen probing admin endpoint
    res_adm = client.get("/api/v1/admin/reward-schedules", headers=headers)
    assert res_adm.status_code == 403

def test_supervisor_cannot_access_super_admin_features(client, test_supervisor):
    token = create_access_token(test_supervisor.id, test_supervisor.role)
    headers = {"Authorization": f"Bearer {token}"}
    
    # Supervisor attempting to issue supervisor invite (Super-Admin only)
    res = client.post(
        "/api/v1/admin/invites",
        json={"name": "Attacker", "email": "att@evil.com", "assigned_ward_name": "Koramangala"},
        headers=headers
    )
    assert res.status_code == 403

def test_tenant_data_isolation_between_citizens(client, db_session, test_citizen, seed_wards_and_schedule):
    # Create Citizen B
    meter_b = "BESCOM-IND-TEST02"
    user_b = User(
        meter_number_hash=hash_meter_for_lookup(meter_b),
        meter_number_encrypted=encrypt_meter_number(meter_b),
        greenpay_id="GP-999002",
        password_hash=hash_password("Password123!"),
        role="CITIZEN",
        status="ACTIVE",
        is_adult_declared=True
    )
    db_session.add(user_b)
    db_session.flush()
    profile_b = UserProfile(
        user_id=user_b.id,
        name="Citizen B",
        ward_id=seed_wards_and_schedule["Koramangala"].id,
        green_score=90.0
    )
    db_session.add(profile_b)
    db_session.commit()
    
    # Authenticate as Citizen A
    token_a = create_access_token(test_citizen.id, test_citizen.role)
    headers_a = {"Authorization": f"Bearer {token_a}"}
    
    # Citizen A views profile
    res = client.get("/api/v1/citizen/profile", headers=headers_a)
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == test_citizen.id
    assert data["greenpay_id"] == "GP-999001"
    # Never exposes Citizen B's data
    assert data["id"] != user_b.id
