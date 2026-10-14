import {
  EvidenceItem, EvidenceSummary, ModelMetrics, EnsembleComparison,
  XAIExplanation, GraphData, TimelineEvent, IntegrityStatus,
  CustodyLog, ForensicCertificate, DiscoveryData
} from '../types';

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? '/api' : 'https://aedc-backend.onrender.com/api');

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, options);
  if (!res.ok) {
    let errDetail = `HTTP ${res.status}: ${res.statusText}`;
    try {
      const errJson = await res.json();
      if (errJson.detail) errDetail = errJson.detail;
    } catch (_) {}
    throw new Error(errDetail);
  }
  return res.json();
}

export const api = {
  // Health & Status
  getHealth: () => fetchJson<{ status: string; version: string; database: string }>('/health'),
  getSystemStatus: () => fetchJson<{
    status: string;
    version: string;
    database_connected: boolean;
    total_evidence: number;
    rf_model_loaded: boolean;
    gnn_model_loaded: boolean;
    hash_chain_valid: boolean;
    environment: string;
  }>('/system/status'),

  // Datasets
  discoverDatasets: () => fetchJson<DiscoveryData>('/datasets/discover'),
  uploadDataset: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetchJson<{ filename: string; size_bytes: number; status: string }>('/datasets/upload', {
      method: 'POST',
      body: formData,
    });
  },
  ingestDatasets: (maxRecords?: number, custodian = 'Senior Cyber Forensics Examiner') =>
    fetchJson<{
      total_ingested: number;
      total_malicious: number;
      total_normal: number;
      root_hash: string;
      genesis_hash: string;
      duration_seconds: number;
      message: string;
    }>('/datasets/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ max_records: maxRecords, custodian, reset_existing: true }),
    }),

  // Evidence Ledger
  getEvidenceList: (params: {
    page?: number;
    pageSize?: number;
    search?: string;
    label?: string;
    attackType?: string;
    user?: string;
    device?: string;
    riskLevel?: string;
    isTampered?: boolean;
  }) => {
    const q = new URLSearchParams();
    if (params.page) q.append('page', params.page.toString());
    if (params.pageSize) q.append('page_size', params.pageSize.toString());
    if (params.search) q.append('search', params.search);
    if (params.label) q.append('label', params.label);
    if (params.attackType) q.append('attack_type', params.attackType);
    if (params.user) q.append('user', params.user);
    if (params.device) q.append('device', params.device);
    if (params.riskLevel) q.append('risk_level', params.riskLevel);
    if (params.isTampered !== undefined) q.append('is_tampered', params.isTampered.toString());
    return fetchJson<{
      items: EvidenceItem[];
      total: number;
      page: number;
      page_size: number;
      total_pages: number;
    }>(`/evidence?${q.toString()}`);
  },
  getEvidenceSummary: () => fetchJson<EvidenceSummary>('/evidence/summary'),
  getEvidenceDetail: (id: string) => fetchJson<EvidenceItem>(`/evidence/${id}`),

  // AI Models
  trainRandomForest: (nEstimators = 100, maxDepth = 16) =>
    fetchJson<{ model_type: string; version: string; metrics: any }>('/models/train/rf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ n_estimators: nEstimators, max_depth: maxDepth }),
    }),
  getRFMetrics: () => fetchJson<ModelMetrics>('/models/metrics/rf'),
  trainGNN: (epochs = 40, learningRate = 0.01, hiddenDim = 64) =>
    fetchJson<{ model_type: string; version: string; metrics: any }>('/gnn/train', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ epochs, learning_rate: learningRate, hidden_dim: hiddenDim }),
    }),
  getGNNMetrics: () => fetchJson<ModelMetrics>('/gnn/metrics'),
  reweightEnsemble: (alpha: number) =>
    fetchJson<EnsembleComparison>('/models/ensemble/reweight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alpha }),
    }),
  getEnsembleComparison: (alpha = 0.55) =>
    fetchJson<EnsembleComparison>(`/models/ensemble/comparison?alpha=${alpha}`),

  // Explainable AI
  explainEvidence: (id: string) => fetchJson<XAIExplanation>(`/xai/explain/${id}`),
  getXAIGlobalSummary: () => fetchJson<{ feature_importance: Array<{ feature: string; importance: number; rank: number }> }>('/xai/global-summary'),

  // Graph Explorer & Timeline
  getGraphTopology: (params?: {
    focusId?: string;
    attackType?: string;
    riskLevel?: string;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.focusId) q.append('focus_evidence_id', params.focusId);
    if (params?.attackType) q.append('attack_type', params.attackType);
    if (params?.riskLevel) q.append('risk_level', params.riskLevel);
    if (params?.limit) q.append('limit', params.limit.toString());
    return fetchJson<GraphData>(`/graph/topology?${q.toString()}`);
  },
  getTimelineEvents: (params?: {
    incidentId?: string;
    attackType?: string;
    riskLevel?: string;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.incidentId) q.append('incident_id', params.incidentId);
    if (params?.attackType) q.append('attack_type', params.attackType);
    if (params?.riskLevel) q.append('risk_level', params.riskLevel);
    if (params?.limit) q.append('limit', params.limit.toString());
    return fetchJson<{ events: TimelineEvent[]; total: number; incident_filter?: string }>(`/timeline/events?${q.toString()}`);
  },

  // Cryptographic Integrity & Tampering
  verifyIntegrity: () => fetchJson<IntegrityStatus>('/integrity/verify'),
  simulateTamper: (evidenceId: string, field = 'ground_truth_label', value = 'normal') =>
    fetchJson<{ status: string; evidence_id: string; message: string }>('/integrity/tamper-simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evidence_id: evidenceId, field_to_tamper: field, tampered_value: value }),
    }),
  restoreTampered: (evidenceId: string) =>
    fetchJson<{ status: string; evidence_id: string; message: string }>(`/integrity/restore/${evidenceId}`, {
      method: 'POST',
    }),
  getHashBlocks: (limit = 50) =>
    fetchJson<{ blocks: Array<{ block_index: number; evidence_id: string; timestamp: string; canonical_hash: string; prev_hash: string; block_hash: string; is_tampered: boolean }> }>(`/integrity/blocks?limit=${limit}`),

  // Chain of Custody
  getCustodyLogs: (evidenceId?: string, limit = 100) => {
    const q = new URLSearchParams({ limit: limit.toString() });
    if (evidenceId) q.append('evidence_id', evidenceId);
    return fetchJson<{ logs: CustodyLog[]; total: number }>(`/custody/logs?${q.toString()}`);
  },

  // Certification
  validateAndIssueCertificate: (caseId = 'CASE-2026-FORENSIC-01', custodian = 'Lead Forensic Examiner') =>
    fetchJson<ForensicCertificate>('/certification/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ case_id: caseId, custodian }),
    }),
  listCertificates: () => fetchJson<{ certificates: ForensicCertificate[]; total: number }>('/certification/list'),
  getCertificatePdfUrl: (certId: string) => `${API_BASE}/certification/download/pdf/${certId}`,
  getCertificateJsonUrl: (certId: string) => `${API_BASE}/certification/download/json/${certId}`,

  // Simulator stream
  controlStream: (running: boolean) =>
    fetchJson<{ simulation_running: boolean }>('/stream/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ running }),
    }),
  getStreamStatus: () => fetchJson<{ simulation_running: boolean }>('/stream/status'),
  getStreamUrl: (interval = 3.0) => `${API_BASE}/stream/events?interval=${interval}`,
};
