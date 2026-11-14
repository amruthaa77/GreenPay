import os
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, UploadFile, File, Form, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc


from app.database import get_db
from app.api.deps import require_citizen, verify_csrf, get_current_user_optional
from app.core.security import decrypt_meter_number, mask_meter_number
from app.models.user import User
from app.models.waste import WasteEntry
from app.models.credit_ledger import CreditTransaction
from app.models.redemption import RedemptionTransaction
from app.schemas.redemption import (
    RedemptionItemResponse,
    RedeemRequest,
    RedemptionTransactionResponse,
)
from app.services.redemption_service import RedemptionService
from app.schemas.user import (
    UserProfileResponse,
    GreenScoreBreakdownResponse,
    UpdateEmailPreferencesRequest,
    DeleteAccountRequest
)
from app.schemas.waste import WasteEntryResponse
from app.schemas.credit import CreditTransactionResponse
from app.schemas.dry_waste import (
    CitizenPointsBalanceResponse,
    EarningHistoryItemResponse,
    DryWasteCollectionResponse,
)
from app.services.dry_waste_engine import DryWasteEngine
from app.services.green_score_engine import GreenScoreEngine
from app.services.account_service import AccountService
import json
from app.schemas.security import (
    PhoneOTPRequest,
    PhoneOTPVerifyRequest,
    NotificationResponse,
    NotificationPreferencesResponse,
    NotificationPreferencesUpdateRequest,
    NotificationPreferenceItem,
    UserSessionResponse
)
from app.models.notification import Notification, NotificationPreference
from app.models.user_session import UserSession
from app.services.phone_service import PhoneService
from app.services.notification_service import NotificationService
from app.services.security_service import SecurityService
from app.models.dispute import DisputeTicket
from app.schemas.dispute import (
    DisputeResponse,
    DisputeCreateRequest,
    CitizenDisputeResponseRequest,
    WeighmentSummary,
)
from app.services.dispute_service import DisputeService, STORAGE_DIR

router = APIRouter(prefix="/citizen", tags=["Citizen Portal"])


@router.get("/profile", response_model=UserProfileResponse)
def get_citizen_profile(current_user: User = Depends(require_citizen)):
    masked = "[MASKED]"
    if current_user.meter_number_encrypted:
        masked = mask_meter_number(decrypt_meter_number(current_user.meter_number_encrypted))
        
    profile = current_user.profile
    ward_name = profile.ward.name if profile and profile.ward else "Unassigned Ward"
    
    return UserProfileResponse(
        id=current_user.id,
        greenpay_id=current_user.greenpay_id or "GP-UNASSIGNED",
        name=profile.name if profile else "Citizen",
        masked_meter=masked,
        ward_name=ward_name,
        green_score=profile.green_score if profile else 50.0,
        status=current_user.status,
        role=current_user.role,
        email=profile.email if profile else None,
        phone_number=profile.phone_number if profile else None,
        email_marketing_opt_in=profile.email_marketing_opt_in if profile else False,
        streak_weeks=profile.streak_weeks if profile else 0
    )

@router.get("/green-score", response_model=GreenScoreBreakdownResponse)
def get_green_score_breakdown(
    current_user: User = Depends(require_citizen),
    db: Session = Depends(get_db)
):
    score_data = GreenScoreEngine.calculate_score_for_user(db, current_user)
    return GreenScoreBreakdownResponse(**score_data)

