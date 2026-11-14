from sqlalchemy import Column, String, Boolean, Float
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

class Ward(BaseModel):
    __tablename__ = "wards"
    
    # Wards identified strictly by name per specification (no numeric IDs)
    name = Column(String(100), unique=True, index=True, nullable=False)
    zone = Column(String(50), nullable=False)
    is_demo_data = Column(Boolean, default=True, nullable=False)
    clean_up_fund_credits = Column(Float, default=0.0, nullable=False)
    
    # Relationships
    profiles = relationship("UserProfile", back_populates="ward")
    waste_entries = relationship("WasteEntry", back_populates="ward")
    schedules = relationship("WardCollectionSchedule", back_populates="ward", cascade="all, delete-orphan")
    overrides = relationship("ScheduleOverride", back_populates="ward", cascade="all, delete-orphan")
    redemptions = relationship("RedemptionTransaction", back_populates="ward")
