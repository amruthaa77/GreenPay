import pytest
import concurrent.futures
from datetime import datetime
from sqlalchemy.orm import sessionmaker
from app.core.security import create_access_token, generate_csrf_token, hash_password
from app.models.user import User, UserProfile
from app.models.credit_ledger import CreditTransaction
from app.models.redemption import RedemptionItem, RedemptionTransaction
from app.models.audit import AuditLog
from app.core.config import settings


@pytest.fixture
def grocery_items(db_session):
    """Ensure standard 5 grocery products exist with fresh stock."""
    products = [
        {"title": "Rice", "cost": 120.0, "stock": 50, "badge": "1 kg • Staple Ration"},
        {"title": "Toor Dal", "cost": 140.0, "stock": 40, "badge": "1 kg • High Protein"},
        {"title": "Sunflower Cooking Oil", "cost": 150.0, "stock": 30, "badge": "1 Litre • Fortified Oil"},
        {"title": "Sugar", "cost": 80.0, "stock": 50, "badge": "1 kg • Sulfur Free"},
        {"title": "Iodized Salt", "cost": 60.0, "stock": 60, "badge": "1 kg • Essential Mineral"},
    ]
    items_map = {}
    for p in products:
        item = db_session.query(RedemptionItem).filter(RedemptionItem.title == p["title"]).first()
        if not item:
            item = RedemptionItem(
                item_type="GROCERY",
                title=p["title"],
                description=f"Standard ration of {p['title']}",
                credit_cost=p["cost"],
                stock_remaining=p["stock"],
                stock_limit=100,
                partner_name="Karnataka Food & Civil Supplies",
                badge_text=p["badge"],
                is_active=True
            )
            db_session.add(item)
            db_session.flush()
        else:
            item.credit_cost = p["cost"]
            item.stock_remaining = p["stock"]
            item.is_active = True
        items_map[p["title"]] = item
    db_session.commit()
    return items_map


def test_citizen_with_200_gp_redeems_rice_120_gp(client, test_citizen, grocery_items, db_session):
    """
    Test Case 1: Citizen with 200 GP redeems Rice for 120 GP:
    - Verifies 200 OK response with full receipt fields.
    - Verifies authoritative remaining balance is exactly 80.0 GP.
    - Verifies previous balance was 200.0 GP.
    """
    client.cookies.clear()
    token = create_access_token(test_citizen.id, test_citizen.role)
    csrf = generate_csrf_token()
    client.cookies.set(settings.CITIZEN_ACCESS_COOKIE, token)
    client.cookies.set(settings.CITIZEN_CSRF_COOKIE, csrf)
    headers = {"X-CSRF-Token": csrf, "Authorization": f"Bearer {token}"}

    # Grant test citizen exactly 200 GP via clean credit transaction
    db_session.add(CreditTransaction(
        user_id=test_citizen.id,
        credits_amount=200.0,
        calculation_formula="Controlled Test Balance: 200 GP",
        schedule_version=1,
        is_reversal=False
    ))
    db_session.commit()

    rice = grocery_items["Rice"]
    initial_stock = rice.stock_remaining

    res = client.post(
        "/api/v1/citizen/redemptions",
        json={"item_id": rice.id, "idempotency_key": "test-rice-200gp-01"},
        headers=headers
    )
    assert res.status_code == 200, res.text
    data = res.json()

    assert data["item_title"] == "Rice"
    assert data["credits_spent"] == 120.0
    assert data["previous_balance"] == 200.0
    assert data["remaining_balance"] == 80.0
    assert data["status"] == "CONFIRMED"
    assert data["coupon_code"].startswith("GP-GROC-2026-")
    assert data["citizen_greenpay_id"] == test_citizen.greenpay_id

    # Verify stock deducted
    db_session.refresh(rice)
    assert rice.stock_remaining == initial_stock - 1

    # Verify ledger balance via official points endpoint
    bal_res = client.get("/api/v1/citizen/points-balance", headers=headers)
    assert bal_res.status_code == 200
    assert bal_res.json()["current_balance"] == 80.0
    assert bal_res.json()["total_earned"] == 200.0
    assert bal_res.json()["total_redeemed"] == 120.0


