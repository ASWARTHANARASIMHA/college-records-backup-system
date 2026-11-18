import { AcademicRecord, BackupRecord, RecoveryRecord, IntegrityCheckResult } from '../types';
import { computeSHA256 } from './crypto';
import {
  getRecordById,
  saveRecord,
  getAllRecords,
  getBackupsForRecord,
  saveBackup,
  saveRecoveryRecord,
  addLog,
  getSettings,
  saveSettings
} from './db';

export interface BackupOperationResult {
  recordId: string;
  fileName: string;
  status: 'SUCCESS' | 'SKIPPED' | 'FAILED';
  version?: number;
  reason?: string;
  backup?: BackupRecord;
}

/**
 * Creates a backup for an individual academic record.
 * Includes strict duplicate prevention: if file content hasn't changed since the latest backup,
 * unnecessary duplicate storage is avoided.
 */
export async function createBackupForRecord(
  recordId: string,
  backupType: 'MANUAL' | 'AUTOMATIC' = 'MANUAL',
  adminName = 'College Records Admin'
): Promise<BackupOperationResult> {
  const record = await getRecordById(recordId);
  if (!record) {
    return {
      recordId,
      fileName: 'Unknown',
      status: 'FAILED',
      reason: 'Record not found'
    };
  }

  if (record.isDeleted) {
    return {
      recordId,
      fileName: record.name,
      status: 'FAILED',
      reason: 'Cannot backup a deleted record'
    };
  }

  // Calculate live hash of the current record content
  const currentHash = await computeSHA256(record.content);
  
  // Update record hash if out of sync
  if (record.sha256 !== currentHash) {
    record.sha256 = currentHash;
    await saveRecord(record);
  }

  // Retrieve existing backups for this record
  const existingBackups = await getBackupsForRecord(recordId);
  const latestBackup = existingBackups[0]; // sorted descending by timestamp

  // Prevent duplicate backup if identical
  if (latestBackup && latestBackup.sha256 === currentHash) {
    return {
      recordId,
      fileName: record.name,
      status: 'SKIPPED',
      version: latestBackup.version,
      reason: `No changes detected. Latest backup (v${latestBackup.version}) matches current SHA-256 checksum.`
    };
  }

  const nextVersion = latestBackup ? latestBackup.version + 1 : 1;
  const backupId = `bkp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  // Create an independent clone of the original Blob
  const backupBlob = new Blob([await record.content.arrayBuffer()], { type: record.type });
  const backupHash = await computeSHA256(backupBlob);

  const backupRecord: BackupRecord = {
    id: backupId,
    recordId: record.id,
    fileName: record.name,
    category: record.category,
    department: record.department,
    version: nextVersion,
    backupType,
    timestamp: new Date().toISOString(),
    size: backupBlob.size,
    sha256: backupHash,
    content: backupBlob,
    status: 'SUCCESS',
    notes: backupType === 'AUTOMATIC' 
      ? `Scheduled auto-backup archive v${nextVersion}`
      : `Manual backup v${nextVersion} requested by ${adminName}`
  };

  await saveBackup(backupRecord);

  // If record was previously marked as tampered, but legitimate backup is taken, reset tampered flag
  if (record.tampered) {
    record.tampered = false;
    await saveRecord(record);
  }

  await addLog({
    action: backupType === 'AUTOMATIC' ? 'AUTO_BACKUP' : 'MANUAL_BACKUP',
    description: `Created ${backupType.toLowerCase()} backup v${nextVersion} for '${record.name}'`,
    status: 'SUCCESS',
    fileName: record.name,
    details: `Version: v${nextVersion} | Size: ${backupBlob.size} bytes | SHA-256: ${backupHash.substring(0, 16)}...`,
    admin: adminName
  });

  return {
    recordId,
    fileName: record.name,
    status: 'SUCCESS',
    version: nextVersion,
    backup: backupRecord
  };
}

/**
 * Creates backups for a batch of records.
 */
export async function backupBatchRecords(
  recordIds: string[],
  backupType: 'MANUAL' | 'AUTOMATIC' = 'MANUAL',
  adminName = 'College Records Admin'
): Promise<{
  results: BackupOperationResult[];
  successCount: number;
  skippedCount: number;
  failedCount: number;
}> {
  const results: BackupOperationResult[] = [];
  let successCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const id of recordIds) {
    const res = await createBackupForRecord(id, backupType, adminName);
    results.push(res);
    if (res.status === 'SUCCESS') successCount++;
    else if (res.status === 'SKIPPED') skippedCount++;
    else failedCount++;
  }

  return { results, successCount, skippedCount, failedCount };
}

/**
 * Backs up all active files in the system with duplicate prevention.
 */
export async function backupAllActiveRecords(
  backupType: 'MANUAL' | 'AUTOMATIC' = 'MANUAL',
  adminName = 'College Records Admin'
): Promise<{
  results: BackupOperationResult[];
  successCount: number;
  skippedCount: number;
  failedCount: number;
}> {
  const activeRecords = await getAllRecords(false);
  const ids = activeRecords.map(r => r.id);
  return await backupBatchRecords(ids, backupType, adminName);
}

/**
 * Runs one automated backup cycle.
 * Scans active records; if any record has no backup or has been modified since last backup,
 * automatically generates a backup.
 */
export async function runAutoBackupCycle(): Promise<{
  executed: boolean;
  backedUpCount: number;
  details: string;
}> {
  const settings = await getSettings();
  if (!settings.autoBackupEnabled) {
    return { executed: false, backedUpCount: 0, details: 'Auto backup is disabled in settings' };
  }

  const allRecords = await getAllRecords(false);
  const toBackupIds: string[] = [];

  for (const record of allRecords) {
    const backups = await getBackupsForRecord(record.id);
    if (backups.length === 0) {
      toBackupIds.push(record.id);
    } else {
      const latest = backups[0];
      const liveHash = await computeSHA256(record.content);
      if (latest.sha256 !== liveHash) {
        toBackupIds.push(record.id);
      }
    }
  }

  if (toBackupIds.length === 0) {
    settings.lastAutoBackupTimestamp = new Date().toISOString();
    await saveSettings(settings);
    return { executed: true, backedUpCount: 0, details: 'All active files are already backed up and up-to-date.' };
  }

  const { successCount } = await backupBatchRecords(toBackupIds, 'AUTOMATIC', 'Autonomous Daemon');
  settings.lastAutoBackupTimestamp = new Date().toISOString();
  await saveSettings(settings);

  return {
    executed: true,
    backedUpCount: successCount,
    details: `Auto-backup cycle completed. Backed up ${successCount} modified or unbacked records.`
  };
}

/**
 * Restores a deleted or modified file from an archive backup.
 * Recreates the original file in the active file manager.
 */
export async function restoreRecordFromBackup(
  backup: BackupRecord,
  adminName = 'Disaster Recovery Admin'
): Promise<{ success: boolean; recoveryRecord: RecoveryRecord; details: string }> {
  // Re-verify the backup blob integrity prior to restoration
  const backupLiveHash = await computeSHA256(backup.content);
  const integrityVerified = backupLiveHash === backup.sha256;

  // Clone blob for original storage
  const restoredBlob = new Blob([await backup.content.arrayBuffer()], { type: backup.content.type || 'application/octet-stream' });
  const restoredSha = await computeSHA256(restoredBlob);

  const now = new Date().toISOString();
  
  // Reconstitute the academic record
  let record = await getRecordById(backup.recordId);
  if (!record) {
    // If original record metadata was completely removed, recreate it
    record = {
      id: backup.recordId,
      name: backup.fileName,
      category: backup.category,
      department: backup.department,
      academicYear: 'Restored Archive',
      semester: 'Restored Archive',
      size: restoredBlob.size,
      type: backup.content.type || 'application/octet-stream',
      uploadDate: now,
      lastModified: now,
      sha256: restoredSha,
      content: restoredBlob,
      isDeleted: false,
      tampered: false
    };
  } else {
    record.name = backup.fileName;
    record.category = backup.category;
    record.department = backup.department;
    record.size = restoredBlob.size;
    record.lastModified = now;
    record.sha256 = restoredSha;
    record.content = restoredBlob;
    record.isDeleted = false;
    record.deletedAt = undefined;
    record.tampered = false;
  }

  await saveRecord(record);

  // Record recovery log
  const recoveryId = `recov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const recoveryRecord: RecoveryRecord = {
    id: recoveryId,
    recordId: backup.recordId,
    backupId: backup.id,
    fileName: backup.fileName,
    category: backup.category,
    department: backup.department,
    restoredAt: now,
    restoredBy: adminName,
    restoredSha256: restoredSha,
    integrityVerified,
    status: integrityVerified ? 'SUCCESS' : 'FAILED',
    details: `Restored from backup v${backup.version} (${backup.backupType.toLowerCase()}). SHA-256 match: ${integrityVerified ? 'Confirmed 100%' : 'Checksum Mismatch Warning'}`
  };

  await saveRecoveryRecord(recoveryRecord);

  await addLog({
    action: 'FILE_RESTORATION',
    description: `Restored record '${backup.fileName}' from backup v${backup.version}`,
    status: integrityVerified ? 'SUCCESS' : 'DANGER',
    fileName: backup.fileName,
    details: `Restored ${restoredBlob.size} bytes. Integrity verified: ${integrityVerified}. Restored SHA-256: ${restoredSha.substring(0, 16)}...`,
    admin: adminName
  });

  return {
    success: integrityVerified,
    recoveryRecord,
    details: `Record '${backup.fileName}' successfully restored to File Management from backup v${backup.version}.`
  };
}

