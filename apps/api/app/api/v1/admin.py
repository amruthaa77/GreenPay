import os
import json
import secrets
import hashlib
import csv
import io
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, desc


from app.database import get_db
from app.api.deps import require_super_admin, require_supervisor, verify_csrf
from app.models.user import User, UserProfile
from app.models.admin_2fa import Admin2FA
from app.models.user_session import UserSession
from app.schemas.security import (
    Admin2FAEnrolResponse,
    Admin2FAVerifyRequest,
    Admin2FAVerifyResponse,
    UserSessionResponse
)
from app.services.security_service import SecurityService
from app.services.ward_export_service import WardExportService
from app.models.ward import Ward
from app.models.waste import WasteEntry
from app.models.redemption import RedemptionItem, PartnerCoupon, RedemptionTransaction
from app.schemas.redemption import UpdateRedemptionItemRequest
from app.models.reward_schedule import RewardSchedule
from app.models.invite import SupervisorInvite
from app.models.anomaly import AnomalyFlag
from app.models.audit import AuditLog
from app.schemas.audit import (
    SupervisorInviteCreateRequest,
    SupervisorInviteResponse,
    AuditLogResponse
)
from app.schemas.dry_waste import (
    DryWasteCategoryResponse,
    DryWasteCategoryUpdateRequest,
)
from app.services.dry_waste_engine import DryWasteEngine
from app.models.dry_waste import DryWasteCategory, DryWasteRateHistory, WasteCollectionItem
from app.models.credit_ledger import CreditTransaction
from app.core.security import hash_password, decrypt_meter_number, mask_meter_number
from app.schemas.admin_governance import (
    DryWasteRateHistoryResponse,
    AdminDashboardStatsResponse,
    CategoryStatBreakdown,
    WardStatBreakdown,
    InventoryStatBreakdown,
    SupervisorStatSummary,
    AdminCitizenListItem,
    AdminCitizenListResponse,
    AdminCitizenStatusUpdateRequest,
    AdminSupervisorCreateRequest,
    AdminSupervisorStaffIdUpdateRequest,
)
from app.schemas.credit import (
    RewardScheduleResponse,
    UpdateRewardScheduleRequest
)
from app.schemas.anomaly import (
    AnomalyFlagResponse,
    AnomalyReviewRequest
)
from app.services.predictive_service import PredictiveService
from app.services.email_service import EmailService
from app.services.audit_service import AuditService
from app.schemas.schedule import (
    ScheduleSlotCreate,
    ScheduleSlotUpdate,
    ScheduleOverrideCreate
)
from app.models.dispute import DisputeTicket
from app.schemas.dispute import DisputeResponse, DisputeResolveRequest, WeighmentSummary
from app.services.dispute_service import DisputeService, STORAGE_DIR

router = APIRouter(prefix="/admin", tags=["Super-Admin Portal"])


@router.post("/invites", response_model=SupervisorInviteResponse)
def create_supervisor_invite(
    payload: SupervisorInviteCreateRequest,
    request: Request,
    current_admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    ward = db.query(Ward).filter(Ward.name.ilike(payload.assigned_ward_name.strip())).first()
    if not ward:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ward '{payload.assigned_ward_name}' does not exist. Permitted: Koramangala, Indiranagar, Jayanagar, Whitefield."
        )
        
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=48)
    
    invite = SupervisorInvite(
        token_hash=token_hash,
        email=payload.email.strip().lower(),
        name=payload.name.strip(),
        assigned_ward_id=ward.id,
        created_by_id=current_admin.id,
        expires_at=expires_at
    )
    db.add(invite)
    
    client_ip = request.client.host if request.client else None
    AuditService.log_action(
        db,
        actor_id=current_admin.id,
        actor_role=current_admin.role,
        action="INVITE_SUPERVISOR",
        affected_entity_type="SupervisorInvite",
        affected_entity_id=invite.id,
        diff={"email": invite.email, "ward": ward.name, "expires_at": expires_at.isoformat()},
        ip_address=client_ip
    )
    db.commit()
    db.refresh(invite)
    
    invite_url = f"http://localhost:5174/accept-invite?token={raw_token}"
    EmailService.send_email(
        to_email=invite.email,
        subject="Invitation: GreenPay Bengaluru Municipal Supervisor",
        body_text=f"Hello {invite.name},\n\nYou have been invited as a Municipal Waste Supervisor for {ward.name}.\nActivate your account at: {invite_url}\nThis link expires in 48 hours.",
        category="transactional"
    )
    
    return SupervisorInviteResponse(
        id=invite.id,
        name=invite.name,
        email=invite.email,
        assigned_ward_name=ward.name,
        invite_url=invite_url,
        expires_at=invite.expires_at,
        used=invite.used
    )