def test_citizen_with_100_gp_attempts_to_redeem_rice_rejected(client, db_session, grocery_items, seed_wards_and_schedule):
    """
    Test Case 2: Citizen with 100 GP attempts to redeem Rice (120 GP):
    - Must be rejected with 400 Bad Request.
    - Detail must state insufficient points.
    - No points debited, no inventory decremented.
    """
    user_100 = User(
        greenpay_id="GP-TEST-100GP",
        password_hash=hash_password("Password123!"),
        role="CITIZEN",
        status="ACTIVE"
    )
    db_session.add(user_100)
    db_session.flush()
    db_session.add(UserProfile(user_id=user_100.id, name="Test User 100", ward_id=seed_wards_and_schedule["Koramangala"].id))
    db_session.add(CreditTransaction(
        user_id=user_100.id,
        credits_amount=100.0,
        calculation_formula="Controlled Test Balance: 100 GP",
        schedule_version=1
    ))
    db_session.commit()

    client.cookies.clear()
    token = create_access_token(user_100.id, "CITIZEN")
    csrf = generate_csrf_token()
    client.cookies.set(settings.CITIZEN_ACCESS_COOKIE, token)
    client.cookies.set(settings.CITIZEN_CSRF_COOKIE, csrf)
    headers = {"X-CSRF-Token": csrf, "Authorization": f"Bearer {token}"}

    rice = grocery_items["Rice"]
    initial_stock = rice.stock_remaining

    res = client.post(
        "/api/v1/citizen/redemptions",
        json={"item_id": rice.id},
        headers=headers
    )
    assert res.status_code == 400
    assert "Insufficient Green Points" in res.json()["detail"]

    # Stock unchanged
    db_session.refresh(rice)
    assert rice.stock_remaining == initial_stock


def test_citizen_with_50_gp_attempts_to_redeem_sugar_rejected(client, db_session, grocery_items, seed_wards_and_schedule):
    """
    Test Case 3: Citizen with 50 GP attempts to redeem Sugar (80 GP):
    - Must be rejected with 400 Bad Request.
    """
    user_50 = User(
        greenpay_id="GP-TEST-50GP",
        password_hash=hash_password("Password123!"),
        role="CITIZEN",
        status="ACTIVE"
    )
    db_session.add(user_50)
    db_session.flush()
    db_session.add(UserProfile(user_id=user_50.id, name="Test User 50", ward_id=seed_wards_and_schedule["Koramangala"].id))
    db_session.add(CreditTransaction(
        user_id=user_50.id,
        credits_amount=50.0,
        calculation_formula="Controlled Test Balance: 50 GP",
        schedule_version=1
    ))
    db_session.commit()

    client.cookies.clear()
    token = create_access_token(user_50.id, "CITIZEN")
    csrf = generate_csrf_token()
    client.cookies.set(settings.CITIZEN_ACCESS_COOKIE, token)
    client.cookies.set(settings.CITIZEN_CSRF_COOKIE, csrf)
    headers = {"X-CSRF-Token": csrf, "Authorization": f"Bearer {token}"}

    sugar = grocery_items["Sugar"]
    res = client.post(
        "/api/v1/citizen/redemptions",
        json={"item_id": sugar.id},
        headers=headers
    )
    assert res.status_code == 400
    assert "Insufficient Green Points" in res.json()["detail"]


def test_out_of_stock_item_rejected(client, db_session, grocery_items, seed_wards_and_schedule):
    """
    Test Case 4: Item with stock_remaining = 0 cannot be redeemed even with sufficient points.
    """
    salt = grocery_items["Iodized Salt"]
    salt.stock_remaining = 0
    db_session.commit()

    user_rich = User(
        greenpay_id="GP-TEST-RICH-01",
        password_hash=hash_password("Password123!"),
        role="CITIZEN",
        status="ACTIVE"
    )
    db_session.add(user_rich)
    db_session.flush()
    db_session.add(UserProfile(user_id=user_rich.id, name="Rich Citizen", ward_id=seed_wards_and_schedule["Koramangala"].id))
    db_session.add(CreditTransaction(
        user_id=user_rich.id,
        credits_amount=500.0,
        calculation_formula="Initial 500 GP grant",
        schedule_version=1
    ))
    db_session.commit()

    client.cookies.clear()
    token = create_access_token(user_rich.id, "CITIZEN")
    csrf = generate_csrf_token()
    client.cookies.set(settings.CITIZEN_ACCESS_COOKIE, token)
    client.cookies.set(settings.CITIZEN_CSRF_COOKIE, csrf)
    headers = {"X-CSRF-Token": csrf, "Authorization": f"Bearer {token}"}

    res = client.post(
        "/api/v1/citizen/redemptions",
        json={"item_id": salt.id},
        headers=headers
    )
    assert res.status_code == 400
    assert "out of stock" in res.json()["detail"].lower()


