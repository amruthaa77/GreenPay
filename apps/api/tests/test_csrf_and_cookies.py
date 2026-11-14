from app.core.security import create_access_token, generate_csrf_token
from app.core.config import settings

def test_csrf_protection_on_state_changing_requests(client, test_citizen):
    token = create_access_token(test_citizen.id, test_citizen.role)
    csrf_secret = generate_csrf_token()
    
    # Set citizen access cookie and CSRF cookie
    client.cookies.set(settings.CITIZEN_ACCESS_COOKIE, token)
    client.cookies.set(settings.CITIZEN_CSRF_COOKIE, csrf_secret)
    
    # 1. State-changing request WITHOUT X-CSRF-Token header -> Must be 403 Forbidden
    res_no_header = client.patch(
        "/api/v1/citizen/email-preferences",
        json={"email_marketing_opt_in": True}
    )
    assert res_no_header.status_code == 403
    assert "CSRF" in res_no_header.json()["detail"]
    
    # 2. State-changing request with MISMATCHED X-CSRF-Token -> Must be 403 Forbidden
    res_mismatch = client.patch(
        "/api/v1/citizen/email-preferences",
        json={"email_marketing_opt_in": True},
        headers={"X-CSRF-Token": "invalid-wrong-csrf-token"}
    )
    assert res_mismatch.status_code == 403
    assert "CSRF" in res_mismatch.json()["detail"]
    
    # 3. State-changing request with VALID MATCHING X-CSRF-Token -> Must succeed
    res_valid = client.patch(
        "/api/v1/citizen/email-preferences",
        json={"email_marketing_opt_in": True},
        headers={"X-CSRF-Token": csrf_secret}
    )
    assert res_valid.status_code == 200
    assert res_valid.json()["marketing_opt_in"] is True

def test_cookie_scope_isolation_citizen_vs_admin(client, test_citizen, test_supervisor):
    citizen_token = create_access_token(test_citizen.id, test_citizen.role)
    supervisor_token = create_access_token(test_supervisor.id, test_supervisor.role)
    
    # Scenario A: Citizen cookie sent to admin route
    client.cookies.clear()
    client.cookies.set(settings.CITIZEN_ACCESS_COOKIE, citizen_token)
    res_admin = client.get("/api/v1/supervisor/lookup-citizen/GP-999001")
    # Must be 401 or 403 because citizen cookie is not accepted for supervisor route
    assert res_admin.status_code in (401, 403)
    
    # Scenario B: Admin cookie sent to citizen route
    client.cookies.clear()
    client.cookies.set(settings.ADMIN_ACCESS_COOKIE, supervisor_token)
    res_citizen = client.get("/api/v1/citizen/profile")
    # Must be 401 or 403 because admin cookie is not accepted for citizen route
    assert res_citizen.status_code in (401, 403)
