import uuid
import secrets
from datetime import datetime, timezone
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import require_supervisor
from app.core.security import decrypt_meter_number, mask_meter_number
from app.models.user import User
from app.models.waste import WasteEntry
from app.models.credit_ledger import CreditTransaction
from app.models.audit import AuditLog
from app.schemas.waste import (
    WeighmentCreateRequest,
    WeighmentPreviewRequest,
    WeighmentPreviewResponse,
    WasteEntryResponse,
    OfflineSyncRequest,
    OfflineSyncResult
)
from app.schemas.dry_waste import (
    DryWasteCollectionCreateRequest,
    DryWasteCollectionResponse,
)
from app.services.dry_waste_engine import DryWasteEngine
from app.services.credit_engine import CreditEngine
from app.services.green_score_engine import GreenScoreEngine
from app.services.anomaly_service import AnomalyDetector
from app.services.audit_service import AuditService

router = APIRouter(prefix="/supervisor", tags=["Supervisor Field Portal"])

@router.get("/lookup-citizen/{greenpay_id}")
def lookup_citizen_by_id(
    greenpay_id: str,
    current_supervisor: User = Depends(require_supervisor),
    db: Session = Depends(get_db)
):
    clean_id = greenpay_id.strip()
    if clean_id.startswith("{") and "greenpay_id" in clean_id.lower():
        try:
            import json
            data = json.loads(clean_id)
            clean_id = data.get("greenpay_id", clean_id)
        except Exception:
            pass
    if clean_id.upper().startswith("GREENPAY:"):
        clean_id = clean_id[9:]
    clean_id = clean_id.strip().upper()
    citizen = db.query(User).filter(User.greenpay_id == clean_id).first()
    if not citizen:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No citizen record found with GreenPay ID '{clean_id}'."
        )
        
    if current_supervisor.is_demo and not citizen.is_demo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Demo supervisors are isolated to demo citizen accounts and cannot view real citizen records."
        )
        
    masked_meter = "[MASKED]"
    if citizen.meter_number_encrypted:
        masked_meter = mask_meter_number(decrypt_meter_number(citizen.meter_number_encrypted))
        
    profile = citizen.profile
    ward_name = profile.ward.name if profile and profile.ward else "Unassigned Ward"
    
    return {
        "citizen_id": citizen.id,
        "greenpay_id": citizen.greenpay_id,
        "name": profile.name if profile else "Citizen",
        "masked_meter": masked_meter,
        "ward_name": ward_name,
        "green_score": profile.green_score if profile else 50.0,
        "account_status": citizen.status # PENDING or ACTIVE
    }

@router.post("/activate-citizen/{greenpay_id}")
def activate_pending_citizen(
    greenpay_id: str,
    request: Request,
    current_supervisor: User = Depends(require_supervisor),
    db: Session = Depends(get_db)
):
    """
    Confirms citizen identity at first doorstep collection (Amendment #3).
    Activates the pending citizen account so collections can earn credits.
    """
    clean_id = greenpay_id.strip()
    if clean_id.startswith("{") and "greenpay_id" in clean_id.lower():
        try:
            import json
            data = json.loads(clean_id)
            clean_id = data.get("greenpay_id", clean_id)
        except Exception:
            pass
    if clean_id.upper().startswith("GREENPAY:"):
        clean_id = clean_id[9:]
    clean_id = clean_id.strip().upper()
    citizen = db.query(User).filter(User.greenpay_id == clean_id).first()
    if not citizen:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Citizen '{clean_id}' not found."
        )
    if current_supervisor.is_demo and not citizen.is_demo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Demo supervisors cannot activate genuine citizen accounts."
        )
    if citizen.status == "ACTIVE":
        return {"message": "Citizen identity is already verified and active.", "status": "ACTIVE"}
        
    citizen.status = "ACTIVE"
    client_ip = request.client.host if request.client else None
    
    AuditService.log_action(
        db,
        actor_id=current_supervisor.id,
        actor_role=current_supervisor.role,
        action="DOORSTEP_CITIZEN_ACTIVATION",
        affected_entity_type="User",
        affected_entity_id=citizen.id,
        diff={"greenpay_id": clean_id, "previous_status": "PENDING", "new_status": "ACTIVE"},
        ip_address=client_ip
    )
    db.commit()
    return {"message": f"Citizen '{clean_id}' successfully verified and activated.", "status": "ACTIVE"}

