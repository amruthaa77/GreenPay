from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field

class CitizenRegisterRequest(BaseModel):
    meter_number: str = Field(..., min_length=5, max_length=50, description="BESCOM Electricity Meter Number")
    password: str = Field(..., min_length=8, description="Account password (min 8 characters)")
    name: str = Field(..., min_length=2, max_length=100)
    ward_name: str = Field(..., description="Koramangala, Indiranagar, Jayanagar, or Whitefield")
    
    # DPDP Age & Unbundled Consents
    is_adult_declared: bool = Field(..., description="Declaration of age 18+")
    terms_privacy_consent: bool = Field(..., description="Required consent to Terms of Service & Privacy Policy")
    marketing_consent: bool = Field(False, description="Optional consent to marketing & digest updates")
    
    # Optional contact info (data minimisation)
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None

class SupervisorAcceptInviteRequest(BaseModel):
    token: str = Field(..., description="Expiring single-use invite token")
    password: str = Field(..., min_length=8, description="Account password (min 8 characters)")

class LoginRequest(BaseModel):
    meter_number_or_email: str = Field(..., description="Electricity meter number for citizens, or email for supervisors/admins")
    password: str = Field(..., min_length=1)

class DemoLoginRequest(BaseModel):
    role: str = Field(..., description="Role to authenticate as: CITIZEN, SUPERVISOR, or SUPER_ADMIN")
    demo_id: Optional[str] = Field(None, description="Optional specific demo profile ID")

class AuthResponse(BaseModel):
    access_token: Optional[str] = None
    token_type: str = "bearer"
    role: Optional[str] = None
    greenpay_id: Optional[str] = None
    user_status: Optional[str] = None
    csrf_token: Optional[str] = None
    masked_meter: Optional[str] = None
    name: Optional[str] = None
    ward_name: Optional[str] = None
    requires_2fa: bool = False
    temp_token: Optional[str] = None
    is_demo: bool = False

    model_config = ConfigDict(from_attributes=True)
