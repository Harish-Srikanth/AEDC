import React from 'react';
import { Shield, ShieldAlert, CheckCircle2, AlertTriangle, Radio } from 'lucide-react';

interface NavbarProps {
  systemStatus: {
    status: string;
    version: string;
    hash_chain_valid: boolean;
    total_evidence: number;
  } | null;
  onVerifyClick: () => void;
  isStreaming: boolean;
  activeTab: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  systemStatus,
  onVerifyClick,
  isStreaming,
}) => {
  const isIntact = systemStatus?.hash_chain_valid ?? true;

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-6 flex items-center justify-between">
      {/* Brand & Project Identity */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 p-0.5 shadow-lg shadow-cyan-500/20">
          <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
            <Shield className="w-5 h-5 text-cyan-400" />
          </div>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-lg text-slate-100 tracking-tight">AEDC</span>
            <span className="text-xs uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300 font-mono">
              Cyber Forensics
            </span>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">
            Adaptive AI Forensics & Evidence Certification Platform
          </p>
        </div>
      </div>

      {/* Real-time Status Badges */}
      <div className="flex items-center space-x-4">
        {/* Streaming Indicator */}
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
          <Radio className={`w-3.5 h-3.5 ${isStreaming ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
          <span className="text-slate-300 font-medium hidden md:inline">Stream:</span>
          <span className={isStreaming ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
            {isStreaming ? 'ACTIVE' : 'IDLE'}
          </span>
        </div>

        {/* Cryptographic Hash Chain Status */}
        <button
          onClick={onVerifyClick}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
            isIntact
              ? 'bg-emerald-950/50 border-emerald-800/80 text-emerald-300 hover:bg-emerald-900/50 glow-emerald'
              : 'bg-rose-950/60 border-rose-700 text-rose-300 hover:bg-rose-900/60 glow-crimson animate-pulse'
          }`}
          title="Click to perform full cryptographic verification"
        >
          {isIntact ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>CHAIN INTACT (SHA-256)</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span className="font-bold">FRACTURE DETECTED</span>
            </>
          )}
        </button>

        {/* Case ID Pill */}
        <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400 font-mono">
          <span className="text-slate-500">CASE:</span>
          <span className="text-cyan-400 font-semibold">CASE-2026-FORENSIC-01</span>
        </div>
      </div>
    </header>
  );
};
