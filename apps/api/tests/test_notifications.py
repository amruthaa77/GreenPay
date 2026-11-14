import pytest
from app.models.notification import Notification
from app.models.user import User
from app.core.security import create_access_token, generate_csrf_token
from app.services.notification_service import NotificationService

def _auth_headers(user: User):
    token = create_access_token(user.id, user.role)
    csrf = generate_csrf_token()
    return {
        "Authorization": f"Bearer {token}",
        "X-CSRF-Token": csrf
    }

def test_notification_centre_flow_and_preferences(client, test_citizen, db_session):
    headers = _auth_headers(test_citizen)

    # 1. Dispatch sample notification via NotificationService
    notif = NotificationService.dispatch_notification(
        db_session,
        user=test_citizen,
        category="COLLECTION_LOGGED",
        title_key="notifications.collection_success_title",
        message_key="notifications.collection_success_body",
        params={"weight_kg": 4.5, "ward": "Koramangala"}
    )
    assert notif is not None
    assert notif.is_read is False

    # 2. Query notifications list
    res_list = client.get("/api/v1/citizen/notifications", headers=headers)
    assert res_list.status_code == 200
    items = res_list.json()
    assert len(items) >= 1
    assert items[0]["id"] == notif.id
    assert items[0]["is_read"] is False

    # 3. Mark single notification read
    res_read = client.patch(f"/api/v1/citizen/notifications/{notif.id}/read", headers=headers)
    assert res_read.status_code == 200
    assert "marked as read" in res_read.json()["message"]

    db_session.refresh(notif)
    assert notif.is_read is True

    # 4. Create another unread notification and mark all read
    notif2 = NotificationService.dispatch_notification(
        db_session,
        user=test_citizen,
        category="REMINDER",
        title_key="notifications.pickup_reminder_title",
        message_key="notifications.pickup_reminder_body"
    )
    assert notif2.is_read is False

    res_all = client.post("/api/v1/citizen/notifications/read-all", headers=headers)
    assert res_all.status_code == 200
    db_session.refresh(notif2)
    assert notif2.is_read is True

    # 5. Get and update notification preferences
    res_prefs = client.get("/api/v1/citizen/notification-preferences", headers=headers)
    assert res_prefs.status_code == 200
    prefs = res_prefs.json()["preferences"]
    assert "COLLECTION_LOGGED" in prefs

    # Toggle SMS on for COLLECTION_LOGGED
    prefs["COLLECTION_LOGGED"]["sms"] = True
    res_update = client.patch("/api/v1/citizen/notification-preferences", json={
        "preferences": prefs
    }, headers=headers)
    assert res_update.status_code == 200

    # Verify updated preferences returned
    res_prefs2 = client.get("/api/v1/citizen/notification-preferences", headers=headers)
    assert res_prefs2.json()["preferences"]["COLLECTION_LOGGED"]["sms"] is True
