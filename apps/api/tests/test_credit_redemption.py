import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from app.main import app
from app.database import get_db, SessionLocal
from app.models.user import User, UserProfile
from app.models.ward import Ward
from app.models.credit_ledger import CreditTransaction
from app.models.redemption import RedemptionItem, PartnerCoupon, RedemptionTransaction
from app.core.security import hash_password, create_access_token, generate_csrf_token
from app.core.config import settings

client = TestClient(app)


@pytest.fixture(scope="module")
def setup_redemption_data():
    db = SessionLocal()
    try:
        # Create test ward
        ward = db.query(Ward).filter(Ward.name == "Malleshwaram").first()
        if not ward:
            ward = Ward(name="Malleshwaram", zone="West Zone", clean_up_fund_credits=0.0)
            db.add(ward)
            db.commit()
            db.refresh(ward)

        # Create active citizen with 300 credits
        citizen = db.query(User).filter(User.greenpay_id == "GP-TEST-RED-01").first()
        if not citizen:
            citizen = User(
                greenpay_id="GP-TEST-RED-01",
                password_hash=hash_password("Pass123!"),
                role="CITIZEN",
                status="ACTIVE",
            )
            db.add(citizen)
            db.flush()

            profile = UserProfile(
                user_id=citizen.id,
                name="Siddharth Rao",
                ward_id=ward.id,
                green_score=85.0,
            )
            db.add(profile)

            # Add 300 GP to credit ledger
            db.add(
                CreditTransaction(
                    user_id=citizen.id,
                    credits_amount=300.0,
                    calculation_formula="Initial test grant",
                    schedule_version=1,
                    is_reversal=False,
                )
            )
            db.commit()
            db.refresh(citizen)

        # Ensure citizen has sufficient balance for test suite
        from app.services.redemption_service import RedemptionService
        current_bal = RedemptionService.get_citizen_balance(db, citizen.id)
        if current_bal < 300.0:
            db.add(
                CreditTransaction(
                    user_id=citizen.id,
                    credits_amount=(300.0 - current_bal + 200.0),
                    calculation_formula="Test top-up grant",
                    schedule_version=1,
                    is_reversal=False,
                )
            )
            db.commit()

        # Create pending citizen
        pending_citizen = db.query(User).filter(User.greenpay_id == "GP-TEST-PEND-01").first()
        if not pending_citizen:
            pending_citizen = User(
                greenpay_id="GP-TEST-PEND-01",
                password_hash=hash_password("Pass123!"),
                role="CITIZEN",
                status="PENDING",
            )
            db.add(pending_citizen)
            db.flush()
            db.add(
                UserProfile(
                    user_id=pending_citizen.id,
                    name="Pending User",
                    ward_id=ward.id,
                    green_score=50.0,
                )
            )
            db.commit()
            db.refresh(pending_citizen)

        # Ensure redemption items exist
        cert_item = db.query(RedemptionItem).filter(RedemptionItem.item_type == "CERTIFICATE").first()
        if not cert_item:
            cert_item = RedemptionItem(
                item_type="CERTIFICATE",
                title="Green Household Civic Certificate",
                description="Civic recognition certificate.",
                credit_cost=100.0,
                is_active=True,
            )
            db.add(cert_item)
            db.commit()
            db.refresh(cert_item)
        else:
            cert_item.is_active = True
            db.commit()

        cleanup_item = db.query(RedemptionItem).filter(RedemptionItem.item_type == "CLEANUP_DONATION").first()
        if not cleanup_item:
            cleanup_item = RedemptionItem(
                item_type="CLEANUP_DONATION",
                title="Ward Clean-Up Fund",
                description="Community clean up donation.",
                credit_cost=50.0,
                is_active=True,
            )
            db.add(cleanup_item)
            db.commit()
            db.refresh(cleanup_item)
        else:
            cleanup_item.is_active = True
            db.commit()

        coupon_item = db.query(RedemptionItem).filter(RedemptionItem.item_type == "PARTNER_COUPON").first()
        if not coupon_item:
            coupon_item = RedemptionItem(
                item_type="PARTNER_COUPON",
                title="Compost Discount Voucher",
                description="Compost discount.",
                credit_cost=75.0,
                stock_limit=10,
                stock_remaining=10,
                is_active=True,
            )
            db.add(coupon_item)
            db.flush()
            for i in range(1, 5):
                db.add(PartnerCoupon(item_id=coupon_item.id, coupon_code=f"TEST-COUPON-{i:03d}"))
            db.commit()
            db.refresh(coupon_item)
        else:
            coupon_item.is_active = True
            db.commit()

        grocery_item = db.query(RedemptionItem).filter(RedemptionItem.item_type == "GROCERY", RedemptionItem.title.like("%Salt%")).first()

        yield {
            "ward_id": ward.id,
            "citizen_id": citizen.id,
            "pending_citizen_id": pending_citizen.id,
            "cert_item_id": cert_item.id,
            "cleanup_item_id": cleanup_item.id,
            "coupon_item_id": coupon_item.id,
            "grocery_item_id": grocery_item.id if grocery_item else None,
        }
    finally:
        # Keep non-grocery items deactivated for production catalogue cleanliness
        if cert_item:
            cert_item.is_active = False
        if cleanup_item:
            cleanup_item.is_active = False
        if coupon_item:
            coupon_item.is_active = False
        db.commit()
        db.close()


