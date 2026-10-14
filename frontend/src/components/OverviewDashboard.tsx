import React from 'react';
import {
  ShieldAlert, CheckCircle2, AlertOctagon, TrendingUp,
  Database, RefreshCw, Zap, Cpu, Award
} from 'lucide-react';
import { EvidenceSummary } from '../types';

interface OverviewDashboardProps {
  summary: EvidenceSummary | null;
  onNavigate: (tab: string) => void;
  onVerifyIntegrity: () => void;
  onIngestClick: () => void;
  onTrainModelsClick: () => void;
  onCertifyClick: () => void;
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  summary,
  onNavigate,
  onVerifyIntegrity,
  onIngestClick,
  onTrainModelsClick,
  onCertifyClick,
  isLoading,
  error,
  onRetry,
}) => {
  const total = summary?.total_evidence ?? 0;
  const malicious = summary?.total_malicious ?? 0;
  const tampered = summary?.total_tampered ?? 0;
  const malPercentage = total > 0 ? ((malicious / total) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl glass-panel border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
            Cyber-Forensics Investigation Command Center
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Deterministic cryptographic correlation across 7 telemetry sensors with dual AI detection.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onIngestClick}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700"
          >
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>Ingest Datasets</span>
          </button>
          <button
            onClick={onTrainModelsClick}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700"
          >
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>Train Dual AI</span>
          </button>
          <button
            onClick={onVerifyIntegrity}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Verify Hash Chain</span>
          </button>
          <button
            onClick={onCertifyClick}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/20 transition"
          >
            <Award className="w-4 h-4" />
            <span>Certify Evidence</span>
          </button>
        </div>
      </div>

      {/* Error Alert if summary failed to load */}
      {error && !summary && (
        <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800/80 flex items-center justify-between gap-4 text-xs text-rose-200">
          <div className="flex items-center space-x-3">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <p className="font-bold text-rose-200">Backend Connection Error</p>
              <p className="text-rose-300/80 mt-0.5">{error}</p>
            </div>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-3 py-1.5 rounded-lg bg-rose-800 hover:bg-rose-700 text-white font-semibold shrink-0 transition"
            >
              Retry Connection
            </button>
          )}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Evidence Records */}
        <div className="p-5 rounded-2xl glass-panel border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Total Evidence</span>
            <Database className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-3xl font-bold text-slate-100 mt-3 font-mono">
            {isLoading && !summary ? '...' : total.toLocaleString()}
          </p>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>Canonical SHA-256 blocks</span>
            <span className="text-cyan-400 font-semibold">100% Chained</span>
          </div>
        </div>

        {/* Malicious Events Detected */}
        <div className="p-5 rounded-2xl glass-panel border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Malicious Threats</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-3xl font-bold text-rose-400 mt-3 font-mono">
            {isLoading && !summary ? '...' : malicious.toLocaleString()}
          </p>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>Prevalence Rate</span>
            <span className="text-rose-400 font-semibold">{malPercentage}% of telemetry</span>
          </div>
        </div>

        {/* Tamper Status */}
        <div className={`p-5 rounded-2xl glass-panel border relative overflow-hidden ${
          tampered > 0 ? 'border-rose-700 bg-rose-950/20' : 'border-emerald-800/60 bg-emerald-950/10'
        }`}>
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Chain Non-Repudiation</span>
            {tampered > 0 ? (
              <AlertOctagon className="w-4 h-4 text-rose-400 animate-pulse" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            )}
          </div>
          <p className={`text-2xl font-bold mt-3 font-mono ${tampered > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {tampered > 0 ? `${tampered} TAMPERED` : 'VERIFIED (PASS)'}
          </p>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>Hash Fractures</span>
            <span className={tampered > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
              {tampered > 0 ? 'Fracture Detected' : '0 Broken Blocks'}
            </span>
          </div>
        </div>

        {/* Adaptive Risk Distribution */}
        <div className="p-5 rounded-2xl glass-panel border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Critical Risk Alerts</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-3xl font-bold text-amber-400 mt-3 font-mono">
            {isLoading && !summary ? '...' : (summary?.critical_risk_count ?? 0).toLocaleString()}
          </p>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>Score &ge; 85 / 100</span>
            <span className="text-amber-400 font-semibold">Immediate Action</span>
          </div>
        </div>
      </div>

      {/* Two-Column Analytics Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attack Type Distribution */}
        <div className="lg:col-span-2 p-6 rounded-2xl glass-panel border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Threat Breakdown by Attack Kill Chain
              </h2>
              <p className="text-xs text-slate-400">
                Correlated incident telemetry categorized by attack technique
              </p>
            </div>
            <button
              onClick={() => onNavigate('timeline')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
            >
              View Timeline &rarr;
            </button>
          </div>

          <div className="space-y-3.5 pt-2">
            {summary && summary.top_attack_types && Object.keys(summary.top_attack_types).length > 0 ? (
              Object.entries(summary.top_attack_types).map(([attack, count]) => {
                const pct = malicious > 0 ? Math.round((count / malicious) * 100) : 0;
                return (
                  <div key={attack} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">{attack}</span>
                      <div className="flex items-center space-x-2 font-mono">
                        <span className="text-slate-400">{count} events</span>
                        <span className="text-cyan-400 font-semibold">({pct}%)</span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full"
                        style={{ width: `${Math.max(5, pct)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-500 py-6 text-center">
                No threat telemetry loaded. Click "Ingest Datasets" to populate.
              </p>
            )}
          </div>
        </div>

        {/* Risk Categories & Top Flagged Entities */}
        <div className="space-y-6">
          {/* Adaptive Risk Tier Breakdown */}
          <div className="p-6 rounded-2xl glass-panel border border-slate-800">
            <h2 className="text-base font-bold text-slate-100 mb-3">Adaptive Risk Tiers</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[11px] text-rose-400 font-medium uppercase">Critical (85-100)</span>
                <p className="text-xl font-bold text-slate-100 font-mono mt-1">
                  {summary?.critical_risk_count ?? 0}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[11px] text-amber-400 font-medium uppercase">High (70-84)</span>
                <p className="text-xl font-bold text-slate-100 font-mono mt-1">
                  {summary?.high_risk_count ?? 0}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[11px] text-indigo-400 font-medium uppercase">Medium (40-69)</span>
                <p className="text-xl font-bold text-slate-100 font-mono mt-1">
                  {summary?.medium_risk_count ?? 0}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[11px] text-emerald-400 font-medium uppercase">Low (0-39)</span>
                <p className="text-xl font-bold text-slate-100 font-mono mt-1">
                  {summary?.low_risk_count ?? 0}
                </p>
              </div>
            </div>
          </div>

          {/* Top Flagged Hosts */}
          <div className="p-6 rounded-2xl glass-panel border border-slate-800">
            <h2 className="text-base font-bold text-slate-100 mb-3">Top Flagged Hosts</h2>
            <div className="space-y-2">
              {summary?.top_flagged_devices?.slice(0, 4).map((d) => (
                <div
                  key={d.device}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/80 text-xs"
                >
                  <span className="font-mono text-cyan-300 font-medium">{d.device}</span>
                  <span className="font-mono text-rose-400 font-semibold">{d.malicious_events} threats</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
