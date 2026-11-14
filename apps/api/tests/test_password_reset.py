import pytest
from app.models.password_reset import PasswordResetToken
from app.models.audit import AuditLog
from app.core.security import verify_password
from app.services.security_service import SecurityService

def test_forgot_password_generic_response_for_existing_and_non_existing(client, test_citizen, db_session):
    # Existing citizen email
    res1 = client.post("/api/v1/auth/forgot-password", json={
        "identifier": "citizen.test@greenpay.blr",
        "portal": "citizen"
    })
    assert res1.status_code == 200
    msg1 = res1.json()["message"]
    assert "If an account matches" in msg1

    # Verify token was created in DB for existing citizen
    token_record = db_session.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == test_citizen.id
    ).first()
    assert token_record is not None
    assert token_record.used is False

    # Non-existing identifier
    res2 = client.post("/api/v1/auth/forgot-password", json={
        "identifier": "nonexistent@greenpay.blr",
        "portal": "citizen"
    })
    assert res2.status_code == 200
    msg2 = res2.json()["message"]
    # Identical response prevents account enumeration
    assert msg1 == msg2

def test_reset_password_success_flow(client, test_citizen, db_session):
    # Generate token
    raw_token = SecurityService.create_password_reset_token(db_session, test_citizen.id)

    # Perform password reset
    res = client.post("/api/v1/auth/reset-password", json={
        "token": raw_token,
        "new_password": "NewSecurePassword2026!"
    })
    assert res.status_code == 200
    assert "successfully reset" in res.json()["message"]

    # Verify password updated in DB
    db_session.refresh(test_citizen)
    assert verify_password("NewSecurePassword2026!", test_citizen.password_hash)
    assert not verify_password("Password123!", test_citizen.password_hash)

    # Verify token is now marked used
    token_record = db_session.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == test_citizen.id
    ).first()
    assert token_record.used is True

    # Verify audit log was created
    audit = db_session.query(AuditLog).filter(
        AuditLog.actor_id == test_citizen.id,
        AuditLog.action == "PASSWORD_RESET_COMPLETED"
    ).first()
    assert audit is not None

def test_reset_password_rejects_used_or_invalid_token(client, test_citizen, db_session):
    raw_token = SecurityService.create_password_reset_token(db_session, test_citizen.id)

    # Use it once
    res1 = client.post("/api/v1/auth/reset-password", json={
        "token": raw_token,
        "new_password": "NewSecurePassword2026!"
    })
    assert res1.status_code == 200

    # Re-use attempt must fail with 400
    res2 = client.post("/api/v1/auth/reset-password", json={
        "token": raw_token,
        "new_password": "AnotherNewPassword2026!"
    })
    assert res2.status_code == 400
    assert "invalid, expired, or has already been used" in res2.json()["detail"]

    # Bogus token must fail with 400
    res3 = client.post("/api/v1/auth/reset-password", json={
        "token": "completely-invalid-token",
        "new_password": "AnotherNewPassword2026!"
    })
    assert res3.status_code == 400
