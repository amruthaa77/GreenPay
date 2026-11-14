import pytest
from sqlalchemy import text
from sqlalchemy.exc import OperationalError, DBAPIError
from app.models.credit_ledger import CreditTransaction
from app.models.user import User
from app.core.security import hash_password

def test_ledger_append_only_immutability_triggers(db_session, seed_wards_and_schedule):
    # Create an independent user for this test
    user = User(
        password_hash=hash_password("Pass123!"),
        role="CITIZEN",
        status="ACTIVE",
        is_adult_declared=True
    )
    db_session.add(user)
    db_session.flush()
    user_id = user.id

    # 1. Insertion into credit_transactions succeeds
    tx = CreditTransaction(
        user_id=user_id,
        schedule_version=1,
        credits_amount=50.0,
        calculation_formula="5.00 kg (Dry) x 10 credits/kg = 50.0 credits",
        is_reversal=False
    )
    db_session.add(tx)
    db_session.flush()
    tx_id = tx.id

    # 2. Direct UPDATE on credit_transactions must trigger database error
    with pytest.raises((OperationalError, DBAPIError)) as excinfo_upd:
        with db_session.begin_nested():
            db_session.execute(
                text("UPDATE credit_transactions SET credits_amount = 999.0 WHERE id = :id"),
                {"id": tx_id}
            )
    assert "append-only" in str(excinfo_upd.value).lower()

    # 3. Direct DELETE on credit_transactions must trigger database error
    with pytest.raises((OperationalError, DBAPIError)) as excinfo_del:
        with db_session.begin_nested():
            db_session.execute(
                text("DELETE FROM credit_transactions WHERE id = :id"),
                {"id": tx_id}
            )
    assert "append-only" in str(excinfo_del.value).lower()

    # 4. Legitimate audit correction must be performed via reversing entry
    reversal_tx = CreditTransaction(
        user_id=user_id,
        schedule_version=1,
        credits_amount=-50.0, # Negative reversal
        calculation_formula="Reversal correction for erroneous entry",
        is_reversal=True,
        reversal_of_id=tx_id
    )
    db_session.add(reversal_tx)
    db_session.flush()
    
    # Net balance verified
    all_txs = db_session.query(CreditTransaction).filter(CreditTransaction.user_id == user_id).all()
    assert len(all_txs) == 2
    net_credits = sum(t.credits_amount for t in all_txs)
    assert net_credits == 0.0
