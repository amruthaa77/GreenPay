import pytest
from decimal import Decimal
from fastapi import HTTPException
from app.core.security import create_access_token
from app.models.dry_waste import DryWasteCategory, WasteCollectionItem
from app.models.waste import WasteEntry
from app.models.credit_ledger import CreditTransaction
from app.models.user import User, UserProfile
from app.schemas.dry_waste import (
    DryWasteItemInput,
    DryWasteCollectionCreateRequest,
    DryWasteCategoryUpdateRequest,
)
from app.services.dry_waste_engine import DryWasteEngine
from app.services.audit_service import AuditService


# =============================================================================
# 1. Aluminium 1 kg = 22 GP
# =============================================================================
def test_aluminium_rate_calculation(db_session, seed_wards_and_schedule):
    items = [DryWasteItemInput(category_code="aluminium_metal", weight_kg=1.0)]
    calculated_items, total_weight, total_points, formula = DryWasteEngine.calculate_collection_points(
        db_session, items
    )
    assert len(calculated_items) == 1
    assert calculated_items[0]["category_code"] == "aluminium_metal"
    assert calculated_items[0]["rate_per_kg"] == 22.0
    assert calculated_items[0]["weight_kg"] == 1.0
    assert calculated_items[0]["points_earned"] == 22.0
    assert total_points == 22.0
    assert total_weight == 1.0


# =============================================================================
# 2. PET Bottles 2 kg = 36 GP
# =============================================================================
def test_pet_bottles_rate_calculation(db_session, seed_wards_and_schedule):
    items = [DryWasteItemInput(category_code="pet_bottles", weight_kg=2.0)]
    calculated_items, total_weight, total_points, formula = DryWasteEngine.calculate_collection_points(
        db_session, items
    )
    assert len(calculated_items) == 1
    assert calculated_items[0]["category_code"] == "pet_bottles"
    assert calculated_items[0]["rate_per_kg"] == 18.0
    assert calculated_items[0]["weight_kg"] == 2.0
    assert calculated_items[0]["points_earned"] == 36.0
    assert total_points == 36.0
    assert total_weight == 2.0


# =============================================================================
# 3. Newspaper 1 kg = 10 GP
# =============================================================================
def test_newspaper_rate_calculation(db_session, seed_wards_and_schedule):
    items = [DryWasteItemInput(category_code="newspapers_magazines", weight_kg=1.0)]
    calculated_items, total_weight, total_points, formula = DryWasteEngine.calculate_collection_points(
        db_session, items
    )
    assert len(calculated_items) == 1
    assert calculated_items[0]["category_code"] == "newspapers_magazines"
    assert calculated_items[0]["rate_per_kg"] == 10.0
    assert calculated_items[0]["weight_kg"] == 1.0
    assert calculated_items[0]["points_earned"] == 10.0
    assert total_points == 10.0


# =============================================================================
# 4. Cardboard 2 kg = 20 GP
# =============================================================================
def test_cardboard_rate_calculation(db_session, seed_wards_and_schedule):
    items = [DryWasteItemInput(category_code="cardboard", weight_kg=2.0)]
    calculated_items, total_weight, total_points, formula = DryWasteEngine.calculate_collection_points(
        db_session, items
    )
    assert len(calculated_items) == 1
    assert calculated_items[0]["category_code"] == "cardboard"
    assert calculated_items[0]["rate_per_kg"] == 10.0
    assert calculated_items[0]["weight_kg"] == 2.0
    assert calculated_items[0]["points_earned"] == 20.0
    assert total_points == 20.0