@router.get("/waste-history", response_model=List[WasteEntryResponse])
def get_waste_history(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_citizen),
    db: Session = Depends(get_db)
):
    entries = (
        db.query(WasteEntry)
        .filter(
            WasteEntry.user_id == current_user.id,
            ~WasteEntry.transaction_id.like("GP-REC-HIST-%")
        )
        .order_by(desc(WasteEntry.collection_date))
        .offset(offset)
        .limit(limit)
        .all()
    )
    
    results = []
    now = datetime.now(timezone.utc)
    for e in entries:
        credits_earned = sum(tx.credits_amount for tx in e.credit_transactions if not tx.is_reversal)
        coll_date = e.collection_date
        if coll_date.tzinfo is None:
            coll_date = coll_date.replace(tzinfo=timezone.utc)
        is_within_7_days = (now - coll_date).total_seconds() <= (7 * 86400)
        can_dispute = is_within_7_days and (e.dispute_status in ("PENDING_CONFIRMATION", None))
        
        items_data = [
            {
                "category_id": it.category_id,
                "category_code": it.category_code,
                "category_name": it.category_name,
                "rate_per_kg": it.rate_per_kg,
                "weight_kg": it.weight_kg,
                "points_earned": it.points_earned,
            }
            for it in e.collection_items
        ]

        sup_name = e.supervisor.profile.name if e.supervisor and e.supervisor.profile else "Municipal Ward Supervisor"
        ver_status = "CONFIRMED" if e.dispute_status == "CONFIRMED" else ("DISPUTED" if e.dispute_status == "DISPUTED" else "VERIFIED")

        results.append(WasteEntryResponse(
            id=e.id,
            transaction_id=e.transaction_id,
            greenpay_id=current_user.greenpay_id or "",
            citizen_name=current_user.profile.name if current_user.profile else "Citizen",
            ward_name=e.ward.name if e.ward else "Bengaluru Ward",
            wet_kg=e.wet_kg,
            dry_kg=e.dry_kg,
            hazardous_kg=e.hazardous_kg,
            ewaste_kg=e.ewaste_kg,
            total_weight_kg=e.total_weight_kg,
            journey_stage=e.journey_stage,
            collection_date=e.collection_date,
            credits_earned=credits_earned,
            notes=e.notes,
            dispute_status=e.dispute_status or "PENDING_CONFIRMATION",
            can_dispute=can_dispute,
            supervisor_name=sup_name,
            verification_status=ver_status,
            items=items_data,
        ))
    return results


@router.get("/collections", response_model=List[DryWasteCollectionResponse])
def get_citizen_collections(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_citizen),
    db: Session = Depends(get_db)
):
    """
    Returns verified dry-waste collections specific to the authenticated citizen.
    Excludes demo/aggregate ward records.
    """
    entries = (
        db.query(WasteEntry)
        .filter(
            WasteEntry.user_id == current_user.id,
            ~WasteEntry.transaction_id.like("GP-REC-HIST-%")
        )
        .order_by(desc(WasteEntry.collection_date))
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [
        DryWasteEngine._build_response(e, current_user, e.supervisor)
        for e in entries
    ]


@router.get("/collections/{transaction_id}", response_model=DryWasteCollectionResponse)
def get_citizen_collection_detail(
    transaction_id: str,
    current_user: User = Depends(require_citizen),
    db: Session = Depends(get_db)
):
    """
    Retrieves full details of a verified dry waste collection.
    Enforces strict authorization: citizens cannot access other households' collections.
    """
    clean_ref = transaction_id.strip()
    entry = (
        db.query(WasteEntry)
        .filter((WasteEntry.transaction_id == clean_ref) | (WasteEntry.id == clean_ref))
        .first()
    )
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Collection '{transaction_id}' not found."
        )
    if entry.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized access to another citizen's collection record."
        )
    return DryWasteEngine._build_response(entry, current_user, entry.supervisor)


