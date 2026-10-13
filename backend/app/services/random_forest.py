import json
import time
from pathlib import Path
from typing import Dict, Any, Tuple, Optional
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix
)
from sqlalchemy.orm import Session

from ..config import MODELS_DIR
from ..database import EvidenceRecord, ModelArtifact
from .features import extract_cyber_features, FEATURE_NAMES

RF_MODEL_PATH = MODELS_DIR / "rf_model.joblib"


def train_random_forest(
    db: Session,
    n_estimators: int = 100,
    max_depth: Optional[int] = 16,
    random_state: int = 42
) -> Dict[str, Any]:
    """
    Trains Random Forest Classifier with stratified split to prevent data leakage.
    Persists model weights and updates database predictions.
    """
    # 1. Fetch evidence data from database
    records = db.query(EvidenceRecord).order_by(EvidenceRecord.id.asc()).all()
    if not records:
        raise ValueError("No evidence records found in database. Ingest dataset first.")

    rows = [r.to_dict() for r in records]
    df = pd.DataFrame(rows)

    # 2. Extract features
    X, y, feature_names = extract_cyber_features(df)

    # 3. Stratified train/test split to prevent data leakage
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=random_state, stratify=y
    )

    # 4. Fit Random Forest
    rf = RandomForestClassifier(
        n_estimators=n_estimators,
        max_depth=max_depth,
        class_weight="balanced",
        random_state=random_state,
        n_jobs=-1
    )
    rf.fit(X_train, y_train)

    # 5. Evaluate on held-out test set
    y_pred = rf.predict(X_test)
    y_prob = rf.predict_proba(X_test)[:, 1]

    acc = float(accuracy_score(y_test, y_pred))
    prec = float(precision_score(y_test, y_pred, zero_division=0))
    rec = float(recall_score(y_test, y_pred, zero_division=0))
    f1 = float(f1_score(y_test, y_pred, zero_division=0))
    
    try:
        roc_auc = float(roc_auc_score(y_test, y_prob))
    except Exception:
        roc_auc = 0.5

    cm = confusion_matrix(y_test, y_pred).tolist()

    # 6. Feature importances
    importances = rf.feature_importances_
    sorted_idx = np.argsort(importances)[::-1]
    feature_importance_list = [
        {
            "feature": feature_names[i],
            "importance": round(float(importances[i]), 4),
            "rank": rank + 1
        }
        for rank, i in enumerate(sorted_idx)
    ]

    metrics = {
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "roc_auc": round(roc_auc, 4),
        "confusion_matrix": cm,
        "feature_importance": feature_importance_list,
        "test_size": len(y_test),
        "train_size": len(y_train),
    }

    # 7. Persist model
    joblib.dump(rf, RF_MODEL_PATH)

    # 8. Store model artifact in database
    trained_at = pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S")
    artifact = db.query(ModelArtifact).filter(ModelArtifact.id == "rf_model").first()
    if not artifact:
        artifact = ModelArtifact(
            id="rf_model",
            version="1.0.0",
            trained_at=trained_at,
            metrics=json.dumps(metrics),
            parameters=json.dumps({"n_estimators": n_estimators, "max_depth": max_depth})
        )
        db.add(artifact)
    else:
        artifact.trained_at = trained_at
        artifact.metrics = json.dumps(metrics)
        artifact.parameters = json.dumps({"n_estimators": n_estimators, "max_depth": max_depth})

    # 9. Generate and update predictions for all records
    all_probs = rf.predict_proba(X)[:, 1]
    for idx, rec in enumerate(records):
        rec.rf_prediction = float(all_probs[idx])

    db.commit()

    return {
        "model_type": "Random Forest",
        "version": "1.0.0",
        "trained_at": trained_at,
        "metrics": metrics
    }


def load_rf_model() -> Optional[RandomForestClassifier]:
    """Loads persisted Random Forest model from disk."""
    if RF_MODEL_PATH.exists():
        try:
            return joblib.load(RF_MODEL_PATH)
        except Exception:
            return None
    return None
