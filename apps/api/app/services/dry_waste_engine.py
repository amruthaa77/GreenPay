from decimal import Decimal, ROUND_HALF_UP
import secrets
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import desc
from fastapi import HTTPException, status

from app.models.dry_waste import DryWasteCategory, DryWasteRateHistory, WasteCollectionItem
from app.models.waste import WasteEntry
from app.models.credit_ledger import CreditTransaction
from app.models.user import User
from app.models.audit import AuditLog
from app.schemas.dry_waste import (
    DryWasteItemInput,
    DryWasteCollectionCreateRequest,
    DryWasteCollectionResponse,
    DryWasteItemDetailResponse,
    CitizenPointsBalanceResponse,
    EarningHistoryItemResponse,
)
from app.services.audit_service import AuditService


class DryWasteEngine:
    """
    Authoritative server-side calculation and transaction engine for dry waste collections.
    
    Rounding Policy:
    Points are computed using Decimal arithmetic with ROUND_HALF_UP precision.
    Individual item points are computed as:
      points = (weight_kg * rate_per_kg).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    Total points for a collection are the sum of the individual quantized item points.
    Totals with exact integer representations (e.g. 88.0) are preserved.
    """

    @staticmethod
    def get_active_categories(db: Session) -> List[DryWasteCategory]:
        """Returns all active dry-waste categories in alphabetical order."""
        return (
            db.query(DryWasteCategory)
            .filter(DryWasteCategory.is_active == True)
            .order_by(DryWasteCategory.name)
            .all()
        )

    @staticmethod
    def get_category_by_code_or_id(db: Session, identifier: str) -> Optional[DryWasteCategory]:
        """Resolves category by UUID primary key or unique human-readable code slug."""
        clean = identifier.strip().lower()
        cat = db.query(DryWasteCategory).filter(DryWasteCategory.code == clean).first()
        if not cat:
            cat = db.query(DryWasteCategory).filter(DryWasteCategory.id == identifier.strip()).first()
        return cat

    @classmethod
    def calculate_collection_points(
        cls,
        db: Session,
        items: List[DryWasteItemInput]
    ) -> Tuple[List[Dict[str, Any]], float, float, str]:
        """
        Validates categories, performs Decimal arithmetic, and returns:
        (calculated_items, total_weight_kg, total_points, formula_string)
        """
        calculated_items = []
        total_weight_dec = Decimal("0.000")
        total_points_dec = Decimal("0.00")
        formula_parts = []

        for item in items:
            # 1. Validate positive weight
            if item.weight_kg <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Weight for category '{item.category_code}' must be strictly greater than 0 kg."
                )

            # 2. Resolve category
            category = cls.get_category_by_code_or_id(db, item.category_code)
            if not category:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Dry waste category '{item.category_code}' does not exist."
                )

            # 3. Reject inactive category
            if not category.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Dry waste category '{category.name}' is currently inactive and cannot earn points."
                )

            weight_dec = Decimal(str(round(item.weight_kg, 3)))
            rate_dec = Decimal(str(category.rate_per_kg))
            
            # Authoritative server-side calculation with ROUND_HALF_UP
            item_points_dec = (weight_dec * rate_dec).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            item_points_float = float(item_points_dec)

            total_weight_dec += weight_dec
            total_points_dec += item_points_dec

            # Rate display
            rate_display = f"{category.rate_per_kg:.0f}" if category.rate_per_kg.is_integer() else f"{category.rate_per_kg:.2f}"
            pts_display = f"{item_points_float:.0f}" if item_points_float.is_integer() else f"{item_points_float:.2f}"
            
            formula_parts.append(
                f"{float(weight_dec):.2f} kg ({category.name}) × {rate_display} GP/kg = {pts_display} GP"
            )

            calculated_items.append({
                "category_id": category.id,
                "category_code": category.code,
                "category_name": category.name,
                "rate_per_kg": float(category.rate_per_kg),
                "weight_kg": float(weight_dec),
                "points_earned": item_points_float,
                "category_obj": category,
            })

        total_weight = float(total_weight_dec)
        total_points = float(total_points_dec)
        total_pts_display = f"{total_points:.0f}" if total_points.is_integer() else f"{total_points:.2f}"
        formula_str = " + ".join(formula_parts) + f" -> Total: {total_pts_display} GP"

        return calculated_items, total_weight, total_points, formula_str

    @classmethod
    def record_collection(
        cls,
        db: Session,
        payload: DryWasteCollectionCreateRequest,
        supervisor: User,
        client_ip: Optional[str] = None,
    ) -> DryWasteCollectionResponse:
        """
        Executes atomic staff-authorized dry waste collection and points issuance.
        """
        # 1. Resolve citizen by GreenPay ID or meter number
        clean_id = payload.greenpay_id.strip().upper()
        citizen = (
            db.query(User)
            .filter((User.greenpay_id == clean_id) | (User.id == clean_id))
            .first()
        )
        if not citizen:
            from app.core.security import hash_meter_for_lookup
            meter_hash = hash_meter_for_lookup(clean_id)
            citizen = db.query(User).filter(User.meter_number_hash == meter_hash).first()

        if not citizen:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Citizen or household '{payload.greenpay_id}' does not exist."
            )

        # Demo isolation: Demo supervisors can only record collections for demo citizens
        if supervisor.is_demo and not citizen.is_demo:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Demo supervisors are isolated to demo citizen accounts and cannot record collections for genuine citizens."
            )

        # 2. Check household status
        if citizen.status == "PENDING":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Citizen account is pending doorstep identity confirmation. Please activate citizen identity before logging collections."
            )
        if citizen.status == "DELETED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot log collection for an account that has been deleted under DPDP Section 12."
            )

        # 3. Idempotency Check: prevent duplicate submissions
        if payload.idempotency_key:
            existing_entry = (
                db.query(WasteEntry)
                .filter(WasteEntry.idempotency_key == payload.idempotency_key)
                .first()
            )
            if existing_entry:
                return cls._build_response(existing_entry, citizen, supervisor)

        # 4. Authoritative server calculation
        calculated_items, total_weight, total_points, formula = cls.calculate_collection_points(
            db, payload.items
        )

        ward_id = citizen.profile.ward_id if citizen.profile else supervisor.profile.ward_id
        transaction_id = f"GP-REC-2026-{secrets.randbelow(90000) + 10000}"

        try:
            # 5. Create WasteEntry in single transaction
            waste_entry = WasteEntry(
                transaction_id=transaction_id,
                idempotency_key=payload.idempotency_key,
                user_id=citizen.id,
                supervisor_id=supervisor.id,
                ward_id=ward_id,
                wet_kg=0.0,
                dry_kg=total_weight,
                hazardous_kg=0.0,
                ewaste_kg=0.0,
                total_weight_kg=total_weight,
                journey_stage="Collection",
                dispute_status="PENDING_CONFIRMATION",
                notes=payload.notes,
                is_demo=bool(supervisor.is_demo or citizen.is_demo),
            )
            db.add(waste_entry)
            db.flush()

            # 6. Create WasteCollectionItem line items with rate snapshots
            for item in calculated_items:
                collection_item = WasteCollectionItem(
                    waste_entry_id=waste_entry.id,
                    category_id=item["category_id"],
                    category_code=item["category_code"],
                    category_name=item["category_name"],
                    rate_per_kg=item["rate_per_kg"],
                    weight_kg=item["weight_kg"],
                    points_earned=item["points_earned"],
                )
                db.add(collection_item)

            # 7. Issue immutable append-only Green Points to Credit Ledger
            ledger_entry = CreditTransaction(
                user_id=citizen.id,
                pseudonymous_owner=citizen.pseudonymous_id,
                waste_entry_id=waste_entry.id,
                schedule_version=1,
                credits_amount=total_points,
                calculation_formula=formula,
                is_reversal=False,
            )
            db.add(ledger_entry)

            # 8. Audit Log
            AuditService.log_action(
                db,
                actor_id=supervisor.id,
                actor_role=supervisor.role,
                action="DRY_WASTE_COLLECTION_RECORDED",
                affected_entity_type="WasteEntry",
                affected_entity_id=waste_entry.id,
                diff={
                    "transaction_id": transaction_id,
                    "citizen_id": citizen.id,
                    "total_weight_kg": total_weight,
                    "points_earned": total_points,
                    "categories_count": len(calculated_items),
                },
                ip_address=client_ip,
            )

            db.commit()
            db.refresh(waste_entry)
            return cls._build_response(waste_entry, citizen, supervisor)

        except Exception as e:
            db.rollback()
            raise e

    @staticmethod
    def _build_response(
        waste_entry: WasteEntry,
        citizen: User,
        supervisor: User,
    ) -> DryWasteCollectionResponse:
        item_responses = [
            DryWasteItemDetailResponse(
                id=item.id,
                category_id=item.category_id,
                category_code=item.category_code,
                category_name=item.category_name,
                rate_per_kg=item.rate_per_kg,
                weight_kg=item.weight_kg,
                points_earned=item.points_earned,
            )
            for item in waste_entry.collection_items
        ]

        total_pts = sum(item.points_earned for item in item_responses)
        first_tx = waste_entry.credit_transactions[0] if waste_entry.credit_transactions else None
        if not total_pts and waste_entry.credit_transactions:
            total_pts = sum(tx.credits_amount for tx in waste_entry.credit_transactions if not tx.is_reversal)
        formula = first_tx.calculation_formula if first_tx else f"{total_pts:.1f} GP"

        return DryWasteCollectionResponse(
            id=waste_entry.id,
            transaction_id=waste_entry.transaction_id,
            greenpay_id=citizen.greenpay_id if (citizen and citizen.greenpay_id) else "GP-UNASSIGNED",
            citizen_name=citizen.profile.name if (citizen and citizen.profile) else "Citizen",
            ward_name=waste_entry.ward.name if waste_entry.ward else "Bengaluru Ward",
            items=item_responses,
            total_weight_kg=waste_entry.total_weight_kg,
            total_points_earned=round(total_pts, 2),
            calculation_formula=formula,
            journey_stage=waste_entry.journey_stage,
            collection_date=waste_entry.collection_date,
            verification_status=waste_entry.dispute_status,
            supervisor_name=supervisor.profile.name if (supervisor and supervisor.profile) else "Municipal Supervisor",
            notes=waste_entry.notes,
        )

    @staticmethod
    def get_household_points_balance(db: Session, user_id: str) -> CitizenPointsBalanceResponse:
        """
        Computes accurate household balance from the immutable ledger.
        Balance reflects all verified earning transactions, reversals, and redemptions.
        """
        citizen = db.query(User).filter(User.id == user_id).first()
        if not citizen:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Citizen not found."
            )

        transactions = (
            db.query(CreditTransaction)
            .outerjoin(WasteEntry, CreditTransaction.waste_entry_id == WasteEntry.id)
            .filter(
                CreditTransaction.user_id == user_id,
                (WasteEntry.id == None) | (~WasteEntry.transaction_id.like("GP-REC-HIST-%"))
            )
            .order_by(desc(CreditTransaction.timestamp))
            .all()
        )

        total_earned = sum(tx.credits_amount for tx in transactions if tx.credits_amount > 0 and not tx.is_reversal)
        total_redeemed = sum(abs(tx.credits_amount) for tx in transactions if tx.credits_amount < 0)
        current_balance = sum(tx.credits_amount for tx in transactions)

        # Distinct verified waste entries with issued positive credits (not reversals)
        verified_entry_ids = {
            tx.waste_entry_id for tx in transactions
            if tx.waste_entry_id and tx.credits_amount > 0 and not tx.is_reversal
        }
        if verified_entry_ids:
            verified_entries = db.query(WasteEntry).filter(WasteEntry.id.in_(verified_entry_ids)).all()
            total_weight_kg = sum(e.total_weight_kg for e in verified_entries)
            weighments_count = len(verified_entries)
        else:
            total_weight_kg = 0.0
            weighments_count = 0

        last_earned_tx = next((tx for tx in transactions if tx.credits_amount > 0), None)
        last_earned_at = last_earned_tx.timestamp if last_earned_tx else None

        return CitizenPointsBalanceResponse(
            greenpay_id=citizen.greenpay_id or "GP-UNASSIGNED",
            citizen_name=citizen.profile.name if citizen.profile else "Citizen",
            ward_name=citizen.profile.ward.name if citizen.profile and citizen.profile.ward else "Bengaluru Ward",
            current_balance=round(current_balance, 2),
            total_earned=round(total_earned, 2),
            total_redeemed=round(total_redeemed, 2),
            total_weight_kg=round(total_weight_kg, 2),
            total_weighments_count=weighments_count,
            last_earned_at=last_earned_at,
        )

    @staticmethod
    def get_earning_history(
        db: Session,
        user_id: str,
        limit: int = 20,
        offset: int = 0
    ) -> List[EarningHistoryItemResponse]:
        """
        Retrieves citizen's itemized earning transactions with collection breakdown.
        """
        transactions = (
            db.query(CreditTransaction)
            .filter(CreditTransaction.user_id == user_id, CreditTransaction.credits_amount > 0)
            .order_by(desc(CreditTransaction.timestamp))
            .offset(offset)
            .limit(limit)
            .all()
        )

        results = []
        for tx in transactions:
            items = []
            if tx.waste_entry and tx.waste_entry.collection_items:
                items = [
                    DryWasteItemDetailResponse(
                        id=it.id,
                        category_id=it.category_id,
                        category_code=it.category_code,
                        category_name=it.category_name,
                        rate_per_kg=it.rate_per_kg,
                        weight_kg=it.weight_kg,
                        points_earned=it.points_earned,
                    )
                    for it in tx.waste_entry.collection_items
                ]

            tx_ref = tx.waste_entry.transaction_id if tx.waste_entry else f"GP-CREDIT-{tx.id[:8]}"
            results.append(EarningHistoryItemResponse(
                id=tx.id,
                transaction_id=tx_ref,
                timestamp=tx.timestamp,
                credits_amount=tx.credits_amount,
                calculation_formula=tx.calculation_formula,
                items=items,
            ))

        return results

    @classmethod
    def update_category_rate(
        cls,
        db: Session,
        category_id: str,
        new_rate: float,
        admin: User,
        change_reason: Optional[str] = None
    ) -> DryWasteCategory:
        """
        Allows authorized admins to update a category rate, archiving a rate history snapshot.
        """
        category = cls.get_category_by_code_or_id(db, category_id)
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Dry waste category '{category_id}' does not exist."
            )

        if new_rate <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New category rate must be strictly greater than 0 GP/kg."
            )

        previous_rate = category.rate_per_kg
        category.rate_per_kg = float(new_rate)

        # Snapshot in rate history table
        history = DryWasteRateHistory(
            category_id=category.id,
            previous_rate=previous_rate,
            new_rate=float(new_rate),
            changed_by_id=admin.id,
            change_reason=change_reason or "Administrative tariff adjustment",
        )
        db.add(history)

        AuditService.log_action(
            db,
            actor_id=admin.id,
            actor_role=admin.role,
            action="DRY_WASTE_RATE_UPDATED",
            affected_entity_type="DryWasteCategory",
            affected_entity_id=category.id,
            diff={
                "category_code": category.code,
                "previous_rate": previous_rate,
                "new_rate": float(new_rate),
                "reason": change_reason,
            },
        )

        db.commit()
        db.refresh(category)
        return category
