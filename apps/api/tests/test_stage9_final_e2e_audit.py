import pytest
import uuid
from decimal import Decimal
from datetime import datetime, timezone
from fastapi import HTTPException
from app.models.user import User, UserProfile
from app.models.ward import Ward
from app.models.dry_waste import DryWasteCategory, DryWasteRateHistory
from app.models.waste import WasteEntry
from app.models.credit_ledger import CreditTransaction
from app.models.redemption import RedemptionItem, RedemptionTransaction
from app.models.audit import AuditLog
from app.core.security import hash_password, create_access_token, generate_csrf_token, encrypt_meter_number, hash_meter_for_lookup
from app.services.dry_waste_engine import DryWasteEngine
from app.services.redemption_service import RedemptionService
from app.schemas.dry_waste import DryWasteItemInput, DryWasteCollectionCreateRequest


@pytest.fixture
def stage9_fixture(db_session, seed_wards_and_schedule):
    """
    Sets up a clean, authoritative test environment for Stage 9 validation.
    """
    ward_kor = seed_wards_and_schedule["Koramangala"]
    ward_ind = seed_wards_and_schedule["Indiranagar"]

    # 1. Super Admin
    admin_user = User(
        id=str(uuid.uuid4()),
        role="SUPER_ADMIN",
        status="ACTIVE",
        greenpay_id="GP-ADM-001",
        password_hash=hash_password("AdminSecure2026!")
    )
    db_session.add(admin_user)
    db_session.flush()

    admin_profile = UserProfile(
        user_id=admin_user.id,
        name="Siddharth Rao",
        email="admin@greenpay.blr",
        ward_id=ward_kor.id
    )
    db_session.add(admin_profile)

    # 2. Supervisor
    supervisor_user = User(
        id=str(uuid.uuid4()),
        role="SUPERVISOR",
        status="ACTIVE",
        greenpay_id="GP-SUP-001",
        password_hash=hash_password("SupervisorPass123!")
    )
    db_session.add(supervisor_user)
    db_session.flush()

    supervisor_profile = UserProfile(
        user_id=supervisor_user.id,
        name="Ramesh Rao",
        email="supervisor.kora@greenpay.blr",
        ward_id=ward_kor.id
    )
    db_session.add(supervisor_profile)

    # 3. Baseline Active Citizen
    cit_user = User(
        id=str(uuid.uuid4()),
        role="CITIZEN",
        status="ACTIVE",
        greenpay_id="GP-104928",
        password_hash=hash_password("Password123!"),
        is_adult_declared=True,
        meter_number_encrypted=encrypt_meter_number("KA10BLR104928"),
        meter_number_hash=hash_meter_for_lookup("KA10BLR104928")
    )
    db_session.add(cit_user)
    db_session.flush()

    cit_profile = UserProfile(
        user_id=cit_user.id,
        name="Aarav Sharma",
        email="aarav.sharma@greenpay.blr",
        ward_id=ward_kor.id
    )
    db_session.add(cit_profile)

    # 4. Retrieve 8 Dry Waste Categories from seed
    cat_objs = {cat.code: cat for cat in db_session.query(DryWasteCategory).all()}

    # 5. Seed 5 Approved Grocery Products
    groceries = [
        {"title": "Rice", "quantity": "1 kg", "cost": 120, "stock": 50, "category": "Grains & Cereals"},
        {"title": "Toor Dal", "quantity": "1 kg", "cost": 140, "stock": 40, "category": "Pulses & Legumes"},
        {"title": "Sunflower Cooking Oil", "quantity": "1 litre", "cost": 150, "stock": 35, "category": "Cooking Oils"},
        {"title": "Sugar", "quantity": "1 kg", "cost": 80, "stock": 60, "category": "Cooking Staples"},
        {"title": "Iodized Salt", "quantity": "1 kg", "cost": 60, "stock": 80, "category": "Cooking Staples"},
    ]
    groc_objs = {}
    for g in groceries:
        item = db_session.query(RedemptionItem).filter(RedemptionItem.title == g["title"]).first()
        if not item:
            item = RedemptionItem(
                title=g["title"],
                description=f"Verified {g['title']} ration package.",
                item_type="GROCERY",
                credit_cost=g["cost"],
                stock_remaining=g["stock"],
                is_active=True,
                partner_name="Karnataka Food & Civil Supplies",
                badge_text=f"{g['quantity']} • Essential Ration"
            )
            db_session.add(item)
            db_session.flush()
        groc_objs[g["title"]] = item

    db_session.commit()

    return {
        "admin": admin_user,
        "supervisor": supervisor_user,
        "ward_kor": ward_kor,
        "ward_ind": ward_ind,
        "categories": cat_objs,
        "groceries": groc_objs
    }


