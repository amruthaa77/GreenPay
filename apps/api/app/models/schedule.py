from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, Text, Date
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

class WardCollectionSchedule(BaseModel):
    __tablename__ = "ward_collection_schedules"
    
    ward_id = Column(String(36), ForeignKey("wards.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Waste classification for collection slot: WET, DRY, HAZARDOUS_EWASTE
    waste_type = Column(String(30), nullable=False)
    
    # 0=Monday, 1=Tuesday, 2=Wednesday, 3=Thursday, 4=Friday, 5=Saturday, 6=Sunday; -1 for Daily
    day_of_week = Column(Integer, nullable=False)
    
    # Frequency: DAILY, WEEKLY, FIRST_SATURDAY_OF_MONTH
    frequency = Column(String(30), default="WEEKLY", nullable=False)
    
    # Time window (HH:MM format, 24-hr)
    start_time = Column(String(10), nullable=False)
    end_time = Column(String(10), nullable=False)
    
    # Doorstep logistics metadata
    vehicle_number = Column(String(50), nullable=True)
    supervisor_name = Column(String(100), nullable=True)
    supervisor_contact = Column(String(30), nullable=True)
    instructions = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    ward = relationship("Ward", back_populates="schedules")


class ScheduleOverride(BaseModel):
    __tablename__ = "schedule_overrides"
    
    ward_id = Column(String(36), ForeignKey("wards.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Date of override
    override_date = Column(Date, nullable=False)
    
    # Target waste type (or NULL for all collections on that date)
    waste_type = Column(String(30), nullable=True)
    
    # Whether regular pickup is cancelled (e.g. municipal holiday)
    is_cancelled = Column(Boolean, default=False, nullable=False)
    
    # Optional rescheduled date and time
    rescheduled_date = Column(Date, nullable=True)
    rescheduled_start_time = Column(String(10), nullable=True)
    rescheduled_end_time = Column(String(10), nullable=True)
    
    # Operational explanation (e.g. "Diwali Festival Doorstep Route Reorganisation")
    reason = Column(String(255), nullable=False)
    
    # Audit trail
    created_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Relationships
    ward = relationship("Ward", back_populates="overrides")
