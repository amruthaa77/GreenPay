import io
import pytest
from datetime import datetime, timezone, timedelta
from PIL import Image
from fastapi.testclient import TestClient
from fastapi import HTTPException

from app.main import app
from app.models.user import User, UserProfile
from app.models.ward import Ward
from app.models.waste import WasteEntry
from app.models.credit_ledger import CreditTransaction
from app.models.dispute import DisputeTicket
from app.services.dispute_service import DisputeService

def create_sample_image_with_exif() -> bytes:
    """Helper to create a JPEG image with dummy EXIF metadata."""
    img = Image.new("RGB", (100, 100), color=(34, 197, 94))
    exif_data = img.getexif()
    exif_data[271] = "CameraBrandMock" # Make
    exif_data[272] = "ModelX100"      # Model
    exif_data[305] = "ExifSoftware"   # Software
    buf = io.BytesIO()
    img.save(buf, format="JPEG", exif=exif_data)
    return buf.getvalue()

def setup_test_entities(db_session):
    """Creates isolated ward, citizen, supervisor, and admin for tests."""
    ward = db_session.query(Ward).filter(Ward.name == "Indiranagar").first()
    if not ward:
        ward = Ward(name="Indiranagar", zone="East", is_demo_data=True)
        db_session.add(ward)
        db_session.flush()

    citizen = User(
        password_hash="fakehash",
        role="CITIZEN",
        status="ACTIVE",
        greenpay_id=f"GP-CIT-{datetime.now().timestamp()}",
        meter_number_encrypted="dummy_meter"
    )
    db_session.add(citizen)
    db_session.flush()

    profile = UserProfile(
        user_id=citizen.id,
        name="Dispute Tester",
        ward_id=ward.id,
        email="citizen.disp@example.com"
    )
    db_session.add(profile)

    supervisor = User(
        password_hash="fakehash",
        role="SUPERVISOR",
        status="ACTIVE",
        greenpay_id=f"GP-SUP-{datetime.now().timestamp()}"
    )
    db_session.add(supervisor)
    db_session.flush()

    admin = User(
        password_hash="fakehash",
        role="SUPER_ADMIN",
        status="ACTIVE",
        greenpay_id=f"GP-ADM-{datetime.now().timestamp()}"
    )
    db_session.add(admin)
    db_session.flush()

    db_session.commit()
    return ward, citizen, supervisor, admin

def test_exif_stripping_utility():
    raw_bytes = create_sample_image_with_exif()
    # Verify original has EXIF
    orig_img = Image.open(io.BytesIO(raw_bytes))
    assert bool(orig_img.getexif()) is True

    # Strip and save
    filename, path = DisputeService.strip_exif_and_save_photo(raw_bytes, "test_pic.jpg", "image/jpeg")
    
    # Verify saved image has NO EXIF
    clean_img = Image.open(path)
    assert len(clean_img.getexif()) == 0

def test_citizen_create_dispute_and_lifecycle(client: TestClient, db_session):
    ward, citizen, supervisor, admin = setup_test_entities(db_session)

    # Weighment 1: Recent (today)
    weighment = WasteEntry(
        transaction_id=f"GP-REC-{datetime.now().timestamp()}",
        user_id=citizen.id,
        supervisor_id=supervisor.id,
        ward_id=ward.id,
        dry_kg=5.0,
        total_weight_kg=5.0,
        dispute_status="PENDING_CONFIRMATION",
        collection_date=datetime.now(timezone.utc)
    )
    db_session.add(weighment)
    db_session.flush()

    initial_tx = CreditTransaction(
        user_id=citizen.id,
        waste_entry_id=weighment.id,
        credits_amount=50.0,
        calculation_formula="5.0 kg * 10 credits/kg = 50 credits"
    )
    db_session.add(initial_tx)
    db_session.commit()

    # 2. File dispute with attached photo
    photo_bytes = create_sample_image_with_exif()
    dispute = DisputeService.create_dispute(
        db=db_session,
        citizen_id=citizen.id,
        category="WRONG_WEIGHT",
        description="Digital scale showed 5kg but supervisor entered incorrect category",
        weighment_id=weighment.id,
        photo_bytes=photo_bytes,
        photo_filename="scale_receipt.jpg",
        photo_content_type="image/jpeg"
    )

    assert dispute.ticket_number.startswith("DSP-")
    assert dispute.status == "OPEN"
    assert dispute.photo_path is not None
    assert weighment.dispute_status == "DISPUTED"

    # Verify 90-day retention set
    ret_until = dispute.retention_until
    if ret_until.tzinfo is None:
        ret_until = ret_until.replace(tzinfo=timezone.utc)
    assert ret_until > datetime.now(timezone.utc) + timedelta(days=88)


    # 3. Admin Upholds Dispute with credit adjustment
    resolved = DisputeService.resolve_dispute(
        db=db_session,
        dispute_id=dispute.id,
        decision="UPHOLD",
        resolution_notes="Supervisor scale re-verified. 20 bonus credits awarded.",
        admin_user=admin,
        points_adjustment=20.0
    )

    assert resolved.status == "RESOLVED_UPHELD"
    assert resolved.points_adjustment == 20.0
    assert resolved.reversal_transaction_id is not None
    assert weighment.dispute_status == "RESOLVED"

    # Verify append-only reversal transaction
    reversal_tx = db_session.query(CreditTransaction).filter(CreditTransaction.id == resolved.reversal_transaction_id).first()
    assert reversal_tx is not None
    assert reversal_tx.is_reversal is True
    assert reversal_tx.credits_amount == 20.0
    assert initial_tx.credits_amount == 50.0 # Original transaction untouched!

def test_seven_day_auto_confirmation_rule(db_session):
    ward, citizen, supervisor, _ = setup_test_entities(db_session)

    # Weighment older than 7 days (e.g. 10 days ago)
    old_date = datetime.now(timezone.utc) - timedelta(days=10)
    old_weighment = WasteEntry(
        transaction_id=f"GP-REC-OLD-{datetime.now().timestamp()}",
        user_id=citizen.id,
        supervisor_id=supervisor.id,
        ward_id=ward.id,
        dry_kg=3.0,
        total_weight_kg=3.0,
        dispute_status="PENDING_CONFIRMATION",
        collection_date=old_date
    )
    db_session.add(old_weighment)
    db_session.commit()

    # Trigger auto-confirm
    confirmed = DisputeService.auto_confirm_expired_weighments(db_session)
    assert confirmed >= 1

    db_session.refresh(old_weighment)
    assert old_weighment.dispute_status == "CONFIRMED"
    assert old_weighment.confirmation_date is not None

def test_expired_weighment_dispute_rejected(db_session):
    ward, citizen, supervisor, _ = setup_test_entities(db_session)

    # Weighment 8 days old
    old_date = datetime.now(timezone.utc) - timedelta(days=8)
    weighment = WasteEntry(
        transaction_id=f"GP-REC-EXP-{datetime.now().timestamp()}",
        user_id=citizen.id,
        supervisor_id=supervisor.id,
        ward_id=ward.id,
        dry_kg=2.0,
        total_weight_kg=2.0,
        dispute_status="CONFIRMED",
        collection_date=old_date
    )
    db_session.add(weighment)
    db_session.commit()

    with pytest.raises(HTTPException) as exc_info:
        DisputeService.create_dispute(
            db=db_session,
            citizen_id=citizen.id,
            category="WRONG_WEIGHT",
            description="Trying to dispute past the 7 day window",
            weighment_id=weighment.id
        )
    assert exc_info.value.status_code == 400
    assert "Dispute window expired" in exc_info.value.detail
