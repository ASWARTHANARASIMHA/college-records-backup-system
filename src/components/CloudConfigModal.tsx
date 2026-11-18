import React, { useState } from 'react';
import { Cloud, Check, Copy, AlertCircle, CheckCircle2, X, Database, Globe2, Key, Server, Layers } from 'lucide-react';
import { getStoredSupabaseConfig, saveSupabaseConfig, testSupabaseConnection, clearSupabaseConfig } from '../services/supabase';
import { getAzureConfig, saveAzureConfig, testAzureConnection } from '../services/azureStorage';
import { AzureConfig } from '../types';

interface CloudConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: () => void;
}

export const CloudConfigModal: React.FC<CloudConfigModalProps> = ({ isOpen, onClose, onConfigSaved }) => {
  const [activeTab, setActiveTab] = useState<'supabase' | 'azure'>('azure');

  // Supabase state
  const currentSupabase = getStoredSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(currentSupabase.url);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(currentSupabase.key);
  const [testingSupabase, setTestingSupabase] = useState(false);
  const [supabaseResult, setSupabaseResult] = useState<{ success: boolean; message: string } | null>(null);

  // Azure state
  const currentAzure = getAzureConfig();
  const [azureConfig, setAzureConfig] = useState<AzureConfig>({ ...currentAzure });
  const [testingAzure, setTestingAzure] = useState(false);
  const [azureResult, setAzureResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null);

  const [copiedSql, setCopiedSql] = useState(false);

  if (!isOpen) return null;

  const handleTestSupabase = async () => {
    setTestingSupabase(true);
    setSupabaseResult(null);
    const res = await testSupabaseConnection(supabaseUrl, supabaseAnonKey);
    setSupabaseResult(res);
    setTestingSupabase(false);
  };

  const handleTestAzure = async () => {
    setTestingAzure(true);
    setAzureResult(null);
    const res = await testAzureConnection(azureConfig);
    setAzureResult(res);
    setTestingAzure(false);
  };

  const handleSaveAll = () => {
    saveSupabaseConfig(supabaseUrl, supabaseAnonKey);
    saveAzureConfig(azureConfig);
    onConfigSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-sky-600 to-emerald-600 rounded-xl text-white">
              <Globe2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Hybrid Multi-Cloud Services</h3>
              <p className="text-xs text-slate-300">
                Primary: Supabase Cloud &bull; Secondary Offsite Vault: Microsoft Azure Blob Storage
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cloud Selector Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 gap-3 text-xs font-bold">
          <button
            onClick={() => setActiveTab('azure')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'azure'
                ? 'border-sky-600 text-sky-700 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Globe2 className="w-4 h-4 text-sky-600" />
            <span>Microsoft Azure Blob Storage</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-sky-100 text-sky-800 font-bold">
              Offsite Vault
            </span>
          </button>

          <button
            onClick={() => setActiveTab('supabase')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'supabase'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Cloud className="w-4 h-4 text-emerald-600" />
            <span>Supabase PostgreSQL & Storage</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Azure Tab */}
          {activeTab === 'azure' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-xl text-sky-950 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-sky-900">
                  <Globe2 className="w-4 h-4 text-sky-600" />
                  <span>3-2-1 Enterprise Backup Rule Compliance</span>
                </div>
                <p className="text-[11px] text-sky-800 leading-relaxed">
                  Microsoft Azure Blob Storage acts as your offsite geo-redundant storage vault (GRS). Replicating snapshots into Azure protects against regional outages and localized database corruption.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-slate-400" />
                    Azure Storage Account Name *
                  </label>
                  <input
                    type="text"
                    value={azureConfig.accountName}
                    onChange={e => setAzureConfig({ ...azureConfig, accountName: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="collegeacadrecords"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    Azure Blob Container Name *
                  </label>
                  <input
                    type="text"
                    value={azureConfig.containerName}
                    onChange={e => setAzureConfig({ ...azureConfig, containerName: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="college-records-archive"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Azure Access Tier
                  </label>
                  <select
                    value={azureConfig.accessTier}
                    onChange={e => setAzureConfig({ ...azureConfig, accessTier: e.target.value as any })}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="Hot">Hot (Frequently Accessed Records)</option>
                    <option value="Cool">Cool (Institutional Backup Archives - Recommended)</option>
                    <option value="Archive">Archive (Permanent Degree Registries)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Azure Target Region & Redundancy
                  </label>
                  <select
                    value={azureConfig.region}
                    onChange={e => setAzureConfig({ ...azureConfig, region: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="Central India (Pune) / Geo-Redundant East US">Central India (Pune) / GRS East US</option>
                    <option value="East US 2 (Virginia) / GRS West US">East US 2 (Virginia) / GRS West US</option>
                    <option value="West Europe (Amsterdam) / GRS North Europe">West Europe (Amsterdam) / GRS North Europe</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-slate-400" />
                  Azure Shared Access Signature (SAS) Token
                </label>
                <input
                  type="password"
                  value={azureConfig.sasToken}
                  onChange={e => setAzureConfig({ ...azureConfig, sasToken: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="sp=racwdli&st=...&sig=..."
                />
              </div>

              {azureResult && (
                <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                  azureResult.success ? 'bg-sky-50 border-sky-200 text-sky-950' : 'bg-rose-50 border-rose-200 text-rose-950'
                }`}>
                  {azureResult.success ? <CheckCircle2 className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />}
                  <div>
                    <p className="font-bold">{azureResult.success ? `Azure Handshake Confirmed (${azureResult.latencyMs}ms)` : 'Connection Error'}</p>
                    <p className="text-[11px] mt-0.5">{azureResult.message}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Supabase Tab */}
          {activeTab === 'supabase' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                  <Database className="w-4 h-4 text-college-600" />
                  Two Private Storage Buckets Architecture
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600">
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                    <span className="font-bold text-slate-900 block font-mono">college-records-originals</span>
                    <span>Stores primary working academic records</span>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                    <span className="font-bold text-slate-900 block font-mono">college-records-backups</span>
                    <span>Isolated independent backup archives</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-slate-400" />
                    Supabase Project URL
                  </label>
                  <input
                    type="text"
                    placeholder="https://xyzprojectid.supabase.co"
                    value={supabaseUrl}
                    onChange={e => setSupabaseUrl(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-college-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-slate-400" />
                    Supabase Anon Public API Key
                  </label>
                  <input
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={supabaseAnonKey}
                    onChange={e => setSupabaseAnonKey(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-college-500 font-mono"
                  />
                </div>
              </div>

              {supabaseResult && (
                <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                  supabaseResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                  {supabaseResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />}
                  <div>
                    <p className="font-bold">{supabaseResult.success ? 'Connected' : 'Connection Failed'}</p>
                    <p className="text-[11px] mt-0.5">{supabaseResult.message}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div>
            {activeTab === 'azure' ? (
              <button
                type="button"
                onClick={handleTestAzure}
                disabled={testingAzure}
                className="px-3.5 py-2 text-xs font-semibold text-sky-800 bg-sky-50 border border-sky-300 rounded-lg hover:bg-sky-100 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <Globe2 className="w-3.5 h-3.5 text-sky-600" />
                <span>{testingAzure ? 'Pinging Azure Data Center...' : 'Test Azure Connection'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleTestSupabase}
                disabled={testingSupabase || !supabaseUrl}
                className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                {testingSupabase ? 'Pinging Supabase...' : 'Test Connection'}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-5 py-2 text-xs font-bold text-white bg-college-600 hover:bg-college-700 rounded-lg shadow-sm"
            >
              Save Cloud Parameters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
