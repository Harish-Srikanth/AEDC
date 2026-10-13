import React from 'react';
import { History, Shield, CheckCircle2, User, KeyRound } from 'lucide-react';
import { CustodyLog } from '../types';

interface ChainOfCustodyViewProps {
  logs: CustodyLog[];
  total: number;
  isLoading: boolean;
}

export const ChainOfCustodyView: React.FC<ChainOfCustodyViewProps> = ({
  logs,
  total,
  isLoading,
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center space-x-2">
            <History className="w-6 h-6 text-cyan-400" />
            <span>Forensic Chain of Custody & Audit Ledger</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Tamper-evident legal ledger recording evidence acquisition, custodian transfers, and cryptographic seals.
          </p>
        </div>
        <div className="text-xs font-mono text-slate-400">
          Total Logged Actions: <span className="text-cyan-400 font-bold">{total}</span>
        </div>
      </div>

      {/* Custody Table */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-900/60 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Log #</th>
                <th className="py-3 px-4">Evidence ID</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Forensic Custodian</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Cryptographic Hash Seal</th>
                <th className="py-3 px-4">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-900/40 transition">
                  <td className="py-3 px-4 text-slate-500">#{log.id}</td>
                  <td className="py-3 px-4 font-bold text-cyan-300">{log.evidence_id}</td>
                  <td className="py-3 px-4 font-sans text-slate-400">{log.timestamp}</td>
                  <td className="py-3 px-4 font-sans">
                    <span className="text-slate-200 font-medium flex items-center space-x-1.5">
                      <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>{log.custodian}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 font-sans">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                      log.action.includes('TAMPER')
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-indigo-400" title={log.hash_state}>
                    {log.hash_state.slice(0, 16)}...
                  </td>
                  <td className="py-3 px-4 font-sans text-slate-400 max-w-sm truncate" title={log.details}>
                    {log.details}
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
