from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.dry_waste import DryWasteCategory
from app.schemas.dry_waste import DryWasteCategoryResponse
from app.services.dry_waste_engine import DryWasteEngine

router = APIRouter(prefix="/waste", tags=["Waste Categories & Tariffs"])


@router.get("/categories", response_model=List[DryWasteCategoryResponse])
def list_dry_waste_categories(db: Session = Depends(get_db)):
    """
    Returns all active dry-waste categories with their current Green Points rate per kg.
    Open to citizens, field staff, and municipal transparency platforms.
    """
    return DryWasteEngine.get_active_categories(db)


@router.get("/categories/{identifier}", response_model=DryWasteCategoryResponse)
def get_dry_waste_category(identifier: str, db: Session = Depends(get_db)):
    """
    Retrieves a single dry-waste category by its unique code (e.g. 'pet_bottles') or UUID.
    """
    cat = DryWasteEngine.get_category_by_code_or_id(db, identifier)
    if not cat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dry-waste category '{identifier}' not found."
        )
    return cat