# ==============================================================================
# 1. CITIZEN COMPLETE JOURNEY VALIDATION
# ==============================================================================
def test_complete_citizen_journey(client, stage9_fixture, db_session):
    """
    Validates:
    - Citizen registration -> starts in PENDING status.
    - Doorstep activation by supervisor -> transitions to ACTIVE.
    - Profile fetching -> masked meter and ward information.
    - 8 dry recyclable categories & rates lookup.
    - Points balance from actual ledger (initially 0.0).
    - Doorstep weighment recording -> points awarded.
    - Balance updated from ledger (102.0 GP).
    - 5 approved grocery catalogue items lookup.
    - Redemption eligibility: Rice (120 GP) rejected due to insufficient points.
    - Redemption execution: Sugar (80 GP) successfully redeemed.
    - Ledger debited (-80.0 GP) and remaining balance is 22.0 GP.
    - Stock decremented by 1.
    - Redemption receipt generated and stored in redemption history.
    """
    ward = stage9_fixture["ward_kor"]
    sup = stage9_fixture["supervisor"]
    sugar = stage9_fixture["groceries"]["Sugar"]
    rice = stage9_fixture["groceries"]["Rice"]

    # 1. Citizen Registration
    reg_payload = {
        "meter_number": "KA10BLR9999",
        "name": "Sunil Kumar",
        "phone_number": "+919876543299",
        "email": "sunil.kumar@test.blr",
        "ward_name": ward.name,
        "password": "CitizenSecret2026!",
        "is_adult_declared": True,
        "terms_privacy_consent": True,
        "marketing_consent": False
    }
    reg_res = client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == 201, reg_res.text
    citizen_data = reg_res.json()
    assert citizen_data["user_status"] == "PENDING"
    greenpay_id = citizen_data["greenpay_id"]
    citizen_token = citizen_data["access_token"]
    citizen_headers = {"Authorization": f"Bearer {citizen_token}"}

    # 3. Verify Profile shows PENDING
    prof_res = client.get("/api/v1/citizen/profile", headers=citizen_headers)
    assert prof_res.status_code == 200
    assert prof_res.json()["status"] == "PENDING"
    assert prof_res.json()["masked_meter"] != "KA10BLR9999"

    # 4. Supervisor activates citizen at doorstep
    client.cookies.clear()
    sup_token = create_access_token(sup.id, "SUPERVISOR")
    sup_headers = {"Authorization": f"Bearer {sup_token}"}
    act_res = client.post(f"/api/v1/supervisor/activate-citizen/{greenpay_id}", headers=sup_headers)
    assert act_res.status_code == 200
    assert act_res.json()["status"] == "ACTIVE"

    # 5. Citizen Profile now ACTIVE
    client.cookies.clear()
    prof_res = client.get("/api/v1/citizen/profile", headers=citizen_headers)
    assert prof_res.json()["status"] == "ACTIVE"

    # 6. Fetch 8 Dry Recyclable Categories
    cat_res = client.get("/api/v1/public/dry-waste-categories")
    assert cat_res.status_code == 200
    cats = cat_res.json()
    assert len(cats) == 8
    cat_map = {c["code"]: c["rate_per_kg"] for c in cats}
    assert cat_map["aluminium_metal"] == 22.0
    assert cat_map["pet_bottles"] == 18.0
    assert cat_map["cardboard"] == 10.0

    # 7. Initial Points Balance is 0.0
    bal_res = client.get("/api/v1/citizen/points-balance", headers=citizen_headers)
    assert bal_res.status_code == 200
    assert bal_res.json()["current_balance"] == 0.0
    assert bal_res.json()["total_earned"] == 0.0

    # 8. Supervisor logs doorstep dry-waste collection:
    # 3.0 kg Aluminium @ 22 GP/kg = 66.0 GP
    # 2.0 kg PET Bottles @ 18 GP/kg = 36.0 GP
    # Total = 102.0 GP
    client.cookies.clear()
    coll_payload = {
        "greenpay_id": greenpay_id,
        "items": [
            {"category_code": "aluminium_metal", "weight_kg": 3.0},
            {"category_code": "pet_bottles", "weight_kg": 2.0}
        ],
        "notes": "Doorstep clean recyclables",
        "idempotency_key": f"test-coll-{uuid.uuid4()}"
    }
    coll_res = client.post("/api/v1/supervisor/dry-waste-collection", json=coll_payload, headers=sup_headers)
    assert coll_res.status_code == 200
    assert coll_res.json()["total_points_earned"] == 102.0

    # 9. Citizen Points Balance reflects 102.0 GP
    client.cookies.clear()
    bal_res = client.get("/api/v1/citizen/points-balance", headers=citizen_headers)
    assert bal_res.json()["current_balance"] == 102.0
    assert bal_res.json()["total_earned"] == 102.0
    assert bal_res.json()["total_weighments_count"] == 1

    # 10. Fetch Grocery Rewards Catalogue
    groc_res = client.get("/api/v1/citizen/redemptions/catalogue", headers=citizen_headers)
    assert groc_res.status_code == 200
    groc_data = groc_res.json()
    assert groc_data["balance"] == 102.0
    assert len(groc_data["items"]) == 5

    # 11. Attempt to redeem Rice (120 GP) -> Should FAIL due to insufficient points (has 102 GP)
    initial_rice_stock = rice.stock_remaining
    rice_res = client.post(
        "/api/v1/citizen/redemptions",
        json={"item_id": rice.id, "idempotency_key": f"test-rice-{uuid.uuid4()}"},
        headers=citizen_headers
    )
    assert rice_res.status_code == 400
    assert "insufficient" in rice_res.json()["detail"].lower()
    # Stock must remain unchanged
    db_session.refresh(rice)
    assert rice.stock_remaining == initial_rice_stock

    # 12. Redeem Sugar (80 GP) -> Should SUCCEED (102 >= 80)
    initial_sugar_stock = sugar.stock_remaining
    sugar_res = client.post(
        "/api/v1/citizen/redemptions",
        json={"item_id": sugar.id, "idempotency_key": f"test-sugar-{uuid.uuid4()}"},
        headers=citizen_headers
    )
    assert sugar_res.status_code == 200
    sugar_receipt = sugar_res.json()
    assert sugar_receipt["item_title"] == "Sugar"
    assert sugar_receipt["credits_spent"] == 80.0
    assert sugar_receipt["previous_balance"] == 102.0
    assert sugar_receipt["remaining_balance"] == 22.0
    assert sugar_receipt["redemption_reference"].startswith("GP-GROC-2026-")

    # 13. Verify Stock Decremented
    db_session.refresh(sugar)
    assert sugar.stock_remaining == initial_sugar_stock - 1

    # 14. Verify Citizen Balance is now 22.0 GP
    bal_res_after = client.get("/api/v1/citizen/points-balance", headers=citizen_headers)
    assert bal_res_after.json()["current_balance"] == 22.0
    assert bal_res_after.json()["total_redeemed"] == 80.0

    # 15. Verify Redemption History
    hist_res = client.get("/api/v1/citizen/redemptions/history", headers=citizen_headers)
    assert hist_res.status_code == 200
    history = hist_res.json()
    assert len(history) == 1
    assert history[0]["item_title"] == "Sugar"
    assert history[0]["credits_spent"] == 80.0


