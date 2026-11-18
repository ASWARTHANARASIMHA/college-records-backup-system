import React, { useState } from 'react';
import { 
  Database, 
  Clock, 
  Download, 
  CheckCircle2, 
  RefreshCw, 
  HardDrive, 
  Search, 
  Filter, 
  Copy, 
  Check, 
  Zap, 
  FileCheck2, 
  Globe2 
} from 'lucide-react';
import { DbBackup, DbFile, DbSettings } from '../types';
import { formatBytes } from '../services/crypto';

interface BackupManagementProps {
  backups: DbBackup[];
  records: DbFile[];
  settings: DbSettings;
  onUpdateSettings: (settings: DbSettings) => void;
  onBackupAll: () => void;
  onDownloadBackup: (backup: DbBackup) => void;
  onTriggerAutoBackupNow: () => void;
  onSyncAzure: () => void;
  isProcessing: boolean;
  isCloudConnected: boolean;
  isAzureConnected: boolean;
}

export const BackupManagement: React.FC<BackupManagementProps> = ({
  backups,
  records,
  settings,
  onUpdateSettings,
  onBackupAll,
  onDownloadBackup,
  onTriggerAutoBackupNow,
  onSyncAzure,
  isProcessing,
  isCloudConnected,
  isAzureConnected
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'MANUAL' | 'AUTOMATIC'>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeRecords = records.filter(r => !r.is_deleted);
  const automatedBackups = backups.filter(b => b.backup_type === 'AUTOMATIC');
  const manualBackups = backups.filter(b => b.backup_type === 'MANUAL');

  const filteredBackups = backups.filter(b => {
    const matchesSearch = b.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'ALL' || b.backup_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleCopyHash = (hash: string, id: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleIntervalChange = (minutes: number) => {
    onUpdateSettings({
      ...settings,
      backup_interval: minutes
    });
  };

  const handleToggleAutoBackup = () => {
    onUpdateSettings({
      ...settings,
      auto_backup_enabled: !settings.auto_backup_enabled
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Summary */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-college-600" />
            Cloud Backup Management (Two-Bucket + Microsoft Azure Offsite)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Point-in-time snapshots in <code>college-records-backups</code> with automated cross-cloud replication to <strong>Microsoft Azure Blob Storage</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onSyncAzure}
            disabled={isProcessing || backups.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-sky-800 bg-sky-50 border border-sky-300 hover:bg-sky-100 rounded-xl transition-colors shadow-xs"
          >
            <Globe2 className="w-4 h-4 text-sky-600" />
            <span>Mirror to Microsoft Azure</span>
          </button>
          <button
            onClick={onBackupAll}
            disabled={isProcessing || activeRecords.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-college-600 hover:bg-college-700 active:bg-college-800 rounded-xl shadow-sm transition-all disabled:opacity-50"
          >
            <Database className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
            <span>Backup All Active Records</span>
          </button>
        </div>
      </div>

      {/* Auto Backup Configuration */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-college-50 text-college-600 rounded-lg">
                <Zap className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                Autonomous Cloud Backup Engine
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                settings.auto_backup_enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
              }`}>
                {settings.auto_backup_enabled ? 'ENGINE ACTIVE' : 'PAUSED'}
              </span>
            </div>
            <p className="text-xs text-slate-500 max-w-xl">
              Monitors active college records while the application is open. Automatically initiates backups for newly modified documents.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-600 mr-1">Interval:</span>
              {[1, 5, 15].map(mins => (
                <button
                  key={mins}
                  onClick={() => handleIntervalChange(mins)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                    settings.backup_interval === mins
                      ? 'bg-college-600 text-white border-college-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleAutoBackup}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.auto_backup_enabled ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.auto_backup_enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="text-xs font-bold text-slate-700">
                {settings.auto_backup_enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            {settings.auto_backup_enabled && (
              <button
                onClick={onTriggerAutoBackupNow}
                disabled={isProcessing}
                className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-xs transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${isProcessing ? 'animate-spin text-college-600' : ''}`} />
                <span>Check Now</span>
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl flex items-start gap-3 text-xs text-blue-900">
          <FileCheck2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">Cryptographic Deduplication Gate: </span>
            The system hashes each file with SHA-256 before transferring to <code>college-records-backups</code>. Duplicate files with unchanged checksums are avoided to optimize cloud bandwidth and storage.
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase">Total Backups</span>
            <div className="text-xl font-bold text-slate-900">{backups.length} archives</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-sky-50 text-sky-600 rounded-lg">
            <Globe2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase">Azure Offsite Vault</span>
            <div className="text-xl font-bold text-sky-800">{backups.length} geo-synced</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase">Manual Backups</span>
            <div className="text-xl font-bold text-slate-900">{manualBackups.length} on-demand</div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search backup records..."
              className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-college-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as any)}
              className="text-xs rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-college-500"
            >
              <option value="ALL">Type: All Backups</option>
              <option value="MANUAL">Type: Manual Only</option>
              <option value="AUTOMATIC">Type: Automatic Only</option>
            </select>
          </div>
        </div>

        {filteredBackups.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No backup archives matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Backup Archive Target</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Multi-Cloud Vault</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Cryptographic Checksum (SHA-256)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBackups.map(bkp => (
                  <tr key={bkp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 max-w-xs truncate">
                      {bkp.file_name}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        Dept: {bkp.department}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      {bkp.category}
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 font-mono font-bold text-slate-800">
                        v{bkp.version}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
                        <Globe2 className="w-3 h-3 text-sky-600" />
                        <span>Azure Cool Tier</span>
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {formatBytes(bkp.backup_size)}
                    </td>

                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(bkp.created_at).toLocaleString()}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] text-slate-600 select-all">
                          {bkp.backup_hash.substring(0, 16)}...
                        </span>
                        <button
                          onClick={() => handleCopyHash(bkp.backup_hash, bkp.id)}
                          title="Copy Full SHA-256 Checksum"
                          className="text-slate-400 hover:text-slate-700"
                        >
                          {copiedId === bkp.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onDownloadBackup(bkp)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-college-700 rounded-lg transition-colors shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
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
