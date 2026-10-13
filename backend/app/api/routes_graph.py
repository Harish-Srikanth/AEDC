from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..services.graph_service import get_interactive_graph

router = APIRouter(prefix="/graph", tags=["Graph Explorer"])


@router.get("/topology")
def get_graph_topology(
    focus_evidence_id: Optional[str] = None,
    attack_type: Optional[str] = None,
    risk_level: Optional[str] = None,
    user: Optional[str] = None,
    device: Optional[str] = None,
    limit: int = 150,
    db: Session = Depends(get_db)
):
    """Exports multi-entity forensic graph for interactive node-link exploration."""
    return get_interactive_graph(
        db=db,
        focus_evidence_id=focus_evidence_id,
        attack_type=attack_type,
        risk_level=risk_level,
        user=user,
        device=device,
        limit=limit
    )
