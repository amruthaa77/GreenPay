from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

class PasswordResetToken(BaseModel):
    __tablename__ = "password_reset_tokens"
    
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(64), unique=True, index=True, nullable=False) # SHA-256
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, default=False, nullable=False)
    ip_address = Column(String(45), nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    
    def is_valid(self) -> bool:
        now = datetime.now(timezone.utc)
        expires = self.expires_at if self.expires_at.tzinfo else self.expires_at.replace(tzinfo=timezone.utc)
        return not self.used and expires > now
