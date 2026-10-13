import React, { useState, useEffect, useRef } from 'react';
import {
  Radio, Play, Pause, ShieldAlert, CheckCircle2,
  Terminal, Activity, RefreshCw, KeyRound
} from 'lucide-react';
import { EvidenceItem } from '../types';

interface LiveStreamingViewProps {
  onControlSimulation: (running: boolean) => Promise<void>;
  isStreaming: boolean;
  onSelectEvidence: (id: string) => void;
}

export const LiveStreamingView: React.FC<LiveStreamingViewProps> = ({
  onControlSimulation,
  isStreaming,
  onSelectEvidence,
}) => {
  const [events, setEvents] = useState<EvidenceItem[]>([]);
  const [threatCount, setThreatCount] = useState(0);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const es = new EventSource('/api/stream/events');
    setEventSource(es);

    es.onmessage = (event) => {
      try {
        const data: EvidenceItem = JSON.parse(event.data);
        setEvents((prev) => [data, ...prev.slice(0, 49)]); // keep latest 50
        if (data.ground_truth_label === 'malicious') {
          setThreatCount((c) => c + 1);
        }
      } catch (err) {
        console.error('Error parsing SSE event:', err);
      }
    };

    return () => {
      es.close();
    };
  }, []);

  const toggleStream = async () => {
    await onControlSimulation(!isStreaming);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center space-x-2">
            <Radio className="w-6 h-6 text-emerald-400 animate-pulse" />
            <span>Real-Time Telemetry Stream & Simulator</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Incremental forensic telemetry ingestion. Note: Simulated events are explicitly tagged <span className="font-mono text-amber-400 font-bold">[SIMULATED]</span>.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={toggleStream}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-md transition ${
              isStreaming
                ? 'bg-amber-950 text-amber-300 border border-amber-700 hover:bg-amber-900'
                : 'bg-emerald-950 text-emerald-300 border border-emerald-700 hover:bg-emerald-900'
            }`}
          >
            {isStreaming ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause Simulator</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Resume Simulator</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Live Stream Telemetry Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl glass-panel border border-slate-800">
          <span className="text-xs uppercase text-slate-400 font-medium tracking-wider">Stream Status</span>
          <p className="text-xl font-bold font-mono text-emerald-400 mt-2 flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{isStreaming ? 'STREAMING ACTIVE' : 'STREAM PAUSED'}</span>
          </p>
        </div>
        <div className="p-5 rounded-2xl glass-panel border border-slate-800">
          <span className="text-xs uppercase text-slate-400 font-medium tracking-wider">Events Ingested This Session</span>
          <p className="text-xl font-bold font-mono text-slate-100 mt-2">
            {events.length} events
          </p>
        </div>
        <div className="p-5 rounded-2xl glass-panel border border-slate-800">
          <span className="text-xs uppercase text-slate-400 font-medium tracking-wider">Threats Flagged Live</span>
          <p className="text-xl font-bold font-mono text-rose-400 mt-2">
            {threatCount} malicious events
          </p>
        </div>
      </div>

      {/* Live Event Feed Ticker */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>Incoming Cryptographically-Chained Event Stream</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">Auto-appending to Merkle chain</span>
        </div>

        <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-2" ref={scrollRef}>
          {events.map((ev) => {
            const isMal = ev.ground_truth_label === 'malicious';

            return (
              <div
                key={ev.evidence_id}
                onClick={() => onSelectEvidence(ev.evidence_id)}
                className={`p-4 rounded-xl border text-xs font-mono transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isMal
                    ? 'border-rose-800/80 bg-rose-950/20 hover:bg-rose-950/30'
                    : 'border-slate-800 bg-slate-900/50 hover:bg-slate-900'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-cyan-400">{ev.evidence_id}</span>
                    <span className="text-slate-400 font-sans">{ev.timestamp}</span>
                    <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 text-[10px] font-sans font-bold">
                      [SIMULATED]
                    </span>
                    <span className={`px-2 py-0.2 rounded text-[10px] font-sans ${
                      isMal ? 'bg-rose-950 text-rose-300' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {ev.attack_type}
                    </span>
                  </div>
                  <p className="text-slate-300 truncate max-w-xl">
                    <span className="text-slate-500 font-sans">Host:</span> {ev.device} &bull; <span className="text-slate-500 font-sans">Proc:</span> {ev.process_name} &bull; <span className="text-slate-500 font-sans">Target:</span> {ev.destination_ip}:{ev.destination_port}
                  </p>
                </div>

                <div className="flex items-center space-x-3 text-right">
                  <div>
                    <span className="text-[10px] text-slate-500 block font-sans">Risk Score</span>
                    <span className={`font-bold ${isMal ? 'text-rose-400' : 'text-slate-300'}`}>
                      {ev.combined_score?.toFixed(1) || 'N/A'}
                    </span>
                  </div>
                  <div className="hidden md:block">
                    <span className="text-[10px] text-slate-500 block font-sans">Block Hash</span>
                    <span className="text-indigo-400">{ev.block_hash.slice(0, 10)}...</span>
                  </div>
                </div>
              </div>
            );
          })}

          {events.length === 0 && (
            <p className="text-xs text-slate-500 py-12 text-center font-sans">
              Listening for incoming telemetry events on SSE stream...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
