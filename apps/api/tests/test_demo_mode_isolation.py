import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app, verify_production_safety
from app.core.config import settings
from app.models.user import User, UserProfile
from app.models.ward import Ward
from app.core.security import hash_password, create_access_token, generate_csrf_token
from app.services.demo_service import DemoService

@pytest.fixture
def client():
    return TestClient(app)

def test_demo_login_citizen(client: TestClient, db_session: Session):
    """Verifies that one-click demo login provisions and logs in a demo citizen."""
    res = client.post("/api/v1/auth/demo-login", json={"role": "CITIZEN", "demo_id": "citizen_koramangala"})
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "CITIZEN"
    assert data["is_demo"] is True
    assert "Aarav Sharma" in data["name"]
    assert data["greenpay_id"] == "GP-DEMO01"
    assert "gp_citizen_access" in res.cookies
    assert "gp_citizen_csrf" in res.cookies

def test_demo_login_supervisor(client: TestClient, db_session: Session):
    """Verifies that one-click demo login provisions and logs in a demo supervisor."""
    res = client.post("/api/v1/auth/demo-login", json={"role": "SUPERVISOR", "demo_id": "supervisor_koramangala"})
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "SUPERVISOR"
    assert data["is_demo"] is True
    assert "Vikram Rao" in data["name"]
    assert "gp_admin_access" in res.cookies
    assert "gp_admin_csrf" in res.cookies

def test_demo_login_super_admin(client: TestClient, db_session: Session):
    """Verifies that one-click demo login provisions and logs in a demo super admin."""
    res = client.post("/api/v1/auth/demo-login", json={"role": "SUPER_ADMIN", "demo_id": "admin_central"})
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "SUPER_ADMIN"
    assert data["is_demo"] is True
    assert "Demo Admin" in data["name"]
    assert "gp_admin_access" in res.cookies
    assert "gp_admin_csrf" in res.cookies

def test_demo_login_rejects_invalid_role(client: TestClient):
    """Rejects invalid role requests with 400 Bad Request."""
    res = client.post("/api/v1/auth/demo-login", json={"role": "UNKNOWN_ROLE"})
    assert res.status_code == 400
    assert "Invalid demo role" in res.json()["detail"]

def test_production_safety_guard_passes_with_demo_accounts(db_session: Session):
    """
    Confirms that verify_production_safety does NOT fail in ENV=production
    when demo accounts exist because their passwords and meter numbers are
    cryptographically safe and not part of the banned insecure lists.
    """
    original_env = settings.ENV
    try:
        settings.ENV = "production"
        # Provision demo accounts
        DemoService.get_or_create_demo_user(db_session, "CITIZEN")
        DemoService.get_or_create_demo_user(db_session, "SUPERVISOR")
        DemoService.get_or_create_demo_user(db_session, "SUPER_ADMIN")
        
        # Must not raise RuntimeError
        verify_production_safety(db_session)
    finally:
        settings.ENV = original_env

def test_demo_supervisor_cannot_lookup_real_citizen(client: TestClient, db_session: Session):
    """Demo supervisors are blocked from querying genuine citizen identities."""
    # 1. Create a genuine citizen (is_demo=False)
    ward = db_session.query(Ward).first()
    real_citizen = User(
        greenpay_id="GP-REAL99",
        password_hash=hash_password("SuperSecureRealPass123!"),
        role="CITIZEN",
        status="ACTIVE",
        is_adult_declared=True,
        is_demo=False
    )
    db_session.add(real_citizen)
    db_session.flush()
    profile = UserProfile(
        user_id=real_citizen.id,
        name="Genuine Citizen Person",
        ward_id=ward.id,
        green_score=60.0
    )
    db_session.add(profile)
    db_session.commit()

    # 2. Login as Demo Supervisor
    sup_login = client.post("/api/v1/auth/demo-login", json={"role": "SUPERVISOR"})
    assert sup_login.status_code == 200
    csrf_token = sup_login.json()["csrf_token"]

    # 3. Lookup real citizen -> must return 403 Forbidden
    res = client.get(
        f"/api/v1/supervisor/lookup-citizen/{real_citizen.greenpay_id}",
        headers={"X-CSRF-Token": csrf_token}
    )
    assert res.status_code == 403
    assert "Demo supervisors are isolated to demo citizen accounts" in res.json()["detail"]

