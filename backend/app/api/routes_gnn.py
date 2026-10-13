from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db, ModelArtifact
from ..schemas import TrainGNNRequest
from ..services.gnn import train_gnn
from ..services.ensemble import update_ensemble_predictions
from ..services.graph_service import get_interactive_graph

router = APIRouter(prefix="/gnn", tags=["Graph Neural Network"])


@router.post("/train")
def train_gnn_endpoint(request: TrainGNNRequest = TrainGNNRequest(), db: Session = Depends(get_db)):
    """Trains the PyTorch Graph Neural Network on the multi-entity topological evidence graph."""
    try:
        result = train_gnn(
            db=db,
            epochs=request.epochs,
            learning_rate=request.learning_rate,
            hidden_dim=request.hidden_dim,
            random_state=request.random_state
        )
        # Refresh ensemble scores
        update_ensemble_predictions(db=db, alpha=0.55)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"GNN training failed: {str(e)}")


@router.get("/metrics")
def get_gnn_metrics(db: Session = Depends(get_db)):
    """Retrieves current PyTorch GNN evaluation metrics, training loss curve, and topological metadata."""
    artifact = db.query(ModelArtifact).filter(ModelArtifact.id == "gnn_model").first()
    if not artifact:
        raise HTTPException(status_code=404, detail="Graph Neural Network has not been trained yet.")
    return artifact.to_dict()


@router.get("/graph")
def get_gnn_graph(
    focus_evidence_id: str = None,
    attack_type: str = None,
    risk_level: str = None,
    user: str = None,
    device: str = None,
    limit: int = 150,
    db: Session = Depends(get_db)
):
    """Exports multi-entity graph nodes and edges for visualization."""
    return get_interactive_graph(
        db=db,
        focus_evidence_id=focus_evidence_id,
        attack_type=attack_type,
        risk_level=risk_level,
        user=user,
        device=device,
        limit=limit
    )