def test_catalogue_and_balance(setup_redemption_data):
    token = create_access_token(setup_redemption_data["citizen_id"], "CITIZEN")
    client.cookies.set(settings.CITIZEN_ACCESS_COOKIE, token)

    response = client.get("/api/v1/citizen/redemptions/catalogue")
    assert response.status_code == 200
    data = response.json()
    assert "balance" in data
    assert data["balance"] >= 100.0
    assert len(data["items"]) >= 3


def test_pending_citizen_cannot_redeem(setup_redemption_data):
    token = create_access_token(setup_redemption_data["pending_citizen_id"], "CITIZEN")
    csrf = generate_csrf_token()
    client.cookies.set(settings.CITIZEN_ACCESS_COOKIE, token)
    client.cookies.set(settings.CITIZEN_CSRF_COOKIE, csrf)

    response = client.post(
        "/api/v1/citizen/redemptions",
        json={"item_id": setup_redemption_data["cert_item_id"]},
        headers={"X-CSRF-Token": csrf},
    )
    assert response.status_code == 400
    assert "pending doorstep supervisor verification" in response.json()["detail"].lower()


def test_certificate_redemption_and_pdf(setup_redemption_data):
    token = create_access_token(setup_redemption_data["citizen_id"], "CITIZEN")
    csrf = generate_csrf_token()
    client.cookies.set(settings.CITIZEN_ACCESS_COOKIE, token)
    client.cookies.set(settings.CITIZEN_CSRF_COOKIE, csrf)

    # 1. Redeem Certificate (100 GP)
    idemp_key = f"test-idemp-cert-{datetime.now().timestamp()}"
    response = client.post(
        "/api/v1/citizen/redemptions",
        json={"item_id": setup_redemption_data["cert_item_id"], "idempotency_key": idemp_key},
        headers={"X-CSRF-Token": csrf},
    )
    assert response.status_code == 200
    tx_data = response.json()
    assert tx_data["item_type"] == "CERTIFICATE"
    assert tx_data["credits_spent"] == 100.0
    assert tx_data["certificate_number"].startswith("GP-CERT-2026-")
    cert_num = tx_data["certificate_number"]

    # 2. Verify negative ledger entry exists
    db = SessionLocal()
    try:
        neg_entry = (
            db.query(CreditTransaction)
            .filter(
                CreditTransaction.user_id == setup_redemption_data["citizen_id"],
                CreditTransaction.credits_amount == -100.0,
            )
            .first()
        )
        assert neg_entry is not None
        assert "Redemption: 100 GP" in neg_entry.calculation_formula
    finally:
        db.close()

    # 3. Stream Certificate PDF
    pdf_resp = client.get(f"/api/v1/citizen/redemptions/certificate/{cert_num}/pdf")
    assert pdf_resp.status_code == 200
    assert pdf_resp.headers["content-type"] == "application/pdf"
    assert len(pdf_resp.content) > 1000

    # 4. Public Verification endpoint (Zero Auth)
    pub_resp = client.get(f"/api/v1/public/verify-certificate/{cert_num}")
    assert pub_resp.status_code == 200
    pub_data = pub_resp.json()
    assert pub_data["is_valid"] is True
    assert pub_data["certificate_number"] == cert_num
    assert "Siddharth" in pub_data["masked_recipient"]
    assert pub_data["status"] == "AUTHENTIC_CIVIC_RECORD"


