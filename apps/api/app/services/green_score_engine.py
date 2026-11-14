from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.waste import WasteEntry
from app.models.user import User

class GreenScoreEngine:
    @staticmethod
    def calculate_score_for_user(db: Session, user: User) -> Dict[str, Any]:
        """
        Computes explainable 0–100 Green Score based on 3 civic dimensions:
        1. Segregation Purity (0–40 pts): Proper separation of dry/wet/ewaste.
        2. Collection Consistency (0–30 pts): Regular handovers & weekly streaks.
        3. Landfill Diversion (0–30 pts): Proportion of dry & ewaste diverted from dump sites.
        """
        entries = (
            db.query(WasteEntry)
            .filter(WasteEntry.user_id == user.id)
            .order_by(WasteEntry.collection_date.desc())
            .limit(20)
            .all()
        )
        
        if not entries:
            # Baseline score for newly onboarded citizens
            return {
                "total_score": 50.0,
                "segregation_score": 20.0,
                "consistency_score": 15.0,
                "diversion_score": 15.0,
                "level_label": "Getting Started",
                "tips": [
                    "Complete your first verified doorstep collection to raise your score.",
                    "Ensure dry waste is rinsed and kept separate from wet kitchen waste."
                ]
            }
            
        total_wet = sum(e.wet_kg for e in entries)
        total_dry = sum(e.dry_kg for e in entries)
        total_hazardous = sum(e.hazardous_kg for e in entries)
        total_ewaste = sum(e.ewaste_kg for e in entries)
        total_weight = total_wet + total_dry + total_hazardous + total_ewaste
        
        # 1. Segregation Purity (0–40): Reward balanced segregation, penalize high hazardous contamination
        if total_weight > 0:
            hazardous_ratio = total_hazardous / total_weight
            # Ideal household ratio: ~60% wet, ~35% dry, minimal hazardous (<5%)
            purity_factor = max(0.0, 1.0 - (hazardous_ratio * 3.0))
            segregation_score = round(purity_factor * 40.0, 1)
        else:
            segregation_score = 20.0
            
        # 2. Consistency (0–30): Reward regular collections (e.g. 1 collection/week = high consistency)
        streak = user.profile.streak_weeks if user.profile else 1
        consistency_score = min(30.0, round(10.0 + (min(streak, 10) * 2.0), 1))
        
        # 3. Landfill Diversion (0–30): Dry and e-waste divert completely from landfills
        if total_weight > 0:
            diversion_ratio = (total_dry + total_ewaste) / total_weight
            diversion_score = round(min(30.0, diversion_ratio * 50.0), 1)
        else:
            diversion_score = 15.0
            
        total_score = round(min(100.0, max(0.0, segregation_score + consistency_score + diversion_score)), 1)
        
        # Determine Badge / Level
        if total_score >= 85:
            level_label = "Eco Champion"
        elif total_score >= 70:
            level_label = "Consistent Recycler"
        elif total_score >= 55:
            level_label = "Active Contributor"
        else:
            level_label = "Improving Citizen"
            
        tips: List[str] = []
        if segregation_score < 30:
            tips.append("Separate dry packaging waste into a dedicated bin to improve your Purity Score.")
        if consistency_score < 20:
            tips.append("Maintain weekly door-to-door handovers to build your consistency streak.")
        if diversion_score < 20:
            tips.append("Hand over electronic waste (batteries, old chargers) during scheduled monthly e-waste drives.")
        if not tips:
            tips.append("Outstanding segregation! You are in the top tier of Bengaluru responsible citizens.")
            
        # Update user profile score
        if user.profile:
            user.profile.green_score = total_score
            db.flush()
            
        return {
            "total_score": total_score,
            "segregation_score": segregation_score,
            "consistency_score": consistency_score,
            "diversion_score": diversion_score,
            "level_label": level_label,
            "tips": tips
        }
