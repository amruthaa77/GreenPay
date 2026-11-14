import hmac
import hashlib
import base64
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import bcrypt
from jose import jwt, JWTError
from cryptography.fernet import Fernet
from app.core.config import settings

# Key derivation for symmetric meter encryption
# Fernet requires a 32-byte url-safe base64 encoded key
_fernet_key = base64.urlsafe_b64encode(
    hashlib.sha256(settings.METER_ENCRYPTION_KEY.encode()).digest()
)
_cipher = Fernet(_fernet_key)

# Password Hashing
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

# Meter Number Encryption & Masking
def hash_meter_for_lookup(meter_number: str) -> str:
    """Deterministic HMAC for exact lookup without storing plaintext."""
    clean_meter = meter_number.strip().upper()
    return hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        clean_meter.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

def encrypt_meter_number(meter_number: str) -> str:
    """Symmetric encryption for meter number at rest."""
    clean_meter = meter_number.strip().upper()
    return _cipher.encrypt(clean_meter.encode("utf-8")).decode("utf-8")

def decrypt_meter_number(encrypted_token: str) -> str:
    """Decrypts meter number from database."""
    try:
        return _cipher.decrypt(encrypted_token.encode("utf-8")).decode("utf-8")
    except Exception:
        return "[UNREADABLE_METER]"

def mask_meter_number(meter_number: str) -> str:
    """
    Masks electricity meter number for display:
    e.g. BESCOM-IND-104928 -> BESCOM-***-4928
         104928 -> ***-4928
    """
    clean = meter_number.strip()
    if "-" in clean:
        parts = clean.split("-")
        if len(parts) >= 3:
            return f"{parts[0]}-***-{parts[-1][-4:]}"
        elif len(parts) == 2:
            return f"{parts[0]}-***-{parts[1][-4:]}"
    if len(clean) > 4:
        return f"***-{clean[-4:]}"
    return clean

# JWT Generation and Verification
ALGORITHM = "HS256"

def create_access_token(user_id: str, role: str, expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    payload: Dict[str, Any] = {
        "sub": user_id,
        "role": role,
        "type": "access",
        "exp": expire,
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(user_id: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload: Dict[str, Any] = {
        "sub": user_id,
        "role": role,
        "type": "refresh",
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "jti": secrets.token_hex(16)
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

# CSRF Double Submit Token
def generate_csrf_token() -> str:
    return secrets.token_urlsafe(32)

def verify_csrf_token(cookie_csrf: Optional[str], header_csrf: Optional[str]) -> bool:
    if not cookie_csrf or not header_csrf:
        return False
    return hmac.compare_digest(cookie_csrf, header_csrf)