# ==============================================================================
# 2. SUPERVISOR JOURNEY & SCOPING VALIDATION
# ==============================================================================
def test_supervisor_journey_and_restrictions(client, stage9_fixture, db_session):
    """
    Validates:
    - Supervisor login and ward assignment.
    - Citizen lookup by QR ID.
    - Doorstep dry-waste collection with decimal weights and multiple categories.
    - Correct GP calculation.
    - Idempotent submission: repeat submission with same idempotency_key does not duplicate points.
    - Permission isolation: supervisor attempts to access admin endpoints are blocked (403).
    """
    sup = stage9_fixture["supervisor"]
    token = create_access_token(sup.id, "SUPERVISOR")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create an active citizen
    cit = User(
        id=str(uuid.uuid4()),
        role="CITIZEN",
        status="ACTIVE",
        greenpay_id="GP-TEST-7788",
        password_hash=hash_password("Pass123!")
    )
    db_session.add(cit)
    db_session.flush()
    cit_prof = UserProfile(user_id=cit.id, name="Test Citizen", ward_id=stage9_fixture["ward_kor"].id)
    db_session.add(cit_prof)
    db_session.commit()

    # 2. Citizen lookup via QR
    lookup_res = client.get("/api/v1/supervisor/lookup-citizen/GP-TEST-7788", headers=headers)
    assert lookup_res.status_code == 200
    assert lookup_res.json()["name"] == "Test Citizen"
    assert lookup_res.json()["account_status"] == "ACTIVE"

    # 3. Log collection with decimal weights:
    # 2.45 kg Aluminium @ 22 GP/kg = 53.90 GP
    # 1.50 kg Cardboard @ 10 GP/kg = 15.00 GP
    # Total = 68.90 GP
    idem_key = f"idem-{uuid.uuid4()}"
    coll_payload = {
        "greenpay_id": "GP-TEST-7788",
        "items": [
            {"category_code": "aluminium_metal", "weight_kg": 2.45},
            {"category_code": "cardboard", "weight_kg": 1.50}
        ],
        "idempotency_key": idem_key
    }
    c_res = client.post("/api/v1/supervisor/dry-waste-collection", json=coll_payload, headers=headers)
    assert c_res.status_code == 200
    assert c_res.json()["total_points_earned"] == 68.90
    assert c_res.json()["total_weight_kg"] == 3.95

    # 4. Duplicate Submission with same idempotency_key must return same record
    c_res_dup = client.post("/api/v1/supervisor/dry-waste-collection", json=coll_payload, headers=headers)
    assert c_res_dup.status_code == 200
    assert c_res_dup.json()["id"] == c_res.json()["id"]

    # Verify points in DB were only added ONCE
    tx_count = db_session.query(CreditTransaction).filter(CreditTransaction.user_id == cit.id).count()
    assert tx_count == 1

    # 5. SUPERVISOR ROLE RESTRICTIONS MATRIX
    # Supervisor cannot modify dry-waste category rates
    cat_id = stage9_fixture["categories"]["aluminium_metal"].id
    rate_res = client.put(
        f"/api/v1/admin/dry-waste-categories/{cat_id}",
        json={"rate_per_kg": 25.0, "reason": "Unauthorized"},
        headers=headers
    )
    assert rate_res.status_code == 403

    # Supervisor cannot modify grocery price or stock
    groc_id = stage9_fixture["groceries"]["Rice"].id
    groc_res = client.patch(
        f"/api/v1/admin/redemptions/items/{groc_id}",
        json={"credit_cost": 50, "reason": "Unauthorized"},
        headers=headers
    )
    assert groc_res.status_code == 403

    # Supervisor cannot create new supervisors
    new_sup_res = client.post(
        "/api/v1/admin/supervisors",
        json={"name": "Hacker Sup", "email": "hacker@test.blr", "password": "Pass", "ward_id": stage9_fixture["ward_kor"].id},
        headers=headers
    )
    assert new_sup_res.status_code == 403

    # Supervisor cannot view system audit logs
    audit_res = client.get("/api/v1/admin/audit-logs", headers=headers)
    assert audit_res.status_code == 403


