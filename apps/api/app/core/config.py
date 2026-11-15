from typing import Annotated, List, Any
from urllib.parse import urlparse
import json
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict, NoDecode

def _clean_and_validate_origin(origin: str) -> str:
    cleaned = origin.strip().rstrip('/')
    if not cleaned:
        raise ValueError("CORS origin entry cannot be empty")
    if cleaned == "*":
        return cleaned
    parsed = urlparse(cleaned)
    if parsed.scheme not in ("http", "https"):
        raise ValueError(
            f"Invalid origin '{origin}': scheme must be 'http' or 'https' (got '{parsed.scheme}')"
        )
    if not parsed.netloc:
        raise ValueError(f"Invalid origin '{origin}': missing valid host/domain")
    if parsed.path:
        raise ValueError(f"Invalid origin '{origin}': origins cannot contain a path ('{parsed.path}')")
    if parsed.query or parsed.fragment:
        raise ValueError(f"Invalid origin '{origin}': origins cannot contain query parameters or fragments")
    return cleaned

class Settings(BaseSettings):
    PROJECT_NAME: str = "GreenPay"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENV: str = "development"
    
    # Secrets
    SECRET_KEY: str = "greenpay-super-secret-key-change-in-production-2026-bengaluru"
    METER_ENCRYPTION_KEY: str = "greenpay-aes-secret-key-32bytes-len!"
    CSRF_SECRET: str = "greenpay-csrf-protection-secret-key-2026"
    
    # Database
    DATABASE_URL: str = "sqlite:///./greenpay.db"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalize_database_url(cls, v: str) -> str:
        """
        Normalizes database URLs for PostgreSQL deployments (e.g. Render).
        Render automatically supplies `postgres://...` or `postgresql://...`.
        SQLAlchemy 2.0 with psycopg 3 requires `postgresql+psycopg://...`.
        """
        if isinstance(v, str):
            if v.startswith("driver://") or "user:pass@localhost/dbname" in v:
                raise ValueError(
                    "DATABASE_URL cannot be a placeholder ('driver://...'). "
                    "Please provide a valid database connection string."
                )
            if v.startswith("postgres://"):
                return v.replace("postgres://", "postgresql+psycopg://", 1)
            if v.startswith("postgresql://") and not v.startswith("postgresql+"):
                return v.replace("postgresql://", "postgresql+psycopg://", 1)
        return v
    
    # JWT & Session Expiration
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS
    CORS_ORIGINS: Annotated[List[str], NoDecode] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:4173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:5176",
        "http://127.0.0.1:4173",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Any) -> List[str]:
        """
        Parses CORS origins from:
        - Comma-separated string: 'https://app.vercel.app, https://admin.vercel.app'
        - JSON array: '["https://app.vercel.app", "https://admin.vercel.app"]'
        - Single origin: 'https://app.vercel.app'
        - Python list / iterable of origins

        Strips whitespace and trailing slashes. Rejects malformed values with clear validation errors.
        Uses NoDecode on the field to prevent pydantic-settings from eagerly JSON-decoding.
        """
        if v is None:
            return []

        raw_list: List[Any] = []
        if isinstance(v, str):
            v_str = v.strip()
            if not v_str:
                return []
            if v_str.startswith("[") or v_str.startswith("{"):
                try:
                    parsed = json.loads(v_str)
                except Exception as e:
                    raise ValueError(f"Invalid JSON format for CORS_ORIGINS: {e}")
                if not isinstance(parsed, list):
                    raise ValueError("CORS_ORIGINS JSON must be an array of origin strings")
                raw_list = parsed
            else:
                raw_list = [part.strip() for part in v_str.split(",") if part.strip()]
        elif isinstance(v, (list, tuple, set)):
            raw_list = list(v)
        else:
            raise ValueError(
                f"Invalid type for CORS_ORIGINS: expected string or list, got {type(v).__name__}"
            )

        cleaned_origins: List[str] = []
        for item in raw_list:
            if not isinstance(item, str):
                raise ValueError(
                    f"CORS origin items must be strings, got {type(item).__name__}: {item!r}"
                )
            cleaned = _clean_and_validate_origin(item)
            cleaned_origins.append(cleaned)

        return cleaned_origins
    
    # Separate Cookie Scopes (Citizen vs Admin)
    CITIZEN_ACCESS_COOKIE: str = "gp_citizen_access"
    CITIZEN_REFRESH_COOKIE: str = "gp_citizen_refresh"
    CITIZEN_CSRF_COOKIE: str = "gp_citizen_csrf"
    
    ADMIN_ACCESS_COOKIE: str = "gp_admin_access"
    ADMIN_REFRESH_COOKIE: str = "gp_admin_refresh"
    ADMIN_CSRF_COOKIE: str = "gp_admin_csrf"
    
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="allow"
    )

settings = Settings()
