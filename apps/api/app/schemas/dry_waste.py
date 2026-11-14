from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import List, Optional
from datetime import datetime

class DryWasteCategoryResponse(BaseModel):
    id: str
    code: str
    name: str
    rate_per_kg: float
    is_active: bool
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DryWasteCategoryUpdateRequest(BaseModel):
    rate_per_kg: Optional[float] = Field(None, gt=0, description="New rate per kg (must be positive)")
    is_active: Optional[bool] = None
    change_reason: Optional[str] = Field(None, description="Administrative justification for rate update")


class DryWasteItemInput(BaseModel):
    category_code: str = Field(..., description="Unique category code (e.g. 'aluminium_metal', 'pet_bottles') or UUID")
    weight_kg: float = Field(..., gt=0, description="Measured weight in kilograms, must be strictly greater than 0")

    @field_validator("weight_kg")
    def validate_positive_weight(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Weight must be strictly greater than 0 kg.")
        return round(v, 3)

    @field_validator("category_code")
    def validate_category_code(cls, v: str) -> str:
        clean = v.strip()
        if not clean:
            raise ValueError("Category code cannot be blank.")
        return clean


class DryWasteCollectionCreateRequest(BaseModel):
    greenpay_id: str = Field(..., description="Citizen QR identifier (e.g. 'GP-104928') or meter number")
    items: List[DryWasteItemInput] = Field(..., min_length=1, description="List of dry-waste category weighment items")
    idempotency_key: Optional[str] = Field(None, max_length=64, description="UUID idempotency key for preventing duplicate submissions")
    notes: Optional[str] = Field(None, max_length=500, description="Optional supervisor doorstep collection notes")

    @field_validator("greenpay_id")
    def validate_identifier(cls, v: str) -> str:
        clean = v.strip().upper()
        if not clean:
            raise ValueError("Citizen identifier cannot be empty.")
        return clean


class DryWasteItemDetailResponse(BaseModel):
    id: Optional[str] = None
    category_id: str
    category_code: str
    category_name: str
    rate_per_kg: float
    weight_kg: float
    points_earned: float

    model_config = ConfigDict(from_attributes=True)


class DryWasteCollectionResponse(BaseModel):
    id: str
    transaction_id: str
    greenpay_id: str
    citizen_name: str
    ward_name: str
    items: List[DryWasteItemDetailResponse]
    total_weight_kg: float
    total_points_earned: float
    calculation_formula: str
    journey_stage: str
    collection_date: datetime
    verification_status: str
    supervisor_name: str
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CitizenPointsBalanceResponse(BaseModel):
    greenpay_id: str
    citizen_name: str
    ward_name: str
    current_balance: float
    total_earned: float
    total_redeemed: float
    total_weight_kg: float = 0.0
    total_weighments_count: int
    last_earned_at: Optional[datetime] = None


class EarningHistoryItemResponse(BaseModel):
    id: str
    transaction_id: str
    timestamp: datetime
    credits_amount: float
    calculation_formula: str
    items: List[DryWasteItemDetailResponse] = []

    model_config = ConfigDict(from_attributes=True)
