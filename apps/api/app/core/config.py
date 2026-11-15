from typing import List, Any
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

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
    CORS_ORIGINS: List[str] = [
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
        - JSON array: '["https://app.vercel.app"]'
        - Comma-separated: 'https://app.vercel.app, https://admin.vercel.app'
        - Single string: 'https://app.vercel.app'
        Automatically strips trailing slashes to prevent Starlette CORS header mismatches.
        """
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return []
            if v.startswith("[") and v.endswith("]"):
                import json
                try:
                    parsed = json.loads(v)
                    if isinstance(parsed, list):
                        return [str(item).strip().rstrip('/') for item in parsed if item]
                except Exception:
                    pass
            return [origin.strip().rstrip('/') for origin in v.split(",") if origin.strip()]
        if isinstance(v, list):
            return [str(item).strip().rstrip('/') for item in v if item]
        return v
    
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
