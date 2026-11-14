from sqlalchemy import Column, String, Float, Integer, Boolean, ForeignKey, Text, DateTime, func
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class RedemptionItem(BaseModel):
    __tablename__ = "redemption_items"

    item_type = Column(String(50), nullable=False)  # CERTIFICATE, CLEANUP_DONATION, PARTNER_COUPON
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    credit_cost = Column(Float, nullable=False)
    stock_limit = Column(Integer, nullable=True)  # None = unlimited
    stock_remaining = Column(Integer, nullable=True)
    partner_name = Column(String(150), nullable=True)
    badge_text = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    coupons = relationship("PartnerCoupon", back_populates="item", cascade="all, delete-orphan")
    redemptions = relationship("RedemptionTransaction", back_populates="item")


class PartnerCoupon(BaseModel):
    __tablename__ = "partner_coupons"

    item_id = Column(String(36), ForeignKey("redemption_items.id", ondelete="CASCADE"), nullable=False, index=True)
    coupon_code = Column(String(100), nullable=False, unique=True, index=True)
    is_redeemed = Column(Boolean, default=False, nullable=False)
    redeemed_by_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    redeemed_at = Column(DateTime(timezone=True), nullable=True)

    item = relationship("RedemptionItem", back_populates="coupons")


class RedemptionTransaction(BaseModel):
    __tablename__ = "redemption_transactions"

    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    pseudonymous_owner = Column(String(50), nullable=True, index=True)  # Preserved after DPDP erasure
    item_id = Column(String(36), ForeignKey("redemption_items.id", ondelete="SET NULL"), nullable=True, index=True)
    item_type = Column(String(50), nullable=False)
    credits_spent = Column(Float, nullable=False)
    idempotency_key = Column(String(100), nullable=True, index=True)

    # Historical product and balance snapshots
    item_title = Column(String(200), nullable=True)
    item_quantity = Column(String(50), nullable=True)
    previous_balance = Column(Float, nullable=True)
    remaining_balance = Column(Float, nullable=True)
    status = Column(String(50), default="CONFIRMED", nullable=False)

    # For CERTIFICATE
    certificate_number = Column(String(50), nullable=True, unique=True, index=True)
    certificate_qr_data = Column(Text, nullable=True)

    # For PARTNER_COUPON & GROCERY
    coupon_code = Column(String(100), nullable=True)

    # For CLEANUP_DONATION
    ward_id = Column(String(36), ForeignKey("wards.id", ondelete="SET NULL"), nullable=True, index=True)
    donor_display_name = Column(String(100), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    @property
    def fulfillment_code(self):
        return self.coupon_code

    @property
    def redemption_reference(self):
        return self.coupon_code or self.certificate_number or f"GP-RED-{self.id[:8].upper()}"

    user = relationship("User", back_populates="redemptions")
    item = relationship("RedemptionItem", back_populates="redemptions")
    ward = relationship("Ward", back_populates="redemptions")
