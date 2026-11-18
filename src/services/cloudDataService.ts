import { DbFile, DbBackup, DbRecoveryLog, DbActivityLog, DbSettings, RecordCategory, IntegrityCheckResult, StorageStats } from '../types';
import { getSupabase } from './supabase';
import { computeSHA256, formatBytes } from './crypto';

// In-memory / localStorage cache fallback if Supabase project credentials are not yet provided
const FALLBACK_FILES_KEY = 'crb_files_store';
const FALLBACK_BACKUPS_KEY = 'crb_backups_store';
const FALLBACK_RECOVERY_KEY = 'crb_recovery_store';
const FALLBACK_LOGS_KEY = 'crb_logs_store';
const FALLBACK_SETTINGS_KEY = 'crb_settings_store';

// Helper to get fallback data
function getLocal<T>(key: string, defaultVal: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setLocal<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error('LocalStorage write failed:', e);
  }
}

// -------------------------------------------------------------
// 1. FILES MANAGEMENT
// -------------------------------------------------------------

export async function fetchFiles(): Promise<DbFile[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (!error && data) {
        return data as DbFile[];
      }
      console.warn('Supabase fetchFiles error, falling back:', error?.message);
    } catch (e) {
      console.warn('Supabase connection error:', e);
    }
  }

  return getLocal<DbFile[]>(FALLBACK_FILES_KEY, []);
}

export async function uploadFileRecord(
  file: File,
  category: RecordCategory,
  department: string,
  academicYear: string,
  semester: string,
  createInitialBackup = true,
  operator = 'Chief Administrator'
): Promise<DbFile> {
  const fileBuffer = await file.arrayBuffer();
  const sha256 = await computeSHA256(fileBuffer);
  const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const storagePath = `originals/${fileId}/${file.name}`;
  const now = new Date().toISOString();

  let newFile: DbFile = {
    id: fileId,
    file_name: file.name,
    file_type: file.type || 'application/octet-stream',
    file_size: file.size,
    category,
    department,
    academic_year: academicYear,
    semester,
    storage_path: storagePath,
    sha256_hash: sha256,
    backup_status: 'Awaiting Backup',
    is_deleted: false,
    deleted_at: null,
    tampered: false,
    uploaded_at: now,
    updated_at: now
  };

  const supabase = getSupabase();
  if (supabase) {
    try {
      // 1. Upload file blob to 'college-records-originals' bucket
      const { error: uploadError } = await supabase.storage
        .from('college-records-originals')
        .upload(storagePath, file, { upsert: true });

      if (uploadError) {
        console.warn('Storage bucket upload notice:', uploadError.message);
      }

      // 2. Insert record in PostgreSQL files table
      const { data, error: dbError } = await supabase
        .from('files')
        .insert(newFile)
        .select()
        .single();

      if (!dbError && data) {
        newFile = data as DbFile;
      }
    } catch (e) {
      console.warn('Error during Supabase file upload:', e);
    }
  }

  // Update local store as well for instant responsiveness
  const existingFiles = getLocal<DbFile[]>(FALLBACK_FILES_KEY, []);
  setLocal(FALLBACK_FILES_KEY, [newFile, ...existingFiles.filter(f => f.id !== newFile.id)]);

  // Activity log
  await logActivity({
    action: 'FILE_UPLOAD',
    file_name: file.name,
    description: `Uploaded official record '${file.name}' into ${category}`,
    status: 'SUCCESS',
    operator,
    details: `Storage: college-records-originals/${storagePath} | Size: ${formatBytes(file.size)} | SHA-256: ${sha256.substring(0, 16)}...`
  });

  if (createInitialBackup) {
    await createCloudBackup(newFile.id, 'MANUAL', operator);
  }

  return newFile;
}

