import math
from typing import Optional
from datetime import timedelta
from sqlalchemy.orm import Session
from app.models.waste import WasteEntry
from app.models.anomaly import AnomalyFlag
from app.models.user import User

class AnomalyDetector:
    MIN_SAMPLE_SIZE = 5
    Z_SCORE_THRESHOLD = 2.5

    @classmethod
    def inspect_weighment(
        cls,
        db: Session,
        waste_entry: WasteEntry,
        user: User
    ) -> Optional[AnomalyFlag]:
        """
        Evaluates a newly submitted weighment against household rolling history and ward baselines.
        Flags unusual spikes for supervisor review. NEVER auto-penalises.
        """
        current_weight = waste_entry.total_weight_kg

        # 1. Duplicate-like submission check (same user & similar weight within 30 mins)
        time_threshold = waste_entry.collection_date - timedelta(minutes=30)
        recent_duplicate = (
            db.query(WasteEntry)
            .filter(
                WasteEntry.user_id == user.id,
                WasteEntry.id != waste_entry.id,
                WasteEntry.collection_date >= time_threshold,
                WasteEntry.total_weight_kg >= current_weight - 0.5,
                WasteEntry.total_weight_kg <= current_weight + 0.5,
            )
            .first()
        )
        if recent_duplicate:
            anomaly = AnomalyFlag(
                waste_entry_id=waste_entry.id,
                user_id=user.id,
                ward_id=waste_entry.ward_id,
                anomaly_type="DUPLICATE_LIKE",
                description=(
                    f"Possible duplicate submission: {current_weight:.2f} kg logged within 30 minutes "
                    f"of earlier {recent_duplicate.total_weight_kg:.2f} kg entry."
                ),
                severity="MEDIUM",
                status="PENDING_REVIEW"
            )
            db.add(anomaly)
            db.flush()
            return anomaly

        # 2. Check household historical sample size
        past_hh_entries = (
            db.query(WasteEntry)
            .filter(
                WasteEntry.user_id == user.id,
                WasteEntry.id != waste_entry.id
            )
            .order_by(WasteEntry.collection_date.desc())
            .limit(20)
            .all()
        )

        if len(past_hh_entries) >= cls.MIN_SAMPLE_SIZE:
            # Sufficient household sample: Compute rolling z-score
            weights = [e.total_weight_kg for e in past_hh_entries]
            mean_hh = sum(weights) / len(weights)
            variance_hh = sum((w - mean_hh) ** 2 for w in weights) / len(weights)
            std_hh = math.sqrt(variance_hh)

            if std_hh > 0.2:
                z_hh = (current_weight - mean_hh) / std_hh
                if z_hh >= cls.Z_SCORE_THRESHOLD:
                    anomaly = AnomalyFlag(
                        waste_entry_id=waste_entry.id,
                        user_id=user.id,
                        ward_id=waste_entry.ward_id,
                        anomaly_type="ROLLING_Z_SCORE_SPIKE",
                        z_score_household=round(z_hh, 2),
                        description=(
                            f"Household volume spike: Logged {current_weight:.2f} kg is {z_hh:.2f} standard deviations "
                            f"above household rolling average of {mean_hh:.2f} kg (±{std_hh:.2f} kg, N={len(weights)})."
                        ),
                        severity="HIGH" if z_hh >= 3.5 else "MEDIUM",
                        status="PENDING_REVIEW"
                    )
                    db.add(anomaly)
                    db.flush()
                    return anomaly
        else:
            # Insufficient household sample (N < 5): Fallback to Ward Baseline
            ward_entries = (
                db.query(WasteEntry)
                .filter(
                    WasteEntry.ward_id == waste_entry.ward_id,
                    WasteEntry.id != waste_entry.id
                )
                .order_by(WasteEntry.collection_date.desc())
                .limit(50)
                .all()
            )

            if len(ward_entries) >= cls.MIN_SAMPLE_SIZE:
                ward_weights = [e.total_weight_kg for e in ward_entries]
                mean_ward = sum(ward_weights) / len(ward_weights)
                var_ward = sum((w - mean_ward) ** 2 for w in ward_weights) / len(ward_weights)
                std_ward = math.sqrt(var_ward)

                if std_ward > 0.5:
                    z_ward = (current_weight - mean_ward) / std_ward
                    if z_ward >= cls.Z_SCORE_THRESHOLD:
                        anomaly = AnomalyFlag(
                            waste_entry_id=waste_entry.id,
                            user_id=user.id,
                            ward_id=waste_entry.ward_id,
                            anomaly_type="WARD_BASELINE_SPIKE",
                            z_score_ward=round(z_ward, 2),
                            description=(
                                f"Ward baseline volume spike: New household (<5 collections) logged {current_weight:.2f} kg, "
                                f"which is {z_ward:.2f} standard deviations above ward average of {mean_ward:.2f} kg (N={len(ward_weights)})."
                            ),
                            severity="HIGH" if z_ward >= 3.5 else "MEDIUM",
                            status="PENDING_REVIEW"
                        )
                        db.add(anomaly)
                        db.flush()
                        return anomaly

        return None
