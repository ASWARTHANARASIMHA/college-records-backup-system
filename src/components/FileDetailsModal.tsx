import React, { useState } from 'react';
import { FileText, Download, ShieldCheck, Database, Calendar, Building, X, HardDrive, Check, Copy } from 'lucide-react';
import { DbFile, DbBackup } from '../types';
import { formatBytes } from '../services/crypto';

interface FileDetailsModalProps {
  isOpen: boolean;
  record: DbFile | null;
  backups: DbBackup[];
  onClose: () => void;
  onVerifyIntegrity: (fileId: string) => void;
  onCreateBackup: (fileId: string) => void;
  onDownloadFile: (file: DbFile) => void;
  onDownloadBackup: (backup: DbBackup) => void;
}

export const FileDetailsModal: React.FC<FileDetailsModalProps> = ({
  isOpen,
  record,
  backups,
  onClose,
  onVerifyIntegrity,
  onCreateBackup,
  onDownloadFile,
  onDownloadBackup
}) => {
  const [copiedHash, setCopiedHash] = useState(false);

  if (!isOpen || !record) return null;

  const fileBackups = backups.filter(b => b.file_id === record.id);

  const copyHash = () => {
    navigator.clipboard.writeText(record.sha256_hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-college-600/50 rounded-xl text-college-200">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-semibold tracking-wider text-college-300 uppercase">
                {record.category}
              </span>
              <h3 className="text-lg font-bold truncate max-w-md">{record.file_name}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-500 font-semibold block flex items-center gap-1">
                <Building className="w-3 h-3 text-slate-400" /> Department
              </span>
              <span className="text-xs font-bold text-slate-800 mt-0.5 block truncate">
                {record.department}
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-500 font-semibold block flex items-center gap-1">
                <HardDrive className="w-3 h-3 text-slate-400" /> File Size
              </span>
              <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                {formatBytes(record.file_size)}
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-500 font-semibold block flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" /> Session / Semester
              </span>
              <span className="text-xs font-bold text-slate-800 mt-0.5 block truncate">
                {record.semester} ({record.academic_year})
              </span>
            </div>
          </div>

          {/* Cryptographic SHA-256 Hash Display */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Cryptographic SHA-256 Checksum
              </span>
              <button
                onClick={copyHash}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                {copiedHash ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Hash</span>
                  </>
                )}
              </button>
            </div>
            <div className="p-2.5 bg-white rounded-lg border border-slate-200 font-mono text-xs text-slate-800 break-all select-all">
              {record.sha256_hash}
            </div>
          </div>

          {/* Cloud Storage Location */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
            <span className="font-bold">Cloud Storage Location:</span>
            <div className="font-mono text-[11px] break-all bg-white/70 p-2 rounded border border-blue-100">
              college-records-originals/{record.storage_path}
            </div>
          </div>

          {/* Backup Archives for this file */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-4 h-4 text-college-600" />
                Registered Cloud Backup Archives ({fileBackups.length})
              </h4>
              <button
                onClick={() => onCreateBackup(record.id)}
                className="text-xs text-college-600 hover:text-college-800 font-semibold"
              >
                + Create New Backup
              </button>
            </div>

            {fileBackups.length === 0 ? (
              <div className="p-3 border border-amber-200 bg-amber-50 rounded-xl text-xs text-amber-800">
                No backups created yet for this record. Create a backup now to ensure disaster recovery protection.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-44 overflow-y-auto">
                {fileBackups.map(bkp => (
                  <div key={bkp.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">
                          Version {bkp.version}
                        </span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded uppercase font-semibold">
                          {bkp.backup_type}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(bkp.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-slate-500 truncate mt-0.5">
                        college-records-backups/{bkp.backup_storage_path}
                      </p>
                    </div>
                    <button
                      onClick={() => onDownloadBackup(bkp)}
                      title="Download this backup copy"
                      className="p-1.5 text-slate-500 hover:text-college-600 hover:bg-college-50 rounded-lg transition-colors flex-shrink-0"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => onVerifyIntegrity(record.id)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-college-700 bg-college-50 border border-college-200 hover:bg-college-100 rounded-lg transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-college-600" />
            <span>Verify Live Integrity</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onDownloadFile(record)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-sm"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Download Original</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
