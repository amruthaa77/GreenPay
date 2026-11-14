import secrets
import logging
from typing import Dict, Any

logger = logging.getLogger("greenpay.email")

class EmailService:
    @staticmethod
    def generate_unsubscribe_token() -> str:
        return secrets.token_urlsafe(32)

    @staticmethod
    def send_email(
        to_email: str,
        subject: str,
        body_text: str,
        category: str = "transactional", # transactional or marketing
        unsubscribe_token: str = None
    ) -> Dict[str, Any]:
        """
        Local mail catcher / mock service for development and testing.
        Logs email cleanly with structured metadata and unsubscribe headers.
        """
        unsubscribe_url = (
            f"http://localhost:5173/unsubscribe?token={unsubscribe_token}"
            if unsubscribe_token
            else None
        )
        
        email_record = {
            "to": to_email,
            "subject": subject,
            "category": category,
            "body": body_text,
            "unsubscribe_url": unsubscribe_url,
        }
        
        logger.info(
            f"[MAIL CATCHER] Sent {category} email to '{to_email}' | Subject: '{subject}' | Unsubscribe: {unsubscribe_url}"
        )
        return email_record
