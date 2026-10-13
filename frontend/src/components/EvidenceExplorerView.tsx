import React, { useState } from 'react';
import {
  Search, Filter, ChevronLeft, ChevronRight, Eye,
  AlertTriangle, Shield, CheckCircle2, RefreshCw, X, ShieldAlert
} from 'lucide-react';
import { EvidenceItem } from '../types';

interface EvidenceExplorerViewProps {
  items: EvidenceItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onFilterChange: (filters: any) => void;
  onSimulateTamper: (id: string) => Promise<void>;
  onRestoreRecord: (id: string) => Promise<void>;
  onInspectXAI: (id: string) => void;
}

export const EvidenceExplorerView: React.FC<EvidenceExplorerViewProps> = ({
  items,
  total,
  page,
  pageSize,
  totalPages,
  onPageChange,
  onFilterChange,
  onSimulateTamper,
  onRestoreRecord,
  onInspectXAI,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');
  const [selectedAttack, setSelectedAttack] = useState('');
  const [selectedRisk, setSelectedRisk] = useState('');
  const [selectedTampered, setSelectedTampered] = useState<string>('');
  const [activeItem, setActiveItem] = useState<EvidenceItem | null>(null);

  const handleSearchApply = () => {
    onFilterChange({
      search: searchTerm || undefined,
      label: selectedLabel || undefined,
      attackType: selectedAttack || undefined,
      riskLevel: selectedRisk || undefined,
      isTampered: selectedTampered === 'true' ? true : (selectedTampered === 'false' ? false : undefined),
    });
  };

  const getRiskBadge = (score?: number, tier?: string) => {
    const s = score ?? 0;
    let color = 'bg-emerald-950 text-emerald-300 border-emerald-800';
    if (s >= 85) color = 'bg-rose-950 text-rose-300 border-rose-800 font-bold';
    else if (s >= 70) color = 'bg-amber-950 text-amber-300 border-amber-800';
    else if (s >= 40) color = 'bg-indigo-950 text-indigo-300 border-indigo-800';

    return (
      <span className={`px-2 py-0.5 rounded-full border text-[11px] font-mono ${color}`}>
        {s.toFixed(1)} ({tier || 'Low'})
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Header */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Evidence Ledger & Inspector</h1>
            <p className="text-sm text-slate-400 mt-1">
              Search and verify cryptographically sealed multi-source telemetry records.
            </p>
          </div>
          <div className="text-xs font-mono text-slate-400">
            Total Matched: <span className="text-cyan-400 font-bold">{total.toLocaleString()}</span> records
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search ID, user, IP, cmd..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchApply()}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Attack Type */}
          <select
            value={selectedAttack}
            onChange={(e) => { setSelectedAttack(e.target.value); }}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Attack Types</option>
            <option value="Normal">Normal</option>
            <option value="Brute Force">Brute Force</option>
            <option value="Credential Abuse">Credential Abuse</option>
            <option value="Privilege Escalation">Privilege Escalation</option>
            <option value="Lateral Movement">Lateral Movement</option>
            <option value="Command Execution">Command Execution</option>
            <option value="Data Exfiltration">Data Exfiltration</option>
          </select>

          {/* Risk Level */}
          <select
            value={selectedRisk}
            onChange={(e) => { setSelectedRisk(e.target.value); }}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Risk Tiers</option>
            <option value="Critical">Critical (&ge; 85)</option>
            <option value="High">High (70 - 84)</option>
            <option value="Medium">Medium (40 - 69)</option>
            <option value="Low">Low (&lt; 40)</option>
          </select>

          {/* Label */}
          <select
            value={selectedLabel}
            onChange={(e) => { setSelectedLabel(e.target.value); }}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Labels</option>
            <option value="malicious">Malicious</option>
            <option value="normal">Normal</option>
          </select>

          {/* Apply Filter Button */}
          <button
            onClick={handleSearchApply}
            className="w-full py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition shadow-md shadow-cyan-600/20"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Main Evidence Table */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-900/60 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Evidence ID</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Process / Activity</th>
                <th className="py-3 px-4">Destination</th>
                <th className="py-3 px-4">Attack Type</th>
                <th className="py-3 px-4">Adaptive Risk</th>
                <th className="py-3 px-4">Integrity</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {items.map((item) => (
                <tr
                  key={item.evidence_id}
                  className={`hover:bg-slate-900/40 transition cursor-pointer ${
                    item.is_tampered ? 'bg-rose-950/20' : ''
                  }`}
                  onClick={() => setActiveItem(item)}
                >
                  <td className="py-3 px-4 font-bold text-cyan-300">
                    {item.evidence_id}
                    {item.is_simulated && (
                      <span className="ml-1 text-[9px] px-1 py-0.2 rounded bg-amber-950 text-amber-300 font-sans">
                        SIM
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-400 font-sans">{item.timestamp}</td>
                  <td className="py-3 px-4 font-sans">
                    <span className="text-slate-200 font-medium">{item.user}</span>
                    <span className="text-slate-500 text-[11px] block">{item.device}</span>
                  </td>
                  <td className="py-3 px-4 max-w-xs truncate" title={item.command_line || item.process_name}>
                    <span className="text-slate-200 font-semibold">{item.process_name}</span>
                    <span className="text-slate-500 text-[10px] block truncate">{item.command_line}</span>
                  </td>
                  <td className="py-3 px-4">
                    {item.destination_ip}:{item.destination_port}
                  </td>
                  <td className="py-3 px-4 font-sans">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                      item.ground_truth_label === 'malicious'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'bg-slate-800 text-slate-300'
                    }`}>
                      {item.attack_type}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-sans">
                    {getRiskBadge(item.combined_score, item.risk_level)}
                  </td>
                  <td className="py-3 px-4 font-sans">
                    {item.is_tampered ? (
                      <span className="px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-700 text-[10px] font-bold animate-pulse">
                        TAMPERED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px]">
                        SEALED
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-sans">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveItem(item);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-medium border border-slate-700"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs text-slate-400">
          <div>
            Showing page <span className="font-semibold text-slate-200">{page}</span> of{' '}
            <span className="font-semibold text-slate-200">{totalPages}</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-cyan-400 px-2">{page}</span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Selected Evidence Inspector Modal/Drawer */}
      {activeItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 font-mono font-bold">
                  {activeItem.id}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                    <span>Evidence Record: {activeItem.evidence_id}</span>
                    {activeItem.is_tampered && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-700 text-xs font-bold animate-pulse">
                        TAMPERED PAYLOAD
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">{activeItem.timestamp}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveItem(null)}
                className="p-1.5 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* AI Risk & Model Consensus Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
              <div>
                <span className="text-slate-400">Adaptive Risk Score:</span>
                <p className="text-base font-bold font-mono text-cyan-300 mt-0.5">
                  {activeItem.combined_score?.toFixed(1) || 'N/A'} / 100
                </p>
              </div>
              <div>
                <span className="text-slate-400">Random Forest Conf:</span>
                <p className="text-base font-bold font-mono text-slate-200 mt-0.5">
                  {activeItem.rf_prediction !== undefined ? `${(activeItem.rf_prediction * 100).toFixed(1)}%` : 'Untrained'}
                </p>
              </div>
              <div>
                <span className="text-slate-400">PyTorch GNN Conf:</span>
                <p className="text-base font-bold font-mono text-slate-200 mt-0.5">
                  {activeItem.gnn_prediction !== undefined ? `${(activeItem.gnn_prediction * 100).toFixed(1)}%` : 'Untrained'}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Attack Technique:</span>
                <p className="text-base font-bold text-rose-400 mt-0.5">
                  {activeItem.attack_type}
                </p>
              </div>
            </div>

            {/* Cryptographic Hash Chaining Verification */}
            <div className="space-y-2 p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs">
              <span className="font-semibold text-slate-300 uppercase tracking-wider text-[10px]">
                Cryptographic Merkle Linkage
              </span>
              <div className="space-y-1.5 font-mono text-[11px]">
                <div>
                  <span className="text-slate-500">Canonical SHA-256 Hash:</span>
                  <p className="text-cyan-400 break-all select-all">{activeItem.canonical_hash}</p>
                </div>
                <div>
                  <span className="text-slate-500">Previous Block Hash Pointer:</span>
                  <p className="text-slate-400 break-all select-all">{activeItem.prev_hash}</p>
                </div>
                <div>
                  <span className="text-slate-500">Chained Block Hash (H_i):</span>
                  <p className="text-indigo-400 break-all select-all">{activeItem.block_hash}</p>
                </div>
              </div>
            </div>

            {/* Command-Line & Forensic Context */}
            <div className="space-y-2 text-xs">
              <span className="font-semibold text-slate-300">Process & Command Telemetry</span>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-slate-200 break-all">
                {activeItem.command_line || 'No command line telemetry recorded'}
              </div>
            </div>

            {/* Actions: Simulate Tamper, Restore, XAI Studio */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <div className="flex items-center space-x-2">
                {!activeItem.is_tampered ? (
                  <button
                    onClick={async () => {
                      await onSimulateTamper(activeItem.evidence_id);
                      setActiveItem({ ...activeItem, is_tampered: true });
                    }}
                    className="px-3.5 py-2 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-300 text-xs font-semibold border border-rose-800 transition"
                  >
                    Simulate Adversarial Tamper
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      await onRestoreRecord(activeItem.evidence_id);
                      setActiveItem({ ...activeItem, is_tampered: false });
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 text-xs font-semibold border border-emerald-800 transition glow-emerald"
                  >
                    Restore Authentic Cryptographic State
                  </button>
                )}
              </div>

              <button
                onClick={() => {
                  onInspectXAI(activeItem.evidence_id);
                  setActiveItem(null);
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md transition"
              >
                Inspect in XAI Studio &rarr;
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