@router.post("/preview-weighment", response_model=WeighmentPreviewResponse)
def preview_weighment_credits(
    payload: WeighmentPreviewRequest,
    current_supervisor: User = Depends(require_supervisor),
    db: Session = Depends(get_db)
):
    total_credits, formula, _ = CreditEngine.calculate_credits(
        db, payload.wet_kg, payload.dry_kg, payload.hazardous_kg, payload.ewaste_kg
    )
    total_wt = round(payload.wet_kg + payload.dry_kg + payload.hazardous_kg + payload.ewaste_kg, 2)
    return WeighmentPreviewResponse(
        wet_kg=payload.wet_kg,
        dry_kg=payload.dry_kg,
        hazardous_kg=payload.hazardous_kg,
        ewaste_kg=payload.ewaste_kg,
        total_weight_kg=total_wt,
        estimated_credits=total_credits,
        calculation_formula=formula
    )

def _process_weighment_entry(
    db: Session,
    payload: WeighmentCreateRequest,
    supervisor: User,
    client_ip: str = None
) -> WasteEntryResponse:
    # 1. Lookup citizen
    citizen = db.query(User).filter(User.greenpay_id == payload.greenpay_id.strip().upper()).first()
    if not citizen:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Citizen '{payload.greenpay_id}' does not exist."
        )

    if supervisor.is_demo and not citizen.is_demo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Demo supervisors cannot log weighments for genuine citizens."
        )
        
    # 2. Check identity binding: PENDING accounts cannot be issued credits (Amendment #3)
    if citizen.status == "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Citizen account is pending doorstep identity confirmation. Please activate citizen identity before logging collections."
        )
    if citizen.status == "DELETED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot log weighment for an account that has been deleted."
        )
        
    # 3. Idempotency check for offline sync
    if payload.idempotency_key:
        existing = db.query(WasteEntry).filter(WasteEntry.idempotency_key == payload.idempotency_key).first()
        if existing:
            credits_earned = sum(tx.credits_amount for tx in existing.credit_transactions if not tx.is_reversal)
            return WasteEntryResponse(
                id=existing.id,
                transaction_id=existing.transaction_id,
                greenpay_id=citizen.greenpay_id,
                citizen_name=citizen.profile.name if citizen.profile else "Citizen",
                ward_name=existing.ward.name if existing.ward else "Ward",
                wet_kg=existing.wet_kg,
                dry_kg=existing.dry_kg,
                hazardous_kg=existing.hazardous_kg,
                ewaste_kg=existing.ewaste_kg,
                total_weight_kg=existing.total_weight_kg,
                journey_stage=existing.journey_stage,
                collection_date=existing.collection_date,
                credits_earned=credits_earned,
                notes=existing.notes
            )

    total_weight = round(payload.wet_kg + payload.dry_kg + payload.hazardous_kg + payload.ewaste_kg, 2)
    if total_weight <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Total waste weight must be greater than 0 kg."
        )

    ward_id = citizen.profile.ward_id if citizen.profile else supervisor.profile.ward_id
    transaction_id = f"GP-REC-2026-{secrets.randbelow(90000) + 10000}"

    # Create waste collection record
    waste_entry = WasteEntry(
        transaction_id=transaction_id,
        idempotency_key=payload.idempotency_key,
        user_id=citizen.id,
        supervisor_id=supervisor.id,
        ward_id=ward_id,
        wet_kg=payload.wet_kg,
        dry_kg=payload.dry_kg,
        hazardous_kg=payload.hazardous_kg,
        ewaste_kg=payload.ewaste_kg,
        total_weight_kg=total_weight,
        journey_stage="Collection",
        notes=payload.notes,
        is_demo=bool(supervisor.is_demo or citizen.is_demo)
    )
    db.add(waste_entry)
    db.flush()

    # Issue append-only credits
    credit_tx = CreditEngine.issue_credits_for_waste(
        db,
        user_id=citizen.id,
        waste_entry_id=waste_entry.id,
        wet_kg=payload.wet_kg,
        dry_kg=payload.dry_kg,
        hazardous_kg=payload.hazardous_kg,
        ewaste_kg=payload.ewaste_kg
    )

    # Check for statistical anomaly (never auto-penalizes)
    AnomalyDetector.inspect_weighment(db, waste_entry, citizen)

    # Re-calculate citizen Green Score
    GreenScoreEngine.calculate_score_for_user(db, citizen)

    # Audit log
    AuditService.log_action(
        db,
        actor_id=supervisor.id,
        actor_role=supervisor.role,
        action="LOG_WEIGHMENT",
        affected_entity_type="WasteEntry",
        affected_entity_id=waste_entry.id,
        diff={
            "transaction_id": transaction_id,
            "weights": {"wet": payload.wet_kg, "dry": payload.dry_kg, "hazardous": payload.hazardous_kg, "ewaste": payload.ewaste_kg},
            "credits_earned": credit_tx.credits_amount
        },
        ip_address=client_ip
    )
    db.commit()
    db.refresh(waste_entry)

    return WasteEntryResponse(
        id=waste_entry.id,
        transaction_id=waste_entry.transaction_id,
        greenpay_id=citizen.greenpay_id,
        citizen_name=citizen.profile.name if citizen.profile else "Citizen",
        ward_name=waste_entry.ward.name if waste_entry.ward else "Ward",
        wet_kg=waste_entry.wet_kg,
        dry_kg=waste_entry.dry_kg,
        hazardous_kg=waste_entry.hazardous_kg,
        ewaste_kg=waste_entry.ewaste_kg,
        total_weight_kg=waste_entry.total_weight_kg,
        journey_stage=waste_entry.journey_stage,
        collection_date=waste_entry.collection_date,
        credits_earned=credit_tx.credits_amount,
        notes=waste_entry.notes
    )

