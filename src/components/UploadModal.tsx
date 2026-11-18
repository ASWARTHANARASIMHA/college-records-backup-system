import React, { useState, useRef } from 'react';
import { UploadCloud, X, File, Database } from 'lucide-react';
import { RecordCategory } from '../types';
import { formatBytes } from '../services/crypto';
import { uploadFileRecord } from '../services/cloudDataService';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

const CATEGORIES: RecordCategory[] = [
  'Examination Records',
  'Student Information',
  'Attendance Sheets',
  'Faculty Documents',
  'Administrative & Accreditation'
];

const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Information Technology',
  'Electronics & Communication',
  'Mechanical Engineering',
  'Civil Engineering',
  'Office of the Controller of Examinations',
  'Office of the Registrar',
  'Dean of Academic Affairs'
];

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUploadSuccess }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [category, setCategory] = useState<RecordCategory>('Examination Records');
  const [department, setDepartment] = useState<string>('Computer Science & Engineering');
  const [academicYear, setAcademicYear] = useState<string>('2024-2025');
  const [semester, setSemester] = useState<string>('Semester VI');
  const [autoCreateBackup, setAutoCreateBackup] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [progressText, setProgressText] = useState<string>('');
  const [dragActive, setDragActive] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files);
    setSelectedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setProgressText(`Uploading to college-records-originals (${i + 1}/${selectedFiles.length}): ${file.name}`);

        await uploadFileRecord(
          file,
          category,
          department,
          academicYear,
          semester,
          autoCreateBackup,
          'Chief Administrator'
        );
      }

      setSelectedFiles([]);
      onUploadSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to upload files:', err);
      alert('Error during file upload.');
    } finally {
      setUploading(false);
      setProgressText('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-college-600/50 rounded-xl text-college-200">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Upload to Cloud Storage</h3>
              <p className="text-xs text-slate-300">
                Deposit records into <code>college-records-originals</code> bucket
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Record Category *
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as RecordCategory)}
                className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-college-500"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Department / Authority *
              </label>
              <select
                value={department}
                onChange={e => setDepartment(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-college-500"
              >
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Academic Year
              </label>
              <select
                value={academicYear}
                onChange={e => setAcademicYear(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-college-500"
              >
                <option value="2024-2025">2024-2025</option>
                <option value="2023-2024">2023-2024</option>
                <option value="2022-2023">2022-2023</option>
                <option value="Permanent Archive">Permanent Archive</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Semester / Session
              </label>
              <select
                value={semester}
                onChange={e => setSemester(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-college-500"
              >
                <option value="Semester I">Semester I</option>
                <option value="Semester II">Semester II</option>
                <option value="Semester III">Semester III</option>
                <option value="Semester IV">Semester IV</option>
                <option value="Semester V">Semester V</option>
                <option value="Semester VI">Semester VI</option>
                <option value="Semester VII">Semester VII</option>
                <option value="Semester VIII">Semester VIII</option>
                <option value="Annual">Annual</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Record Files *
            </label>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                dragActive
                  ? 'border-college-500 bg-college-50'
                  : 'border-slate-300 hover:border-college-400 bg-slate-50/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={e => handleFiles(e.target.files)}
              />
              <UploadCloud className="w-10 h-10 text-college-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">
                Click to browse or drop academic records here
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Uploaded to Supabase Storage with automatic SHA-256 Web Crypto hashing
              </p>
            </div>
          </div>

          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>Selected Records ({selectedFiles.length})</span>
                <button
                  type="button"
                  onClick={() => setSelectedFiles([])}
                  className="text-rose-600 hover:text-rose-700 text-xs"
                >
                  Clear all
                </button>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {selectedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-slate-100 rounded-lg text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <File className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      <span className="truncate font-medium text-slate-800">{file.name}</span>
                      <span className="text-slate-400">({formatBytes(file.size)})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="text-slate-400 hover:text-rose-600 ml-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-3 bg-college-50/70 border border-college-200 rounded-xl flex items-start gap-3">
            <input
              type="checkbox"
              id="autoCreateBackup"
              checked={autoCreateBackup}
              onChange={e => setAutoCreateBackup(e.target.checked)}
              className="mt-0.5 rounded text-college-600 focus:ring-college-500 h-4 w-4"
            />
            <label htmlFor="autoCreateBackup" className="text-xs text-college-900 cursor-pointer">
              <span className="font-bold flex items-center gap-1">
                <Database className="w-3.5 h-3.5 text-college-600" />
                Immediately generate baseline copy in college-records-backups
              </span>
              <span className="block text-slate-600 mt-0.5 text-[11px]">
                Creates an independent snapshot in the secondary cloud bucket upon deposit.
              </span>
            </label>
          </div>

          {uploading && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <span>{progressText}</span>
            </div>
          )}
        </form>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={uploading || selectedFiles.length === 0}
            className="px-5 py-2 text-xs font-bold text-white bg-college-600 hover:bg-college-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
