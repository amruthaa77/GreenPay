from typing import List, Optional
from pydantic import BaseModel, ConfigDict

class UserProfileResponse(BaseModel):
    id: str
    greenpay_id: str
    name: str
    masked_meter: str
    ward_name: str
    green_score: float
    status: str
    role: str
    email: Optional[str] = None
    phone_number: Optional[str] = None
    email_marketing_opt_in: bool
    streak_weeks: int

    model_config = ConfigDict(from_attributes=True)

class GreenScoreBreakdownResponse(BaseModel):
    total_score: float
    segregation_score: float
    consistency_score: float
    diversion_score: float
    level_label: str
    tips: List[str]

    model_config = ConfigDict(from_attributes=True)

class UpdateEmailPreferencesRequest(BaseModel):
    email_marketing_opt_in: bool

class DeleteAccountRequest(BaseModel):
    confirmation: str # Must match "DELETE MY ACCOUNT"
