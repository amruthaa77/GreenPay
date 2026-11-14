import sys
import secrets
from datetime import datetime, timedelta, timezone
from app.database import init_db, SessionLocal
from app.core.config import settings
from app.core.security import (
    hash_password,
    hash_meter_for_lookup,
    encrypt_meter_number
)
from app.models.ward import Ward
from app.models.user import User, UserProfile
from app.models.reward_schedule import RewardSchedule
from app.models.waste import WasteEntry
from app.models.credit_ledger import CreditTransaction
from app.models.anomaly import AnomalyFlag
from app.models.audit import AuditLog
from app.models.consent import ConsentRecord
from app.models.schedule import WardCollectionSchedule, ScheduleOverride
from app.models.redemption import RedemptionItem, PartnerCoupon, RedemptionTransaction
from app.models.dry_waste import DryWasteCategory, WasteCollectionItem

def run_seed():
    if settings.ENV.lower() == "production":
        print("[ERROR] Cannot run seed script in production environment!")
        sys.exit(1)
        
    print("[*] Initializing GreenPay Bengaluru database schema...")
    init_db()
    
    db = SessionLocal()
    try:
        # 1. Wards (Names only per Amendment #6)
        ward_names = [
            ("Koramangala", "South"),
            ("Indiranagar", "East"),
            ("Jayanagar", "South"),
            ("Whitefield", "East")
        ]
        wards_map = {}
        for name, zone in ward_names:
            ward = db.query(Ward).filter(Ward.name == name).first()
            if not ward:
                ward = Ward(name=name, zone=zone, is_demo_data=True)
                db.add(ward)
                db.flush()
            wards_map[name] = ward
            
        # 2. Reward Schedule v1
        schedule = db.query(RewardSchedule).filter(RewardSchedule.version == 1).first()
        if not schedule:
            schedule = RewardSchedule(
                version=1,
                wet_rate=5.0,
                dry_rate=10.0,
                hazardous_rate=15.0,
                ewaste_rate=20.0,
                is_active=True,
                change_reason="Municipal Baseline Schedule 2025-2026"
            )
            db.add(schedule)
            db.flush()

        # 3. Super-Admin
        admin = db.query(UserProfile).filter(UserProfile.email == "admin@greenpay.blr").first()
        if not admin:
            admin_user = User(
                password_hash=hash_password("AdminSecure2026!"),
                role="SUPER_ADMIN",
                status="ACTIVE",
                is_adult_declared=True
            )
            db.add(admin_user)
            db.flush()
            admin_profile = UserProfile(
                user_id=admin_user.id,
                name="Siddharth Rao (Super-Admin)",
                ward_id=wards_map["Koramangala"].id,
                email="admin@greenpay.blr",
                phone_number="+91 80 2553 4401",
                green_score=100.0
            )
            db.add(admin_profile)
            db.flush()
        else:
            admin.user.password_hash = hash_password("AdminSecure2026!")

        # 4. Field Supervisors
        supervisors = {}
        sup_data = [
            ("Ramesh Rao", "supervisor.koramangala@greenpay.blr", "Koramangala"),
            ("Ramesh Rao", "supervisor.kora@greenpay.blr", "Koramangala"),
            ("Kavita Gowda", "supervisor.indiranagar@greenpay.blr", "Indiranagar"),
            ("Kavita Gowda", "supervisor.indi@greenpay.blr", "Indiranagar")
        ]
        for name, email, w_name in sup_data:
            prof = db.query(UserProfile).filter(UserProfile.email == email).first()
            if not prof:
                sup_u = User(
                    password_hash=hash_password("AdminSecure2026!"),
                    role="SUPERVISOR",
                    status="ACTIVE",
                    is_adult_declared=True
                )
                db.add(sup_u)
                db.flush()
                prof = UserProfile(
                    user_id=sup_u.id,
                    name=name,
                    ward_id=wards_map[w_name].id,
                    email=email,
                    green_score=100.0
                )
                db.add(prof)
                db.flush()
            else:
                prof.user.password_hash = hash_password("AdminSecure2026!")
            supervisors[w_name] = prof.user

        # 5. Citizens
        # Citizen 1: Aarav Sharma (Active, Koramangala)
        c1_meter = "BESCOM-IND-104928"
        c1_hash = hash_meter_for_lookup(c1_meter)
        c1_user = db.query(User).filter(User.meter_number_hash == c1_hash).first()
        if not c1_user:
            c1_user = User(
                meter_number_hash=c1_hash,
                meter_number_encrypted=encrypt_meter_number(c1_meter),
                greenpay_id="GP-104928",
                password_hash=hash_password("Password123!"),
                role="CITIZEN",
                status="ACTIVE",
                is_adult_declared=True
            )
            db.add(c1_user)
            db.flush()
            c1_prof = UserProfile(
                user_id=c1_user.id,
                name="Aarav Sharma",
                ward_id=wards_map["Koramangala"].id,
                email="aarav.demo@greenpay.blr",
                phone_number="+91 98450 10492",
                green_score=86.0,
                streak_weeks=8,
                email_marketing_opt_in=True,
                unsubscribe_token="demo-unsub-aarav-token-1234"
            )
            db.add(c1_prof)
            db.add(ConsentRecord(user_id=c1_user.id, consent_type="TERMS_AND_PRIVACY", granted=True))
            db.add(ConsentRecord(user_id=c1_user.id, consent_type="MARKETING_NOTIFICATIONS", granted=True))
            db.flush()

        # Citizen 2: Priya Nair (Active, Indiranagar)
        c2_meter = "BESCOM-IND-208491"
        c2_hash = hash_meter_for_lookup(c2_meter)
        c2_user = db.query(User).filter(User.meter_number_hash == c2_hash).first()
        if not c2_user:
            c2_user = User(
                meter_number_hash=c2_hash,
                meter_number_encrypted=encrypt_meter_number(c2_meter),
                greenpay_id="GP-208491",
                password_hash=hash_password("Password123!"),
                role="CITIZEN",
                status="ACTIVE",
                is_adult_declared=True
            )
            db.add(c2_user)
            db.flush()
            c2_prof = UserProfile(
                user_id=c2_user.id,
                name="Priya Nair",
                ward_id=wards_map["Indiranagar"].id,
                email="priya.demo@greenpay.blr",
                phone_number="+91 98451 20849",
                green_score=92.0,
                streak_weeks=12,
                email_marketing_opt_in=False,
                unsubscribe_token="demo-unsub-priya-token-5678"
            )
            db.add(c2_prof)
            db.add(ConsentRecord(user_id=c2_user.id, consent_type="TERMS_AND_PRIVACY", granted=True))
            db.flush()

        # Citizen 3: Rohan Verma (PENDING status per Amendment #3)
        c3_meter = "BESCOM-IND-309182"
        c3_hash = hash_meter_for_lookup(c3_meter)
        c3_user = db.query(User).filter(User.meter_number_hash == c3_hash).first()
        if not c3_user:
            c3_user = User(
                meter_number_hash=c3_hash,
                meter_number_encrypted=encrypt_meter_number(c3_meter),
                greenpay_id="GP-309182",
                password_hash=hash_password("Password123!"),
                role="CITIZEN",
                status="PENDING", # Pending doorstep activation!
                is_adult_declared=True
            )
            db.add(c3_user)
            db.flush()
            c3_prof = UserProfile(
                user_id=c3_user.id,
                name="Rohan Verma",
                ward_id=wards_map["Jayanagar"].id,
                email="rohan.demo@greenpay.blr",
                phone_number="+91 98452 30918",
                green_score=50.0,
                streak_weeks=0
            )
            db.add(c3_prof)
            db.add(ConsentRecord(user_id=c3_user.id, consent_type="TERMS_AND_PRIVACY", granted=True))
            db.flush()

        # 6. Seed 12 Months of Verified Waste Collections (Amendment #7)
        # November 2025 to October 2026
        now = datetime.now(timezone.utc)
        print("[*] Seeding 12 months of historical collection weighments...")
        
        base_monthly_weights = [
            14200.0, 14900.0, 15600.0, 16400.0, 17100.0, 17900.0,
            18500.0, 19200.0, 20100.0, 20900.0, 21800.0, 22600.0
        ]
        
        for month_idx in range(12):
            months_ago = 11 - month_idx
            # Target date around the middle of that month
            target_date = now - timedelta(days=months_ago * 30 + 10)
            
            # Create representative collection entries across the wards
            for w_name, ward in wards_map.items():
                sup = supervisors.get(w_name, supervisors["Koramangala"])
                citizen = c1_user if w_name == "Koramangala" else c2_user
                
                # Monthly aggregate entry for ward time-series
                ward_fraction = 0.25 + (0.05 if w_name == "Koramangala" else 0.0)
                month_total_kg = base_monthly_weights[month_idx] * ward_fraction
                
                # Split into wet / dry / hazardous / ewaste
                wet = round(month_total_kg * 0.58, 1)
                dry = round(month_total_kg * 0.36, 1)
                haz = round(month_total_kg * 0.04, 1)
                ewaste = round(month_total_kg * 0.02, 1)
                tot = round(wet + dry + haz + ewaste, 1)
                
                tx_id = f"GP-REC-HIST-{month_idx}-{ward.name[:3].upper()}"
                
                if not db.query(WasteEntry).filter(WasteEntry.transaction_id == tx_id).first():
                    entry = WasteEntry(
                        transaction_id=tx_id,
                        user_id=citizen.id,
                        supervisor_id=sup.id,
                        ward_id=ward.id,
                        wet_kg=wet,
                        dry_kg=dry,
                        hazardous_kg=haz,
                        ewaste_kg=ewaste,
                        total_weight_kg=tot,
                        journey_stage="Recovery",
                        collection_date=target_date,
                        is_demo=True
                    )
                    db.add(entry)
                    db.flush()

        # 7. Seed Recent Doorstep Collections for Demo Citizens (Balances strictly below 100 GP)
        # Citizen 1: Aarav Sharma - 65.0 GP Balance (2.5kg PET @ 18 GP/kg + 2.0kg Cardboard @ 10 GP/kg)
        c1_date = now - timedelta(days=7)
        c1_tx_id = "GP-REC-2026-7D-AARAV"
        if not db.query(WasteEntry).filter(WasteEntry.transaction_id == c1_tx_id).first():
            entry_c1 = WasteEntry(
                transaction_id=c1_tx_id,
                user_id=c1_user.id,
                supervisor_id=supervisors["Koramangala"].id,
                ward_id=wards_map["Koramangala"].id,
                dry_kg=4.5,
                total_weight_kg=4.5,
                journey_stage="Processing",
                collection_date=c1_date,
                is_demo=True
            )
            db.add(entry_c1)
            db.flush()
            
            formula_c1 = "2.50 kg (PET Bottles) × 18 GP/kg + 2.00 kg (Cardboard) × 10 GP/kg = 65.0 Green Points"
            db.add(CreditTransaction(
                user_id=c1_user.id,
                waste_entry_id=entry_c1.id,
                schedule_version=1,
                credits_amount=65.0,
                calculation_formula=formula_c1,
                timestamp=c1_date
            ))
            pet_c = db.query(DryWasteCategory).filter(DryWasteCategory.code == "pet_bottles").first()
            card_c = db.query(DryWasteCategory).filter(DryWasteCategory.code == "cardboard").first()
            if pet_c:
                db.add(WasteCollectionItem(
                    waste_entry_id=entry_c1.id,
                    category_id=pet_c.id,
                    category_code="pet_bottles",
                    category_name="PET Bottles",
                    rate_per_kg=18.0,
                    weight_kg=2.5,
                    points_earned=45.0,
                ))
            if card_c:
                db.add(WasteCollectionItem(
                    waste_entry_id=entry_c1.id,
                    category_id=card_c.id,
                    category_code="cardboard",
                    category_name="Cardboard",
                    rate_per_kg=10.0,
                    weight_kg=2.0,
                    points_earned=20.0,
                ))

        # Citizen 2: Priya Nair - 40.0 GP Balance (4.0kg Newspapers & Magazines @ 10 GP/kg)
        c2_date = now - timedelta(days=10)
        c2_tx_id = "GP-REC-2026-10D-PRIYA"
        if not db.query(WasteEntry).filter(WasteEntry.transaction_id == c2_tx_id).first():
            entry_c2 = WasteEntry(
                transaction_id=c2_tx_id,
                user_id=c2_user.id,
                supervisor_id=supervisors["Indiranagar"].id,
                ward_id=wards_map["Indiranagar"].id,
                dry_kg=4.0,
                total_weight_kg=4.0,
                journey_stage="Processing",
                collection_date=c2_date,
                is_demo=True
            )
            db.add(entry_c2)
            db.flush()
            
            formula_c2 = "4.00 kg (Newspapers & Magazines) × 10 GP/kg = 40.0 Green Points"
            db.add(CreditTransaction(
                user_id=c2_user.id,
                waste_entry_id=entry_c2.id,
                schedule_version=1,
                credits_amount=40.0,
                calculation_formula=formula_c2,
                timestamp=c2_date
            ))
            news_c = db.query(DryWasteCategory).filter(DryWasteCategory.code == "newspapers_magazines").first()
            if news_c:
                db.add(WasteCollectionItem(
                    waste_entry_id=entry_c2.id,
                    category_id=news_c.id,
                    category_code="newspapers_magazines",
                    category_name="Newspapers & Magazines",
                    rate_per_kg=10.0,
                    weight_kg=4.0,
                    points_earned=40.0,
                ))

        # 8. Seed a demo Anomaly for Admin review queue (0 credits issued while pending review)
        anomaly_tx_id = "GP-REC-ANOMALY-DEMO-01"
        if not db.query(WasteEntry).filter(WasteEntry.transaction_id == anomaly_tx_id).first():
            entry_anom = WasteEntry(
                transaction_id=anomaly_tx_id,
                user_id=c1_user.id,
                supervisor_id=supervisors["Koramangala"].id,
                ward_id=wards_map["Koramangala"].id,
                dry_kg=65.5,
                total_weight_kg=65.5,
                journey_stage="Sorting",
                collection_date=now - timedelta(hours=6),
                notes="Single household massive bulk dump reported",
                is_demo=True
            )
            db.add(entry_anom)
            db.flush()
            
            # Anomaly under investigation holds credit issuance until supervisor review
            db.add(CreditTransaction(
                user_id=c1_user.id,
                waste_entry_id=entry_anom.id,
                schedule_version=1,
                credits_amount=0.0,
                calculation_formula="Held pending review: Volume spike flagged for supervisor inspection (0.0 GP issued)",
                timestamp=now - timedelta(hours=6)
            ))
            
            db.add(AnomalyFlag(
                waste_entry_id=entry_anom.id,
                user_id=c1_user.id,
                ward_id=wards_map["Koramangala"].id,
                anomaly_type="ROLLING_Z_SCORE_SPIKE",
                z_score_household=3.85,
                description="Household volume spike: Logged 65.50 kg is 3.85 standard deviations above rolling average.",
                severity="HIGH",
                status="PENDING_REVIEW"
            ))

        # 9. Seed Ward Collection Schedules & Overrides per waste type
        for ward_name, ward_obj in wards_map.items():
            existing_sched = db.query(WardCollectionSchedule).filter(WardCollectionSchedule.ward_id == ward_obj.id).first()
            if not existing_sched:
                schedules_data = [
                    WardCollectionSchedule(
                        ward_id=ward_obj.id,
                        waste_type="WET",
                        day_of_week=-1,
                        frequency="DAILY",
                        start_time="06:30",
                        end_time="09:00",
                        vehicle_number=f"KA-01-EA-{abs(hash(ward_name)) % 9000 + 1000}",
                        supervisor_name="Ramesh Gowda",
                        supervisor_contact="+91 80 2553 4410",
                        instructions="Kitchen food scraps, fruit/vegetable peels, and garden waste in green bins. Zero plastic bags.",
                        is_active=True
                    ),
                    WardCollectionSchedule(
                        ward_id=ward_obj.id,
                        waste_type="DRY",
                        day_of_week=1, # Tuesday
                        frequency="WEEKLY",
                        start_time="07:00",
                        end_time="10:00",
                        vehicle_number=f"KA-01-EA-{abs(hash(ward_name)) % 9000 + 1001}",
                        supervisor_name="Ramesh Gowda",
                        supervisor_contact="+91 80 2553 4410",
                        instructions="Clean dry recyclables: newspapers, cardboard, flattened containers, rinsed beverage bottles.",
                        is_active=True
                    ),
                    WardCollectionSchedule(
                        ward_id=ward_obj.id,
                        waste_type="DRY",
                        day_of_week=4, # Friday
                        frequency="WEEKLY",
                        start_time="07:00",
                        end_time="10:00",
                        vehicle_number=f"KA-01-EA-{abs(hash(ward_name)) % 9000 + 1001}",
                        supervisor_name="Ramesh Gowda",
                        supervisor_contact="+91 80 2553 4410",
                        instructions="Clean dry recyclables: packaging cartons, milk packets (rinsed & dry), metal tins.",
                        is_active=True
                    ),
                    WardCollectionSchedule(
                        ward_id=ward_obj.id,
                        waste_type="HAZARDOUS_EWASTE",
                        day_of_week=5, # 1st Saturday
                        frequency="FIRST_SATURDAY_OF_MONTH",
                        start_time="08:00",
                        end_time="12:00",
                        vehicle_number=f"KA-01-EA-{abs(hash(ward_name)) % 9000 + 1009}",
                        supervisor_name="Suresh Kumar",
                        supervisor_contact="+91 80 2553 4412",
                        instructions="Batteries, tube lights, paints, discarded electronics, expired medicines in red container.",
                        is_active=True
                    ),
                ]
                db.add_all(schedules_data)

            # Sample seasonal / holiday override
            existing_ovr = db.query(ScheduleOverride).filter(ScheduleOverride.ward_id == ward_obj.id).first()
            if not existing_ovr:
                super_admin = db.query(User).filter(User.role == "SUPER_ADMIN").first()
                override_date = (now + timedelta(days=5)).date()
                db.add(ScheduleOverride(
                    ward_id=ward_obj.id,
                    override_date=override_date,
                    waste_type="DRY",
                    is_cancelled=False,
                    rescheduled_date=override_date,
                    rescheduled_start_time="08:00",
                    rescheduled_end_time="11:30",
                    reason="Municipal Route Adjustment / Extended Festive Collection",
                    created_by_id=super_admin.id if super_admin else None
                ))

        # 9. Seed Grocery Redemption Items (5 Official Products)
        print("[*] Seeding Grocery Redemption items...")
        if db.query(RedemptionItem).filter(RedemptionItem.item_type == "GROCERY").count() == 0:
            groceries = [
                RedemptionItem(
                    item_type="GROCERY",
                    title="Rice",
                    description="1 kg Premium Sona Masoori Rice. Clean, unadulterated high-yield staple sourced directly through verified agricultural cooperatives.",
                    credit_cost=120.0,
                    stock_limit=500,
                    stock_remaining=420,
                    partner_name="Karnataka Food & Civil Supplies",
                    badge_text="1 kg • Staple Ration",
                    is_active=True
                ),
                RedemptionItem(
                    item_type="GROCERY",
                    title="Toor Dal",
                    description="1 kg High-Protein Polished Toor Dal (Pigeon Pea). Unpolished, chemical-free essential legume packed with essential plant protein.",
                    credit_cost=140.0,
                    stock_limit=400,
                    stock_remaining=310,
                    partner_name="Karnataka Food & Civil Supplies",
                    badge_text="1 kg • High Protein",
                    is_active=True
                ),
                RedemptionItem(
                    item_type="GROCERY",
                    title="Sunflower Cooking Oil",
                    description="1 litre Refined Sunflower Cooking Oil Pouch. Fortified with Vitamins A & D, ultra-pure, heart-healthy cold-filtered culinary oil.",
                    credit_cost=150.0,
                    stock_limit=300,
                    stock_remaining=225,
                    partner_name="Karnataka Food & Civil Supplies",
                    badge_text="1 Litre • Fortified Oil",
                    is_active=True
                ),
                RedemptionItem(
                    item_type="GROCERY",
                    title="Sugar",
                    description="1 kg Pure Refined White Cane Sugar. Sulfur-free crystalline cane sugar processed under certified food standards.",
                    credit_cost=80.0,
                    stock_limit=500,
                    stock_remaining=380,
                    partner_name="Karnataka Food & Civil Supplies",
                    badge_text="1 kg • Sulfur Free",
                    is_active=True
                ),
                RedemptionItem(
                    item_type="GROCERY",
                    title="Iodized Salt",
                    description="1 kg Vacuum Evaporated Pure Cooking Salt. Micro-filtered and fortified with essential dietary iodine for household health.",
                    credit_cost=60.0,
                    stock_limit=600,
                    stock_remaining=510,
                    partner_name="Karnataka Food & Civil Supplies",
                    badge_text="1 kg • Essential Mineral",
                    is_active=True
                ),
            ]
            db.add_all(groceries)

        db.commit()
        print("\n[OK] GreenPay demo database seeded successfully with 12 months of history!")
        
        # Display demo credentials (only in development)
        if settings.ENV.lower() == "development":
            print("\n" + "=" * 70)
            print("[DEMO] DEMO CREDENTIALS (DEVELOPMENT MODE ONLY - ALL DATA DEMO)")
            print("=" * 70)
            print("Role: CITIZEN (Active)")
            print("  - Meter:     BESCOM-IND-104928")
            print("  - QR ID:     GP-104928")
            print("  - Password:  Password123!")
            print("  - Ward:      Koramangala (Green Score: 86.0)")
            print("-" * 70)
            print("Role: CITIZEN (Pending Doorstep Activation)")
            print("  - Meter:     BESCOM-IND-309182")
            print("  - QR ID:     GP-309182")
            print("  - Password:  Password123!")
            print("  - Ward:      Jayanagar (Status: PENDING)")
            print("-" * 70)
            print("Role: MUNICIPAL SUPERVISOR")
            print("  - Email:     supervisor.kora@greenpay.blr")
            print("  - Password:  AdminSecret123!")
            print("  - Ward:      Koramangala")
            print("-" * 70)
            print("Role: SUPER-ADMIN")
            print("  - Email:     admin@greenpay.blr")
            print("  - Password:  AdminSecret123!")
            print("=" * 70 + "\n")
            
    finally:
        db.close()

if __name__ == "__main__":
    run_seed()