@router.get("/credits-ledger", response_model=List[CreditTransactionResponse])
def get_credits_ledger(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_citizen),
    db: Session = Depends(get_db)
):
    """
    Returns immutable append-only ledger entries showing the transparent formula per entry.
    Chronologically computes resulting running balances and classifies transaction types.
    """
    all_transactions = (
        db.query(CreditTransaction)
        .outerjoin(WasteEntry, CreditTransaction.waste_entry_id == WasteEntry.id)
        .filter(
            CreditTransaction.user_id == current_user.id,
            (WasteEntry.id == None) | (~WasteEntry.transaction_id.like("GP-REC-HIST-%"))
        )
        .order_by(CreditTransaction.timestamp.asc())
        .all()
    )
    
    # Calculate running balance chronologically
    running = 0.0
    balance_map = {}
    type_map = {}
    ref_map = {}
    for tx in all_transactions:
        running += tx.credits_amount
        balance_map[tx.id] = round(running, 2)
        if tx.credits_amount < 0:
            type_map[tx.id] = "GROCERY_REDEMPTION"
            ref_map[tx.id] = f"GP-RED-{tx.id[:8].upper()}"
        elif tx.is_reversal:
            type_map[tx.id] = "REVERSAL"
            ref_map[tx.id] = f"GP-REV-{tx.id[:8].upper()}"
        else:
            type_map[tx.id] = "COLLECTION_CREDIT"
            ref_map[tx.id] = tx.waste_entry.transaction_id if tx.waste_entry else f"GP-AWD-{tx.id[:8].upper()}"

    ordered = sorted(all_transactions, key=lambda t: t.timestamp, reverse=True)
    paged = ordered[offset : offset + limit]

    return [
        CreditTransactionResponse(
            id=tx.id,
            timestamp=tx.timestamp,
            credits_amount=tx.credits_amount,
            calculation_formula=tx.calculation_formula,
            is_reversal=tx.is_reversal,
            reversal_of_id=tx.reversal_of_id,
            schedule_version=tx.schedule_version,
            resulting_balance=balance_map.get(tx.id, round(running, 2)),
            transaction_type=type_map.get(tx.id, "COLLECTION_CREDIT"),
            reference_id=ref_map.get(tx.id, tx.id[:12].upper()),
        )
        for tx in paged
    ]

@router.patch("/email-preferences")
def update_email_preferences(
    payload: UpdateEmailPreferencesRequest,
    current_user: User = Depends(require_citizen),
    db: Session = Depends(get_db)
):
    if current_user.profile:
        current_user.profile.email_marketing_opt_in = payload.email_marketing_opt_in
        db.commit()
    return {"message": "Email preferences updated successfully.", "marketing_opt_in": payload.email_marketing_opt_in}

@router.get("/unsubscribe")
def one_click_unsubscribe(
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    from app.models.user import UserProfile
    profile = db.query(UserProfile).filter(UserProfile.unsubscribe_token == token).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unsubscribe token is invalid or has expired."
        )
    profile.email_marketing_opt_in = False
    db.commit()
    return {"message": "You have been successfully unsubscribed from all optional email digests and updates."}

@router.get("/export-data")
def export_dpdp_user_data(
    current_user: User = Depends(require_citizen),
    db: Session = Depends(get_db)
):
    """
    DPDP Act 2023 Right of Access: Exports complete machine-readable JSON dataset.
    """
    profile = current_user.profile
    entries = db.query(WasteEntry).filter(WasteEntry.user_id == current_user.id).all()
    transactions = db.query(CreditTransaction).filter(CreditTransaction.user_id == current_user.id).all()
    consents = current_user.consents
    
    decrypted_meter = None
    if current_user.meter_number_encrypted:
        decrypted_meter = decrypt_meter_number(current_user.meter_number_encrypted)
        
    return {
        "export_date": "2026-11-12",
        "user_profile": {
            "greenpay_id": current_user.greenpay_id,
            "meter_number": decrypted_meter,
            "name": profile.name if profile else None,
            "ward": profile.ward.name if profile and profile.ward else None,
            "email": profile.email if profile else None,
            "phone_number": profile.phone_number if profile else None,
            "green_score": profile.green_score if profile else None,
            "account_status": current_user.status
        },
        "consent_history": [
            {
                "type": c.consent_type,
                "version": c.consent_version,
                "granted": c.granted,
                "timestamp": c.timestamp.isoformat()
            }
            for c in consents
        ],
        "waste_collections": [
            {
                "transaction_id": e.transaction_id,
                "date": e.collection_date.isoformat(),
                "wet_kg": e.wet_kg,
                "dry_kg": e.dry_kg,
                "hazardous_kg": e.hazardous_kg,
                "ewaste_kg": e.ewaste_kg,
                "total_weight_kg": e.total_weight_kg,
                "stage": e.journey_stage
            }
            for e in entries
        ],
        "credit_ledger": [
            {
                "transaction_id": tx.id,
                "timestamp": tx.timestamp.isoformat(),
                "credits": tx.credits_amount,
                "formula": tx.calculation_formula,
                "is_reversal": tx.is_reversal
            }
            for tx in transactions
        ]
    }

