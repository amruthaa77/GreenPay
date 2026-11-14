from sqlalchemy import Column, String, DateTime, Text, func
from app.models.base import BaseModel

class AuditLog(BaseModel):
    __tablename__ = "audit_logs"
    
    actor_id = Column(String(36), nullable=True, index=True)
    actor_role = Column(String(20), nullable=False) # CITIZEN, SUPERVISOR, SUPER_ADMIN, SYSTEM
    action = Column(String(50), nullable=False, index=True)
    
    affected_entity_type = Column(String(50), nullable=False) # User, WasteEntry, CreditTransaction, etc.
    affected_entity_id = Column(String(50), nullable=True, index=True)
    
    diff = Column(Text, nullable=True) # JSON snapshot diff
    ip_address = Column(String(50), nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
