from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..database import get_db, EvidenceRecord, ModelArtifact
from ..config import settings
from ..schemas import SystemStatusResponse
from ..services.random_forest import load_rf_model
from ..services.gnn import GNN_MODEL_PATH
from ..services.hashing import verify_chain

router = APIRouter(tags=["Health & Status"])


@router.get("/health")
def get_health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    return {
        "status": "healthy" if db_ok else "degraded",
        "version": settings.app_version,
        "database": "connected" if db_ok else "disconnected",
        "service": settings.app_name
    }


@router.get("/system/status", response_model=SystemStatusResponse)
def get_system_status(db: Session = Depends(get_db)):
    db_connected = True
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_connected = False

    total_ev = db.query(EvidenceRecord).count() if db_connected else 0
    rf_loaded = load_rf_model() is not None
    gnn_loaded = GNN_MODEL_PATH.exists()

    # Quick chain check on first 100 blocks
    sample_records = db.query(EvidenceRecord).order_by(EvidenceRecord.id.asc()).limit(100).all()
    chain_valid, _, _, _ = verify_chain(sample_records)

    return SystemStatusResponse(
        status="operational" if db_connected else "offline",
        version=settings.app_version,
        database_connected=db_connected,
        total_evidence=total_ev,
        rf_model_loaded=rf_loaded,
        gnn_model_loaded=gnn_loaded,
        hash_chain_valid=chain_valid,
        environment="production"
    )
