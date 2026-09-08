import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Database, 
  Download, 
  Upload, 
  ShieldCheck, 
  Clock, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  Trash2, 
  HardDrive, 
  RefreshCw, 
  Layers, 
  Sparkles, 
  Check, 
  FileJson, 
  ShieldAlert,
  ArrowRight,
  Sliders,
  History,
  Archive,
  Save
} from 'lucide-react';
import { CloudSyncStatusBadge } from '../common/CloudSyncStatusBadge';
import { 
  formatBytes, 
  validateSystemSnapshotFile,
  getSnapshotPayloadById
} from '../../utils/snapshotManager';
import { SystemSnapshotMetadata, SystemSnapshotPayload, SystemSnapshotTrigger } from '../../types';

export const SnapshotRestoreSettingsTab: React.FC = () => {
  const { 
    invoices, 
    products, 
    parties, 
    purchaseBills, 
    payments, 
    expenses, 
    accountHeads, 
    journalEntries, 
    cheques, 
    companies,
    autoSnapshotConfig,
    updateAutoSnapshotConfig,
    vaultSnapshots,
    refreshVaultSnapshots,
    createSystemSnapshot,
    restoreSystemSnapshot,
    deleteVaultSnapshot,
    clearAllVaultSnapshots,
    exportVaultSnapshotById,
    exportCurrentDatabaseSnapshot,
    showToast
  } = useApp();

  const [isTakingSnapshot, setIsTakingSnapshot] = useState(false);
  const [snapshotLabel, setSnapshotLabel] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  
  // File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: number;
    rawText: string;
    payload: SystemSnapshotPayload | null;
    metadata: SystemSnapshotMetadata | null;
  } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Restore Confirmation Modal State
  const [restoreCandidate, setRestoreCandidate] = useState<{
    source: 'FILE' | 'VAULT';
    snapshotId?: string;
    payload?: SystemSnapshotPayload;
    metadata: SystemSnapshotMetadata;
  } | null>(null);

  // Clear Vault Confirm
  const [showClearVaultConfirm, setShowClearVaultConfirm] = useState(false);

  // Quick stats
  const totalRecordCount = 
    invoices.length + 
    products.length + 
    parties.length + 
    purchaseBills.length + 
    payments.length + 
    expenses.length + 
    journalEntries.length + 
    (cheques?.length || 0);

  // Handle Instant Snapshot creation
  const handleTakeInstantSnapshot = async (downloadFile = false) => {
    try {
      setIsTakingSnapshot(true);
      await createSystemSnapshot(
        'MANUAL_EXPORT', 
        snapshotLabel.trim() || `System Snapshot (${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })})`,
        downloadFile
      );
      setSnapshotLabel('');
      showToast('success', 'Snapshot Captured', downloadFile ? 'Snapshot archived to vault and downloaded.' : 'System state saved to local vault.');
    } catch (e: any) {
      showToast('error', 'Snapshot Error', e?.message || 'Failed to capture snapshot');
    } finally {
      setIsTakingSnapshot(false);
    }
  };

  // Handle File Input Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setFileError('Please select a valid .json snapshot file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const validation = validateSystemSnapshotFile(parsed);
        
        if (!validation.isValid || !validation.payload || !validation.metadata) {
          setFileError(validation.error || 'The file format does not match a valid Zooka Business system backup.');
          setUploadedFile(null);
          return;
        }

        setUploadedFile({
          name: file.name,
          size: file.size,
          rawText: text,
          payload: validation.payload,
          metadata: validation.metadata
        });
      } catch (err: any) {
        setFileError('Invalid JSON structure. The file could not be parsed.');
        setUploadedFile(null);
      }
    };
    reader.readAsText(file);
  };

  // Trigger restore flow for uploaded file
  const handleInitiateFileRestore = () => {
    if (!uploadedFile || !uploadedFile.payload || !uploadedFile.metadata) return;
    setRestoreCandidate({
      source: 'FILE',
      payload: uploadedFile.payload,
      metadata: uploadedFile.metadata
    });
  };

  // Trigger restore flow from Vault snapshot
  const handleInitiateVaultRestore = async (meta: SystemSnapshotMetadata) => {
    const fullPayload = await getSnapshotPayloadById(meta.id);
    if (!fullPayload) {
      showToast('error', 'Snapshot Unavailable', 'Could not retrieve the full snapshot content from vault.');
      return;
    }
    setRestoreCandidate({
      source: 'VAULT',
      snapshotId: meta.id,
      payload: fullPayload,
      metadata: meta
    });
  };

  // Execute Restore Action
  const handleConfirmRestore = async () => {
    if (!restoreCandidate || !restoreCandidate.payload) return;
    try {
      setIsRestoring(true);
      await restoreSystemSnapshot(
        restoreCandidate.payload, 
        autoSnapshotConfig.createSafetyPointOnRestore
      );
      setRestoreCandidate(null);
      setUploadedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e: any) {
      showToast('error', 'Restore Failed', e?.message || 'Failed to apply restore.');
    } finally {
      setIsRestoring(false);
    }
  };

  const getTriggerBadge = (trigger: SystemSnapshotTrigger) => {
    switch (trigger) {
      case 'SCHEDULED_AUTO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <Clock className="w-3 h-3" /> Auto Scheduled
          </span>
        );
      case 'PRE_RESTORE_RECOVERY':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <ShieldCheck className="w-3 h-3" /> Pre-Restore Safety Point
          </span>
        );
      case 'PRE_IMPORT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
            <Upload className="w-3 h-3" /> Pre-Import Checkpoint
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
            <Archive className="w-3 h-3" /> Manual Snapshot
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Cloud & System Health Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Automated Snapshots, System Restore & Cloud Storage
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Automatic background snapshot engine, scheduled backups, point-in-time recovery, and verified system restoration.
            </p>
          </div>
          <CloudSyncStatusBadge />
        </div>

        {/* Live System Records Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Live Records</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              {totalRecordCount.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              {invoices.length} inv · {products.length} items · {parties.length} parties
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Vault Snapshots</div>
            <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
              {vaultSnapshots.length}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              Max capacity: {autoSnapshotConfig.maxVaultSnapshots} points
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Auto Backup Frequency</div>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {autoSnapshotConfig.enabled ? `Every ${autoSnapshotConfig.intervalHours}h` : 'Disabled'}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              {autoSnapshotConfig.enabled ? 'Background runner active' : 'Turn on below'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Last Snapshot</div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 truncate">
              {autoSnapshotConfig.lastSnapshotTimestamp 
                ? new Date(autoSnapshotConfig.lastSnapshotTimestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })
                : vaultSnapshots[0] 
                  ? new Date(vaultSnapshots[0].timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })
                  : 'None yet'}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              {autoSnapshotConfig.nextScheduledSnapshotTimestamp 
                ? `Next: ${new Date(autoSnapshotConfig.nextScheduledSnapshotTimestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
                : 'Ready on demand'}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: Automatic Snapshot Scheduling Engine */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
              Automated Background Snapshot Scheduler
            </h4>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={autoSnapshotConfig.enabled}
              onChange={(e) => updateAutoSnapshotConfig({ enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
            <span className="ml-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              {autoSnapshotConfig.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {/* Interval Selector */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Snapshot Interval
            </label>
            <select
              value={autoSnapshotConfig.intervalHours}
              disabled={!autoSnapshotConfig.enabled}
              onChange={(e) => updateAutoSnapshotConfig({ intervalHours: Number(e.target.value) as any })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 disabled:opacity-50"
            >
              <option value={1}>Every 1 Hour (High Frequency)</option>
              <option value={4}>Every 4 Hours</option>
              <option value={12}>Every 12 Hours (Twice Daily)</option>
              <option value={24}>Every 24 Hours (Daily Standard)</option>
            </select>
            <p className="text-[10px] text-slate-400">
              Automatically creates a full system restore point on schedule.
            </p>
          </div>

          {/* Retention Limit */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Vault Retention Limit
            </label>
            <select
              value={autoSnapshotConfig.maxVaultSnapshots}
              disabled={!autoSnapshotConfig.enabled}
              onChange={(e) => updateAutoSnapshotConfig({ maxVaultSnapshots: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 disabled:opacity-50"
            >
              <option value={5}>Keep last 5 snapshots</option>
              <option value={10}>Keep last 10 snapshots (Recommended)</option>
              <option value={20}>Keep last 20 snapshots</option>
            </select>
            <p className="text-[10px] text-slate-400">
              Older scheduled snapshots are pruned automatically.
            </p>
          </div>

          {/* Safety Point on Restore */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Pre-Restore Safety Checkpoint
            </label>
            <div className="pt-1.5 flex items-center gap-2">
              <input
                type="checkbox"
                id="safetyCheckpoint"
                checked={autoSnapshotConfig.createSafetyPointOnRestore}
                onChange={(e) => updateAutoSnapshotConfig({ createSafetyPointOnRestore: e.target.checked })}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              <label htmlFor="safetyCheckpoint" className="text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                Always create recovery point before restore
              </label>
            </div>
            <p className="text-[10px] text-slate-400">
              Prevents accidental data loss by taking a rollback point before any restore.
            </p>
          </div>
        </div>

        {/* Auto-download JSON toggle */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Auto-Download JSON Snapshot File
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              When enabled, also triggers an automatic browser JSON file download to your local Downloads folder on schedule.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={autoSnapshotConfig.autoDownloadJson}
              onChange={(e) => updateAutoSnapshotConfig({ autoDownloadJson: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
          </label>
        </div>
      </div>

      {/* SECTION 2: Instant Snapshot & Manual Export */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Instant Vault Snapshot Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white mb-1.5">
              <Archive className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Capture Instant System Snapshot
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Saves a point-in-time freeze of your entire system state into the secure local vault.
            </p>
            <div className="mt-3">
              <input
                type="text"
                placeholder="Optional label (e.g., Pre-Audit 2026, Before Monthly GST)"
                value={snapshotLabel}
                onChange={(e) => setSnapshotLabel(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => handleTakeInstantSnapshot(false)}
              disabled={isTakingSnapshot}
              className="flex-1 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isTakingSnapshot ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Archive className="w-3.5 h-3.5" />
              )}
              <span>Take Snapshot to Vault</span>
            </button>
            <button
              type="button"
              onClick={() => handleTakeInstantSnapshot(true)}
              disabled={isTakingSnapshot}
              title="Save to vault and download JSON file"
              className="px-3.5 py-2.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 rounded-xl border border-indigo-200 dark:border-indigo-800/60 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>+ Download</span>
            </button>
          </div>
        </div>

        {/* Direct Full JSON Export Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white mb-1.5">
              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Export Full System Backup (.JSON)
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Download a complete, offline-ready JSON backup containing all multi-company data, transactional records, authorized digital signatures, and accounting journals.
            </p>
            <div className="mt-3 p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 text-[11px] text-emerald-800 dark:text-emerald-300">
              ✓ Compatible with external backups, USB cold storage, and offline archiving.
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => exportCurrentDatabaseSnapshot()}
              className="w-full px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Full Backup JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 3: System Restore Engine (From File) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
              System Restore from External Backup File
            </h4>
          </div>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Validated JSON Schemas Only
          </span>
        </div>

        {/* Upload Drop Zone */}
        <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors bg-slate-50/50 dark:bg-slate-800/30">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
            id="snapshot-file-upload"
          />
          <label 
            htmlFor="snapshot-file-upload"
            className="cursor-pointer flex flex-col items-center justify-center space-y-2"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FileJson className="w-6 h-6" />
            </div>
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Click or drag to choose a <span className="text-indigo-600 dark:text-indigo-400">Zooka Business Backup (.JSON)</span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              The file will undergo pre-flight schema analysis before restoring.
            </p>
          </label>
        </div>

        {fileError && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{fileError}</span>
          </div>
        )}

        {/* Pre-flight inspection card */}
        {uploadedFile && uploadedFile.metadata && (
          <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-indigo-100 dark:border-indigo-900/60">
              <div>
                <div className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Validated Backup File: <span className="font-mono">{uploadedFile.name}</span>
                </div>
                <div className="text-[11px] text-indigo-700 dark:text-indigo-400 mt-0.5">
                  Exported on {new Date(uploadedFile.metadata.timestamp).toLocaleString()} · Size: {formatBytes(uploadedFile.size)} · Checksum: <span className="font-mono">{uploadedFile.metadata.fileChecksum}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleInitiateFileRestore}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow cursor-pointer flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Initiate System Restore</span>
              </button>
            </div>

            {/* Inspection Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-indigo-100 dark:border-indigo-900/40">
                <div className="text-[10px] text-slate-500">Invoices</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {uploadedFile.metadata.invoicesCount}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-indigo-100 dark:border-indigo-900/40">
                <div className="text-[10px] text-slate-500">Products & Inventory</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {uploadedFile.metadata.productsCount}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-indigo-100 dark:border-indigo-900/40">
                <div className="text-[10px] text-slate-500">Customers & Parties</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {uploadedFile.metadata.partiesCount}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-indigo-100 dark:border-indigo-900/40">
                <div className="text-[10px] text-slate-500">Payments & Bills</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {uploadedFile.metadata.paymentsCount + uploadedFile.metadata.purchaseBillsCount}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 4: Snapshot Vault History & Point-in-Time Rollback */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
              Snapshot Vault & Rollback Archive ({vaultSnapshots.length})
            </h4>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refreshVaultSnapshots}
              className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Refresh vault list"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            {vaultSnapshots.length > 0 && (
              <button
                type="button"
                onClick={() => setShowClearVaultConfirm(true)}
                className="text-[11px] font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline px-2 py-1"
              >
                Clear History
              </button>
            )}
          </div>
        </div>

        {vaultSnapshots.length === 0 ? (
          <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
            <Archive className="w-8 h-8 mx-auto mb-2 opacity-40" />
            No snapshots in local vault yet. Snapshots will appear here as auto-backups run or when you capture manual snapshots.
          </div>
        ) : (
          <div className="space-y-2.5">
            {vaultSnapshots.map((snap) => (
              <div 
                key={snap.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                      {snap.label}
                    </span>
                    {getTriggerBadge(snap.triggerType)}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-3 flex-wrap">
                    <span>
                      📅 {new Date(snap.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span>
                      📦 {snap.invoicesCount} invoices · {snap.productsCount} items · {snap.partiesCount} parties
                    </span>
                    <span>
                      💾 {formatBytes(snap.sizeBytes)}
                    </span>
                    {snap.fileChecksum && (
                      <span className="font-mono text-[10px] text-slate-400">
                        [{snap.fileChecksum}]
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => handleInitiateVaultRestore(snap)}
                    className="px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-white hover:bg-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl border border-indigo-200 dark:border-indigo-800/60 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restore System</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => exportVaultSnapshotById(snap.id)}
                    title="Download this snapshot as JSON"
                    className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteVaultSnapshot(snap.id)}
                    title="Delete snapshot from vault"
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CONFIRMATION MODAL: SYSTEM RESTORE */}
      {restoreCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/80 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Confirm Full System Restore
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Restore all database records to this snapshot state.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
              <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span>Target Snapshot:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {restoreCandidate.metadata.label}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Created: {new Date(restoreCandidate.metadata.timestamp).toLocaleString()}
              </div>

              {/* Comparison table */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <div className="font-semibold text-slate-700 dark:text-slate-300">Incoming Records:</div>
                  <ul className="text-slate-500 mt-1 space-y-0.5">
                    <li>• Invoices: {restoreCandidate.metadata.invoicesCount}</li>
                    <li>• Products: {restoreCandidate.metadata.productsCount}</li>
                    <li>• Parties: {restoreCandidate.metadata.partiesCount}</li>
                    <li>• Payments: {restoreCandidate.metadata.paymentsCount}</li>
                  </ul>
                </div>
                <div>
                  <div className="font-semibold text-slate-700 dark:text-slate-300">Current Live State:</div>
                  <ul className="text-slate-500 mt-1 space-y-0.5">
                    <li>• Invoices: {invoices.length}</li>
                    <li>• Products: {products.length}</li>
                    <li>• Parties: {parties.length}</li>
                    <li>• Payments: {payments.length}</li>
                  </ul>
                </div>
              </div>
            </div>

            {autoSnapshotConfig.createSafetyPointOnRestore && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>A Pre-Restore Recovery Point will be automatically captured in your vault before applying this restore.</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRestoreCandidate(null)}
                disabled={isRestoring}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={isRestoring}
                className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isRestoring ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                <span>Execute System Restore</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: CLEAR VAULT */}
      {showClearVaultConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Clear Snapshot Vault History?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              This will remove all point-in-time snapshot archives from this browser's local vault. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearVaultConfirm(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await clearAllVaultSnapshots();
                  setShowClearVaultConfirm(false);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl"
              >
                Clear History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
