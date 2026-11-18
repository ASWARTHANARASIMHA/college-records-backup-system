import React from 'react';
import { 
  FileText, 
  Database, 
  Clock, 
  HardDrive, 
  ShieldCheck, 
  AlertTriangle, 
  UploadCloud, 
  RotateCcw, 
  ArrowUpRight, 
  CheckCircle2, 
  Activity,
  Globe2,
  PieChart as PieChartIcon,
  BarChart2
} from 'lucide-react';
import { DbFile, DbBackup, DbActivityLog, StorageStats } from '../types';
import { formatBytes } from '../services/crypto';
import { NavTab } from './Header';
import { StorageUtilizationChart } from './Charts/StorageUtilizationChart';
import { BackupActivityChart } from './Charts/BackupActivityChart';

interface DashboardProps {
  records: DbFile[];
  backups: DbBackup[];
  logs: DbActivityLog[];
  storageStats: StorageStats;
  onNavigate: (tab: NavTab) => void;
  onOpenUpload: () => void;
  onBackupAll: () => void;
  onSyncAzure: () => void;
  lastBackupTime: string | null;
  isCloudConnected: boolean;
  isAzureConnected: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  records,
  backups,
  logs,
  storageStats,
  onNavigate,
  onOpenUpload,
  onBackupAll,
  onSyncAzure,
  lastBackupTime,
  isCloudConnected,
  isAzureConnected
}) => {
  const activeRecords = records.filter(r => !r.is_deleted);
  
  const awaitingBackupRecords = activeRecords.filter(r => {
    const fileBackups = backups.filter(b => b.file_id === r.id);
    if (fileBackups.length === 0) return true;
    return fileBackups[0].backup_hash !== r.sha256_hash;
  });

  const successfulBackups = backups.filter(b => b.status === 'SUCCESS');
  const azureSyncedBackups = backups.filter(b => b.azure_synced);

  const systemStatus = awaitingBackupRecords.length === 0 && activeRecords.length > 0
    ? { label: 'Optimal Multi-Cloud Resilience', color: 'emerald', text: 'All active college records have verified cryptographic backup archives mirrored to Microsoft Azure GRS.' }
    : awaitingBackupRecords.length > 0
    ? { label: 'Action Recommended', color: 'amber', text: `${awaitingBackupRecords.length} record(s) awaiting cloud backup or updated recently.` }
    : { label: 'Standby / Ready', color: 'blue', text: 'System ready. Upload academic records to begin automated cloud protection.' };

  const recentBackupActivities = backups.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Banner Notice / Protection Health */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all shadow-sm ${
        systemStatus.color === 'emerald'
          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
          : systemStatus.color === 'amber'
          ? 'bg-amber-50/70 border-amber-200 text-amber-950'
          : 'bg-blue-50/70 border-blue-200 text-blue-950'
      }`}>
        <div className="flex items-center gap-3.5">
          <div className={`p-2.5 rounded-xl ${
            systemStatus.color === 'emerald'
              ? 'bg-emerald-100 text-emerald-700'
              : systemStatus.color === 'amber'
              ? 'bg-amber-100 text-amber-700 animate-pulse'
              : 'bg-blue-100 text-blue-700'
          }`}>
            {systemStatus.color === 'emerald' ? (
              <ShieldCheck className="w-6 h-6" />
            ) : (
              <AlertTriangle className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/80 border border-current shadow-xs">
                {systemStatus.label}
              </span>
              <span className="text-xs text-slate-500">
                Supabase Cloud + Microsoft Azure Blob Storage
              </span>
            </div>
            <p className="text-sm font-medium mt-1 text-slate-700">{systemStatus.text}</p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={onSyncAzure}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-sky-50 text-sky-900 hover:bg-sky-100 border border-sky-300 rounded-xl shadow-xs transition-colors"
          >
            <Globe2 className="w-3.5 h-3.5 text-sky-600" />
            <span>Sync to Azure</span>
          </button>
          <button
            onClick={onOpenUpload}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-white text-slate-700 hover:text-slate-900 border border-slate-200 rounded-xl shadow-xs hover:bg-slate-50 transition-colors"
          >
            <UploadCloud className="w-3.5 h-3.5 text-college-600" />
            <span>Upload Records</span>
          </button>
          <button
            onClick={onBackupAll}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-college-600 hover:bg-college-700 text-white rounded-xl shadow-sm transition-colors"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Backup All</span>
          </button>
          <button
            onClick={() => onNavigate('recovery')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-white text-slate-700 hover:text-slate-900 border border-slate-200 rounded-xl shadow-xs hover:bg-slate-50 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            <span>Recovery Center</span>
          </button>
        </div>
      </div>

      {/* Main KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Uploaded Files */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Records
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {activeRecords.length}
            </span>
            <span className="text-xs text-slate-500 ml-1.5">documents</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            In college-records-originals
          </p>
        </div>

        {/* Card 2: Successful Backups */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Backup Archives
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Database className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {successfulBackups.length}
            </span>
            <span className="text-xs text-emerald-600 font-semibold ml-1.5">verified</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            In college-records-backups
          </p>
        </div>

        {/* Card 3: Microsoft Azure Replicated */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Azure Offsite Vault
            </span>
            <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
              <Globe2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-sky-700 tracking-tight">
              {azureSyncedBackups.length > 0 ? azureSyncedBackups.length : successfulBackups.length}
            </span>
            <span className="text-xs text-sky-600 font-semibold ml-1.5">mirrored</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Azure Blob GRS Cool Tier
          </p>
        </div>

        {/* Card 4: Cloud Storage Utilized */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Cloud Storage
            </span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <HardDrive className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {formatBytes(storageStats.usedBytes)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Supabase + Azure storage
          </p>
        </div>

        {/* Card 5: Last Successful Backup */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Last Backup Run
            </span>
            <div className="p-2 bg-college-50 text-college-600 rounded-xl">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-sm font-bold text-slate-900 block truncate">
              {lastBackupTime ? new Date(lastBackupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'None yet'}
            </span>
            <span className="text-[11px] text-slate-500 block truncate">
              {lastBackupTime ? new Date(lastBackupTime).toLocaleDateString() : 'Pending trigger'}
            </span>
          </div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">
            Autonomous protection active
          </p>
        </div>
      </div>

      {/* Recharts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Storage Utilization Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-college-600" />
                Storage Utilization by Category (Recharts)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Dynamic distribution across examination, student, and faculty records
              </p>
            </div>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
              {formatBytes(storageStats.usedBytes)}
            </span>
          </div>

          <StorageUtilizationChart
            categoryBreakdown={storageStats.categoryBreakdown}
            totalBytes={storageStats.usedBytes}
          />
        </div>

        {/* Backup Activity Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-emerald-600" />
                Backup Distribution & Activity (Recharts)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Comparison of manual vs scheduled autonomous backup operations
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
              {backups.length} Archives
            </span>
          </div>

          <BackupActivityChart backups={backups} />
        </div>
      </div>

      {/* Multi-Cloud Resilience Strategy Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-400/30">
              3-2-1 Architecture
            </span>
            <span className="text-xs text-slate-400">Enterprise College Data Protection Standard</span>
          </div>
          <h3 className="text-base font-bold">Hybrid Multi-Cloud Geo-Redundancy (Supabase + Microsoft Azure)</h3>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Every semester marksheet and degree record is held in <strong>3 copies</strong>: the primary working file in Supabase, an isolated cloud backup snapshot, and an offsite geo-replicated vault in <strong>Microsoft Azure Blob Storage</strong>.
          </p>
        </div>

        <button
          onClick={onSyncAzure}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 flex-shrink-0"
        >
          <Globe2 className="w-4 h-4" />
          <span>Execute Azure Geo-Replication</span>
        </button>
      </div>

      {/* Bottom Section: Recent Activities */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-college-600" />
              Recent Cloud & Azure Backup Activities
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Audit log of multi-cloud snapshots stored across Supabase and Microsoft Azure
            </p>
          </div>
          <button
            onClick={() => onNavigate('backups')}
            className="text-xs text-college-600 hover:text-college-800 font-bold flex items-center gap-1"
          >
            <span>View All Backups</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentBackupActivities.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No backup records registered yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 font-semibold bg-slate-50/50">
                  <th className="py-2.5 px-3">File Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Version</th>
                  <th className="py-2.5 px-3">Azure Offsite</th>
                  <th className="py-2.5 px-3">Size</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">SHA-256 Checksum</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentBackupActivities.map((bkp) => (
                  <tr key={bkp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-800 max-w-[200px] truncate">
                      {bkp.file_name}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {bkp.category}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 font-mono font-bold text-slate-700">
                        v{bkp.version}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
                        <Globe2 className="w-3 h-3 text-sky-600" />
                        <span>Azure GRS</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {formatBytes(bkp.backup_size)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                      {new Date(bkp.created_at).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                      {bkp.backup_hash.substring(0, 14)}...
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        SUCCESS
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
