from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db, ModelArtifact
from ..schemas import (
    TrainRFRequest, ModelMetricsResponse,
    EnsembleReweightRequest, EnsembleComparisonResponse
)
from ..services.random_forest import train_random_forest
from ..services.ensemble import update_ensemble_predictions

router = APIRouter(prefix="/models", tags=["AI Models"])


@router.post("/train/rf")
def train_rf_endpoint(request: TrainRFRequest = TrainRFRequest(), db: Session = Depends(get_db)):
    """Trains the Random Forest classifier with stratified cross-validation and balanced weights."""
    try:
        result = train_random_forest(
            db=db,
            n_estimators=request.n_estimators,
            max_depth=request.max_depth,
            random_state=request.random_state
        )
        # Update ensemble with default alpha
        update_ensemble_predictions(db=db, alpha=0.55)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Random Forest training failed: {str(e)}")


@router.get("/metrics/rf")
def get_rf_metrics(db: Session = Depends(get_db)):
    """Retrieves current Random Forest evaluation metrics, confusion matrix, and feature importances."""
    artifact = db.query(ModelArtifact).filter(ModelArtifact.id == "rf_model").first()
    if not artifact:
        raise HTTPException(status_code=404, detail="Random Forest model has not been trained yet.")
    return artifact.to_dict()


@router.post("/ensemble/reweight", response_model=EnsembleComparisonResponse)
def reweight_ensemble(request: EnsembleReweightRequest, db: Session = Depends(get_db)):
    """Dynamically adjusts the Random Forest vs GNN alpha weighting formula."""
    try:
        comparison = update_ensemble_predictions(db=db, alpha=request.alpha)
        return EnsembleComparisonResponse(**comparison)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ensemble reweighting failed: {str(e)}")


@router.get("/ensemble/comparison", response_model=EnsembleComparisonResponse)
def get_ensemble_comparison(alpha: float = 0.55, db: Session = Depends(get_db)):
    """Compares individual and combined model metrics on held-out evaluation telemetry."""
    try:
        comparison = update_ensemble_predictions(db=db, alpha=alpha)
        return EnsembleComparisonResponse(**comparison)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate comparison: {str(e)}")
