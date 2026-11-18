import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, X, Copy, Check, FileText, Database, ArrowRight, RefreshCw } from 'lucide-react';
import { IntegrityCheckResult, DbBackup } from '../types';

interface IntegrityModalProps {
  isOpen: boolean;
  result: IntegrityCheckResult | null;
  latestBackup?: DbBackup;
  loading: boolean;
  onClose: () => void;
  onRecheck: () => void;
  onRestoreFromBackup?: (backup: DbBackup) => void;
}

export const IntegrityModal: React.FC<IntegrityModalProps> = ({
  isOpen,
  result,
  latestBackup,
  loading,
  onClose,
  onRecheck,
  onRestoreFromBackup
}) => {
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  if (!isOpen || !result) return null;

  const handleCopy = (hash: string, label: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(label);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const isVerified = result.status === 'VERIFIED';
  const isTampered = result.status === 'TAMPERED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className={`p-6 border-b flex items-start justify-between ${
          isVerified ? 'bg-emerald-50 border-emerald-100' :
          isTampered ? 'bg-rose-50 border-rose-100' :
          'bg-amber-50 border-amber-100'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${
              isVerified ? 'bg-emerald-100 text-emerald-700' :
              isTampered ? 'bg-rose-100 text-rose-700 animate-pulse' :
              'bg-amber-100 text-amber-700'
            }`}>
              {isVerified ? (
                <ShieldCheck className="w-7 h-7" />
              ) : (
                <ShieldAlert className="w-7 h-7" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase ${
                  isVerified ? 'bg-emerald-200 text-emerald-800' :
                  isTampered ? 'bg-rose-200 text-rose-800' :
                  'bg-amber-200 text-amber-800'
                }`}>
                  {isVerified ? 'Cryptographically Verified' :
                   isTampered ? 'Tampering / Integrity Mismatch' :
                   'No Cloud Backup Baseline'}
                </span>
                <span className="text-xs text-slate-500 font-mono">SHA-256 Web Crypto</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mt-1 truncate max-w-md">
                {result.fileName}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-white/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          <div className={`p-4 rounded-xl border text-sm ${
            isVerified ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900' :
            isTampered ? 'bg-rose-50/50 border-rose-200 text-rose-900' :
            'bg-amber-50/50 border-amber-200 text-amber-900'
          }`}>
            <p className="font-semibold">{result.details}</p>
            <p className="text-xs mt-1 opacity-90">
              Audit Timestamp: {new Date(result.checkedAt).toLocaleString()}
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Cryptographic Checksum Comparison
            </h4>

            <div className={`p-4 rounded-xl border transition-all ${
              isTampered ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-semibold text-slate-700">
                    Live Working File SHA-256 (college-records-originals)
                  </span>
                  {isTampered && (
                    <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold">
                      MODIFIED
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleCopy(result.liveHash, 'live')}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
                >
                  {copiedHash === 'live' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 font-mono text-xs break-all text-slate-800 select-all">
                {result.liveHash || 'File empty or removed'}
              </div>
            </div>

            <div className={`p-4 rounded-xl border transition-all ${
              isVerified ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-semibold text-slate-700">
                    Cloud Archive Baseline SHA-256 (college-records-backups) {latestBackup ? `v${latestBackup.version}` : ''}
                  </span>
                  {isVerified && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">
                      BASELINE MATCH
                    </span>
                  )}
                </div>
                {result.backupHash !== 'N/A' && (
                  <button
                    onClick={() => handleCopy(result.backupHash, 'backup')}
                    className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
                  >
                    {copiedHash === 'backup' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 font-mono text-xs break-all text-slate-800 select-all">
                {result.backupHash}
              </div>
            </div>
          </div>

          {isTampered && latestBackup && onRestoreFromBackup && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-4">
              <div className="text-xs text-amber-900">
                <p className="font-bold">Disaster Recovery Recommended</p>
                <p>The active file has diverged from the verified cloud backup. You can restore the clean original state immediately.</p>
              </div>
              <button
                onClick={() => {
                  onRestoreFromBackup(latestBackup);
                  onClose();
                }}
                className="px-4 py-2 bg-college-600 hover:bg-college-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 flex-shrink-0 transition-colors"
              >
                <span>Restore Clean v{latestBackup.version}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onRecheck}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Re-verify Now</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
