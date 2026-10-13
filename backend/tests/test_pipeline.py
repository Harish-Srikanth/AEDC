import os
import json
import pytest
from pathlib import Path
import numpy as np
import pandas as pd
import torch
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.database import init_db, SessionLocal, EvidenceRecord, ChainOfCustodyLog, ModelArtifact
from backend.app.services.hashing import (
    canonical_json, sha256_hash, compute_canonical_hash,
    compute_block_hash, verify_chain
)
from backend.app.services.features import extract_cyber_features, FEATURE_NAMES
from backend.app.services.ingestion import execute_ingestion_pipeline, inspect_all_datasets
from backend.app.services.random_forest import train_random_forest, load_rf_model
from backend.app.services.gnn import build_evidence_graph, ForensicsGNN, train_gnn
from backend.app.services.ensemble import compute_adaptive_risk_score, update_ensemble_predictions
from backend.app.services.xai import generate_forensic_explanation
from backend.app.services.certification import validate_forensic_evidence


@pytest.fixture(scope="module")
def db_session():
    init_db()
    db = SessionLocal()
    yield db
    db.close()


@pytest.fixture(scope="module")
def api_client():
    return TestClient(app)


def test_canonical_json_and_sha256():
    """Validates deterministic serialization and SHA-256 hash calculation."""
    d1 = {"b": 2, "a": 1, "nested": {"y": "yes", "x": "no"}}
    d2 = {"nested": {"x": "no", "y": "yes"}, "a": 1, "b": 2}
    
    # Both dictionaries with different initial key ordering must serialize identically
    s1 = canonical_json(d1)
    s2 = canonical_json(d2)
    assert s1 == s2
    assert s1 == '{"a":1,"b":2,"nested":{"x":"no","y":"yes"}}'

    h1 = sha256_hash(s1)
    h2 = sha256_hash(s2)
    assert h1 == h2
    assert len(h1) == 64


def test_hash_chain_tamper_detection():
    """Validates that any payload alteration fractures the tamper-evident hash chain."""
    class MockRecord:
        def __init__(self, idx, ev_id, payload, prev_h):
            self.id = idx
            self.evidence_id = ev_id
            self.raw_payload = json.dumps(payload, sort_keys=True)
            self.canonical_hash = compute_canonical_hash(payload)
            self.prev_hash = prev_h
            self.block_hash = compute_block_hash(prev_h, self.canonical_hash)

    # Build 5 valid blocks
    chain = []
    prev_h = "0" * 64
    for i in range(5):
        payload = {"event_id": f"E00{i}", "action": "login", "value": i * 10}
        rec = MockRecord(i, f"E00{i}", payload, prev_h)
        chain.append(rec)
        prev_h = rec.block_hash

    # 1. Assert pristine chain passes
    is_valid, frac_idx, frac_id, reason = verify_chain(chain)
    assert is_valid is True
    assert frac_idx is None

    # 2. Adversarial tampering: alter block 2 payload without updating hash
    tampered_payload = {"event_id": "E002", "action": "malicious_override", "value": 999}
    chain[2].raw_payload = json.dumps(tampered_payload, sort_keys=True)

    # 3. Assert tampered chain fails and pinpoints fracture at block 2
    is_valid, frac_idx, frac_id, reason = verify_chain(chain)
    assert is_valid is False
    assert frac_idx == 2
    assert frac_id == "E002"
    assert "Record payload altered" in reason


def test_feature_extraction():
    """Tests cybersecurity feature extraction without data fabrication."""
    sample_df = pd.DataFrame([
        {
            "event_id": "T001",
            "timestamp": "2026-01-10 14:30:00",
            "action": "login_failure",
            "status": "FAILURE",
            "auth_method": "NTLM",
            "process_name": "powershell.exe",
            "command_line": "powershell.exe -nop -enc JABzACA...",
            "script": "Invoke-Mimikatz",
            "destination_port": 445,
            "bytes": 500000,
            "destination_ip": "198.51.100.22",
            "query_domain": "exfil-c2.xyz",
            "file_path": "C:\\Users\\Public\\secret.zip",
            "usb_device_id": "USB-001",
            "user_risk_level": "High",
            "asset_criticality": "High",
            "label": "malicious"
        },
        {
            "event_id": "T002",
            "timestamp": "2026-01-10 10:00:00",
            "action": "login_success",
            "status": "SUCCESS",
            "auth_method": "Kerberos",
            "process_name": "chrome.exe",
            "command_line": "chrome.exe",
            "script": "None",
            "destination_port": 443,
            "bytes": 2400,
            "destination_ip": "10.0.0.1",
            "query_domain": "none.local",
            "file_path": "",
            "usb_device_id": "None",
            "user_risk_level": "Low",
            "asset_criticality": "Medium",
            "label": "normal"
        }
    ])

    X, y, feat_names = extract_cyber_features(sample_df)
    assert X.shape == (2, len(FEATURE_NAMES))
    assert y.tolist() == [1, 0]
    assert np.isnan(X).sum() == 0

    # First record should flag failed login, suspicious proc, encoded cmd, risky port
    assert X[0, 0] == 1.0  # is_failed_login
    assert X[0, 2] == 1.0  # is_suspicious_proc
    assert X[0, 3] == 1.0  # has_suspicious_cmd
    assert X[0, 5] == 1.0  # is_risky_port
    assert X[0, 11] == 2.0  # High user risk