def test_idempotency_prevents_duplicate_charge(setup_redemption_data):
    token = create_access_token(setup_redemption_data["citizen_id"], "CITIZEN")
    csrf = generate_csrf_token()
    client.cookies.set(settings.CITIZEN_ACCESS_COOKIE, token)
    client.cookies.set(settings.CITIZEN_CSRF_COOKIE, csrf)

    idemp_key = f"unique-idemp-{datetime.now().timestamp()}"

    # First call
    r1 = client.post(
        "/api/v1/citizen/redemptions",
        json={"item_id": setup_redemption_data["cleanup_item_id"], "idempotency_key": idemp_key},
        headers={"X-CSRF-Token": csrf},
    )
    assert r1.status_code == 200
    tx1_id = r1.json()["id"]

    # Retry call with exact same idempotency key
    r2 = client.post(
        "/api/v1/citizen/redemptions",
        json={"item_id": setup_redemption_data["cleanup_item_id"], "idempotency_key": idemp_key},
        headers={"X-CSRF-Token": csrf},
    )
    assert r2.status_code == 200
    assert r2.json()["id"] == tx1_id  # Returns original record without double deducting


def test_ward_cleanup_fund_donation(setup_redemption_data):
    token = create_access_token(setup_redemption_data["citizen_id"], "CITIZEN")
    csrf = generate_csrf_token()
    client.cookies.set(settings.CITIZEN_ACCESS_COOKIE, token)
    client.cookies.set(settings.CITIZEN_CSRF_COOKIE, csrf)

    # Donate 50 GP
    response = client.post(
        "/api/v1/citizen/redemptions",
        json={
            "item_id": setup_redemption_data["cleanup_item_id"],
            "custom_amount": 50.0,
            "donor_name": "Siddharth R.",
        },
        headers={"X-CSRF-Token": csrf},
    )
    assert response.status_code == 200
    tx_data = response.json()
    assert tx_data["credits_spent"] == 50.0
    assert tx_data["donor_display_name"] == "Siddharth R."

    # Verify ward fund pooled
    fund_resp = client.get("/api/v1/citizen/redemptions/ward-funds")
    assert fund_resp.status_code == 200
    funds = fund_resp.json()
    malleshwaram = next((w for w in funds if w["ward_name"] == "Malleshwaram"), None)
    assert malleshwaram is not None
    assert malleshwaram["clean_up_credits_pooled"] >= 50.0


def test_grocery_item_redemption(setup_redemption_data):
    if not setup_redemption_data.get("grocery_item_id"):
        pytest.skip("No grocery item found")

    token = create_access_token(setup_redemption_data["citizen_id"], "CITIZEN")
    csrf = generate_csrf_token()
    client.cookies.set(settings.CITIZEN_ACCESS_COOKIE, token)
    client.cookies.set(settings.CITIZEN_CSRF_COOKIE, csrf)

    idemp_key = f"test-idemp-groc-{datetime.now().timestamp()}"
    response = client.post(
        "/api/v1/citizen/redemptions",
        json={"item_id": setup_redemption_data["grocery_item_id"], "idempotency_key": idemp_key},
        headers={"X-CSRF-Token": csrf},
    )
    assert response.status_code == 200
    tx_data = response.json()
    assert tx_data["credits_spent"] > 0
    assert tx_data["fulfillment_code"] is not None
    assert tx_data["fulfillment_code"].startswith("GP-GROC-2026-")