@router.delete("/account")
async def delete_account(
    request: Request,
    confirmation: Optional[str] = Query(None),
    current_user: User = Depends(require_citizen),
    db: Session = Depends(get_db)
):
    confirm_text = confirmation
    if not confirm_text:
        try:
            body = await request.json()
            if isinstance(body, dict):
                confirm_text = body.get("confirmation")
        except Exception:
            pass
            
    if not confirm_text or confirm_text.strip() != "DELETE MY ACCOUNT":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirmation string must match 'DELETE MY ACCOUNT' to execute erasure."
        )
        
    client_ip = request.client.host if request.client else None
    pseudonymous_id = AccountService.delete_and_pseudonymise_citizen(db, current_user, client_ip)
    
    return {
        "message": "Account successfully erased in compliance with DPDP Act 2023.",
        "pseudonymous_reference": pseudonymous_id,
        "detail": "All personal identifiers have been scrubbed. Historical municipal ledger integrity is preserved under pseudonymous reference."
    }

# --- Phone OTP Verification ---
@router.post("/phone/send-otp")
def send_phone_otp(
    payload: PhoneOTPRequest,
    current_user: User = Depends(require_citizen),
    db: Session = Depends(get_db)
):
    success, masked_phone = PhoneService.send_verification_otp(
        db=db,
        user=current_user,
        raw_phone=payload.phone_number,
        sms_consent=payload.sms_consent
    )
    return {
        "message": f"Verification code sent to {masked_phone}.",
        "masked_phone": masked_phone
    }

@router.post("/phone/verify-otp")
def verify_phone_otp(
    payload: PhoneOTPVerifyRequest,
    current_user: User = Depends(require_citizen),
    db: Session = Depends(get_db)
):
    success, prev_status = PhoneService.verify_otp(
        db=db,
        user=current_user,
        entered_otp=payload.otp
    )
    activated = (prev_status == "PENDING" and current_user.status == "ACTIVE")
    return {
        "message": "Phone number successfully verified." + (" Your account is now active!" if activated else ""),
        "account_status": current_user.status,
        "activated": activated
    }

# --- Notifications Centre ---
@router.get("/notifications", response_model=List[NotificationResponse])
def get_notifications(
    limit: int = Query(30, ge=1, le=100),
    current_user: User = Depends(require_citizen),
    db: Session = Depends(get_db)
):
    notifs = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(desc(Notification.created_at))
        .limit(limit)
        .all()
    )
    return [
        NotificationResponse(
            id=n.id,
            category=n.category,
            title_key=n.title_key,
            message_key=n.message_key,
            params=json.loads(n.params_json) if n.params_json else {},
            is_read=n.is_read,
            created_at=n.created_at
        )
        for n in notifs
    ]

