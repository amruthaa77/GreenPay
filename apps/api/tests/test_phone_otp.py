import pytest
from app.models.phone_verification import PhoneVerification
from app.models.user import User
from app.core.security import create_access_token, generate_csrf_token

def _auth_headers(user: User):
    token = create_access_token(user.id, user.role)
    csrf = generate_csrf_token()
    return {
        "Authorization": f"Bearer {token}",
        "X-CSRF-Token": csrf
    }

def test_phone_otp_send_and_verify_activates_pending_citizen(client, test_citizen, db_session):
    # Set citizen to PENDING initially
    test_citizen.status = "PENDING"
    db_session.commit()

    headers = _auth_headers(test_citizen)

    # 1. Request OTP
    res_send = client.post("/api/v1/citizen/phone/send-otp", json={
        "phone_number": "+919876543210",
        "sms_consent": True
    }, headers=headers)
    assert res_send.status_code == 200
    assert "Verification code sent" in res_send.json()["message"]

    # Retrieve OTP record from DB
    verification = db_session.query(PhoneVerification).filter(
        PhoneVerification.user_id == test_citizen.id
    ).first()
    assert verification is not None
    assert verification.attempts_count == 0

    # 2. Resend immediately within cooldown should fail with 429
    res_cooldown = client.post("/api/v1/citizen/phone/send-otp", json={
        "phone_number": "+919876543210",
        "sms_consent": True
    }, headers=headers)
    assert res_cooldown.status_code == 429
    assert "Please wait" in res_cooldown.json()["detail"]

    # 3. Enter incorrect OTP
    res_wrong = client.post("/api/v1/citizen/phone/verify-otp", json={
        "otp": "000000"
    }, headers=headers)
    assert res_wrong.status_code == 400
    assert "Incorrect verification code" in res_wrong.json()["detail"]

    # 4. We know verification has otp_hash; let's test valid OTP
    import hashlib
    # Find matching OTP (or set a deterministic one for testing)
    verification.otp_hash = hashlib.sha256("123456".encode("utf-8")).hexdigest()
    db_session.commit()

    res_correct = client.post("/api/v1/citizen/phone/verify-otp", json={
        "otp": "123456"
    }, headers=headers)
    assert res_correct.status_code == 200
    data = res_correct.json()
    assert data["activated"] is True
    assert data["account_status"] == "ACTIVE"

    # Verify user profile in DB has phone set and status is ACTIVE
    db_session.refresh(test_citizen)
    assert test_citizen.status == "ACTIVE"
    assert test_citizen.profile.phone_number == "+919876543210"
