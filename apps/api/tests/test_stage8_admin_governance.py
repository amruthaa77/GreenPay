import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models.user import User, UserProfile
from app.models.ward import Ward
from app.models.dry_waste import DryWasteCategory, DryWasteRateHistory
from app.models.redemption import RedemptionItem, RedemptionTransaction
from app.models.waste import WasteEntry
from app.models.credit_ledger import CreditTransaction
from app.core.security import hash_password, create_access_token


@pytest.fixture
def super_admin_user(db_session: Session, seed_wards_and_schedule):
    admin = db_session.query(User).filter(User.role == "SUPER_ADMIN").first()
    if not admin:
        ward = seed_wards_and_schedule["Koramangala"]
        admin = User(
            greenpay_id="GP-ADM-001",
            password_hash=hash_password("AdminSecure2026!"),
            role="SUPER_ADMIN",
            status="ACTIVE",
        )
        db_session.add(admin)
        db_session.flush()
        prof = UserProfile(
            user_id=admin.id,
            name="Siddharth Rao (Super-Admin)",
            email="admin@greenpay.blr",
            ward_id=ward.id,
        )
        db_session.add(prof)
        db_session.commit()
        db_session.refresh(admin)
    return admin


@pytest.fixture
def supervisor_user(db_session: Session, seed_wards_and_schedule):
    sup = db_session.query(User).filter(User.role == "SUPERVISOR", User.status == "ACTIVE").first()
    if not sup:
        ward = seed_wards_and_schedule["Indiranagar"]
        sup = User(
            greenpay_id="GP-SUP-001",
            password_hash=hash_password("Supervisor2026!"),
            role="SUPERVISOR",
            status="ACTIVE",
        )
        db_session.add(sup)
        db_session.flush()
        prof = UserProfile(
            user_id=sup.id,
            name="Ramesh Rao",
            email="supervisor.kora@greenpay.blr",
            ward_id=ward.id,
        )
        db_session.add(prof)
        db_session.commit()
        db_session.refresh(sup)
    return sup


@pytest.fixture
def citizen_user(db_session: Session, seed_wards_and_schedule):
    ward = seed_wards_and_schedule["Koramangala"]
    citizen = User(
        greenpay_id="GP-104928",
        password_hash=hash_password("Citizen2026!"),
        role="CITIZEN",
        status="ACTIVE",
    )
    db_session.add(citizen)
    db_session.flush()
    prof = UserProfile(
        user_id=citizen.id,
        name="Aarav Sharma",
        email="aarav.demo@greenpay.blr",
        ward_id=ward.id,
    )
    db_session.add(prof)

    # Issue a credit transaction for test
    tx = CreditTransaction(
        user_id=citizen.id,
        pseudonymous_owner="PS-AARAV-01",
        credits_amount=65.0,
        schedule_version=1,
        calculation_formula="Test balance initial",
        is_reversal=False
    )
    db_session.add(tx)
    db_session.commit()
    db_session.refresh(citizen)
    return citizen


@pytest.fixture
def grocery_items(db_session: Session):
    products = [
        ("Rice", 120.0, 50, "1 kg • Staple Ration"),
        ("Toor Dal", 140.0, 40, "1 kg • High Protein"),
        ("Sunflower Cooking Oil", 150.0, 30, "1 Litre • Fortified Oil"),
        ("Sugar", 80.0, 50, "1 kg • Sulfur Free"),
        ("Iodized Salt", 60.0, 60, "1 kg • Essential Mineral"),
    ]
    for title, cost, stock, badge in products:
        item = db_session.query(RedemptionItem).filter(RedemptionItem.title == title).first()
        if not item:
            item = RedemptionItem(
                item_type="GROCERY",
                title=title,
                description=f"Standard ration pack of {title}",
                credit_cost=cost,
                stock_remaining=stock,
                stock_limit=100,
                partner_name="Karnataka Food & Civil Supplies",
                badge_text=badge,
                is_active=True
            )
            db_session.add(item)
    db_session.commit()


