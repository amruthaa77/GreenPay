from sqlalchemy import Column, String, Float, ForeignKey, DateTime, Text, Boolean, func
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

class WasteEntry(BaseModel):
    __tablename__ = "waste_entries"
    
    transaction_id = Column(String(50), unique=True, index=True, nullable=False) # e.g. GP-REC-2026-10492
    idempotency_key = Column(String(64), unique=True, index=True, nullable=True) # UUID from supervisor offline queue
    
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    supervisor_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    ward_id = Column(String(36), ForeignKey("wards.id"), nullable=False, index=True)
    
    # 4 distinct categories (in kg)
    wet_kg = Column(Float, default=0.0, nullable=False)
    dry_kg = Column(Float, default=0.0, nullable=False)
    hazardous_kg = Column(Float, default=0.0, nullable=False)
    ewaste_kg = Column(Float, default=0.0, nullable=False)
    total_weight_kg = Column(Float, nullable=False)
    
    # Circular waste-journey timeline: Collection → Sorting → Processing → Recovery
    journey_stage = Column(String(50), default="Collection", nullable=False)
    
    # 7-day confirmation lifecycle: PENDING_CONFIRMATION → CONFIRMED / DISPUTED
    dispute_status = Column(String(30), default="PENDING_CONFIRMATION", nullable=False, index=True)
    confirmation_date = Column(DateTime(timezone=True), nullable=True)
    
    collection_date = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    notes = Column(Text, nullable=True)
    is_demo = Column(Boolean, default=False, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="waste_entries", foreign_keys=[user_id])
    supervisor = relationship("User", back_populates="recorded_waste", foreign_keys=[supervisor_id])
    ward = relationship("Ward", back_populates="waste_entries")
    credit_transactions = relationship("CreditTransaction", back_populates="waste_entry", cascade="all, delete-orphan")
    anomalies = relationship("AnomalyFlag", back_populates="waste_entry", cascade="all, delete-orphan")
    disputes = relationship("DisputeTicket", back_populates="weighment", cascade="all, delete-orphan")
    collection_items = relationship("WasteCollectionItem", back_populates="waste_entry", cascade="all, delete-orphan")

