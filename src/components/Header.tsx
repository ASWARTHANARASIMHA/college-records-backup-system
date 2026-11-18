import React from 'react';
import { 
  Building2, 
  ShieldCheck, 
  Activity, 
  Database, 
  Cloud,
  RefreshCw, 
  Layers, 
  FileText, 
  RotateCcw, 
  History, 
  Settings as SettingsIcon,
  FlaskConical,
  User,
  Globe2
} from 'lucide-react';
import { DbSettings } from '../types';

export type NavTab = 
  | 'dashboard'
  | 'files'
  | 'backups'
  | 'recovery'
  | 'simulation'
  | 'logs'
  | 'settings';

interface HeaderProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  settings: DbSettings;
  autoBackupCountdown: number;
  isAutoBackupRunning: boolean;
  onTriggerBackupAll: () => void;
  onTriggerAutoBackupNow: () => void;
  deletedWithBackupCount: number;
  awaitingBackupCount: number;
  isCloudConnected: boolean;
  isAzureConnected: boolean;
  onOpenCloudConfig: () => void;
  currentUser: string | null;
  onOpenAuth: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  settings,
  autoBackupCountdown,
  isAutoBackupRunning,
  onTriggerBackupAll,
  onTriggerAutoBackupNow,
  deletedWithBackupCount,
  awaitingBackupCount,
  isCloudConnected,
  isAzureConnected,
  onOpenCloudConfig,
  currentUser,
  onOpenAuth
}) => {
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: number; badgeColor?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <Layers className="w-4 h-4" /> },
    { 
      id: 'files', 
      label: 'File Management', 
      icon: <FileText className="w-4 h-4" />,
      badge: awaitingBackupCount > 0 ? awaitingBackupCount : undefined,
      badgeColor: 'bg-amber-100 text-amber-800'
    },
    { id: 'backups', label: 'Cloud Backups', icon: <Database className="w-4 h-4" /> },
    { 
      id: 'recovery', 
      label: 'Recovery Center', 
      icon: <RotateCcw className="w-4 h-4" />,
      badge: deletedWithBackupCount > 0 ? deletedWithBackupCount : undefined,
      badgeColor: 'bg-rose-100 text-rose-800 font-bold animate-pulse'
    },
    { id: 'simulation', label: 'Failure Simulation & Lab', icon: <FlaskConical className="w-4 h-4" /> },
    { id: 'logs', label: 'Activity Logs', icon: <History className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-4 h-4" /> }
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      {/* Top Institutional Bar */}
      <div className="bg-slate-900 text-white px-4 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-1 bg-college-600 rounded text-white flex items-center justify-center">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold tracking-wide uppercase text-college-200">
              {settings.institution_name}
            </span>
            <span className="hidden md:inline text-slate-400 mx-2">|</span>
            <span className="hidden md:inline text-slate-300">
              {settings.department_name}
            </span>
          </div>
        </div>

        {/* Multi-Cloud Status & Heartbeat */}
        <div className="flex items-center gap-3">
          {/* Microsoft Azure GRS Badge */}
          <button
            onClick={onOpenCloudConfig}
            title="Microsoft Azure Blob Storage Offsite Geo-Replication"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors bg-sky-950/80 border-sky-500/40 text-sky-300 hover:bg-sky-900"
          >
            <Globe2 className="w-3.5 h-3.5 text-sky-400" />
            <span>{isAzureConnected ? 'Azure Blob: GRS Active' : 'Azure Storage'}</span>
          </button>

          {/* Supabase Cloud Connection Indicator */}
          <button
            onClick={onOpenCloudConfig}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
              isCloudConnected 
                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900' 
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>{isCloudConnected ? 'Supabase Connected' : 'Cloud Setup'}</span>
          </button>

          {/* Autonomous Auto-Backup Heartbeat */}
          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
            <span className="relative flex h-2 w-2">
              {settings.auto_backup_enabled ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-500"></span>
              )}
            </span>
            <span className="text-[11px] font-medium text-slate-300">
              {settings.auto_backup_enabled ? (
                <>
                  Auto-Backup: <span className="text-emerald-400 font-semibold">Active</span> ({formatCountdown(autoBackupCountdown)})
                </>
              ) : (
                <span className="text-slate-400">Auto-Backup: Paused</span>
              )}
            </span>
            {settings.auto_backup_enabled && (
              <button
                onClick={onTriggerAutoBackupNow}
                disabled={isAutoBackupRunning}
                title="Trigger immediate automatic backup check cycle"
                className="hover:text-white text-slate-400 transition-colors ml-1"
              >
                <RefreshCw className={`w-3 h-3 ${isAutoBackupRunning ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
            )}
          </div>

          {/* Admin User Button */}
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
          >
            <User className="w-3 h-3 text-college-400" />
            <span className="text-[11px] font-semibold">{currentUser || 'Admin Login'}</span>
          </button>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="px-4 sm:px-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between py-3 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-college-600 rounded-xl text-white shadow-md shadow-college-600/20">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                Automated Backup & Recovery System
                <span className="hidden sm:inline-block text-[11px] font-bold uppercase tracking-wider bg-college-100 text-college-800 px-2 py-0.5 rounded-full">
                  Hybrid Cloud: Supabase + Microsoft Azure
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Two-Bucket Isolation &bull; Microsoft Azure GRS Offsite Vault &bull; PostgreSQL Metadata &bull; Web Crypto SHA-256
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-auto">
            <button
              onClick={onTriggerBackupAll}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-college-600 hover:bg-college-700 active:bg-college-800 rounded-lg shadow-sm transition-all hover:shadow"
            >
              <Database className="w-4 h-4" />
              <span>Backup All Files</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto border-t border-slate-100 pt-1 -mb-px">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-college-600 text-college-700 bg-college-50/60'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${item.badgeColor || 'bg-slate-100 text-slate-700'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
