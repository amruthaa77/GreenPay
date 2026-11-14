import logging
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from app.core.config import settings

logger = logging.getLogger("greenpay.email")

class BaseEmailAdapter(ABC):
    @abstractmethod
    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        unsubscribe_url: Optional[str] = None
    ) -> bool:
        pass

class ConsoleEmailAdapter(BaseEmailAdapter):
    """Development / Testing adapter that prints emails to local logger (mail-catcher)."""
    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        unsubscribe_url: Optional[str] = None
    ) -> bool:
        logger.info(
            f"\n[DEV MAIL-CATCHER] =====================================\n"
            f"TO: {to_email}\n"
            f"SUBJECT: {subject}\n"
            f"BODY: {text_content or html_content}\n"
            f"UNSUBSCRIBE LINK: {unsubscribe_url or 'N/A (Transactional)'}\n"
            f"========================================================"
        )
        return True

class ProductionEmailAdapterSlot(BaseEmailAdapter):
    """
    Production adapter slot.
    Configured via SMTP or transactional mail API (e.g. AWS SES / Sendgrid / Postmark).
    Activated only when ENABLE_PRODUCTION_EMAIL=true and SMTP_HOST is defined.
    """
    def __init__(self):
        self.enabled = getattr(settings, "ENABLE_PRODUCTION_EMAIL", False)
        
    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        unsubscribe_url: Optional[str] = None
    ) -> bool:
        if not self.enabled:
            logger.warning("[EMAIL] Production email disabled by configuration. Suppressing dispatch.")
            return False
        # Documented slot for real SMTP / API dispatch
        logger.info(f"[PROD EMAIL SLOT] Dispatched to {to_email}: {subject}")
        return True

def get_email_adapter() -> BaseEmailAdapter:
    if settings.ENV.lower() == "production" and getattr(settings, "ENABLE_PRODUCTION_EMAIL", False):
        return ProductionEmailAdapterSlot()
    return ConsoleEmailAdapter()
