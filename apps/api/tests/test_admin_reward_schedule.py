import pytest
from app.core.security import create_access_token
from app.models.dry_waste import DryWasteCategory, DryWasteRateHistory
from app.models.reward_schedule import RewardSchedule

def test_admin_get_and_create_reward_schedule(client, test_super_admin, seed_wards_and_schedule, db_session):
    print("\n--- START test_admin_get_and_create_reward_schedule ---")
    client.cookies.clear()
    token = create_access_token(test_super_admin.id, test_super_admin.role)
    headers = {"Authorization": f"Bearer {token}"}

    print("Step 1: GET /api/v1/admin/reward-schedules")
    res = client.get("/api/v1/admin/reward-schedules", headers=headers)
    print("Step 1 Status:", res.status_code)
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1
    assert "rates" in data[0]
    assert data[0]["rates"] is not None
    assert "aluminium_metal" in data[0]["rates"]
    assert "pet_bottles" in data[0]["rates"]

    print("Step 2: POST /api/v1/admin/reward-schedules")
    new_rates = {
        "aluminium_metal": 25.0,
        "pet_bottles": 20.0,
        "other_recyclable_plastics": 15.0,
        "newspapers_magazines": 10.0,
        "cardboard": 10.0,
        "glass_bottles": 8.0,
        "textiles": 8.0,
        "mixed_paper": 7.0,
    }
    create_res = client.post(
        "/api/v1/admin/reward-schedules",
        headers=headers,
        json={
            "rates": new_rates,
            "change_reason": "Automated test incentive increase for metals and PET",
        },
    )
    print("Step 2 Status:", create_res.status_code)
    assert create_res.status_code == 200
    new_sched = create_res.json()
    assert new_sched["version"] >= 2
    assert new_sched["is_active"] is True
    assert new_sched["rates"]["aluminium_metal"] == 25.0
    assert new_sched["rates"]["pet_bottles"] == 20.0

    print("Step 3: Check DryWasteCategory DB record")
    metal_cat = db_session.query(DryWasteCategory).filter(DryWasteCategory.code == "aluminium_metal").first()
    assert metal_cat is not None
    assert metal_cat.rate_per_kg == 25.0

    print("Step 4: Check DryWasteRateHistory DB record")
    history = db_session.query(DryWasteRateHistory).filter(DryWasteRateHistory.category_id == metal_cat.id).first()
    assert history is not None
    assert history.new_rate == 25.0
    print("--- FINISHED test_admin_get_and_create_reward_schedule ---")

def test_supervisor_cannot_modify_rates(client, test_supervisor, seed_wards_and_schedule):
    client.cookies.clear()
    token = create_access_token(test_supervisor.id, test_supervisor.role)
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post(
        "/api/v1/admin/reward-schedules",
        headers=headers,
        json={
            "rates": {"aluminium_metal": 30.0},
            "change_reason": "Unauthorized supervisor attempt",
        },
    )
    assert res.status_code == 403