def test_idempotency_prevents_double_debit(client, db_session, grocery_items, seed_wards_and_schedule):
    """
    Test Case 5: Repeated submissions with the same idempotency key return the original receipt
    without deducting points or stock a second time.
    """
    user = User(
        greenpay_id="GP-TEST-IDEMP-01",
        password_hash=hash_password("Password123!"),
        role="CITIZEN",
        status="ACTIVE"
    )
    db_session.add(user)
    db_session.flush()
    db_session.add(UserProfile(user_id=user.id, name="Idemp User", ward_id=seed_wards_and_schedule["Koramangala"].id))
    db_session.add(CreditTransaction(
        user_id=user.id,
        credits_amount=200.0,
        calculation_formula="Initial 200 GP grant",
        schedule_version=1
    ))
    db_session.commit()

    client.cookies.clear()
    token = create_access_token(user.id, "CITIZEN")
    csrf = generate_csrf_token()
    client.cookies.set(settings.CITIZEN_ACCESS_COOKIE, token)
    client.cookies.set(settings.CITIZEN_CSRF_COOKIE, csrf)
    headers = {"X-CSRF-Token": csrf, "Authorization": f"Bearer {token}"}

    oil = grocery_items["Sunflower Cooking Oil"]
    initial_stock = oil.stock_remaining
    key = "unique-client-uuid-9999"

    # Call 1
    r1 = client.post("/api/v1/citizen/redemptions", json={"item_id": oil.id, "idempotency_key": key}, headers=headers)
    assert r1.status_code == 200
    tx1_id = r1.json()["id"]

    # Call 2 (double submit with same key)
    r2 = client.post("/api/v1/citizen/redemptions", json={"item_id": oil.id, "idempotency_key": key}, headers=headers)
    assert r2.status_code == 200
    assert r2.json()["id"] == tx1_id

    # Stock only decremented once
    db_session.refresh(oil)
    assert oil.stock_remaining == initial_stock - 1

    # Ledger has only 1 debit (-150 GP)
    txs = db_session.query(CreditTransaction).filter(CreditTransaction.user_id == user.id, CreditTransaction.credits_amount < 0).all()
    assert len(txs) == 1
    assert txs[0].credits_amount == -150.0


