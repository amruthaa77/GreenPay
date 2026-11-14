import pytest
from app.models.user_session import UserSession
from app.models.user import User
from app.core.security import create_access_token, generate_csrf_token

def _auth_headers(user: User):
    token = create_access_token(user.id, user.role)
    csrf = generate_csrf_token()
    return {
        "Authorization": f"Bearer {token}",
        "X-CSRF-Token": csrf
    }

def test_user_session_tracking_and_revocation(client, test_citizen, db_session):
    # 1. Login creates an active session
    res_login = client.post("/api/v1/auth/login", json={
        "meter_number_or_email": "BESCOM-IND-TEST01",
        "password": "Password123!"
    })
    assert res_login.status_code == 200
    csrf_token = res_login.json()["csrf_token"]
    headers = {"X-CSRF-Token": csrf_token}

    # 2. List sessions
    res_sessions = client.get("/api/v1/citizen/sessions", headers=headers)
    assert res_sessions.status_code == 200
    sessions = res_sessions.json()
    assert len(sessions) >= 1
    session_id = sessions[0]["session_id"]

    # 3. Revoke specific session
    res_revoke = client.post(f"/api/v1/citizen/sessions/{session_id}/revoke", headers=headers)
    assert res_revoke.status_code == 200
    assert "revoked successfully" in res_revoke.json()["message"]

    # Verify session is no longer in active list
    res_sessions_after = client.get("/api/v1/citizen/sessions", headers=headers)
    active_ids = [s["session_id"] for s in res_sessions_after.json()]
    assert session_id not in active_ids

def test_admin_session_management(client, test_supervisor, db_session):
    # 1. Login supervisor
    res_login = client.post("/api/v1/auth/login", json={
        "meter_number_or_email": "supervisor.test@greenpay.blr",
        "password": "AdminSecret123!"
    })
    assert res_login.status_code == 200
    csrf_token = res_login.json()["csrf_token"]
    headers = {"X-CSRF-Token": csrf_token}

    # 2. List admin sessions
    res_sessions = client.get("/api/v1/admin/sessions", headers=headers)
    assert res_sessions.status_code == 200
    sessions = res_sessions.json()
    assert len(sessions) >= 1

    # 3. Revoke all sessions
    res_revoke_all = client.post("/api/v1/admin/sessions/revoke-all", headers=headers)
    assert res_revoke_all.status_code == 200
    assert "All active sessions have been revoked" in res_revoke_all.json()["message"]

    # Verify sessions list is now empty
    res_sessions_after = client.get("/api/v1/admin/sessions", headers=headers)
    assert len(res_sessions_after.json()) == 0