def test_ingestion_and_db_persistence(db_session):
    """Tests multi-source log ingestion, canonical hash chaining, and DB storage."""
    # Ingest a fast subset of 300 records for testing
    res = execute_ingestion_pipeline(db=db_session, max_records=300, custodian="Test Auditor", reset_existing=True)
    assert res["total_ingested"] == 300
    assert res["total_malicious"] > 0
    assert len(res["root_hash"]) == 64
    assert res["root_hash"] != "0" * 64

    # Verify records stored in DB
    recs = db_session.query(EvidenceRecord).order_by(EvidenceRecord.id.asc()).all()
    assert len(recs) == 300

    # Verify chain validity on ingested records
    is_valid, frac_idx, _, _ = verify_chain(recs)
    assert is_valid is True
    assert frac_idx is None

    # Verify Chain of Custody entries created
    logs = db_session.query(ChainOfCustodyLog).all()
    assert len(logs) > 0


def test_random_forest_training_and_metrics(db_session):
    """Tests Random Forest training, metrics evaluation, and prediction persistence."""
    res = train_random_forest(db=db_session, n_estimators=25, max_depth=8, random_state=42)
    assert res["model_type"] == "Random Forest"
    metrics = res["metrics"]
    assert "accuracy" in metrics
    assert metrics["accuracy"] >= 0.70
    assert metrics["roc_auc"] >= 0.60
    assert len(metrics["feature_importance"]) == len(FEATURE_NAMES)
    assert load_rf_model() is not None

    # Verify predictions populated in DB
    recs = db_session.query(EvidenceRecord).limit(10).all()
    for r in recs:
        assert r.rf_prediction is not None
        assert 0.0 <= r.rf_prediction <= 1.0


def test_gnn_graph_construction_and_training(db_session):
    """Tests PyTorch GNN topological graph construction and training pass."""
    res = train_gnn(db=db_session, epochs=10, hidden_dim=32, random_state=42)
    assert res["model_type"] == "Graph Neural Network (GNN)"
    metrics = res["metrics"]
    assert metrics["accuracy"] >= 0.60
    assert len(metrics["loss_history"]) == 10
    # Loss should generally decrease or stay stable
    assert metrics["loss_history"][-1] < metrics["loss_history"][0] * 1.5

    # Verify GNN predictions populated in DB
    recs = db_session.query(EvidenceRecord).limit(10).all()
    for r in recs:
        assert r.gnn_prediction is not None
        assert 0.0 <= r.gnn_prediction <= 1.0


def test_ensemble_and_adaptive_risk_scoring(db_session):
    """Tests adaptive ensemble fusion and 0-100 risk score clamping."""
    res = update_ensemble_predictions(db=db_session, alpha=0.6)
    assert res["alpha"] == 0.6
    assert "rf_metrics" in res
    assert "gnn_metrics" in res
    assert "ensemble_metrics" in res

    # Check score properties
    recs = db_session.query(EvidenceRecord).all()
    for r in recs:
        assert r.combined_score is not None
        assert 0.0 <= r.combined_score <= 100.0
        assert r.risk_level in ["Low", "Medium", "High", "Critical"]


def test_explainable_ai_shap_and_narrative(db_session):
    """Tests SHAP feature attribution and automated forensic narrative generation."""
    recs = db_session.query(EvidenceRecord).all()
    first_id = recs[0].evidence_id

    exp = generate_forensic_explanation(db=db_session, evidence_id=first_id)
    assert exp["evidence_id"] == first_id
    assert "shap_feature_contributions" in exp
    assert len(exp["shap_feature_contributions"]) > 0
    assert "forensic_narrative" in exp
    assert len(exp["forensic_narrative"]) > 20
    assert "graph_neighborhood_reasons" in exp


def test_forensic_certification_and_pdf(db_session):
    """Tests the 5 mandatory checks, PASS verdict, and PDF certificate generation."""
    cert = validate_forensic_evidence(db=db_session, case_id="CASE-TEST-01", custodian="Lead Tester")
    assert cert["verdict"] == "PASS"
    assert cert["integrity_check_passed"] is True
    assert cert["model_consensus_passed"] is True
    assert cert["custody_check_passed"] is True
    assert cert["has_pdf"] is True
    assert cert["has_json"] is True


def test_api_endpoints_integration(api_client):
    """Tests REST API endpoints via TestClient."""
    # Health check
    res_health = api_client.get("/api/health")
    assert res_health.status_code == 200
    assert res_health.json()["status"] == "healthy"

    # Datasets discover
    res_disc = api_client.get("/api/datasets/discover")
    assert res_disc.status_code == 200
    assert "available_files" in res_disc.json()

    # Evidence list
    res_ev = api_client.get("/api/evidence?page=1&page_size=10")
    assert res_ev.status_code == 200
    assert len(res_ev.json()["items"]) == 10

    # Evidence summary
    res_sum = api_client.get("/api/evidence/summary")
    assert res_sum.status_code == 200
    assert res_sum.json()["total_evidence"] >= 300

    # Integrity verify
    res_int = api_client.get("/api/integrity/verify")
    assert res_int.status_code == 200
    assert res_int.json()["status"] == "PASS"

    # Certification list
    res_cert = api_client.get("/api/certification/list")
    assert res_cert.status_code == 200
    assert len(res_cert.json()["certificates"]) > 0
