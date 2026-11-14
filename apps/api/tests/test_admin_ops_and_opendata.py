import pytest
import io
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.user import User, UserProfile
from app.models.user_session import UserSession
from app.models.ward import Ward
from app.models.waste import WasteEntry
from app.models.audit import AuditLog
from app.core.security import create_access_token, generate_csrf_token
from app.core.config import settings

client = TestClient(app)

@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def super_admin_auth(db_session):
    admin = db_session.query(User).filter(User.role == "SUPER_ADMIN").first()
    if not admin:
        admin = User(
            role="SUPER_ADMIN",
            status="ACTIVE",
            password_hash="fakehash",
            is_adult_declared=True
        )
        db_session.add(admin)
        db_session.flush()
        db_session.add(UserProfile(
            user_id=admin.id,
            name="Platform Super Admin",
            email="admin@greenpay.blr"
        ))
        db_session.commit()
    token = create_access_token(admin.id, "SUPER_ADMIN")
    csrf_token = generate_csrf_token()
    return {"token": token, "csrf_token": csrf_token, "user": admin}

@pytest.fixture
def test_supervisor(db_session):
    sup = db_session.query(User).filter(User.role == "SUPERVISOR").first()
    ward = db_session.query(Ward).first()
    if not sup:
        sup = User(
            role="SUPERVISOR",
            status="ACTIVE",
            password_hash="fakehash",
            greenpay_id="SUP-BLR-001",
            is_adult_declared=True
        )
        db_session.add(sup)
        db_session.flush()
        db_session.add(UserProfile(
            user_id=sup.id,
            name="Ramesh Gowda",
            email="ramesh.gowda@bbmp.gov.in",
            ward_id=ward.id if ward else None
        ))
        db_session.commit()
    return sup

def test_list_supervisors(super_admin_auth, test_supervisor):
    cookies = {
        settings.ADMIN_ACCESS_COOKIE: super_admin_auth["token"],
        settings.ADMIN_CSRF_COOKIE: super_admin_auth["csrf_token"]
    }
    res = client.get("/api/v1/admin/supervisors", cookies=cookies)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    sup = next(s for s in data if s["id"] == test_supervisor.id)
    assert "name" in sup
    assert "status" in sup
    assert "weighments_logged_count" in sup

def test_update_supervisor_status_and_session_invalidation(super_admin_auth, test_supervisor, db_session):
    cookies = {
        settings.ADMIN_ACCESS_COOKIE: super_admin_auth["token"],
        settings.ADMIN_CSRF_COOKIE: super_admin_auth["csrf_token"]
    }
    headers = {"X-CSRF-Token": super_admin_auth["csrf_token"]}
    
    import secrets
    # Create an active session for the supervisor
    active_sess = UserSession(
        session_id=f"test-sess-{secrets.token_hex(8)}",
        user_id=test_supervisor.id,
        ip_address="127.0.0.1",
        device_browser="pytest-client",
        is_revoked=False
    )
    db_session.add(active_sess)
    db_session.commit()
    
    # Suspend supervisor
    res = client.patch(
        f"/api/v1/admin/supervisors/{test_supervisor.id}/status",
        json={"status": "SUSPENDED", "reason": "Annual compliance review"},
        cookies=cookies,
        headers=headers
    )
    assert res.status_code == 200
    assert res.json()["status"] == "SUSPENDED"
    
    db_session.refresh(test_supervisor)
    assert test_supervisor.status == "SUSPENDED"
    
    db_session.refresh(active_sess)
    assert active_sess.is_revoked is True
    
    # Verify AuditLog entry
    audit = db_session.query(AuditLog).filter(
        AuditLog.action == "SUPERVISOR_STATUS_CHANGED",
        AuditLog.affected_entity_id == test_supervisor.id
    ).order_by(AuditLog.timestamp.desc()).first()
    assert audit is not None
    assert "SUSPENDED" in audit.diff
    
    # Reactivate supervisor
    res_reactivate = client.patch(
        f"/api/v1/admin/supervisors/{test_supervisor.id}/status",
        json={"status": "ACTIVE", "reason": "Review completed successfully"},
        cookies=cookies,
        headers=headers
    )
    assert res_reactivate.status_code == 200
    assert res_reactivate.json()["status"] == "ACTIVE"
    db_session.refresh(test_supervisor)
    assert test_supervisor.status == "ACTIVE"

