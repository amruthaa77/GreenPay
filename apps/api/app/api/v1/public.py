from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
import csv
import io
from app.database import get_db
from app.models.ward import Ward
from app.models.waste import WasteEntry
from app.models.user import UserProfile
from app.schemas.redemption import PublicCertificateVerificationResponse
from app.schemas.dry_waste import DryWasteCategoryResponse
from app.services.redemption_service import RedemptionService
from app.services.dry_waste_engine import DryWasteEngine

router = APIRouter(prefix="/public", tags=["Public Verification & Transparency"])


@router.get("/verify-certificate/{certificate_number}", response_model=PublicCertificateVerificationResponse)
def verify_certificate_public(
    certificate_number: str,
    db: Session = Depends(get_db)
):
    """
    Public zero-auth verification endpoint. Anyone can scan a certificate QR code
    or enter the certificate number to verify civic legitimacy.
    Complies with DPDP Section 9 data minimisation (masked initials, no contact data).
    """
    data = RedemptionService.verify_certificate_public(db, certificate_number)
    return PublicCertificateVerificationResponse(**data)


@router.get("/ward-funds")
def get_public_ward_cleanup_funds(
    db: Session = Depends(get_db)
):
    """
    Public aggregate Ward Clean-Up Fund balances for all Bengaluru wards.
    """
    return RedemptionService.get_ward_cleanup_pools(db)


# =============================================================================
# Phase E: Public Open Data with N < 10 Privacy Cell Suppression
# =============================================================================

@router.get("/open-data/wards")
def get_public_open_data_wards(
    db: Session = Depends(get_db)
):
    """
    Public open data aggregate ward metrics for researchers and civic transparency.
    Strictly applies DPDP Section 9 data minimisation:
    If a ward cell has fewer than 10 households (N < 10), metrics are suppressed
    to prevent household re-identification in low-density or early pilot wards.
    """
    wards = db.query(Ward).all()
    results = []

    for w in wards:
        citizen_count = db.query(UserProfile).filter(UserProfile.ward_id == w.id).count()
        entries = db.query(WasteEntry).filter(WasteEntry.ward_id == w.id).all()

        if citizen_count < 10:
            results.append({
                "ward_id": str(w.id),
                "ward_name": w.name,
                "zone": w.zone,
                "is_suppressed": True,
                "suppression_reason": "Cell values suppressed under DPDP Section 9: fewer than 10 households in this ward cell to prevent identity re-identification.",
                "active_households": "< 10",
                "collection_count": "< 10",
                "total_collected_kg": None,
                "dry_recyclable_kg": None,
                "wet_organic_kg": None,
                "hazardous_kg": None,
                "ewaste_kg": None,
                "segregation_compliance_percentage": None,
                "is_demo_data": True,
            })
        else:
            total_kg = sum(e.total_weight_kg for e in entries)
            dry_kg = sum(e.dry_kg for e in entries)
            wet_kg = sum(e.wet_kg for e in entries)
            hazardous_kg = sum(e.hazardous_kg for e in entries)
            ewaste_kg = sum(e.ewaste_kg for e in entries)
            seg_pct = round((dry_kg + ewaste_kg) / total_kg * 100, 1) if total_kg > 0 else 0.0

            results.append({
                "ward_id": str(w.id),
                "ward_name": w.name,
                "zone": w.zone,
                "is_suppressed": False,
                "suppression_reason": None,
                "active_households": str(citizen_count),
                "collection_count": str(len(entries)),
                "total_collected_kg": round(total_kg, 1),
                "dry_recyclable_kg": round(dry_kg, 1),
                "wet_organic_kg": round(wet_kg, 1),
                "hazardous_kg": round(hazardous_kg, 1),
                "ewaste_kg": round(ewaste_kg, 1),
                "segregation_compliance_percentage": seg_pct,
                "is_demo_data": True,
            })

    return {
        "disclaimer": "Bengaluru Civic Open Data. Certified demo records. Cells with N < 10 households are suppressed per DPDP Act 2023.",
        "threshold": "N < 10 Cell Suppression Active",
        "data": results,
    }


