"""IntelliProcure AI – Departments API Routes"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.database.session import get_db
from app.core.security import require_internal_user, require_admin
from app.models.rfq import Department

router = APIRouter()

@router.get("/")
async def list_departments(
    db: Session = Depends(get_db),
    current_user=Depends(require_internal_user)
):
    """List all enterprise departments."""
    depts = db.query(Department).all()
    if not depts:
        # Fallback default enterprise departments
        return [
            {"id": "1", "name": "Information Technology", "code": "IT", "budget_annual": 5000000},
            {"id": "2", "name": "Operations", "code": "OPS", "budget_annual": 3200000},
            {"id": "3", "name": "Human Resources", "code": "HR", "budget_annual": 1800000},
            {"id": "4", "name": "Finance", "code": "FIN", "budget_annual": 2100000},
            {"id": "5", "name": "Marketing", "code": "MKT", "budget_annual": 2500000},
        ]
    return [
        {
            "id": str(d.id),
            "name": d.name,
            "code": getattr(d, "code", d.name[:3].upper()),
            "budget_annual": float(getattr(d, "budget_annual", 0.0) or 0.0),
        }
        for d in depts
    ]

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_department(
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin)
):
    """Admin-only: Create a new department."""
    name = payload.get("name")
    if not name or len(name.strip()) < 2:
        raise HTTPException(status_code=400, detail="Department name is required (min 2 chars)")

    dept = Department(
        name=name.strip(),
        code=payload.get("code", name[:3].upper()).strip().upper(),
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return {"id": str(dept.id), "name": dept.name, "code": getattr(dept, "code", ""), "message": "Department created successfully"}

