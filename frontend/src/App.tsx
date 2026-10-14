import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { OverviewDashboard } from './components/OverviewDashboard';
import { DatasetUploadView } from './components/DatasetUploadView';
import { EvidenceExplorerView } from './components/EvidenceExplorerView';
import { AIAnalyticsView } from './components/AIAnalyticsView';
import { XAIStudioView } from './components/XAIStudioView';
import { EvidenceGraphView } from './components/EvidenceGraphView';
import { AttackTimelineView } from './components/AttackTimelineView';
import { IntegrityVerificationView } from './components/IntegrityVerificationView';
import { ChainOfCustodyView } from './components/ChainOfCustodyView';
import { CertificationReportsView } from './components/CertificationReportsView';
import { LiveStreamingView } from './components/LiveStreamingView';
import { SystemStatusView } from './components/SystemStatusView';
import { RefreshCw } from 'lucide-react';
import { api } from './services/api';
import {
  EvidenceItem, EvidenceSummary, ModelMetrics, EnsembleComparison,
  GraphData, TimelineEvent, IntegrityStatus, CustodyLog, ForensicCertificate,
  DiscoveryData
} from './types';

export function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [summary, setSummary] = useState<EvidenceSummary | null>(null);
  const [discovery, setDiscovery] = useState<DiscoveryData | null>(null);
  
  // Evidence Ledger state
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [evidenceTotal, setEvidenceTotal] = useState(0);
  const [evidencePage, setEvidencePage] = useState(1);
  const [evidenceTotalPages, setEvidenceTotalPages] = useState(1);
  const [evidenceFilters, setEvidenceFilters] = useState<any>({});

  // AI Models state
  const [rfMetrics, setRfMetrics] = useState<ModelMetrics | null>(null);
  const [gnnMetrics, setGnnMetrics] = useState<ModelMetrics | null>(null);
  const [ensembleData, setEnsembleData] = useState<EnsembleComparison | null>(null);
  const [isTrainingRF, setIsTrainingRF] = useState(false);
  const [isTrainingGNN, setIsTrainingGNN] = useState(false);

  // Integrity & Tampering state
  const [integrityStatus, setIntegrityStatus] = useState<IntegrityStatus | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Graph & Timeline state
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [timelineTotal, setTimelineTotal] = useState(0);

  // Custody & Certification state
  const [custodyLogs, setCustodyLogs] = useState<CustodyLog[]>([]);
  const [custodyTotal, setCustodyTotal] = useState(0);
  const [certificates, setCertificates] = useState<ForensicCertificate[]>([]);
  const [activeCert, setActiveCert] = useState<ForensicCertificate | null>(null);
  const [isValidatingCert, setIsValidatingCert] = useState(false);

  // Stream state
  const [isStreaming, setIsStreaming] = useState(true);

  // Ingestion state
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestResult, setIngestResult] = useState<any>(null);

  // Selected Evidence for XAI Studio
  const [selectedXaiEvidenceId, setSelectedXaiEvidenceId] = useState('E000001');

  // Connection & loading state
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load all initial data from backend with auto-retry for cold starts
  const loadInitialData = async (retryCount = 0) => {
    setIsLoadingData(true);
    if (retryCount === 0) {
      setLoadError(null);
    }

    try {
      // First attempt core status and evidence summary in parallel
      const [statusRes, sumRes] = await Promise.all([
        api.getSystemStatus(),
        api.getEvidenceSummary(),
      ]);
      setSystemStatus(statusRes);
      setSummary(sumRes);
      setLoadError(null);

      // Load supporting dataset, models, integrity, and topology in parallel
      Promise.allSettled([
        api.discoverDatasets().then(setDiscovery),
        api.getEvidenceList({ page: 1, pageSize: 25 }).then((evRes) => {
          setEvidenceItems(evRes.items);
          setEvidenceTotal(evRes.total);
          setEvidenceTotalPages(evRes.total_pages);
        }),
        api.getRFMetrics().then(setRfMetrics),
        api.getGNNMetrics().then(setGnnMetrics),
        api.getEnsembleComparison().then(setEnsembleData),
        api.verifyIntegrity().then(setIntegrityStatus),
        api.getGraphTopology({ limit: 120 }).then(setGraphData),
        api.getTimelineEvents({ limit: 80 }).then((tRes) => {
          setTimelineEvents(tRes.events);
          setTimelineTotal(tRes.total);
        }),
        api.getCustodyLogs(undefined, 50).then((cRes) => {
          setCustodyLogs(cRes.logs);
          setCustodyTotal(cRes.total);
        }),
        api.listCertificates().then((certRes) => {
          setCertificates(certRes.certificates);
          if (certRes.certificates.length > 0) {
            setActiveCert(certRes.certificates[0]);
          }
        }),
      ]).finally(() => {
        setIsLoadingData(false);
      });
    } catch (err: any) {
      console.warn(`Initial load failed (attempt ${retryCount + 1}):`, err);
      if (retryCount < 4) {
        setTimeout(() => loadInitialData(retryCount + 1), 3000);
      } else {
        setIsLoadingData(false);
        setLoadError(err.message || 'Failed to connect to backend server.');
      }
    }
  };

  useEffect(() => {
    loadInitialData(0);
  }, []);

  // Evidence Explorer actions
  const fetchEvidence = async (page: number, filters: any = evidenceFilters) => {
    try {
      const res = await api.getEvidenceList({ page, pageSize: 25, ...filters });
      setEvidenceItems(res.items);
      setEvidenceTotal(res.total);
      setEvidencePage(res.page);
      setEvidenceTotalPages(res.total_pages);
    } catch (err) {
      console.error('Failed to fetch evidence:', err);
    }
  };

  const handleFilterChange = (newFilters: any) => {
    setEvidenceFilters(newFilters);
    fetchEvidence(1, newFilters);
  };

  // Ingestion action
  const handleExecuteIngest = async (maxRecords?: number, custodian?: string) => {
    setIsIngesting(true);
    try {
      const res = await api.ingestDatasets(maxRecords, custodian);
      setIngestResult(res);
      await loadInitialData();
    } catch (err: any) {
      alert(`Ingestion error: ${err.message}`);
    } finally {
      setIsIngesting(false);
    }
  };

  // Upload action
  const handleUploadFile = async (file: File) => {
    await api.uploadDataset(file);
    const disc = await api.discoverDatasets();
    setDiscovery(disc);
  };

  // AI Training actions
  const handleTrainRF = async (nEst: number, maxDepth: number) => {
    setIsTrainingRF(true);
    try {
      await api.trainRandomForest(nEst, maxDepth);
      const rf = await api.getRFMetrics();
      setRfMetrics(rf);
      const ens = await api.getEnsembleComparison();
      setEnsembleData(ens);
      await fetchEvidence(evidencePage);
    } catch (err: any) {
      alert(`Training RF error: ${err.message}`);
    } finally {
      setIsTrainingRF(false);
    }
  };

  const handleTrainGNN = async (epochs: number, lr: number, hiddenDim: number) => {
    setIsTrainingGNN(true);
    try {
      await api.trainGNN(epochs, lr, hiddenDim);
      const gnn = await api.getGNNMetrics();
      setGnnMetrics(gnn);
      const ens = await api.getEnsembleComparison();
      setEnsembleData(ens);
      await fetchEvidence(evidencePage);
    } catch (err: any) {
      alert(`Training GNN error: ${err.message}`);
    } finally {
      setIsTrainingGNN(false);
    }
  };

  const handleReweightEnsemble = async (alpha: number) => {
    try {
      const res = await api.reweightEnsemble(alpha);
      setEnsembleData(res);
      await fetchEvidence(evidencePage);
    } catch (err: any) {
      alert(`Ensemble reweight error: ${err.message}`);
    }
  };

  // Integrity actions
  const handleVerifyIntegrity = async () => {
    setIsVerifying(true);
    try {
      const res = await api.verifyIntegrity();
      setIntegrityStatus(res);
      const statusRes = await api.getSystemStatus();
      setSystemStatus(statusRes);
    } catch (err: any) {
      alert(`Verification error: ${err.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSimulateTamper = async (id: string, field = 'ground_truth_label', val = 'normal') => {
    await api.simulateTamper(id, field, val);
    await handleVerifyIntegrity();
    await fetchEvidence(evidencePage);
  };

  const handleRestoreRecord = async (id: string) => {
    await api.restoreTampered(id);
    await handleVerifyIntegrity();
    await fetchEvidence(evidencePage);
  };

  // Certification action
  const handleValidateCertificate = async (caseId: string, custodian: string) => {
    setIsValidatingCert(true);
    try {
      const cert = await api.validateAndIssueCertificate(caseId, custodian);
      setActiveCert(cert);
      const certList = await api.listCertificates();
      setCertificates(certList.certificates);
    } catch (err: any) {
      alert(`Certification error: ${err.message}`);
    } finally {
      setIsValidatingCert(false);
    }
  };

  // Stream action
  const handleControlStream = async (running: boolean) => {
    await api.controlStream(running);
    setIsStreaming(running);
  };

  const handleNavigateToXAI = (id: string) => {
    setSelectedXaiEvidenceId(id);
    setActiveTab('xai');
  };

  const handleNavigateToEvidence = (id: string) => {
    setActiveTab('evidence');
    handleFilterChange({ search: id });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        systemStatus={systemStatus}
        onVerifyClick={() => {
          setActiveTab('integrity');
          handleVerifyIntegrity();
        }}
        isStreaming={isStreaming}
        activeTab={activeTab}
      />

      {/* Backend Connecting / Waking Banner */}
      {!summary && (
        <div className="bg-cyan-950/90 border-b border-cyan-800/80 px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-cyan-200">
          <div className="flex items-center space-x-2">
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isLoadingData ? 'animate-spin' : ''}`} />
            <span>
              {isLoadingData
                ? 'Connecting to Render Cloud Backend (waking up free tier server)...'
                : (loadError ? `Backend connection: ${loadError}` : 'Backend is taking a moment to respond. Click Retry to connect.')}
            </span>
          </div>
          <button
            onClick={() => loadInitialData(0)}
            className="px-3 py-1 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white font-semibold text-[11px] transition shadow"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          tamperedCount={summary?.total_tampered ?? 0}
        />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {activeTab === 'overview' && (
            <OverviewDashboard
              summary={summary}
              onNavigate={setActiveTab}
              onVerifyIntegrity={() => {
                setActiveTab('integrity');
                handleVerifyIntegrity();
              }}
              onIngestClick={() => setActiveTab('datasets')}
              onTrainModelsClick={() => setActiveTab('models')}
              onCertifyClick={() => setActiveTab('certification')}
              isLoading={isLoadingData}
              error={loadError}
              onRetry={() => loadInitialData(0)}
            />
          )}

          {activeTab === 'datasets' && (
            <DatasetUploadView
              discovery={discovery}
              onRefreshDiscovery={async () => {
                const disc = await api.discoverDatasets();
                setDiscovery(disc);
              }}
              onUploadFile={handleUploadFile}
              onExecuteIngest={handleExecuteIngest}
              isIngesting={isIngesting}
              ingestResult={ingestResult}
            />
          )}

          {activeTab === 'evidence' && (
            <EvidenceExplorerView
              items={evidenceItems}
              total={evidenceTotal}
              page={evidencePage}
              pageSize={25}
              totalPages={evidenceTotalPages}
              onPageChange={(p) => fetchEvidence(p)}
              onFilterChange={handleFilterChange}
              onSimulateTamper={handleSimulateTamper}
              onRestoreRecord={handleRestoreRecord}
              onInspectXAI={handleNavigateToXAI}
            />
          )}

          {activeTab === 'models' && (
            <AIAnalyticsView
              rfMetrics={rfMetrics}
              gnnMetrics={gnnMetrics}
              ensembleData={ensembleData}
              onTrainRF={handleTrainRF}
              onTrainGNN={handleTrainGNN}
              onReweightEnsemble={handleReweightEnsemble}
              isTrainingRF={isTrainingRF}
              isTrainingGNN={isTrainingGNN}
            />
          )}

          {activeTab === 'xai' && (
            <XAIStudioView
              initialEvidenceId={selectedXaiEvidenceId}
              onFetchExplanation={api.explainEvidence}
              isLoading={false}
            />
          )}

          {activeTab === 'graph' && (
            <EvidenceGraphView
              graphData={graphData}
              onRefreshGraph={async (filters) => {
                const g = await api.getGraphTopology(filters);
                setGraphData(g);
              }}
              onSelectEvidence={handleNavigateToEvidence}
              isLoading={!graphData}
            />
          )}

          {activeTab === 'timeline' && (
            <AttackTimelineView
              events={timelineEvents}
              total={timelineTotal}
              onFilterTimeline={async (inc, att) => {
                const res = await api.getTimelineEvents({ incidentId: inc, attackType: att, limit: 100 });
                setTimelineEvents(res.events);
                setTimelineTotal(res.total);
              }}
              onSelectEvidence={handleNavigateToEvidence}
              isLoading={false}
            />
          )}

          {activeTab === 'integrity' && (
            <IntegrityVerificationView
              integrityStatus={integrityStatus}
              onVerify={handleVerifyIntegrity}
              onSimulateTamper={handleSimulateTamper}
              onRestore={handleRestoreRecord}
              onFetchBlocks={api.getHashBlocks}
              isVerifying={isVerifying}
            />
          )}

          {activeTab === 'custody' && (
            <ChainOfCustodyView
              logs={custodyLogs}
              total={custodyTotal}
              isLoading={false}
            />
          )}

          {activeTab === 'certification' && (
            <CertificationReportsView
              certificates={certificates}
              activeCert={activeCert}
              onValidateAndIssue={handleValidateCertificate}
              onDownloadPdf={(id) => window.open(api.getCertificatePdfUrl(id), '_blank')}
              onDownloadJson={(id) => window.open(api.getCertificateJsonUrl(id), '_blank')}
              isValidating={isValidatingCert}
            />
          )}

          {activeTab === 'stream' && (
            <LiveStreamingView
              onControlSimulation={handleControlStream}
              isStreaming={isStreaming}
              onSelectEvidence={handleNavigateToEvidence}
            />
          )}

          {activeTab === 'status' && (
            <SystemStatusView
              systemStatus={systemStatus}
              onRefresh={loadInitialData}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
