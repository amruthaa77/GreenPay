from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime


class DryWasteRateHistoryResponse(BaseModel):
    id: str
    category_id: str
    category_name: str
    category_code: str
    previous_rate: float
    new_rate: float
    change_reason: Optional[str] = None
    changed_at: datetime
    changed_by_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CategoryStatBreakdown(BaseModel):
    code: str
    name: str
    rate_per_kg: float
    is_active: bool
    total_weight_kg: float
    total_points_awarded: float
    collections_count: int
    percentage_of_dry_waste: float


class WardStatBreakdown(BaseModel):
    id: str
    name: str
    zone: str
    total_collected_kg: float
    total_points_awarded: float
    collections_count: int
    active_citizens: int


class InventoryStatBreakdown(BaseModel):
    id: str
    title: str
    credit_cost: float
    stock_remaining: int
    stock_limit: Optional[int] = None
    is_active: bool
    total_redeemed_count: int


class SupervisorStatSummary(BaseModel):
    id: str
    staff_id: Optional[str] = None
    name: str
    email: Optional[str] = None
    ward_id: Optional[str] = None
    ward_name: str
    status: str
    collections_logged_count: int
    total_weight_verified_kg: float


class AdminDashboardStatsResponse(BaseModel):
    period: str
    total_citizens: int
    active_supervisors: int
    total_collections: int
    total_collected_kg: float
    total_gp_awarded: float
    total_gp_redeemed: float
    available_inventory_units: int
    successful_redemptions: int
    categories_breakdown: List[CategoryStatBreakdown]
    wards_breakdown: List[WardStatBreakdown]
    inventory_breakdown: List[InventoryStatBreakdown]
    supervisors_summary: List[SupervisorStatSummary]


class AdminCitizenListItem(BaseModel):
    id: str
    greenpay_id: Optional[str] = None
    name: str
    email: Optional[str] = None
    phone_number: Optional[str] = None
    masked_meter: str
    ward_id: Optional[str] = None
    ward_name: str
    status: str
    available_balance: float
    total_earned: float
    total_redeemed: float
    collections_count: int
    redemptions_count: int
    registered_at: Optional[str] = None


class AdminCitizenListResponse(BaseModel):
    total: int
    citizens: List[AdminCitizenListItem]


class AdminCitizenStatusUpdateRequest(BaseModel):
    status: str = Field(..., pattern="^(ACTIVE|PENDING|SUSPENDED)$")
    reason: Optional[str] = None


class AdminSupervisorCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=150)
    password: str = Field(..., min_length=8)
    ward_id: str
    staff_id: Optional[str] = None
    phone_number: Optional[str] = None


class AdminSupervisorStaffIdUpdateRequest(BaseModel):
    staff_id: str = Field(..., min_length=3, max_length=50)
    reason: Optional[str] = None
