export type RecordCategory =
  | 'Student Information'
  | 'Examination Records'
  | 'Attendance Sheets'
  | 'Faculty Documents'
  | 'Administrative & Accreditation';

export type BackupStatus =
  | 'Backed Up'
  | 'Awaiting Backup'
  | 'Tampered'
  | 'Deleted - Backup Available';

export interface DbFile {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  category: RecordCategory;
  department: string;
  academic_year: string;
  semester: string;
  storage_path: string;
  sha256_hash: string;
  backup_status: BackupStatus;
  is_deleted: boolean;
  deleted_at?: string | null;
  tampered?: boolean;
  uploaded_at: string;
  updated_at: string;
}

export interface DbBackup {
  id: string;
  file_id: string;
  file_name: string;
  category: RecordCategory;
  department: string;
  version: number;
  backup_storage_path: string;
  backup_size: number;
  backup_hash: string;
  backup_type: 'MANUAL' | 'AUTOMATIC';
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  notes?: string;
  created_at: string;
  // Microsoft Azure Multi-Cloud Geo-Replication metadata
  azure_synced?: boolean;
  azure_blob_path?: string;
  azure_tier?: 'Hot' | 'Cool' | 'Archive';
  azure_synced_at?: string;
}

export interface DbRecoveryLog {
  id: string;
  file_id?: string;
  backup_id?: string;
  file_name: string;
  category?: RecordCategory;
  department?: string;
  recovery_status: 'SUCCESS' | 'FAILED';
  restored_by: string;
  integrity_verified: boolean;
  details: string;
  recovered_at: string;
}

export type ActivityAction =
  | 'FILE_UPLOAD'
  | 'MANUAL_BACKUP'
  | 'AUTO_BACKUP'
  | 'FILE_DELETION'
  | 'FILE_MODIFICATION'
  | 'INTEGRITY_VERIFICATION'
  | 'FILE_RESTORATION'
  | 'AZURE_GEO_SYNC'
  | 'AZURE_CONFIG_UPDATE'
  | 'SYSTEM_SETTINGS'
  | 'SAMPLE_DATA_SEEDED'
  | 'DATA_PURGE'
  | 'AUTH_LOGIN'
  | 'AUTH_LOGOUT';

export interface DbActivityLog {
  id: string;
  action: ActivityAction;
  file_name?: string | null;
  description: string;
  status: 'SUCCESS' | 'WARNING' | 'DANGER' | 'INFO';
  operator: string;
  details?: string | null;
  created_at: string;
}

export interface DbSettings {
  id: string;
  institution_name: string;
  department_name: string;
  auto_backup_enabled: boolean;
  backup_interval: number; // in minutes: 1, 5, 15
  admin_name: string;
  updated_at?: string;
}

export interface AzureConfig {
  accountName: string;
  containerName: string;
  sasToken?: string;
  accessTier: 'Hot' | 'Cool' | 'Archive';
  region: string;
  geoReplicationEnabled: boolean;
  connected: boolean;
  lastSyncTimestamp?: string;
}

// Aliases for compatibility
export type AcademicRecord = any;
export type BackupRecord = any;
export type RecoveryRecord = any;
export type ActivityLog = any;
export type SystemSettings = any;

export interface IntegrityCheckResult {
  fileId?: string;
  recordId?: string;
  fileName: string;
  originalHash: string;
  backupHash: string;
  liveHash: string;
  isMatch: boolean;
  status: 'VERIFIED' | 'TAMPERED' | 'NO_BACKUP' | 'MISSING_ORIGINAL';
  checkedAt: string;
  details: string;
}

export interface StorageStats {
  usedBytes: number;
  quotaBytes: number;
  originalCount: number;
  backupCount: number;
  categoryBreakdown: { [category: string]: number };
  azureReplicatedBytes?: number;
}