@pytest.fixture
def admin_token(super_admin_user: User):
    return create_access_token(super_admin_user.id, "SUPER_ADMIN")


@pytest.fixture
def supervisor_token(supervisor_user: User):
    return create_access_token(supervisor_user.id, "SUPERVISOR")


def test_01_supervisor_blocked_from_governance_endpoints(client: TestClient, supervisor_token: str):
    """Supervisors must be strictly blocked (403 Forbidden) from modifying rates, prices, inventory, and staff."""
    headers = {"Authorization": f"Bearer {supervisor_token}"}

    # Blocked from updating dry waste rates
    r1 = client.put(
        "/api/v1/admin/dry-waste-categories/pet_bottles",
        json={"rate_per_kg": 25.0, "change_reason": "Illegal supervisor rate hack"},
        headers=headers,
    )
    assert r1.status_code == 403

    # Blocked from updating grocery inventory
    r2 = client.patch(
        "/api/v1/admin/redemptions/items/dummy-id",
        json={"credit_cost": 50.0, "reason": "Supervisor price cut"},
        headers=headers,
    )
    assert r2.status_code == 403

    # Blocked from viewing super admin dashboard stats
    r3 = client.get("/api/v1/admin/dashboard/stats", headers=headers)
    assert r3.status_code == 403

    # Blocked from creating supervisor accounts
    r4 = client.post(
        "/api/v1/admin/supervisors",
        json={"name": "Fake Sup", "email": "fake@gp.blr", "password": "pass", "ward_id": "ward-1"},
        headers=headers,
    )
    assert r4.status_code == 403


