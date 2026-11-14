from sqlalchemy import Column, String, Float, Boolean, ForeignKey, Text, DateTime, Integer, func
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

class CreditTransaction(BaseModel):
    __tablename__ = "credit_transactions"
    
    # DB Triggers enforce append-only: UPDATE and DELETE are prohibited!
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    pseudonymous_owner = Column(String(50), nullable=True, index=True) # Retained after DPDP account erasure
    
    waste_entry_id = Column(String(36), ForeignKey("waste_entries.id", ondelete="SET NULL"), nullable=True, index=True)
    schedule_version = Column(Integer, default=1, nullable=False)
    
    # Points earned or reversed (Points, NOT money, no payment processing)
    credits_amount = Column(Float, nullable=False)
    
    # Formula breakdown string (e.g. "3.00 kg (Dry) × 10 credits/kg = 30 credits")
    calculation_formula = Column(Text, nullable=False)
    
    is_reversal = Column(Boolean, default=False, nullable=False)
    reversal_of_id = Column(String(36), nullable=True)
    
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="credit_transactions", foreign_keys=[user_id])
    waste_entry = relationship("WasteEntry", back_populates="credit_transactions")
