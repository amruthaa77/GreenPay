import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database import init_db, SessionLocal
from app.api.v1 import api_v1_router
from app.models.user import User
from app.core.security import verify_password, hash_meter_for_lookup

logger = logging.getLogger("greenpay.api")
logging.basicConfig(level=logging.INFO)

KNOWN_DEMO_METERS = [
    "ADM-BLR-001",
    "BESCOM-IND-104928",
    "BESCOM-IND-208491",
    "BESCOM-COM-501928"
]

KNOWN_DEFAULT_PASSWORDS = [
    "Password123!",
    "AdminSecret123!",
    "admin123",
    "password"
]

def verify_production_safety(db: Session):
    """
    Enforces Amendment #11:
    In ENV=production, the API strictly refuses to start if demo seed accounts
    or default insecure passwords exist in the database.
    """
    if settings.ENV.lower() == "production":
        logger.info("Executing Production Security Audit before startup...")
        
        # Check for demo meters
        for m in KNOWN_DEMO_METERS:
            m_hash = hash_meter_for_lookup(m)
            demo_user = db.query(User).filter(User.meter_number_hash == m_hash).first()
            if demo_user:
                raise RuntimeError(
                    f"FATAL PRODUCTION SECURITY VIOLATION: Demo seed account with meter '{m}' "
                    f"exists in production database. GreenPay API refused to start."
                )
                
        # Check for demo passwords
        all_users = db.query(User).filter(User.status != "DELETED").all()
        for u in all_users:
            for pwd in KNOWN_DEFAULT_PASSWORDS:
                if verify_password(pwd, u.password_hash):
                    raise RuntimeError(
                        f"FATAL PRODUCTION SECURITY VIOLATION: User '{u.id}' is configured with a default/demo password. "
                        f"GreenPay API startup halted in production."
                    )
        logger.info("✅ Production Security Audit passed: Zero demo accounts or default passwords detected.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database tables & ledger immutability triggers
    init_db()
    
    # Audit production safety
    db = SessionLocal()
    try:
        verify_production_safety(db)
    finally:
        db.close()
        
    yield
    # Shutdown

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url=f"{settings.API_V1_STR}/docs",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS Allow-list
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-CSRF-Token", "Authorization"]
)

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if settings.ENV.lower() == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# Mount v1 routes
app.include_router(api_v1_router, prefix=settings.API_V1_STR)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "GreenPay API",
        "version": settings.VERSION,
        "env": settings.ENV,
        "independent_prototype": True,
        "affiliation": "None (Not affiliated with BBMP/GBA)"
    }
