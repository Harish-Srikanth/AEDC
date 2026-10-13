import React, { useState } from 'react';
import {
  Cpu, Network, Sliders, RefreshCw, CheckCircle2,
  TrendingUp, Award, BarChart2
} from 'lucide-react';
import { ModelMetrics, EnsembleComparison } from '../types';

interface AIAnalyticsViewProps {
  rfMetrics: ModelMetrics | null;
  gnnMetrics: ModelMetrics | null;
  ensembleData: EnsembleComparison | null;
  onTrainRF: (nEst: number, maxDepth: number) => Promise<void>;
  onTrainGNN: (epochs: number, lr: number, hiddenDim: number) => Promise<void>;
  onReweightEnsemble: (alpha: number) => Promise<void>;
  isTrainingRF: boolean;
  isTrainingGNN: boolean;
}

export const AIAnalyticsView: React.FC<AIAnalyticsViewProps> = ({
  rfMetrics,
  gnnMetrics,
  ensembleData,
  onTrainRF,
  onTrainGNN,
  onReweightEnsemble,
  isTrainingRF,
  isTrainingGNN,
}) => {
  const [alpha, setAlpha] = useState(ensembleData?.alpha ?? 0.55);
  const [rfTrees, setRfTrees] = useState(100);
  const [gnnEpochs, setGnnEpochs] = useState(40);

  const rf = rfMetrics?.metrics;
  const gnn = gnnMetrics?.metrics;
  const ens = ensembleData?.ensemble_metrics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            Dual AI Threat Detection & Adaptive Ensemble
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Fuses high-precision tabular Random Forest with PyTorch topological Graph Neural Network.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400">
          <span>Active Weight:</span>
          <span className="font-bold">{(alpha * 100).toFixed(0)}% RF / {((1 - alpha) * 100).toFixed(0)}% GNN</span>
        </div>
      </div>

      {/* Model Cards Grid: RF & GNN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Random Forest Card */}
        <div className="p-6 rounded-2xl glass-panel border border-slate-800 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Random Forest Classifier</h3>
                  <p className="text-xs text-slate-400">Tabular cyber feature evaluation (Balanced Weights)</p>
                </div>
              </div>
              <button
                onClick={() => onTrainRF(rfTrees, 16)}
                disabled={isTrainingRF}
                className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md transition disabled:opacity-50"
              >
                {isTrainingRF ? 'Training RF...' : 'Train RF'}
              </button>
            </div>

            {/* Performance KPI Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-center">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Accuracy</span>
                <span className="text-lg font-bold text-cyan-300">
                  {rf?.accuracy ? `${(rf.accuracy * 100).toFixed(1)}%` : 'Untrained'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Precision</span>
                <span className="text-lg font-bold text-slate-200">
                  {rf?.precision ? `${(rf.precision * 100).toFixed(1)}%` : '-'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Recall</span>
                <span className="text-lg font-bold text-slate-200">
                  {rf?.recall ? `${(rf.recall * 100).toFixed(1)}%` : '-'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">ROC-AUC</span>
                <span className="text-lg font-bold text-indigo-300">
                  {rf?.roc_auc ? rf.roc_auc.toFixed(3) : '-'}
                </span>
              </div>
            </div>

            {/* Feature Importance Bars */}
            {rf?.feature_importance && (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-semibold text-slate-300">Top Predictive Features:</span>
                <div className="space-y-1.5">
                  {rf.feature_importance.slice(0, 5).map((f) => (
                    <div key={f.feature} className="space-y-0.5">
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span className="font-mono text-slate-300">{f.feature}</span>
                        <span className="font-mono text-cyan-400">{(f.importance * 100).toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-500 rounded-full"
                          style={{ width: `${Math.max(5, f.importance * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PyTorch GNN Card */}
        <div className="p-6 rounded-2xl glass-panel border border-slate-800 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400">
                  <Network className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">PyTorch Graph Neural Network (GNN)</h3>
                  <p className="text-xs text-slate-400">Topological spectral graph convolution across entities</p>
                </div>
              </div>
              <button
                onClick={() => onTrainGNN(gnnEpochs, 0.01, 64)}
                disabled={isTrainingGNN}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition disabled:opacity-50"
              >
                {isTrainingGNN ? 'Training GNN...' : 'Train GNN'}
              </button>
            </div>

            {/* Performance KPI Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-center">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Accuracy</span>
                <span className="text-lg font-bold text-indigo-300">
                  {gnn?.accuracy ? `${(gnn.accuracy * 100).toFixed(1)}%` : 'Untrained'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Precision</span>
                <span className="text-lg font-bold text-slate-200">
                  {gnn?.precision ? `${(gnn.precision * 100).toFixed(1)}%` : '-'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Recall</span>
                <span className="text-lg font-bold text-slate-200">
                  {gnn?.recall ? `${(gnn.recall * 100).toFixed(1)}%` : '-'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">ROC-AUC</span>
                <span className="text-lg font-bold text-cyan-300">
                  {gnn?.roc_auc ? gnn.roc_auc.toFixed(3) : '-'}
                </span>
              </div>
            </div>

            {/* Training Loss History Curve */}
            {gnn?.loss_history && gnn.loss_history.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-xs text-slate-300 font-semibold">
                  <span>Training Loss Convergence ({gnn.loss_history.length} Epochs):</span>
                  <span className="font-mono text-indigo-400">
                    Final Loss: {gnn.loss_history[gnn.loss_history.length - 1]}
                  </span>
                </div>
                <div className="h-16 w-full bg-slate-900/60 rounded-xl border border-slate-800 p-2 flex items-end space-x-1">
                  {gnn.loss_history.map((l, i) => {
                    const maxLoss = Math.max(...gnn.loss_history!);
                    const hPct = maxLoss > 0 ? Math.max(10, Math.round((l / maxLoss) * 100)) : 50;
                    return (
                      <div
                        key={i}
                        className="flex-1 bg-indigo-500/80 hover:bg-indigo-400 rounded-t transition"
                        style={{ height: `${hPct}%` }}
                        title={`Epoch ${i + 1}: Loss ${l}`}
                      ></div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Combined Ensemble Dynamic Re-Weighting Console */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Adaptive Ensemble Weight Tuning</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Adjust the convex weighting parameter (&alpha;) to calibrate detection sensitivity.
            </p>
          </div>
          <button
            onClick={() => onReweightEnsemble(alpha)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md transition"
          >
            Apply Ensemble Weight
          </button>
        </div>

        {/* Weighting Slider */}
        <div className="space-y-2 p-4 rounded-xl bg-slate-900/50 border border-slate-800">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-cyan-400 font-semibold">Random Forest: {(alpha * 100).toFixed(0)}%</span>
            <span className="text-indigo-400 font-semibold">PyTorch GNN: {((1 - alpha) * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={alpha}
            onChange={(e) => setAlpha(parseFloat(e.target.value))}
            className="w-full accent-cyan-500 cursor-pointer"
          />
        </div>

        {/* Head-to-Head Comparative Evaluation Table */}
        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-xs text-slate-300 font-mono">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-900/60 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 font-sans">Evaluation Metric</th>
                <th className="py-3 px-4 text-cyan-400">Random Forest Classifier</th>
                <th className="py-3 px-4 text-indigo-400">PyTorch GNN</th>
                <th className="py-3 px-4 text-emerald-400 font-bold">Combined Ensemble</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              <tr>
                <td className="py-3 px-4 font-sans font-medium text-slate-200">Accuracy</td>
                <td className="py-3 px-4">{rf?.accuracy ? `${(rf.accuracy * 100).toFixed(2)}%` : '-'}</td>
                <td className="py-3 px-4">{gnn?.accuracy ? `${(gnn.accuracy * 100).toFixed(2)}%` : '-'}</td>
                <td className="py-3 px-4 text-emerald-400 font-bold">
                  {ens?.accuracy ? `${(ens.accuracy * 100).toFixed(2)}%` : '-'}
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-sans font-medium text-slate-200">Precision</td>
                <td className="py-3 px-4">{rf?.precision ? `${(rf.precision * 100).toFixed(2)}%` : '-'}</td>
                <td className="py-3 px-4">{gnn?.precision ? `${(gnn.precision * 100).toFixed(2)}%` : '-'}</td>
                <td className="py-3 px-4 text-emerald-400 font-bold">
                  {ens?.precision ? `${(ens.precision * 100).toFixed(2)}%` : '-'}
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-sans font-medium text-slate-200">Recall</td>
                <td className="py-3 px-4">{rf?.recall ? `${(rf.recall * 100).toFixed(2)}%` : '-'}</td>
                <td className="py-3 px-4">{gnn?.recall ? `${(gnn.recall * 100).toFixed(2)}%` : '-'}</td>
                <td className="py-3 px-4 text-emerald-400 font-bold">
                  {ens?.recall ? `${(ens.recall * 100).toFixed(2)}%` : '-'}
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-sans font-medium text-slate-200">F1-Score</td>
                <td className="py-3 px-4">{rf?.f1_score ? rf.f1_score.toFixed(4) : '-'}</td>
                <td className="py-3 px-4">{gnn?.f1_score ? gnn.f1_score.toFixed(4) : '-'}</td>
                <td className="py-3 px-4 text-emerald-400 font-bold">
                  {ens?.f1_score ? ens.f1_score.toFixed(4) : '-'}
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-sans font-medium text-slate-200">ROC-AUC</td>
                <td className="py-3 px-4">{rf?.roc_auc ? rf.roc_auc.toFixed(4) : '-'}</td>
                <td className="py-3 px-4">{gnn?.roc_auc ? gnn.roc_auc.toFixed(4) : '-'}</td>
                <td className="py-3 px-4 text-emerald-400 font-bold">
                  {ens?.roc_auc ? ens.roc_auc.toFixed(4) : '-'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
