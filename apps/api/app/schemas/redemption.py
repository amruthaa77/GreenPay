from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


class RedemptionItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    item_type: str
    title: str
    description: str
    credit_cost: float
    stock_limit: Optional[int] = None
    stock_remaining: Optional[int] = None
    partner_name: Optional[str] = None
    badge_text: Optional[str] = None
    is_active: bool


class RedeemRequest(BaseModel):
    item_id: str = Field(..., description="UUID of the redemption item")
    custom_amount: Optional[float] = Field(None, ge=50.0, description="Optional custom points for clean-up fund donation")
    donor_name: Optional[str] = Field(None, max_length=100, description="Optional public donor recognition name")
    idempotency_key: Optional[str] = Field(None, max_length=100, description="Unique client key preventing double-charge")


class RedemptionTransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    redemption_reference: Optional[str] = None
    item_id: Optional[str] = None
    item_type: str
    item_title: Optional[str] = None
    item_quantity: Optional[str] = None
    citizen_name: Optional[str] = None
    citizen_greenpay_id: Optional[str] = None
    credits_spent: float
    previous_balance: Optional[float] = None
    remaining_balance: Optional[float] = None
    status: str = "CONFIRMED"
    certificate_number: Optional[str] = None
    coupon_code: Optional[str] = None
    fulfillment_code: Optional[str] = None
    ward_id: Optional[str] = None
    donor_display_name: Optional[str] = None
    created_at: datetime


class UpdateRedemptionItemRequest(BaseModel):
    credit_cost: Optional[float] = Field(None, gt=0, description="Redemption price in Green Points")
    stock_remaining: Optional[int] = Field(None, ge=0, description="Remaining inventory stock")
    stock_limit: Optional[int] = Field(None, ge=0, description="Total stock limit or batch quota")
    is_active: Optional[bool] = Field(None, description="Active status in citizen catalogue")
    title: Optional[str] = Field(None, min_length=2, max_length=200, description="Product title")
    description: Optional[str] = Field(None, max_length=1000, description="Product description")
    badge_text: Optional[str] = Field(None, max_length=100, description="Standard ration badge (e.g. 1 kg • Staple)")
    change_reason: Optional[str] = Field(None, max_length=500, description="Mandatory audit reason for modification")


class PublicCertificateVerificationResponse(BaseModel):
    certificate_number: str
    is_valid: bool
    issue_date: str
    masked_recipient: str
    ward_name: str
    sustainability_tier: str
    status: str
    verification_source: str = "BBMP Solid Waste Logistics Prototype / GreenPay"