@router.get("/open-data/monthly-trends")
def get_public_open_data_monthly_trends(
    ward_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Monthly time series for civic researchers. Buckets with < 10 collections are suppressed.
    """
    query = db.query(WasteEntry)
    if ward_id:
        query = query.filter(WasteEntry.ward_id == ward_id)
    entries = query.all()

    # Group by YYYY-MM
    monthly_buckets = {}
    for e in entries:
        if not e.collection_date:
            continue
        m_key = e.collection_date.strftime("%Y-%m")
        if m_key not in monthly_buckets:
            monthly_buckets[m_key] = []
        monthly_buckets[m_key].append(e)

    trends = []
    for m_key in sorted(monthly_buckets.keys()):
        m_entries = monthly_buckets[m_key]
        if len(m_entries) < 10:
            trends.append({
                "month": m_key,
                "is_suppressed": True,
                "suppression_reason": "Fewer than 10 collections logged in this monthly bucket.",
                "collection_count": "< 10",
                "total_kg": None,
                "dry_kg": None,
                "wet_kg": None,
            })
        else:
            t_kg = sum(x.total_weight_kg for x in m_entries)
            d_kg = sum(x.dry_kg for x in m_entries)
            w_kg = sum(x.wet_kg for x in m_entries)
            trends.append({
                "month": m_key,
                "is_suppressed": False,
                "suppression_reason": None,
                "collection_count": str(len(m_entries)),
                "total_kg": round(t_kg, 1),
                "dry_kg": round(d_kg, 1),
                "wet_kg": round(w_kg, 1),
            })

    return {
        "disclaimer": "Public monthly time series with N < 10 suppression.",
        "trends": trends,
    }


@router.get("/open-data/download-csv")
def download_public_open_data_csv(
    db: Session = Depends(get_db)
):
    """
    Downloads published ward open data in RFC 4180 CSV format with N < 10 suppression indicators.
    """
    wards = db.query(Ward).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Ward ID",
        "Ward Name",
        "Zone",
        "Active Households",
        "Total Weight (kg)",
        "Dry Recyclable (kg)",
        "Wet Organic (kg)",
        "Hazardous (kg)",
        "E-Waste (kg)",
        "Segregation Compliance (%)",
        "Privacy Status",
    ])

    for w in wards:
        citizen_count = db.query(UserProfile).filter(UserProfile.ward_id == w.id).count()
        entries = db.query(WasteEntry).filter(WasteEntry.ward_id == w.id).all()

        if citizen_count < 10:
            writer.writerow([
                w.id,
                w.name,
                w.zone,
                "< 10",
                "SUPPRESSED",
                "SUPPRESSED",
                "SUPPRESSED",
                "SUPPRESSED",
                "SUPPRESSED",
                "SUPPRESSED",
                "SUPPRESSED_DPDP_SECTION_9",
            ])
        else:
            total_kg = sum(e.total_weight_kg for e in entries)
            dry_kg = sum(e.dry_kg for e in entries)
            wet_kg = sum(e.wet_kg for e in entries)
            hazardous_kg = sum(e.hazardous_kg for e in entries)
            ewaste_kg = sum(e.ewaste_kg for e in entries)
            seg_pct = round((dry_kg + ewaste_kg) / total_kg * 100, 1) if total_kg > 0 else 0.0
            writer.writerow([
                w.id,
                w.name,
                w.zone,
                str(citizen_count),
                f"{total_kg:.1f}",
                f"{dry_kg:.1f}",
                f"{wet_kg:.1f}",
                f"{hazardous_kg:.1f}",
                f"{ewaste_kg:.1f}",
                f"{seg_pct:.1f}%",
                "PUBLISHED",
            ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="greenpay_bengaluru_open_data.csv"'}
    )


@router.get("/dry-waste-categories", response_model=List[DryWasteCategoryResponse])
def get_public_dry_waste_categories(db: Session = Depends(get_db)):
    """
    Public zero-auth tariff endpoint. Returns all active dry-waste categories
    and official municipal Green Points earning rates.
    """
    return DryWasteEngine.get_active_categories(db)


@router.get("/dry-waste-categories/{identifier}", response_model=DryWasteCategoryResponse)
def get_public_dry_waste_category_detail(identifier: str, db: Session = Depends(get_db)):
    """
    Public zero-auth endpoint to query category details by unique code or UUID.
    """
    cat = DryWasteEngine.get_category_by_code_or_id(db, identifier)
    if not cat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dry waste category '{identifier}' not found."
        )
    return cat

