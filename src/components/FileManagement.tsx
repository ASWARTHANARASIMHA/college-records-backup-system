import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  UploadCloud, 
  Download, 
  Database, 
  ShieldCheck, 
  Trash2, 
  Eye, 
  CheckSquare, 
  Square, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  FolderOpen
} from 'lucide-react';
import { DbFile, DbBackup, RecordCategory } from '../types';
import { formatBytes } from '../services/crypto';

interface FileManagementProps {
  records: DbFile[];
  backups: DbBackup[];
  onOpenUpload: () => void;
  onDownloadOriginal: (file: DbFile) => void;
  onVerifyIntegrity: (fileId: string) => void;
  onViewDetails: (record: DbFile) => void;
  onCreateBackup: (fileId: string) => void;
  onBatchBackup: (recordIds: string[]) => void;
  onDeleteRecord: (record: DbFile) => void;
  isProcessing: boolean;
}

const CATEGORIES: ('All' | RecordCategory)[] = [
  'All',
  'Examination Records',
  'Student Information',
  'Attendance Sheets',
  'Faculty Documents',
  'Administrative & Accreditation'
];

export const FileManagement: React.FC<FileManagementProps> = ({
  records,
  backups,
  onOpenUpload,
  onDownloadOriginal,
  onVerifyIntegrity,
  onViewDetails,
  onCreateBackup,
  onBatchBackup,
  onDeleteRecord,
  isProcessing
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | RecordCategory>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Backed Up' | 'Awaiting Backup' | 'Tampered'>('All');
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);

  const activeRecords = useMemo(() => records.filter(r => !r.is_deleted), [records]);

  const recordsWithStatus = useMemo(() => {
    return activeRecords.map(rec => {
      const recBackups = backups.filter(b => b.file_id === rec.id);
      let status: 'Backed Up' | 'Awaiting Backup' | 'Tampered' = 'Backed Up';

      if (rec.tampered) {
        status = 'Tampered';
      } else if (recBackups.length === 0) {
        status = 'Awaiting Backup';
      } else if (recBackups[0].backup_hash !== rec.sha256_hash) {
        status = 'Awaiting Backup';
      }

      return {
        record: rec,
        status,
        latestBackup: recBackups[0],
        backupCount: recBackups.length
      };
    });
  }, [activeRecords, backups]);

  const filteredRecords = useMemo(() => {
    return recordsWithStatus.filter(item => {
      const matchesSearch = item.record.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.record.department.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'All' || item.record.category === selectedCategory;
      const matchesStatus = statusFilter === 'All' || item.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [recordsWithStatus, searchTerm, selectedCategory, statusFilter]);

  const handleSelectAll = () => {
    if (selectedRecordIds.length === filteredRecords.length) {
      setSelectedRecordIds([]);
    } else {
      setSelectedRecordIds(filteredRecords.map(f => f.record.id));
    }
  };

  const toggleSelectRecord = (id: string) => {
    setSelectedRecordIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-college-600" />
            Institutional Academic Records Vault
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage, audit, and protect official transcripts, grade sheets, faculty appraisals, and accreditation records in Supabase Storage.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {selectedRecordIds.length > 0 && (
            <button
              onClick={() => {
                onBatchBackup(selectedRecordIds);
                setSelectedRecordIds([]);
              }}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-college-700 bg-college-50 border border-college-200 rounded-xl hover:bg-college-100 transition-colors shadow-xs"
            >
              <Database className="w-3.5 h-3.5 text-college-600" />
              <span>Backup Selected ({selectedRecordIds.length})</span>
            </button>
          )}

          <button
            onClick={onOpenUpload}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-college-600 hover:bg-college-700 active:bg-college-800 rounded-xl shadow-sm transition-all"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Records</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by record name or department..."
            className="w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-college-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value as any)}
            className="text-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-college-500"
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>
                Category: {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="text-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-college-500"
          >
            <option value="All">Status: All Records</option>
            <option value="Backed Up">Status: Backed Up</option>
            <option value="Awaiting Backup">Status: Awaiting Backup</option>
            <option value="Tampered">Status: Tampered / Modified</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <FolderOpen className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Academic Records Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Upload records to store them securely in the college-records-originals bucket.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold select-none">
                  <th className="py-3 px-4 w-10">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      {selectedRecordIds.length === filteredRecords.length && filteredRecords.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-college-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-4">Document Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Cloud Size</th>
                  <th className="py-3 px-4">Upload Date</th>
                  <th className="py-3 px-4">Backup Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map(({ record, status, latestBackup, backupCount }) => {
                  const isSelected = selectedRecordIds.includes(record.id);

                  return (
                    <tr
                      key={record.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-college-50/40' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => toggleSelectRecord(record.id)}
                          className="text-slate-400 hover:text-slate-700"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-college-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5 max-w-xs">
                          <div className="p-2 bg-slate-100 rounded-lg text-slate-600 flex-shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span
                              onClick={() => onViewDetails(record)}
                              className="font-bold text-slate-900 hover:text-college-600 cursor-pointer truncate block"
                              title={record.file_name}
                            >
                              {record.file_name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              SHA: {record.sha256_hash.substring(0, 12)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {record.category}
                      </td>

                      <td className="py-3 px-4 text-slate-500 max-w-[150px] truncate" title={record.department}>
                        {record.department}
                      </td>

                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {formatBytes(record.file_size)}
                      </td>

                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(record.uploaded_at).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-4">
                        {status === 'Backed Up' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Backed Up ({backupCount})
                          </span>
                        ) : status === 'Tampered' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            Tampered
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Awaiting Backup
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onViewDetails(record)}
                            title="View Record Details & Preview"
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onDownloadOriginal(record)}
                            title="Download Original Record"
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onVerifyIntegrity(record.id)}
                            title="Verify Cryptographic SHA-256 Integrity"
                            className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          </button>

                          <button
                            onClick={() => onCreateBackup(record.id)}
                            title="Create Cloud Backup Now"
                            className="p-1.5 text-slate-400 hover:text-college-700 hover:bg-college-50 rounded-lg transition-colors"
                          >
                            <Database className="w-4 h-4 text-college-600" />
                          </button>

                          <button
                            onClick={() => onDeleteRecord(record)}
                            title="Delete Record (Preserves Backup for Recovery)"
                            className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-rose-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
