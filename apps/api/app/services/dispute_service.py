import os
import io
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple
from PIL import Image
from sqlalchemy.orm import Session
from fastapi import HTTPException, UploadFile

from app.models.dispute import DisputeTicket
from app.models.waste import WasteEntry
from app.models.credit_ledger import CreditTransaction
from app.models.audit import AuditLog
from app.models.user import User
from app.services.notification_service import NotificationService

# Secure private storage directory for dispute photos
STORAGE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "storage", "disputes"))
os.makedirs(STORAGE_DIR, exist_ok=True)

MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}

class DisputeService:

    @staticmethod
    def strip_exif_and_save_photo(file_bytes: bytes, filename: str, content_type: str) -> Tuple[str, str]:
        """
        DPDP Data Minimisation: Strips all EXIF metadata (camera info, serial numbers, GPS tags)
        and securely saves the sanitized image to private storage.
        """
        if len(file_bytes) > MAX_PHOTO_SIZE_BYTES:
            raise HTTPException(status_code=400, detail="Photo attachment exceeds maximum permitted size of 5MB.")

        if content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(status_code=400, detail="Invalid photo format. Supported formats: JPEG, PNG, WebP.")

        try:
            image = Image.open(io.BytesIO(file_bytes))
            # Determine target format
            fmt = "JPEG"
            ext = ".jpg"
            if content_type == "image/png" or image.format == "PNG":
                fmt = "PNG"
                ext = ".png"
            elif content_type == "image/webp" or image.format == "WEBP":
                fmt = "WEBP"
                ext = ".webp"

            # Create clean copy without any metadata/EXIF dictionaries
            clean_image = Image.new(image.mode, image.size)
            clean_image.paste(image)


            # If RGBA and saving as JPEG, convert to RGB
            if fmt == "JPEG" and clean_image.mode in ("RGBA", "P"):
                clean_image = clean_image.convert("RGB")

            safe_filename = f"{uuid.uuid4().hex}{ext}"
            file_path = os.path.join(STORAGE_DIR, safe_filename)

            clean_image.save(file_path, format=fmt, quality=88, optimize=True)
            return safe_filename, file_path

        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(status_code=400, detail=f"Unable to process or sanitize uploaded image: {str(e)}")

    @staticmethod
    def generate_ticket_number() -> str:
        date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
        rand_suffix = uuid.uuid4().hex[:6].upper()
        return f"DSP-{date_str}-{rand_suffix}"

    @staticmethod
    def create_dispute(
        db: Session,
        citizen_id: str,
        category: str,
        description: str,
        weighment_id: Optional[str] = None,
        photo_bytes: Optional[bytes] = None,
        photo_filename: Optional[str] = None,
        photo_content_type: Optional[str] = None,
    ) -> DisputeTicket:
        citizen = db.query(User).filter(User.id == citizen_id).first()
        if not citizen:
            raise HTTPException(status_code=404, detail="Citizen account not found.")

        ward_id = citizen.profile.ward_id if citizen.profile else None

        weighment = None
        if weighment_id:
            weighment = db.query(WasteEntry).filter(
                WasteEntry.id == weighment_id,
                WasteEntry.user_id == citizen_id
            ).first()
            if not weighment:
                raise HTTPException(status_code=404, detail="Collection weighment record not found or does not belong to citizen.")
            
            ward_id = weighment.ward_id

            # 7-day dispute window check
            now = datetime.now(timezone.utc)
            coll_date = weighment.collection_date
            if coll_date.tzinfo is None:
                coll_date = coll_date.replace(tzinfo=timezone.utc)
            if (now - coll_date).total_seconds() > (7 * 86400):
                raise HTTPException(
                    status_code=400,
                    detail="Dispute window expired. Weighments cannot be disputed after 7 days from collection."
                )

            weighment.dispute_status = "DISPUTED"

        if not ward_id:
            raise HTTPException(status_code=400, detail="Ward identification required to file dispute.")

        stored_filename = None
        stored_path = None
        if photo_bytes and photo_content_type:
            stored_filename, stored_path = DisputeService.strip_exif_and_save_photo(
                photo_bytes, photo_filename or "upload.jpg", photo_content_type
            )

        ticket_number = DisputeService.generate_ticket_number()
        retention_until = datetime.now(timezone.utc) + timedelta(days=90)

        dispute = DisputeTicket(
            ticket_number=ticket_number,
            citizen_id=citizen_id,
            weighment_id=weighment_id,
            ward_id=ward_id,
            category=category,
            description=description.strip(),
            photo_path=stored_filename, # Store filename relative to STORAGE_DIR
            photo_filename=photo_filename,
            photo_content_type=photo_content_type,
            status="OPEN",
            retention_until=retention_until,
        )
        db.add(dispute)
        db.flush()

        # Audit entry
        audit = AuditLog(
            actor_id=citizen_id,
            actor_role="CITIZEN",
            action="DISPUTE_FILED",
            affected_entity_type="DisputeTicket",
            affected_entity_id=dispute.id,
            diff=f"Citizen filed dispute {ticket_number} for category {category}",
        )
        db.add(audit)


        # Notify citizen
        NotificationService.dispatch_notification(
            db=db,
            user=citizen,
            category="TICKET_UPDATE",
            title_key="notif.dispute_registered",
            message_key="notif.dispute_registered_desc",
            rendered_title=f"Dispute Ticket Registered ({ticket_number})",
            rendered_body=f"Your dispute regarding {category.replace('_', ' ').title()} has been registered. Our municipal supervisor team will inspect this within 48 hours.",
        )

        db.commit()

        db.refresh(dispute)
        return dispute

    @staticmethod
    def auto_confirm_expired_weighments(db: Session) -> int:
        """
        7-day weighment auto-confirmation rule:
        Weighments with status PENDING_CONFIRMATION older than 7 days transition to CONFIRMED.
        """
        cutoff = datetime.now(timezone.utc) - timedelta(days=7)
        pending_entries = db.query(WasteEntry).filter(
            WasteEntry.dispute_status == "PENDING_CONFIRMATION",
            WasteEntry.collection_date <= cutoff
        ).all()

        count = len(pending_entries)
        now = datetime.now(timezone.utc)
        for entry in pending_entries:
            entry.dispute_status = "CONFIRMED"
            entry.confirmation_date = now

        if count > 0:
            db.commit()
        return count

    @staticmethod
    def resolve_dispute(
        db: Session,
        dispute_id: str,
        decision: str, # UPHOLD, REJECT, REQUEST_INFO
        resolution_notes: str,
        admin_user: User,
        points_adjustment: float = 0.0,
    ) -> DisputeTicket:
        dispute = db.query(DisputeTicket).filter(DisputeTicket.id == dispute_id).first()
        if not dispute:
            raise HTTPException(status_code=404, detail="Dispute ticket not found.")

        now = datetime.now(timezone.utc)
        norm_decision = decision.strip().upper()

        if norm_decision == "UPHOLD":
            dispute.status = "RESOLVED_UPHELD"
            dispute.resolved_at = now
            dispute.resolved_by_id = admin_user.id
            dispute.resolution_notes = resolution_notes
            dispute.points_adjustment = points_adjustment

            # If points adjustment is required, insert append-only reversing CreditTransaction
            if points_adjustment != 0.0:
                reversal_tx = CreditTransaction(
                    user_id=dispute.citizen_id,
                    waste_entry_id=dispute.weighment_id,
                    credits_amount=points_adjustment,
                    calculation_formula=f"Dispute {dispute.ticket_number} upheld: {points_adjustment:+.1f} points adjustment ({resolution_notes[:40]}...)",
                    is_reversal=True,
                    reversal_of_id=dispute.weighment.credit_transactions[0].id if dispute.weighment and dispute.weighment.credit_transactions else None,
                )
                db.add(reversal_tx)
                db.flush()
                dispute.reversal_transaction_id = reversal_tx.id

            if dispute.weighment:
                dispute.weighment.dispute_status = "RESOLVED"
                dispute.weighment.confirmation_date = now

            citizen = dispute.citizen or db.query(User).filter(User.id == dispute.citizen_id).first()
            if citizen:
                NotificationService.dispatch_notification(
                    db=db,
                    user=citizen,
                    category="CREDITS_MODIFIED" if points_adjustment != 0.0 else "TICKET_UPDATE",
                    title_key="notif.dispute_upheld",
                    message_key="notif.dispute_upheld_desc",
                    rendered_title=f"Dispute Upheld ({dispute.ticket_number})",
                    rendered_body=f"Your dispute has been upheld. {f'A points adjustment of {points_adjustment:+.1f} has been credited to your ledger.' if points_adjustment != 0.0 else 'Resolution: ' + resolution_notes}",
                )

        elif norm_decision == "REJECT":
            dispute.status = "RESOLVED_REJECTED"
            dispute.resolved_at = now
            dispute.resolved_by_id = admin_user.id
            dispute.resolution_notes = resolution_notes

            if dispute.weighment:
                dispute.weighment.dispute_status = "CONFIRMED"
                dispute.weighment.confirmation_date = now

            citizen = dispute.citizen or db.query(User).filter(User.id == dispute.citizen_id).first()
            if citizen:
                NotificationService.dispatch_notification(
                    db=db,
                    user=citizen,
                    category="TICKET_UPDATE",
                    title_key="notif.dispute_rejected",
                    message_key="notif.dispute_rejected_desc",
                    rendered_title=f"Dispute Rejected ({dispute.ticket_number})",
                    rendered_body=f"Your dispute could not be upheld. Reason: {resolution_notes}",
                )

        elif norm_decision == "REQUEST_INFO":
            dispute.status = "INFO_REQUESTED"
            dispute.resolution_notes = resolution_notes

            citizen = dispute.citizen or db.query(User).filter(User.id == dispute.citizen_id).first()
            if citizen:
                NotificationService.dispatch_notification(
                    db=db,
                    user=citizen,
                    category="TICKET_UPDATE",
                    title_key="notif.dispute_info_requested",
                    message_key="notif.dispute_info_requested_desc",
                    rendered_title=f"Action Required: Dispute ({dispute.ticket_number})",
                    rendered_body=f"Additional clarification is required for your dispute: {resolution_notes}. Please submit your response in the Disputes tab.",
                )
        else:
            raise HTTPException(status_code=400, detail=f"Invalid decision '{decision}'. Must be UPHOLD, REJECT, or REQUEST_INFO.")


        # Audit log for dispute resolution
        admin_identifier = admin_user.profile.email if admin_user.profile and admin_user.profile.email else admin_user.greenpay_id or "ADMIN"
        audit = AuditLog(
            actor_id=admin_user.id,
            actor_role=admin_user.role,
            action=f"DISPUTE_{norm_decision}",
            affected_entity_type="DisputeTicket",
            affected_entity_id=dispute.id,
            diff=f"Admin {admin_identifier} resolved dispute {dispute.ticket_number} with decision {norm_decision}. Notes: {resolution_notes}",
        )
        db.add(audit)

        db.commit()
        db.refresh(dispute)
        return dispute

    @staticmethod
    def citizen_respond_to_info(db: Session, dispute_id: str, citizen_id: str, response_text: str) -> DisputeTicket:
        dispute = db.query(DisputeTicket).filter(
            DisputeTicket.id == dispute_id,
            DisputeTicket.citizen_id == citizen_id
        ).first()
        if not dispute:
            raise HTTPException(status_code=404, detail="Dispute not found.")

        if dispute.status != "INFO_REQUESTED":
            raise HTTPException(status_code=400, detail="Dispute is not currently awaiting citizen information.")

        dispute.citizen_response = response_text.strip()
        dispute.status = "UNDER_REVIEW"

        audit = AuditLog(
            actor_id=citizen_id,
            actor_role="CITIZEN",
            action="DISPUTE_CITIZEN_RESPONDED",
            affected_entity_type="DisputeTicket",
            affected_entity_id=dispute.id,
            diff=f"Citizen responded to clarification request for dispute {dispute.ticket_number}",
        )
        db.add(audit)

        db.commit()
        db.refresh(dispute)
        return dispute

