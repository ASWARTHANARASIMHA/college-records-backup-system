import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Info,
  Calendar,
  User,
  FileText
} from 'lucide-react';
import { DbActivityLog, ActivityAction } from '../types';

interface ActivityLogsProps {
  logs: DbActivityLog[];
  onClearLogs: () => void;
}

export const ActivityLogs: React.FC<ActivityLogsProps> = ({ logs, onClearLogs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<'ALL' | ActivityAction>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'WARNING' | 'DANGER' | 'INFO'>('ALL');

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.file_name && log.file_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase())) ||
      log.operator.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
    const matchesStatus = statusFilter === 'ALL' || log.status === statusFilter;

    return matchesSearch && matchesAction && matchesStatus;
  });

  const handleExportCSV = () => {
    if (logs.length === 0) return;

    const headers = ['LogID', 'Timestamp', 'Action', 'Status', 'FileName', 'Description', 'Details', 'Operator'];
    const rows = filteredLogs.map(log => [
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
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `College_Records_Audit_Trail_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Summary */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-college-600" />
            Institutional Audit Trail & Activity Logs
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Tamper-evident activity ledger stored in PostgreSQL recording cryptographic verification, cloud backups, deletions, and disaster recovery events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-xs transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={onClearLogs}
            disabled={logs.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-xl transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>Clear Logs</span>
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
            placeholder="Search audit trail by description, record name, or operator..."
            className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-college-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value as any)}
            className="text-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-college-500"
          >
            <option value="ALL">Action: All Activities</option>
            <option value="FILE_UPLOAD">Action: File Upload</option>
            <option value="MANUAL_BACKUP">Action: Manual Backup</option>
            <option value="AUTO_BACKUP">Action: Auto Backup</option>
            <option value="FILE_DELETION">Action: File Deletion</option>
            <option value="FILE_MODIFICATION">Action: File Modification</option>
            <option value="INTEGRITY_VERIFICATION">Action: Integrity Verification</option>
            <option value="FILE_RESTORATION">Action: File Restoration</option>
            <option value="SAMPLE_DATA_SEEDED">Action: Sample Data Seeded</option>
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="text-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-college-500"
          >
            <option value="ALL">Status: All Statuses</option>
            <option value="SUCCESS">Status: Success</option>
            <option value="WARNING">Status: Warning</option>
            <option value="DANGER">Status: Danger / Breach</option>
            <option value="INFO">Status: Info</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No audit log entries matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Activity Description</th>
                  <th className="py-3 px-4">Action Type</th>
                  <th className="py-3 px-4">Target Document</th>
                  <th className="py-3 px-4">Technical Details</th>
                  <th className="py-3 px-4">Operator</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map(log => {
                  const statusStyles = {
                    SUCCESS: 'bg-emerald-100 text-emerald-800',
                    WARNING: 'bg-amber-100 text-amber-800',
                    DANGER: 'bg-rose-100 text-rose-800',
                    INFO: 'bg-blue-100 text-blue-800',
                  };

                  const statusIcons = {
                    SUCCESS: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
                    WARNING: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
                    DANGER: <AlertCircle className="w-3.5 h-3.5 text-rose-600" />,
                    INFO: <Info className="w-3.5 h-3.5 text-blue-600" />,
                  };

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-900 max-w-xs">
                        {log.description}
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                          {log.action}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-600 max-w-[150px] truncate">
                        {log.file_name ? (
                          <span className="flex items-center gap-1" title={log.file_name}>
                            <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{log.file_name}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">System Wide</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px] max-w-sm truncate" title={log.details || ''}>
                        {log.details || '-'}
                      </td>

                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{log.operator}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${statusStyles[log.status]}`}>
                          {statusIcons[log.status]}
                          <span>{log.status}</span>
                        </span>
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
