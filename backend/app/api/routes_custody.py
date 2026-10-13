from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ..database import get_db, ChainOfCustodyLog

router = APIRouter(prefix="/custody", tags=["Chain of Custody"])


@router.get("/logs")
def get_custody_logs(
    evidence_id: Optional[str] = None,
    limit: int = Query(100, ge=10, le=500),
    db: Session = Depends(get_db)
):
    """Retrieves immutable Chain of Custody audit logs and transfer events."""
    query = db.query(ChainOfCustodyLog)
    if evidence_id:
        query = query.filter(ChainOfCustodyLog.evidence_id == evidence_id)

    logs = query.order_by(ChainOfCustodyLog.id.desc()).limit(limit).all()
    return {
        "logs": [l.to_dict() for l in logs],
        "total": len(logs)
    }