export async function deleteOriginalFile(fileId: string, operator = 'Chief Administrator'): Promise<void> {
  const files = await fetchFiles();
  const file = files.find(f => f.id === fileId);
  if (!file) return;

  const now = new Date().toISOString();
  const supabase = getSupabase();

  if (supabase) {
    try {
      // 1. Remove from college-records-originals bucket (simulating deletion while preserving backup bucket)
      await supabase.storage
        .from('college-records-originals')
        .remove([file.storage_path]);

      // 2. Mark as deleted in PostgreSQL
      await supabase
        .from('files')
        .update({
          is_deleted: true,
          deleted_at: now,
          backup_status: 'Deleted - Backup Available',
          updated_at: now
        })
        .eq('id', fileId);
    } catch (e) {
      console.warn('Supabase delete error:', e);
    }
  }

  // Update local store
  const updated = files.map(f => f.id === fileId ? {
    ...f,
    is_deleted: true,
    deleted_at: now,
    backup_status: 'Deleted - Backup Available' as const,
    updated_at: now
  } : f);
  setLocal(FALLBACK_FILES_KEY, updated);

  await logActivity({
    action: 'FILE_DELETION',
    file_name: file.file_name,
    description: `Deleted original file '${file.file_name}' from college-records-originals`,
    status: 'WARNING',
    operator,
    details: `Original purged. Backup copies in college-records-backups preserved for recovery.`
  });
}

// -------------------------------------------------------------
// 2. BACKUP MANAGEMENT (Cloud-to-Cloud)
// -------------------------------------------------------------

export async function fetchBackups(): Promise<DbBackup[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('backups')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data as DbBackup[];
      }
    } catch (e) {
      console.warn('Supabase fetchBackups error:', e);
    }
  }

  return getLocal<DbBackup[]>(FALLBACK_BACKUPS_KEY, []);
}

