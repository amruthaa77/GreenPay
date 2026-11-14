from sqlalchemy import Column, String, Float, Boolean, Integer, ForeignKey, Text, DateTime, func
from app.models.base import BaseModel

class RewardSchedule(BaseModel):
    __tablename__ = "reward_schedules"
    
    version = Column(Integer, unique=True, index=True, nullable=False)
    
    # Credit reward rates per kilogram (legacy fields preserved for historical integrity)
    wet_rate = Column(Float, default=5.0, nullable=False)        # 5 credits/kg
    dry_rate = Column(Float, default=10.0, nullable=False)       # 10 credits/kg
    hazardous_rate = Column(Float, default=15.0, nullable=False) # 15 credits/kg
    ewaste_rate = Column(Float, default=20.0, nullable=False)    # 20 credits/kg
    
    # 8 Dry Waste Category rates stored as JSON {category_code: rate_per_kg}
    rates_json = Column(Text, nullable=True)
    
    is_active = Column(Boolean, default=True, nullable=False)
    effective_from = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    created_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    change_reason = Column(Text, nullable=True)
