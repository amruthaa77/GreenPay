import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db, install_ledger_immutability_triggers
from app.core.config import settings
from app.core.security import (
    hash_password,
    hash_meter_for_lookup,
    encrypt_meter_number,
    create_access_token,
    generate_csrf_token
)
from app.models.ward import Ward
from app.models.user import User, UserProfile
from app.models.reward_schedule import RewardSchedule

# Use in-memory SQLite with StaticPool for isolated fast test executions
TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    install_ledger_immutability_triggers(test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)

@pytest.fixture
def db_session():
    session = TestingSessionLocal()
    
    # Override get_db
    app.dependency_overrides[get_db] = lambda: session
    
    yield session
    
    session.rollback()
    session.close()
    app.dependency_overrides.clear()

@pytest.fixture
def client(db_session):
    return TestClient(app)

@pytest.fixture
def seed_wards_and_schedule(db_session):
    wards_map = {}
    for name, zone in [("Koramangala", "South"), ("Indiranagar", "East"), ("Jayanagar", "South"), ("Whitefield", "East")]:
        w = db_session.query(Ward).filter(Ward.name == name).first()
        if not w:
            w = Ward(name=name, zone=zone, is_demo_data=True)
            db_session.add(w)
            db_session.flush()
        wards_map[name] = w

    schedule = db_session.query(RewardSchedule).filter(RewardSchedule.version == 1).first()
    if not schedule:
        schedule = RewardSchedule(
            version=1,
            wet_rate=5.0,
            dry_rate=10.0,
            hazardous_rate=15.0,
            ewaste_rate=20.0,
            is_active=True
        )
        db_session.add(schedule)
        db_session.flush()

    # Seed 8 official dry waste categories
    from app.models.dry_waste import DryWasteCategory
    initial_categories = [
        ("aluminium_metal", "Aluminium & Metal", 22.0, "Clean beverage cans, food tins, foil, metal caps and household metallic items."),
        ("pet_bottles", "PET Bottles", 18.0, "Clear transparent or lightly tinted PET beverage bottles (resin code 1)."),
        ("other_recyclable_plastics", "Other Recyclable Plastics", 15.0, "Rigid HDPE, LDPE, and PP plastic containers, buckets, and shampoo bottles."),
        ("newspapers_magazines", "Newspapers & Magazines", 10.0, "Dry daily newspapers, printed magazines, inserts, and periodicals."),
        ("cardboard", "Cardboard", 10.0, "Flattened corrugated cardboard delivery boxes, brown carton packaging, and clean kraft paper."),
        ("glass_bottles", "Glass Bottles", 8.0, "Intact glass bottles and jars (amber, green, clear) rinsed and separated from caps."),
        ("textiles", "Textiles", 8.0, "Clean, dry unsoiled clothing, fabric scraps, linen, curtains, and recyclable cloth."),
        ("mixed_paper", "Mixed Paper", 7.0, "Office white paper, notebook sheets, envelopes, flyers, and clean shredded paper."),
    ]
    for code, name, rate, desc in initial_categories:
        if not db_session.query(DryWasteCategory).filter(DryWasteCategory.code == code).first():
            db_session.add(DryWasteCategory(
                code=code,
                name=name,
                rate_per_kg=rate,
                description=desc,
                is_active=True
            ))
    db_session.commit()
    
    return {
        "Koramangala": wards_map["Koramangala"],
        "Indiranagar": wards_map["Indiranagar"],
        "Jayanagar": wards_map["Jayanagar"],
        "Whitefield": wards_map["Whitefield"],
        "schedule": schedule
    }

@pytest.fixture
def test_citizen(db_session, seed_wards_and_schedule):
    user = db_session.query(User).filter(User.greenpay_id == "GP-999001").first()
    if not user:
        meter = "BESCOM-IND-TEST01"
        user = User(
            meter_number_hash=hash_meter_for_lookup(meter),
            meter_number_encrypted=encrypt_meter_number(meter),
            greenpay_id="GP-999001",
            password_hash=hash_password("Password123!"),
            role="CITIZEN",
            status="ACTIVE",
            is_adult_declared=True
        )
        db_session.add(user)
        db_session.flush()
        profile = UserProfile(
            user_id=user.id,
            name="Test Citizen",
            ward_id=seed_wards_and_schedule["Koramangala"].id,
            email="citizen.test@greenpay.blr",
            green_score=75.0
        )
        db_session.add(profile)
        db_session.commit()
        db_session.refresh(user)
    return user

@pytest.fixture
def test_supervisor(db_session, seed_wards_and_schedule):
    user = db_session.query(User).filter(User.role == "SUPERVISOR", User.greenpay_id == "GP-SUP-TEST01").first()
    if not user:
        user = User(
            greenpay_id="GP-SUP-TEST01",
            password_hash=hash_password("AdminSecret123!"),
            role="SUPERVISOR",
            status="ACTIVE",
            is_adult_declared=True
        )
        db_session.add(user)
        db_session.flush()
        profile = UserProfile(
            user_id=user.id,
            name="Test Supervisor",
            ward_id=seed_wards_and_schedule["Koramangala"].id,
            email="supervisor.test@greenpay.blr",
            green_score=100.0
        )
        db_session.add(profile)
        db_session.commit()
        db_session.refresh(user)
    return user

@pytest.fixture
def test_super_admin(db_session, seed_wards_and_schedule):
    user = db_session.query(User).filter(User.role == "SUPER_ADMIN", User.greenpay_id == "GP-ADM-TEST01").first()
    if not user:
        user = User(
            greenpay_id="GP-ADM-TEST01",
            password_hash=hash_password("AdminSecret123!"),
            role="SUPER_ADMIN",
            status="ACTIVE",
            is_adult_declared=True
        )
        db_session.add(user)
        db_session.flush()
        profile = UserProfile(
            user_id=user.id,
            name="Super Admin",
            ward_id=seed_wards_and_schedule["Koramangala"].id,
            email="admin.test@greenpay.blr",
            green_score=100.0
        )
        db_session.add(profile)
        db_session.commit()
        db_session.refresh(user)
    return user
