import React, { useState } from 'react';
import { 
  RotateCcw, 
  ShieldCheck, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Database, 
  History, 
  ShieldAlert,
  Search
} from 'lucide-react';
import { DbFile, DbBackup, DbRecoveryLog } from '../types';

interface RecoveryCenterProps {
  records: DbFile[];
  backups: DbBackup[];
  recoveryHistory: DbRecoveryLog[];
  onRestore: (backup: DbBackup) => void;
  onDownloadBackup: (backup: DbBackup) => void;
  isProcessing: boolean;
}

export const RecoveryCenter: React.FC<RecoveryCenterProps> = ({
  records,
  backups,
  recoveryHistory,
  onRestore,
  onDownloadBackup,
  isProcessing
}) => {
  const [selectedVersions, setSelectedVersions] = useState<{ [fileId: string]: string }>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Deleted records that still have backup copies stored in Supabase Storage
  const deletedRecordsWithBackups = records
    .filter(r => r.is_deleted)
    .map(r => {
      const fileBackups = backups.filter(b => b.file_id === r.id);
      return {
        record: r,
        backups: fileBackups,
        latestBackup: fileBackups[0]
      };
    })
    .filter(item => item.backups.length > 0);

  const filteredDeleted = deletedRecordsWithBackups.filter(item => 
    item.record.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.record.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.record.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleVersionSelect = (fileId: string, backupId: string) => {
    setSelectedVersions(prev => ({
      ...prev,
      [fileId]: backupId
    }));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-rose-600" />
            Cloud Disaster Recovery Center
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Reconstitute lost, deleted, or corrupted college records from <code>college-records-backups</code> to <code>college-records-originals</code>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>{deletedRecordsWithBackups.length} File(s) Recoverable from Cloud</span>
          </div>
        </div>
      </div>

      {/* Recoverable Records Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-college-600" />
              Deleted College Records with Available Cloud Backups
            </h3>
            <p className="text-xs text-slate-500">
              When an academic record is deleted from working storage, its backup archive remains preserved in isolated storage.
            </p>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Filter deleted records..."
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-college-500"
            />
          </div>
        </div>

        {filteredDeleted.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
            <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto" />
            <p className="text-xs font-bold text-slate-700">No Deleted Files Pending Recovery</p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              All active records are safe. Delete an uploaded file in File Management or test with Failure Simulation to demonstrate recovery.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDeleted.map(({ record, backups: fileBackups, latestBackup }) => {
              const activeBackupId = selectedVersions[record.id] || latestBackup.id;
              const activeBackup = fileBackups.find(b => b.id === activeBackupId) || latestBackup;

              return (
                <div
                  key={record.id}
                  className="p-4 rounded-xl border border-rose-100 bg-rose-50/20 hover:bg-rose-50/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-rose-100 text-rose-700 rounded-lg">
                        <FileText className="w-4 h-4" />
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 truncate">
                        {record.file_name}
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                        DELETED
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>Category: <strong className="text-slate-700">{record.category}</strong></span>
                      <span>Dept: <strong className="text-slate-700">{record.department}</strong></span>
                      <span>Deleted: <strong className="text-slate-700">{record.deleted_at ? new Date(record.deleted_at).toLocaleString() : 'Recently'}</strong></span>
                    </div>

                    <div className="text-[11px] font-mono text-slate-400">
                      Cloud Backup SHA-256: {activeBackup.backup_hash.substring(0, 24)}...
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 self-end md:self-center">
                    {fileBackups.length > 1 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-600 font-semibold">Version:</span>
                        <select
                          value={activeBackupId}
                          onChange={e => handleVersionSelect(record.id, e.target.value)}
                          className="text-xs rounded-lg border border-slate-300 bg-white px-2 py-1 text-slate-800 focus:outline-none focus:ring-2 focus:ring-college-500"
                        >
                          {fileBackups.map(b => (
                            <option key={b.id} value={b.id}>
                              v{b.version} ({new Date(b.created_at).toLocaleTimeString()})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <button
                      onClick={() => onDownloadBackup(activeBackup)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors inline-flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      <span>Download</span>
                    </button>

                    <button
                      onClick={() => onRestore(activeBackup)}
                      disabled={isProcessing}
                      className="px-4 py-1.5 text-xs font-bold text-white bg-college-600 hover:bg-college-700 rounded-lg shadow-sm transition-all inline-flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore to Originals Bucket</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recovery History Audit Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-college-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Disaster Recovery Audit Trail & Cloud Restorations
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {recoveryHistory.length} successful recovery events logged in PostgreSQL
          </span>
        </div>

        {recoveryHistory.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No recovery operations performed yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Recovered Record</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Restoration Timestamp</th>
                  <th className="py-3 px-4">Restored By</th>
                  <th className="py-3 px-4">SHA-256 Checksum Match</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recoveryHistory.map(rec => (
                  <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 max-w-xs truncate">
                      {rec.file_name}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {rec.category || 'Examination Records'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {rec.department || 'Computer Science & Engineering'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(rec.recovered_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {rec.restored_by}
                    </td>
                    <td className="py-3 px-4">
                      {rec.integrity_verified ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Verified 100%
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-semibold text-xs">
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                          Checksum Warning
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {rec.recovery_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
