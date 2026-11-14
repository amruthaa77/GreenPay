import pytest
from app.core.config import settings
from app.main import verify_production_safety
from app.models.user import User
from app.core.security import hash_password, hash_meter_for_lookup

def test_production_guard_aborts_on_demo_meters_or_default_passwords(db_session):
    original_env = settings.ENV
    try:
        settings.ENV = "production"
        
        # 1. Add a demo meter user
        demo_meter = "BESCOM-IND-104928"
        demo_user = User(
            meter_number_hash=hash_meter_for_lookup(demo_meter),
            password_hash=hash_password("CustomStrongNonDefault123!"),
            role="CITIZEN",
            status="ACTIVE",
            is_adult_declared=True
        )
        db_session.add(demo_user)
        db_session.commit()
        
        # Must raise RuntimeError
        with pytest.raises(RuntimeError) as exc_info:
            verify_production_safety(db_session)
        assert "FATAL PRODUCTION SECURITY VIOLATION" in str(exc_info.value)
        assert demo_meter in str(exc_info.value)
        
        # Clean up demo meter user
        db_session.delete(demo_user)
        db_session.commit()
        
        # 2. Add a non-demo meter user with a default insecure password
        insecure_user = User(
            meter_number_hash=hash_meter_for_lookup("BESCOM-PROD-998877"),
            password_hash=hash_password("Password123!"), # Default password!
            role="CITIZEN",
            status="ACTIVE",
            is_adult_declared=True
        )
        db_session.add(insecure_user)
        db_session.commit()
        
        with pytest.raises(RuntimeError) as exc_pwd:
            verify_production_safety(db_session)
        assert "default/demo password" in str(exc_pwd.value)
        
    finally:
        settings.ENV = original_env
