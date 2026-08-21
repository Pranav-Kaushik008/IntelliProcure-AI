"""IntelliProcure AI – Supplier Ratings stub routes"""
from fastapi import APIRouter, Depends
from app.core.security import get_current_active_user

router = APIRouter()

@router.get("/")
async def list_supplier_ratings(current_user=Depends(get_current_active_user)):
    return []
