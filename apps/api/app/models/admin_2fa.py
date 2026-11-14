from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
from app.core.security import encrypt_meter_number, decrypt_meter_number

class Admin2FA(BaseModel):
    __tablename__ = "admin_2fa"
    
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    totp_secret_encrypted = Column(Text, nullable=True) # AES-256 encrypted base32 TOTP secret
    is_enabled = Column(Boolean, default=False, nullable=False)
    recovery_codes_hashed = Column(Text, nullable=True) # JSON array of 10 SHA-256 hashes
    enrolled_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])

    @property
    def totp_secret(self) -> str:
        if not self.totp_secret_encrypted:
            return ""
        return decrypt_meter_number(self.totp_secret_encrypted)

    @totp_secret.setter
    def totp_secret(self, secret: str):
        if secret:
            self.totp_secret_encrypted = encrypt_meter_number(secret)
        else:
            self.totp_secret_encrypted = None