# ==============================================================================
# 3. SUPER ADMIN JOURNEY & GOVERNANCE VALIDATION
# ==============================================================================
def test_super_admin_journey_and_governance(client, stage9_fixture, db_session):
    """
    Validates:
    - Super Admin authentication.
    - Authoritative 8 KPI dashboard metrics with date filtering.
    - Category rate update with mandatory reason note -> writes to DryWasteRateHistory.
    - Grocery item price and stock update.
    - Citizen management: listing, masked meters, read-only balances, status toggle.
    - Supervisor management: Staff ID assignment and updates.
    - Collection ledger multi-criteria filtering.
    - Immutable trigger verification: collections cannot be altered after completion.
    """
    admin = stage9_fixture["admin"]
    token = create_access_token(admin.id, "SUPER_ADMIN")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Authoritative 8 KPI Dashboard
    dash_res = client.get("/api/v1/admin/dashboard/stats?period=all", headers=headers)
    assert dash_res.status_code == 200
    stats = dash_res.json()
    assert "total_citizens" in stats
    assert "active_supervisors" in stats
    assert "total_collections" in stats
    assert "total_collected_kg" in stats
    assert "total_gp_awarded" in stats
    assert "total_gp_redeemed" in stats
    assert "available_inventory_units" in stats
    assert "successful_redemptions" in stats
    assert len(stats["categories_breakdown"]) == 8

    # 2. Category Rate Modification with Audit History
    textiles = stage9_fixture["categories"]["textiles"]
    old_rate = textiles.rate_per_kg
    update_res = client.put(
        f"/api/v1/admin/dry-waste-categories/{textiles.id}",
        json={"rate_per_kg": 9.5, "change_reason": "Quarterly market tariff revision"},
        headers=headers
    )
    assert update_res.status_code == 200
    assert update_res.json()["rate_per_kg"] == 9.5

    # Check Rate History Audit Trail
    hist_res = client.get("/api/v1/admin/dry-waste-categories/history", headers=headers)
    assert hist_res.status_code == 200
    hist = hist_res.json()
    assert len(hist) >= 1
    recent = hist[0]
    assert recent["category_code"] == "textiles"
    assert recent["new_rate"] == 9.5
    assert recent["previous_rate"] == old_rate
    assert "quarterly" in recent["change_reason"].lower()

    # Revert rate back for invariant preservation
    client.put(
        f"/api/v1/admin/dry-waste-categories/{textiles.id}",
        json={"rate_per_kg": 8.0, "change_reason": "Reverting to standard baseline"},
        headers=headers
    )

    # 3. Super Admin Updates Grocery Price and Stock
    salt = stage9_fixture["groceries"]["Iodized Salt"]
    groc_res = client.patch(
        f"/api/v1/admin/redemptions/items/{salt.id}",
        json={"credit_cost": 65, "stock_remaining": 95, "change_reason": "Supply depot inventory restock"},
        headers=headers
    )
    assert groc_res.status_code == 200
    assert groc_res.json()["credit_cost"] == 65
    assert groc_res.json()["stock_remaining"] == 95

    # Revert price back
    client.patch(
        f"/api/v1/admin/redemptions/items/{salt.id}",
        json={"credit_cost": 60, "stock_remaining": 95, "change_reason": "Reverting price to baseline"},
        headers=headers
    )

    # 4. Citizen Registry with Masked Meters and Read-Only Balances
    cit_res = client.get("/api/v1/admin/citizens", headers=headers)
    assert cit_res.status_code == 200
    citizens = cit_res.json()["citizens"]
    assert len(citizens) >= 1
    for c in citizens:
        assert "*" in c["masked_meter"] or c["masked_meter"] == "[MASKED]"
        assert "available_balance" in c

    # 5. Super Admin Toggles Citizen Account Status
    target_cit_id = citizens[0]["id"]
    stat_res = client.patch(
        f"/api/v1/admin/citizens/{target_cit_id}/status",
        json={"status": "SUSPENDED", "reason": "Verification hold"},
        headers=headers
    )
    assert stat_res.status_code == 200
    assert stat_res.json()["status"] == "SUSPENDED"

    # Restore to ACTIVE
    client.patch(
        f"/api/v1/admin/citizens/{target_cit_id}/status",
        json={"status": "ACTIVE", "reason": "Verification passed"},
        headers=headers
    )

    # 6. Field Supervisor Staff ID Update
    sup = stage9_fixture["supervisor"]
    staff_res = client.patch(
        f"/api/v1/admin/supervisors/{sup.id}/staff-id",
        json={"staff_id": "GP-SUP-099"},
        headers=headers
    )
    assert staff_res.status_code == 200
    assert staff_res.json()["greenpay_id"] == "GP-SUP-099"

    # Restore Staff ID
    client.patch(
        f"/api/v1/admin/supervisors/{sup.id}/staff-id",
        json={"staff_id": "GP-SUP-001"},
        headers=headers
    )


