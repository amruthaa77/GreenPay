from datetime import datetime, timedelta, timezone
from app.models.waste import WasteEntry
from app.services.predictive_service import PredictiveService

def test_forecast_requires_minimum_six_months(db_session, test_citizen, test_supervisor, seed_wards_and_schedule):
    ward_id = seed_wards_and_schedule["Koramangala"].id
    now = datetime.now(timezone.utc)
    
    # 1. Seed only 3 months of historical data
    for m in range(3):
        entry = WasteEntry(
            transaction_id=f"GP-FC-3M-{m}",
            user_id=test_citizen.id,
            supervisor_id=test_supervisor.id,
            ward_id=ward_id,
            wet_kg=100.0,
            dry_kg=50.0,
            total_weight_kg=150.0,
            collection_date=now - timedelta(days=m * 30 + 5)
        )
        db_session.add(entry)
    db_session.commit()
    
    res = PredictiveService.generate_waste_forecast(db_session, ward_id)
    assert res["status"] == "insufficient_data"
    assert res["available_months"] == 3
    assert res["required_months"] == 6
    assert res["next_month_estimate_kg"] is None

def test_forecast_with_sufficient_data_calculates_ols_and_prediction_intervals(db_session, test_citizen, test_supervisor, seed_wards_and_schedule):
    ward_id = seed_wards_and_schedule["Koramangala"].id
    now = datetime.now(timezone.utc)
    
    # 2. Seed 8 distinct months of steadily increasing data (trend: 1000, 1100, 1200...)
    for m in range(8):
        months_ago = 7 - m
        target_date = now - timedelta(days=months_ago * 30 + 10)
        entry = WasteEntry(
            transaction_id=f"GP-FC-8M-{m}",
            user_id=test_citizen.id,
            supervisor_id=test_supervisor.id,
            ward_id=ward_id,
            wet_kg=600.0 + (m * 50.0),
            dry_kg=400.0 + (m * 50.0),
            total_weight_kg=1000.0 + (m * 100.0),
            collection_date=target_date
        )
        db_session.add(entry)
    db_session.commit()
    
    res = PredictiveService.generate_waste_forecast(db_session, ward_id)
    assert res["status"] == "ok"
    assert res["is_estimate"] is True
    assert res["available_months"] == 8
    assert res["next_month_estimate_kg"] is not None
    assert res["lower_bound_kg"] is not None
    assert res["upper_bound_kg"] is not None
    
    # Assert statistical bounds hold: lower_bound < estimate < upper_bound
    assert res["lower_bound_kg"] <= res["next_month_estimate_kg"]
    assert res["next_month_estimate_kg"] <= res["upper_bound_kg"]
