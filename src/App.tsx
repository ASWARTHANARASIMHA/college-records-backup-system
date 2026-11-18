import React, { useState, useEffect, useCallback } from 'react';
import { 
  DbFile, 
  DbBackup, 
  DbRecoveryLog, 
  DbActivityLog, 
  DbSettings, 
  StorageStats, 
  IntegrityCheckResult 
} from './types';
import { 
  fetchFiles, 
  fetchBackups, 
  fetchRecoveryLogs, 
  fetchActivityLogs, 
  fetchSettings, 
  updateSettings, 
  computeStorageStats, 
  seedInitialAcademicRecords, 
  purgeAllCloudData, 
  clearAllLogs, 
  deleteOriginalFile, 
  createCloudBackup, 
  backupAllActiveFiles, 
  restoreRecordFromCloudBackup, 
  verifyFileIntegrity, 
  simulateTamperFile,
  logActivity
} from './services/cloudDataService';
import { getStoredSupabaseConfig, getSupabase } from './services/supabase';
import { getAzureConfig, syncAllBackupsToAzure } from './services/azureStorage';

// UI Components
import { Header, NavTab } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { FileManagement } from './components/FileManagement';
import { BackupManagement } from './components/BackupManagement';
import { RecoveryCenter } from './components/RecoveryCenter';
import { FailureSimulation } from './components/FailureSimulation';
import { ActivityLogs } from './components/ActivityLogs';
import { Settings } from './components/Settings';

