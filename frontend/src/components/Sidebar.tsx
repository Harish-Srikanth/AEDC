import React from 'react';
import {
  LayoutDashboard,
  Database,
  FileSearch,
  Cpu,
  Sparkles,
  Network,
  Clock,
  KeyRound,
  FileCheck,
  Radio,
  Activity,
  History
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  tamperedCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  tamperedCount = 0,
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview Dashboard', icon: LayoutDashboard },
    { id: 'datasets', label: 'Dataset Ingestion', icon: Database },
    { id: 'evidence', label: 'Evidence Explorer', icon: FileSearch },
    { id: 'models', label: 'AI Detection & Ensemble', icon: Cpu },
    { id: 'xai', label: 'Explainable AI Studio', icon: Sparkles },
    { id: 'graph', label: 'Interactive Graph', icon: Network },
    { id: 'timeline', label: 'Attack Timeline', icon: Clock },
    {
      id: 'integrity',
      label: 'Integrity & Tampering',
      icon: KeyRound,
      badge: tamperedCount > 0 ? `${tamperedCount} ALERT` : undefined,
      badgeColor: 'bg-rose-950 text-rose-300 border-rose-800'
    },
    { id: 'custody', label: 'Chain of Custody', icon: History },
    { id: 'certification', label: 'Forensic Certification', icon: FileCheck },
    { id: 'stream', label: 'Real-Time Streaming', icon: Radio },
    { id: 'status', label: 'System Diagnostics', icon: Activity },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-950 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-4 space-y-1 flex-1">
        <p className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
          Forensic Modules
        </p>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-950/80 to-slate-900 border border-cyan-800/80 text-cyan-300 shadow-md shadow-cyan-950/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold animate-pulse ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-900 bg-slate-950/60">
        <div className="rounded-lg p-2.5 bg-slate-900/50 border border-slate-800/60 text-xs">
          <p className="text-slate-400 font-medium">Standard Compliance</p>
          <p className="text-[11px] text-slate-500 mt-0.5">ISO/IEC 27037 & NIST SP 800-86</p>
          <div className="mt-2 flex items-center space-x-1.5 text-emerald-400 text-[11px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>SHA-256 Merkle Chain Active</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
