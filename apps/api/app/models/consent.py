from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

class ConsentRecord(BaseModel):
    __tablename__ = "consent_records"
    
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    consent_type = Column(String(50), nullable=False) # TERMS_AND_PRIVACY, MARKETING_NOTIFICATIONS
    consent_version = Column(String(20), default="2026.1", nullable=False)
    
    granted = Column(Boolean, default=True, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    ip_address = Column(String(50), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="consents")
