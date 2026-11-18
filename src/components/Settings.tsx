import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Building2, 
  Clock, 
  HardDrive, 
  Database, 
  Trash2, 
  Download, 
  Save, 
  CheckCircle2, 
  FolderSync,
  Cloud,
  Globe2
} from 'lucide-react';
import { DbSettings, StorageStats } from '../types';
import { formatBytes } from '../services/crypto';

interface SettingsProps {
  settings: DbSettings;
  storageStats: StorageStats;
  onSaveSettings: (settings: DbSettings) => void;
  onSeedSampleData: () => void;
  onPurgeAllData: () => void;
  onExportLogsCSV: () => void;
  onOpenCloudConfig: () => void;
  isProcessing: boolean;
  isCloudConnected: boolean;
  isAzureConnected: boolean;
}

export const Settings: React.FC<SettingsProps> = ({
  settings,
  storageStats,
  onSaveSettings,
  onSeedSampleData,
  onPurgeAllData,
  onExportLogsCSV,
  onOpenCloudConfig,
  isProcessing,
  isCloudConnected,
  isAzureConnected
}) => {
  const [formData, setFormData] = useState<DbSettings>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const quotaPercent = storageStats.quotaBytes > 0
    ? Math.min(Math.round((storageStats.usedBytes / storageStats.quotaBytes) * 10000) / 100, 100)
    : 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-college-600" />
            System Configuration & Multi-Cloud Profile
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Customize college authority metadata, autonomous backup parameters, storage limits, and Microsoft Azure cloud integration.
          </p>
        </div>

        <button
          onClick={onOpenCloudConfig}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 transition-colors shadow-xs"
        >
          <Globe2 className="w-4 h-4 text-sky-600" />
          <span>Azure & Supabase Cloud Setup</span>
        </button>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-college-600" />
          Institution & Department Identity
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Institution Name *
            </label>
            <input
              type="text"
              value={formData.institution_name}
              onChange={e => setFormData({ ...formData, institution_name: e.target.value })}
              className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-college-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Department / Office Name *
            </label>
            <input
              type="text"
              value={formData.department_name}
              onChange={e => setFormData({ ...formData, department_name: e.target.value })}
              className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-college-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Chief Administrator Title / Name
            </label>
            <input
              type="text"
              value={formData.admin_name}
              onChange={e => setFormData({ ...formData, admin_name: e.target.value })}
              className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-college-500"
              required
            />
          </div>
        </div>

        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 pt-2 flex items-center gap-2">
          <Clock className="w-4 h-4 text-college-600" />
          Autonomous Backup Automation
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                Enable Autonomous Scheduled Backups
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                Automatically scans for unbacked or modified files and creates point-in-time archives in Supabase & Azure while the browser is open.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, auto_backup_enabled: !formData.auto_backup_enabled })}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                formData.auto_backup_enabled ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  formData.auto_backup_enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Automatic Backup Execution Interval
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[1, 5, 15].map(mins => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setFormData({ ...formData, backup_interval: mins })}
                  className={`p-3 text-center rounded-xl border text-xs font-bold transition-all ${
                    formData.backup_interval === mins
                      ? 'border-college-600 bg-college-50 text-college-700 ring-2 ring-college-500/20'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="block text-base">{mins} Min</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {mins === 1 ? 'Continuous / Rapid' : mins === 5 ? 'Standard Interval' : 'Extended Polling'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-3 flex items-center justify-between border-t border-slate-100">
          {savedSuccess && (
            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              Settings updated successfully!
            </span>
          )}
          <div className="ml-auto">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-college-600 hover:bg-college-700 rounded-xl shadow-sm transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Save System Settings</span>
            </button>
          </div>
        </div>
      </form>

      {/* Storage Information & Quota */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-purple-600" />
          Multi-Cloud Storage Quota (Supabase + Microsoft Azure GRS)
        </h3>
        <p className="text-xs text-slate-500">
          Distribution across <code>college-records-originals</code>, <code>college-records-backups</code>, and Azure Blob Storage offsite container.
        </p>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Storage In Use: {formatBytes(storageStats.usedBytes)}</span>
            <span>Allocated Quota: {formatBytes(storageStats.quotaBytes)}</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(quotaPercent, 1)}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>{storageStats.originalCount} Originals + {storageStats.backupCount} Backup Archives (Mirrored to Azure)</span>
            <span>{quotaPercent}% Quota Consumed</span>
          </div>
        </div>
      </div>

      {/* Demonstration Tools */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Database className="w-4 h-4 text-college-600" />
          Case Study Demonstration Tools & Data Controls
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <button
            type="button"
            onClick={onSeedSampleData}
            disabled={isProcessing}
            className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-colors"
          >
            <FolderSync className="w-5 h-5 text-college-600 mb-1" />
            <span className="block text-xs font-bold text-slate-900">Seed Official Records</span>
            <span className="block text-[11px] text-slate-500 mt-0.5">
              Populate marksheets, faculty forms, and NAAC documents with SHA-256 baselines.
            </span>
          </button>

          <button
            type="button"
            onClick={onExportLogsCSV}
            className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-colors"
          >
            <Download className="w-5 h-5 text-emerald-600 mb-1" />
            <span className="block text-xs font-bold text-slate-900">Export Audit Log (CSV)</span>
            <span className="block text-[11px] text-slate-500 mt-0.5">
              Download the complete activity history for accreditation and compliance.
            </span>
          </button>

          <button
            type="button"
            onClick={onPurgeAllData}
            disabled={isProcessing}
            className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-50 text-left transition-colors"
          >
            <Trash2 className="w-5 h-5 text-rose-600 mb-1" />
            <span className="block text-xs font-bold text-rose-900">Purge System Data</span>
            <span className="block text-[11px] text-rose-600 mt-0.5">
              Wipes all working records, backup archives, recovery events, and logs.
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