# =============================================================================
# 5. Multiple Categories Combined = 88 GP
# =============================================================================
def test_multiple_categories_total_88_gp(db_session, seed_wards_and_schedule, test_citizen, test_supervisor):
    """
    Validates exact prompt scenario:
    Aluminium: 1 kg x 22 = 22 GP
    PET bottles: 2 kg x 18 = 36 GP
    Newspaper: 1 kg x 10 = 10 GP
    Cardboard: 2 kg x 10 = 20 GP
    Total = 88 GP
    """
    items = [
        DryWasteItemInput(category_code="aluminium_metal", weight_kg=1.0),
        DryWasteItemInput(category_code="pet_bottles", weight_kg=2.0),
        DryWasteItemInput(category_code="newspapers_magazines", weight_kg=1.0),
        DryWasteItemInput(category_code="cardboard", weight_kg=2.0),
    ]

    calculated_items, total_weight, total_points, formula = DryWasteEngine.calculate_collection_points(
        db_session, items
    )
    assert total_weight == 6.0
    assert total_points == 88.0
    assert "22" in formula
    assert "36" in formula
    assert "10" in formula
    assert "20" in formula
    assert "Total: 88 GP" in formula

    # Record via engine
    payload = DryWasteCollectionCreateRequest(
        greenpay_id=test_citizen.greenpay_id,
        items=items,
        notes="Multiple dry waste categories verified"
    )
    response = DryWasteEngine.record_collection(
        db=db_session,
        payload=payload,
        supervisor=test_supervisor
    )
    assert response.total_points_earned == 88.0
    assert response.total_weight_kg == 6.0
    assert len(response.items) == 4

    # Verify credit transaction in DB
    tx = (
        db_session.query(CreditTransaction)
        .filter(CreditTransaction.waste_entry_id == response.id)
        .first()
    )
    assert tx is not None
    assert tx.credits_amount == 88.0
    assert tx.user_id == test_citizen.id


# =============================================================================
# 6. Decimal Weight Calculation
# =============================================================================
def test_decimal_weight_calculation(db_session, seed_wards_and_schedule):
    """
    Aluminium: 1.5 kg x 22 GP/kg = 33.0 GP
    PET bottles: 0.25 kg x 18 GP/kg = 4.5 GP
    Cardboard: 0.75 kg x 10 GP/kg = 7.5 GP
    Total = 45.0 GP
    """
    items = [
        DryWasteItemInput(category_code="aluminium_metal", weight_kg=1.5),
        DryWasteItemInput(category_code="pet_bottles", weight_kg=0.25),
        DryWasteItemInput(category_code="cardboard", weight_kg=0.75),
    ]
    calculated_items, total_weight, total_points, formula = DryWasteEngine.calculate_collection_points(
        db_session, items
    )
    assert total_weight == 2.5
    assert total_points == 45.0
    assert calculated_items[0]["points_earned"] == 33.0
    assert calculated_items[1]["points_earned"] == 4.5
    assert calculated_items[2]["points_earned"] == 7.5


# =============================================================================
# 7. Invalid and Inactive Category Rejection
# =============================================================================
def test_invalid_and_inactive_category_rejection(db_session, seed_wards_and_schedule):
    # Unknown category
    with pytest.raises(HTTPException) as exc_info:
        items = [DryWasteItemInput(category_code="non_existent_category_slug", weight_kg=1.0)]
        DryWasteEngine.calculate_collection_points(db_session, items)
    assert exc_info.value.status_code == 404
    assert "does not exist" in exc_info.value.detail

    # Inactive category
    cardboard = db_session.query(DryWasteCategory).filter(DryWasteCategory.code == "cardboard").first()
    cardboard.is_active = False
    db_session.commit()

    with pytest.raises(HTTPException) as exc_inactive:
        items_inactive = [DryWasteItemInput(category_code="cardboard", weight_kg=1.0)]
        DryWasteEngine.calculate_collection_points(db_session, items_inactive)
    assert exc_inactive.value.status_code == 400
    assert "inactive" in exc_inactive.value.detail

    # Restore active state
    cardboard.is_active = True
    db_session.commit()


# =============================================================================
# 8. Zero and Negative Weight Rejection
# =============================================================================
def test_zero_and_negative_weight_rejection():
    # Zero weight rejected by Pydantic validator
    with pytest.raises(ValueError):
        DryWasteItemInput(category_code="aluminium_metal", weight_kg=0.0)

    # Negative weight rejected by Pydantic validator
    with pytest.raises(ValueError):
        DryWasteItemInput(category_code="aluminium_metal", weight_kg=-2.5)