@router.patch("/notifications/{notif_id}/read")
def mark_notification_read(
    notif_id: str,
    current_user: User = Depends(require_citizen),
    db: Session = Depends(get_db)
):
    notif = db.query(Notification).filter(
        Notification.id == notif_id,
        Notification.user_id == current_user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")
    notif.is_read = True
    db.commit()
    return {"message": "Notification marked as read."}

@router.post("/notifications/read-all")
def mark_all_notifications_read(
    current_user: User = Depends(require_citizen),
    db: Session = Depends(get_db)
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read."}

@router.get("/notification-preferences", response_model=NotificationPreferencesResponse)
def get_notification_preferences(
    current_user: User = Depends(require_citizen),
    db: Session = Depends(get_db)
):
    prefs = NotificationService.get_user_preferences(db, current_user.id)
    return NotificationPreferencesResponse(
        preferences={k: NotificationPreferenceItem(**v) for k, v in prefs.items()}
    )

@router.patch("/notification-preferences")
def update_notification_preferences(
    payload: NotificationPreferencesUpdateRequest,
    current_user: User = Depends(require_citizen),
    db: Session = Depends(get_db)
):
    for cat, item in payload.preferences.items():
        pref = db.query(NotificationPreference).filter(
            NotificationPreference.user_id == current_user.id,
            NotificationPreference.category == cat
        ).first()
        if not pref:
            pref = NotificationPreference(
                user_id=current_user.id,
                category=cat,
                in_app_enabled=item.in_app,
                email_enabled=item.email,
                sms_enabled=item.sms
            )
            db.add(pref)
        else:
            pref.in_app_enabled = item.in_app
            pref.email_enabled = item.email
            pref.sms_enabled = item.sms
    db.commit()
    return {"message": "Notification preferences updated successfully."}

# --- Active Sessions ---
@router.get("/sessions", response_model=List[UserSessionResponse])
def get_citizen_sessions(
    current_user: User = Depends(require_citizen),
    db: Session = Depends(get_db)
):
    sessions = (
        db.query(UserSession)
        .filter(UserSession.user_id == current_user.id, UserSession.is_revoked == False)
        .order_by(desc(UserSession.last_active_at))
        .all()
    )
    return [
        UserSessionResponse(
            session_id=s.session_id,
            device_browser=s.device_browser,
            ip_address=s.ip_address,
            last_active_at=s.last_active_at,
            is_current=False
        )
        for s in sessions
    ]

@router.post("/sessions/{session_id}/revoke")
def revoke_citizen_session(
    session_id: str,
    current_user: User = Depends(require_citizen),
    db: Session = Depends(get_db)
):
    success = SecurityService.revoke_session(db, current_user.id, session_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or already revoked."
        )
    return {"message": "Session revoked successfully."}

# --- Disputes & Problem Reporting ---

def _format_dispute_response(dispute: DisputeTicket) -> DisputeResponse:
    weighment_summary = None
    if dispute.weighment:
        weighment_summary = WeighmentSummary(
            id=dispute.weighment.id,
            transaction_id=dispute.weighment.transaction_id,
            total_weight_kg=dispute.weighment.total_weight_kg,
            dry_kg=dispute.weighment.dry_kg,
            wet_kg=dispute.weighment.wet_kg,
            collection_date=dispute.weighment.collection_date,
            dispute_status=dispute.weighment.dispute_status,
        )
    return DisputeResponse(
        id=dispute.id,
        ticket_number=dispute.ticket_number,
        citizen_id=dispute.citizen_id,
        weighment_id=dispute.weighment_id,
        ward_id=dispute.ward_id,
        category=dispute.category,
        description=dispute.description,
        has_photo=bool(dispute.photo_path),
        photo_filename=dispute.photo_filename,
        status=dispute.status,
        retention_until=dispute.retention_until,
        created_at=dispute.created_at,
        updated_at=dispute.updated_at,
        resolved_at=dispute.resolved_at,
        resolved_by_id=dispute.resolved_by_id,
        resolution_notes=dispute.resolution_notes,
        points_adjustment=dispute.points_adjustment or 0.0,
        reversal_transaction_id=dispute.reversal_transaction_id,
        citizen_response=dispute.citizen_response,
        weighment=weighment_summary,
    )

@router.post("/disputes", response_model=DisputeResponse)
async def create_citizen_dispute(
    category: str = Form(...),
    description: str = Form(...),
    weighment_id: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    current_user: User = Depends(require_citizen),
    db: Session = Depends(get_db)
):
    photo_bytes = None
    photo_filename = None
    photo_content_type = None
    if photo and photo.filename:
        photo_bytes = await photo.read()
        photo_filename = photo.filename
        photo_content_type = photo.content_type

    dispute = DisputeService.create_dispute(
        db=db,
        citizen_id=current_user.id,
        category=category,
        description=description,
        weighment_id=weighment_id if weighment_id and weighment_id.strip() else None,
        photo_bytes=photo_bytes,
        photo_filename=photo_filename,
        photo_content_type=photo_content_type
    )
    return _format_dispute_response(dispute)

@router.post("/disputes/json", response_model=DisputeResponse)
def create_citizen_dispute_json(
    payload: DisputeCreateRequest,
    current_user: User = Depends(require_citizen),
    db: Session = Depends(get_db)
):
    dispute = DisputeService.create_dispute(
        db=db,
        citizen_id=current_user.id,
        category=payload.category,
        description=payload.description,
        weighment_id=payload.weighment_id,
    )
    return _format_dispute_response(dispute)

@router.get("/disputes", response_model=List[DisputeResponse])
def get_citizen_disputes(
    current_user: User = Depends(require_citizen),
    db: Session = Depends(get_db)
):
    disputes = (
        db.query(DisputeTicket)
        .filter(DisputeTicket.citizen_id == current_user.id)
        .order_by(desc(DisputeTicket.created_at))
        .all()
    )
    return [_format_dispute_response(d) for d in disputes]

@router.get("/disputes/{dispute_id}", response_model=DisputeResponse)
def get_citizen_dispute_detail(
    dispute_id: str,
    current_user: User = Depends(require_citizen),
    db: Session = Depends(get_db)
):
    dispute = db.query(DisputeTicket).filter(
        DisputeTicket.id == dispute_id,
        DisputeTicket.citizen_id == current_user.id
    ).first()
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute ticket not found.")
    return _format_dispute_response(dispute)

@router.get("/disputes/{dispute_id}/photo")
def get_citizen_dispute_photo(
    dispute_id: str,
    current_user: User = Depends(require_citizen),
    db: Session = Depends(get_db)
):
    dispute = db.query(DisputeTicket).filter(
        DisputeTicket.id == dispute_id,
        DisputeTicket.citizen_id == current_user.id
    ).first()
    if not dispute or not dispute.photo_path:
        raise HTTPException(status_code=404, detail="Photo attachment not found.")
    full_path = os.path.join(STORAGE_DIR, dispute.photo_path)
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="Photo file not found on server.")
    return FileResponse(full_path, media_type=dispute.photo_content_type or "image/jpeg")

@router.post("/disputes/{dispute_id}/respond", response_model=DisputeResponse)
def citizen_respond_to_dispute(
    dispute_id: str,
    payload: CitizenDisputeResponseRequest,
    current_user: User = Depends(require_citizen),
    db: Session = Depends(get_db)
):
    dispute = DisputeService.citizen_respond_to_info(
        db=db,
        dispute_id=dispute_id,
        citizen_id=current_user.id,
        response_text=payload.response_text
    )
    return _format_dispute_response(dispute)


# ==============================================================================
# Phase C: Ward Collection Schedules & Calendar Export
# ==============================================================================

@router.get("/schedule")
def get_citizen_schedule(
    current_user: User = Depends(require_citizen),
    db: Session = Depends(get_db)
):
    """
    Returns the citizen's ward collection schedule, next pickup countdown,
    14-day upcoming pickups, and holiday/weather overrides.
    """
    from app.services.schedule_service import ScheduleService
    return ScheduleService.get_citizen_schedule_overview(db, current_user)


@router.get("/schedule/export-ics")
def export_citizen_schedule_ics(
    current_user: User = Depends(require_citizen),
    db: Session = Depends(get_db)
):
    """
    Exports clean RFC 5545 iCalendar (.ics) format file for calendar subscriptions.
    Pure server generation with zero external services.
    """
    from app.services.schedule_service import ScheduleService
    from fastapi.responses import Response

    ward_id = None
    ward_slug = "bengaluru"
    if current_user.profile and current_user.profile.ward:
        ward_id = current_user.profile.ward.id
        ward_slug = current_user.profile.ward.name.lower().replace(" ", "-")
    else:
        from app.models.ward import Ward
        first_ward = db.query(Ward).first()
        if first_ward:
            ward_id = first_ward.id
            ward_slug = first_ward.name.lower().replace(" ", "-")

    if not ward_id:
        raise HTTPException(status_code=404, detail="No ward schedule available.")

    ics_content = ScheduleService.generate_ical_calendar(db, ward_id)
    headers = {
        "Content-Disposition": f'attachment; filename="greenpay-{ward_slug}-schedule.ics"',
        "Cache-Control": "no-cache"
    }
    return Response(
        content=ics_content,
        media_type="text/calendar; charset=utf-8",
        headers=headers
    )


# ==============================================================================
# Phase D: Credit Redemption (Non-Monetary Points Model)
# ==============================================================================

@router.get("/redemptions/catalogue")
def get_redemption_catalogue(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Returns non-monetary grocery redemption catalogue items and citizen's available balance.
    Points NOT money. No cash, no bank integration.
    Supports authenticated citizens (returning individual balance) and unauthenticated public visitors (balance=0).
    """
    current_user = get_current_user_optional(request, db)
    items = RedemptionService.get_catalogue(db)
    balance = RedemptionService.get_citizen_balance(db, current_user.id) if current_user else 0.0
    return {
        "balance": round(balance, 1),
        "items": [RedemptionItemResponse.model_validate(it) for it in items]
    }


@router.post("/redemptions", response_model=RedemptionTransactionResponse)
def redeem_credit_item(
    payload: RedeemRequest,
    current_user: User = Depends(require_citizen),
    _csrf: bool = Depends(verify_csrf),
    db: Session = Depends(get_db)
):
    """
    Redeems civic points for Certificate, Ward Clean-Up donation, or Partner coupon.
    Enforces non-negative balance and appends negative transaction to ledger.
    """
    tx = RedemptionService.redeem_item(
        db=db,
        user=current_user,
        item_id=payload.item_id,
        custom_amount=payload.custom_amount,
        donor_name=payload.donor_name,
        idempotency_key=payload.idempotency_key
    )
    return RedemptionTransactionResponse.model_validate(tx)


@router.get("/redemptions/history", response_model=List[RedemptionTransactionResponse])
def get_redemption_history(
    current_user: User = Depends(require_citizen),
    db: Session = Depends(get_db)
):
    """
    Returns citizen's past redemptions.
    """
    redemptions = RedemptionService.get_citizen_redemptions(db, current_user.id)
    return [RedemptionTransactionResponse.model_validate(r) for r in redemptions]


@router.get("/redemptions/certificate/{certificate_number}/pdf")
def download_certificate_pdf(
    certificate_number: str,
    current_user: User = Depends(require_citizen),
    db: Session = Depends(get_db)
):
    """
    Generates and streams the verified Green Household Certificate PDF.
    """
    tx = db.query(RedemptionTransaction).filter(
        RedemptionTransaction.certificate_number == certificate_number,
        RedemptionTransaction.user_id == current_user.id
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Certificate not found.")

    profile = current_user.profile
    citizen_name = profile.name if profile and profile.name else "Civic Citizen"
    ward_name = profile.ward.name if profile and profile.ward else "Bengaluru"
    zone = profile.ward.zone if profile and profile.ward else "South Zone"
    green_score = profile.green_score if profile else 75.0

    pdf_bytes = RedemptionService.generate_certificate_pdf(
        transaction=tx,
        citizen_name=citizen_name,
        ward_name=ward_name,
        zone=zone,
        green_score=green_score
    )

    headers = {
        "Content-Disposition": f'inline; filename="{certificate_number}.pdf"',
        "Cache-Control": "no-cache"
    }
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers=headers
    )


@router.get("/redemptions/ward-funds")
def get_ward_cleanup_funds(
    current_user: User = Depends(require_citizen),
    db: Session = Depends(get_db)
):
    """
    Returns aggregate Ward Clean-Up Fund credit pool balances.
    """
    return RedemptionService.get_ward_cleanup_pools(db)


@router.get("/points-balance", response_model=CitizenPointsBalanceResponse)
def get_citizen_points_balance(
    current_user: User = Depends(require_citizen),
    db: Session = Depends(get_db)
):
    """
    Retrieves the authentic household Green Points balance, total earned, total redeemed,
    and collection counts computed strictly from the immutable append-only ledger.
    """
    return DryWasteEngine.get_household_points_balance(db, current_user.id)


@router.get("/earning-history", response_model=List[EarningHistoryItemResponse])
def get_citizen_earning_history(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_citizen),
    db: Session = Depends(get_db)
):
    """
    Retrieves the citizen's itemized earning transactions with category breakdown.
    """
    return DryWasteEngine.get_earning_history(
        db,
        user_id=current_user.id,
        limit=limit,
        offset=offset
    )