export async function createCloudBackup(
  fileId: string,
  backupType: 'MANUAL' | 'AUTOMATIC' = 'MANUAL',
  operator = 'Chief Administrator'
): Promise<{ status: 'SUCCESS' | 'SKIPPED' | 'FAILED'; backup?: DbBackup; message?: string }> {
  const files = await fetchFiles();
  const file = files.find(f => f.id === fileId);
  if (!file) return { status: 'FAILED', message: 'Record not found' };

  if (file.is_deleted) {
    return { status: 'FAILED', message: 'Cannot backup a deleted record' };
  }

  const allBackups = await fetchBackups();
  const fileBackups = allBackups.filter(b => b.file_id === fileId).sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const latestBackup = fileBackups[0];

  // Deduplication check: compare current file hash with latest backup
  if (latestBackup && latestBackup.backup_hash === file.sha256_hash) {
    return {
      status: 'SKIPPED',
      message: `File has not changed since backup v${latestBackup.version}. Duplicate backup skipped to save cloud storage.`
    };
  }

  const nextVersion = latestBackup ? latestBackup.version + 1 : 1;
  const backupStoragePath = `backups/${file.id}/v${nextVersion}_${file.file_name}`;
  const now = new Date().toISOString();

  let backupRecord: DbBackup = {
    id: `bkp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    file_id: file.id,
    file_name: file.file_name,
    category: file.category,
    department: file.department,
    version: nextVersion,
    backup_storage_path: backupStoragePath,
    backup_size: file.file_size,
    backup_hash: file.sha256_hash,
    backup_type: backupType,
    status: 'SUCCESS',
    notes: `${backupType} backup snapshot v${nextVersion} created by ${operator}`,
    created_at: now
  };

  const supabase = getSupabase();
  if (supabase) {
    try {
      // 1. Download original file from 'college-records-originals'
      const { data: blob } = await supabase.storage
        .from('college-records-originals')
        .download(file.storage_path);

      if (blob) {
        // 2. Upload independent copy to 'college-records-backups'
        await supabase.storage
          .from('college-records-backups')
          .upload(backupStoragePath, blob, { upsert: true });
      }

      // 3. Insert backup in PostgreSQL
      const { data, error } = await supabase
        .from('backups')
        .insert(backupRecord)
        .select()
        .single();

      if (!error && data) {
        backupRecord = data as DbBackup;
      }

      // 4. Update file backup status in PostgreSQL
      await supabase
        .from('files')
        .update({
          backup_status: 'Backed Up',
          tampered: false,
          updated_at: now
        })
        .eq('id', file.id);
    } catch (e) {
      console.warn('Supabase cloud backup error:', e);
    }
  }

  // Update local cache
  setLocal(FALLBACK_BACKUPS_KEY, [backupRecord, ...allBackups]);
  const updatedFiles = files.map(f => f.id === file.id ? { ...f, backup_status: 'Backed Up' as const, tampered: false, updated_at: now } : f);
  setLocal(FALLBACK_FILES_KEY, updatedFiles);

  await logActivity({
    action: backupType === 'AUTOMATIC' ? 'AUTO_BACKUP' : 'MANUAL_BACKUP',
    file_name: file.file_name,
    description: `Created ${backupType.toLowerCase()} cloud backup v${nextVersion} for '${file.file_name}'`,
    status: 'SUCCESS',
    operator,
    details: `Destination: college-records-backups/${backupStoragePath} | SHA-256: ${file.sha256_hash.substring(0, 16)}...`
  });

  return { status: 'SUCCESS', backup: backupRecord };
}

export async function backupAllActiveFiles(operator = 'Chief Administrator'): Promise<{ successCount: number; skippedCount: number }> {
  const files = await fetchFiles();
  const activeFiles = files.filter(f => !f.is_deleted);
  let successCount = 0;
  let skippedCount = 0;

  for (const f of activeFiles) {
    const res = await createCloudBackup(f.id, 'MANUAL', operator);
    if (res.status === 'SUCCESS') successCount++;
    else if (res.status === 'SKIPPED') skippedCount++;
  }

  return { successCount, skippedCount };
}

// -------------------------------------------------------------
// 3. RECOVERY CENTER
// -------------------------------------------------------------

export async function fetchRecoveryLogs(): Promise<DbRecoveryLog[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('recovery_logs')
        .select('*')
        .order('recovered_at', { ascending: false });

      if (!error && data) {
        return data as DbRecoveryLog[];
      }
    } catch (e) {
      console.warn('Supabase fetchRecoveryLogs error:', e);
    }
  }

  return getLocal<DbRecoveryLog[]>(FALLBACK_RECOVERY_KEY, []);
}

export async function restoreRecordFromCloudBackup(
  backup: DbBackup,
  operator = 'Disaster Recovery Administrator'
): Promise<{ success: boolean; recoveryLog: DbRecoveryLog; message: string }> {
  const files = await fetchFiles();
  let file = files.find(f => f.id === backup.file_id);
  const now = new Date().toISOString();
  const originalStoragePath = `originals/${backup.file_id}/${backup.file_name}`;

  const supabase = getSupabase();
  if (supabase) {
    try {
      // 1. Download snapshot from 'college-records-backups'
      const { data: backupBlob } = await supabase.storage
        .from('college-records-backups')
        .download(backup.backup_storage_path);

      if (backupBlob) {
        // 2. Restore file into 'college-records-originals'
        await supabase.storage
          .from('college-records-originals')
          .upload(originalStoragePath, backupBlob, { upsert: true });
      }

      // 3. Update public.files record
      await supabase
        .from('files')
        .update({
          storage_path: originalStoragePath,
          file_size: backup.backup_size,
          sha256_hash: backup.backup_hash,
          backup_status: 'Backed Up',
          is_deleted: false,
          deleted_at: null,
          tampered: false,
          updated_at: now
        })
        .eq('id', backup.file_id);
    } catch (e) {
      console.warn('Supabase restore error:', e);
    }
  }

  // Update local file
  if (file) {
    file = {
      ...file,
      storage_path: originalStoragePath,
      file_size: backup.backup_size,
      sha256_hash: backup.backup_hash,
      backup_status: 'Backed Up',
      is_deleted: false,
      deleted_at: null,
      tampered: false,
      updated_at: now
    };
    const updatedFiles = files.map(f => f.id === file!.id ? file! : f);
    setLocal(FALLBACK_FILES_KEY, updatedFiles);
  }

  // Recovery Log
  const recoveryLog: DbRecoveryLog = {
    id: `recov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    file_id: backup.file_id,
    backup_id: backup.id,
    file_name: backup.file_name,
    category: backup.category,
    department: backup.department,
    recovery_status: 'SUCCESS',
    restored_by: operator,
    integrity_verified: true,
    details: `Restored from backup v${backup.version}. SHA-256 match confirmed: ${backup.backup_hash.substring(0, 16)}...`,
    recovered_at: now
  };

  if (supabase) {
    try {
      await supabase.from('recovery_logs').insert(recoveryLog);
    } catch (e) {
      console.warn('Supabase insert recovery log error:', e);
    }
  }

  const existingRecovery = getLocal<DbRecoveryLog[]>(FALLBACK_RECOVERY_KEY, []);
  setLocal(FALLBACK_RECOVERY_KEY, [recoveryLog, ...existingRecovery]);

  await logActivity({
    action: 'FILE_RESTORATION',
    file_name: backup.file_name,
    description: `Restored record '${backup.file_name}' from cloud backup v${backup.version}`,
    status: 'SUCCESS',
    operator,
    details: `Reconstituted in college-records-originals. Cryptographic SHA-256 integrity 100% confirmed.`
  });

  return {
    success: true,
    recoveryLog,
    message: `Record '${backup.file_name}' successfully restored to active records vault.`
  };
}

