from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db, ModelArtifact
from ..schemas import XAIExplanationResponse
from ..services.xai import generate_forensic_explanation

router = APIRouter(prefix="/xai", tags=["Explainable AI"])


@router.get("/explain/{evidence_id}", response_model=XAIExplanationResponse)
def get_explanation(evidence_id: str, db: Session = Depends(get_db)):
    """Computes genuine SHAP attributions, topological graph reasoning, and forensic narrative."""
    try:
        explanation = generate_forensic_explanation(db=db, evidence_id=evidence_id)
        return XAIExplanationResponse(**explanation)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"XAI calculation failed: {str(e)}")


@router.get("/global-summary")
def get_global_xai_summary(db: Session = Depends(get_db)):
    """Retrieves global model feature importance rankings for cross-evidence forensics."""
    artifact = db.query(ModelArtifact).filter(ModelArtifact.id == "rf_model").first()
    if not artifact:
        return {"feature_importance": []}
    data = artifact.to_dict()
    return {"feature_importance": data.get("metrics", {}).get("feature_importance", [])}
