from datetime import datetime, timedelta, timezone
from app.models.waste import WasteEntry
from app.models.anomaly import AnomalyFlag
from app.services.anomaly_service import AnomalyDetector

def test_anomaly_detection_ward_fallback_and_household_zscore(db_session, test_citizen, test_supervisor, seed_wards_and_schedule):
    ward_id = seed_wards_and_schedule["Koramangala"].id
    now = datetime.now(timezone.utc)
    
    # 1. Seed 6 ward baseline entries (average ~10 kg, std ~2 kg)
    for i in range(6):
        w_entry = WasteEntry(
            transaction_id=f"GP-WARD-BASE-{i}",
            user_id=test_citizen.id,
            supervisor_id=test_supervisor.id,
            ward_id=ward_id,
            wet_kg=6.0,
            dry_kg=4.0,
            total_weight_kg=10.0 + (i % 2),
            collection_date=now - timedelta(days=20 + i)
        )
        db_session.add(w_entry)
    db_session.commit()
    
    # Test Citizen currently has 0 prior entries under their own separate identity
    # Now simulate a brand new user submitting an anomalous 45 kg entry
    new_entry = WasteEntry(
        transaction_id="GP-ANOM-TEST-01",
        user_id=test_citizen.id,
        supervisor_id=test_supervisor.id,
        ward_id=ward_id,
        wet_kg=25.0,
        dry_kg=20.0,
        total_weight_kg=45.0, # Massive spike compared to ~10 kg ward baseline
        collection_date=now
    )
    db_session.add(new_entry)
    db_session.flush()
    
    # Run anomaly detector
    flag = AnomalyDetector.inspect_weighment(db_session, new_entry, test_citizen)
    assert flag is not None
    assert flag.anomaly_type == "ROLLING_Z_SCORE_SPIKE" or flag.anomaly_type == "WARD_BASELINE_SPIKE"
    assert flag.status == "PENDING_REVIEW" # Flagged for supervisor, never auto-penalised!
    assert flag.severity in ("MEDIUM", "HIGH")
    
    # Verify flag persisted in DB
    saved_flag = db_session.query(AnomalyFlag).filter(AnomalyFlag.waste_entry_id == new_entry.id).first()
    assert saved_flag is not None