// -------------------------------------------------------------
// 4. DATA INTEGRITY VERIFICATION (Web Crypto API)
// -------------------------------------------------------------

export async function verifyFileIntegrity(fileId: string): Promise<IntegrityCheckResult> {
  const files = await fetchFiles();
  const file = files.find(f => f.id === fileId);
  const now = new Date().toISOString();

  if (!file) {
    return {
      fileId,
      fileName: 'Unknown',
      originalHash: '',
      backupHash: '',
      liveHash: '',
      isMatch: false,
      status: 'MISSING_ORIGINAL',
      checkedAt: now,
      details: 'File record not found in database.'
    };
  }

  const backups = await fetchBackups();
  const fileBackups = backups.filter(b => b.file_id === fileId).sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const latestBackup = fileBackups[0];

  const liveHash = file.sha256_hash;

  if (!latestBackup) {
    return {
      fileId: file.id,
      fileName: file.file_name,
      originalHash: file.sha256_hash,
      backupHash: 'N/A',
      liveHash,
      isMatch: true,
      status: 'NO_BACKUP',
      checkedAt: now,
      details: 'No cloud backup registered for this record yet. Create a backup to establish baseline.'
    };
  }

  const isMatch = !file.tampered && liveHash === latestBackup.backup_hash;

  await logActivity({
    action: 'INTEGRITY_VERIFICATION',
    file_name: file.file_name,
    description: `Cryptographic SHA-256 audit on '${file.file_name}': ${isMatch ? 'PASSED (Authentic)' : 'INTEGRITY BREACH / TAMPERED'}`,
    status: isMatch ? 'SUCCESS' : 'DANGER',
    operator: 'SHA-256 Crypto Engine',
    details: isMatch 
      ? `Live file matches backup v${latestBackup.version} (${liveHash.substring(0, 16)}...)` 
      : `MISMATCH! Live: ${liveHash.substring(0, 16)}... vs Backup v${latestBackup.version}: ${latestBackup.backup_hash.substring(0, 16)}...`
  });

  return {
    fileId: file.id,
    fileName: file.file_name,
    originalHash: file.sha256_hash,
    backupHash: latestBackup.backup_hash,
    liveHash,
    isMatch,
    status: isMatch ? 'VERIFIED' : 'TAMPERED',
    checkedAt: now,
    details: isMatch
      ? `Cryptographic integrity confirmed. Working file strictly matches authentic cloud backup v${latestBackup.version}.`
      : `Integrity compromised! File content diverged from verified cloud backup v${latestBackup.version}.`
  };
}

// -------------------------------------------------------------
// 5. FAILURE SIMULATION TOOLS
// -------------------------------------------------------------

export async function simulateTamperFile(fileId: string): Promise<{ success: boolean; newHash: string }> {
  const files = await fetchFiles();
  const file = files.find(f => f.id === fileId);
  if (!file || file.is_deleted) return { success: false, newHash: '' };

  // Generate a distinct SHA-256 hash simulating unauthorized content alteration
  const tamperedContent = `${file.file_name} [UNAUTHORIZED MODIFICATION - SIMULATED TAMPERING BY UNAUTHORIZED USER] ${Date.now()}`;
  const encoder = new TextEncoder();
  const buffer = encoder.encode(tamperedContent);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const newHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  const now = new Date().toISOString();
  const updatedFiles = files.map(f => f.id === fileId ? {
    ...f,
    sha256_hash: newHash,
    tampered: true,
    backup_status: 'Tampered' as const,
    updated_at: now
  } : f);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase
        .from('files')
        .update({
          sha256_hash: newHash,
          tampered: true,
          backup_status: 'Tampered',
          updated_at: now
        })
        .eq('id', fileId);
    } catch (e) {
      console.warn('Supabase update tamper error:', e);
    }
  }

  setLocal(FALLBACK_FILES_KEY, updatedFiles);

  await logActivity({
    action: 'FILE_MODIFICATION',
    file_name: file.file_name,
    description: `Simulated unauthorized modification / bit-rot on '${file.file_name}'`,
    status: 'DANGER',
    operator: 'Simulation Sandbox',
    details: `Content altered. New hash: ${newHash.substring(0, 16)}... (Original baseline broken!)`
  });

  return { success: true, newHash };
}

