import json
import logging
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session

from app.models.notification import Notification, NotificationPreference
from app.models.user import User
from app.adapters.email_adapter import get_email_adapter
from app.adapters.sms_adapter import get_sms_adapter

logger = logging.getLogger("greenpay.notifications")

class NotificationService:
    CATEGORIES = [
        "COLLECTION_LOGGED",
        "CREDITS_MODIFIED",
        "TICKET_UPDATE",
        "SCHEDULE_CHANGE",
        "SECURITY_NOTICE",
        "REMINDER"
    ]

    @classmethod
    def get_user_preferences(cls, db: Session, user_id: str) -> Dict[str, Dict[str, bool]]:
        """Returns map of category -> {in_app, email, sms}."""
        prefs = db.query(NotificationPreference).filter(NotificationPreference.user_id == user_id).all()
        pref_map = {p.category: {"in_app": p.in_app_enabled, "email": p.email_enabled, "sms": p.sms_enabled} for p in prefs}
        
        # Populate defaults for missing categories
        res = {}
        for cat in cls.CATEGORIES:
            if cat in pref_map:
                res[cat] = pref_map[cat]
            else:
                # Default: in_app and email enabled, sms disabled (separate consent required)
                res[cat] = {"in_app": True, "email": True, "sms": False}
        return res

    @classmethod
    def dispatch_notification(
        cls,
        db: Session,
        user: User,
        category: str,
        title_key: str,
        message_key: str,
        params: Optional[Dict[str, Any]] = None,
        rendered_title: Optional[str] = None,
        rendered_body: Optional[str] = None
    ) -> Notification:
        """
        Dispatches notification across allowed channels (in-app, email, SMS).
        Security notices always dispatch in-app and via email.
        """
        prefs = cls.get_user_preferences(db, user.id).get(category, {"in_app": True, "email": True, "sms": False})
        
        # 1. In-App Notification
        if prefs["in_app"] or category == "SECURITY_NOTICE":
            notif = Notification(
                user_id=user.id,
                category=category,
                title_key=title_key,
                message_key=message_key,
                params_json=json.dumps(params or {})
            )
            db.add(notif)
            db.commit()
            db.refresh(notif)
        else:
            notif = None

        # 2. Email Dispatch
        email_addr = user.profile.email if user.profile else None
        if email_addr and (prefs["email"] or category == "SECURITY_NOTICE"):
            unsub_token = user.profile.unsubscribe_token if user.profile else None
            unsub_url = f"http://localhost:5173/unsubscribe?token={unsub_token}" if (unsub_token and category != "SECURITY_NOTICE") else None
            
            subject = rendered_title or f"GreenPay Notice: {title_key}"
            body = rendered_body or f"GreenPay Notice: {message_key} (Category: {category})"
            
            email_adapter = get_email_adapter()
            email_adapter.send_email(
                to_email=email_addr,
                subject=subject,
                html_content=f"<p>{body}</p>",
                text_content=body,
                unsubscribe_url=unsub_url
            )

        # 3. SMS Dispatch (Strictly opt-in)
        phone = user.profile.phone_number if user.profile else None
        if phone and prefs["sms"]:
            sms_adapter = get_sms_adapter()
            sms_msg = rendered_body or f"GreenPay: {title_key}. Log in at greenpay.blr"
            sms_adapter.send_sms(to_phone=phone, message=sms_msg)

        return notif
