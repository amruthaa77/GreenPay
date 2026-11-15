from sqlalchemy import Column, String, Boolean, Float, Integer, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

class User(BaseModel):
    __tablename__ = "users"
    
    # Meter identity: encrypted at rest, deterministic hash for lookup
    meter_number_hash = Column(String(64), unique=True, index=True, nullable=True)
    meter_number_encrypted = Column(Text, nullable=True)
    
    # Permanent Citizen QR ID (e.g. GP-749281)
    greenpay_id = Column(String(20), unique=True, index=True, nullable=True)
    
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="CITIZEN", nullable=False)  # CITIZEN, SUPERVISOR, SUPER_ADMIN
    status = Column(String(20), default="PENDING", nullable=False) # PENDING, ACTIVE, DELETED, SUSPENDED
    
    # Age compliance (DPDP Act 2023 Section 9)
    is_adult_declared = Column(Boolean, default=True, nullable=False)
    
    # Demonstration Mode isolation flag
    is_demo = Column(Boolean, default=False, server_default="false", nullable=False)
    
    # DPDP Pseudonymisation identifier (e.g. ANON-10a4...)
    pseudonymous_id = Column(String(50), unique=True, index=True, nullable=True)
    
    # Relationships
    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    waste_entries = relationship("WasteEntry", back_populates="user", foreign_keys="WasteEntry.user_id")
    recorded_waste = relationship("WasteEntry", back_populates="supervisor", foreign_keys="WasteEntry.supervisor_id")
    credit_transactions = relationship("CreditTransaction", back_populates="user", foreign_keys="CreditTransaction.user_id")
    anomaly_flags = relationship("AnomalyFlag", back_populates="user", foreign_keys="AnomalyFlag.user_id")
    consents = relationship("ConsentRecord", back_populates="user", cascade="all, delete-orphan")
    redemptions = relationship("RedemptionTransaction", back_populates="user", foreign_keys="RedemptionTransaction.user_id")

class UserProfile(BaseModel):
    __tablename__ = "user_profiles"
    
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    address = Column(String(255), nullable=True)
    ward_id = Column(String(36), ForeignKey("wards.id"), nullable=False, index=True)
    
    # Contact info (strictly optional per data minimisation)
    email = Column(String(255), nullable=True)
    phone_number = Column(String(20), nullable=True)
    
    # Green Score (0 to 100)
    green_score = Column(Float, default=50.0, nullable=False)
    streak_weeks = Column(Integer, default=0, nullable=False)
    
    # Marketing and Unsubscribe Preferences
    email_marketing_opt_in = Column(Boolean, default=False, nullable=False)
    unsubscribe_token = Column(String(64), unique=True, index=True, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="profile")
    ward = relationship("Ward", back_populates="profiles")