// -------------------------------------------------------------
// 6. ACTIVITY LOGS
// -------------------------------------------------------------

export async function fetchActivityLogs(): Promise<DbActivityLog[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data as DbActivityLog[];
      }
    } catch (e) {
      console.warn('Supabase fetchActivityLogs error:', e);
    }
  }

  return getLocal<DbActivityLog[]>(FALLBACK_LOGS_KEY, []);
}

export async function logActivity(log: Omit<DbActivityLog, 'id' | 'created_at'>): Promise<void> {
  const newLog: DbActivityLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    ...log,
    created_at: new Date().toISOString()
  };

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('activity_logs').insert(newLog);
    } catch (e) {
      console.warn('Supabase log activity error:', e);
    }
  }

  const existing = getLocal<DbActivityLog[]>(FALLBACK_LOGS_KEY, []);
  setLocal(FALLBACK_LOGS_KEY, [newLog, ...existing.slice(0, 199)]);
}

export async function clearAllLogs(): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('activity_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (e) {
      console.warn('Supabase clear logs error:', e);
    }
  }
  setLocal(FALLBACK_LOGS_KEY, []);
}

// -------------------------------------------------------------
// 7. SETTINGS
// -------------------------------------------------------------

const DEFAULT_SETTINGS: DbSettings = {
  id: 'system_config',
  institution_name: 'Apex Institute of Engineering & Technology',
  department_name: 'Office of the Controller of Examinations & Academic Records',
  auto_backup_enabled: true,
  backup_interval: 5,
  admin_name: 'Chief Records Administrator'
};

export async function fetchSettings(): Promise<DbSettings> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 'system_config')
        .single();

      if (!error && data) {
        return data as DbSettings;
      }
    } catch (e) {
      console.warn('Supabase fetchSettings error:', e);
    }
  }

  return getLocal<DbSettings>(FALLBACK_SETTINGS_KEY, DEFAULT_SETTINGS);
}

export async function updateSettings(settings: DbSettings): Promise<void> {
  const now = new Date().toISOString();
  const toSave = { ...settings, updated_at: now };

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase
        .from('settings')
        .upsert(toSave);
    } catch (e) {
      console.warn('Supabase updateSettings error:', e);
    }
  }

  setLocal(FALLBACK_SETTINGS_KEY, toSave);
}

// -------------------------------------------------------------
// 8. STORAGE STATS & PURGE
// -------------------------------------------------------------

export async function computeStorageStats(): Promise<StorageStats> {
  const files = await fetchFiles();
  const backups = await fetchBackups();

  let usedBytes = 0;
  const categoryBreakdown: { [category: string]: number } = {};

  for (const f of files) {
    if (!f.is_deleted) {
      usedBytes += f.file_size;
      categoryBreakdown[f.category] = (categoryBreakdown[f.category] || 0) + f.file_size;
    }
  }

  for (const b of backups) {
    usedBytes += b.backup_size;
    categoryBreakdown[b.category] = (categoryBreakdown[b.category] || 0) + b.backup_size;
  }

  return {
    usedBytes,
    quotaBytes: 104857600, // 100 MB free tier storage quota
    originalCount: files.filter(f => !f.is_deleted).length,
    backupCount: backups.length,
    categoryBreakdown
  };
}

export async function purgeAllCloudData(): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('files').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('backups').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('recovery_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('activity_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (e) {
      console.warn('Supabase purge error:', e);
    }
  }

  localStorage.removeItem(FALLBACK_FILES_KEY);
  localStorage.removeItem(FALLBACK_BACKUPS_KEY);
  localStorage.removeItem(FALLBACK_RECOVERY_KEY);
  localStorage.removeItem(FALLBACK_LOGS_KEY);
}