# =============================================================================
# 9. Unauthorised Citizen Submission Rejection
# =============================================================================
def test_unauthorised_citizen_submission_rejection(client, test_citizen, seed_wards_and_schedule):
    # Citizen JWT token attempting to post to supervisor endpoint
    token = create_access_token(test_citizen.id, test_citizen.role)
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "greenpay_id": test_citizen.greenpay_id,
        "items": [{"category_code": "aluminium_metal", "weight_kg": 1.0}]
    }
    res = client.post("/api/v1/supervisor/dry-waste-collection", json=payload, headers=headers)
    assert res.status_code == 403
    assert "forbidden" in res.json().get("detail", "").lower()


# =============================================================================
# 10. Duplicate Transaction Prevention (Idempotency)
# =============================================================================
def test_duplicate_transaction_prevention(db_session, seed_wards_and_schedule, test_citizen, test_supervisor):
    idempotency_key = "idemp-test-uuid-999001"
    items = [DryWasteItemInput(category_code="aluminium_metal", weight_kg=1.0)]

    payload = DryWasteCollectionCreateRequest(
        greenpay_id=test_citizen.greenpay_id,
        items=items,
        idempotency_key=idempotency_key,
        notes="First attempt"
    )

    # First submission
    res1 = DryWasteEngine.record_collection(db_session, payload, test_supervisor)
    assert res1.total_points_earned == 22.0

    # Count entries
    entries_count1 = db_session.query(WasteEntry).filter(WasteEntry.idempotency_key == idempotency_key).count()
    tx_count1 = db_session.query(CreditTransaction).filter(CreditTransaction.user_id == test_citizen.id).count()
    assert entries_count1 == 1

    # Second submission with IDENTICAL idempotency key
    res2 = DryWasteEngine.record_collection(db_session, payload, test_supervisor)
    assert res2.id == res1.id
    assert res2.transaction_id == res1.transaction_id

    # Verify NO duplicate records created
    entries_count2 = db_session.query(WasteEntry).filter(WasteEntry.idempotency_key == idempotency_key).count()
    tx_count2 = db_session.query(CreditTransaction).filter(CreditTransaction.user_id == test_citizen.id).count()
    assert entries_count2 == 1
    assert tx_count2 == tx_count1


# =============================================================================
# 11. Historical Rate Preservation
# =============================================================================
def test_historical_rate_preservation(db_session, seed_wards_and_schedule, test_citizen, test_supervisor, test_super_admin):
    # 1. Record collection with Aluminium at 22 GP/kg
    items = [DryWasteItemInput(category_code="aluminium_metal", weight_kg=2.0)]
    payload = DryWasteCollectionCreateRequest(
        greenpay_id=test_citizen.greenpay_id,
        items=items
    )
    col = DryWasteEngine.record_collection(db_session, payload, test_supervisor)
    assert col.total_points_earned == 44.0

    # Verify line item rate snapshot
    line_item = (
        db_session.query(WasteCollectionItem)
        .filter(WasteCollectionItem.waste_entry_id == col.id)
        .first()
    )
    assert line_item.rate_per_kg == 22.0
    assert line_item.points_earned == 44.0

    # 2. Admin updates Aluminium rate from 22 to 30 GP/kg
    updated_cat = DryWasteEngine.update_category_rate(
        db=db_session,
        category_id="aluminium_metal",
        new_rate=30.0,
        admin=test_super_admin,
        change_reason="Municipal incentive boost for aluminium recovery"
    )
    assert updated_cat.rate_per_kg == 30.0

    # 3. Assert historical line item still preserves 22.0 GP/kg rate snapshot
    db_session.refresh(line_item)
    assert line_item.rate_per_kg == 22.0
    assert line_item.points_earned == 44.0

    # 4. New collection uses the updated 30 GP/kg rate
    col2 = DryWasteEngine.record_collection(db_session, payload, test_supervisor)
    assert col2.total_points_earned == 60.0  # 2.0 kg * 30 = 60 GP

    # Restore rate back to 22.0
    DryWasteEngine.update_category_rate(
        db=db_session,
        category_id="aluminium_metal",
        new_rate=22.0,
        admin=test_super_admin,
        change_reason="Restore baseline rate"
    )


