from typing import List
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
