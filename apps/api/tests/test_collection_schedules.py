import pytest
from datetime import datetime, date, timedelta, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.user import User, UserProfile
from app.models.ward import Ward
from app.models.schedule import WardCollectionSchedule, ScheduleOverride
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
def citizen_auth(db_session):
    user = db_session.query(User).filter(User.role == "CITIZEN", User.status == "ACTIVE").first()
    if not user:
        ward = db_session.query(Ward).first()
        user = User(
            role="CITIZEN",
            status="ACTIVE",
            password_hash="fakehash",
            greenpay_id="GP-104928",
            is_adult_declared=True
        )
        db_session.add(user)
        db_session.flush()
        db_session.add(UserProfile(
            user_id=user.id,
            name="Aarav Sharma",
            ward_id=ward.id if ward else None,
            green_score=86.0
        ))
        db_session.commit()
    token = create_access_token(user.id, "CITIZEN")
    return {"token": token, "user": user}

def test_admin_schedule_crud_with_audit_trail(db_session, super_admin_auth):
    ward = db_session.query(Ward).first()
    assert ward is not None, "Ward should exist"

    cookies = {
        settings.ADMIN_ACCESS_COOKIE: super_admin_auth["token"],
        settings.ADMIN_CSRF_COOKIE: super_admin_auth["csrf_token"]
    }
    headers = {"X-CSRF-Token": super_admin_auth["csrf_token"]}

    # 1. Create schedule slot
    create_payload = {
        "waste_type": "DRY",
        "day_of_week": 2, # Wednesday
        "frequency": "WEEKLY",
        "start_time": "07:30",
        "end_time": "10:30",
        "vehicle_number": "KA-01-EA-9999",
        "supervisor_name": "Test Supervisor",
        "supervisor_contact": "+91 80 2553 4410",
        "instructions": "Test segregation instructions"
    }
    res = client.post(
        f"/api/v1/admin/wards/{ward.id}/schedules",
        json=create_payload,
        cookies=cookies,
        headers=headers
    )
    assert res.status_code == 200
    sched_id = res.json()["schedule_id"]

    # Verify audit log created
    audit = db_session.query(AuditLog).filter(
        AuditLog.action == "CREATE_COLLECTION_SCHEDULE",
        AuditLog.affected_entity_id == sched_id
    ).first()
    assert audit is not None
    assert audit.actor_role == "SUPER_ADMIN"

    # 2. Update schedule slot
    update_payload = {"start_time": "08:00", "end_time": "11:00"}
    res_up = client.put(
        f"/api/v1/admin/schedules/{sched_id}",
        json=update_payload,
        cookies=cookies,
        headers=headers
    )
    assert res_up.status_code == 200

    # 3. Delete / deactivate schedule slot
    res_del = client.delete(
        f"/api/v1/admin/schedules/{sched_id}",
        cookies=cookies,
        headers=headers
    )
    assert res_del.status_code == 200

    # Verify deactivated in DB
    slot = db_session.query(WardCollectionSchedule).filter(WardCollectionSchedule.id == sched_id).first()
    assert slot.is_active is False

def test_schedule_override_creation_and_deletion(db_session, super_admin_auth):
    ward = db_session.query(Ward).first()
    cookies = {
        settings.ADMIN_ACCESS_COOKIE: super_admin_auth["token"],
        settings.ADMIN_CSRF_COOKIE: super_admin_auth["csrf_token"]
    }
    headers = {"X-CSRF-Token": super_admin_auth["csrf_token"]}

    ovr_date = (datetime.now().date() + timedelta(days=10)).isoformat()
    override_payload = {
        "override_date": ovr_date,
        "reason": "Test Festival Doorstep Collection Reorganisation",
        "waste_type": "DRY",
        "is_cancelled": True
    }
    res = client.post(
        f"/api/v1/admin/wards/{ward.id}/overrides",
        json=override_payload,
        cookies=cookies,
        headers=headers
    )
    assert res.status_code == 200
    ovr_id = res.json()["override_id"]

    # Verify in DB
    ovr = db_session.query(ScheduleOverride).filter(ScheduleOverride.id == ovr_id).first()
    assert ovr is not None
    assert ovr.is_cancelled is True

    # Delete override
    res_del = client.delete(
        f"/api/v1/admin/overrides/{ovr_id}",
        cookies=cookies,
        headers=headers
    )
    assert res_del.status_code == 200

def test_citizen_schedule_overview(citizen_auth):
    cookies = {settings.CITIZEN_ACCESS_COOKIE: citizen_auth["token"]}
    res = client.get("/api/v1/citizen/schedule", cookies=cookies)
    assert res.status_code == 200
    data = res.json()

    assert "ward_name" in data
    assert "weekly_schedules" in data
    assert len(data["weekly_schedules"]) > 0
    assert "upcoming_events" in data
    assert len(data["upcoming_events"]) > 0

    # Check Next Pickup card fields
    next_p = data.get("next_pickup")
    assert next_p is not None
    assert "waste_type" in next_p
    assert "countdown" in next_p
    assert "start_time" in next_p
    assert "vehicle_number" in next_p
    assert "can_report_missed" in next_p

def test_ical_export_rfc5545(citizen_auth):
    cookies = {settings.CITIZEN_ACCESS_COOKIE: citizen_auth["token"]}
    res = client.get("/api/v1/citizen/schedule/export-ics", cookies=cookies)
    assert res.status_code == 200
    assert "text/calendar" in res.headers["content-type"]
    assert "attachment;" in res.headers.get("content-disposition", "")

    content = res.text
    assert "BEGIN:VCALENDAR" in content
    assert "VERSION:2.0" in content
    assert "PRODID:-//GreenPay Bengaluru//Waste Collection Schedule//EN" in content
    assert "BEGIN:VTIMEZONE" in content
    assert "TZID:Asia/Kolkata" in content
    assert "BEGIN:VEVENT" in content
    assert "SUMMARY:GreenPay:" in content
    assert "END:VEVENT" in content
    assert "END:VCALENDAR" in content