@router.post("/weighment", response_model=WasteEntryResponse)
@router.post("/waste", response_model=WasteEntryResponse)
def record_weighment(
    payload: WeighmentCreateRequest,
    request: Request,
    current_supervisor: User = Depends(require_supervisor),
    db: Session = Depends(get_db)
):
    client_ip = request.client.host if request.client else None
    return _process_weighment_entry(db, payload, current_supervisor, client_ip)

@router.post("/sync-offline", response_model=OfflineSyncResult)
def sync_offline_queue(
    payload: OfflineSyncRequest,
    request: Request,
    current_supervisor: User = Depends(require_supervisor),
    db: Session = Depends(get_db)
):
    """
    Synchronizes offline weighment entries recorded during flaky connectivity.
    Handles rejected items (unknown ID, pending account) with structured reasons
    for conflict-resolution UI (Amendment #8).
    """
    synced: List[WasteEntryResponse] = []
    rejected: List[Dict[str, Any]] = []
    client_ip = request.client.host if request.client else None

    for entry in payload.entries:
        try:
            res = _process_weighment_entry(db, entry, current_supervisor, client_ip)
            synced.append(res)
        except HTTPException as ex:
            db.rollback()
            reason_code = "SYNC_ERROR"
            if ex.status_code == status.HTTP_404_NOT_FOUND:
                reason_code = "UNKNOWN_CITIZEN_ID"
            elif "pending" in ex.detail.lower():
                reason_code = "CITIZEN_ACCOUNT_PENDING"
            elif "deleted" in ex.detail.lower():
                reason_code = "CITIZEN_ACCOUNT_DELETED"
                
            rejected.append({
                "greenpay_id": entry.greenpay_id,
                "idempotency_key": entry.idempotency_key,
                "weights": {"wet": entry.wet_kg, "dry": entry.dry_kg, "hazardous": entry.hazardous_kg, "ewaste": entry.ewaste_kg},
                "reason_code": reason_code,
                "detail": ex.detail
            })
        except Exception as e:
            db.rollback()
            rejected.append({
                "greenpay_id": entry.greenpay_id,
                "idempotency_key": entry.idempotency_key,
                "reason_code": "SYSTEM_EXCEPTION",
                "detail": str(e)
            })

    return OfflineSyncResult(synced=synced, rejected=rejected)


@router.post("/dry-waste-collection", response_model=DryWasteCollectionResponse)
def record_dry_waste_collection(
    payload: DryWasteCollectionCreateRequest,
    request: Request,
    current_supervisor: User = Depends(require_supervisor),
    db: Session = Depends(get_db)
):
    """
    Staff-authorized doorstep dry waste collection recording.
    Supports itemized dry-waste categories, authoritative server calculation,
    rate snapshots, idempotency, and atomic credit ledger issuance.
    """
    client_ip = request.client.host if request.client else None
    return DryWasteEngine.record_collection(
        db,
        payload=payload,
        supervisor=current_supervisor,
        client_ip=client_ip
    )


@router.get("/dry-waste-collection/{transaction_id}", response_model=DryWasteCollectionResponse)
def get_dry_waste_collection_detail(
    transaction_id: str,
    current_supervisor: User = Depends(require_supervisor),
    db: Session = Depends(get_db)
):
    """
    Retrieves full details of a verified dry waste collection by transaction reference.
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
            detail=f"Collection transaction '{transaction_id}' not found."
        )
    return DryWasteEngine._build_response(entry, entry.user, entry.supervisor)