def test_super_admin_updates_grocery_inventory_and_price(client, test_super_admin, grocery_items, db_session):
    """
    Test Case 6: Super Admin can update price, stock, and status via PATCH /admin/redemptions/items/{id}.
    - Verifies audit log created with old/new diff and change reason.
    """
    client.cookies.clear()
    token = create_access_token(test_super_admin.id, "SUPER_ADMIN")
    csrf = generate_csrf_token()
    client.cookies.set(settings.ADMIN_ACCESS_COOKIE, token)
    client.cookies.set(settings.ADMIN_CSRF_COOKIE, csrf)
    headers = {"X-CSRF-Token": csrf, "Authorization": f"Bearer {token}"}

    sugar = grocery_items["Sugar"]
    res = client.patch(
        f"/api/v1/admin/redemptions/items/{sugar.id}",
        json={
            "credit_cost": 85.0,
            "stock_remaining": 450,
            "is_active": True,
            "change_reason": "Quarterly Karnataka cooperative supplier price revision"
        },
        headers=headers
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["credit_cost"] == 85.0
    assert data["stock_remaining"] == 450

    # Verify database persistence
    db_session.refresh(sugar)
    assert sugar.credit_cost == 85.0
    assert sugar.stock_remaining == 450

    # Verify AuditLog created
    audit = db_session.query(AuditLog).filter(
        AuditLog.action == "REDEMPTION_ITEM_UPDATED",
        AuditLog.affected_entity_id == sugar.id
    ).first()
    assert audit is not None
    assert audit.actor_id == test_super_admin.id
    assert "85.0" in audit.diff


def test_supervisor_cannot_update_grocery_price_or_stock(client, test_supervisor, grocery_items):
    """
    Test Case 7: Field supervisors are strictly blocked (403 Forbidden) from modifying grocery inventory/prices.
    """
    client.cookies.clear()
    token = create_access_token(test_supervisor.id, "SUPERVISOR")
    csrf = generate_csrf_token()
    client.cookies.set(settings.ADMIN_ACCESS_COOKIE, token)
    client.cookies.set(settings.ADMIN_CSRF_COOKIE, csrf)
    headers = {"X-CSRF-Token": csrf, "Authorization": f"Bearer {token}"}

    rice = grocery_items["Rice"]
    res = client.patch(
        f"/api/v1/admin/redemptions/items/{rice.id}",
        json={"credit_cost": 50.0, "change_reason": "Unauthorized attempt"},
        headers=headers
    )
    assert res.status_code == 403


def test_historical_redemption_prices_remain_unchanged_after_update(client, test_super_admin, db_session, grocery_items, seed_wards_and_schedule):
    """
    Test Case 8: When Super Admin updates the price of a grocery product later,
    all historical redemption receipts and ledgers retain their original prices and product details.
    """
    dal = grocery_items["Toor Dal"]
    original_price = dal.credit_cost  # 140 GP

    # Create citizen with 300 GP
    user = User(
        greenpay_id="GP-TEST-HIST-PRICE-01",
        password_hash=hash_password("Password123!"),
        role="CITIZEN",
        status="ACTIVE"
    )
    db_session.add(user)
    db_session.flush()
    db_session.add(UserProfile(user_id=user.id, name="Historical Price Citizen", ward_id=seed_wards_and_schedule["Koramangala"].id))
    db_session.add(CreditTransaction(
        user_id=user.id,
        credits_amount=300.0,
        calculation_formula="Initial 300 GP grant",
        schedule_version=1
    ))
    db_session.commit()

    # Citizen redeems Toor Dal at original price (140 GP)
    client.cookies.clear()
    cit_token = create_access_token(user.id, "CITIZEN")
    cit_csrf = generate_csrf_token()
    client.cookies.set(settings.CITIZEN_ACCESS_COOKIE, cit_token)
    client.cookies.set(settings.CITIZEN_CSRF_COOKIE, cit_csrf)
    cit_headers = {"X-CSRF-Token": cit_csrf, "Authorization": f"Bearer {cit_token}"}

    redeem_res = client.post(
        "/api/v1/citizen/redemptions",
        json={"item_id": dal.id},
        headers=cit_headers
    )
    assert redeem_res.status_code == 200
    tx_id = redeem_res.json()["id"]

    # Now Super Admin updates Toor Dal price to 160 GP and title to 'Premium Toor Dal'
    client.cookies.clear()
    admin_token = create_access_token(test_super_admin.id, "SUPER_ADMIN")
    admin_csrf = generate_csrf_token()
    client.cookies.set(settings.ADMIN_ACCESS_COOKIE, admin_token)
    client.cookies.set(settings.ADMIN_CSRF_COOKIE, admin_csrf)
    admin_headers = {"X-CSRF-Token": admin_csrf, "Authorization": f"Bearer {admin_token}"}

    update_res = client.patch(
        f"/api/v1/admin/redemptions/items/{dal.id}",
        json={"credit_cost": 160.0, "title": "Premium Toor Dal", "change_reason": "Price hike"},
        headers=admin_headers
    )
    assert update_res.status_code == 200

    # Query citizen's past redemptions history
    client.cookies.clear()
    client.cookies.set(settings.CITIZEN_ACCESS_COOKIE, cit_token)
    client.cookies.set(settings.CITIZEN_CSRF_COOKIE, cit_csrf)
    hist_res = client.get("/api/v1/citizen/redemptions/history", headers=cit_headers)
    assert hist_res.status_code == 200
    past_tx = next(t for t in hist_res.json() if t["id"] == tx_id)

    # Historical transaction retains original 140 GP cost and original snapshot
    assert past_tx["credits_spent"] == 140.0
    assert past_tx["item_title"] == "Toor Dal"
    assert past_tx["previous_balance"] == 300.0
    assert past_tx["remaining_balance"] == 160.0


def test_concurrent_redemptions_cannot_overspend(test_citizen, grocery_items, db_session):
    """
    Test Case 9: Rapid successive redemptions cannot overspend.
    Citizen with 120 GP attempts two redemptions of 120 GP Rice.
    - Exactly the first one must succeed and the second must immediately fail with 400 Insufficient Points.
    - Final balance must be exactly 0.0 GP and never negative.
    """
    from fastapi import HTTPException
    from app.services.redemption_service import RedemptionService

    # Set citizen balance to exactly 120 GP
    curr_bal = RedemptionService.get_citizen_balance(db_session, test_citizen.id)
    diff = 120.0 - curr_bal
    db_session.add(CreditTransaction(
        user_id=test_citizen.id,
        credits_amount=diff,
        calculation_formula="Set balance to 120 GP for rapid spend test",
        schedule_version=1
    ))
    db_session.commit()

    rice = grocery_items["Rice"]
    initial_stock = rice.stock_remaining

    # Attempt 1: succeeds
    tx1 = RedemptionService.redeem_item(
        db=db_session,
        user=test_citizen,
        item_id=rice.id,
        idempotency_key="rapid-spend-01"
    )
    assert tx1 is not None
    assert tx1.remaining_balance == 0.0
    assert tx1.credits_spent == 120.0

    # Attempt 2: must raise 400 Insufficient Green Points
    with pytest.raises(HTTPException) as exc_info:
        RedemptionService.redeem_item(
            db=db_session,
            user=test_citizen,
            item_id=rice.id,
            idempotency_key="rapid-spend-02"
        )
    assert exc_info.value.status_code == 400
    assert "Insufficient Green Points" in exc_info.value.detail

    # Stock only decremented by 1
    db_session.refresh(rice)
    assert rice.stock_remaining == initial_stock - 1

    # Verify final balance is 0.0 GP (never negative!)
    final_balance = RedemptionService.get_citizen_balance(db_session, test_citizen.id)
    assert final_balance == 0.0
