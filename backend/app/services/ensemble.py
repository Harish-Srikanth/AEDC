import numpy as np
from typing import Dict, Any, Tuple
from sqlalchemy.orm import Session
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix
)
from ..config import settings
from ..database import EvidenceRecord, ModelArtifact


def compute_adaptive_risk_score(
    p_rf: float,
    p_gnn: float,
    alpha: float,
    user_risk: str,
    asset_criticality: str,
    has_indicators: bool
) -> Tuple[float, str]:
    """
    Computes explainable 0-100 risk score combining model probabilities and contextual risk factors.
    Returns: (score, risk_category)
    """
    p_rf = max(0.0, min(1.0, float(p_rf)))
    p_gnn = max(0.0, min(1.0, float(p_gnn)))
    alpha = max(0.0, min(1.0, float(alpha)))

    # 1. Base model blended confidence (0 - 70 points)
    p_blended = alpha * p_rf + (1.0 - alpha) * p_gnn
    base_points = p_blended * 70.0

    # 2. Contextual booster points (0 - 30 points)
    context_boost = 0.0
    u_risk = str(user_risk).capitalize()
    if u_risk == "High":
        context_boost += 10.0
    elif u_risk == "Medium":
        context_boost += 5.0

    a_crit = str(asset_criticality).capitalize()
    if a_crit == "High":
        context_boost += 10.0
    elif a_crit == "Medium":
        context_boost += 5.0

    if has_indicators and p_blended > 0.3:
        context_boost += 10.0

    # If model is near-zero benign, scale down context boost
    if p_blended < 0.15:
        context_boost = context_boost * 0.25

    total_score = round(float(np.clip(base_points + context_boost, 0.0, 100.0)), 2)

    # Risk Tier assignment
    if total_score >= 85.0:
        tier = "Critical"
    elif total_score >= 70.0:
        tier = "High"
    elif total_score >= 40.0:
        tier = "Medium"
    else:
        tier = "Low"

    return total_score, tier


def update_ensemble_predictions(db: Session, alpha: float = 0.55) -> Dict[str, Any]:
    """
    Updates combined predictions and risk scores across all evidence records in DB.
    Also computes and returns comparison metrics across RF, GNN, and Ensemble.
    """
    records = db.query(EvidenceRecord).order_by(EvidenceRecord.id.asc()).all()
    if not records:
        return {"message": "No records in database."}

    rf_preds = []
    gnn_preds = []
    ens_preds = []
    y_true = []

    for rec in records:
        p_rf = rec.rf_prediction if rec.rf_prediction is not None else 0.05
        p_gnn = rec.gnn_prediction if rec.gnn_prediction is not None else 0.05
        has_ind = bool(rec.attack_type and rec.attack_type != "Normal")

        score, tier = compute_adaptive_risk_score(
            p_rf=p_rf,
            p_gnn=p_gnn,
            alpha=alpha,
            user_risk=rec.user_risk_level,
            asset_criticality=rec.asset_criticality,
            has_indicators=has_ind
        )

        rec.combined_score = score
        rec.risk_level = tier

        # For metric evaluation
        p_comb = alpha * p_rf + (1.0 - alpha) * p_gnn
        rf_preds.append(p_rf)
        gnn_preds.append(p_gnn)
        ens_preds.append(p_comb)
        y_true.append(1 if rec.ground_truth_label == "malicious" else 0)

    db.commit()

    # Calculate comparison metrics on evaluation subset (e.g. test slice)
    y_true_arr = np.array(y_true)
    test_slice = slice(int(len(y_true_arr) * 0.8), len(y_true_arr))
    y_test = y_true_arr[test_slice]
    rf_test = np.array(rf_preds)[test_slice]
    gnn_test = np.array(gnn_preds)[test_slice]
    ens_test = np.array(ens_preds)[test_slice]

    def calc_metrics(probs):
        pred = (probs >= 0.5).astype(int)
        acc = float(accuracy_score(y_test, pred))
        prec = float(precision_score(y_test, pred, zero_division=0))
        rec = float(recall_score(y_test, pred, zero_division=0))
        f1 = float(f1_score(y_test, pred, zero_division=0))
        try:
            auc = float(roc_auc_score(y_test, probs))
        except Exception:
            auc = 0.5
        cm = confusion_matrix(y_test, pred).tolist()
        return {
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "roc_auc": round(auc, 4),
            "confusion_matrix": cm
        }

    comparison = {
        "alpha": alpha,
        "weight_formula": f"Score = {alpha:.2f} * RF + {1.0 - alpha:.2f} * GNN + Contextual Boosts (0-100)",
        "rf_metrics": calc_metrics(rf_test),
        "gnn_metrics": calc_metrics(gnn_test),
        "ensemble_metrics": calc_metrics(ens_test),
        "total_updated": len(records)
    }

    return comparison
