from sqlalchemy import Column, String, Float, ForeignKey, DateTime, Text, func
from sqlalchemy.orm import relationship
from datetime import datetime, timezone, timedelta
from app.models.base import BaseModel

class DisputeTicket(BaseModel):
    __tablename__ = "dispute_tickets"

    ticket_number = Column(String(50), unique=True, index=True, nullable=False) # e.g. DSP-20261112-XXXX
    citizen_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    weighment_id = Column(String(36), ForeignKey("waste_entries.id", ondelete="SET NULL"), nullable=True, index=True)
    ward_id = Column(String(36), ForeignKey("wards.id"), nullable=False, index=True)

    # Categories: MISSED_COLLECTION, WRONG_WEIGHT, CATEGORY_MISMATCH, SUPERVISOR_BEHAVIOUR, OTHER
    category = Column(String(50), nullable=False, index=True)
    description = Column(Text, nullable=False)

    # Secure photo storage (DPDP compliance: stripped EXIF, private access)
    photo_path = Column(String(255), nullable=True)
    photo_filename = Column(String(255), nullable=True)
    photo_content_type = Column(String(100), nullable=True)

    # Lifecycle status: OPEN, UNDER_REVIEW, INFO_REQUESTED, RESOLVED_UPHELD, RESOLVED_REJECTED
    status = Column(String(30), default="OPEN", nullable=False, index=True)

    # DPDP 90-day retention policy
    retention_until = Column(DateTime(timezone=True), nullable=False)

    # Resolution details
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    points_adjustment = Column(Float, default=0.0, nullable=True)
    reversal_transaction_id = Column(String(36), ForeignKey("credit_transactions.id", ondelete="SET NULL"), nullable=True)

    # Citizen follow-up if info was requested
    citizen_response = Column(Text, nullable=True)

    # Relationships
    citizen = relationship("User", foreign_keys=[citizen_id])
    resolved_by = relationship("User", foreign_keys=[resolved_by_id])
    weighment = relationship("WasteEntry", back_populates="disputes")
    ward = relationship("Ward")
    reversal_transaction = relationship("CreditTransaction")
