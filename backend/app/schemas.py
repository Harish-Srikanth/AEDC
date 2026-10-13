from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class DatasetFileInfo(BaseModel):
    filename: str
    file_type: str
    size_bytes: int
    row_count: Optional[int] = None
    columns: List[str] = []
    status: str = "detected"


class DiscoveryResponse(BaseModel):
    dataset_directory: str
    available_files: List[DatasetFileInfo]
    correlated_sources: List[str]
    is_ready_to_ingest: bool


class IngestRequest(BaseModel):
    max_records: Optional[int] = None
    custodian: str = "Senior Cyber Forensics Examiner"
    reset_existing: bool = True


class IngestResponse(BaseModel):
    total_ingested: int
    total_malicious: int
    total_normal: int
    root_hash: str
    genesis_hash: str
    duration_seconds: float
    message: str


class EvidenceFilterParams(BaseModel):
    search: Optional[str] = None
    label: Optional[str] = None
    attack_type: Optional[str] = None
    user: Optional[str] = None
    device: Optional[str] = None
    risk_level: Optional[str] = None
    is_tampered: Optional[bool] = None
    page: int = 1
    page_size: int = 50


class EvidencePaginationResponse(BaseModel):
    items: List[Dict[str, Any]]
    total: int
    page: int
    page_size: int
    total_pages: int


class EvidenceSummaryResponse(BaseModel):
    total_evidence: int
    total_malicious: int
    total_benign: int
    total_tampered: int
    critical_risk_count: int
    high_risk_count: int
    medium_risk_count: int
    low_risk_count: int
    top_attack_types: Dict[str, int]
    top_flagged_users: List[Dict[str, Any]]
    top_flagged_devices: List[Dict[str, Any]]
    hash_chain_status: str


class TrainRFRequest(BaseModel):
    n_estimators: int = 100
    max_depth: Optional[int] = 16
    random_state: int = 42


class TrainGNNRequest(BaseModel):
    epochs: int = 40
    learning_rate: float = 0.01
    hidden_dim: int = 64
    random_state: int = 42


class ModelMetricsResponse(BaseModel):
    model_type: str
    version: str
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    roc_auc: float
    confusion_matrix: List[List[int]]
    feature_importance: Optional[List[Dict[str, Any]]] = None
    training_loss: Optional[List[float]] = None
    trained_at: str


class EnsembleReweightRequest(BaseModel):
    alpha: float = Field(..., ge=0.0, le=1.0, description="Weight for Random Forest (0.0 to 1.0)")


class EnsembleComparisonResponse(BaseModel):
    alpha: float
    rf_metrics: Dict[str, Any]
    gnn_metrics: Dict[str, Any]
    ensemble_metrics: Dict[str, Any]
    weight_formula: str


class XAIExplanationResponse(BaseModel):
    evidence_id: str
    predicted_label: str
    risk_score: float
    risk_category: str
    rf_confidence: float
    gnn_confidence: float
    shap_feature_contributions: List[Dict[str, Any]]
    graph_neighborhood_reasons: List[str]
    forensic_narrative: str


class TamperSimulateRequest(BaseModel):
    evidence_id: str
    field_to_tamper: str = "ground_truth_label"
    tampered_value: str = "normal"


class IntegrityVerificationResponse(BaseModel):
    status: str  # PASS or FAIL
    total_blocks_checked: int
    fracture_index: Optional[int] = None
    fractured_evidence_id: Optional[str] = None
    reason: Optional[str] = None
    root_hash: str
    verification_timestamp: str


class CertificateValidateRequest(BaseModel):
    case_id: str = "CASE-2026-FORENSIC-01"
    custodian: str = "Lead Forensic Examiner"


class SystemStatusResponse(BaseModel):
    status: str
    version: str
    database_connected: bool
    total_evidence: int
    rf_model_loaded: bool
    gnn_model_loaded: bool
    hash_chain_valid: bool
    environment: str
