from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

class UserSession(BaseModel):
    __tablename__ = "user_sessions"
    
    session_id = Column(String(64), unique=True, index=True, nullable=False) # Token fingerprint / JTI
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    device_browser = Column(String(255), nullable=True) # User-agent summary
    ip_address = Column(String(45), nullable=True)
    last_active_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    is_revoked = Column(Boolean, default=False, nullable=False)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
