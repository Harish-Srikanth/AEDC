import React, { useState } from 'react';
import {
  Clock, ShieldAlert, ArrowRight, Filter,
  Terminal, User, Monitor, Zap
} from 'lucide-react';
import { TimelineEvent } from '../types';

interface AttackTimelineViewProps {
  events: TimelineEvent[];
  total: number;
  onFilterTimeline: (incidentId?: string, attackType?: string) => void;
  onSelectEvidence: (id: string) => void;
  isLoading: boolean;
}

export const AttackTimelineView: React.FC<AttackTimelineViewProps> = ({
  events,
  total,
  onFilterTimeline,
  onSelectEvidence,
  isLoading,
}) => {
  const [selectedIncident, setSelectedIncident] = useState('');
  const [selectedAttack, setSelectedAttack] = useState('');

  const handleApply = (inc: string, att: string) => {
    setSelectedIncident(inc);
    setSelectedAttack(att);
    onFilterTimeline(inc || undefined, att || undefined);
  };

  const getStageColor = (stage?: string) => {
    if (!stage) return 'border-slate-700 bg-slate-900 text-slate-300';
    if (stage.includes('Initial') || stage.includes('Credential')) return 'border-amber-700 bg-amber-950/60 text-amber-300';
    if (stage.includes('Privilege')) return 'border-rose-700 bg-rose-950/60 text-rose-300';
    if (stage.includes('Execution')) return 'border-indigo-700 bg-indigo-950/60 text-indigo-300';
    if (stage.includes('Lateral')) return 'border-cyan-700 bg-cyan-950/60 text-cyan-300';
    if (stage.includes('Exfiltration')) return 'border-rose-600 bg-rose-950 text-rose-200 font-bold';
    return 'border-slate-800 bg-slate-900 text-slate-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center space-x-2">
            <Clock className="w-6 h-6 text-cyan-400" />
            <span>Chronological Attack Kill-Chain Progression</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Reconstructs attacker movements and lateral progressions in strict temporal order.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedIncident}
            onChange={(e) => handleApply(e.target.value, selectedAttack)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Incidents</option>
            <option value="INC-0001">INC-0001 (Brute Force)</option>
            <option value="INC-0002">INC-0002 (Credential Abuse)</option>
            <option value="INC-0003">INC-0003 (Privilege Escalation)</option>
            <option value="INC-0004">INC-0004 (Lateral Movement)</option>
            <option value="INC-0005">INC-0005 (Command Execution)</option>
            <option value="INC-0006">INC-0006 (Data Exfiltration)</option>
          </select>

          <select
            value={selectedAttack}
            onChange={(e) => handleApply(selectedIncident, e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Attack Types</option>
            <option value="Brute Force">Brute Force</option>
            <option value="Credential Abuse">Credential Abuse</option>
            <option value="Privilege Escalation">Privilege Escalation</option>
            <option value="Lateral Movement">Lateral Movement</option>
            <option value="Command Execution">Command Execution</option>
            <option value="Data Exfiltration">Data Exfiltration</option>
          </select>
        </div>
      </div>

      {/* Vertical Timeline Progression */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-6">
        <div className="relative border-l-2 border-slate-800 ml-4 pl-6 space-y-8">
          {events.map((ev, idx) => {
            const isMal = ev.ground_truth_label === 'malicious';

            return (
              <div key={ev.evidence_id} className="relative group">
                {/* Node Dot on Timeline */}
                <div
                  className={`absolute -left-[33px] top-1 w-4 h-4 rounded-full border-2 transition-transform group-hover:scale-125 ${
                    isMal ? 'border-rose-500 bg-slate-950' : 'border-slate-600 bg-slate-950'
                  }`}
                ></div>

                {/* Event Card */}
                <div
                  onClick={() => onSelectEvidence(ev.evidence_id)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                    isMal
                      ? 'border-slate-800 bg-slate-950/80 hover:border-rose-700/80 hover:bg-rose-950/10'
                      : 'border-slate-800/60 bg-slate-950/40 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-cyan-400 font-bold text-xs">
                        {ev.evidence_id}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {ev.timestamp}
                      </span>
                      {ev.incident_id && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px]">
                          {ev.incident_id}
                        </span>
                      )}
                    </div>

                    {/* Kill Chain Stage Badge */}
                    <span className={`px-2.5 py-1 rounded-full border text-[11px] font-sans ${getStageColor(ev.kill_chain_stage)}`}>
                      {ev.kill_chain_stage || ev.attack_type}
                    </span>
                  </div>

                  {/* Context Entities Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono text-slate-300 mb-3">
                    <div className="flex items-center space-x-1.5">
                      <User className="w-3.5 h-3.5 text-purple-400" />
                      <span>{ev.user}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Monitor className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{ev.device}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 truncate">
                      <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="truncate">{ev.process_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Risk: </span>
                      <span className={`font-bold ${isMal ? 'text-rose-400' : 'text-slate-400'}`}>
                        {ev.combined_score?.toFixed(1) || 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Command Line / Action Snippet */}
                  {ev.command_line && (
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-slate-300 truncate">
                      {ev.command_line}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {events.length === 0 && !isLoading && (
          <p className="text-xs text-slate-500 py-10 text-center font-sans">
            No chronological timeline events match the selected criteria.
          </p>
        )}
      </div>
    </div>
  );
};