/**
 * Verifies live cryptographic integrity of a record against its stored hash and latest backup.
 */
export async function verifyRecordIntegrity(recordId: string): Promise<IntegrityCheckResult> {
  const record = await getRecordById(recordId);
  const now = new Date().toISOString();

  if (!record) {
    return {
      recordId,
      fileName: 'Unknown',
      originalHash: '',
      backupHash: '',
      liveHash: '',
      isMatch: false,
      status: 'MISSING_ORIGINAL',
      checkedAt: now,
      details: 'The original record does not exist in the database.'
    };
  }

  // Calculate live hash of the record's current binary blob
  const liveHash = await computeSHA256(record.content);
  const backups = await getBackupsForRecord(recordId);

  if (backups.length === 0) {
    const isOriginalUnchanged = liveHash === record.sha256;
    await addLog({
      action: 'INTEGRITY_VERIFICATION',
      description: `Integrity check for '${record.name}': No backup available yet`,
      status: 'WARNING',
      fileName: record.name,
      details: `Live SHA-256: ${liveHash.substring(0, 16)}... No backup baseline found.`,
      admin: 'Integrity Auditor'
    });

    return {
      recordId,
      fileName: record.name,
      originalHash: record.sha256,
      backupHash: 'N/A',
      liveHash,
      isMatch: isOriginalUnchanged,
      status: 'NO_BACKUP',
      checkedAt: now,
      details: 'File has no backup copy registered. Please create a backup to establish a baseline.'
    };
  }

  const latestBackup = backups[0];
  const isMatch = liveHash === latestBackup.sha256;

  await addLog({
    action: 'INTEGRITY_VERIFICATION',
    description: `Integrity audit for '${record.name}': ${isMatch ? 'PASSED (Authentic)' : 'TAMPER DETECTED'}`,
    status: isMatch ? 'SUCCESS' : 'DANGER',
    fileName: record.name,
    details: isMatch 
      ? `Live hash matches backup v${latestBackup.version} (${liveHash.substring(0, 16)}...)` 
      : `MISMATCH! Live: ${liveHash.substring(0, 16)}... vs Backup: ${latestBackup.sha256.substring(0, 16)}...`,
    admin: 'Integrity Auditor'
  });

  return {
    recordId,
    fileName: record.name,
    originalHash: record.sha256,
    backupHash: latestBackup.sha256,
    liveHash,
    isMatch,
    status: isMatch ? 'VERIFIED' : 'TAMPERED',
    checkedAt: now,
    details: isMatch
      ? `Cryptographic integrity confirmed. File is identical to verified backup v${latestBackup.version}.`
      : `Integrity compromised! Live file content diverges from authentic backup v${latestBackup.version}.`
  };
}