# =============================================================================
# 12. Individual Household Balance Accuracy
# =============================================================================
def test_individual_household_balance_accuracy(db_session, seed_wards_and_schedule, test_supervisor):
    # Create Citizen A
    citizen_a = User(
        greenpay_id="GP-HOUSEHOLD-A",
        password_hash="pwd",
        role="CITIZEN",
        status="ACTIVE",
    )
    db_session.add(citizen_a)
    db_session.flush()
    profile_a = UserProfile(user_id=citizen_a.id, name="Household A", ward_id=seed_wards_and_schedule["Koramangala"].id)
    db_session.add(profile_a)

    # Create Citizen B
    citizen_b = User(
        greenpay_id="GP-HOUSEHOLD-B",
        password_hash="pwd",
        role="CITIZEN",
        status="ACTIVE",
    )
    db_session.add(citizen_b)
    db_session.flush()
    profile_b = UserProfile(user_id=citizen_b.id, name="Household B", ward_id=seed_wards_and_schedule["Koramangala"].id)
    db_session.add(profile_b)
    db_session.commit()

    # Citizen A earns 88 GP
    payload_a = DryWasteCollectionCreateRequest(
        greenpay_id=citizen_a.greenpay_id,
        items=[
            DryWasteItemInput(category_code="aluminium_metal", weight_kg=1.0), # 22
            DryWasteItemInput(category_code="pet_bottles", weight_kg=2.0),       # 36
            DryWasteItemInput(category_code="newspapers_magazines", weight_kg=1.0), # 10
            DryWasteItemInput(category_code="cardboard", weight_kg=2.0),         # 20
        ]
    )
    DryWasteEngine.record_collection(db_session, payload_a, test_supervisor)

    # Citizen B earns 36 GP
    payload_b = DryWasteCollectionCreateRequest(
        greenpay_id=citizen_b.greenpay_id,
        items=[DryWasteItemInput(category_code="pet_bottles", weight_kg=2.0)] # 36
    )
    DryWasteEngine.record_collection(db_session, payload_b, test_supervisor)

    # Assert balances are isolated per household
    bal_a = DryWasteEngine.get_household_points_balance(db_session, citizen_a.id)
    bal_b = DryWasteEngine.get_household_points_balance(db_session, citizen_b.id)

    assert bal_a.current_balance == 88.0
    assert bal_a.total_earned == 88.0
    assert bal_b.current_balance == 36.0
    assert bal_b.total_earned == 36.0


# =============================================================================
# 13. Database Rollback on Failed Collection
# =============================================================================
def test_database_rollback_on_failed_collection(db_session, seed_wards_and_schedule, test_citizen, test_supervisor, monkeypatch):
    initial_entries_count = db_session.query(WasteEntry).count()
    initial_items_count = db_session.query(WasteCollectionItem).count()
    initial_tx_count = db_session.query(CreditTransaction).count()

    items = [DryWasteItemInput(category_code="aluminium_metal", weight_kg=1.0)]
    payload = DryWasteCollectionCreateRequest(
        greenpay_id=test_citizen.greenpay_id,
        items=items
    )

    # Monkeypatch CreditTransaction to trigger a database exception during flush
    def faulty_audit(*args, **kwargs):
        raise RuntimeError("Simulated mid-transaction failure")

    monkeypatch.setattr(AuditService, "log_action", faulty_audit)

    with pytest.raises(RuntimeError) as exc_info:
        DryWasteEngine.record_collection(db_session, payload, test_supervisor)
    assert "Simulated mid-transaction failure" in str(exc_info.value)

    # Verify COMPLETE ROLLBACK: no partial waste entry, no orphaned collection items, no ledger entry
    assert db_session.query(WasteEntry).count() == initial_entries_count
    assert db_session.query(WasteCollectionItem).count() == initial_items_count
    assert db_session.query(CreditTransaction).count() == initial_tx_count
