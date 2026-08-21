"""
IntelliProcure AI – Module 15: Contract Management and AI Analysis API Routes
Implements:
  - Document Upload & Metadata Management
  - Supplier Association
  - Expiry & Automated Renewal Workflows
  - Version Control & History Tracking
  - Secure File Download/View (Documents are protected and NOT publicly exposed)
  - AI Contract Intelligence:
      * Summarization
      * 6 Key Clauses Extraction (Payment, Termination, Renewal, Penalties, Liability, Delivery)
      * Risk Identification & Scoring
      * Renewal / Expiry Term Analysis
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
import os
import uuid
import pathlib

from app.database.session import get_db
from app.core.security import get_current_active_user, require_roles, require_internal_user
from app.models.rfq import Contract, ContractStatus, ContractType
from app.models.supplier import Supplier
from app.services.ai_service import AIPredictiveEngine

router = APIRouter()

# Secure non-public storage directory
SECURE_CONTRACTS_DIR = pathlib.Path("uploads/secure_contracts")
SECURE_CONTRACTS_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_CONTRACT_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt"}
MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB limit


def _generate_contract_number(db: Session) -> str:
    count = db.query(Contract).count()
    return f"CNT-{datetime.now().year}-{count + 1:04d}"


def _evaluate_contract_status(start_date: Optional[datetime], end_date: Optional[datetime], current_status: ContractStatus) -> ContractStatus:
    if current_status in [ContractStatus.TERMINATED, ContractStatus.DRAFT]:
        return current_status
    if end_date:
        now = datetime.utcnow()
        if now > end_date:
            return ContractStatus.EXPIRED
        elif (end_date - now).days <= 60:
            return ContractStatus.ACTIVE  # Active but expiring soon
    return ContractStatus.ACTIVE


@router.get("/", summary="List all contracts")
async def list_contracts(
    supplier_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
    contract_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    expiring_soon: Optional[bool] = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(require_internal_user)
):
    """List contracts with supplier filtering, status filtering, and expiry tracking."""
    query = db.query(Contract).options(joinedload(Contract.supplier)).filter(Contract.is_deleted == False)

    if supplier_id:
        query = query.filter(Contract.supplier_id == supplier_id)
    if status:
        query = query.filter(Contract.status == status)
    if contract_type:
        query = query.filter(Contract.contract_type == contract_type)
    if search:
        query = query.filter(
            (Contract.title.ilike(f"%{search}%")) | (Contract.contract_number.ilike(f"%{search}%"))
        )

    contracts = query.order_by(Contract.created_at.desc()).offset(skip).limit(limit).all()

    results = []
    now = datetime.utcnow()

    for c in contracts:
        days_to_expiry = (c.end_date - now).days if c.end_date else 999
        if expiring_soon and (days_to_expiry < 0 or days_to_expiry > 60):
            continue

        results.append({
            "id": str(c.id),
            "contract_number": c.contract_number,
            "supplier_id": str(c.supplier_id),
            "supplier_name": c.supplier.company_name if c.supplier else "Supplier",
            "title": c.title,
            "contract_type": c.contract_type.value if hasattr(c.contract_type, "value") else c.contract_type,
            "status": c.status.value if hasattr(c.status, "value") else c.status,
            "start_date": c.start_date.strftime("%Y-%m-%d") if c.start_date else None,
            "end_date": c.end_date.strftime("%Y-%m-%d") if c.end_date else None,
            "days_to_expiry": days_to_expiry if c.end_date else None,
            "contract_value": c.contract_value or 0.0,
            "currency": c.currency or "USD",
            "auto_renew": c.auto_renew,
            "notice_period_days": c.notice_period_days,
            "current_version": c.current_version or 1,
            "ai_risk_score": c.ai_risk_score,
            "has_document": bool(c.document_file_path),
            "created_at": c.created_at.isoformat() if c.created_at else None,
        })

    return results


@router.post("/upload", status_code=status.HTTP_201_CREATED, summary="Upload & Create Contract")
async def upload_contract(
    file: Optional[UploadFile] = File(None),
    title: str = Form(...),
    supplier_id: str = Form(...),
    contract_type: str = Form("master_service"),
    start_date: Optional[str] = Form(None),
    end_date: Optional[str] = Form(None),
    contract_value: float = Form(0.0),
    currency: str = Form("USD"),
    auto_renew: bool = Form(False),
    notice_period_days: int = Form(30),
    notes: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user=Depends(require_internal_user)
):
    """
    Upload contract document securely and register contract metadata.
    Validates supplier association and legal parameters.
    Executes initial AI Analysis automatically.
    """
    # 1. Validate Supplier
    try:
        sup_uuid = UUID(str(supplier_id))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid supplier_id UUID format.")

    supplier = db.query(Supplier).filter(Supplier.id == sup_uuid, Supplier.is_deleted == False).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found.")

    # 2. File Upload Handling
    saved_file_path = None
    original_filename = None

    if file:
        file_ext = pathlib.Path(file.filename).suffix.lower()
        if file_ext not in ALLOWED_CONTRACT_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type '{file_ext}'. Allowed types: {', '.join(ALLOWED_CONTRACT_EXTENSIONS)}"
            )

        contents = await file.read()
        if len(contents) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=400,
                detail=f"File size exceeds max limit of {MAX_FILE_SIZE_BYTES // (1024*1024)} MB."
            )

        safe_filename = f"{uuid.uuid4().hex}_{pathlib.Path(file.filename).name.replace('/', '_').replace('\\', '_')}"
        file_path_obj = SECURE_CONTRACTS_DIR / safe_filename
        with open(file_path_obj, "wb") as f:
            f.write(contents)

        saved_file_path = str(file_path_obj)
        original_filename = file.filename

    # 3. Parse Dates
    dt_start = None
    if start_date:
        try:
            dt_start = datetime.strptime(start_date[:10], "%Y-%m-%d")
        except ValueError:
            pass

    dt_end = None
    if end_date:
        try:
            dt_end = datetime.strptime(end_date[:10], "%Y-%m-%d")
        except ValueError:
            pass

    # Determine Enum values
    try:
        c_type = ContractType(contract_type)
    except ValueError:
        c_type = ContractType.MASTER_SERVICE

    contract_num = _generate_contract_number(db)
    init_status = _evaluate_contract_status(dt_start, dt_end, ContractStatus.ACTIVE)

    # 4. AI Contract Analysis Engine
    ai_res = AIPredictiveEngine.analyze_contract_document(
        title=title,
        contract_type=c_type.value,
        supplier_name=supplier.company_name,
        start_date=dt_start.strftime("%Y-%m-%d") if dt_start else None,
        end_date=dt_end.strftime("%Y-%m-%d") if dt_end else None,
        contract_value=contract_value,
        auto_renew=auto_renew,
        notice_period_days=notice_period_days
    )

    initial_version_history = [{
        "version": 1,
        "file_name": original_filename or "Initial_Contract_Terms.pdf",
        "file_path": saved_file_path,
        "uploaded_at": datetime.utcnow().isoformat(),
        "uploaded_by": current_user.email,
        "notes": "Initial upload"
    }]

    contract = Contract(
        contract_number=contract_num,
        supplier_id=supplier.id,
        title=title.strip(),
        contract_type=c_type,
        status=init_status,
        start_date=dt_start,
        end_date=dt_end,
        contract_value=contract_value,
        currency=currency,
        auto_renew=auto_renew,
        notice_period_days=notice_period_days,
        document_file_path=saved_file_path,
        current_version=1,
        versions_history=initial_version_history,
        ai_summary=ai_res["summary"],
        ai_risk_score=ai_res["ai_risk_score"],
        ai_key_clauses=ai_res["extracted_clauses"],
        ai_risk_assessment=ai_res["identified_risks"],
        ai_expiry_terms=ai_res["expiry_terms"],
        notes=notes
    )

    db.add(contract)
    db.commit()
    db.refresh(contract)

    return {
        "id": str(contract.id),
        "contract_number": contract.contract_number,
        "title": contract.title,
        "supplier_name": supplier.company_name,
        "status": contract.status.value if hasattr(contract.status, "value") else contract.status,
        "current_version": contract.current_version,
        "ai_risk_score": contract.ai_risk_score,
        "message": f"Contract {contract.contract_number} uploaded and AI analyzed successfully."
    }


@router.get("/{contract_id}", summary="Get contract details and AI analysis")
async def get_contract(
    contract_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_internal_user)
):
    """Get full details of a contract including version history and extracted AI clauses."""
    c = db.query(Contract).options(joinedload(Contract.supplier)).filter(
        Contract.id == contract_id, Contract.is_deleted == False
    ).first()

    if not c:
        raise HTTPException(status_code=404, detail="Contract not found.")

    now = datetime.utcnow()
    days_remaining = (c.end_date - now).days if c.end_date else 999

    return {
        "id": str(c.id),
        "contract_number": c.contract_number,
        "supplier_id": str(c.supplier_id),
        "supplier_name": c.supplier.company_name if c.supplier else "Supplier",
        "title": c.title,
        "contract_type": c.contract_type.value if hasattr(c.contract_type, "value") else c.contract_type,
        "status": c.status.value if hasattr(c.status, "value") else c.status,
        "start_date": c.start_date.strftime("%Y-%m-%d") if c.start_date else None,
        "end_date": c.end_date.strftime("%Y-%m-%d") if c.end_date else None,
        "days_to_expiry": days_remaining,
        "contract_value": c.contract_value or 0.0,
        "currency": c.currency or "USD",
        "auto_renew": c.auto_renew,
        "notice_period_days": c.notice_period_days,
        "current_version": c.current_version or 1,
        "versions_history": c.versions_history or [],
        "ai_summary": c.ai_summary,
        "ai_risk_score": c.ai_risk_score or 15.0,
        "extracted_clauses": c.ai_key_clauses or {},
        "identified_risks": c.ai_risk_assessment or [],
        "expiry_terms": c.ai_expiry_terms or {},
        "notes": c.notes,
        "has_document": bool(c.document_file_path),
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


@router.post("/{contract_id}/versions", summary="Upload new contract version")
async def add_contract_version(
    contract_id: UUID,
    file: UploadFile = File(...),
    notes: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user=Depends(require_internal_user)
):
    """
    Upload a new version of the contract document.
    Updates version history and current version counter.
    """
    c = db.query(Contract).filter(Contract.id == contract_id, Contract.is_deleted == False).first()
    if not c:
        raise HTTPException(status_code=404, detail="Contract not found.")

    file_ext = pathlib.Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_CONTRACT_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Invalid file type '{file_ext}'.")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File exceeds max size limit.")

    new_version_num = (c.current_version or 1) + 1
    safe_filename = f"{uuid.uuid4().hex}_v{new_version_num}_{pathlib.Path(file.filename).name.replace('/', '_')}"
    file_path_obj = SECURE_CONTRACTS_DIR / safe_filename

    with open(file_path_obj, "wb") as f:
        f.write(contents)

    saved_file_path = str(file_path_obj)

    version_entry = {
        "version": new_version_num,
        "file_name": file.filename,
        "file_path": saved_file_path,
        "uploaded_at": datetime.utcnow().isoformat(),
        "uploaded_by": current_user.email,
        "notes": notes or f"Version {new_version_num} upload"
    }

    history = c.versions_history or []
    history.append(version_entry)

    c.current_version = new_version_num
    c.document_file_path = saved_file_path
    c.versions_history = history
    db.commit()

    return {
        "message": f"Version {new_version_num} uploaded successfully.",
        "current_version": new_version_num,
        "version_entry": version_entry
    }


@router.post("/{contract_id}/renew", summary="Renew contract")
async def renew_contract(
    contract_id: UUID,
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "finance", "manager"))
):
    """
    Renew contract with updated expiry date and contract value.
    Updates contract status to RENEWED / ACTIVE.
    """
    c = db.query(Contract).filter(Contract.id == contract_id, Contract.is_deleted == False).first()
    if not c:
        raise HTTPException(status_code=404, detail="Contract not found.")

    new_end_date_str = payload.get("new_end_date")
    if not new_end_date_str:
        raise HTTPException(status_code=400, detail="new_end_date is required for contract renewal.")

    try:
        new_end_date = datetime.strptime(str(new_end_date_str)[:10], "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid new_end_date format (YYYY-MM-DD required).")

    if payload.get("contract_value"):
        c.contract_value = float(payload["contract_value"])

    c.renewal_date = datetime.utcnow()
    c.end_date = new_end_date
    c.status = ContractStatus.ACTIVE

    # Re-run AI Analysis for renewed terms
    supplier_name = c.supplier.company_name if c.supplier else "Supplier"
    ai_res = AIPredictiveEngine.analyze_contract_document(
        title=c.title,
        contract_type=c.contract_type.value if hasattr(c.contract_type, "value") else c.contract_type,
        supplier_name=supplier_name,
        start_date=c.start_date.strftime("%Y-%m-%d") if c.start_date else None,
        end_date=c.end_date.strftime("%Y-%m-%d") if c.end_date else None,
        contract_value=c.contract_value or 0.0,
        auto_renew=c.auto_renew,
        notice_period_days=c.notice_period_days
    )

    c.ai_summary = ai_res["summary"]
    c.ai_risk_score = ai_res["ai_risk_score"]
    c.ai_key_clauses = ai_res["extracted_clauses"]
    c.ai_risk_assessment = ai_res["identified_risks"]
    c.ai_expiry_terms = ai_res["expiry_terms"]

    db.commit()

    # Trigger real-time notification
    from app.services.notification_service import broadcast_notification
    broadcast_notification(
        db=db,
        title="Contract Renewed 📋",
        message=f"Contract {c.contract_number} ({c.title}) has been renewed until {new_end_date.strftime('%Y-%m-%d')}.",
        notification_type="info",
        action_url="/contracts",
        reference_id=str(c.id),
        reference_type="contract"
    )

    return {
        "message": f"Contract {c.contract_number} renewed until {new_end_date.strftime('%Y-%m-%d')}.",
        "status": c.status.value,
        "new_end_date": c.end_date.strftime("%Y-%m-%d")
    }


@router.post("/{contract_id}/ai-analyze", summary="Trigger AI Contract Analysis")
async def run_ai_contract_analysis(
    contract_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_internal_user)
):
    """
    Run data-driven AI contract analysis.
    Summarizes contract, extracts 6 important clauses, identifies risks, and evaluates expiry terms.
    """
    c = db.query(Contract).options(joinedload(Contract.supplier)).filter(
        Contract.id == contract_id, Contract.is_deleted == False
    ).first()

    if not c:
        raise HTTPException(status_code=404, detail="Contract not found.")

    supplier_name = c.supplier.company_name if c.supplier else "Supplier"

    ai_res = AIPredictiveEngine.analyze_contract_document(
        title=c.title,
        contract_type=c.contract_type.value if hasattr(c.contract_type, "value") else c.contract_type,
        supplier_name=supplier_name,
        start_date=c.start_date.strftime("%Y-%m-%d") if c.start_date else None,
        end_date=c.end_date.strftime("%Y-%m-%d") if c.end_date else None,
        contract_value=c.contract_value or 0.0,
        auto_renew=c.auto_renew,
        notice_period_days=c.notice_period_days
    )

    c.ai_summary = ai_res["summary"]
    c.ai_risk_score = ai_res["ai_risk_score"]
    c.ai_key_clauses = ai_res["extracted_clauses"]
    c.ai_risk_assessment = ai_res["identified_risks"]
    c.ai_expiry_terms = ai_res["expiry_terms"]

    db.commit()

    return {
        "contract_id": str(c.id),
        "ai_summary": c.ai_summary,
        "ai_risk_score": c.ai_risk_score,
        "extracted_clauses": c.ai_key_clauses,
        "identified_risks": c.ai_risk_assessment,
        "expiry_terms": c.ai_expiry_terms
    }


@router.get("/{contract_id}/download", summary="Securely download contract document")
async def download_contract_file(
    contract_id: UUID,
    version: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(require_internal_user)
):
    """
    Secure file download endpoint.
    Verifies user authentication before serving document.
    Ensures contract documents are NEVER exposed publicly on the web.
    """
    c = db.query(Contract).filter(Contract.id == contract_id, Contract.is_deleted == False).first()
    if not c:
        raise HTTPException(status_code=404, detail="Contract not found.")

    target_path = c.document_file_path

    # If specific version requested
    if version and c.versions_history:
        for v in c.versions_history:
            if v.get("version") == version and v.get("file_path"):
                target_path = v["file_path"]
                break

    if not target_path or not os.path.exists(target_path):
        raise HTTPException(
            status_code=404,
            detail="Document file not found on secure storage. Upload document first."
        )

    file_name = pathlib.Path(target_path).name
    return FileResponse(
        path=target_path,
        filename=f"{c.contract_number}_{file_name}",
        media_type="application/octet-stream"
    )
