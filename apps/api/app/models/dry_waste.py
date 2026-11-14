from sqlalchemy import Column, String, Float, Boolean, ForeignKey, Text, DateTime, func
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

class DryWasteCategory(BaseModel):
    __tablename__ = "dry_waste_categories"

    # Unique human-readable identifier (e.g. "aluminium_metal", "pet_bottles")
    code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    
    # Official Green Points earning rate per kilogram
    rate_per_kg = Column(Float, nullable=False)
    
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    
    # Relationships
    collection_items = relationship("WasteCollectionItem", back_populates="category")
    rate_history = relationship("DryWasteRateHistory", back_populates="category", cascade="all, delete-orphan", order_by="desc(DryWasteRateHistory.changed_at)")


class DryWasteRateHistory(BaseModel):
    __tablename__ = "dry_waste_rate_history"

    category_id = Column(String(36), ForeignKey("dry_waste_categories.id", ondelete="CASCADE"), nullable=False, index=True)
    previous_rate = Column(Float, nullable=False)
    new_rate = Column(Float, nullable=False)
    changed_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    change_reason = Column(Text, nullable=True)
    changed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    category = relationship("DryWasteCategory", back_populates="rate_history")
    changed_by = relationship("User")


class WasteCollectionItem(BaseModel):
    __tablename__ = "waste_collection_items"

    waste_entry_id = Column(String(36), ForeignKey("waste_entries.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(String(36), ForeignKey("dry_waste_categories.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    # Historical immutable snapshots so past collections are unaffected by future rate changes
    category_code = Column(String(50), nullable=False)
    category_name = Column(String(100), nullable=False)
    rate_per_kg = Column(Float, nullable=False)
    
    # Measured weight in kilograms
    weight_kg = Column(Float, nullable=False)
    
    # Authoritative server-calculated points: weight_kg * rate_per_kg
    points_earned = Column(Float, nullable=False)

    # Relationships
    waste_entry = relationship("WasteEntry", back_populates="collection_items")
    category = relationship("DryWasteCategory", back_populates="collection_items")
