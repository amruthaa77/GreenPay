from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

class PhoneVerification(BaseModel):
    __tablename__ = "phone_verifications"
    
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    phone_encrypted = Column(Text, nullable=False) # AES-256 encrypted phone number
    phone_hash = Column(String(64), index=True, nullable=False) # HMAC index for lookup
    otp_hash = Column(String(64), nullable=False) # SHA-256 hash of 6-digit OTP
    expires_at = Column(DateTime(timezone=True), nullable=False)
    attempts_count = Column(Integer, default=0, nullable=False) # Max 5 attempts
    resend_available_at = Column(DateTime(timezone=True), nullable=False) # 60s cooldown
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    
    def is_expired(self) -> bool:
        now = datetime.now(timezone.utc)
        expires = self.expires_at if self.expires_at.tzinfo else self.expires_at.replace(tzinfo=timezone.utc)
        return now > expires
        
    def can_resend(self) -> bool:
        now = datetime.now(timezone.utc)
        cooldown = self.resend_available_at if self.resend_available_at.tzinfo else self.resend_available_at.replace(tzinfo=timezone.utc)
        return now >= cooldown