def test_demo_supervisor_cannot_record_collection_for_real_citizen(client: TestClient, db_session: Session):
    """Demo supervisors are blocked from logging collections or weighments for genuine citizens."""
    ward = db_session.query(Ward).first()
    real_citizen = User(
        greenpay_id="GP-REAL88",
        password_hash=hash_password("SuperSecureRealPass123!"),
        role="CITIZEN",
        status="ACTIVE",
        is_adult_declared=True,
        is_demo=False
    )
    db_session.add(real_citizen)
    db_session.flush()
    profile = UserProfile(
        user_id=real_citizen.id,
        name="Real Resident",
        ward_id=ward.id,
        green_score=70.0
    )
    db_session.add(profile)
    db_session.commit()

    # Login as Demo Supervisor
    sup_login = client.post("/api/v1/auth/demo-login", json={"role": "SUPERVISOR"})
    csrf_token = sup_login.json()["csrf_token"]

    # Attempt dry-waste collection for real citizen -> must return 403 Forbidden
    res = client.post(
        "/api/v1/supervisor/dry-waste-collection",
        headers={"X-CSRF-Token": csrf_token},
        json={
            "greenpay_id": real_citizen.greenpay_id,
            "items": [{"category_code": "pet_bottles", "weight_kg": 2.5}]
        }
    )
    assert res.status_code == 403
    assert "Demo supervisors are isolated to demo citizen accounts" in res.json()["detail"]

def test_demo_admin_cannot_perform_privileged_mutations(client: TestClient, db_session: Session):
    """Demo administrators are blocked from modifying staff accounts, 2FA, or reward schedules."""
    # Login as Demo Admin
    admin_login = client.post("/api/v1/auth/demo-login", json={"role": "SUPER_ADMIN"})
    csrf_token = admin_login.json()["csrf_token"]
    headers = {"X-CSRF-Token": csrf_token}

    # 1. Cannot create supervisor invite
    res_invite = client.post(
        "/api/v1/admin/invites",
        headers=headers,
        json={"email": "new.staff@greenpay.blr", "name": "New Staff", "assigned_ward_name": "Koramangala"}
    )
    assert res_invite.status_code == 403
    assert "Demo administrators cannot create supervisor invitations" in res_invite.json()["detail"]

    # 2. Cannot alter 2FA configuration
    res_2fa = client.post("/api/v1/admin/2fa/enrol", headers=headers)
    assert res_2fa.status_code == 403
    assert "Demo administrators cannot alter 2FA" in res_2fa.json()["detail"]

    # 3. Cannot alter reward schedule
    res_sched = client.post(
        "/api/v1/admin/reward-schedules",
        headers=headers,
        json={"change_reason": "Malicious override"}
    )
    assert res_sched.status_code == 403
    assert "Demo administrators cannot modify municipal reward schedules" in res_sched.json()["detail"]

def test_demo_citizen_gets_isolated_data(client: TestClient, db_session: Session):
    """Verifies that demo citizen access is isolated to their own demo records."""
    login_res = client.post("/api/v1/auth/demo-login", json={"role": "CITIZEN"})
    csrf_token = login_res.json()["csrf_token"]
    headers = {"X-CSRF-Token": csrf_token}

    profile_res = client.get("/api/v1/citizen/profile", headers=headers)
    assert profile_res.status_code == 200
    assert profile_res.json()["greenpay_id"] == "GP-DEMO01"

    history_res = client.get("/api/v1/citizen/waste-history", headers=headers)
    assert history_res.status_code == 200
    # Must contain sample demo records pre-seeded by DemoService
    assert len(history_res.json()) >= 1
