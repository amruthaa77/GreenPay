import pytest
import pyotp
import json
from app.models.admin_2fa import Admin2FA
from app.models.user import User
from app.core.security import create_access_token, generate_csrf_token

def _auth_headers(user: User):
    token = create_access_token(user.id, user.role)
    csrf = generate_csrf_token()
    return {
        "Authorization": f"Bearer {token}",
        "X-CSRF-Token": csrf
    }

def test_progressive_lockout_after_consecutive_failed_logins(client, test_citizen, db_session):
    meter = "BESCOM-IND-TEST01"
    
    # 4 failed attempts should return 401
    for _ in range(4):
        res = client.post("/api/v1/auth/login", json={
            "meter_number_or_email": meter,
            "password": "WrongPassword123!"
        })
        assert res.status_code == 401

    # 5th failed attempt triggers progressive lockout (429)
    res_lock = client.post("/api/v1/auth/login", json={
        "meter_number_or_email": meter,
        "password": "WrongPassword123!"
    })
    assert res_lock.status_code == 429
    assert "Account locked" in res_lock.json()["detail"] or "locked" in res_lock.json()["detail"]

    # Even with correct password, login is blocked while locked out
    res_blocked = client.post("/api/v1/auth/login", json={
        "meter_number_or_email": meter,
        "password": "Password123!"
    })
    assert res_blocked.status_code == 429

def test_admin_2fa_enrolment_and_challenge_flow(client, test_supervisor, db_session):
    headers = _auth_headers(test_supervisor)

    # 1. Enrol 2FA
    res_enrol = client.post("/api/v1/admin/2fa/enrol", headers=headers)
    assert res_enrol.status_code == 200
    enrol_data = res_enrol.json()
    assert "secret" in enrol_data
    assert "otpauth_url" in enrol_data
    secret = enrol_data["secret"]

    # Generate valid 6-digit TOTP code
    totp = pyotp.TOTP(secret)
    valid_code = totp.now()

    # 2. Verify and enable 2FA
    res_verify = client.post("/api/v1/admin/2fa/verify", json={
        "code": valid_code
    }, headers=headers)
    assert res_verify.status_code == 200
    verify_data = res_verify.json()
    assert verify_data["is_enabled"] is True
    recovery_codes = verify_data["recovery_codes"]
    assert len(recovery_codes) == 10

    # 3. Next login returns requires_2fa=True and temp_token
    res_login = client.post("/api/v1/auth/login", json={
        "meter_number_or_email": "supervisor.test@greenpay.blr",
        "password": "AdminSecret123!"
    })
    assert res_login.status_code == 200
    login_data = res_login.json()
    assert login_data["requires_2fa"] is True
    assert login_data["temp_token"] is not None

    temp_token = login_data["temp_token"]

    # 4. Challenge with TOTP code
    new_totp_code = totp.now()
    res_challenge = client.post("/api/v1/auth/admin/2fa-challenge", json={
        "temp_token": temp_token,
        "totp_code": new_totp_code
    })
    assert res_challenge.status_code == 200
    challenge_data = res_challenge.json()
    assert challenge_data["requires_2fa"] is False
    assert challenge_data["access_token"] is not None
    assert challenge_data["role"] == "SUPERVISOR"

    # 5. Challenge with a recovery code
    # Re-login to get a fresh temp_token
    res_login2 = client.post("/api/v1/auth/login", json={
        "meter_number_or_email": "supervisor.test@greenpay.blr",
        "password": "AdminSecret123!"
    })
    temp_token2 = res_login2.json()["temp_token"]
    recovery_code = recovery_codes[0]

    res_recovery = client.post("/api/v1/auth/admin/2fa-challenge", json={
        "temp_token": temp_token2,
        "recovery_code": recovery_code
    })
    assert res_recovery.status_code == 200
    assert res_recovery.json()["access_token"] is not None

    # Re-using the same recovery code must fail
    res_login3 = client.post("/api/v1/auth/login", json={
        "meter_number_or_email": "supervisor.test@greenpay.blr",
        "password": "AdminSecret123!"
    })
    temp_token3 = res_login3.json()["temp_token"]
    res_reuse = client.post("/api/v1/auth/admin/2fa-challenge", json={
        "temp_token": temp_token3,
        "recovery_code": recovery_code
    })
    assert res_reuse.status_code == 401