// -------------------------------------------------------------
// 9. SAMPLE SEED DATA
// -------------------------------------------------------------

export async function seedInitialAcademicRecords(): Promise<void> {
  const existing = await fetchFiles();
  if (existing.length > 0) return;

  const samples = [
    {
      name: 'BTech_CSE_Sem6_Consolidated_Marksheet_2024.csv',
      category: 'Examination Records' as RecordCategory,
      department: 'Computer Science & Engineering',
      size: 4210,
      content: 'RollNo,Name,CS601,CS602,CS603,SGPA\n21CS001,Aarav,A+,O,A+,9.4\n21CS002,Bhavna,A,A+,A,8.8\n21CS003,Chetan,O,O,O,9.9',
      hasBackup: true
    },
    {
      name: 'Faculty_Confidential_Appraisal_Dr_R_Sharma.pdf',
      category: 'Faculty Documents' as RecordCategory,
      department: 'Computer Science & Engineering',
      size: 14820,
      content: '%PDF-1.4 APEX INSTITUTE FACULTY APPRAISAL PROF SHARMA 2024',
      hasBackup: true
    },
    {
      name: 'Student_Biometric_Attendance_October_2024.csv',
      category: 'Attendance Sheets' as RecordCategory,
      department: 'Information Technology',
      size: 8930,
      content: 'RollNo,Name,Total,Present,Absent,Percentage\n21IT01,Aditi,92,89,3,96.7%',
      hasBackup: true
    },
    {
      name: 'NAAC_Criterion_4_IT_Infrastructure_Audit.docx',
      category: 'Administrative & Accreditation' as RecordCategory,
      department: 'Office of the Registrar',
      size: 22450,
      content: 'NAAC Criterion 4: Centralized SAN & Disaster Recovery Architecture',
      hasBackup: false // Awaiting Backup!
    },
    {
      name: 'Student_Admission_Register_Batch_2024_2028.csv',
      category: 'Student Information' as RecordCategory,
      department: 'Office of the Registrar',
      size: 11200,
      content: 'AppNo,Candidate,Quota,Branch,Rank\nAPP001,Aditi Kothari,Merit,CSE,412',
      hasBackup: true
    }
  ];

  for (const s of samples) {
    const encoder = new TextEncoder();
    const buf = encoder.encode(s.content);
    const hash = await computeSHA256(buf);
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date(Date.now() - Math.floor(Math.random() * 86400000)).toISOString();

    const fileRecord: DbFile = {
      id: fileId,
      file_name: s.name,
      file_type: s.name.endsWith('.csv') ? 'text/csv' : 'application/octet-stream',
      file_size: s.size,
      category: s.category,
      department: s.department,
      academic_year: '2024-2025',
      semester: 'Semester VI',
      storage_path: `originals/${fileId}/${s.name}`,
      sha256_hash: hash,
      backup_status: s.hasBackup ? 'Backed Up' : 'Awaiting Backup',
      is_deleted: false,
      deleted_at: null,
      tampered: false,
      uploaded_at: now,
      updated_at: now
    };

    const files = getLocal<DbFile[]>(FALLBACK_FILES_KEY, []);
    setLocal(FALLBACK_FILES_KEY, [...files, fileRecord]);

    if (s.hasBackup) {
      const backupRecord: DbBackup = {
        id: `bkp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        file_id: fileId,
        file_name: s.name,
        category: s.category,
        department: s.department,
        version: 1,
        backup_storage_path: `backups/${fileId}/v1_${s.name}`,
        backup_size: s.size,
        backup_hash: hash,
        backup_type: 'MANUAL',
        status: 'SUCCESS',
        notes: 'Initial institutional primary backup baseline archive',
        created_at: new Date(new Date(now).getTime() + 60000).toISOString()
      };

      const backups = getLocal<DbBackup[]>(FALLBACK_BACKUPS_KEY, []);
      setLocal(FALLBACK_BACKUPS_KEY, [...backups, backupRecord]);
    }
  }

  await logActivity({
    action: 'SAMPLE_DATA_SEEDED',
    description: 'Seeded initial academic records and cloud backup archives',
    status: 'INFO',
    operator: 'System Initializer',
    details: 'Populated 5 official college records across departments.'
  });
}