/**
 * Simulates content corruption / tampering on an original record for lab demonstration.
 */
export async function simulateTamperRecord(
  recordId: string,
  tamperPayload = '\n[UNAUTHORIZED MODIFICATION - SIMULATED BIT-ROT / TAMPER ATTACK BY MALICIOUS SCRIPT]'
): Promise<{ success: boolean; newHash: string }> {
  const record = await getRecordById(recordId);
  if (!record || record.isDeleted) {
    return { success: false, newHash: '' };
  }

  // Inject altered bytes into original blob
  const originalText = await record.content.text();
  const modifiedText = originalText + tamperPayload;
  const modifiedBlob = new Blob([modifiedText], { type: record.type });
  const newHash = await computeSHA256(modifiedBlob);

  record.content = modifiedBlob;
  record.size = modifiedBlob.size;
  record.tampered = true;
  record.lastModified = new Date().toISOString();
  await saveRecord(record);

  await addLog({
    action: 'FILE_MODIFICATION',
    description: `Simulated unauthorized modification / data corruption on '${record.name}'`,
    status: 'DANGER',
    fileName: record.name,
    details: `Injected tamper payload. New SHA-256: ${newHash.substring(0, 16)}... (Original baseline broken!)`,
    admin: 'DR Simulation Lab'
  });

  return { success: true, newHash };
}
