from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class WeighmentCreateRequest(BaseModel):
    greenpay_id: str = Field(..., description="Citizen permanent QR ID (e.g. GP-749281)")
    wet_kg: float = Field(0.0, ge=0.0, description="Wet waste in kg")
    dry_kg: float = Field(0.0, ge=0.0, description="Dry waste in kg")
    hazardous_kg: float = Field(0.0, ge=0.0, description="Hazardous waste in kg")
    ewaste_kg: float = Field(0.0, ge=0.0, description="E-waste in kg")
    notes: Optional[str] = None
    idempotency_key: Optional[str] = Field(None, description="UUID idempotency key for offline queue")

class WeighmentPreviewRequest(BaseModel):
    wet_kg: float = Field(0.0, ge=0.0)
    dry_kg: float = Field(0.0, ge=0.0)
    hazardous_kg: float = Field(0.0, ge=0.0)
    ewaste_kg: float = Field(0.0, ge=0.0)

class WeighmentPreviewResponse(BaseModel):
    wet_kg: float
    dry_kg: float
    hazardous_kg: float
    ewaste_kg: float
    total_weight_kg: float
    estimated_credits: float
    calculation_formula: str

class WasteEntryResponse(BaseModel):
    id: str
    transaction_id: str
    greenpay_id: str
    citizen_name: str
    ward_name: str
    wet_kg: float
    dry_kg: float
    hazardous_kg: float
    ewaste_kg: float
    total_weight_kg: float
    journey_stage: str
    collection_date: datetime
    credits_earned: float
    notes: Optional[str] = None
    dispute_status: str = "PENDING_CONFIRMATION"
    can_dispute: bool = True
    supervisor_name: Optional[str] = None
    verification_status: Optional[str] = None
    items: Optional[List[Dict[str, Any]]] = None

    model_config = ConfigDict(from_attributes=True)


class OfflineSyncRequest(BaseModel):
    entries: List[WeighmentCreateRequest]

class OfflineSyncResult(BaseModel):
    synced: List[WasteEntryResponse]
    rejected: List[Dict[str, Any]]
