import React, { useState } from 'react';
import {
  Upload, Database, FileSpreadsheet, CheckCircle2,
  AlertCircle, Play, Shield, RefreshCw
} from 'lucide-react';
import { DiscoveryData } from '../types';

interface DatasetUploadViewProps {
  discovery: DiscoveryData | null;
  onRefreshDiscovery: () => void;
  onUploadFile: (file: File) => Promise<void>;
  onExecuteIngest: (maxRecords?: number, custodian?: string) => Promise<void>;
  isIngesting: boolean;
  ingestResult: any;
}

export const DatasetUploadView: React.FC<DatasetUploadViewProps> = ({
  discovery,
  onRefreshDiscovery,
  onUploadFile,
  onExecuteIngest,
  isIngesting,
  ingestResult,
}) => {
  const [maxRecords, setMaxRecords] = useState<number | ''>('');
  const [custodian, setCustodian] = useState('Senior Cyber Forensics Examiner');
  const [dragOver, setDragOver] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setUploadStatus(`Uploading ${file.name}...`);
      try {
        await onUploadFile(file);
        setUploadStatus(`Uploaded ${file.name} successfully.`);
      } catch (err: any) {
        setUploadStatus(`Error: ${err.message}`);
      }
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setUploadStatus(`Uploading ${file.name}...`);
      try {
        await onUploadFile(file);
        setUploadStatus(`Uploaded ${file.name} successfully.`);
      } catch (err: any) {
        setUploadStatus(`Error: ${err.message}`);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl glass-panel border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            Forensic Dataset Ingestion & Correlation
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Auto-discovers multi-source telemetry logs, parses schemas, and constructs SHA-256 Merkle chain.
          </p>
        </div>
        <button
          onClick={onRefreshDiscovery}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
        >
          <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
          <span>Rescan Folder</span>
        </button>
      </div>

      {/* Discovered Sensor Telemetry Table */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-100">Discovered Forensic Files</h2>
            <p className="text-xs text-slate-400">
              Workspace path: <span className="font-mono text-cyan-400">{discovery?.dataset_directory}</span>
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`w-2.5 h-2.5 rounded-full ${discovery?.is_ready_to_ingest ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
            <span className="text-xs font-semibold text-slate-300">
              {discovery?.is_ready_to_ingest ? 'Ready for Correlated Ingestion' : 'Partial Sources Detected'}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-900/60 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Filename</th>
                <th className="py-3 px-4">Sensor Stream</th>
                <th className="py-3 px-4">Rows</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Detected Schema Columns</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {discovery?.available_files?.map((file) => (
                <tr key={file.filename} className="hover:bg-slate-900/40 transition">
                  <td className="py-3 px-4 font-semibold text-slate-200 flex items-center space-x-2">
                    <FileSpreadsheet className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>{file.filename}</span>
                  </td>
                  <td className="py-3 px-4 uppercase text-cyan-300 font-sans">{file.file_type}</td>
                  <td className="py-3 px-4">{file.row_count?.toLocaleString() || '-'}</td>
                  <td className="py-3 px-4">{(file.size_bytes / 1024).toFixed(1)} KB</td>
                  <td className="py-3 px-4 font-sans text-[11px] text-slate-400 max-w-xs truncate" title={file.columns.join(', ')}>
                    {file.columns.slice(0, 5).join(', ')} {file.columns.length > 5 ? `(+${file.columns.length - 5} more)` : ''}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-sans">
                      Verified
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Zone & Ingestion Parameters */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Dropzone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`p-8 rounded-2xl border-2 border-dashed transition flex flex-col items-center justify-center text-center ${
            dragOver
              ? 'border-cyan-400 bg-cyan-950/20'
              : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-cyan-950 border border-cyan-800 flex items-center justify-center mb-3 text-cyan-400">
            <Upload className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-200">Upload Additional Forensic Telemetry</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Drag and drop CSV or JSON log files here, or click to browse.
          </p>
          <label className="mt-4 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer border border-slate-700 transition">
            <span>Browse Files</span>
            <input type="file" accept=".csv,.json,.jsonl" onChange={handleFileInput} className="hidden" />
          </label>
          {uploadStatus && (
            <p className="mt-3 text-xs text-cyan-400 font-mono">{uploadStatus}</p>
          )}
        </div>

        {/* Pipeline Execution Controls */}
        <div className="p-6 rounded-2xl glass-panel border border-slate-800 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span>Correlate & Build Hash Chain</span>
            </h3>
            <p className="text-xs text-slate-400">
              Correlates telemetry across all 7 sources, binds user and device criticality,
              and calculates the tamper-evident SHA-256 Merkle chain.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Max Records to Ingest (Leave blank for all 10,000)
                </label>
                <input
                  type="number"
                  placeholder="All available records"
                  value={maxRecords}
                  onChange={(e) => setMaxRecords(e.target.value ? parseInt(e.target.value) : '')}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Forensic Custodian
                </label>
                <input
                  type="text"
                  value={custodian}
                  onChange={(e) => setCustodian(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => onExecuteIngest(maxRecords || undefined, custodian)}
            disabled={isIngesting}
            className="mt-6 w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-cyan-600/20 transition disabled:opacity-50"
          >
            {isIngesting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Correlating & Hashing Telemetry...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Execute Complete Ingestion Pipeline</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Ingestion Results Banner */}
      {ingestResult && (
        <div className="p-6 rounded-2xl bg-cyan-950/30 border border-cyan-800/80 glass-panel">
          <div className="flex items-center space-x-2 text-cyan-400 font-bold text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>Ingestion Succeeded</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 font-mono text-xs">
            <div>
              <span className="text-slate-400">Total Ingested:</span>
              <p className="text-slate-100 font-bold text-sm">{ingestResult.total_ingested} records</p>
            </div>
            <div>
              <span className="text-slate-400">Malicious Flagged:</span>
              <p className="text-rose-400 font-bold text-sm">{ingestResult.total_malicious}</p>
            </div>
            <div>
              <span className="text-slate-400">Duration:</span>
              <p className="text-slate-100 font-bold text-sm">{ingestResult.duration_seconds}s</p>
            </div>
            <div>
              <span className="text-slate-400">Root Hash:</span>
              <p className="text-cyan-400 text-[11px] truncate" title={ingestResult.root_hash}>
                {ingestResult.root_hash.slice(0, 16)}...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
