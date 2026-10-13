import React from 'react';
import { Activity, Database, Cpu, CheckCircle2, Server, Globe } from 'lucide-react';

interface SystemStatusViewProps {
  systemStatus: {
    status: string;
    version: string;
    database_connected: boolean;
    total_evidence: number;
    rf_model_loaded: boolean;
    gnn_model_loaded: boolean;
    hash_chain_valid: boolean;
    environment: string;
  } | null;
  onRefresh: () => void;
}

export const SystemStatusView: React.FC<SystemStatusViewProps> = ({
  systemStatus,
  onRefresh,
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center space-x-2">
            <Activity className="w-6 h-6 text-cyan-400" />
            <span>Platform Health & System Diagnostics</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time verification of backend subsystems, model weights, and database storage.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
        >
          Refresh Diagnostics
        </button>
      </div>

      {/* Diagnostics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
        <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-2">
          <span className="text-slate-400 font-sans font-medium uppercase text-[11px]">Backend API</span>
          <p className="text-lg font-bold text-emerald-400 flex items-center space-x-2 font-sans">
            <CheckCircle2 className="w-4 h-4" />
            <span>{systemStatus?.status.toUpperCase() || 'ONLINE'}</span>
          </p>
          <span className="text-slate-500 block text-[11px]">FastAPI v0.115+</span>
        </div>

        <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-2">
          <span className="text-slate-400 font-sans font-medium uppercase text-[11px]">Persistent Database</span>
          <p className="text-lg font-bold text-cyan-300 flex items-center space-x-2 font-sans">
            <Database className="w-4 h-4" />
            <span>{systemStatus?.database_connected ? 'CONNECTED' : 'OFFLINE'}</span>
          </p>
          <span className="text-slate-500 block text-[11px]">SQLite Persistent Engine</span>
        </div>

        <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-2">
          <span className="text-slate-400 font-sans font-medium uppercase text-[11px]">Random Forest Model</span>
          <p className="text-lg font-bold text-indigo-300 flex items-center space-x-2 font-sans">
            <Cpu className="w-4 h-4" />
            <span>{systemStatus?.rf_model_loaded ? 'WEIGHTS ACTIVE' : 'UNLOADED'}</span>
          </p>
          <span className="text-slate-500 block text-[11px]">rf_model.joblib</span>
        </div>

        <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-2">
          <span className="text-slate-400 font-sans font-medium uppercase text-[11px]">PyTorch GNN Model</span>
          <p className="text-lg font-bold text-purple-300 flex items-center space-x-2 font-sans">
            <Server className="w-4 h-4" />
            <span>{systemStatus?.gnn_model_loaded ? 'WEIGHTS ACTIVE' : 'UNLOADED'}</span>
          </p>
          <span className="text-slate-500 block text-[11px]">gnn_model.pt (PyTorch 2.x)</span>
        </div>
      </div>

      {/* Deployment & Architecture Guide */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
          <Globe className="w-4 h-4 text-cyan-400" />
          <span>Production Deployment Architecture</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <span className="font-bold text-cyan-400 uppercase tracking-wider text-[11px]">
              Frontend on Vercel
            </span>
            <p className="text-slate-300">
              Vite React Single Page Application deployed with SPA rewrites configured in <code className="text-cyan-300">frontend/vercel.json</code>.
            </p>
            <div className="font-mono text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
              VITE_API_URL = https://&lt;your-backend&gt;.onrender.com/api
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <span className="font-bold text-indigo-400 uppercase tracking-wider text-[11px]">
              Backend on Render
            </span>
            <p className="text-slate-300">
              FastAPI ASGI container web service deployed with blueprint <code className="text-indigo-300">backend/render.yaml</code> and Dockerfile.
            </p>
            <div className="font-mono text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
              uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
