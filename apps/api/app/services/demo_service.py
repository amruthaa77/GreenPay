import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from app.models.user import User, UserProfile
from app.models.ward import Ward
from app.models.waste import WasteEntry
from app.models.credit_ledger import CreditTransaction
from app.core.security import (
    hash_password,
    hash_meter_for_lookup,
    encrypt_meter_number,
)

DEMO_PROFILES: Dict[str, Dict[str, Any]] = {
    "citizen_koramangala": {
        "role": "CITIZEN",
        "meter_number": "DEMO-BESCOM-1049",
        "greenpay_id": "GP-DEMO01",
        "name": "Aarav Sharma (Demo Citizen)",
        "email": "aarav.demo@greenpay.blr",
        "ward_name": "Koramangala",
        "green_score": 78.5,
        "streak_weeks": 4,
    },
    "citizen_jayanagar": {
        "role": "CITIZEN",
        "meter_number": "DEMO-BESCOM-3091",
        "greenpay_id": "GP-DEMO02",
        "name": "Rohan Verma (Demo Citizen)",
        "email": "rohan.demo@greenpay.blr",
        "ward_name": "Jayanagar",
        "green_score": 62.0,
        "streak_weeks": 2,
    },
    "supervisor_koramangala": {
        "role": "SUPERVISOR",
        "meter_number": None,
        "greenpay_id": "GP-SUPE01",
        "name": "Vikram Rao (Demo Supervisor)",
        "email": "demo.supervisor.koramangala@greenpay.blr",
        "ward_name": "Koramangala",
        "green_score": 50.0,
        "streak_weeks": 0,
    },
    "admin_central": {
        "role": "SUPER_ADMIN",
        "meter_number": None,
        "greenpay_id": "GP-ADMN01",
        "name": "Executive Evaluator (Demo Admin)",
        "email": "demo.admin@greenpay.blr",
        "ward_name": "Koramangala",
        "green_score": 50.0,
        "streak_weeks": 0,
    },
}

class DemoService:
    @staticmethod
    def get_or_create_demo_user(
        db: Session,
        role: str,
        demo_id: Optional[str] = None
    ) -> User:
        """
        Retrieves or provisions an isolated demo user with realistic demonstration data.
        Password hashes are cryptographically random (not default passwords) so production
        security guards remain fully compliant and pass.
        """
        role_upper = role.upper()
        
        # Select matching profile key
        profile_key = "citizen_koramangala"
        if role_upper == "SUPERVISOR":
            profile_key = "supervisor_koramangala"
        elif role_upper == "SUPER_ADMIN":
            profile_key = "admin_central"
        elif demo_id and "jayanagar" in demo_id.lower():
            profile_key = "citizen_jayanagar"

        spec = DEMO_PROFILES[profile_key]

        # 1. Look up existing demo user by greenpay_id or email
        existing_user: Optional[User] = None
        if spec["greenpay_id"]:
            existing_user = db.query(User).filter(User.greenpay_id == spec["greenpay_id"]).first()
        if not existing_user and spec["email"]:
            profile = db.query(UserProfile).filter(UserProfile.email.ilike(spec["email"])).first()
            if profile:
                existing_user = profile.user

        if existing_user:
            return existing_user

        # 2. Lookup Ward
        ward = db.query(Ward).filter(Ward.name.ilike(spec["ward_name"])).first()
        if not ward:
            ward = Ward(name=spec["ward_name"], zone="South", is_demo_data=True)
            db.add(ward)
            db.flush()

        # 3. Create Demo User
        meter_hash = hash_meter_for_lookup(spec["meter_number"]) if spec["meter_number"] else None
        meter_enc = encrypt_meter_number(spec["meter_number"]) if spec["meter_number"] else None
        
        # Generate random password hash (never matched against default passwords)
        random_pwd = secrets.token_urlsafe(32)
        pwd_hash = hash_password(random_pwd)

        demo_user = User(
            meter_number_hash=meter_hash,
            meter_number_encrypted=meter_enc,
            greenpay_id=spec["greenpay_id"],
            password_hash=pwd_hash,
            role=spec["role"],
            status="ACTIVE",
            is_adult_declared=True,
            is_demo=True,
        )
        db.add(demo_user)
        db.flush()

        # 4. Create User Profile
        profile = UserProfile(
            user_id=demo_user.id,
            name=spec["name"],
            ward_id=ward.id,
            email=spec["email"],
            phone_number="+91-98765-43210",
            green_score=spec["green_score"],
            streak_weeks=spec["streak_weeks"],
            email_marketing_opt_in=False,
        )
        db.add(profile)
        db.flush()

        # 5. For Citizen, seed isolated sample weighment records if supervisor exists or create a supervisor
        if spec["role"] == "CITIZEN":
            supervisor = DemoService.get_or_create_demo_user(db, "SUPERVISOR")
            now = datetime.now(timezone.utc)
            
            # Sample Entry 1: 3 days ago - Confirmed Dry Waste
            entry_1 = WasteEntry(
                transaction_id=f"GP-DEMO-REC-{secrets.randbelow(89999) + 10000}",
                user_id=demo_user.id,
                supervisor_id=supervisor.id,
                ward_id=ward.id,
                dry_kg=4.2,
                wet_kg=0.0,
                hazardous_kg=0.0,
                ewaste_kg=1.5,
                total_weight_kg=5.7,
                journey_stage="Recovery",
                dispute_status="CONFIRMED",
                confirmation_date=now - timedelta(days=2),
                collection_date=now - timedelta(days=3),
                notes="Demo verified collection - PET and Paper sorted.",
                is_demo=True
            )
            db.add(entry_1)
            db.flush()

            # Ledger Credit for Entry 1
            db.add(CreditTransaction(
                user_id=demo_user.id,
                waste_entry_id=entry_1.id,
                schedule_version=1,
                credits_amount=79.5,
                calculation_formula="4.20 kg (Dry) × 10 + 1.50 kg (E-Waste) × 25 = 79.5 Green Points",
                timestamp=now - timedelta(days=3)
            ))

            # Sample Entry 2: Yesterday - Processing
            entry_2 = WasteEntry(
                transaction_id=f"GP-DEMO-REC-{secrets.randbelow(89999) + 10000}",
                user_id=demo_user.id,
                supervisor_id=supervisor.id,
                ward_id=ward.id,
                dry_kg=3.0,
                wet_kg=0.0,
                hazardous_kg=0.0,
                ewaste_kg=0.0,
                total_weight_kg=3.0,
                journey_stage="Processing",
                dispute_status="PENDING_CONFIRMATION",
                collection_date=now - timedelta(days=1),
                notes="Demo doorstep dry recyclable pickup.",
                is_demo=True
            )
            db.add(entry_2)
            db.flush()

            db.add(CreditTransaction(
                user_id=demo_user.id,
                waste_entry_id=entry_2.id,
                schedule_version=1,
                credits_amount=30.0,
                calculation_formula="3.00 kg (Dry) × 10 = 30.0 Green Points",
                timestamp=now - timedelta(days=1)
            ))

        db.commit()
        db.refresh(demo_user)
        return demo_user