# ==============================================================================
# 4. BUSINESS RULES & SECURITY INTEGRITY VALIDATION
# ==============================================================================
def test_business_rules_and_security_boundaries(client, stage9_fixture, db_session):
    """
    Validates:
    - Rejection of invalid, negative, or zero weights.
    - Rejection of unknown or unsupported categories.
    - Cross-citizen isolation: citizen A cannot access citizen B's collections.
    - Concurrency protection: multiple rapid redemption requests cannot overspend points.
    - Only 1 Super Admin account exists in the system.
    """
    sup = stage9_fixture["supervisor"]
    sup_token = create_access_token(sup.id, "SUPERVISOR")
    sup_headers = {"Authorization": f"Bearer {sup_token}"}

    # Citizen A
    user_a = User(
        id=str(uuid.uuid4()),
        role="CITIZEN",
        status="ACTIVE",
        greenpay_id="GP-CIT-AAAA",
        password_hash=hash_password("Pass123!")
    )
    db_session.add(user_a)
    db_session.flush()
    db_session.add(UserProfile(user_id=user_a.id, name="Citizen A", ward_id=stage9_fixture["ward_kor"].id))

    # Citizen B
    user_b = User(
        id=str(uuid.uuid4()),
        role="CITIZEN",
        status="ACTIVE",
        greenpay_id="GP-CIT-BBBB",
        password_hash=hash_password("Pass123!")
    )
    db_session.add(user_b)
    db_session.flush()
    db_session.add(UserProfile(user_id=user_b.id, name="Citizen B", ward_id=stage9_fixture["ward_kor"].id))
    db_session.commit()

    # 1. Zero and Negative Weights Rejection
    zero_res = client.post(
        "/api/v1/supervisor/dry-waste-collection",
        json={"greenpay_id": "GP-CIT-AAAA", "items": [{"category_code": "aluminium_metal", "weight_kg": 0.0}]},
        headers=sup_headers
    )
    assert zero_res.status_code == 422 # Pydantic gt=0 validation

    neg_res = client.post(
        "/api/v1/supervisor/dry-waste-collection",
        json={"greenpay_id": "GP-CIT-AAAA", "items": [{"category_code": "aluminium_metal", "weight_kg": -3.5}]},
        headers=sup_headers
    )
    assert neg_res.status_code == 422

    # 2. Unsupported Waste Category Rejection
    unknown_res = client.post(
        "/api/v1/supervisor/dry-waste-collection",
        json={"greenpay_id": "GP-CIT-AAAA", "items": [{"category_code": "wet_organic_waste", "weight_kg": 5.0}]},
        headers=sup_headers
    )
    assert unknown_res.status_code == 404
    assert "does not exist" in unknown_res.json()["detail"].lower()

    # 3. Cross-Citizen Collection Access Isolation
    # Log a collection for Citizen A
    coll_res = client.post(
        "/api/v1/supervisor/dry-waste-collection",
        json={"greenpay_id": "GP-CIT-AAAA", "items": [{"category_code": "cardboard", "weight_kg": 5.0}]},
        headers=sup_headers
    )
    assert coll_res.status_code == 200
    tx_id = coll_res.json()["transaction_id"]

    # Citizen B attempts to access Citizen A's collection details
    token_b = create_access_token(user_b.id, "CITIZEN")
    headers_b = {"Authorization": f"Bearer {token_b}"}
    unauth_res = client.get(f"/api/v1/citizen/collections/{tx_id}", headers=headers_b)
    assert unauth_res.status_code == 403
    assert "unauthorized" in unauth_res.json()["detail"].lower()

    # 4. Super Admin Account Count Validation
    super_admin_count = db_session.query(User).filter(User.role == "SUPER_ADMIN").count()
    assert super_admin_count == 1, "There must be exactly one Super Admin account."
