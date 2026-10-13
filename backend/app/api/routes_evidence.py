from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from ..database import get_db, EvidenceRecord
from ..schemas import EvidencePaginationResponse, EvidenceSummaryResponse

router = APIRouter(prefix="/evidence", tags=["Evidence Ledger"])


@router.get("", response_model=EvidencePaginationResponse)
def get_evidence_list(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    search: Optional[str] = None,
    label: Optional[str] = None,
    attack_type: Optional[str] = None,
    user: Optional[str] = None,
    device: Optional[str] = None,
    risk_level: Optional[str] = None,
    is_tampered: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Retrieves paginated, searchable, and filterable evidence records."""
    query = db.query(EvidenceRecord)

    if search:
        s = f"%{search}%"
        query = query.filter(
            (EvidenceRecord.evidence_id.ilike(s)) |
            (EvidenceRecord.user.ilike(s)) |
            (EvidenceRecord.device.ilike(s)) |
            (EvidenceRecord.process_name.ilike(s)) |
            (EvidenceRecord.destination_ip.ilike(s)) |
            (EvidenceRecord.command_line.ilike(s))
        )

    if label:
        query = query.filter(EvidenceRecord.ground_truth_label == label)
    if attack_type:
        query = query.filter(EvidenceRecord.attack_type == attack_type)
    if user:
        query = query.filter(EvidenceRecord.user == user)
    if device:
        query = query.filter(EvidenceRecord.device == device)
    if risk_level:
        query = query.filter(EvidenceRecord.risk_level == risk_level)
    if is_tampered is not None:
        query = query.filter(EvidenceRecord.is_tampered == is_tampered)

    total = query.count()
    offset = (page - 1) * page_size
    records = query.order_by(EvidenceRecord.id.asc()).offset(offset).limit(page_size).all()

    return EvidencePaginationResponse(
        items=[r.to_dict() for r in records],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size if total > 0 else 1
    )


@router.get("/summary", response_model=EvidenceSummaryResponse)
def get_evidence_summary(db: Session = Depends(get_db)):
    """Computes global cybersecurity forensics KPI indicators and threat statistics."""
    total = db.query(EvidenceRecord).count()
    malicious = db.query(EvidenceRecord).filter(EvidenceRecord.ground_truth_label == "malicious").count()
    benign = total - malicious
    tampered = db.query(EvidenceRecord).filter(EvidenceRecord.is_tampered == True).count()

    critical = db.query(EvidenceRecord).filter(EvidenceRecord.risk_level == "Critical").count()
    high = db.query(EvidenceRecord).filter(EvidenceRecord.risk_level == "High").count()
    medium = db.query(EvidenceRecord).filter(EvidenceRecord.risk_level == "Medium").count()
    low = db.query(EvidenceRecord).filter(EvidenceRecord.risk_level == "Low").count()

    # Top attack types
    attack_counts = (
        db.query(EvidenceRecord.attack_type, func.count(EvidenceRecord.id))
        .filter(EvidenceRecord.attack_type != "Normal")
        .group_by(EvidenceRecord.attack_type)
        .order_by(desc(func.count(EvidenceRecord.id)))
        .all()
    )
    top_attacks = {att: count for att, count in attack_counts}

    # Top flagged users
    flagged_users = (
        db.query(EvidenceRecord.user, func.count(EvidenceRecord.id).label("count"))
        .filter(EvidenceRecord.ground_truth_label == "malicious")
        .group_by(EvidenceRecord.user)
        .order_by(desc("count"))
        .limit(5)
        .all()
    )
    user_list = [{"user": u, "malicious_events": cnt} for u, cnt in flagged_users]

    # Top flagged devices
    flagged_devices = (
        db.query(EvidenceRecord.device, func.count(EvidenceRecord.id).label("count"))
        .filter(EvidenceRecord.ground_truth_label == "malicious")
        .group_by(EvidenceRecord.device)
        .order_by(desc("count"))
        .limit(5)
        .all()
    )
    dev_list = [{"device": d, "malicious_events": cnt} for d, cnt in flagged_devices]

    return EvidenceSummaryResponse(
        total_evidence=total,
        total_malicious=malicious,
        total_benign=benign,
        total_tampered=tampered,
        critical_risk_count=critical,
        high_risk_count=high,
        medium_risk_count=medium,
        low_risk_count=low,
        top_attack_types=top_attacks,
        top_flagged_users=user_list,
        top_flagged_devices=dev_list,
        hash_chain_status="TAMPERED" if tampered > 0 else "INTACT"
    )


@router.get("/{evidence_id}")
def get_evidence_detail(evidence_id: str, db: Session = Depends(get_db)):
    """Retrieves full forensic details and raw payload for a specific evidence record."""
    rec = db.query(EvidenceRecord).filter(EvidenceRecord.evidence_id == evidence_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail=f"Evidence ID {evidence_id} not found.")
    return rec.to_dict()
