import React, { useState, useEffect } from 'react';
import {
  KeyRound, CheckCircle2, AlertOctagon, RefreshCw,
  ShieldAlert, ShieldCheck, Play, ArrowDown
} from 'lucide-react';
import { IntegrityStatus } from '../types';

interface IntegrityVerificationViewProps {
  integrityStatus: IntegrityStatus | null;
  onVerify: () => Promise<void>;
  onSimulateTamper: (id: string, field: string, val: string) => Promise<void>;
  onRestore: (id: string) => Promise<void>;
  onFetchBlocks: (limit?: number) => Promise<any>;
  isVerifying: boolean;
}

export const IntegrityVerificationView: React.FC<IntegrityVerificationViewProps> = ({
  integrityStatus,
  onVerify,
  onSimulateTamper,
  onRestore,
  onFetchBlocks,
  isVerifying,
}) => {
  const [targetId, setTargetId] = useState('E000007');
  const [tamperValue, setTamperValue] = useState('normal');
  const [blocks, setBlocks] = useState<any[]>([]);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadBlocks = async () => {
    try {
      const res = await onFetchBlocks(25);
      if (res && res.blocks) setBlocks(res.blocks);
    } catch (_) {}
  };

  useEffect(() => {
    loadBlocks();
  }, []);

  const handleTamper = async () => {
    setActionMessage(null);
    try {
      await onSimulateTamper(targetId, 'ground_truth_label', tamperValue);
      setActionMessage(`Record ${targetId} payload altered. Click 'Verify Entire Hash Chain' to test detection.`);
      await loadBlocks();
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    }
  };

  const handleRestore = async () => {
    setActionMessage(null);
    try {
      await onRestore(targetId);
      setActionMessage(`Record ${targetId} restored to authentic cryptographic state.`);
      await loadBlocks();
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    }
  };

  const isPass = integrityStatus?.status === 'PASS';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center space-x-2">
            <KeyRound className="w-6 h-6 text-cyan-400" />
            <span>Cryptographic Merkle Hash Chain & Non-Repudiation</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Validates continuous SHA-256 recursive linkage: H_i = SHA256(H_i-1 || Canonical_i).
          </p>
        </div>

        <button
          onClick={async () => {
            await onVerify();
            await loadBlocks();
          }}
          disabled={isVerifying}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/20 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isVerifying ? 'animate-spin' : ''}`} />
          <span>{isVerifying ? 'Verifying Entire Chain...' : 'Verify Entire Hash Chain'}</span>
        </button>
      </div>

      {/* Verification Status Banner */}
      {integrityStatus && (
        <div className={`p-6 rounded-2xl glass-panel border flex flex-col sm:flex-row items-center justify-between gap-4 ${
          isPass
            ? 'border-emerald-800/80 bg-emerald-950/20 glow-emerald'
            : 'border-rose-700 bg-rose-950/30 glow-crimson animate-pulse'
        }`}>
          <div className="flex items-center space-x-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isPass ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
            }`}>
              {isPass ? <CheckCircle2 className="w-7 h-7" /> : <AlertOctagon className="w-7 h-7" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                {isPass ? 'HASH CHAIN INTACT: VERIFICATION PASSED' : 'CHAIN INTEGRITY FRACTURE DETECTED'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isPass
                  ? `All ${integrityStatus.total_blocks_checked} evidence blocks cryptographically unbroken.`
                  : `Chain fracture pinpointed at block index #${integrityStatus.fracture_index} (ID: ${integrityStatus.fractured_evidence_id}).`}
              </p>
              {integrityStatus.reason && (
                <p className="text-xs text-rose-300 font-mono mt-1">
                  Discrepancy: {integrityStatus.reason}
                </p>
              )}
            </div>
          </div>

          <div className="text-right font-mono text-xs">
            <span className="text-slate-500 block">Root Block Hash:</span>
            <span className="text-cyan-400 font-semibold">{integrityStatus.root_hash.slice(0, 24)}...</span>
          </div>
        </div>
      )}

      {/* Adversarial Tamper Simulator Console */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>Adversarial Tamper Simulation & Verification Testbed</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Demonstrates real-time non-repudiation failure when an attacker alters raw forensic telemetry bits.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Target Evidence ID
            </label>
            <input
              type="text"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Malicious Value Override
            </label>
            <select
              value={tamperValue}
              onChange={(e) => setTamperValue(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
            >
              <option value="normal">Change Malicious &rarr; Benign Normal (Conceal Threat)</option>
              <option value="malicious">Change Benign &rarr; Malicious (Fabricate Threat)</option>
            </select>
          </div>

          <div className="flex items-end space-x-2">
            <button
              onClick={handleTamper}
              className="flex-1 py-2 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-300 font-semibold text-xs border border-rose-800 transition"
            >
              Simulate Tamper
            </button>
            <button
              onClick={handleRestore}
              className="flex-1 py-2 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 font-semibold text-xs border border-emerald-800 transition"
            >
              Restore Record
            </button>
          </div>
        </div>

        {actionMessage && (
          <p className="text-xs font-mono text-cyan-400 pt-1">{actionMessage}</p>
        )}
      </div>

      {/* Block Sequence Table */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-100">
            Consecutive Chained Blocks
          </h3>
          <p className="text-xs text-slate-400">
            Inspect the recursive hash linkage sequence across evidence blocks.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 font-mono">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-900/60 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Block #</th>
                <th className="py-3 px-4">Evidence ID</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Canonical SHA-256</th>
                <th className="py-3 px-4">Previous Block Hash Pointer</th>
                <th className="py-3 px-4">Chained Block Hash</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-[11px]">
              {blocks.map((b) => (
                <tr
                  key={b.block_index}
                  className={`hover:bg-slate-900/40 transition ${
                    b.is_tampered ? 'bg-rose-950/30' : ''
                  }`}
                >
                  <td className="py-3 px-4 font-bold text-slate-200">#{b.block_index}</td>
                  <td className="py-3 px-4 text-cyan-300 font-semibold">{b.evidence_id}</td>
                  <td className="py-3 px-4 text-slate-400">{b.timestamp}</td>
                  <td className="py-3 px-4 text-slate-300" title={b.canonical_hash}>
                    {b.canonical_hash.slice(0, 12)}...
                  </td>
                  <td className="py-3 px-4 text-slate-400" title={b.prev_hash}>
                    {b.prev_hash.slice(0, 12)}...
                  </td>
                  <td className="py-3 px-4 text-indigo-400 font-semibold" title={b.block_hash}>
                    {b.block_hash.slice(0, 12)}...
                  </td>
                  <td className="py-3 px-4 font-sans">
                    {b.is_tampered ? (
                      <span className="px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-bold">
                        FRACTURED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px]">
                        INTACT
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
