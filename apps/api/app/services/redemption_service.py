import io
import json
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException
import qrcode
from reportlab.lib.pagesizes import letter, landscape
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.lib import colors

from app.models.redemption import RedemptionItem, PartnerCoupon, RedemptionTransaction
from app.models.credit_ledger import CreditTransaction
from app.models.waste import WasteEntry
from app.models.user import User
from app.models.ward import Ward
from app.models.audit import AuditLog
from app.models.notification import Notification
from app.core.config import settings


class RedemptionService:
    @staticmethod
    def get_catalogue(db: Session) -> List[RedemptionItem]:
        """Returns all active grocery redemption items with current stock."""
        return (
            db.query(RedemptionItem)
            .filter(RedemptionItem.is_active == True, RedemptionItem.item_type == "GROCERY")
            .all()
        )

    @staticmethod
    def get_citizen_balance(db: Session, user_id: str) -> float:
        """
        Calculates total available Green Points balance for citizen.
        Strictly points, not money. Excludes any demo or ward-level aggregate records.
        """
        transactions = (
            db.query(CreditTransaction)
            .outerjoin(WasteEntry, CreditTransaction.waste_entry_id == WasteEntry.id)
            .filter(
                CreditTransaction.user_id == user_id,
                (WasteEntry.id == None) | (~WasteEntry.transaction_id.like("GP-REC-HIST-%"))
            )
            .all()
        )
        return sum(tx.credits_amount for tx in transactions)

    @staticmethod
    def redeem_item(
        db: Session,
        user: User,
        item_id: str,
        custom_amount: Optional[float] = None,
        donor_name: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> RedemptionTransaction:
        """
        Processes non-monetary credit redemption with idempotency and append-only ledger entries.
        Enforces:
        - Non-negative balance constraint (cannot redeem if balance < cost)
        - Pending account constraint (must be active)
        - Available coupon inventory
        """
        # 1. Check idempotency key to prevent double charging
        if idempotency_key:
            existing_tx = (
                db.query(RedemptionTransaction)
                .filter(
                    RedemptionTransaction.user_id == user.id,
                    RedemptionTransaction.idempotency_key == idempotency_key,
                )
                .first()
            )
            if existing_tx:
                existing_tx.citizen_name = user.profile.name if user.profile else "Citizen"
                existing_tx.citizen_greenpay_id = user.greenpay_id or "GP-CITIZEN"
                return existing_tx

        # 2. Citizen status verification (Amendment #3)
        if user.status == "PENDING":
            raise HTTPException(
                status_code=400,
                detail="Your account is pending doorstep supervisor verification. Credits cannot be redeemed until confirmed.",
            )

        # 3. Fetch redemption item with lock if supported
        query = db.query(RedemptionItem).filter(RedemptionItem.id == item_id, RedemptionItem.is_active == True)
        if db.bind and db.bind.dialect.name != "sqlite":
            query = query.with_for_update()
        item = query.first()
        if not item:
            raise HTTPException(status_code=404, detail="Redemption item not found or currently inactive.")

        # 4. Calculate credit cost authoritatively from database (prevent client manipulation)
        if item.item_type == "CLEANUP_DONATION":
            cost = float(custom_amount) if custom_amount and custom_amount >= 50.0 else item.credit_cost
        else:
            cost = float(item.credit_cost)

        # 5. Check citizen balance (Non-negative balance invariant)
        current_balance = RedemptionService.get_citizen_balance(db, user.id)
        if current_balance < cost:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient Green Points. Available: {current_balance:.1f} GP, required: {cost:.1f} GP.",
            )
        remaining_balance = round(current_balance - cost, 2)
        if remaining_balance < 0:
            raise HTTPException(status_code=400, detail="Redemption would result in negative Green Points balance.")

        # 6. Check stock availability
        if item.stock_remaining is not None:
            if item.stock_remaining <= 0:
                raise HTTPException(status_code=400, detail=f"'{item.title}' is currently out of stock.")
            item.stock_remaining -= 1

        # 7. Item specific logic
        cert_num = None
        cert_qr = None
        coupon_code = None
        ward_id = None
        donor_display = None
        quantity_str = item.badge_text.split("•")[0].strip() if item.badge_text else "1 unit"

        if item.item_type == "GROCERY":
            short_id = uuid.uuid4().hex[:8].upper()
            coupon_code = f"GP-GROC-2026-{short_id}"
            cert_qr = f"GROCERY-REDEEM:{coupon_code}:{item.title}:{cost:.0f}GP"

        elif item.item_type == "CERTIFICATE":
            short_id = uuid.uuid4().hex[:8].upper()
            cert_num = f"GP-CERT-2026-{short_id}"
            web_url = "http://localhost:5173"
            cert_qr = f"{web_url}/verify-certificate/{cert_num}"

        elif item.item_type == "PARTNER_COUPON":
            coupon = (
                db.query(PartnerCoupon)
                .filter(PartnerCoupon.item_id == item.id, PartnerCoupon.is_redeemed == False)
                .first()
            )
            if not coupon:
                raise HTTPException(status_code=400, detail="No available voucher codes in inventory for this partner.")
            coupon.is_redeemed = True
            coupon.redeemed_by_user_id = user.id
            coupon.redeemed_at = datetime.now(timezone.utc)
            coupon_code = coupon.coupon_code

        elif item.item_type == "CLEANUP_DONATION":
            ward_obj = user.profile.ward if user.profile else None
            if ward_obj:
                ward_obj.clean_up_fund_credits += cost
                ward_id = ward_obj.id
            donor_display = donor_name.strip() if donor_name and donor_name.strip() else (
                f"{user.profile.name.split()[0]} {user.profile.name.split()[-1][0]}."
                if user.profile and user.profile.name
                else "Civic Citizen"
            )

        # 8. Append negative transaction to immutable Credit Ledger
        ledger_entry = CreditTransaction(
            user_id=user.id,
            pseudonymous_owner=user.pseudonymous_id,
            schedule_version=1,
            credits_amount=-cost,
            calculation_formula=f"Redemption: {cost:.0f} GP spent on {item.title} ({quantity_str})",
            is_reversal=False,
        )
        db.add(ledger_entry)

        # 9. Create Redemption Transaction record with full audit snapshot
        redemption_record = RedemptionTransaction(
            user_id=user.id,
            pseudonymous_owner=user.pseudonymous_id,
            item_id=item.id,
            item_type=item.item_type,
            item_title=item.title,
            item_quantity=quantity_str,
            credits_spent=cost,
            previous_balance=round(current_balance, 2),
            remaining_balance=remaining_balance,
            status="CONFIRMED",
            idempotency_key=idempotency_key,
            certificate_number=cert_num,
            certificate_qr_data=cert_qr,
            coupon_code=coupon_code,
            ward_id=ward_id,
            donor_display_name=donor_display,
        )
        db.add(redemption_record)

        # 10. Audit Log
        db.add(
            AuditLog(
                actor_id=user.id,
                actor_role=user.role,
                action="CREDITS_REDEEMED",
                affected_entity_type="RedemptionItem",
                affected_entity_id=item.id,
                diff=json.dumps({
                    "item_title": item.title,
                    "item_quantity": quantity_str,
                    "credits_spent": cost,
                    "previous_balance": round(current_balance, 2),
                    "remaining_balance": remaining_balance,
                    "voucher_code": coupon_code or cert_num,
                    "ward_id": ward_id,
                }),
            )
        )

        # 11. In-app Notification
        db.add(
            Notification(
                user_id=user.id,
                category="CREDITS_MODIFIED",
                title_key="notifications.credits_redeemed_title",
                message_key="notifications.credits_redeemed_body",
                params_json=json.dumps({
                    "credits": f"-{cost:.0f} GP",
                    "item_title": item.title,
                }),
                is_read=False,
            )
        )

        db.commit()
        db.refresh(redemption_record)

        # Attach citizen details for receipt response
        redemption_record.citizen_name = user.profile.name if user.profile else "Citizen"
        redemption_record.citizen_greenpay_id = user.greenpay_id or "GP-CITIZEN"
        return redemption_record

    @staticmethod
    def generate_certificate_pdf(
        transaction: RedemptionTransaction,
        citizen_name: str,
        ward_name: str,
        zone: str,
        green_score: float,
    ) -> bytes:
        """
        Generates a high-resolution, landscape civic sustainability certificate PDF with
        embedded QR code linking to public verification.
        """
        buf = io.BytesIO()
        c = canvas.Canvas(buf, pagesize=landscape(letter))
        width, height = landscape(letter)

        # Outer decorative double border
        c.setStrokeColor(colors.HexColor("#166534"))
        c.setLineWidth(5)
        c.rect(24, 24, width - 48, height - 48)

        c.setStrokeColor(colors.HexColor("#22C55E"))
        c.setLineWidth(1.5)
        c.rect(32, 32, width - 64, height - 64)

        # Subtle decorative inner background panel
        c.setFillColor(colors.HexColor("#061A10"))
        c.rect(36, 36, width - 72, height - 72, fill=True, stroke=False)

        # Header Watermark / Title
        c.setFillColor(colors.HexColor("#22C55E"))
        c.setFont("Helvetica-Bold", 11)
        c.drawCentredString(width / 2, height - 70, "BENGALURU MUNICIPAL SOLID WASTE LOGISTICS PROTOTYPE")

        c.setFillColor(colors.HexColor("#86EFAC"))
        c.setFont("Helvetica", 9)
        c.drawCentredString(width / 2, height - 85, "INDEPENDENT CIVIC SUSTAINABILITY RECOGNITION (NON-COMMERCIAL)")

        # Main Certificate Title
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 26)
        c.drawCentredString(width / 2, height - 130, "CERTIFICATE OF CIVIC SUSTAINABILITY")

        c.setFillColor(colors.HexColor("#94A3B8"))
        c.setFont("Helvetica", 11)
        c.drawCentredString(width / 2, height - 155, "This distinction is awarded in recognition of verified household source segregation:")

        # Recipient Name (Prominent)
        c.setFillColor(colors.HexColor("#4ADE80"))
        c.setFont("Helvetica-Bold", 24)
        c.drawCentredString(width / 2, height - 200, citizen_name.upper())

        # Household Details
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 12)
        c.drawCentredString(width / 2, height - 230, f"Household Resident • Ward: {ward_name} ({zone} Zone)")

        # Commendation Statement
        c.setFillColor(colors.HexColor("#E2E8F0"))
        c.setFont("Helvetica", 10)
        c.drawCentredString(
            width / 2,
            height - 265,
            "For consistently maintaining verified wet, dry, and domestic hazardous segregation at doorstep weighment,",
        )
        c.drawCentredString(
            width / 2,
            height - 282,
            f"achieving an audited civic Green Score of {green_score:.1f} / 100, and zero open-burning practices.",
        )

        # Seal / Badges Area
        c.setStrokeColor(colors.HexColor("#22C55E"))
        c.setLineWidth(1)
        c.circle(width / 2, height - 340, 32, stroke=True, fill=False)
        c.setFillColor(colors.HexColor("#22C55E"))
        c.setFont("Helvetica-Bold", 8)
        c.drawCentredString(width / 2, height - 335, "VERIFIED")
        c.drawCentredString(width / 2, height - 345, "CIVIC MERIT")

        # QR Code for Public Verification (Bottom Right)
        qr_url = transaction.certificate_qr_data or f"http://localhost:5173/verify-certificate/{transaction.certificate_number}"
        qr_img = qrcode.make(qr_url)
        qr_io = io.BytesIO()
        qr_img.save(qr_io, format="PNG")
        qr_io.seek(0)
        c.drawImage(ImageReader(qr_io), width - 155, 60, width=85, height=85)

        c.setFillColor(colors.HexColor("#64748B"))
        c.setFont("Helvetica", 7)
        c.drawCentredString(width - 112, 50, "Scan to Verify Authenticity")

        # Bottom Left: Certificate Number & Issue Date
        issue_date_str = transaction.created_at.strftime("%d %B %Y")
        c.setFillColor(colors.HexColor("#94A3B8"))
        c.setFont("Helvetica", 8)
        c.drawString(60, 95, f"Certificate No: {transaction.certificate_number}")
        c.drawString(60, 80, f"Issued Date:    {issue_date_str}")
        c.drawString(60, 65, "Status:         OFFICIALLY VERIFIED • APPEND-ONLY AUDIT RECORD")

        # Disclaimer
        c.setFont("Helvetica-Oblique", 7)
        c.setFillColor(colors.HexColor("#64748B"))
        c.drawString(
            60,
            46,
            "Civic prototype recognition. Not legal tender, not monetary consideration. Non-affiliated with BBMP/GBA.",
        )

        c.save()
        buf.seek(0)
        return buf.getvalue()

    @staticmethod
    def verify_certificate_public(db: Session, certificate_number: str) -> Dict[str, Any]:
        """
        Public endpoint returning non-PII certificate verification details.
        DPDP Section 9 compliant: recipient names are masked to initials.
        """
        tx = (
            db.query(RedemptionTransaction)
            .filter(RedemptionTransaction.certificate_number == certificate_number)
            .first()
        )
        if not tx:
            raise HTTPException(status_code=404, detail="Invalid or non-existent certificate number.")

        citizen = tx.user
        profile = citizen.profile if citizen else None

        if profile and profile.name:
            parts = profile.name.split()
            first = parts[0]
            last_initial = parts[-1][0] if len(parts) > 1 else ""
            masked_name = f"{first} {last_initial}."
            ward_name = profile.ward.name if profile.ward else "Bengaluru"
            score = profile.green_score
        else:
            masked_name = "Verified Citizen"
            ward_name = "Bengaluru"
            score = 75.0

        tier = "Consistent Eco Recycler" if score >= 75 else "Active Civic Recycler"

        return {
            "certificate_number": tx.certificate_number,
            "is_valid": True,
            "issue_date": tx.created_at.strftime("%d %B %Y"),
            "masked_recipient": masked_name,
            "ward_name": ward_name,
            "sustainability_tier": f"{tier} (Score: {score:.0f}/100)",
            "status": "AUTHENTIC_CIVIC_RECORD",
            "verification_source": "BBMP Solid Waste Logistics Prototype / GreenPay",
        }

    @staticmethod
    def get_citizen_redemptions(db: Session, user_id: str) -> List[RedemptionTransaction]:
        """Returns citizen's past redemptions sorted chronologically."""
        txs = (
            db.query(RedemptionTransaction)
            .filter(RedemptionTransaction.user_id == user_id)
            .order_by(RedemptionTransaction.created_at.desc())
            .all()
        )
        for tx in txs:
            if not tx.item_title and tx.item:
                tx.item_title = tx.item.title
            if not tx.item_quantity and tx.item and tx.item.badge_text:
                tx.item_quantity = tx.item.badge_text.split("•")[0].strip()
            if tx.user:
                tx.citizen_name = tx.user.profile.name if tx.user.profile else "Citizen"
                tx.citizen_greenpay_id = tx.user.greenpay_id or "GP-CITIZEN"
        return txs

    @staticmethod
    def get_ward_cleanup_pools(db: Session) -> List[Dict[str, Any]]:
        """Returns aggregate Ward Clean-Up Fund credit balances across wards."""
        wards = db.query(Ward).order_by(Ward.name).all()
        pools = []
        for w in wards:
            donor_count = (
                db.query(RedemptionTransaction)
                .filter(RedemptionTransaction.ward_id == w.id)
                .count()
            )
            pools.append(
                {
                    "ward_id": str(w.id),
                    "ward_name": w.name,
                    "zone": w.zone,
                    "clean_up_credits_pooled": round(w.clean_up_fund_credits, 1),
                    "total_donors": donor_count,
                }
            )
        return pools
