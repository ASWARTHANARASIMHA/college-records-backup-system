import { AcademicRecord, BackupRecord, RecoveryRecord, ActivityLog, SystemSettings, StorageStats } from '../types';

const DB_NAME = 'CollegeRecordsBackupDB';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

export async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Object store for original academic records
      if (!db.objectStoreNames.contains('records')) {
        const recordStore = db.createObjectStore('records', { keyPath: 'id' });
        recordStore.createIndex('name', 'name', { unique: false });
        recordStore.createIndex('category', 'category', { unique: false });
        recordStore.createIndex('isDeleted', 'isDeleted', { unique: false });
        recordStore.createIndex('sha256', 'sha256', { unique: false });
      }

      // Object store for backup archives (stored independently from original records)
      if (!db.objectStoreNames.contains('backups')) {
        const backupStore = db.createObjectStore('backups', { keyPath: 'id' });
        backupStore.createIndex('recordId', 'recordId', { unique: false });
        backupStore.createIndex('fileName', 'fileName', { unique: false });
        backupStore.createIndex('timestamp', 'timestamp', { unique: false });
        backupStore.createIndex('sha256', 'sha256', { unique: false });
      }

      // Object store for recovery history
      if (!db.objectStoreNames.contains('recovery')) {
        const recoveryStore = db.createObjectStore('recovery', { keyPath: 'id' });
        recoveryStore.createIndex('recordId', 'recordId', { unique: false });
        recoveryStore.createIndex('restoredAt', 'restoredAt', { unique: false });
      }

      // Object store for activity audit logs
      if (!db.objectStoreNames.contains('logs')) {
        const logStore = db.createObjectStore('logs', { keyPath: 'id' });
        logStore.createIndex('timestamp', 'timestamp', { unique: false });
        logStore.createIndex('action', 'action', { unique: false });
        logStore.createIndex('status', 'status', { unique: false });
      }

      // Object store for system settings
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// ----------------- Records Management -----------------

export async function getAllRecords(includeDeleted = false): Promise<AcademicRecord[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('records', 'readonly');
    const store = tx.objectStore('records');
    const request = store.getAll();

    request.onsuccess = () => {
      const records = request.result as AcademicRecord[];
      if (includeDeleted) {
        resolve(records);
      } else {
        resolve(records.filter(r => !r.isDeleted));
      }
    };

    request.onerror = () => reject(request.error);
  });
}

export async function getRecordById(id: string): Promise<AcademicRecord | undefined> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('records', 'readonly');
    const store = tx.objectStore('records');
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveRecord(record: AcademicRecord): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('records', 'readwrite');
    const store = tx.objectStore('records');
    const request = store.put(record);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Accidental/intentional deletion of original file.
 * The original record is marked isDeleted = true and its original blob is removed/archived,
 * while all backups in the 'backups' store remain strictly intact!
 */
export async function markRecordAsDeleted(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('records', 'readwrite');
    const store = tx.objectStore('records');
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const record = getReq.result as AcademicRecord;
      if (record) {
        record.isDeleted = true;
        record.deletedAt = new Date().toISOString();
        // Clear original content to simulate data loss on original storage
        record.content = new Blob([], { type: record.type });
        store.put(record);
      }
      resolve();
    };

    getReq.onerror = () => reject(getReq.error);
  });
}

export async function permanentlyDeleteRecord(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('records', 'readwrite');
    const store = tx.objectStore('records');
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ----------------- Backup Management -----------------

export async function getAllBackups(): Promise<BackupRecord[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('backups', 'readonly');
    const store = tx.objectStore('backups');
    const request = store.getAll();

    request.onsuccess = () => {
      const results = (request.result as BackupRecord[]).sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      resolve(results);
    };

    request.onerror = () => reject(request.error);
  });
}

export async function getBackupsForRecord(recordId: string): Promise<BackupRecord[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('backups', 'readonly');
    const store = tx.objectStore('backups');
    const index = store.index('recordId');
    const request = index.getAll(recordId);

    request.onsuccess = () => {
      const results = (request.result as BackupRecord[]).sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      resolve(results);
    };

    request.onerror = () => reject(request.error);
  });
}

