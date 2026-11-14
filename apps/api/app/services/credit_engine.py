from typing import Tuple
from sqlalchemy.orm import Session
from app.models.reward_schedule import RewardSchedule
from app.models.credit_ledger import CreditTransaction

class CreditEngine:
    @staticmethod
    def get_active_schedule(db: Session) -> RewardSchedule:
        schedule = (
            db.query(RewardSchedule)
            .filter(RewardSchedule.is_active == True)
            .order_by(RewardSchedule.version.desc())
            .first()
        )
        if not schedule:
            # Default fallback schedule (v1)
            schedule = RewardSchedule(
                version=1,
                wet_rate=5.0,
                dry_rate=10.0,
                hazardous_rate=15.0,
                ewaste_rate=20.0,
                is_active=True,
                change_reason="Initial default schedule"
            )
            db.add(schedule)
            db.commit()
            db.refresh(schedule)
        return schedule

    @classmethod
    def calculate_credits(
        cls,
        db: Session,
        wet_kg: float,
        dry_kg: float,
        hazardous_kg: float,
        ewaste_kg: float
    ) -> Tuple[float, str, int]:
        """
        Calculates Green Credits earned and returns:
        (total_credits, calculation_formula_string, schedule_version)
        """
        schedule = cls.get_active_schedule(db)
        
        wet_credits = round(wet_kg * schedule.wet_rate, 2)
        dry_credits = round(dry_kg * schedule.dry_rate, 2)
        hazardous_credits = round(hazardous_kg * schedule.hazardous_rate, 2)
        ewaste_credits = round(ewaste_kg * schedule.ewaste_rate, 2)
        
        total = round(wet_credits + dry_credits + hazardous_credits + ewaste_credits, 2)
        
        # Build transparent mathematical formula string
        formula_parts = []
        if dry_kg > 0:
            formula_parts.append(f"{dry_kg:.2f} kg (Dry) × {schedule.dry_rate:.0f} pts/kg = {dry_credits:.1f}")
        if wet_kg > 0:
            formula_parts.append(f"{wet_kg:.2f} kg (Wet) × {schedule.wet_rate:.0f} pts/kg = {wet_credits:.1f}")
        if hazardous_kg > 0:
            formula_parts.append(f"{hazardous_kg:.2f} kg (Hazardous) × {schedule.hazardous_rate:.0f} pts/kg = {hazardous_credits:.1f}")
        if ewaste_kg > 0:
            formula_parts.append(f"{ewaste_kg:.2f} kg (E-Waste) × {schedule.ewaste_rate:.0f} pts/kg = {ewaste_credits:.1f}")
            
        formula_str = " + ".join(formula_parts) if formula_parts else "0.00 kg = 0.0 pts"
        formula_str += f" -> Total: {total:.1f} Green Credits (v{schedule.version})"
        
        return total, formula_str, schedule.version

    @classmethod
    def issue_credits_for_waste(
        cls,
        db: Session,
        user_id: str,
        waste_entry_id: str,
        wet_kg: float,
        dry_kg: float,
        hazardous_kg: float,
        ewaste_kg: float
    ) -> CreditTransaction:
        """
        Inserts an append-only row into credit_transactions.
        """
        credits_amount, formula, version = cls.calculate_credits(
            db, wet_kg, dry_kg, hazardous_kg, ewaste_kg
        )
        
        transaction = CreditTransaction(
            user_id=user_id,
            waste_entry_id=waste_entry_id,
            schedule_version=version,
            credits_amount=credits_amount,
            calculation_formula=formula,
            is_reversal=False
        )
        db.add(transaction)
        db.flush()
        return transaction
