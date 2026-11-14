from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class AnomalyFlagResponse(BaseModel):
    id: str
    waste_entry_id: str
    user_id: str
    citizen_name: str
    ward_name: str
    anomaly_type: str
    z_score_household: Optional[float] = None
    z_score_ward: Optional[float] = None
    description: str
    severity: str
    status: str
    timestamp: datetime
    review_notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class AnomalyReviewRequest(BaseModel):
    status: str = Field(..., description="VERIFIED_LEGITIMATE or DISMISSED")
    review_notes: str = Field(..., min_length=5, description="Auditor review justification")
