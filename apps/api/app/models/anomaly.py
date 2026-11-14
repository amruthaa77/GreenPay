from sqlalchemy import Column, String, Float, ForeignKey, DateTime, Text, func
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

class AnomalyFlag(BaseModel):
    __tablename__ = "anomaly_flags"
    
    waste_entry_id = Column(String(36), ForeignKey("waste_entries.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    ward_id = Column(String(36), ForeignKey("wards.id"), nullable=False, index=True)
    
    anomaly_type = Column(String(50), nullable=False) # ROLLING_Z_SCORE_SPIKE, WARD_BASELINE_SPIKE, DUPLICATE_LIKE
    
    z_score_household = Column(Float, nullable=True)
    z_score_ward = Column(Float, nullable=True)
    
    description = Column(Text, nullable=False)
    severity = Column(String(20), default="MEDIUM", nullable=False) # LOW, MEDIUM, HIGH
    status = Column(String(30), default="PENDING_REVIEW", nullable=False, index=True) # PENDING_REVIEW, VERIFIED_LEGITIMATE, DISMISSED
    
    reviewed_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    review_notes = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    waste_entry = relationship("WasteEntry", back_populates="anomalies")
    user = relationship("User", back_populates="anomaly_flags", foreign_keys=[user_id])
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_id])