@router.get("/invites", response_model=List[SupervisorInviteResponse])
def list_supervisor_invites(
    current_admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    invites = db.query(SupervisorInvite).order_by(desc(SupervisorInvite.created_at)).all()
    return [
        SupervisorInviteResponse(
            id=i.id,
            name=i.name,
            email=i.email,
            assigned_ward_name=i.assigned_ward.name if i.assigned_ward else "Ward",
            invite_url="[PROTECTED_TOKEN_ALREADY_SENT]",
            expires_at=i.expires_at,
            used=i.used
        )
        for i in invites
    ]

@router.get("/reward-schedules", response_model=List[RewardScheduleResponse])
def get_reward_schedules(
    current_admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    schedules = db.query(RewardSchedule).order_by(desc(RewardSchedule.version)).all()
    categories = db.query(DryWasteCategory).all()
    default_rates = {c.code: c.rate_per_kg for c in categories}
    
    results = []
    for s in schedules:
        parsed_rates = None
        if s.rates_json:
            try:
                parsed_rates = json.loads(s.rates_json)
            except Exception:
                parsed_rates = default_rates
        else:
            parsed_rates = default_rates

        results.append(
            RewardScheduleResponse(
                version=s.version,
                wet_rate=s.wet_rate,
                dry_rate=s.dry_rate,
                hazardous_rate=s.hazardous_rate,
                ewaste_rate=s.ewaste_rate,
                is_active=s.is_active,
                effective_from=s.effective_from,
                change_reason=s.change_reason,
                rates=parsed_rates
            )
        )
    return results

@router.post("/reward-schedules", response_model=RewardScheduleResponse)
def create_versioned_reward_schedule(
    payload: UpdateRewardScheduleRequest,
    request: Request,
    current_admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    latest = db.query(RewardSchedule).order_by(desc(RewardSchedule.version)).first()
    new_version = (latest.version + 1) if latest else 1
    
    # Deactivate older schedules
    db.query(RewardSchedule).update({RewardSchedule.is_active: False})
    
    # Process dry-waste category rates
    active_cats = db.query(DryWasteCategory).all()
    cat_rates = {}
    
    if payload.rates:
        for cat in active_cats:
            submitted_rate = payload.rates.get(cat.code) or payload.rates.get(cat.name) or payload.rates.get(cat.id)
            if submitted_rate is not None:
                new_rate_val = float(submitted_rate)
                if new_rate_val <= 0:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Rate for '{cat.name}' must be greater than 0 GP/kg."
                    )
                if new_rate_val != cat.rate_per_kg:
                    # Record history snapshot in dry_waste_rate_history
                    history = DryWasteRateHistory(
                        category_id=cat.id,
                        previous_rate=cat.rate_per_kg,
                        new_rate=new_rate_val,
                        changed_by_id=current_admin.id,
                        change_reason=payload.change_reason,
                    )
                    db.add(history)
                    cat.rate_per_kg = new_rate_val
            cat_rates[cat.code] = cat.rate_per_kg
    else:
        cat_rates = {c.code: c.rate_per_kg for c in active_cats}
        
    rates_json_str = json.dumps(cat_rates)
    
    new_schedule = RewardSchedule(
        version=new_version,
        wet_rate=payload.wet_rate or 0.0,
        dry_rate=payload.dry_rate or 0.0,
        hazardous_rate=payload.hazardous_rate or 0.0,
        ewaste_rate=payload.ewaste_rate or 0.0,
        rates_json=rates_json_str,
        is_active=True,
        created_by_id=current_admin.id,
        change_reason=payload.change_reason
    )
    db.add(new_schedule)
    
    client_ip = request.client.host if request.client else None
    AuditService.log_action(
        db,
        actor_id=current_admin.id,
        actor_role=current_admin.role,
        action="UPDATE_REWARD_SCHEDULE",
        affected_entity_type="RewardSchedule",
        affected_entity_id=new_schedule.id,
        diff={
            "version": new_version,
            "dry_waste_rates": cat_rates,
            "reason": payload.change_reason
        },
        ip_address=client_ip
    )
    db.commit()
    db.refresh(new_schedule)
    
    return RewardScheduleResponse(
        version=new_schedule.version,
        wet_rate=new_schedule.wet_rate,
        dry_rate=new_schedule.dry_rate,
        hazardous_rate=new_schedule.hazardous_rate,
        ewaste_rate=new_schedule.ewaste_rate,
        is_active=new_schedule.is_active,
        effective_from=new_schedule.effective_from,
        change_reason=new_schedule.change_reason,
        rates=cat_rates
    )

@router.get("/analytics/wards")
def get_ward_analytics(
    current_admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Returns comparative ward performance. Labelled clearly as demo data.
    """
    wards = db.query(Ward).all()
    results = []
    
    for w in wards:
        entries = db.query(WasteEntry).filter(WasteEntry.ward_id == w.id).all()
        total_kg = sum(e.total_weight_kg for e in entries)
        dry_kg = sum(e.dry_kg for e in entries)
        wet_kg = sum(e.wet_kg for e in entries)
        hazardous_kg = sum(e.hazardous_kg for e in entries)
        ewaste_kg = sum(e.ewaste_kg for e in entries)
        
        segregation_ratio = round((dry_kg + ewaste_kg) / total_kg * 100, 1) if total_kg > 0 else 0.0
        citizen_count = db.query(UserProfile).filter(UserProfile.ward_id == w.id).count()
        
        results.append({
            "ward_id": str(w.id),
            "id": str(w.id),
            "ward_name": w.name,
            "zone": w.zone,
            "is_demo_data": True,
            "total_collected_kg": round(total_kg, 1),
            "wet_kg": round(wet_kg, 1),
            "dry_kg": round(dry_kg, 1),
            "hazardous_kg": round(hazardous_kg, 1),
            "ewaste_kg": round(ewaste_kg, 1),
            "segregation_percentage": segregation_ratio,
            "active_citizens": citizen_count,
            "collection_count": len(entries)
        })
        
    return {
        "wards": results,
        "disclaimer": "All ward metrics are generated from realistic Bengaluru municipal demo data."
    }

@router.get("/anomalies", response_model=List[AnomalyFlagResponse])
def get_anomalies_queue(
    status_filter: Optional[str] = Query(None),
    current_admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    query = db.query(AnomalyFlag).order_by(desc(AnomalyFlag.timestamp))
    if status_filter:
        query = query.filter(AnomalyFlag.status == status_filter.upper())
        
    flags = query.all()
    results = []
    for f in flags:
        user_name = f.user.profile.name if f.user and f.user.profile else "Citizen"
        ward_name = f.waste_entry.ward.name if f.waste_entry and f.waste_entry.ward else "Ward"
        results.append(AnomalyFlagResponse(
            id=f.id,
            waste_entry_id=f.waste_entry_id,
            user_id=f.user_id,
            citizen_name=user_name,
            ward_name=ward_name,
            anomaly_type=f.anomaly_type,
            z_score_household=f.z_score_household,
            z_score_ward=f.z_score_ward,
            description=f.description,
            severity=f.severity,
            status=f.status,
            timestamp=f.timestamp,
            review_notes=f.review_notes
        ))
    return results

@router.post("/anomalies/{anomaly_id}/review", response_model=AnomalyFlagResponse)
def review_anomaly_flag(
    anomaly_id: str,
    payload: AnomalyReviewRequest,
    request: Request,
    current_admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    anomaly = db.query(AnomalyFlag).filter(AnomalyFlag.id == anomaly_id).first()
    if not anomaly:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Anomaly flag record not found.")
        
    new_status = payload.status.upper()
    if new_status not in ("VERIFIED_LEGITIMATE", "DISMISSED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status must be 'VERIFIED_LEGITIMATE' or 'DISMISSED'."
        )
        
    anomaly.status = new_status
    anomaly.review_notes = payload.review_notes
    anomaly.reviewed_by_id = current_admin.id
    
    client_ip = request.client.host if request.client else None
    AuditService.log_action(
        db,
        actor_id=current_admin.id,
        actor_role=current_admin.role,
        action="REVIEW_ANOMALY",
        affected_entity_type="AnomalyFlag",
        affected_entity_id=anomaly.id,
        diff={"new_status": new_status, "notes": payload.review_notes},
        ip_address=client_ip
    )
    db.commit()
    db.refresh(anomaly)
    
    user_name = anomaly.user.profile.name if anomaly.user and anomaly.user.profile else "Citizen"
    ward_name = anomaly.waste_entry.ward.name if anomaly.waste_entry and anomaly.waste_entry.ward else "Ward"
    
    return AnomalyFlagResponse(
        id=anomaly.id,
        waste_entry_id=anomaly.waste_entry_id,
        user_id=anomaly.user_id,
        citizen_name=user_name,
        ward_name=ward_name,
        anomaly_type=anomaly.anomaly_type,
        z_score_household=anomaly.z_score_household,
        z_score_ward=anomaly.z_score_ward,
        description=anomaly.description,
        severity=anomaly.severity,
        status=anomaly.status,
        timestamp=anomaly.timestamp,
        review_notes=anomaly.review_notes
    )

@router.get("/forecast")
def get_predictive_forecast(
    ward_name: Optional[str] = Query(None),
    current_admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    ward_id = None
    if ward_name:
        ward = db.query(Ward).filter(Ward.name.ilike(ward_name.strip())).first()
        if ward:
            ward_id = ward.id
            
    return PredictiveService.generate_waste_forecast(db, ward_id)

@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    logs = db.query(AuditLog).order_by(desc(AuditLog.timestamp)).offset(offset).limit(limit).all()
    return [
        AuditLogResponse(
            id=log.id,
            actor_id=log.actor_id,
            actor_role=log.actor_role,
            action=log.action,
            affected_entity_type=log.affected_entity_type,
            affected_entity_id=log.affected_entity_id,
            diff=log.diff,
            ip_address=log.ip_address,
            timestamp=log.timestamp
        )
        for log in logs
    ]

# --- Admin 2FA Management ---
@router.post("/2fa/enrol", response_model=Admin2FAEnrolResponse)
def enrol_admin_2fa(
    current_admin: User = Depends(require_supervisor),
    db: Session = Depends(get_db)
):
    admin_2fa = db.query(Admin2FA).filter(Admin2FA.user_id == current_admin.id).first()
    if admin_2fa and admin_2fa.is_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Two-factor authentication is already active on this account."
        )
        
    secret = SecurityService.generate_2fa_secret()
    email = current_admin.profile.email if current_admin.profile and current_admin.profile.email else f"admin_{current_admin.id[:8]}@greenpay.local"
    otpauth_url = SecurityService.get_totp_uri(secret, email)
    
    if not admin_2fa:
        admin_2fa = Admin2FA(
            user_id=current_admin.id,
            totp_secret=secret,
            is_enabled=False
        )
        db.add(admin_2fa)
    else:
        admin_2fa.totp_secret = secret
        admin_2fa.is_enabled = False
        
    db.commit()
    return Admin2FAEnrolResponse(secret=secret, otpauth_url=otpauth_url)

@router.post("/2fa/verify", response_model=Admin2FAVerifyResponse)
def verify_and_enable_admin_2fa(
    payload: Admin2FAVerifyRequest,
    request: Request,
    current_admin: User = Depends(require_supervisor),
    db: Session = Depends(get_db)
):
    admin_2fa = db.query(Admin2FA).filter(Admin2FA.user_id == current_admin.id).first()
    if not admin_2fa or not admin_2fa.totp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA enrolment has not been initiated. Please start enrolment first."
        )
        
    if not SecurityService.verify_totp(admin_2fa.totp_secret, payload.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid 6-digit verification code. Please check your authenticator clock."
        )
        
    plain_codes, hashed_json = SecurityService.generate_recovery_codes(10)
    admin_2fa.is_enabled = True
    admin_2fa.recovery_codes_hashed = hashed_json
    admin_2fa.enrolled_at = datetime.now(timezone.utc)
    
    client_ip = request.client.host if request.client else None
    AuditService.log_action(
        db,
        actor_id=current_admin.id,
        actor_role=current_admin.role,
        action="ENABLE_2FA",
        affected_entity_type="Admin2FA",
        affected_entity_id=admin_2fa.id,
        diff={"enrolled": True},
        ip_address=client_ip
    )
    db.commit()
    
    return Admin2FAVerifyResponse(is_enabled=True, recovery_codes=plain_codes)

@router.get("/2fa/status")
def get_admin_2fa_status(
    current_admin: User = Depends(require_supervisor),
    db: Session = Depends(get_db)
):
    admin_2fa = db.query(Admin2FA).filter(Admin2FA.user_id == current_admin.id).first()
    return {
        "is_enabled": admin_2fa.is_enabled if admin_2fa else False,
        "enrolled_at": admin_2fa.enrolled_at if admin_2fa else None
    }

@router.post("/2fa/disable")
def disable_admin_2fa(
    request: Request,
    current_admin: User = Depends(require_supervisor),
    db: Session = Depends(get_db)
):
    admin_2fa = db.query(Admin2FA).filter(Admin2FA.user_id == current_admin.id).first()
    if not admin_2fa or not admin_2fa.is_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Two-factor authentication is not active on this account."
        )
        
    admin_2fa.is_enabled = False
    admin_2fa.totp_secret = None
    admin_2fa.recovery_codes_hashed = None
    
    client_ip = request.client.host if request.client else None
    AuditService.log_action(
        db,
        actor_id=current_admin.id,
        actor_role=current_admin.role,
        action="DISABLE_2FA",
        affected_entity_type="Admin2FA",
        affected_entity_id=admin_2fa.id,
        diff={"enrolled": False},
        ip_address=client_ip
    )
    db.commit()
    return {"message": "Two-factor authentication has been disabled."}

# --- Active Sessions Management ---
@router.get("/sessions", response_model=List[UserSessionResponse])
def get_admin_sessions(
    current_admin: User = Depends(require_supervisor),
    db: Session = Depends(get_db)
):
    sessions = (
        db.query(UserSession)
        .filter(UserSession.user_id == current_admin.id, UserSession.is_revoked == False)
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
def revoke_admin_session(
    session_id: str,
    current_admin: User = Depends(require_supervisor),
    db: Session = Depends(get_db)
):
    success = SecurityService.revoke_session(db, current_admin.id, session_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or already revoked."
        )
    return {"message": "Session revoked successfully."}

@router.post("/sessions/revoke-all")
def revoke_all_admin_sessions(
    current_admin: User = Depends(require_supervisor),
    db: Session = Depends(get_db)
):
    SecurityService.revoke_all_user_sessions(db, current_admin.id)
    return {"message": "All active sessions have been revoked."}

# --- Disputes & Municipal Ticket Queue ---

def _format_admin_dispute_response(dispute: DisputeTicket) -> DisputeResponse:
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

@router.get("/disputes", response_model=List[DisputeResponse])
def get_admin_disputes(
    ward_id: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_admin: User = Depends(require_supervisor),
    db: Session = Depends(get_db)
):
    query = db.query(DisputeTicket)
    if ward_id:
        query = query.filter(DisputeTicket.ward_id == ward_id)
    if category:
        query = query.filter(DisputeTicket.category == category)
    if status:
        query = query.filter(DisputeTicket.status == status)

    disputes = query.order_by(desc(DisputeTicket.created_at)).offset(offset).limit(limit).all()
    return [_format_admin_dispute_response(d) for d in disputes]

@router.get("/disputes/{dispute_id}", response_model=DisputeResponse)
def get_admin_dispute_detail(
    dispute_id: str,
    current_admin: User = Depends(require_supervisor),
    db: Session = Depends(get_db)
):
    dispute = db.query(DisputeTicket).filter(DisputeTicket.id == dispute_id).first()
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute ticket not found.")
    return _format_admin_dispute_response(dispute)

@router.get("/disputes/{dispute_id}/photo")
def get_admin_dispute_photo(
    dispute_id: str,
    current_admin: User = Depends(require_supervisor),
    db: Session = Depends(get_db)
):
    dispute = db.query(DisputeTicket).filter(DisputeTicket.id == dispute_id).first()
    if not dispute or not dispute.photo_path:
        raise HTTPException(status_code=404, detail="Photo attachment not found.")
    full_path = os.path.join(STORAGE_DIR, dispute.photo_path)
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="Photo file not found on server.")
    return FileResponse(full_path, media_type=dispute.photo_content_type or "image/jpeg")

@router.post("/disputes/{dispute_id}/resolve", response_model=DisputeResponse)
def resolve_admin_dispute(
    dispute_id: str,
    payload: DisputeResolveRequest,
    current_admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    dispute = DisputeService.resolve_dispute(
        db=db,
        dispute_id=dispute_id,
        decision=payload.decision,
        resolution_notes=payload.resolution_notes,
        admin_user=current_admin,
        points_adjustment=payload.points_adjustment,
    )
    return _format_admin_dispute_response(dispute)

@router.post("/disputes/auto-confirm")
def trigger_auto_confirm_weighments(
    current_admin: User = Depends(require_supervisor),
    db: Session = Depends(get_db)
):
    confirmed_count = DisputeService.auto_confirm_expired_weighments(db)
    return {"message": f"Auto-confirmation complete. {confirmed_count} weighment entries confirmed."}


# ==============================================================================
# Phase C: Ward Collection Schedules & Overrides Administration
# ==============================================================================

@router.get("/wards")
def list_wards(
    current_admin: User = Depends(require_supervisor),
    db: Session = Depends(get_db)
):
    """
    Returns list of all active Bengaluru wards with IDs.
    """
    wards = db.query(Ward).order_by(Ward.name).all()
    return [{"id": str(w.id), "ward_id": str(w.id), "name": w.name, "zone": w.zone} for w in wards]


@router.get("/wards/{ward_id}/schedules")
def get_ward_schedules_admin(
    ward_id: str,
    current_admin: User = Depends(require_supervisor),
    db: Session = Depends(get_db)
):
    """
    Returns full collection schedule and active overrides for a specific Bengaluru ward.
    """
    from app.services.schedule_service import ScheduleService
    schedules = ScheduleService.get_ward_schedules(db, ward_id)
    overrides = ScheduleService.get_ward_overrides(db, ward_id)
    ward = db.query(Ward).filter(Ward.id == ward_id).first()
    if not ward:
        raise HTTPException(status_code=404, detail="Ward not found.")

    return {
        "ward_id": ward.id,
        "ward_name": ward.name,
        "zone": ward.zone,
        "schedules": [
            {
                "id": s.id,
                "waste_type": s.waste_type,
                "day_of_week": s.day_of_week,
                "frequency": s.frequency,
                "start_time": s.start_time,
                "end_time": s.end_time,
                "vehicle_number": s.vehicle_number,
                "supervisor_name": s.supervisor_name,
                "supervisor_contact": s.supervisor_contact,
                "instructions": s.instructions,
                "is_active": s.is_active,
            }
            for s in schedules
        ],
        "overrides": [
            {
                "id": o.id,
                "override_date": o.override_date.isoformat(),
                "waste_type": o.waste_type,
                "is_cancelled": o.is_cancelled,
                "rescheduled_date": o.rescheduled_date.isoformat() if o.rescheduled_date else None,
                "rescheduled_start_time": o.rescheduled_start_time,
                "rescheduled_end_time": o.rescheduled_end_time,
                "reason": o.reason,
            }
            for o in overrides
        ]
    }


@router.post("/wards/{ward_id}/schedules")
def create_ward_schedule_slot(
    ward_id: str,
    payload: ScheduleSlotCreate,
    current_admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Creates a new recurring waste collection schedule slot for a ward with audit logging.
    """
    from app.services.schedule_service import ScheduleService
    ward = db.query(Ward).filter(Ward.id == ward_id).first()
    if not ward:
        raise HTTPException(status_code=404, detail="Ward not found.")

    schedule = ScheduleService.create_schedule(
        db=db,
        ward_id=ward_id,
        waste_type=payload.waste_type,
        day_of_week=payload.day_of_week,
        frequency=payload.frequency,
        start_time=payload.start_time,
        end_time=payload.end_time,
        vehicle_number=payload.vehicle_number,
        supervisor_name=payload.supervisor_name,
        supervisor_contact=payload.supervisor_contact,
        instructions=payload.instructions,
        actor=current_admin
    )
    return {"message": "Schedule created successfully.", "schedule_id": schedule.id}


@router.put("/schedules/{schedule_id}")
def update_schedule_slot(
    schedule_id: str,
    payload: ScheduleSlotUpdate,
    current_admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Updates a collection schedule slot with audit logging.
    """
    from app.services.schedule_service import ScheduleService
    try:
        schedule = ScheduleService.update_schedule(
            db=db,
            schedule_id=schedule_id,
            updates=payload.model_dump(exclude_unset=True),
            actor=current_admin
        )
        return {"message": "Schedule updated successfully.", "schedule_id": schedule.id}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/schedules/{schedule_id}")
def delete_schedule_slot(
    schedule_id: str,
    current_admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Deactivates a collection schedule slot with audit logging.
    """
    from app.services.schedule_service import ScheduleService
    success = ScheduleService.delete_schedule(db=db, schedule_id=schedule_id, actor=current_admin)
    if not success:
        raise HTTPException(status_code=404, detail="Schedule slot not found.")
    return {"message": "Schedule slot deactivated successfully."}


@router.post("/wards/{ward_id}/overrides")
def create_ward_schedule_override(
    ward_id: str,
    payload: ScheduleOverrideCreate,
    current_admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Adds a seasonal, festival, or weather override to a ward collection schedule.
    """
    from app.services.schedule_service import ScheduleService
    ward = db.query(Ward).filter(Ward.id == ward_id).first()
    if not ward:
        raise HTTPException(status_code=404, detail="Ward not found.")

    override = ScheduleService.create_override(
        db=db,
        ward_id=ward_id,
        override_date=payload.override_date,
        reason=payload.reason,
        waste_type=payload.waste_type,
        is_cancelled=payload.is_cancelled,
        rescheduled_date=payload.rescheduled_date,
        rescheduled_start_time=payload.rescheduled_start_time,
        rescheduled_end_time=payload.rescheduled_end_time,
        actor=current_admin
    )
    return {"message": "Override created successfully.", "override_id": override.id}


@router.delete("/overrides/{override_id}")
def delete_ward_schedule_override(
    override_id: str,
    current_admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Deletes a schedule override with audit logging.
    """
    from app.services.schedule_service import ScheduleService
    success = ScheduleService.delete_override(db=db, override_id=override_id, actor=current_admin)
    if not success:
        raise HTTPException(status_code=404, detail="Override not found.")
    return {"message": "Override removed successfully."}


@router.get("/wards/{ward_id}/schedule/ics")
def preview_ward_schedule_ics(
    ward_id: str,
    current_admin: User = Depends(require_supervisor),
    db: Session = Depends(get_db)
):
    """
    Generates and returns RFC 5545 iCalendar format preview for a ward.
    """
    from app.services.schedule_service import ScheduleService
    from fastapi.responses import Response

    ward = db.query(Ward).filter(Ward.id == ward_id).first()
    if not ward:
        raise HTTPException(status_code=404, detail="Ward not found.")

    ics_content = ScheduleService.generate_ical_calendar(db, ward_id)
    headers = {
        "Content-Disposition": f'attachment; filename="greenpay-{ward.name.lower()}-schedule.ics"',
        "Cache-Control": "no-cache"
    }
    return Response(
        content=ics_content,
        media_type="text/calendar; charset=utf-8",
        headers=headers
    )


# ==============================================================================
# Phase D: Credit Redemption Administration
# ==============================================================================

@router.get("/redemptions/items")
def get_redemption_items_admin(
    current_admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Returns all redemption catalogue items with redeemed count and partner coupon inventory.
    """
    items = db.query(RedemptionItem).order_by(RedemptionItem.created_at.desc()).all()
    results = []
    for it in items:
        redeemed_count = db.query(RedemptionTransaction).filter(RedemptionTransaction.item_id == it.id).count()
        total_coupons = (
            db.query(PartnerCoupon).filter(PartnerCoupon.item_id == it.id).count()
            if it.item_type == "PARTNER_COUPON"
            else None
        )
        unused_coupons = (
            db.query(PartnerCoupon).filter(PartnerCoupon.item_id == it.id, PartnerCoupon.is_redeemed == False).count()
            if it.item_type == "PARTNER_COUPON"
            else None
        )
        results.append({
            "id": it.id,
            "item_type": it.item_type,
            "title": it.title,
            "description": it.description,
            "credit_cost": it.credit_cost,
            "stock_limit": it.stock_limit,
            "stock_remaining": it.stock_remaining,
            "partner_name": it.partner_name,
            "badge_text": it.badge_text,
            "is_active": it.is_active,
            "total_redeemed": redeemed_count,
            "total_coupons": total_coupons,
            "unused_coupons": unused_coupons,
        })
    return results


@router.post("/redemptions/items")
def create_redemption_item_admin(
    payload: dict,
    current_admin: User = Depends(require_super_admin),
    _csrf: bool = Depends(verify_csrf),
    db: Session = Depends(get_db)
):
    """
    Creates a new civic redemption offering with audit trail.
    """
    item = RedemptionItem(
        item_type=payload["item_type"],
        title=payload["title"],
        description=payload["description"],
        credit_cost=float(payload["credit_cost"]),
        stock_limit=payload.get("stock_limit"),
        stock_remaining=payload.get("stock_remaining"),
        partner_name=payload.get("partner_name"),
        badge_text=payload.get("badge_text"),
        is_active=payload.get("is_active", True)
    )
    db.add(item)
    db.flush()

    db.add(AuditLog(
        actor_id=current_admin.id,
        actor_role=current_admin.role,
        action="REDEMPTION_ITEM_CREATED",
        affected_entity_type="RedemptionItem",
        affected_entity_id=item.id,
        diff=json.dumps({"title": item.title, "cost": item.credit_cost})
    ))
    db.commit()
    db.refresh(item)
    return item


@router.patch("/redemptions/items/{item_id}")
def update_redemption_item_admin(
    item_id: str,
    payload: UpdateRedemptionItemRequest,
    current_admin: User = Depends(require_super_admin),
    _csrf: bool = Depends(verify_csrf),
    db: Session = Depends(get_db)
):
    """
    Updates redemption item prices, inventory stock, or active status with strict audit logging.
    Strictly prohibited for field supervisors; super admin authorization only.
    """
    item = db.query(RedemptionItem).filter(RedemptionItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Redemption item not found.")

    diff = {}
    if payload.credit_cost is not None:
        if payload.credit_cost <= 0:
            raise HTTPException(status_code=400, detail="Credit cost must be greater than zero.")
        diff["credit_cost"] = {"old": item.credit_cost, "new": payload.credit_cost}
        item.credit_cost = float(payload.credit_cost)
    if payload.stock_remaining is not None:
        if payload.stock_remaining < 0:
            raise HTTPException(status_code=400, detail="Stock remaining cannot be negative.")
        diff["stock_remaining"] = {"old": item.stock_remaining, "new": payload.stock_remaining}
        item.stock_remaining = payload.stock_remaining
    if payload.stock_limit is not None:
        if payload.stock_limit < 0:
            raise HTTPException(status_code=400, detail="Stock limit cannot be negative.")
        diff["stock_limit"] = {"old": item.stock_limit, "new": payload.stock_limit}
        item.stock_limit = payload.stock_limit
    if payload.is_active is not None:
        diff["is_active"] = {"old": item.is_active, "new": payload.is_active}
        item.is_active = payload.is_active
    if payload.title is not None and payload.title.strip():
        diff["title"] = {"old": item.title, "new": payload.title.strip()}
        item.title = payload.title.strip()
    if payload.description is not None and payload.description.strip():
        diff["description"] = {"old": item.description, "new": payload.description.strip()}
        item.description = payload.description.strip()
    if payload.badge_text is not None and payload.badge_text.strip():
        diff["badge_text"] = {"old": item.badge_text, "new": payload.badge_text.strip()}
        item.badge_text = payload.badge_text.strip()

    if payload.change_reason:
        diff["change_reason"] = payload.change_reason

    db.add(AuditLog(
        actor_id=current_admin.id,
        actor_role=current_admin.role,
        action="REDEMPTION_ITEM_UPDATED",
        affected_entity_type="RedemptionItem",
        affected_entity_id=item.id,
        diff=json.dumps(diff)
    ))
    db.commit()
    db.refresh(item)
    return item


@router.post("/redemptions/items/{item_id}/coupons")
def add_partner_coupons_admin(
    item_id: str,
    payload: dict,
    current_admin: User = Depends(require_super_admin),
    _csrf: bool = Depends(verify_csrf),
    db: Session = Depends(get_db)
):
    """
    Bulk adds partner coupon codes to an active coupon item.
    """
    item = db.query(RedemptionItem).filter(RedemptionItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Redemption item not found.")

    codes: List[str] = payload.get("coupon_codes", [])
    added = 0
    for c in codes:
        code_clean = c.strip().upper()
        if code_clean and not db.query(PartnerCoupon).filter(PartnerCoupon.coupon_code == code_clean).first():
            db.add(PartnerCoupon(item_id=item.id, coupon_code=code_clean, is_redeemed=False))
            added += 1

    if item.stock_remaining is not None:
        item.stock_remaining += added
    elif item.stock_limit is not None:
        item.stock_remaining = added

    db.commit()
    return {"message": f"Successfully added {added} partner coupon codes.", "added": added}


@router.get("/redemptions/transactions")
def get_redemption_transactions_admin(
    limit: int = 50,
    current_admin: User = Depends(require_supervisor),
    db: Session = Depends(get_db)
):
    """
    Returns recent redemptions across all wards for municipal operations review.
    """
    txs = db.query(RedemptionTransaction).order_by(RedemptionTransaction.created_at.desc()).limit(limit).all()
    return [
        {
            "id": tx.id,
            "redemption_reference": tx.redemption_reference,
            "user_id": tx.user_id,
            "pseudonymous_owner": tx.pseudonymous_owner,
            "citizen_name": tx.user.profile.name if tx.user and tx.user.profile else (tx.donor_display_name or "Civic Household"),
            "citizen_greenpay_id": tx.user.greenpay_id if tx.user else None,
            "item_type": tx.item_type,
            "item_title": tx.item_title or (tx.item.title if tx.item else "Civic Item"),
            "item_quantity": tx.item_quantity or (tx.item.badge_text.split("•")[0].strip() if tx.item and tx.item.badge_text else "1 unit"),
            "credits_spent": tx.credits_spent,
            "previous_balance": tx.previous_balance,
            "remaining_balance": tx.remaining_balance,
            "status": tx.status or "CONFIRMED",
            "certificate_number": tx.certificate_number,
            "coupon_code": tx.coupon_code,
            "ward_name": tx.ward.name if tx.ward else (tx.user.profile.ward.name if tx.user and tx.user.profile and tx.user.profile.ward else None),
            "donor_display_name": tx.donor_display_name,
            "created_at": tx.created_at.isoformat()
        }
        for tx in txs
    ]


# =============================================================================
# Phase E: Supervisor Operations & Management
# =============================================================================

@router.get("/supervisors")
def list_supervisors_admin(
    current_admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Lists all field supervisors across Bengaluru wards with status and activity metrics.
    """
    supervisors = db.query(User).filter(User.role == "SUPERVISOR").all()
    results = []
    for s in supervisors:
        p = s.profile
        logged_count = db.query(WasteEntry).filter(WasteEntry.supervisor_id == s.id).count()
        results.append({
            "id": s.id,
            "greenpay_id": s.greenpay_id,
            "name": p.name if p else "Municipal Supervisor",
            "email": p.email if p else None,
            "phone_number": p.phone_number if p else None,
            "status": s.status,
            "ward_id": p.ward_id if p else None,
            "ward_name": p.ward.name if p and p.ward else "Unassigned",
            "zone": p.ward.zone if p and p.ward else "Bengaluru",
            "weighments_logged_count": logged_count,
            "created_at": s.created_at.isoformat() if s.created_at else None
        })
    return results


@router.patch("/supervisors/{supervisor_id}/status")
def update_supervisor_status_admin(
    supervisor_id: str,
    payload: dict,
    current_admin: User = Depends(require_super_admin),
    _csrf: bool = Depends(verify_csrf),
    db: Session = Depends(get_db)
):
    """
    Deactivates (SUSPENDED) or reactivates (ACTIVE) a municipal supervisor with full audit logging.
    Deactivating terminates all active sessions immediately.
    """
    sup = db.query(User).filter(User.id == supervisor_id, User.role == "SUPERVISOR").first()
    if not sup:
        raise HTTPException(status_code=404, detail="Supervisor not found.")

    new_status = payload.get("status")
    if new_status not in ["ACTIVE", "SUSPENDED"]:
        raise HTTPException(status_code=400, detail="Invalid status. Allowed: ACTIVE, SUSPENDED.")

    old_status = sup.status
    sup.status = new_status

    # Invalidate sessions if suspended
    if new_status == "SUSPENDED":
        db.query(UserSession).filter(UserSession.user_id == sup.id, UserSession.is_revoked == False).update({"is_revoked": True})

    db.add(AuditLog(
        actor_id=current_admin.id,
        actor_role=current_admin.role,
        action="SUPERVISOR_STATUS_CHANGED",
        affected_entity_type="User",
        affected_entity_id=sup.id,
        diff=json.dumps({
            "supervisor_id": sup.id,
            "supervisor_name": sup.profile.name if sup.profile else sup.id,
            "old_status": old_status,
            "new_status": new_status,
            "reason": payload.get("reason", "Administrative action")
        })
    ))
    db.commit()
    return {"message": f"Supervisor status updated to {new_status}.", "status": new_status}


@router.patch("/supervisors/{supervisor_id}/ward")
def reassign_supervisor_ward_admin(
    supervisor_id: str,
    payload: dict,
    current_admin: User = Depends(require_super_admin),
    _csrf: bool = Depends(verify_csrf),
    db: Session = Depends(get_db)
):
    """
    Reassigns a supervisor to a new ward with auditable justification.
    """
    sup = db.query(User).filter(User.id == supervisor_id, User.role == "SUPERVISOR").first()
    if not sup:
        raise HTTPException(status_code=404, detail="Supervisor not found.")

    target_ward_id = payload.get("ward_id")
    ward = db.query(Ward).filter(Ward.id == target_ward_id).first()
    if not ward:
        raise HTTPException(status_code=404, detail="Target ward not found.")

    p = sup.profile
    old_ward_name = p.ward.name if p and p.ward else "Unassigned"

    if p:
        p.ward_id = ward.id
    else:
        sup.profile = UserProfile(user_id=sup.id, name="Supervisor", ward_id=ward.id)

    db.add(AuditLog(
        actor_id=current_admin.id,
        actor_role=current_admin.role,
        action="SUPERVISOR_WARD_REASSIGNED",
        affected_entity_type="User",
        affected_entity_id=sup.id,
        diff=json.dumps({
            "supervisor_name": sup.profile.name,
            "old_ward": old_ward_name,
            "new_ward": ward.name,
            "reason": payload.get("reason", "Operational reassignment")
        })
    ))
    db.commit()
    return {"message": f"Supervisor successfully reassigned to {ward.name}.", "ward_name": ward.name, "ward_id": ward.id}


# =============================================================================
# Phase E: Ward Exports (CSV & Executive PDF)
# =============================================================================

@router.get("/wards/{ward_id}/export-csv")
def export_ward_csv(
    ward_id: str,
    current_admin: User = Depends(require_supervisor),
    db: Session = Depends(get_db)
):
    """
    Streams certified collection logs for a ward as a compliant CSV file.
    Complies with DPDP Act 2023: personal identifiers are strictly pseudonymised.
    """
    ward = db.query(Ward).filter(Ward.id == ward_id).first()
    if not ward:
        raise HTTPException(status_code=404, detail="Ward not found.")

    entries = (
        db.query(WasteEntry)
        .filter(WasteEntry.ward_id == ward_id)
        .order_by(WasteEntry.collection_date.desc())
        .limit(1000)
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Transaction ID",
        "Timestamp (UTC)",
        "Ward Name",
        "Zone",
        "Wet Organic (kg)",
        "Dry Recyclable (kg)",
        "Hazardous (kg)",
        "E-Waste (kg)",
        "Total Certified Weight (kg)",
        "Pseudonymous Beneficiary",
        "Supervisor Staff ID",
        "Dispute Status",
    ])

    for e in entries:
        pseudonym = (
            e.user.pseudonymous_id
            if e.user and e.user.pseudonymous_id
            else (f"anon-{e.user_id[:8]}" if e.user_id else "anon-citizen")
        )
        sup_tag = (
            e.supervisor.greenpay_id
            if e.supervisor and e.supervisor.greenpay_id
            else "SUP-BLR-OFFICIAL"
        )
        writer.writerow([
            e.id,
            e.collection_date.isoformat() if e.collection_date else "",
            ward.name,
            ward.zone,
            e.wet_kg,
            e.dry_kg,
            e.hazardous_kg,
            e.ewaste_kg,
            e.total_weight_kg,
            pseudonym,
            sup_tag,
            e.dispute_status or "CONFIRMED",
        ])

    csv_content = output.getvalue()
    safe_name = ward.name.lower().replace(" ", "_")
    filename = f"greenpay_{safe_name}_collection_logs.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/wards/{ward_id}/export-pdf")
def export_ward_pdf(
    ward_id: str,
    current_admin: User = Depends(require_supervisor),
    db: Session = Depends(get_db)
):
    """
    Generates and streams an executive municipal ward audit PDF report using ReportLab.
    """
    ward = db.query(Ward).filter(Ward.id == ward_id).first()
    if not ward:
        raise HTTPException(status_code=404, detail="Ward not found.")

    entries = (
        db.query(WasteEntry)
        .filter(WasteEntry.ward_id == ward_id)
        .order_by(WasteEntry.collection_date.desc())
        .limit(50)
        .all()
    )

    total_kg = sum(e.total_weight_kg for e in entries)
    dry_kg = sum(e.dry_kg for e in entries)
    wet_kg = sum(e.wet_kg for e in entries)
    hazardous_kg = sum(e.hazardous_kg for e in entries)
    ewaste_kg = sum(e.ewaste_kg for e in entries)
    segregation_ratio = round((dry_kg + ewaste_kg) / total_kg * 100, 1) if total_kg > 0 else 0.0
    citizen_count = db.query(UserProfile).filter(UserProfile.ward_id == ward.id).count()

    summary = {
        "total_kg": total_kg,
        "dry_kg": dry_kg,
        "wet_kg": wet_kg,
        "hazardous_kg": hazardous_kg,
        "ewaste_kg": ewaste_kg,
        "segregation_percentage": segregation_ratio,
        "active_citizens": citizen_count,
        "collection_count": len(entries),
    }

    recent_list = [
        {
            "date": e.collection_date.isoformat() if e.collection_date else "",
            "pseudonym": e.user.pseudonymous_id if e.user and e.user.pseudonymous_id else f"anon-{e.user_id[:8]}",
            "dry_kg": e.dry_kg,
            "wet_kg": e.wet_kg,
            "total_kg": e.total_weight_kg,
            "supervisor": e.supervisor.greenpay_id if e.supervisor and e.supervisor.greenpay_id else "Staff",
            "status": e.dispute_status or "CONFIRMED",
        }
        for e in entries
    ]

    pdf_bytes = WardExportService.generate_ward_pdf(
        ward_name=ward.name,
        zone=ward.zone,
        summary=summary,
        recent_entries=recent_list,
    )

    safe_name = ward.name.lower().replace(" ", "_")
    filename = f"greenpay_{safe_name}_audit_report.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'}
    )


# =============================================================================
# Stage 4: Dry Waste Category & Rate Governance
# =============================================================================

@router.get("/dry-waste-categories", response_model=List[DryWasteCategoryResponse])
def admin_list_dry_waste_categories(
    current_admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Super-Admin endpoint to list all dry-waste categories (both active and inactive).
    """
    return db.query(DryWasteCategory).order_by(DryWasteCategory.name).all()


@router.put("/dry-waste-categories/{category_id}", response_model=DryWasteCategoryResponse)
def admin_update_dry_waste_category(
    category_id: str,
    payload: DryWasteCategoryUpdateRequest,
    current_admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Super-Admin endpoint to update category rates or toggle active status.
    Automatically generates immutable DryWasteRateHistory snapshot and AuditLog entry.
    """
    cat = DryWasteEngine.get_category_by_code_or_id(db, category_id)
    if not cat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dry waste category '{category_id}' does not exist."
        )

    if payload.rate_per_kg is not None and payload.rate_per_kg != cat.rate_per_kg:
        cat = DryWasteEngine.update_category_rate(
            db=db,
            category_id=category_id,
            new_rate=payload.rate_per_kg,
            admin=current_admin,
            change_reason=payload.change_reason
        )

    if payload.is_active is not None:
        cat.is_active = payload.is_active
        db.commit()
        db.refresh(cat)

    return cat


# =============================================================================
# Stage 8: Super Admin Governance & Ecosystem Management
# =============================================================================

@router.get("/dry-waste-categories/history", response_model=List[DryWasteRateHistoryResponse])
def get_dry_waste_rate_history(
    current_admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Super-Admin endpoint to retrieve the immutable audit trail of dry waste rate adjustments.
    """
    history_records = (
        db.query(DryWasteRateHistory)
        .order_by(DryWasteRateHistory.changed_at.desc())
        .all()
    )
    results = []
    for h in history_records:
        cat = db.query(DryWasteCategory).filter(DryWasteCategory.id == h.category_id).first()
        admin_user = db.query(User).filter(User.id == h.changed_by_id).first()
        admin_name = (
            admin_user.profile.name
            if admin_user and admin_user.profile
            else (admin_user.profile.email if admin_user and admin_user.profile else "Super Admin")
        )
        results.append(
            DryWasteRateHistoryResponse(
                id=h.id,
                category_id=h.category_id,
                category_name=cat.name if cat else "Dry Waste",
                category_code=cat.code if cat else "unknown",
                previous_rate=h.previous_rate,
                new_rate=h.new_rate,
                change_reason=h.change_reason or "Administrative tariff adjustment",
                changed_at=h.changed_at,
                changed_by_name=admin_name,
            )
        )
    return results


@router.get("/dashboard/stats", response_model=AdminDashboardStatsResponse)
def get_super_admin_dashboard_stats(
    period: str = Query("all", pattern="^(all|30d|90d|year)$"),
    current_admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Central governance dashboard intelligence for the dry recyclables collection
    and grocery rewards ecosystem. Reflects authentic database records with date filtering.
    """
    now = datetime.now(timezone.utc)
    cutoff = None
    if period == "30d":
        cutoff = now - timedelta(days=30)
    elif period == "90d":
        cutoff = now - timedelta(days=90)
    elif period == "year":
        cutoff = now - timedelta(days=365)

    # 1. Citizen & Supervisor Counts
    total_citizens = db.query(User).filter(User.role == "CITIZEN").count()
    active_supervisors = db.query(User).filter(User.role == "SUPERVISOR", User.status == "ACTIVE").count()

    # 2. Verified Collections
    base_entries_q = db.query(WasteEntry).filter(~WasteEntry.transaction_id.like("GP-REC-HIST-%"))
    if cutoff:
        cutoff_str = cutoff.strftime("%Y-%m-%d %H:%M:%S")
        base_entries_q = base_entries_q.filter(
            (WasteEntry.created_at >= cutoff) | (WasteEntry.collection_date >= cutoff_str)
        )
    entries = base_entries_q.all()
    total_collections = len(entries)
    total_collected_kg = round(sum(e.total_weight_kg for e in entries), 2)

    # 3. GP Awarded & Redeemed from Ledger
    tx_q = (
        db.query(CreditTransaction)
        .outerjoin(WasteEntry, CreditTransaction.waste_entry_id == WasteEntry.id)
        .filter(
            (WasteEntry.id == None) | (~WasteEntry.transaction_id.like("GP-REC-HIST-%"))
        )
    )
    if cutoff:
        tx_q = tx_q.filter(CreditTransaction.timestamp >= cutoff)
    all_txs = tx_q.all()
    total_gp_awarded = round(sum(tx.credits_amount for tx in all_txs if tx.credits_amount > 0 and not tx.is_reversal), 2)
    total_gp_redeemed = round(sum(abs(tx.credits_amount) for tx in all_txs if tx.credits_amount < 0), 2)

    # 4. Inventory & Successful Redemptions
    grocery_items = db.query(RedemptionItem).all()
    available_inventory_units = sum(i.stock_remaining or 0 for i in grocery_items if i.is_active)

    redemptions_q = db.query(RedemptionTransaction).filter(RedemptionTransaction.status == "CONFIRMED")
    if cutoff:
        redemptions_q = redemptions_q.filter(RedemptionTransaction.created_at >= cutoff)
    successful_redemptions = redemptions_q.count()

    # 5. Category Breakdown (8 Dry Waste Categories)
    categories = db.query(DryWasteCategory).all()
    entry_ids = [e.id for e in entries]
    collection_items = []
    if entry_ids:
        collection_items = (
            db.query(WasteCollectionItem)
            .filter(WasteCollectionItem.waste_entry_id.in_(entry_ids))
            .all()
        )

    categories_breakdown = []
    for cat in sorted(categories, key=lambda c: c.name):
        cat_items = [ci for ci in collection_items if ci.category_id == cat.id or ci.category_code == cat.code]
        w_kg = round(sum(ci.weight_kg for ci in cat_items), 2)
        pts = round(sum(ci.points_earned for ci in cat_items), 2)
        pct = round((w_kg / total_collected_kg * 100), 1) if total_collected_kg > 0 else 0.0
        categories_breakdown.append(
            CategoryStatBreakdown(
                code=cat.code,
                name=cat.name,
                rate_per_kg=float(cat.rate_per_kg),
                is_active=bool(cat.is_active),
                total_weight_kg=w_kg,
                total_points_awarded=pts,
                collections_count=len(cat_items),
                percentage_of_dry_waste=pct,
            )
        )

    # 6. Wards Breakdown
    wards = db.query(Ward).all()
    wards_breakdown = []
    for w in wards:
        ward_entries = [e for e in entries if e.ward_id == w.id]
        ward_kg = round(sum(e.total_weight_kg for e in ward_entries), 2)
        ward_e_ids = {e.id for e in ward_entries}
        ward_txs = [tx for tx in all_txs if tx.waste_entry_id in ward_e_ids and tx.credits_amount > 0 and not tx.is_reversal]
        ward_pts = round(sum(tx.credits_amount for tx in ward_txs), 2)
        citizen_count = db.query(UserProfile).filter(UserProfile.ward_id == w.id).count()
        wards_breakdown.append(
            WardStatBreakdown(
                id=w.id,
                name=w.name,
                zone=w.zone or "Bengaluru",
                total_collected_kg=ward_kg,
                total_points_awarded=ward_pts,
                collections_count=len(ward_entries),
                active_citizens=citizen_count,
            )
        )

    # 7. Inventory Breakdown (5 Approved Products)
    inventory_breakdown = []
    for g in grocery_items:
        red_count_q = db.query(RedemptionTransaction).filter(
            RedemptionTransaction.item_id == g.id,
            RedemptionTransaction.status == "CONFIRMED"
        )
        if cutoff:
            red_count_q = red_count_q.filter(RedemptionTransaction.created_at >= cutoff)
        inventory_breakdown.append(
            InventoryStatBreakdown(
                id=g.id,
                title=g.title,
                credit_cost=float(g.credit_cost),
                stock_remaining=g.stock_remaining or 0,
                stock_limit=g.stock_limit,
                is_active=bool(g.is_active),
                total_redeemed_count=red_count_q.count(),
            )
        )

    # 8. Supervisors Summary
    supervisors = db.query(User).filter(User.role == "SUPERVISOR").all()
    supervisors_summary = []
    for s in supervisors:
        sp = s.profile
        sup_entries = [e for e in entries if e.supervisor_id == s.id]
        sup_kg = round(sum(e.total_weight_kg for e in sup_entries), 2)
        supervisors_summary.append(
            SupervisorStatSummary(
                id=s.id,
                staff_id=s.greenpay_id,
                name=sp.name if sp else "Field Supervisor",
                email=sp.email if sp else None,
                ward_id=sp.ward_id if sp else None,
                ward_name=sp.ward.name if sp and sp.ward else "Unassigned",
                status=s.status,
                collections_logged_count=len(sup_entries),
                total_weight_verified_kg=sup_kg,
            )
        )

    return AdminDashboardStatsResponse(
        period=period,
        total_citizens=total_citizens,
        active_supervisors=active_supervisors,
        total_collections=total_collections,
        total_collected_kg=total_collected_kg,
        total_gp_awarded=total_gp_awarded,
        total_gp_redeemed=total_gp_redeemed,
        available_inventory_units=available_inventory_units,
        successful_redemptions=successful_redemptions,
        categories_breakdown=categories_breakdown,
        wards_breakdown=wards_breakdown,
        inventory_breakdown=inventory_breakdown,
        supervisors_summary=supervisors_summary,
    )


@router.get("/citizens", response_model=AdminCitizenListResponse)
def get_citizens_admin(
    search: Optional[str] = None,
    ward_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Super-Admin endpoint to query registered citizens and households with authentic
    ledger-derived Green Points balances. Balances cannot be modified via ordinary forms.
    """
    q = db.query(User).join(UserProfile, User.id == UserProfile.user_id, isouter=True).filter(User.role == "CITIZEN")

    if status and status.upper() != "ALL":
        q = q.filter(User.status == status.upper())

    if ward_id and ward_id.upper() != "ALL":
        q = q.filter(UserProfile.ward_id == ward_id)

    if search:
        s = f"%{search.strip().lower()}%"
        q = q.filter(
            (func.lower(UserProfile.name).like(s)) |
            (func.lower(User.greenpay_id).like(s)) |
            (func.lower(UserProfile.email).like(s)) |
            (func.lower(UserProfile.phone_number).like(s))
        )

    total = q.count()
    users = q.order_by(User.created_at.desc()).offset(offset).limit(limit).all()

    citizens = []
    for u in users:
        p = u.profile
        txs = (
            db.query(CreditTransaction)
            .outerjoin(WasteEntry, CreditTransaction.waste_entry_id == WasteEntry.id)
            .filter(
                CreditTransaction.user_id == u.id,
                (WasteEntry.id == None) | (~WasteEntry.transaction_id.like("GP-REC-HIST-%"))
            )
            .all()
        )
        avail = round(sum(t.credits_amount for t in txs), 2)
        earned = round(sum(t.credits_amount for t in txs if t.credits_amount > 0 and not t.is_reversal), 2)
        redeemed = round(sum(abs(t.credits_amount) for t in txs if t.credits_amount < 0), 2)
        cols_count = len({t.waste_entry_id for t in txs if t.waste_entry_id and t.credits_amount > 0 and not t.is_reversal})
        reds_count = db.query(RedemptionTransaction).filter(
            RedemptionTransaction.user_id == u.id,
            RedemptionTransaction.status == "CONFIRMED"
        ).count()

        masked = "N/A"
        if u.meter_number_encrypted:
            dec = decrypt_meter_number(u.meter_number_encrypted)
            if dec and dec != "[UNREADABLE_METER]":
                masked = mask_meter_number(dec)

        citizens.append(
            AdminCitizenListItem(
                id=u.id,
                greenpay_id=u.greenpay_id,
                name=p.name if p else "Citizen Household",
                email=p.email if p else None,
                phone_number=p.phone_number if p else None,
                masked_meter=masked,
                ward_id=p.ward_id if p else None,
                ward_name=p.ward.name if p and p.ward else "Unassigned",
                status=u.status,
                available_balance=avail,
                total_earned=earned,
                total_redeemed=redeemed,
                collections_count=cols_count,
                redemptions_count=reds_count,
                registered_at=u.created_at.isoformat() if u.created_at else None,
            )
        )

    return AdminCitizenListResponse(total=total, citizens=citizens)


@router.get("/citizens/{citizen_id}")
def get_citizen_detail_admin(
    citizen_id: str,
    current_admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Detailed citizen dossier including read-only verified balance, collection history,
    grocery redemptions, and audit provenance.
    """
    citizen = db.query(User).filter(User.id == citizen_id, User.role == "CITIZEN").first()
    if not citizen:
        raise HTTPException(status_code=404, detail="Citizen not found.")

    p = citizen.profile
    balance_resp = DryWasteEngine.get_household_points_balance(db, citizen.id)

    entries = (
        db.query(WasteEntry)
        .filter(WasteEntry.user_id == citizen.id, ~WasteEntry.transaction_id.like("GP-REC-HIST-%"))
        .order_by(WasteEntry.created_at.desc())
        .limit(20)
        .all()
    )
    collections_data = []
    for e in entries:
        items = [
            {
                "category_code": ci.category_code,
                "category_name": ci.category_name,
                "weight_kg": ci.weight_kg,
                "rate_per_kg": ci.rate_per_kg,
                "points_earned": ci.points_earned,
            }
            for ci in (e.collection_items or [])
        ]
        collections_data.append({
            "id": e.id,
            "transaction_id": e.transaction_id,
            "collection_date": e.collection_date.isoformat() if hasattr(e.collection_date, "isoformat") else str(e.collection_date),
            "total_weight_kg": e.total_weight_kg,
            "supervisor_name": e.supervisor.profile.name if e.supervisor and e.supervisor.profile else "Field Staff",
            "ward_name": e.ward.name if e.ward else "Bengaluru",
            "status": e.dispute_status,
            "items": items,
        })

    redemptions = (
        db.query(RedemptionTransaction)
        .filter(RedemptionTransaction.user_id == citizen.id)
        .order_by(RedemptionTransaction.created_at.desc())
        .limit(20)
        .all()
    )
    redemptions_data = [
        {
            "id": r.id,
            "redemption_reference": r.redemption_reference,
            "item_title": r.item_title,
            "item_quantity": r.item_quantity,
            "credits_spent": r.credits_spent,
            "status": r.status,
            "created_at": r.created_at.isoformat(),
        }
        for r in redemptions
    ]

    masked = "N/A"
    if citizen.meter_number_encrypted:
        dec = decrypt_meter_number(citizen.meter_number_encrypted)
        if dec and dec != "[UNREADABLE_METER]":
            masked = mask_meter_number(dec)

    return {
        "id": citizen.id,
        "greenpay_id": citizen.greenpay_id,
        "name": p.name if p else "Citizen Household",
        "email": p.email if p else None,
        "phone_number": p.phone_number if p else None,
        "masked_meter": masked,
        "ward_id": p.ward_id if p else None,
        "ward_name": p.ward.name if p and p.ward else "Bengaluru",
        "status": citizen.status,
        "registered_at": citizen.created_at.isoformat() if citizen.created_at else None,
        "balance": {
            "current_balance": balance_resp.current_balance,
            "total_earned": balance_resp.total_earned,
            "total_redeemed": balance_resp.total_redeemed,
            "total_weight_kg": balance_resp.total_weight_kg,
            "weighments_count": balance_resp.total_weighments_count,
            "is_read_only": True,
            "verification_note": "Balance derived exclusively from append-only ledger entries.",
        },
        "recent_collections": collections_data,
        "recent_redemptions": redemptions_data,
    }


@router.patch("/citizens/{citizen_id}/status")
def update_citizen_status_admin(
    citizen_id: str,
    payload: AdminCitizenStatusUpdateRequest,
    current_admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Super-Admin endpoint to toggle citizen account status (ACTIVE, SUSPENDED, PENDING).
    Strictly prohibited from modifying ledger balances.
    """
    citizen = db.query(User).filter(User.id == citizen_id, User.role == "CITIZEN").first()
    if not citizen:
        raise HTTPException(status_code=404, detail="Citizen not found.")

    old_status = citizen.status
    citizen.status = payload.status

    AuditService.log_action(
        db,
        actor_id=current_admin.id,
        actor_role=current_admin.role,
        action="CITIZEN_STATUS_UPDATED",
        affected_entity_type="User",
        affected_entity_id=citizen.id,
        diff={"old_status": old_status, "new_status": citizen.status, "reason": payload.reason},
    )
    db.commit()
    db.refresh(citizen)
    return {"message": f"Citizen status updated to {citizen.status}.", "status": citizen.status}


@router.get("/collections")
def get_collections_admin(
    ward_id: Optional[str] = None,
    supervisor_id: Optional[str] = None,
    citizen_id: Optional[str] = None,
    category_code: Optional[str] = None,
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Super-Admin filterable collection ledger. Returns actual verified dry-waste
    collection records with historical rate snapshots. Ordinary admin edits to
    rewrite completed earning transactions are strictly forbidden.
    """
    q = db.query(WasteEntry).filter(~WasteEntry.transaction_id.like("GP-REC-HIST-%"))

    if ward_id and ward_id.upper() != "ALL":
        q = q.filter(WasteEntry.ward_id == ward_id)

    if supervisor_id and supervisor_id.upper() != "ALL":
        q = q.filter(WasteEntry.supervisor_id == supervisor_id)

    if citizen_id and citizen_id.upper() != "ALL":
        q = q.filter(WasteEntry.user_id == citizen_id)

    if status and status.upper() != "ALL":
        q = q.filter(WasteEntry.dispute_status == status)

    if date_from:
        q = q.filter(WasteEntry.created_at >= date_from)

    if date_to:
        q = q.filter(WasteEntry.created_at <= date_to)

    if category_code and category_code.upper() != "ALL":
        q = q.join(WasteCollectionItem, WasteEntry.id == WasteCollectionItem.waste_entry_id).filter(
            WasteCollectionItem.category_code == category_code
        )

    total = q.count()
    entries = q.order_by(WasteEntry.created_at.desc()).offset(offset).limit(limit).all()

    results = []
    for e in entries:
        c_user = e.user
        cp = c_user.profile if c_user else None
        s_user = e.supervisor
        sp = s_user.profile if s_user else None
        w = e.ward

        tx = db.query(CreditTransaction).filter(
            CreditTransaction.waste_entry_id == e.id,
            CreditTransaction.credits_amount > 0,
            CreditTransaction.is_reversal == False
        ).first()
        points_awarded = tx.credits_amount if tx else 0.0

        items = [
            {
                "category_code": ci.category_code,
                "category_name": ci.category_name,
                "weight_kg": ci.weight_kg,
                "rate_per_kg": ci.rate_per_kg,
                "points_earned": ci.points_earned,
            }
            for ci in (e.collection_items or [])
        ]

        results.append({
            "id": e.id,
            "transaction_id": e.transaction_id,
            "collection_date": e.collection_date.isoformat() if hasattr(e.collection_date, "isoformat") else str(e.collection_date),
            "created_at": e.created_at.isoformat() if e.created_at else None,
            "citizen": {
                "id": c_user.id if c_user else None,
                "greenpay_id": c_user.greenpay_id if c_user else "N/A",
                "name": cp.name if cp else "Citizen",
                "ward_name": w.name if w else "Bengaluru",
            },
            "supervisor": {
                "id": s_user.id if s_user else None,
                "staff_id": s_user.greenpay_id if s_user else "GP-SUP-000",
                "name": sp.name if sp else "Field Supervisor",
                "email": sp.email if sp else None,
            },
            "ward": {
                "id": w.id if w else None,
                "name": w.name if w else "Bengaluru",
                "zone": w.zone if w else "Central",
            },
            "status": e.dispute_status,
            "total_weight_kg": e.total_weight_kg,
            "total_points_awarded": points_awarded,
            "items": items,
            "notes": e.notes,
            "immutable_ledger_locked": True,
        })

    return {"total": total, "collections": results}


@router.post("/supervisors")
def create_supervisor_admin(
    payload: AdminSupervisorCreateRequest,
    current_admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Super-Admin endpoint to directly create a field supervisor account with a
    designated Staff ID and ward assignment.
    """
    ward = db.query(Ward).filter(Ward.id == payload.ward_id).first()
    if not ward:
        raise HTTPException(status_code=404, detail="Assigned ward does not exist.")

    existing_profile = db.query(UserProfile).filter(func.lower(UserProfile.email) == payload.email.strip().lower()).first()
    if existing_profile:
        raise HTTPException(status_code=400, detail=f"Email '{payload.email}' is already registered.")

    staff_id = payload.staff_id.strip() if payload.staff_id else None
    if not staff_id:
        count = db.query(User).filter(User.role == "SUPERVISOR").count() + 1
        staff_id = f"GP-SUP-{count:03d}"

    existing_staff = db.query(User).filter(User.greenpay_id == staff_id).first()
    if existing_staff:
        raise HTTPException(status_code=400, detail=f"Staff ID '{staff_id}' is already assigned.")

    pw_hash = hash_password(payload.password)
    user = User(
        greenpay_id=staff_id,
        password_hash=pw_hash,
        role="SUPERVISOR",
        status="ACTIVE",
    )
    db.add(user)
    db.flush()

    profile = UserProfile(
        user_id=user.id,
        name=payload.name.strip(),
        email=payload.email.strip().lower(),
        phone_number=payload.phone_number.strip() if payload.phone_number else None,
        ward_id=ward.id,
    )
    db.add(profile)

    AuditService.log_action(
        db,
        actor_id=current_admin.id,
        actor_role=current_admin.role,
        action="SUPERVISOR_ACCOUNT_CREATED",
        affected_entity_type="User",
        affected_entity_id=user.id,
        diff={"staff_id": staff_id, "name": payload.name, "email": payload.email, "ward": ward.name},
    )

    db.commit()
    db.refresh(user)

    return {
        "id": user.id,
        "greenpay_id": user.greenpay_id,
        "name": profile.name,
        "email": profile.email,
        "ward_name": ward.name,
        "status": user.status,
    }


@router.patch("/supervisors/{supervisor_id}/staff-id")
def update_supervisor_staff_id(
    supervisor_id: str,
    payload: AdminSupervisorStaffIdUpdateRequest,
    current_admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Super-Admin endpoint to assign or modify a supervisor's unique Staff ID.
    """
    sup = db.query(User).filter(User.id == supervisor_id, User.role == "SUPERVISOR").first()
    if not sup:
        raise HTTPException(status_code=404, detail="Supervisor not found.")

    new_staff_id = payload.staff_id.strip()
    if new_staff_id != sup.greenpay_id:
        existing = db.query(User).filter(User.greenpay_id == new_staff_id, User.id != sup.id).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Staff ID '{new_staff_id}' is already assigned to another user.")

        old_id = sup.greenpay_id
        sup.greenpay_id = new_staff_id

        AuditService.log_action(
            db,
            actor_id=current_admin.id,
            actor_role=current_admin.role,
            action="SUPERVISOR_STAFF_ID_UPDATED",
            affected_entity_type="User",
            affected_entity_id=sup.id,
            diff={"old_staff_id": old_id, "new_staff_id": new_staff_id, "reason": payload.reason},
        )
        db.commit()
        db.refresh(sup)

    return {"id": sup.id, "greenpay_id": sup.greenpay_id, "message": "Staff ID updated successfully."}





