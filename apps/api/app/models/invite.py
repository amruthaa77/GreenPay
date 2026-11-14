from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

class SupervisorInvite(BaseModel):
    __tablename__ = "supervisor_invites"
    
    # Token hash stored at rest (token itself sent once via invite link)
    token_hash = Column(String(64), unique=True, index=True, nullable=False)
    
    email = Column(String(255), nullable=False)
    name = Column(String(100), nullable=False)
    assigned_ward_id = Column(String(36), ForeignKey("wards.id"), nullable=False)
    
    created_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    
    used = Column(Boolean, default=False, nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    assigned_ward = relationship("Ward")
    created_by = relationship("User", foreign_keys=[created_by_id])