export async function saveBackup(backup: BackupRecord): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('backups', 'readwrite');
    const store = tx.objectStore('backups');
    const request = store.put(backup);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteBackup(backupId: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('backups', 'readwrite');
    const store = tx.objectStore('backups');
    const request = store.delete(backupId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ----------------- Recovery Management -----------------

export async function getAllRecoveryRecords(): Promise<RecoveryRecord[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('recovery', 'readonly');
    const store = tx.objectStore('recovery');
    const request = store.getAll();

    request.onsuccess = () => {
      const results = (request.result as RecoveryRecord[]).sort((a, b) => 
        new Date(b.restoredAt).getTime() - new Date(a.restoredAt).getTime()
      );
      resolve(results);
    };

    request.onerror = () => reject(request.error);
  });
}

export async function saveRecoveryRecord(rec: RecoveryRecord): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('recovery', 'readwrite');
    const store = tx.objectStore('recovery');
    const request = store.put(rec);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ----------------- Activity Audit Logs -----------------

export async function getAllLogs(): Promise<ActivityLog[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('logs', 'readonly');
    const store = tx.objectStore('logs');
    const request = store.getAll();

    request.onsuccess = () => {
      const logs = (request.result as ActivityLog[]).sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      resolve(logs);
    };

    request.onerror = () => reject(request.error);
  });
}

export async function addLog(logData: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<ActivityLog> {
  const db = await getDB();
  const log: ActivityLog = {
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    timestamp: new Date().toISOString(),
    ...logData
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction('logs', 'readwrite');
    const store = tx.objectStore('logs');
    const request = store.put(log);

    request.onsuccess = () => resolve(log);
    request.onerror = () => reject(request.error);
  });
}

export async function clearLogs(): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('logs', 'readwrite');
    const store = tx.objectStore('logs');
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ----------------- Settings & System Profile -----------------

const DEFAULT_SETTINGS: SystemSettings = {
  institutionName: 'Apex Institute of Engineering & Technology',
  departmentName: 'Office of the Controller of Examinations & Academic Records',
  autoBackupEnabled: true,
  autoBackupIntervalMinutes: 5,
  notifyOnAutoBackup: true,
  adminName: 'Chief Records Registrar'
};

export async function getSettings(): Promise<SystemSettings> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readonly');
    const store = tx.objectStore('settings');
    const request = store.get('system_config');

    request.onsuccess = () => {
      if (request.result && request.result.value) {
        resolve(request.result.value as SystemSettings);
      } else {
        // save default
        saveSettings(DEFAULT_SETTINGS).then(() => resolve(DEFAULT_SETTINGS));
      }
    };

    request.onerror = () => reject(request.error);
  });
}

export async function saveSettings(settings: SystemSettings): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    const request = store.put({ key: 'system_config', value: settings });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ----------------- Storage Usage & Diagnostics -----------------

export async function getStorageStats(): Promise<StorageStats> {
  const allRecords = await getAllRecords(true);
  const allBackups = await getAllBackups();

  let usedBytes = 0;
  const categoryBreakdown: { [category: string]: number } = {};

  for (const r of allRecords) {
    if (!r.isDeleted) {
      usedBytes += r.size;
      categoryBreakdown[r.category] = (categoryBreakdown[r.category] || 0) + r.size;
    }
  }

  for (const b of allBackups) {
    usedBytes += b.size;
    categoryBreakdown[b.category] = (categoryBreakdown[b.category] || 0) + b.size;
  }

  // Estimate browser quota if available
  let quotaBytes = 1024 * 1024 * 1024; // 1GB fallback
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      if (estimate.quota) quotaBytes = estimate.quota;
    } catch {
      // ignore
    }
  }

  return {
    usedBytes,
    quotaBytes,
    originalCount: allRecords.filter(r => !r.isDeleted).length,
    backupCount: allBackups.length,
    categoryBreakdown
  };
}

// ----------------- Purge / Reset -----------------

export async function purgeAllData(): Promise<void> {
  const db = await getDB();
  const storeNames = ['records', 'backups', 'recovery', 'logs'];
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, 'readwrite');
    for (const name of storeNames) {
      tx.objectStore(name).clear();
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
