import pyotp
import hashlib
import secrets
import json
from datetime import datetime, timedelta, timezone
from typing import List, Tuple, Optional, Dict, Any
from sqlalchemy.orm import Session

from app.models.admin_2fa import Admin2FA
from app.models.user_session import UserSession
from app.models.user_lockout import LoginAttempt
from app.models.user import User
from app.core.security import encrypt_meter_number, decrypt_meter_number

class SecurityService:
    LOCKOUT_THRESHOLD = 5
    BASE_LOCKOUT_MINUTES = 15
    RESET_TOKEN_EXPIRY_MINUTES = 30

    # --- Password Reset Tokens ---
    @staticmethod
    def create_password_reset_token(db: Session, user_id: str, ip: Optional[str] = None) -> str:
        from app.models.password_reset import PasswordResetToken
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=SecurityService.RESET_TOKEN_EXPIRY_MINUTES)

        # Invalidate any existing unused tokens for this user
        existing_tokens = db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user_id,
            PasswordResetToken.used == False
        ).all()
        for t in existing_tokens:
            t.used = True

        reset_token = PasswordResetToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
            used=False,
            ip_address=ip
        )
        db.add(reset_token)
        db.commit()
        return raw_token

    @staticmethod
    def validate_and_consume_reset_token(db: Session, raw_token: str) -> Optional[User]:
        from app.models.password_reset import PasswordResetToken
        token_hash = hashlib.sha256(raw_token.strip().encode("utf-8")).hexdigest()
        reset_token = db.query(PasswordResetToken).filter(
            PasswordResetToken.token_hash == token_hash
        ).first()

        if not reset_token or not reset_token.is_valid():
            return None

        # Consume token immediately
        reset_token.used = True
        db.commit()
        return reset_token.user

    # --- 2FA TOTP & Recovery Codes ---
    @staticmethod
    def generate_2fa_secret() -> str:
        return pyotp.random_base32()

    @staticmethod
    def get_totp_uri(secret: str, email: str) -> str:
        totp = pyotp.TOTP(secret)
        return totp.provisioning_uri(name=email, issuer_name="GreenPay Operations")

    @staticmethod
    def verify_totp(secret: str, code: str) -> bool:
        if not code or len(code.strip()) != 6:
            return False
        totp = pyotp.TOTP(secret)
        # Allow 1 time-step drift (+-30 seconds) for clock variance
        return totp.verify(code.strip(), valid_window=1)

    @staticmethod
    def generate_recovery_codes(count: int = 10) -> Tuple[List[str], str]:
        """Generates plain text recovery codes and their stored JSON hash array."""
        plain_codes = [secrets.token_hex(4).upper() for _ in range(count)]
        hashed_codes = [hashlib.sha256(c.encode("utf-8")).hexdigest() for c in plain_codes]
        return plain_codes, json.dumps(hashed_codes)

    @classmethod
    def verify_and_consume_recovery_code(cls, db: Session, admin_2fa: Admin2FA, code: str) -> bool:
        """Verifies a one-time recovery code and removes it from the stored pool."""
        code_hash = hashlib.sha256(code.strip().upper().encode("utf-8")).hexdigest()
        try:
            stored_hashes: List[str] = json.loads(admin_2fa.recovery_codes_hashed)
        except Exception:
            return False
            
        if code_hash in stored_hashes:
            stored_hashes.remove(code_hash)
            admin_2fa.recovery_codes_hashed = json.dumps(stored_hashes)
            db.commit()
            return True
        return False

    # --- Progressive Lockout ---
    @classmethod
    def check_lockout(cls, db: Session, identifier: str) -> Optional[int]:
        """Returns remaining locked minutes if identifier is locked, or None."""
        attempt = db.query(LoginAttempt).filter(LoginAttempt.identifier == identifier).first()
        if not attempt or not attempt.is_locked():
            return None
        now = datetime.now(timezone.utc)
        locked = attempt.locked_until if attempt.locked_until.tzinfo else attempt.locked_until.replace(tzinfo=timezone.utc)
        diff = locked - now
        return max(1, int(diff.total_seconds() / 60))

    @classmethod
    def record_failed_login(cls, db: Session, identifier: str, ip: Optional[str] = None) -> Tuple[int, Optional[int]]:
        """
        Increments failed logins and applies progressive freeze (15m, 30m, 60m...).
        Returns (failed_count, locked_minutes_applied).
        """
        now = datetime.now(timezone.utc)
        attempt = db.query(LoginAttempt).filter(LoginAttempt.identifier == identifier).first()
        if not attempt:
            attempt = LoginAttempt(
                identifier=identifier,
                failed_attempts=1,
                last_failed_at=now,
                ip_address=ip
            )
            db.add(attempt)
            db.commit()
            return 1, None

        # Reset failed count if last failure was > 24 hours ago
        last_failed = attempt.last_failed_at if attempt.last_failed_at.tzinfo else attempt.last_failed_at.replace(tzinfo=timezone.utc)
        if now - last_failed > timedelta(hours=24):
            attempt.failed_attempts = 0

        attempt.failed_attempts += 1
        attempt.last_failed_at = now
        attempt.ip_address = ip

        locked_minutes = None
        if attempt.failed_attempts >= cls.LOCKOUT_THRESHOLD:
            # Multiplier doubles for each set of 5 failures: 15m, 30m, 60m...
            multiplier = 2 ** ((attempt.failed_attempts - cls.LOCKOUT_THRESHOLD) // 5)
            locked_minutes = cls.BASE_LOCKOUT_MINUTES * multiplier
            attempt.locked_until = now + timedelta(minutes=locked_minutes)

        db.commit()
        return attempt.failed_attempts, locked_minutes

    @classmethod
    def clear_failed_logins(cls, db: Session, identifier: str):
        attempt = db.query(LoginAttempt).filter(LoginAttempt.identifier == identifier).first()
        if attempt:
            db.delete(attempt)
            db.commit()

    # --- Session Management ---
    @staticmethod
    def create_session(
        db: Session,
        user_id: str,
        device_browser: Optional[str] = None,
        ip: Optional[str] = None
    ) -> str:
        session_id = secrets.token_urlsafe(32)
        sess = UserSession(
            session_id=session_id,
            user_id=user_id,
            device_browser=device_browser[:250] if device_browser else "Browser Session",
            ip_address=ip,
            is_revoked=False
        )
        db.add(sess)
        db.commit()
        return session_id

    @staticmethod
    def is_session_active(db: Session, session_id: str) -> bool:
        sess = db.query(UserSession).filter(UserSession.session_id == session_id).first()
        return sess is not None and not sess.is_revoked

    @staticmethod
    def touch_session(db: Session, session_id: str):
        sess = db.query(UserSession).filter(UserSession.session_id == session_id).first()
        if sess and not sess.is_revoked:
            sess.last_active_at = datetime.now(timezone.utc)
            db.commit()

    @staticmethod
    def revoke_session(db: Session, user_id: str, session_id: str) -> bool:
        sess = db.query(UserSession).filter(
            UserSession.session_id == session_id,
            UserSession.user_id == user_id
        ).first()
        if sess:
            sess.is_revoked = True
            db.commit()
            return True
        return False

    @staticmethod
    def revoke_all_user_sessions(db: Session, user_id: str):
        sessions = db.query(UserSession).filter(UserSession.user_id == user_id).all()
        for s in sessions:
            s.is_revoked = True
        db.commit()
