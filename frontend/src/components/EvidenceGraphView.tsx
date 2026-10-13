import React, { useState, useEffect, useRef } from 'react';
import {
  Network, ZoomIn, ZoomOut, RotateCcw, Filter,
  ShieldAlert, CheckCircle2, Info
} from 'lucide-react';
import { GraphData, GraphNode } from '../types';

interface EvidenceGraphViewProps {
  graphData: GraphData | null;
  onRefreshGraph: (filters?: any) => void;
  onSelectEvidence: (evidenceId: string) => void;
  isLoading: boolean;
}

export const EvidenceGraphView: React.FC<EvidenceGraphViewProps> = ({
  graphData,
  onRefreshGraph,
  onSelectEvidence,
  isLoading,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Filter toggles
  const [showUsers, setShowUsers] = useState(true);
  const [showDevices, setShowDevices] = useState(true);
  const [showIps, setShowIps] = useState(true);
  const [showProcs, setShowProcs] = useState(true);
  const [showDomains, setShowDomains] = useState(true);

  // Position nodes in a radial / circular layout
  const positionedNodes = React.useMemo(() => {
    if (!graphData || !graphData.nodes) return [];

    const nodes = graphData.nodes.filter((n) => {
      if (n.type === 'user' && !showUsers) return false;
      if (n.type === 'device' && !showDevices) return false;
      if (n.type === 'destination_ip' && !showIps) return false;
      if (n.type === 'process' && !showProcs) return false;
      if (n.type === 'domain' && !showDomains) return false;
      return true;
    });

    const centerX = 450;
    const centerY = 300;
    const count = nodes.length;

    return nodes.map((node, i) => {
      let r = 220;
      if (node.type === 'event') r = 160 + (i % 3) * 35;
      else if (node.type === 'user' || node.type === 'device') r = 90;
      else r = 260;

      const angle = (i / count) * 2 * Math.PI;
      const x = centerX + r * Math.cos(angle);
      const y = centerY + r * Math.sin(angle);

      return { ...node, x, y };
    });
  }, [graphData, showUsers, showDevices, showIps, showProcs, showDomains]);

  // Canvas drawing loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);

    const nodeMap = new Map<string, typeof positionedNodes[0]>();
    positionedNodes.forEach((n) => nodeMap.set(n.id, n));

    // Draw Edges
    if (graphData && graphData.edges) {
      ctx.lineWidth = 0.8;
      graphData.edges.forEach((edge) => {
        const src = nodeMap.get(edge.source);
        const tgt = nodeMap.get(edge.target);
        if (src && tgt && src.x && src.y && tgt.x && tgt.y) {
          ctx.beginPath();
          ctx.strokeStyle = src.is_malicious || tgt.is_malicious ? 'rgba(239, 68, 68, 0.4)' : 'rgba(71, 85, 105, 0.25)';
          ctx.moveTo(src.x, src.y);
          ctx.lineTo(tgt.x, tgt.y);
          ctx.stroke();
        }
      });
    }

    // Draw Nodes
    positionedNodes.forEach((node) => {
      if (!node.x || !node.y) return;

      ctx.beginPath();
      let radius = 6;
      let color = '#38bdf8'; // sky

      if (node.type === 'event') {
        radius = node.is_malicious ? 7 : 5;
        color = node.is_malicious ? '#ef4444' : '#0284c7';
      } else if (node.type === 'user') {
        radius = 9;
        color = '#a855f7'; // purple
      } else if (node.type === 'device') {
        radius = 9;
        color = '#06b6d4'; // cyan
      } else if (node.type === 'destination_ip') {
        radius = 7;
        color = '#f59e0b'; // amber
      } else if (node.type === 'process') {
        radius = 7;
        color = '#10b981'; // emerald
      } else if (node.type === 'domain') {
        radius = 6;
        color = '#ec4899'; // pink
      }

      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      if (selectedNode?.id === node.id) {
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      }

      // Label for important nodes
      if (node.type !== 'event' || node.is_malicious) {
        ctx.font = '9px monospace';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(node.name.slice(0, 16), node.x + 8, node.y + 3);
      }
    });

    ctx.restore();
  }, [positionedNodes, selectedNode, zoom, offset, graphData]);

  // Click detection
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left - offset.x) / zoom;
    const clickY = (e.clientY - rect.top - offset.y) / zoom;

    const clicked = positionedNodes.find((n) => {
      if (!n.x || !n.y) return false;
      const dist = Math.hypot(n.x - clickX, n.y - clickY);
      return dist <= 12;
    });

    if (clicked) {
      setSelectedNode(clicked);
      if (clicked.type === 'event') {
        onSelectEvidence(clicked.name);
      }
    } else {
      setSelectedNode(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center space-x-2">
            <Network className="w-6 h-6 text-cyan-400" />
            <span>Interactive Multi-Entity Evidence Graph</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Topological attack relationships linking Events, Users, Hosts, Destinations, and Processes.
          </p>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300"
            title="Reset Pan & Zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => onRefreshGraph()}
            className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md transition"
          >
            Refresh Graph
          </button>
        </div>
      </div>

      {/* Main Canvas & Inspector Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Canvas Area */}
        <div className="lg:col-span-3 p-4 rounded-2xl glass-panel border border-slate-800 relative overflow-hidden bg-slate-950 flex flex-col items-center justify-center">
          {/* Entity Legend */}
          <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2 text-[10px] font-mono bg-slate-900/80 backdrop-blur-md p-2 rounded-xl border border-slate-800">
            <span className="flex items-center space-x-1 text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>Malicious Event</span>
            </span>
            <span className="flex items-center space-x-1 text-sky-400">
              <span className="w-2 h-2 rounded-full bg-sky-500"></span>
              <span>Benign Event</span>
            </span>
            <span className="flex items-center space-x-1 text-purple-400">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              <span>User</span>
            </span>
            <span className="flex items-center space-x-1 text-cyan-400">
              <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
              <span>Device</span>
            </span>
            <span className="flex items-center space-x-1 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Destination IP</span>
            </span>
            <span className="flex items-center space-x-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Process</span>
            </span>
          </div>

          <canvas
            ref={canvasRef}
            width={900}
            height={600}
            onClick={handleCanvasClick}
            className="w-full h-auto cursor-crosshair rounded-xl"
          />
        </div>

        {/* Entity Inspector Side Panel */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
              <Info className="w-4 h-4 text-cyan-400" />
              <span>Selected Entity</span>
            </h3>

            {selectedNode ? (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-500 font-mono">Entity Identifier:</span>
                  <p className="font-mono text-cyan-300 font-bold text-sm">{selectedNode.name}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-mono">Entity Type:</span>
                  <p className="capitalize text-slate-200">{selectedNode.type.replace('_', ' ')}</p>
                </div>
                {selectedNode.details && (
                  <div>
                    <span className="text-slate-500 font-mono">Contextual Info:</span>
                    <p className="text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 mt-1">
                      {selectedNode.details}
                    </p>
                  </div>
                )}
                {selectedNode.type === 'event' && (
                  <button
                    onClick={() => onSelectEvidence(selectedNode.name)}
                    className="w-full mt-2 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-md transition"
                  >
                    View in Evidence Explorer &rarr;
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-6 text-center">
                Click any node on the graph to inspect topological attributes.
              </p>
            )}
          </div>

          {/* Toggle Entity Types */}
          <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Entity Visibility Filters
            </h4>
            <div className="space-y-2 text-xs text-slate-300">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showUsers}
                  onChange={(e) => setShowUsers(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-800 accent-purple-500"
                />
                <span>Users ({graphData?.nodes?.filter(n => n.type === 'user').length || 0})</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDevices}
                  onChange={(e) => setShowDevices(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-800 accent-cyan-500"
                />
                <span>Devices ({graphData?.nodes?.filter(n => n.type === 'device').length || 0})</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showIps}
                  onChange={(e) => setShowIps(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-800 accent-amber-500"
                />
                <span>Destination IPs ({graphData?.nodes?.filter(n => n.type === 'destination_ip').length || 0})</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showProcs}
                  onChange={(e) => setShowProcs(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-800 accent-emerald-500"
                />
                <span>Processes ({graphData?.nodes?.filter(n => n.type === 'process').length || 0})</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
