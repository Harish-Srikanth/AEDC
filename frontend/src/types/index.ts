export interface EvidenceItem {
  id: number;
  evidence_id: string;
  timestamp: string;
  user?: string;
  device?: string;
  source_ip?: string;
  destination_ip?: string;
  destination_port?: number;
  protocol?: string;
  action?: string;
  process_name?: string;
  command_line?: string;
  file_path?: string;
  query_domain?: string;
  usb_device_id?: string;
  canonical_hash: string;
  prev_hash: string;
  block_hash: string;
  is_tampered: boolean;
  ground_truth_label: string;
  attack_type: string;
  incident_id?: string;
  user_risk_level: string;
  asset_criticality: string;
  rf_prediction?: number;
  gnn_prediction?: number;
  combined_score?: number;
  risk_level?: string;
  is_simulated?: boolean;
}

export interface EvidenceSummary {
  total_evidence: number;
  total_malicious: number;
  total_benign: number;
  total_tampered: number;
  critical_risk_count: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  top_attack_types: Record<string, number>;
  top_flagged_users: Array<{ user: string; malicious_events: number }>;
  top_flagged_devices: Array<{ device: string; malicious_events: number }>;
  hash_chain_status: string;
}

export interface ModelMetrics {
  model_type: string;
  version: string;
  trained_at: string;
  metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
    roc_auc: number;
    confusion_matrix: number[][];
    feature_importance?: Array<{ feature: string; importance: number; rank: number }>;
    loss_history?: number[];
    test_size?: number;
    train_size?: number;
  };
}

export interface EnsembleComparison {
  alpha: number;
  rf_metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
    roc_auc: number;
    confusion_matrix: number[][];
  };
  gnn_metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
    roc_auc: number;
    confusion_matrix: number[][];
  };
  ensemble_metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
    roc_auc: number;
    confusion_matrix: number[][];
  };
  weight_formula: string;
}

export interface XAIExplanation {
  evidence_id: string;
  predicted_label: string;
  risk_score: number;
  risk_category: string;
  rf_confidence: number;
  gnn_confidence: number;
  shap_feature_contributions: Array<{
    feature: string;
    raw_value: number;
    shap_value: number;
    impact: string;
    abs_impact: number;
  }>;
  graph_neighborhood_reasons: string[];
  forensic_narrative: string;
}

export interface GraphNode {
  id: string;
  name: string;
  type: 'event' | 'user' | 'device' | 'process' | 'destination_ip' | 'domain' | 'usb';
  risk_score?: number;
  risk_level?: string;
  is_malicious?: boolean;
  attack_type?: string;
  details?: string;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  label?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  total_nodes: number;
  total_edges: number;
}

export interface TimelineEvent extends EvidenceItem {
  kill_chain_stage?: string;
}

export interface IntegrityStatus {
  status: 'PASS' | 'FAIL';
  total_blocks_checked: number;
  fracture_index?: number;
  fractured_evidence_id?: string;
  reason?: string;
  root_hash: string;
  verification_timestamp: string;
}

export interface CustodyLog {
  id: number;
  evidence_id: string;
  timestamp: string;
  custodian: string;
  action: string;
  hash_state: string;
  details?: string;
}

export interface ForensicCertificate {
  id: string;
  created_at: string;
  case_id: string;
  custodian: string;
  total_records: number;
  verified_records: number;
  tampered_records: number;
  verdict: 'PASS' | 'FAIL' | 'REVIEW REQUIRED';
  root_hash: string;
  integrity_check_passed: boolean;
  model_consensus_passed: boolean;
  custody_check_passed: boolean;
  provenance_check_passed: boolean;
  certificate_digest: string;
  has_pdf: boolean;
  has_json: boolean;
}

export interface DatasetFileInfo {
  filename: string;
  file_type: string;
  size_bytes: number;
  row_count?: number;
  columns: string[];
  status: string;
}

export interface DiscoveryData {
  dataset_directory: string;
  available_files: DatasetFileInfo[];
  correlated_sources: string[];
  is_ready_to_ingest: boolean;
}
