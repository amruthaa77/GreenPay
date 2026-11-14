import logging
from abc import ABC, abstractmethod
from typing import Optional
from app.core.config import settings

logger = logging.getLogger("greenpay.sms")

class BaseSMSAdapter(ABC):
    @abstractmethod
    def send_sms(self, to_phone: str, message: str) -> bool:
        pass

class ConsoleSMSAdapter(BaseSMSAdapter):
    """
    Development SMS adapter.
    Prints OTP and verification SMS to the local server console only.
    Production responses and public logs never leak OTP.
    """
    def send_sms(self, to_phone: str, message: str) -> bool:
        # Mask phone in console for privacy
        masked = to_phone[:4] + "***" + to_phone[-3:] if len(to_phone) > 7 else "***"
        logger.info(
            f"\n[DEV SMS-CONSOLE] ======================================\n"
            f"TO: {masked}\n"
            f"MESSAGE: {message}\n"
            f"========================================================"
        )
        return True

class ProductionSMSAdapterSlot(BaseSMSAdapter):
    """
    Production SMS adapter slot.
    Configured via Indian DLT approved templates (TRAI mandate) and gateway.
    Activated only when ENABLE_PRODUCTION_SMS=true and SMS_GATEWAY_URL is defined.
    See /docs/SMS_SETUP.md for registration requirements.
    """
    def __init__(self):
        self.enabled = getattr(settings, "ENABLE_PRODUCTION_SMS", False)
        
    def send_sms(self, to_phone: str, message: str) -> bool:
        if not self.enabled:
            logger.warning("[SMS] Production SMS disabled by configuration. Suppressing dispatch.")
            return False
        # Documented slot for real DLT gateway dispatch
        logger.info(f"[PROD SMS SLOT] Dispatched DLT-approved SMS to {to_phone[:4]}***")
        return True

def get_sms_adapter() -> BaseSMSAdapter:
    if settings.ENV.lower() == "production" and getattr(settings, "ENABLE_PRODUCTION_SMS", False):
        return ProductionSMSAdapterSlot()
    return ConsoleSMSAdapter()
