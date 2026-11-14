from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.citizen import router as citizen_router
from app.api.v1.supervisor import router as supervisor_router
from app.api.v1.admin import router as admin_router
from app.api.v1.public import router as public_router
from app.api.v1.waste_categories import router as waste_router

api_v1_router = APIRouter()
api_v1_router.include_router(auth_router)
api_v1_router.include_router(citizen_router)
api_v1_router.include_router(supervisor_router)
api_v1_router.include_router(admin_router)
api_v1_router.include_router(public_router)
api_v1_router.include_router(waste_router)
