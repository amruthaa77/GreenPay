"""
GreenPay - Production Super Admin Bootstrap Script
Run this script via Render SSH or as a one-off command after running migrations:
python create_super_admin.py --email admin@example.com --name "Project Lead" --password "YourStrongPassword!"
"""

import sys
import uuid
import argparse
from app.database import SessionLocal, init_db
from app.models.user import User, UserProfile
from app.models.ward import Ward
from app.core.security import hash_password, verify_password
from app.main import KNOWN_DEFAULT_PASSWORDS

def create_super_admin(email: str, name: str, password: str, ward_name: str = "Koramangala"):
    for bad_pwd in KNOWN_DEFAULT_PASSWORDS:
        if password == bad_pwd:
            print(f"❌ Error: Password cannot be one of the known demo passwords ({bad_pwd}).")
            sys.exit(1)

    if len(password) < 12:
        print("❌ Error: Production password must be at least 12 characters long.")
        sys.exit(1)

    db = SessionLocal()
    try:
        # Check if a super admin already exists
        existing_admin = db.query(User).filter(User.role == "SUPER_ADMIN").first()
        if existing_admin:
            print(f"ℹ️ Super Admin already exists (GreenPay ID: {existing_admin.greenpay_id}).")
            return

        # Ensure baseline wards exist
        ward = db.query(Ward).filter(Ward.name.ilike(ward_name.strip())).first()
        if not ward:
            init_db()
            ward = db.query(Ward).filter(Ward.name.ilike(ward_name.strip())).first()

        admin_id = str(uuid.uuid4())
        admin_user = User(
            id=admin_id,
            role="SUPER_ADMIN",
            status="ACTIVE",
            greenpay_id="GP-ADM-001",
            password_hash=hash_password(password),
            is_adult_declared=True
        )
        db.add(admin_user)
        db.flush()

        profile = UserProfile(
            user_id=admin_id,
            name=name.strip(),
            email=email.strip().lower(),
            ward_id=ward.id if ward else None
        )
        db.add(profile)
        db.commit()

        print(f"✅ Production Super Admin created successfully:")
        print(f"   GreenPay ID: GP-ADM-001")
        print(f"   Email:       {email}")
        print(f"   Role:        SUPER_ADMIN")
    except Exception as e:
        db.rollback()
        print(f"❌ Failed to create super admin: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create initial production Super Admin")
    parser.add_argument("--email", required=True, help="Super admin email address")
    parser.add_argument("--name", required=True, help="Super admin full name")
    parser.add_argument("--password", required=True, help="Super admin strong password")
    parser.add_argument("--ward", default="Koramangala", help="Default pilot ward")
    args = parser.parse_args()

    create_super_admin(args.email, args.name, args.password, args.ward)
