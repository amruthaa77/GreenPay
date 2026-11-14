from typing import Dict, Any, List
from datetime import datetime
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.waste import WasteEntry

class PredictiveService:
    MIN_MONTHS_REQUIRED = 6

    @classmethod
    def generate_waste_forecast(cls, db: Session, ward_id: str = None) -> Dict[str, Any]:
        """
        Calculates monthly historical collection aggregates and performs Ordinary Least Squares
        (OLS) time-series regression with a mathematically computed prediction interval.
        Strictly requires >= 6 months of historical data per specification.
        """
        query = db.query(WasteEntry)
        if ward_id:
            query = query.filter(WasteEntry.ward_id == ward_id)
            
        entries = query.order_by(WasteEntry.collection_date.asc()).all()
        
        # Aggregate weights by Month Key (YYYY-MM)
        monthly_map: Dict[str, float] = {}
        for e in entries:
            m_key = e.collection_date.strftime("%Y-%m")
            monthly_map[m_key] = monthly_map.get(m_key, 0.0) + e.total_weight_kg
            
        sorted_months = sorted(monthly_map.keys())
        n = len(sorted_months)
        
        # Check requirement: >= 6 months of data
        if n < cls.MIN_MONTHS_REQUIRED:
            return {
                "status": "insufficient_data",
                "available_months": n,
                "required_months": cls.MIN_MONTHS_REQUIRED,
                "message": (
                    f"Insufficient historical data: Only {n} month(s) recorded. "
                    f"At least {cls.MIN_MONTHS_REQUIRED} months of verified municipal collection data "
                    f"are required to compute defensible OLS time-series projections."
                ),
                "points": [
                    {
                        "month": datetime.strptime(m, "%Y-%m").strftime("%b %Y"),
                        "actual_kg": round(monthly_map[m], 1),
                        "forecast_kg": None,
                        "confidence_lower": None,
                        "confidence_upper": None,
                    }
                    for m in sorted_months
                ],
                "next_month_estimate_kg": None,
                "lower_bound_kg": None,
                "upper_bound_kg": None,
                "is_estimate": True,
            }
            
        # Perform OLS regression
        x = np.arange(n, dtype=float)
        y = np.array([monthly_map[m] for m in sorted_months], dtype=float)
        
        x_mean = np.mean(x)
        y_mean = np.mean(y)
        
        s_xx = np.sum((x - x_mean) ** 2)
        s_xy = np.sum((x - x_mean) * (y - y_mean))
        
        slope = float(s_xy / s_xx) if s_xx > 0 else 0.0
        intercept = float(y_mean - (slope * x_mean))
        
        y_pred = slope * x + intercept
        residuals = y - y_pred
        ss_res = np.sum(residuals ** 2)
        ss_tot = np.sum((y - y_mean) ** 2)
        r_squared = float(1 - (ss_res / ss_tot)) if ss_tot > 0 else 0.0
        
        # Residual standard error: s_e = sqrt(SS_res / (n - 2))
        degrees_of_freedom = max(1, n - 2)
        s_e = float(np.sqrt(ss_res / degrees_of_freedom))
        
        # Forecast for next month: x_0 = n
        x_0 = float(n)
        forecast_raw = float(slope * x_0 + intercept)
        forecast_val = max(100.0, round(forecast_raw, 1))
        
        # Prediction Standard Error for individual new observation:
        # SE(y_0) = s_e * sqrt(1 + 1/n + (x_0 - x_mean)^2 / S_xx)
        se_pred = s_e * np.sqrt(1.0 + (1.0 / n) + (((x_0 - x_mean) ** 2) / (s_xx if s_xx > 0 else 1.0)))
        
        # Critical value t for ~95% confidence interval (approximated ~2.1)
        t_crit = 2.15
        lower_bound = max(0.0, round(forecast_val - (t_crit * se_pred), 1))
        upper_bound = round(forecast_val + (t_crit * se_pred), 1)
        
        # Build points for chart
        points: List[Dict[str, Any]] = []
        for i, m in enumerate(sorted_months):
            points.append({
                "month": datetime.strptime(m, "%Y-%m").strftime("%b %Y"),
                "actual_kg": round(monthly_map[m], 1),
                "forecast_kg": None,
                "confidence_lower": None,
                "confidence_upper": None,
            })
            
        # Determine next month name
        last_dt = datetime.strptime(sorted_months[-1], "%Y-%m")
        if last_dt.month == 12:
            next_dt = last_dt.replace(year=last_dt.year + 1, month=1)
        else:
            next_dt = last_dt.replace(month=last_dt.month + 1)
        next_month_label = next_dt.strftime("%b %Y (Estimate)")
        
        points.append({
            "month": next_month_label,
            "actual_kg": None,
            "forecast_kg": forecast_val,
            "confidence_lower": lower_bound,
            "confidence_upper": upper_bound,
        })
        
        trend_pct = round(((forecast_val - y[-1]) / max(y[-1], 1.0)) * 100, 1)
        
        return {
            "status": "ok",
            "is_estimate": True,
            "available_months": n,
            "points": points,
            "next_month_estimate_kg": forecast_val,
            "lower_bound_kg": lower_bound,
            "upper_bound_kg": upper_bound,
            "trend_percentage": trend_pct,
            "r_squared": round(max(0.0, r_squared), 3),
            "methodology": "Ordinary Least Squares (OLS) time-series linear trend with 95% statistical prediction interval. Clearly labelled as estimate."
        }
