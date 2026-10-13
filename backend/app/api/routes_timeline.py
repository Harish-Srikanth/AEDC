from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ..database import get_db, EvidenceRecord

router = APIRouter(prefix="/timeline", tags=["Attack Timeline"])


@router.get("/events")
def get_timeline_events(
    incident_id: Optional[str] = None,
    attack_type: Optional[str] = None,
    user: Optional[str] = None,
    device: Optional[str] = None,
    risk_level: Optional[str] = None,
    limit: int = Query(100, ge=10, le=500),
    db: Session = Depends(get_db)
):
    """Retrieves chronological progression of cybersecurity forensic events."""
    query = db.query(EvidenceRecord)

    if incident_id:
        query = query.filter(EvidenceRecord.incident_id == incident_id)
    if attack_type:
        query = query.filter(EvidenceRecord.attack_type == attack_type)
    if user:
        query = query.filter(EvidenceRecord.user == user)
    if device:
        query = query.filter(EvidenceRecord.device == device)
    if risk_level:
        query = query.filter(EvidenceRecord.risk_level == risk_level)

    # Order chronologically
    records = query.order_by(EvidenceRecord.timestamp.asc()).limit(limit).all()

    # Kill-chain stage classification helper
    def map_kill_chain(att: str) -> str:
        att_l = att.lower()
        if "brute" in att_l or "credential" in att_l:
            return "Initial Access / Credential Access"
        elif "privilege" in att_l:
            return "Privilege Escalation"
        elif "command" in att_l or "exec" in att_l:
            return "Execution / Defense Evasion"
        elif "lateral" in att_l:
            return "Lateral Movement"
        elif "exfil" in att_l:
            return "Exfiltration / Impact"
        return "Routine Activity"

    timeline_items = []
    for r in records:
        d = r.to_dict()
        d["kill_chain_stage"] = map_kill_chain(r.attack_type)
        timeline_items.append(d)

    return {
        "events": timeline_items,
        "total": len(timeline_items),
        "incident_filter": incident_id
    }
