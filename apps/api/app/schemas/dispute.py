from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime

class DisputeCreateRequest(BaseModel):
    category: str = Field(..., description="MISSED_COLLECTION, WRONG_WEIGHT, CATEGORY_MISMATCH, SUPERVISOR_BEHAVIOUR, OTHER")
    description: str = Field(..., min_length=10, max_length=2000)
    weighment_id: Optional[str] = None

class DisputeResolveRequest(BaseModel):
    decision: str = Field(..., description="UPHOLD, REJECT, or REQUEST_INFO")
    resolution_notes: str = Field(..., min_length=5, max_length=2000)
    points_adjustment: float = Field(default=0.0, description="Optional points adjustment (can be negative or positive)")

class CitizenDisputeResponseRequest(BaseModel):
    response_text: str = Field(..., min_length=5, max_length=2000)

class WeighmentSummary(BaseModel):
    id: str
    transaction_id: str
    total_weight_kg: float
    dry_kg: float
    wet_kg: float
    collection_date: datetime
    dispute_status: str

    model_config = ConfigDict(from_attributes=True)

class DisputeResponse(BaseModel):
    id: str
    ticket_number: str
    citizen_id: str
    weighment_id: Optional[str] = None
    ward_id: str
    category: str
    description: str
    has_photo: bool = False
    photo_filename: Optional[str] = None
    status: str
    retention_until: datetime
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    resolved_by_id: Optional[str] = None
    resolution_notes: Optional[str] = None
    points_adjustment: Optional[float] = 0.0
    reversal_transaction_id: Optional[str] = None
    citizen_response: Optional[str] = None
    weighment: Optional[WeighmentSummary] = None

    model_config = ConfigDict(from_attributes=True)