def test_reassign_supervisor_ward(super_admin_auth, test_supervisor, db_session):
    cookies = {
        settings.ADMIN_ACCESS_COOKIE: super_admin_auth["token"],
        settings.ADMIN_CSRF_COOKIE: super_admin_auth["csrf_token"]
    }
    headers = {"X-CSRF-Token": super_admin_auth["csrf_token"]}
    wards = db_session.query(Ward).all()
    if len(wards) < 2:
        pytest.skip("Requires at least 2 wards to test reassignment")
    
    target_ward = wards[1]
    res = client.patch(
        f"/api/v1/admin/supervisors/{test_supervisor.id}/ward",
        json={"ward_id": str(target_ward.id), "reason": "Operational pilot rebalancing"},
        cookies=cookies,
        headers=headers
    )
    assert res.status_code == 200
    assert res.json()["ward_id"] == str(target_ward.id)
    
    db_session.refresh(test_supervisor.profile)
    assert test_supervisor.profile.ward_id == target_ward.id
    
    audit = db_session.query(AuditLog).filter(
        AuditLog.action == "SUPERVISOR_WARD_REASSIGNED",
        AuditLog.affected_entity_id == test_supervisor.id
    ).order_by(AuditLog.timestamp.desc()).first()
    assert audit is not None
    assert target_ward.name in audit.diff

def test_ward_csv_and_pdf_export(super_admin_auth, db_session):
    cookies = {
        settings.ADMIN_ACCESS_COOKIE: super_admin_auth["token"],
        settings.ADMIN_CSRF_COOKIE: super_admin_auth["csrf_token"]
    }
    ward = db_session.query(Ward).first()
    assert ward is not None
    
    # CSV Export
    csv_res = client.get(f"/api/v1/admin/wards/{ward.id}/export-csv", cookies=cookies)
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert "attachment;" in csv_res.headers["content-disposition"]
    csv_text = csv_res.text
    assert "Transaction ID" in csv_text
    assert "Wet Organic (kg)" in csv_text
    assert "Dry Recyclable (kg)" in csv_text
    assert "Pseudonymous Beneficiary" in csv_text
    
    # PDF Export
    pdf_res = client.get(f"/api/v1/admin/wards/{ward.id}/export-pdf", cookies=cookies)
    assert pdf_res.status_code == 200
    assert "application/pdf" in pdf_res.headers["content-type"]
    assert "filename=" in pdf_res.headers["content-disposition"]
    assert pdf_res.content.startswith(b"%PDF-")

def test_public_open_data_cell_suppression(db_session):
    # Create an isolated test ward with < 10 citizens
    sparse_ward = db_session.query(Ward).filter(Ward.name == "Sparse Test Ward").first()
    if not sparse_ward:
        sparse_ward = Ward(
            name="Sparse Test Ward",
            zone="South Test Zone"
        )
        db_session.add(sparse_ward)
        db_session.flush()
    
    # Ensure fewer than 10 citizens in this ward (e.g. 2 citizens)
    existing_count = db_session.query(UserProfile).filter(UserProfile.ward_id == sparse_ward.id).count()
    if existing_count == 0:
        for i in range(2):
            u = User(role="CITIZEN", status="ACTIVE", password_hash="fake", is_adult_declared=True)
            db_session.add(u)
            db_session.flush()
            db_session.add(UserProfile(user_id=u.id, name=f"Sparse Citizen {i}", ward_id=sparse_ward.id))
        db_session.commit()
    
    # 1. Test GET /api/v1/public/open-data/wards
    res = client.get("/api/v1/public/open-data/wards")
    assert res.status_code == 200
    body = res.json()
    assert "data" in body
    assert "threshold" in body
    
    sparse_data = next((w for w in body["data"] if w["ward_name"] == "Sparse Test Ward"), None)
    assert sparse_data is not None
    assert sparse_data["is_suppressed"] is True
    assert sparse_data["active_households"] == "< 10"
    assert sparse_data["total_collected_kg"] is None
    assert sparse_data["segregation_compliance_percentage"] is None
    
    # 2. Test GET /api/v1/public/open-data/monthly-trends
    trends_res = client.get(f"/api/v1/public/open-data/monthly-trends?ward_id={sparse_ward.id}")
    assert trends_res.status_code == 200
    trends_body = trends_res.json()
    assert "trends" in trends_body
    
    # 3. Test GET /api/v1/public/open-data/download-csv
    csv_res = client.get("/api/v1/public/open-data/download-csv")
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert "attachment; filename=\"greenpay_bengaluru_open_data.csv\"" in csv_res.headers["content-disposition"].lower()
    assert "Ward Name" in csv_res.text
