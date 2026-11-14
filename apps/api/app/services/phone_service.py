import hashlib
import secrets
import re
from datetime import datetime, timedelta, timezone
from typing import Tuple, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.phone_verification import PhoneVerification
from app.models.user import User
from app.core.security import encrypt_meter_number, decrypt_meter_number
from app.adapters.sms_adapter import get_sms_adapter

class PhoneService:
    OTP_EXPIRY_MINUTES = 5
    RESEND_COOLDOWN_SECONDS = 60
    MAX_ATTEMPTS = 5

    @staticmethod
    def normalize_phone(phone: str) -> str:
        # Normalize to E.164-like standard (+91XXXXXXXXXX)
        cleaned = re.sub(r"[^\d+]", "", phone.strip())
        if not cleaned.startswith("+"):
            if len(cleaned) == 10:
                cleaned = "+91" + cleaned
            elif cleaned.startswith("91") and len(cleaned) == 12:
                cleaned = "+" + cleaned
        return cleaned

    @staticmethod
    def hash_phone(phone: str) -> str:
        # Deterministic SHA-256 hash for database lookup
        return hashlib.sha256(phone.encode("utf-8")).hexdigest()

    @staticmethod
    def mask_phone(phone: str) -> str:
        if len(phone) >= 10:
            return phone[:4] + " " + phone[4:6] + "*** ***" + phone[-2:]
        return phone

    @classmethod
    def send_verification_otp(
        cls,
        db: Session,
        user: User,
        raw_phone: str,
        sms_consent: bool = True
    ) -> Tuple[bool, str]:
        phone = cls.normalize_phone(raw_phone)
        if len(phone) < 12 or not phone.startswith("+91"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid phone number format. Please provide a valid 10-digit Indian mobile number (+91)."
            )
            
        now = datetime.now(timezone.utc)
        
        # Check existing active verification
        existing = (
            db.query(PhoneVerification)
            .filter(PhoneVerification.user_id == user.id)
            .order_by(PhoneVerification.created_at.desc())
            .first()
        )
        if existing and not existing.can_resend():
            cd_diff = (existing.resend_available_at if existing.resend_available_at.tzinfo else existing.resend_available_at.replace(tzinfo=timezone.utc)) - now
            seconds_left = max(1, int(cd_diff.total_seconds()))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {seconds_left} seconds before requesting a new OTP."
            )

        # Generate 6-digit cryptographic OTP
        otp = f"{secrets.randbelow(900000) + 100000}"
        otp_hash = hashlib.sha256(otp.encode("utf-8")).hexdigest()
        
        # Store encrypted phone and hash
        verification = PhoneVerification(
            user_id=user.id,
            phone_encrypted=encrypt_meter_number(phone),
            phone_hash=cls.hash_phone(phone),
            otp_hash=otp_hash,
            expires_at=now + timedelta(minutes=cls.OTP_EXPIRY_MINUTES),
            attempts_count=0,
            resend_available_at=now + timedelta(seconds=cls.RESEND_COOLDOWN_SECONDS)
        )
        db.add(verification)
        db.commit()
        
        # Dispatch SMS
        sms_adapter = get_sms_adapter()
        msg = f"Your GreenPay verification code is {otp} for your household waste account. Valid for 5 minutes. Do not share this OTP with anyone."
        sms_adapter.send_sms(phone, msg)
        
        return True, cls.mask_phone(phone)

    @classmethod
    def verify_otp(
        cls,
        db: Session,
        user: User,
        entered_otp: str
    ) -> Tuple[bool, str]:
        verification = (
            db.query(PhoneVerification)
            .filter(PhoneVerification.user_id == user.id)
            .order_by(PhoneVerification.created_at.desc())
            .first()
        )
        if not verification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No pending phone verification found. Please request an OTP first."
            )
            
        if verification.is_expired():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This verification code has expired. Please request a new OTP."
            )
            
        if verification.attempts_count >= cls.MAX_ATTEMPTS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Maximum verification attempts exceeded. Please request a fresh OTP."
            )
            
        verification.attempts_count += 1
        db.commit()
        
        entered_hash = hashlib.sha256(entered_otp.strip().encode("utf-8")).hexdigest()
        if entered_hash != verification.otp_hash:
            remaining = cls.MAX_ATTEMPTS - verification.attempts_count
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Incorrect verification code. {remaining} attempt(s) remaining."
            )
            
        # Success: update profile and activate citizen account if PENDING!
        decrypted_phone = decrypt_meter_number(verification.phone_encrypted)
        if user.profile:
            user.profile.phone_number = decrypted_phone
            
        previous_status = user.status
        if user.status == "PENDING":
            user.status = "ACTIVE" # Verified phone unlocks citizen account!
            
        # Clean up verification
        db.delete(verification)
        db.commit()
        db.refresh(user)
        
        return True, previous_status
