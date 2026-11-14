from typing import Optional, Dict
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class CreditTransactionResponse(BaseModel):
    id: str
    timestamp: datetime
    credits_amount: float
    calculation_formula: str
    is_reversal: bool
    reversal_of_id: Optional[str] = None
    schedule_version: int
    resulting_balance: Optional[float] = None
    transaction_type: Optional[str] = None
    reference_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class RewardScheduleResponse(BaseModel):
    version: int
    wet_rate: float = 0.0
    dry_rate: float = 0.0
    hazardous_rate: float = 0.0
    ewaste_rate: float = 0.0
    is_active: bool
    effective_from: datetime
    change_reason: Optional[str] = None
    rates: Optional[Dict[str, float]] = None

    model_config = ConfigDict(from_attributes=True)

class UpdateRewardScheduleRequest(BaseModel):
    wet_rate: Optional[float] = Field(default=0.0, ge=0.0)
    dry_rate: Optional[float] = Field(default=0.0, ge=0.0)
    hazardous_rate: Optional[float] = Field(default=0.0, ge=0.0)
    ewaste_rate: Optional[float] = Field(default=0.0, ge=0.0)
    rates: Optional[Dict[str, float]] = Field(default=None, description="8 Dry waste category code to GP/kg rate")
    change_reason: str = Field(..., min_length=5)
