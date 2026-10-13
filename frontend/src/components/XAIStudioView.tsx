import React, { useState, useEffect } from 'react';
import {
  Sparkles, Search, ShieldAlert, CheckCircle2, Network,
  AlertTriangle, FileText, ArrowRight
} from 'lucide-react';
import { XAIExplanation } from '../types';

interface XAIStudioViewProps {
  initialEvidenceId?: string;
  onFetchExplanation: (id: string) => Promise<XAIExplanation>;
  isLoading: boolean;
}

export const XAIStudioView: React.FC<XAIStudioViewProps> = ({
  initialEvidenceId = 'E000001',
  onFetchExplanation,
  isLoading,
}) => {
  const [evidenceId, setEvidenceId] = useState(initialEvidenceId);
  const [explanation, setExplanation] = useState<XAIExplanation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadExplanation = async (idToLoad: string) => {
    if (!idToLoad) return;
    setError(null);
    try {
      const exp = await onFetchExplanation(idToLoad);
      setExplanation(exp);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (initialEvidenceId) {
      setEvidenceId(initialEvidenceId);
      loadExplanation(initialEvidenceId);
    }
  }, [initialEvidenceId]);

  const isMalicious = explanation?.predicted_label === 'malicious';

  return (
    <div className="space-y-6">
      {/* Header & Quick Search */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center space-x-2">
            <Sparkles className="w-6 h-6 text-cyan-400" />
            <span>Explainable AI (XAI) Attribution Studio</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Genuine SHAP local feature attributions, graph threat propagation, and automated forensic narratives.
          </p>
        </div>

        {/* Evidence ID Search Bar */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="e.g. E000007, E000037"
              value={evidenceId}
              onChange={(e) => setEvidenceId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadExplanation(evidenceId)}
              className="pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500 w-44"
            />
          </div>
          <button
            onClick={() => loadExplanation(evidenceId)}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-md transition disabled:opacity-50"
          >
            {isLoading ? 'Explaining...' : 'Explain'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {explanation && (
        <div className="space-y-6">
          {/* Top Score Banner */}
          <div className={`p-6 rounded-2xl glass-panel border flex flex-col md:flex-row items-center justify-between gap-6 ${
            isMalicious ? 'border-rose-800 bg-rose-950/20' : 'border-emerald-800/60 bg-emerald-950/10'
          }`}>
            <div className="flex items-center space-x-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                isMalicious ? 'bg-rose-950 border border-rose-700 text-rose-400' : 'bg-emerald-950 border border-emerald-700 text-emerald-400'
              }`}>
                {isMalicious ? <ShieldAlert className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
              </div>
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  Target Evidence ID: {explanation.evidence_id}
                </span>
                <h2 className="text-xl font-bold text-slate-100 capitalize">
                  {explanation.predicted_label} ({explanation.risk_category} Risk)
                </h2>
                <div className="flex items-center space-x-3 text-xs font-mono text-slate-400 mt-1">
                  <span>RF Confidence: {(explanation.rf_confidence * 100).toFixed(1)}%</span>
                  <span>&bull;</span>
                  <span>GNN Confidence: {(explanation.gnn_confidence * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Gauge */}
            <div className="text-right">
              <span className="text-xs text-slate-400 block font-medium">Adaptive Risk Score</span>
              <span className={`text-4xl font-bold font-mono ${isMalicious ? 'text-rose-400' : 'text-emerald-400'}`}>
                {explanation.risk_score.toFixed(1)}
              </span>
              <span className="text-xs text-slate-500 font-mono"> / 100</span>
            </div>
          </div>

          {/* Forensic Narrative Card */}
          <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-3">
            <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>Automated Forensic Investigative Narrative</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-4 rounded-xl border border-slate-800 font-sans">
              {explanation.forensic_narrative}
            </p>
          </div>

          {/* SHAP Feature Contribution Waterfall/Bar Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  SHAP Feature Contributions
                </h3>
                <p className="text-xs text-slate-400">
                  Local Shapley values computing marginal feature impact on final classification.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                {explanation.shap_feature_contributions.map((feat) => {
                  const isPos = feat.shap_value > 0;
                  const absVal = Math.abs(feat.shap_value);
                  const barWidth = Math.min(100, Math.max(10, Math.round(absVal * 250)));

                  return (
                    <div key={feat.feature} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-slate-300 font-medium">
                          {feat.feature} (val: {feat.raw_value})
                        </span>
                        <span className={`font-mono font-semibold ${isPos ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {isPos ? '+' : ''}{feat.shap_value.toFixed(4)} ({feat.impact})
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden flex">
                        <div
                          className={`h-full rounded-full ${isPos ? 'bg-rose-500' : 'bg-emerald-500'}`}
                          style={{ width: `${barWidth}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Graph Neighborhood Reasoning */}
            <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                  <Network className="w-4 h-4 text-indigo-400" />
                  <span>Graph Neighborhood Context</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Topological connections analyzed by Graph Neural Network.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                {explanation.graph_neighborhood_reasons.map((reason, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex items-start space-x-2"
                  >
                    <ArrowRight className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