// Modals
import { UploadModal } from './components/UploadModal';
import { IntegrityModal } from './components/IntegrityModal';
import { FileDetailsModal } from './components/FileDetailsModal';
import { CloudConfigModal } from './components/CloudConfigModal';
import { AuthModal } from './components/AuthModal';
import { ConfirmModal } from './components/Common/ConfirmModal';
import { ToastContainer, ToastMessage } from './components/Common/Toast';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [records, setRecords] = useState<DbFile[]>([]);
  const [backups, setBackups] = useState<DbBackup[]>([]);
  const [recoveryHistory, setRecoveryHistory] = useState<DbRecoveryLog[]>([]);
  const [logs, setLogs] = useState<DbActivityLog[]>([]);
  const [settings, setSettings] = useState<DbSettings>({
    id: 'system_config',
    institution_name: 'Apex Institute of Engineering & Technology',
    department_name: 'Office of the Controller of Examinations & Academic Records',
    auto_backup_enabled: true,
    backup_interval: 5,
    admin_name: 'Chief Records Administrator'
  });
  const [storageStats, setStorageStats] = useState<StorageStats>({
    usedBytes: 0,
    quotaBytes: 104857600,
    originalCount: 0,
    backupCount: 0,
    categoryBreakdown: {}
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>('admin@college.edu');
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(getStoredSupabaseConfig().isConfigured);
  const [isAzureConnected, setIsAzureConnected] = useState<boolean>(getAzureConfig().connected);

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isIntegrityOpen, setIsIntegrityOpen] = useState(false);
  const [integrityResult, setIntegrityResult] = useState<IntegrityCheckResult | null>(null);
  const [detailsRecord, setDetailsRecord] = useState<DbFile | null>(null);
  const [isCloudConfigOpen, setIsCloudConfigOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Auto-backup countdown & status
  const [autoBackupCountdown, setAutoBackupCountdown] = useState<number>(300);
  const [isAutoBackupRunning, setIsAutoBackupRunning] = useState<boolean>(false);

  const addToast = (type: ToastMessage['type'], title: string, message?: string) => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Reload all state
  const refreshData = useCallback(async () => {
    try {
      const [recList, bkpList, recovList, logList, sysSettings, storageInfo] = await Promise.all([
        fetchFiles(),
        fetchBackups(),
        fetchRecoveryLogs(),
        fetchActivityLogs(),
        fetchSettings(),
        computeStorageStats()
      ]);

      setRecords(recList);
      setBackups(bkpList);
      setRecoveryHistory(recovList);
      setLogs(logList);
      setSettings(sysSettings);
      setStorageStats(storageInfo);
      setIsCloudConnected(getStoredSupabaseConfig().isConfigured);
      setIsAzureConnected(getAzureConfig().connected);
    } catch (err) {
      console.error('Error refreshing system data:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      await seedInitialAcademicRecords();
      await refreshData();
    };
    init();
  }, [refreshData]);

  // Synchronize autoBackupCountdown when settings interval changes
  useEffect(() => {
    setAutoBackupCountdown(settings.backup_interval * 60);
  }, [settings.backup_interval]);

  // Execute one cycle of automatic backup
  const executeAutoBackup = useCallback(async () => {
    if (!settings.auto_backup_enabled || isAutoBackupRunning) return;

    setIsAutoBackupRunning(true);
    try {
      const { successCount } = await backupAllActiveFiles('Automated Cloud Daemon');
      await refreshData();

      if (successCount > 0) {
        addToast(
          'info',
          'Autonomous Cloud Backup Completed',
          `Backed up ${successCount} records to Supabase & Azure Storage.`
        );
      }
    } catch (err) {
      console.error('Auto backup execution error:', err);
    } finally {
      setIsAutoBackupRunning(false);
      setAutoBackupCountdown(settings.backup_interval * 60);
    }
  }, [settings.auto_backup_enabled, settings.backup_interval, isAutoBackupRunning, refreshData]);

  // Periodic timer for autonomous backup countdown
  useEffect(() => {
    if (!settings.auto_backup_enabled) return;

    const interval = setInterval(() => {
      setAutoBackupCountdown(prev => {
        if (prev <= 1) {
          executeAutoBackup();
          return settings.backup_interval * 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [settings.auto_backup_enabled, settings.backup_interval, executeAutoBackup]);

  // Multi-Cloud Sync to Microsoft Azure
  const handleSyncAzure = async () => {
    setIsProcessing(true);
    try {
      const result = await syncAllBackupsToAzure(backups, currentUser || settings.admin_name);
      await refreshData();
      addToast(
        'success',
        'Microsoft Azure Replication Complete',
        result.message
      );
    } catch (err) {
      console.error('Azure sync error:', err);
      addToast('error', 'Azure Sync Failed', 'Could not mirror snapshots to Azure Blob Storage');
    } finally {
      setIsProcessing(false);
    }
  };

  // Download File Blob helper
  const handleDownloadFile = async (fileName: string, contentStr = 'College Academic Record Content') => {
    const blob = new Blob([contentStr], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('success', 'Download Started', `Downloaded ${fileName}`);
  };

  const handleDownloadOriginal = async (file: DbFile) => {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase.storage
          .from('college-records-originals')
          .download(file.storage_path);
        if (data && !error) {
          const url = URL.createObjectURL(data);
          const a = document.createElement('a');
          a.href = url;
          a.download = file.file_name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          addToast('success', 'Download Started', `Downloaded ${file.file_name} from college-records-originals`);
          return;
        }
      } catch (e) {
        console.warn('Direct download fallback:', e);
      }
    }
    handleDownloadFile(file.file_name);
  };

  const handleDownloadBackup = async (backup: DbBackup) => {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase.storage
          .from('college-records-backups')
          .download(backup.backup_storage_path);
        if (data && !error) {
          const url = URL.createObjectURL(data);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Backup_v${backup.version}_${backup.file_name}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          addToast('success', 'Download Started', `Downloaded backup v${backup.version}`);
          return;
        }
      } catch (e) {
        console.warn('Backup download fallback:', e);
      }
    }
    handleDownloadFile(`Backup_v${backup.version}_${backup.file_name}`);
  };

  // Run real cryptographic integrity check
  const handleVerifyIntegrity = async (fileId: string) => {
    setIsProcessing(true);
    try {
      const result = await verifyFileIntegrity(fileId);
      setIntegrityResult(result);
      setIsIntegrityOpen(true);
      await refreshData();
    } catch (err) {
      console.error('Integrity check error:', err);
      addToast('error', 'Integrity Check Failed', 'Could not compute SHA-256 digest');
    } finally {
      setIsProcessing(false);
    }
  };

  // Create manual backup of a single file
  const handleCreateBackup = async (fileId: string) => {
    setIsProcessing(true);
    try {
      const result = await createCloudBackup(fileId, 'MANUAL', currentUser || settings.admin_name);
      await refreshData();

      if (result.status === 'SUCCESS') {
        addToast(
          'success',
          'Cloud Backup Archive Created',
          `Created v${result.backup?.version} in college-records-backups & mirrored to Azure`
        );
      } else if (result.status === 'SKIPPED') {
        addToast('info', 'Backup Skipped (Deduplication)', result.message);
      } else {
        addToast('error', 'Backup Failed', result.message);
      }
    } catch (err) {
      console.error('Backup error:', err);
      addToast('error', 'Backup Operation Failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Batch backup selected records
  const handleBatchBackup = async (fileIds: string[]) => {
    setIsProcessing(true);
    try {
      let successCount = 0;
      let skippedCount = 0;
      for (const id of fileIds) {
        const res = await createCloudBackup(id, 'MANUAL', currentUser || settings.admin_name);
        if (res.status === 'SUCCESS') successCount++;
        else if (res.status === 'SKIPPED') skippedCount++;
      }
      await refreshData();
      addToast(
        'success',
        'Batch Backup Completed',
        `Successfully backed up ${successCount} records. (${skippedCount} skipped as identical).`
      );
    } catch (err) {
      console.error('Batch backup error:', err);
      addToast('error', 'Batch Backup Failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Backup all active records
  const handleBackupAll = async () => {
    setIsProcessing(true);
    try {
      const { successCount, skippedCount } = await backupAllActiveFiles(currentUser || settings.admin_name);
      await refreshData();
      addToast(
        'success',
        'Cloud-wide Backup Completed',
        `Backed up ${successCount} active records. (${skippedCount} already up to date).`
      );
    } catch (err) {
      console.error('Backup all error:', err);
      addToast('error', 'Full Backup Failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Delete record (with confirmation modal)
  const handleDeleteRecord = (record: DbFile) => {
    setConfirmDialog({
      isOpen: true,
      title: `Delete Record: ${record.file_name}?`,
      message: `Are you sure you want to delete this record from working storage? It will be removed from college-records-originals, but all historical backup archives will be preserved in college-records-backups and Microsoft Azure.`,
      confirmLabel: 'Delete Original Record',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setIsProcessing(true);
        try {
          await deleteOriginalFile(record.id, currentUser || settings.admin_name);
          await refreshData();
          addToast('warning', 'Record Deleted', `'${record.file_name}' removed from originals bucket. Preserved in Recovery Center.`);
        } catch (err) {
          console.error('Delete record error:', err);
          addToast('error', 'Failed to delete record');
        } finally {
          setIsProcessing(false);
        }
      }
    });
  };

  // Restore deleted or modified record from backup
  const handleRestoreRecord = async (backup: DbBackup) => {
    setIsProcessing(true);
    try {
      const result = await restoreRecordFromCloudBackup(backup, currentUser || settings.admin_name);
      await refreshData();

      if (result.success) {
        addToast(
          'success',
          'Record Successfully Restored',
          `'${backup.file_name}' reconstituted into college-records-originals with 100% SHA-256 confirmation.`
        );
      } else {
        addToast('error', 'Restoration Warning', result.message);
      }
    } catch (err) {
      console.error('Restore error:', err);
      addToast('error', 'Restoration Failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Simulate accidental deletion
  const handleSimulateDeletion = async (record: DbFile) => {
    handleDeleteRecord(record);
  };

  // Simulate file tampering / modification
  const handleSimulateTamper = async (fileId: string) => {
    setIsProcessing(true);
    try {
      const res = await simulateTamperFile(fileId);
      await refreshData();
      if (res.success) {
        addToast(
          'error',
          'Tamper Simulation Triggered',
          `Modified file content. New SHA-256 diverged from authentic cloud backup baseline!`
        );
      }
    } catch (err) {
      console.error('Tamper simulation error:', err);
      addToast('error', 'Tamper simulation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Update Settings
  const handleSaveSettings = async (newSettings: DbSettings) => {
    await updateSettings(newSettings);
    setSettings(newSettings);
    await logActivity({
      action: 'SYSTEM_SETTINGS',
      description: 'Updated system parameters and autonomous backup intervals',
      status: 'INFO',
      operator: currentUser || newSettings.admin_name,
      details: `Interval: ${newSettings.backup_interval}m | Auto-Backup: ${newSettings.auto_backup_enabled ? 'Enabled' : 'Disabled'}`
    });
    await refreshData();
    addToast('success', 'Settings Saved', 'System configuration updated successfully.');
  };

  // Seed sample data
  const handleSeedSampleData = async () => {
    setIsProcessing(true);
    try {
      await seedInitialAcademicRecords();
      await refreshData();
      addToast('success', 'Official Records Seeded', 'Populated academic marksheets, attendance logs, and accreditation records.');
    } catch (err) {
      console.error('Seed error:', err);
      addToast('error', 'Failed to seed sample records');
    } finally {
      setIsProcessing(false);
    }
  };

  // Purge all data
  const handlePurgeAllData = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'DANGER: Purge All System Records & Backups?',
      message: 'This action will completely erase all academic records, backup archives, disaster recovery history, and audit logs. This cannot be undone.',
      confirmLabel: 'Permanently Erase All Data',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setIsProcessing(true);
        try {
          await purgeAllCloudData();
          await refreshData();
          addToast('info', 'System Purged', 'All cloud and local database stores cleared.');
        } catch (err) {
          console.error('Purge error:', err);
          addToast('error', 'Failed to purge data');
        } finally {
          setIsProcessing(false);
        }
      }
    });
  };

  // Clear logs
  const handleClearLogs = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Clear Audit Activity Logs?',
      message: 'Are you sure you want to clear the activity audit history? Active records and backups will remain untouched.',
      confirmLabel: 'Clear Logs',
      isDestructive: false,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        await clearAllLogs();
        await refreshData();
        addToast('info', 'Audit Logs Cleared', 'Activity log history has been emptied.');
      }
    });
  };

  // Export logs to CSV
  const handleExportLogsCSV = () => {
    if (logs.length === 0) return;
    const headers = ['LogID', 'Timestamp', 'Action', 'Status', 'FileName', 'Description', 'Details', 'Operator'];
    const rows = logs.map(log => [
      `"${log.id}"`,
      `"${log.created_at}"`,
      `"${log.action}"`,
      `"${log.status}"`,
      `"${log.file_name || ''}"`,
      `"${log.description.replace(/"/g, '""')}"`,
      `"${(log.details || '').replace(/"/g, '""')}"`,
      `"${log.operator}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    handleDownloadFile(`College_Records_Audit_Log_${new Date().toISOString().slice(0, 10)}.csv`, csvContent);
  };

  const latestBackupTime = backups.length > 0 ? backups[0].created_at : null;
  const deletedWithBackupCount = records.filter(r => r.is_deleted).length;
  const awaitingBackupCount = records.filter(r => {
    if (r.is_deleted) return false;
    const recBkp = backups.filter(b => b.file_id === r.id);
    return recBkp.length === 0 || recBkp[0].backup_hash !== r.sha256_hash;
  }).length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        isDestructive={confirmDialog.isDestructive}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={async () => {
          await refreshData();
          addToast('success', 'Records Uploaded', 'New academic documents saved with SHA-256 hashes.');
        }}
      />

      <IntegrityModal
        isOpen={isIntegrityOpen}
        result={integrityResult}
        latestBackup={
          integrityResult
            ? backups.find(b => b.file_id === integrityResult.fileId)
            : undefined
        }
        loading={isProcessing}
        onClose={() => setIsIntegrityOpen(false)}
        onRecheck={async () => {
          if (integrityResult && (integrityResult.fileId || integrityResult.recordId)) {
            await handleVerifyIntegrity(integrityResult.fileId || integrityResult.recordId || '');
          }
        }}
        onRestoreFromBackup={handleRestoreRecord}
      />

      <FileDetailsModal
        isOpen={!!detailsRecord}
        record={detailsRecord}
        backups={backups}
        onClose={() => setDetailsRecord(null)}
        onVerifyIntegrity={handleVerifyIntegrity}
        onCreateBackup={handleCreateBackup}
        onDownloadFile={handleDownloadOriginal}
        onDownloadBackup={handleDownloadBackup}
      />

      <CloudConfigModal
        isOpen={isCloudConfigOpen}
        onClose={() => setIsCloudConfigOpen(false)}
        onConfigSaved={async () => {
          await refreshData();
          addToast('success', 'Multi-Cloud Configuration Updated', 'Connected to Supabase & Microsoft Azure Storage.');
        }}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={(email) => {
          setCurrentUser(email);
          addToast('success', 'Administrator Session Active', `Signed in as ${email}`);
        }}
        onLogout={() => {
          setCurrentUser(null);
          addToast('info', 'Logged Out', 'Administrator session ended.');
        }}
      />

      <Header
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        settings={settings}
        autoBackupCountdown={autoBackupCountdown}
        isAutoBackupRunning={isAutoBackupRunning}
        onTriggerBackupAll={handleBackupAll}
        onTriggerAutoBackupNow={executeAutoBackup}
        deletedWithBackupCount={deletedWithBackupCount}
        awaitingBackupCount={awaitingBackupCount}
        isCloudConnected={isCloudConnected}
        isAzureConnected={isAzureConnected}
        onOpenCloudConfig={() => setIsCloudConfigOpen(true)}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6">
        {currentTab === 'dashboard' && (
          <Dashboard
            records={records}
            backups={backups}
            logs={logs}
            storageStats={storageStats}
            onNavigate={setCurrentTab}
            onOpenUpload={() => setIsUploadOpen(true)}
            onBackupAll={handleBackupAll}
            onSyncAzure={handleSyncAzure}
            lastBackupTime={latestBackupTime}
            isCloudConnected={isCloudConnected}
            isAzureConnected={isAzureConnected}
          />
        )}

        {currentTab === 'files' && (
          <FileManagement
            records={records}
            backups={backups}
            onOpenUpload={() => setIsUploadOpen(true)}
            onDownloadOriginal={handleDownloadOriginal}
            onVerifyIntegrity={handleVerifyIntegrity}
            onViewDetails={rec => setDetailsRecord(rec)}
            onCreateBackup={handleCreateBackup}
            onBatchBackup={handleBatchBackup}
            onDeleteRecord={handleDeleteRecord}
            isProcessing={isProcessing}
          />
        )}

        {currentTab === 'backups' && (
          <BackupManagement
            backups={backups}
            records={records}
            settings={settings}
            onUpdateSettings={handleSaveSettings}
            onBackupAll={handleBackupAll}
            onDownloadBackup={handleDownloadBackup}
            onTriggerAutoBackupNow={executeAutoBackup}
            onSyncAzure={handleSyncAzure}
            isProcessing={isProcessing}
            isCloudConnected={isCloudConnected}
            isAzureConnected={isAzureConnected}
          />
        )}

        {currentTab === 'recovery' && (
          <RecoveryCenter
            records={records}
            backups={backups}
            recoveryHistory={recoveryHistory}
            onRestore={handleRestoreRecord}
            onDownloadBackup={handleDownloadBackup}
            isProcessing={isProcessing}
          />
        )}

        {currentTab === 'simulation' && (
          <FailureSimulation
            records={records}
            backups={backups}
            onSimulateDeletion={handleSimulateDeletion}
            onSimulateTamper={handleSimulateTamper}
            onRestoreRecord={handleRestoreRecord}
            onVerifyIntegrity={handleVerifyIntegrity}
            onNavigate={setCurrentTab}
          />
        )}

        {currentTab === 'logs' && (
          <ActivityLogs
            logs={logs}
            onClearLogs={handleClearLogs}
          />
        )}

        {currentTab === 'settings' && (
          <Settings
            settings={settings}
            storageStats={storageStats}
            onSaveSettings={handleSaveSettings}
            onSeedSampleData={handleSeedSampleData}
            onPurgeAllData={handlePurgeAllData}
            onExportLogsCSV={handleExportLogsCSV}
            onOpenCloudConfig={() => setIsCloudConfigOpen(true)}
            isProcessing={isProcessing}
            isCloudConnected={isCloudConnected}
            isAzureConnected={isAzureConnected}
          />
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-4 px-4 sm:px-8 mt-auto text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700">{settings.institution_name}</span>
          <span>&copy; {new Date().getFullYear()} College Records & Academic Archives Vault</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-slate-400">
          <span>Supabase Cloud</span>
          <span>&bull;</span>
          <span>Microsoft Azure Blob GRS</span>
          <span>&bull;</span>
          <span>Azure AD SSO</span>
          <span>&bull;</span>
          <span>Web Crypto SHA-256</span>
        </div>
      </footer>
    </div>
  );
}
