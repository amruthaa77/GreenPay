import pytest
from app.core.security import create_access_token, hash_password
from app.models.user import User, UserProfile
from app.models.waste import WasteEntry
from app.models.credit_ledger import CreditTransaction
from app.models.dry_waste import DryWasteCategory, WasteCollectionItem

def test_citizen_points_balance_and_weight(client, test_citizen, test_supervisor, seed_wards_and_schedule, db_session):
    client.cookies.clear()
    token = create_access_token(test_citizen.id, test_citizen.role)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a verified dry waste collection with 2 categories for test_citizen
    pet_cat = db_session.query(DryWasteCategory).filter(DryWasteCategory.code == "pet_bottles").first()
    card_cat = db_session.query(DryWasteCategory).filter(DryWasteCategory.code == "cardboard").first()

    entry = WasteEntry(
        transaction_id="GP-REC-STAGE6-TEST01",
        user_id=test_citizen.id,
        supervisor_id=test_supervisor.id,
        ward_id=seed_wards_and_schedule["Koramangala"].id,
        dry_kg=5.0,
        total_weight_kg=5.0,
        journey_stage="Processing",
        dispute_status="CONFIRMED"
    )
    db_session.add(entry)
    db_session.flush()

    db_session.add(WasteCollectionItem(
        waste_entry_id=entry.id,
        category_id=pet_cat.id,
        category_code="pet_bottles",
        category_name="PET Bottles",
        rate_per_kg=18.0,
        weight_kg=3.0,
        points_earned=54.0
    ))
    db_session.add(WasteCollectionItem(
        waste_entry_id=entry.id,
        category_id=card_cat.id,
        category_code="cardboard",
        category_name="Cardboard",
        rate_per_kg=10.0,
        weight_kg=2.0,
        points_earned=20.0
    ))
    db_session.add(CreditTransaction(
        user_id=test_citizen.id,
        waste_entry_id=entry.id,
        schedule_version=1,
        credits_amount=74.0,
        calculation_formula="3.00 kg (PET Bottles) × 18 GP/kg + 2.00 kg (Cardboard) × 10 GP/kg = 74.0 Green Points"
    ))
    db_session.commit()

    # 2. Query /api/v1/citizen/points-balance
    res = client.get("/api/v1/citizen/points-balance", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["greenpay_id"] == test_citizen.greenpay_id
    assert data["current_balance"] == 74.0
    assert data["total_earned"] == 74.0
    assert data["total_redeemed"] == 0.0
    assert data["total_weight_kg"] == 5.0
    assert data["total_weighments_count"] == 1

def test_citizen_collections_and_detail(client, test_citizen, test_supervisor, seed_wards_and_schedule, db_session):
    client.cookies.clear()
    token = create_access_token(test_citizen.id, test_citizen.role)
    headers = {"Authorization": f"Bearer {token}"}

    pet_cat = db_session.query(DryWasteCategory).filter(DryWasteCategory.code == "pet_bottles").first()

    entry = WasteEntry(
        transaction_id="GP-REC-STAGE6-DETAIL01",
        user_id=test_citizen.id,
        supervisor_id=test_supervisor.id,
        ward_id=seed_wards_and_schedule["Koramangala"].id,
        dry_kg=2.0,
        total_weight_kg=2.0,
        journey_stage="Processing",
        dispute_status="CONFIRMED"
    )
    db_session.add(entry)
    db_session.flush()

    db_session.add(WasteCollectionItem(
        waste_entry_id=entry.id,
        category_id=pet_cat.id,
        category_code="pet_bottles",
        category_name="PET Bottles",
        rate_per_kg=18.0,
        weight_kg=2.0,
        points_earned=36.0
    ))
    db_session.add(CreditTransaction(
        user_id=test_citizen.id,
        waste_entry_id=entry.id,
        schedule_version=1,
        credits_amount=36.0,
        calculation_formula="2.00 kg (PET Bottles) × 18 GP/kg = 36.0 Green Points"
    ))
    db_session.commit()

    # Query collections list
    res = client.get("/api/v1/citizen/collections", headers=headers)
    assert res.status_code == 200
    cols = res.json()
    assert len(cols) >= 1
    target = next(c for c in cols if c["transaction_id"] == "GP-REC-STAGE6-DETAIL01")
    assert target["total_weight_kg"] == 2.0
    assert target["total_points_earned"] == 36.0
    assert len(target["items"]) == 1
    assert target["items"][0]["category_code"] == "pet_bottles"
    assert target["items"][0]["points_earned"] == 36.0

    # Query single collection detail
    detail_res = client.get("/api/v1/citizen/collections/GP-REC-STAGE6-DETAIL01", headers=headers)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["transaction_id"] == "GP-REC-STAGE6-DETAIL01"
    assert detail["citizen_name"] == "Test Citizen"
    assert len(detail["items"]) == 1

def test_cross_citizen_collection_access_blocked(client, test_citizen, test_supervisor, seed_wards_and_schedule, db_session):
    client.cookies.clear()
    
    # Create Citizen B
    user_b = User(
        greenpay_id="GP-CITIZEN-B",
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
        email="citizen.b@greenpay.blr",
        green_score=70.0
    )
    db_session.add(profile_b)

    entry_b = WasteEntry(
        transaction_id="GP-REC-CITIZEN-B-99",
        user_id=user_b.id,
        supervisor_id=test_supervisor.id,
        ward_id=seed_wards_and_schedule["Koramangala"].id,
        total_weight_kg=10.0,
        journey_stage="Collection"
    )
    db_session.add(entry_b)
    db_session.commit()

    # Authenticate as Test Citizen (Citizen A) and attempt to read Citizen B's collection
    token_a = create_access_token(test_citizen.id, test_citizen.role)
    headers_a = {"Authorization": f"Bearer {token_a}"}

    res = client.get("/api/v1/citizen/collections/GP-REC-CITIZEN-B-99", headers=headers_a)
    assert res.status_code == 403
    assert "Unauthorized" in res.json()["detail"]

def test_credits_ledger_running_balance_and_redemption(client, test_citizen, test_supervisor, seed_wards_and_schedule, db_session):
    from datetime import datetime, timedelta, timezone
    now = datetime.now(timezone.utc)

    client.cookies.clear()
    token = create_access_token(test_citizen.id, test_citizen.role)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Initial earning collection (2 hours ago)
    entry = WasteEntry(
        transaction_id="GP-REC-LEDGER-EARN",
        user_id=test_citizen.id,
        supervisor_id=test_supervisor.id,
        ward_id=seed_wards_and_schedule["Koramangala"].id,
        total_weight_kg=4.0,
        journey_stage="Recovery",
        collection_date=now - timedelta(hours=2)
    )
    db_session.add(entry)
    db_session.flush()

    db_session.add(CreditTransaction(
        user_id=test_citizen.id,
        waste_entry_id=entry.id,
        schedule_version=1,
        credits_amount=70.0,
        calculation_formula="Verified dry recyclables award = 70.0 Green Points",
        timestamp=now - timedelta(hours=2)
    ))

    # 2. Add a redemption debit transaction: -60.0 GP for Salt (now)
    db_session.add(CreditTransaction(
        user_id=test_citizen.id,
        schedule_version=1,
        credits_amount=-60.0,
        calculation_formula="Redemption: 60 GP spent on Iodized Salt (1 kg)",
        timestamp=now
    ))
    db_session.commit()

    # Query credits ledger
    res = client.get("/api/v1/citizen/credits-ledger", headers=headers)
    assert res.status_code == 200
    ledger = res.json()
    assert len(ledger) == 2

    # Newest transaction is the redemption
    redemption_tx = ledger[0]
    assert redemption_tx["credits_amount"] == -60.0
    assert redemption_tx["transaction_type"] == "GROCERY_REDEMPTION"
    assert redemption_tx["resulting_balance"] == 10.0  # 70.0 - 60.0 = 10.0 GP

    # Second transaction is the initial earning
    earn_tx = ledger[1]
    assert earn_tx["credits_amount"] == 70.0
    assert earn_tx["transaction_type"] == "COLLECTION_CREDIT"
    assert earn_tx["resulting_balance"] == 70.0

    # Query points balance again: available balance must now be 10.0 GP
    bal_res = client.get("/api/v1/citizen/points-balance", headers=headers)
    assert bal_res.status_code == 200
    bal_data = bal_res.json()
    assert bal_data["current_balance"] == 10.0
    assert bal_data["total_earned"] == 70.0
    assert bal_data["total_redeemed"] == 60.0

def test_supervisor_qr_lookup_json_and_plain(client, test_citizen, test_supervisor):
    client.cookies.clear()
    sup_token = create_access_token(test_supervisor.id, test_supervisor.role)
    headers = {"Authorization": f"Bearer {sup_token}"}

    # 1. Plain GreenPay ID lookup
    res_plain = client.get(f"/api/v1/supervisor/lookup-citizen/{test_citizen.greenpay_id}", headers=headers)
    assert res_plain.status_code == 200
    assert res_plain.json()["greenpay_id"] == test_citizen.greenpay_id

    # 2. JSON formatted QR payload lookup (as emitted by mobile QR scanner)
    json_qr = f'{{"greenpay_id":"{test_citizen.greenpay_id}","ward":"Koramangala","system":"GREENPAY_BLR"}}'
    res_json = client.get(f"/api/v1/supervisor/lookup-citizen/{json_qr}", headers=headers)
    assert res_json.status_code == 200
    assert res_json.json()["greenpay_id"] == test_citizen.greenpay_id

def test_green_score_and_points_separation(client, test_citizen):
    client.cookies.clear()
    token = create_access_token(test_citizen.id, test_citizen.role)
    headers = {"Authorization": f"Bearer {token}"}

    # Green score breakdown returns 0-100 rating
    score_res = client.get("/api/v1/citizen/green-score", headers=headers)
    assert score_res.status_code == 200
    score_data = score_res.json()
    assert 0 <= score_data["total_score"] <= 100
    assert "segregation_score" in score_data
    assert "consistency_score" in score_data
    assert "diversion_score" in score_data

    # Points balance returns GP points from transactions
    bal_res = client.get("/api/v1/citizen/points-balance", headers=headers)
    assert bal_res.status_code == 200
    bal_data = bal_res.json()
    # Green score and points are completely distinct fields
    assert "current_balance" in bal_data
    assert "total_score" not in bal_data
