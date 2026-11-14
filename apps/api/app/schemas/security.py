from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

# Forgot / Reset Password
class ForgotPasswordRequest(BaseModel):
    identifier: str = Field(..., description="Electricity meter number or email address")
    email_or_phone: Optional[str] = Field(None, description="Optional secondary verification contact")
    portal: str = Field("citizen", description="'citizen' or 'admin'")

class ResetPasswordRequest(BaseModel):
    token: str = Field(..., description="Single-use password reset token")
    new_password: str = Field(..., min_length=8, description="Strong new password")

# Phone OTP
class PhoneOTPRequest(BaseModel):
    phone_number: str = Field(..., description="10-digit Indian mobile number (+91)")
    sms_consent: bool = Field(True, description="Explicit consent to receive transactional SMS notices")

class PhoneOTPVerifyRequest(BaseModel):
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit verification code")

# Admin 2FA
class Admin2FAEnrolResponse(BaseModel):
    secret: str
    otpauth_url: str

class Admin2FAVerifyRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=6)

class Admin2FAVerifyResponse(BaseModel):
    is_enabled: bool
    recovery_codes: List[str]

class Admin2FAChallengeRequest(BaseModel):
    temp_token: str
    totp_code: Optional[str] = None
    recovery_code: Optional[str] = None

# Active Sessions
class UserSessionResponse(BaseModel):
    session_id: str
    device_browser: str
    ip_address: Optional[str]
    last_active_at: datetime
    is_current: bool = False

# Notifications
class NotificationResponse(BaseModel):
    id: str
    category: str
    title_key: str
    message_key: str
    params: Dict[str, Any]
    is_read: bool
    created_at: datetime

class NotificationPreferenceItem(BaseModel):
    in_app: bool
    email: bool
    sms: bool

class NotificationPreferencesResponse(BaseModel):
    preferences: Dict[str, NotificationPreferenceItem]

class NotificationPreferencesUpdateRequest(BaseModel):
    preferences: Dict[str, NotificationPreferenceItem]