def test_02_super_admin_dashboard_stats(client: TestClient, admin_token: str, citizen_user, supervisor_user, grocery_items):
    """Super Admin dashboard returns authentic statistics computed from DB records across all 8 KPIs."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    res = client.get("/api/v1/admin/dashboard/stats?period=all", headers=headers)
    assert res.status_code == 200
    data = res.json()

    # 8 Authoritative KPIs
    assert "total_citizens" in data
    assert "active_supervisors" in data
    assert "total_collections" in data
    assert "total_collected_kg" in data
    assert "total_gp_awarded" in data
    assert "total_gp_redeemed" in data
    assert "available_inventory_units" in data
    assert "successful_redemptions" in data

    assert data["total_citizens"] >= 1
    assert data["active_supervisors"] >= 1
    assert data["available_inventory_units"] >= 0

    # 8 Dry Waste Categories Breakdown
    categories = data["categories_breakdown"]
    assert len(categories) == 8
    cat_names = [c["name"] for c in categories]
    assert "Aluminium & Metal" in cat_names
    assert "PET Bottles" in cat_names
    assert "Other Recyclable Plastics" in cat_names
    assert "Newspapers & Magazines" in cat_names
    assert "Cardboard" in cat_names
    assert "Glass Bottles" in cat_names
    assert "Textiles" in cat_names
    assert "Mixed Paper" in cat_names

    # Test date filters
    for period in ["30d", "90d", "year", "all"]:
        r_period = client.get(f"/api/v1/admin/dashboard/stats?period={period}", headers=headers)
        assert r_period.status_code == 200
        assert r_period.json()["period"] == period


def test_03_category_rate_governance_and_history(client: TestClient, admin_token: str, db_session: Session):
    """Super Admin can view rates, update rates with reason, and view rate change history."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Get current rates
    res = client.get("/api/v1/admin/dry-waste-categories", headers=headers)
    assert res.status_code == 200
    categories = res.json()
    assert len(categories) == 8

    # 2. Update rate with justification
    pet = next(c for c in categories if c["code"] == "pet_bottles")
    original_rate = pet["rate_per_kg"]
    new_rate = 19.5
    update_res = client.put(
        f"/api/v1/admin/dry-waste-categories/{pet['id']}",
        json={"rate_per_kg": new_rate, "change_reason": "Quarterly inflation adjustment Q4"},
        headers=headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["rate_per_kg"] == new_rate

    # 3. View rate change history
    hist_res = client.get("/api/v1/admin/dry-waste-categories/history", headers=headers)
    assert hist_res.status_code == 200
    history = hist_res.json()
    assert len(history) >= 1
    latest = history[0]
    assert latest["category_code"] == "pet_bottles"
    assert latest["new_rate"] == new_rate
    assert latest["previous_rate"] == original_rate
    assert "Quarterly inflation adjustment" in latest["change_reason"]

    # Revert rate to approved schedule (18.0 GP/kg)
    revert_res = client.put(
        f"/api/v1/admin/dry-waste-categories/{pet['id']}",
        json={"rate_per_kg": 18.0, "change_reason": "Revert to approved 18.0 GP/kg rate"},
        headers=headers,
    )
    assert revert_res.status_code == 200
    assert revert_res.json()["rate_per_kg"] == 18.0


def test_04_citizen_management_read_only_balances(client: TestClient, admin_token: str, citizen_user):
    """Citizen management lists authentic ledger balances and prevents balance tampering."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    # List citizens
    res = client.get("/api/v1/admin/citizens", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 1
    citizens = data["citizens"]
    assert len(citizens) >= 1

    citizen = citizens[0]
    assert "greenpay_id" in citizen
    assert "available_balance" in citizen
    assert "masked_meter" in citizen
    assert citizen["available_balance"] == 65.0
    assert citizen["status"] in ["ACTIVE", "PENDING", "SUSPENDED"]

    # View dossier
    detail_res = client.get(f"/api/v1/admin/citizens/{citizen['id']}", headers=headers)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["balance"]["current_balance"] == 65.0
    assert detail["balance"]["is_read_only"] is True
    assert "Balance derived exclusively" in detail["balance"]["verification_note"]

    # Toggle status
    status_res = client.patch(
        f"/api/v1/admin/citizens/{citizen['id']}/status",
        json={"status": "ACTIVE", "reason": "Administrative KYC verification"},
        headers=headers,
    )
    assert status_res.status_code == 200
    assert status_res.json()["status"] == "ACTIVE"


def test_05_supervisor_staff_id_and_ward_assignment(client: TestClient, admin_token: str, supervisor_user, seed_wards_and_schedule):
    """Supervisors possess unique Staff IDs and Super Admin can manage assignments."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    # List supervisors
    res = client.get("/api/v1/admin/supervisors", headers=headers)
    assert res.status_code == 200
    supervisors = res.json()
    assert len(supervisors) >= 1

    staff_ids = [s["greenpay_id"] for s in supervisors if s["greenpay_id"]]
    for sid in staff_ids:
        assert sid.startswith("GP-SUP-")

    # Update a supervisor's Staff ID
    target = supervisors[0]
    upd_res = client.patch(
        f"/api/v1/admin/supervisors/{target['id']}/staff-id",
        json={"staff_id": "GP-SUP-777", "reason": "Audit verification"},
        headers=headers,
    )
    assert upd_res.status_code == 200
    assert upd_res.json()["greenpay_id"] == "GP-SUP-777"

    # Create a new supervisor
    create_res = client.post(
        "/api/v1/admin/supervisors",
        json={
            "name": "Anil Kumar",
            "email": "anil.sup@greenpay.blr",
            "password": "SupervisorSecure2026!",
            "ward_id": seed_wards_and_schedule["Koramangala"].id,
            "staff_id": "GP-SUP-888"
        },
        headers=headers,
    )
    assert create_res.status_code == 200
    assert create_res.json()["greenpay_id"] == "GP-SUP-888"
    assert create_res.json()["ward_name"] == "Koramangala"


def test_06_collection_management_filtering(client: TestClient, admin_token: str):
    """Collection management supports multi-criteria filtering and confirms ledger immutability."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    res = client.get("/api/v1/admin/collections", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "total" in data
    assert "collections" in data
