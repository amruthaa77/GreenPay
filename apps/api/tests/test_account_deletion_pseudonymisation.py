from app.core.security import create_access_token
from app.models.credit_ledger import CreditTransaction
from app.models.audit import AuditLog
from app.models.waste import WasteEntry

def test_account_deletion_pseudonymisation(client, db_session, test_citizen, test_supervisor, seed_wards_and_schedule):
    # 1. Add waste entry and credit transaction for citizen
    waste_entry = WasteEntry(
        transaction_id="GP-REC-FOR-DELETION-01",
        user_id=test_citizen.id,
        supervisor_id=test_supervisor.id,
        ward_id=seed_wards_and_schedule["Koramangala"].id,
        wet_kg=5.0,
        dry_kg=5.0,
        total_weight_kg=10.0,
        journey_stage="Processing"
    )
    db_session.add(waste_entry)
    db_session.flush()
    
    credit_tx = CreditTransaction(
        user_id=test_citizen.id,
        waste_entry_id=waste_entry.id,
        schedule_version=1,
        credits_amount=75.0,
        calculation_formula="5 kg Dry x 10 + 5 kg Wet x 5 = 75 credits"
    )
    db_session.add(credit_tx)
    db_session.commit()
    
    token = create_access_token(test_citizen.id, test_citizen.role)
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Rejection if confirmation string is wrong
    res_wrong = client.request("DELETE", "/api/v1/citizen/account", json={"confirmation": "wrong text"}, headers=headers)
    assert res_wrong.status_code == 400
    
    # 3. Successful deletion with confirmation
    res_del = client.request("DELETE", "/api/v1/citizen/account", json={"confirmation": "DELETE MY ACCOUNT"}, headers=headers)
    assert res_del.status_code == 200
    anon_ref = res_del.json()["pseudonymous_reference"]
    assert anon_ref.startswith("ANON-")
    
    # 4. Assert PII is erased in database
    db_session.refresh(test_citizen)
    assert test_citizen.status == "DELETED"
    assert test_citizen.meter_number_encrypted is None
    assert test_citizen.meter_number_hash is None
    assert test_citizen.profile.name == "[DELETED CITIZEN]"
    assert test_citizen.profile.email is None
    assert test_citizen.profile.phone_number is None
    
    # 5. Assert Credit Ledger transaction is preserved intact without violation of immutability
    db_session.refresh(credit_tx)
    assert credit_tx.user_id == test_citizen.id
    assert credit_tx.credits_amount == 75.0
    assert test_citizen.pseudonymous_id == anon_ref
    
    # 6. Assert AuditLog entry exists
    audit = db_session.query(AuditLog).filter(
        AuditLog.actor_id == anon_ref,
        AuditLog.action == "DPDP_ACCOUNT_DELETION_PSEUDONYMISED"
    ).first()
    assert audit is not None
    assert audit.affected_entity_id == test_citizen.id
