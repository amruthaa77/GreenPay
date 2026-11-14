import uuid
from app.core.security import create_access_token
from app.models.user import User, UserProfile
from app.models.credit_ledger import CreditTransaction
from app.core.security import hash_meter_for_lookup, encrypt_meter_number, hash_password

def test_pending_citizen_cannot_receive_credits_until_activated(client, db_session, test_supervisor, seed_wards_and_schedule):
    # 1. Create a PENDING citizen
    meter = "BESCOM-IND-PENDING-01"
    user_pending = User(
        meter_number_hash=hash_meter_for_lookup(meter),
        meter_number_encrypted=encrypt_meter_number(meter),
        greenpay_id="GP-777001",
        password_hash=hash_password("Password123!"),
        role="CITIZEN",
        status="PENDING", # Pending doorstep activation
        is_adult_declared=True
    )
    db_session.add(user_pending)
    db_session.flush()
    profile = UserProfile(
        user_id=user_pending.id,
        name="Pending Citizen",
        ward_id=seed_wards_and_schedule["Koramangala"].id,
        green_score=50.0
    )
    db_session.add(profile)
    db_session.commit()
    
    sup_token = create_access_token(test_supervisor.id, test_supervisor.role)
    headers = {"Authorization": f"Bearer {sup_token}"}
    
    # 2. Supervisor attempts to issue credits to PENDING citizen -> Must be rejected (HTTP 400)
    weighment_payload = {
        "greenpay_id": "GP-777001",
        "dry_kg": 4.0,
        "wet_kg": 5.0,
        "hazardous_kg": 0.0,
        "ewaste_kg": 0.0
    }
    res_rejected = client.post("/api/v1/supervisor/weighment", json=weighment_payload, headers=headers)
    assert res_rejected.status_code == 400
    assert "pending doorstep identity confirmation" in res_rejected.json()["detail"]
    
    # Assert zero credit transactions exist
    tx_count = db_session.query(CreditTransaction).filter(CreditTransaction.user_id == user_pending.id).count()
    assert tx_count == 0
    
    # 3. Supervisor confirms citizen identity at doorstep
    res_activate = client.post("/api/v1/supervisor/activate-citizen/GP-777001", headers=headers)
    assert res_activate.status_code == 200
    assert res_activate.json()["status"] == "ACTIVE"
    
    # Verify DB status
    db_session.refresh(user_pending)
    assert user_pending.status == "ACTIVE"
    
    # 4. Supervisor logs collection for now-ACTIVE citizen -> Must succeed
    idempotency_key = str(uuid.uuid4())
    weighment_payload["idempotency_key"] = idempotency_key
    res_success = client.post("/api/v1/supervisor/weighment", json=weighment_payload, headers=headers)
    assert res_success.status_code == 200
    data = res_success.json()
    assert data["total_weight_kg"] == 9.0
    assert data["credits_earned"] == 65.0 # (4*10) + (5*5) = 65 credits
    
    # 5. Idempotent sync test: re-submitting with identical idempotency key does not duplicate credits
    res_duplicate = client.post("/api/v1/supervisor/weighment", json=weighment_payload, headers=headers)
    assert res_duplicate.status_code == 200
    assert res_duplicate.json()["id"] == data["id"]
    
    tx_after = db_session.query(CreditTransaction).filter(CreditTransaction.user_id == user_pending.id).all()
    assert len(tx_after) == 1
