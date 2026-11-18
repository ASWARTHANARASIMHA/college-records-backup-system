import React, { useState } from 'react';
import { 
  FlaskConical, 
  Trash2, 
  FileEdit, 
  RotateCcw, 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  Cloud,
  Database
} from 'lucide-react';
import { DbFile, DbBackup } from '../types';
import { formatBytes } from '../services/crypto';
import { NavTab } from './Header';

interface FailureSimulationProps {
  records: DbFile[];
  backups: DbBackup[];
  onSimulateDeletion: (record: DbFile) => void;
  onSimulateTamper: (fileId: string) => void;
  onRestoreRecord: (backup: DbBackup) => void;
  onVerifyIntegrity: (fileId: string) => void;
  onNavigate: (tab: NavTab) => void;
}

export const FailureSimulation: React.FC<FailureSimulationProps> = ({
  records,
  backups,
  onSimulateDeletion,
  onSimulateTamper,
  onRestoreRecord,
  onVerifyIntegrity,
  onNavigate
}) => {
  const [selectedRecordId, setSelectedRecordId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'deletion' | 'tampering' | 'recovery'>('deletion');

  const activeRecords = records.filter(r => !r.is_deleted);
  const deletedRecords = records.filter(r => r.is_deleted);
  const tamperedRecords = records.filter(r => !r.is_deleted && r.tampered);

  const selectedRecord = records.find(r => r.id === selectedRecordId) || activeRecords[0];

  const selectedRecordBackups = selectedRecord 
    ? backups.filter(b => b.file_id === selectedRecord.id)
    : [];
  const latestBackup = selectedRecordBackups[0];

  return (
    <div className="space-y-6">
      {/* Banner Card */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-college-500/30 text-college-300 text-xs font-bold uppercase tracking-wider">
            <FlaskConical className="w-3.5 h-3.5" />
            Information Storage & Management (IS&M) Case Study Lab
          </div>
          <h2 className="text-xl font-bold">Cloud Resiliency & Failure Simulation Sandbox</h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Demonstrate real-world failure scenarios including accidental file deletion from primary cloud storage, unauthorized grade-sheet tampering, and cryptographic restoration with zero data loss.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Target Record:</span>
          <select
            value={selectedRecord?.id || ''}
            onChange={e => setSelectedRecordId(e.target.value)}
            className="text-xs rounded-xl border border-slate-700 bg-slate-800 text-white px-3 py-2 focus:ring-2 focus:ring-college-500 focus:outline-none max-w-[220px] truncate"
          >
            {records.map(r => (
              <option key={r.id} value={r.id}>
                {r.file_name} {r.is_deleted ? '(Deleted)' : r.tampered ? '(Tampered)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Scenario Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('deletion')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'deletion'
              ? 'border-rose-600 text-rose-600 bg-rose-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          <span>Scenario 1: Accidental Deletion</span>
          {deletedRecords.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-700 font-bold">
              {deletedRecords.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('tampering')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'tampering'
              ? 'border-amber-600 text-amber-600 bg-amber-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileEdit className="w-4 h-4" />
          <span>Scenario 2: Unauthorized Tampering / Bit-Rot</span>
          {tamperedRecords.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-700 font-bold animate-pulse">
              {tamperedRecords.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('recovery')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'recovery'
              ? 'border-emerald-600 text-emerald-600 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Scenario 3: Instant Cloud Restoration & Verification</span>
        </button>
      </div>

      {/* Scenario 1 */}
      {activeTab === 'deletion' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-600" />
              Simulate Accidental Cloud File Deletion
            </h3>
            <p className="text-xs text-slate-500">
              Demonstrates what occurs when a human administrator accidentally removes a document from <code>college-records-originals</code>.
            </p>
          </div>

          {selectedRecord ? (
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Target Document
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 truncate">{selectedRecord.file_name}</h4>
                  <div className="text-xs text-slate-500 flex items-center gap-3">
                    <span>Category: <strong>{selectedRecord.category}</strong></span>
                    <span>Size: <strong>{formatBytes(selectedRecord.file_size)}</strong></span>
                    <span>State: <strong className={selectedRecord.is_deleted ? 'text-rose-600' : 'text-emerald-600'}>
                      {selectedRecord.is_deleted ? 'Deleted (Cloud Backup Preserved)' : 'Active in Originals'}
                    </strong></span>
                  </div>
                </div>

                <div>
                  {selectedRecord.is_deleted ? (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-rose-600" />
                      <span>Already Deleted! Head to Recovery Center to restore.</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => onSimulateDeletion(selectedRecord)}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Simulate Accidental Deletion Now</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
                <span className="font-bold text-slate-800">Two-Bucket Isolation Principle:</span>
                <p>
                  Executing this action deletes the file from <code>college-records-originals</code>. The independent bucket <code>college-records-backups</code> is untouched, and the file transitions to <strong>"Deleted – Backup Available"</strong>.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-slate-400">
              No record selected. Select an academic record above to proceed.
            </div>
          )}
        </div>
      )}

      {/* Scenario 2 */}
      {activeTab === 'tampering' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileEdit className="w-5 h-5 text-amber-600" />
              Simulate File Tampering & Cryptographic Detection
            </h3>
            <p className="text-xs text-slate-500">
              Injects altered grade marks or bit-rot bytes into the working document, demonstrating how SHA-256 Web Crypto hashing immediately catches integrity violations.
            </p>
          </div>

          {selectedRecord ? (
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Target Document
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 truncate">{selectedRecord.file_name}</h4>
                  <div className="text-xs text-slate-500 flex items-center gap-3">
                    <span>Category: <strong>{selectedRecord.category}</strong></span>
                    <span>Tampered Status: <strong className={selectedRecord.tampered ? 'text-rose-600' : 'text-slate-600'}>
                      {selectedRecord.tampered ? 'TAMPERED (Hash Invalid)' : 'Intact Baseline'}
                    </strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSimulateTamper(selectedRecord.id)}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2"
                  >
                    <FileEdit className="w-4 h-4" />
                    <span>Inject Tampered Content</span>
                  </button>

                  <button
                    onClick={() => onVerifyIntegrity(selectedRecord.id)}
                    className="px-4 py-2 bg-college-600 hover:bg-college-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Run Integrity Audit</span>
                  </button>
                </div>
              </div>

              {selectedRecord.tampered && latestBackup && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>Integrity Breach Detected! Checksums Diverged</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="p-2 bg-white rounded border border-rose-200">
                      <span className="font-bold text-rose-700 block">Tampered Working Hash:</span>
                      <span className="break-all">{selectedRecord.sha256_hash}</span>
                    </div>
                    <div className="p-2 bg-white rounded border border-emerald-200">
                      <span className="font-bold text-emerald-700 block">Authentic Backup Hash (v{latestBackup.version}):</span>
                      <span className="break-all">{latestBackup.backup_hash}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-slate-400">
              No record selected.
            </div>
          )}
        </div>
      )}

      {/* Scenario 3 */}
      {activeTab === 'recovery' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-emerald-600" />
              Simulate Instant Disaster Recovery
            </h3>
            <p className="text-xs text-slate-500">
              Reconstitute the compromised or deleted file from authentic cloud backup archives, followed by automated SHA-256 integrity verification.
            </p>
          </div>

          {selectedRecord && latestBackup ? (
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 truncate">
                    {selectedRecord.file_name}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Latest Available Backup: <strong>v{latestBackup.version}</strong> ({formatBytes(latestBackup.backup_size)})
                  </p>
                  <p className="text-[11px] font-mono text-slate-400">
                    Archive SHA-256: {latestBackup.backup_hash.substring(0, 24)}...
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onRestoreRecord(latestBackup)}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Execute Full Restoration</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-slate-400">
              No backups registered for the selected record. Create a backup first.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
