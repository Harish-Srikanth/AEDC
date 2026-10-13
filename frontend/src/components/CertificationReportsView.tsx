import React, { useState } from 'react';
import {
  FileCheck, Download, Award, CheckCircle2,
  AlertTriangle, Shield, FileText, KeyRound
} from 'lucide-react';
import { ForensicCertificate } from '../types';

interface CertificationReportsViewProps {
  certificates: ForensicCertificate[];
  activeCert: ForensicCertificate | null;
  onValidateAndIssue: (caseId: string, custodian: string) => Promise<void>;
  onDownloadPdf: (id: string) => void;
  onDownloadJson: (id: string) => void;
  isValidating: boolean;
}

export const CertificationReportsView: React.FC<CertificationReportsViewProps> = ({
  certificates,
  activeCert,
  onValidateAndIssue,
  onDownloadPdf,
  onDownloadJson,
  isValidating,
}) => {
  const [caseId, setCaseId] = useState('CASE-2026-FORENSIC-01');
  const [custodian, setCustodian] = useState('Senior Cyber Forensics Examiner');

  const displayCert = activeCert || (certificates.length > 0 ? certificates[0] : null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center space-x-2">
            <Award className="w-6 h-6 text-cyan-400" />
            <span>Forensic Evidence Certification & Reports</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Enforces 5 mandatory non-repudiation audit checks and issues Court-Admissible Certificates.
          </p>
        </div>

        <button
          onClick={() => onValidateAndIssue(caseId, custodian)}
          disabled={isValidating}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-cyan-600/20 transition disabled:opacity-50"
        >
          <FileCheck className="w-4 h-4" />
          <span>{isValidating ? 'Executing 5 Mandatory Checks...' : 'Run Audit & Issue Certificate'}</span>
        </button>
      </div>

      {/* Active Certificate Display Card */}
      {displayCert && (
        <div className="p-8 rounded-2xl glass-panel-elevated border border-slate-700/80 space-y-6">
          {/* Certificate Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-cyan-950 border border-cyan-700 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-950/40">
                <Shield className="w-8 h-8" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono tracking-widest text-cyan-400 font-bold block">
                  Official Cryptographic Certificate of Authenticity
                </span>
                <h2 className="text-xl font-bold text-slate-100 font-mono mt-0.5">
                  {displayCert.id}
                </h2>
                <p className="text-xs text-slate-400">
                  Case ID: <span className="text-slate-200 font-medium">{displayCert.case_id}</span> &bull; Examiner: <span className="text-slate-200 font-medium">{displayCert.custodian}</span>
                </p>
              </div>
            </div>

            {/* Verdict Badge */}
            <div className={`px-5 py-2.5 rounded-2xl border text-sm font-bold tracking-wide font-mono flex items-center space-x-2 ${
              displayCert.verdict === 'PASS'
                ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300 glow-emerald'
                : 'bg-rose-950/80 border-rose-700 text-rose-300 glow-crimson'
            }`}>
              {displayCert.verdict === 'PASS' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              )}
              <span>VERDICT: {displayCert.verdict}</span>
            </div>
          </div>

          {/* 5 Mandatory Checks Grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              5 Mandatory Forensic Audit Standards
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <span>1. Canonical SHA-256 Hash Matching</span>
                <span className={`font-mono font-bold ${displayCert.integrity_check_passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {displayCert.integrity_check_passed ? 'PASSED' : 'FAILED'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <span>2. Merkle Hash Chain Continuity</span>
                <span className={`font-mono font-bold ${displayCert.integrity_check_passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {displayCert.integrity_check_passed ? 'PASSED' : 'FAILED'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <span>3. Chain of Custody Audit Integrity</span>
                <span className={`font-mono font-bold ${displayCert.custody_check_passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {displayCert.custody_check_passed ? 'PASSED' : 'FAILED'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <span>4. Dual-Model AI Consensus Verification</span>
                <span className={`font-mono font-bold ${displayCert.model_consensus_passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {displayCert.model_consensus_passed ? 'PASSED' : 'FAILED'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between md:col-span-2">
                <span>5. Evidence Origin & Non-Tampering Non-Repudiation</span>
                <span className={`font-mono font-bold ${displayCert.provenance_check_passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {displayCert.provenance_check_passed ? 'PASSED (0 Tampered Records)' : 'FAILED (Tampering Detected)'}
                </span>
              </div>
            </div>
          </div>

          {/* Cryptographic Digests */}
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs font-mono space-y-2">
            <div>
              <span className="text-slate-500">Cryptographic Root Merkle Hash:</span>
              <p className="text-cyan-400 break-all">{displayCert.root_hash}</p>
            </div>
            <div>
              <span className="text-slate-500">Digital Certificate Digest:</span>
              <p className="text-indigo-400 break-all">{displayCert.certificate_digest}</p>
            </div>
          </div>

          {/* Download Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => onDownloadPdf(displayCert.id)}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs border border-slate-700 transition"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              <span>Download Official Forensic PDF Report</span>
            </button>
            <button
              onClick={() => onDownloadJson(displayCert.id)}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs border border-slate-700 transition"
            >
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>Download Cryptographic JSON Digest</span>
            </button>
          </div>
        </div>
      )}

      {/* Historical Issued Certificates Table */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-slate-100">
          Historical Issued Certificates
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 font-mono">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-900/60 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Certificate ID</th>
                <th className="py-3 px-4">Issue Timestamp</th>
                <th className="py-3 px-4">Case ID</th>
                <th className="py-3 px-4">Verified Records</th>
                <th className="py-3 px-4">Verdict</th>
                <th className="py-3 px-4 text-right">Downloads</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-[11px]">
              {certificates.map((c) => (
                <tr key={c.id} className="hover:bg-slate-900/40 transition">
                  <td className="py-3 px-4 font-bold text-cyan-300">{c.id}</td>
                  <td className="py-3 px-4 text-slate-400">{c.created_at}</td>
                  <td className="py-3 px-4 font-sans text-slate-300">{c.case_id}</td>
                  <td className="py-3 px-4">{c.verified_records} / {c.total_records}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                      c.verdict === 'PASS' ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                    }`}>
                      {c.verdict}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={() => onDownloadPdf(c.id)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400"
                    >
                      PDF
                    </button>
                    <button
                      onClick={() => onDownloadJson(c.id)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-400"
                    >
                      JSON
                    </button>
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
