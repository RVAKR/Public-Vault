import React, { useState } from 'react';
import { 
  X, 
  HardDriveDownload, 
  Upload, 
  Printer, 
  KeyRound, 
  Clock, 
  Trash2, 
  ShieldCheck, 
  Coins, 
  AlertTriangle,
  Check,
  HardDrive,
  Info,
  FileSpreadsheet,
  Download,
  FileText,
  CreditCard,
  UserCheck,
  StickyNote,
  AlertCircle
} from 'lucide-react';
import { VaultMetadata, VaultItem } from '../types';
import { exportVaultToCSV, exportVaultToExcel } from '../services/storage';

interface BackupSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: VaultMetadata;
  items: VaultItem[];
  onExportBackup: () => void;
  onImportBackup: (file: File) => Promise<void>;
  onChangePassword: (oldPass: string, newPass: string, newHint?: string) => Promise<boolean>;
  onUpdateAutoLock: (minutes: number) => void;
  onPurgeVault: () => Promise<void>;
}

export const BackupSettingsModal: React.FC<BackupSettingsModalProps> = ({
  isOpen,
  onClose,
  metadata,
  items,
  onExportBackup,
  onImportBackup,
  onChangePassword,
  onUpdateAutoLock,
  onPurgeVault,
}) => {
  const [activeTab, setActiveTab] = useState<'backup' | 'export' | 'password' | 'general' | 'print'>('backup');

  // Export State
  const [exportScope, setExportScope] = useState<'all' | 'login' | 'card' | 'document' | 'identity' | 'note' | 'expiring'>('all');
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState('');

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [newHint, setNewHint] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [isChangingPwd, setIsChangingPwd] = useState(false);

  // Import file
  const [importError, setImportError] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Purge confirmation
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [purgeInput, setPurgeInput] = useState('');

  const getExportItems = () => {
    if (exportScope === 'all') return items;
    if (exportScope === 'expiring') {
      const now = Date.now();
      return items.filter((item) => {
        let d = item.expiresAt;
        if (!d && item.category === 'document') d = (item as any).expiryDate;
        if (!d && item.category === 'identity') d = (item as any).expiryDate;
        if (!d && item.category === 'card' && (item as any).expiryYear) {
          d = `${(item as any).expiryYear}-${(item as any).expiryMonth || '01'}-01`;
        }
        if (!d) return false;
        const diff = Math.ceil((new Date(d).getTime() - now) / (1000 * 60 * 60 * 24));
        return diff <= 30;
      });
    }
    return items.filter((i) => i.category === exportScope);
  };

  const handleExportCSV = () => {
    const targets = getExportItems();
    if (targets.length === 0) return;
    setIsExportingCSV(true);
    const prefix = exportScope === 'all' ? 'vault-all-database' : `vault-${exportScope}`;
    exportVaultToCSV(targets, prefix);
    setExportSuccessMsg(`Successfully exported ${targets.length} record(s) to CSV (.csv)!`);
    setTimeout(() => setIsExportingCSV(false), 800);
    setTimeout(() => setExportSuccessMsg(''), 4000);
  };

  const handleExportExcel = () => {
    const targets = getExportItems();
    if (targets.length === 0) return;
    setIsExportingExcel(true);
    const prefix = exportScope === 'all' ? 'vault-all-database' : `vault-${exportScope}`;
    exportVaultToExcel(targets, prefix);
    setExportSuccessMsg(`Successfully exported ${targets.length} record(s) to Excel Spreadsheet (.xls)!`);
    setTimeout(() => setIsExportingExcel(false), 800);
    setTimeout(() => setExportSuccessMsg(''), 4000);
  };

  if (!isOpen) return null;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess(false);

    if (newPassword.length < 8) {
      setPwdError('New master password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPwdError('New passwords do not match.');
      return;
    }

    setIsChangingPwd(true);
    try {
      const ok = await onChangePassword(currentPassword, newPassword, newHint.trim() || undefined);
      if (ok) {
        setPwdSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setNewHint('');
      } else {
        setPwdError('Current master password was incorrect.');
      }
    } catch (err: any) {
      setPwdError(err.message || 'Failed to change master password.');
    } finally {
      setIsChangingPwd(false);
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportError('');
    try {
      await onImportBackup(file);
      onClose();
    } catch (err: any) {
      setImportError(err.message || 'Failed to import backup file.');
    } finally {
      setIsImporting(false);
    }
  };

  const handlePrintEmergencyKit = () => {
    window.print();
  };

  return (
    <div id="backup-settings-modal" className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
          <div>
            <h3 className="text-base font-bold text-white">Vault Settings & Backups</h3>
            <p className="text-xs text-slate-400">Zero-cost client-side security management and offline portability</p>
          </div>
          <button
            id="btn-close-settings"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-4 text-xs font-medium overflow-x-auto scrollbar-none">
          {[
            { id: 'backup', label: 'Backup & Restore', icon: HardDriveDownload },
            { id: 'export', label: 'Bulk Export (CSV / Excel)', icon: FileSpreadsheet },
            { id: 'password', label: 'Change Master Password', icon: KeyRound },
            { id: 'general', label: 'Auto-Lock & Preferences', icon: Clock },
            { id: 'print', label: 'Emergency Kit', icon: Printer },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-settings-${tab.id}`}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                  isSel
                    ? 'border-cyan-400 text-cyan-300 font-semibold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Area */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          {/* 1. BACKUP & RESTORE TAB */}
          {activeTab === 'backup' && (
            <div className="space-y-5">
              {/* Quick CSV/Excel Bulk Export callout */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      Bulk Export Database (CSV or Excel)
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Need to export all {items.length} records into spreadsheets? Export your whole database or by category in standard CSV or formatted Excel formats.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      id="btn-quick-export-csv"
                      onClick={handleExportCSV}
                      disabled={items.length === 0 || isExportingCSV}
                      className="px-3 py-1.5 rounded-xl bg-emerald-700/80 hover:bg-emerald-600 active:scale-95 text-white font-medium text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isExportingCSV ? 'Exporting...' : 'All as CSV'}</span>
                    </button>
                    <button
                      id="btn-quick-export-excel"
                      onClick={handleExportExcel}
                      disabled={items.length === 0 || isExportingExcel}
                      className="px-3 py-1.5 rounded-xl bg-cyan-700/80 hover:bg-cyan-600 active:scale-95 text-white font-medium text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>{isExportingExcel ? 'Exporting...' : 'All as Excel'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Export backup */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                      <HardDriveDownload className="w-4 h-4 text-cyan-400" />
                      Export Encrypted Backup File (.vault)
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Downloads an offline JSON file encrypted with your master key. Save it to an external USB flash drive, external drive, or personal cloud for safekeeping.
                    </p>
                  </div>
                  <button
                    id="btn-export-vault-backup"
                    onClick={onExportBackup}
                    className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white font-medium text-xs flex items-center gap-1.5 transition-all shadow-md shrink-0 cursor-pointer"
                  >
                    <HardDriveDownload className="w-4 h-4" />
                    <span>Download .vault</span>
                  </button>
                </div>
              </div>

              {/* Import backup */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div>
                  <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-amber-400" />
                    Restore Vault from Backup
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Import an encrypted .vault backup file to restore your credentials, documents, and records on any device without cloud dependencies.
                  </p>
                </div>

                {importError && (
                  <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
                    {importError}
                  </div>
                )}

                <div>
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 cursor-pointer transition-colors">
                    <Upload className="w-4 h-4 text-cyan-400" />
                    <span>{isImporting ? 'Importing...' : 'Select .vault or .json File'}</span>
                    <input
                      type="file"
                      accept=".vault,.json"
                      onChange={handleFileImport}
                      disabled={isImporting}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Storage Stats */}
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 text-xs text-slate-400 space-y-2">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="font-semibold flex items-center gap-1.5">
                    <HardDrive className="w-4 h-4 text-slate-400" />
                    Local Storage Footprint
                  </span>
                  <span className="font-mono text-cyan-400">{items.length} items recorded</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  All payloads are saved as binary ciphertexts in your browser's local IndexedDB. Because there are no servers or external databases, storage is completely free with zero monthly cost.
                </p>
              </div>
            </div>
          )}

          {/* 2. BULK EXPORT (CSV / EXCEL) TAB */}
          {activeTab === 'export' && (
            <div className="space-y-5">
              {/* Status Message */}
              {exportSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-700/80 text-emerald-200 text-xs flex items-center gap-2.5 animate-fadeIn">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{exportSuccessMsg}</span>
                </div>
              )}

              {/* Scope Selection */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <h4 className="text-sm font-semibold text-slate-100 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                    Select Records to Export
                  </span>
                  <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
                    {getExportItems().length} record(s) selected
                  </span>
                </h4>
                <p className="text-xs text-slate-400">
                  Choose whether to export your entire database or a specific category:
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {[
                    { id: 'all', label: 'All Database', count: items.length, icon: HardDrive },
                    { id: 'login', label: 'Logins & Keys', count: items.filter(i => i.category === 'login').length, icon: KeyRound },
                    { id: 'card', label: 'Credit Cards', count: items.filter(i => i.category === 'card').length, icon: CreditCard },
                    { id: 'document', label: 'Documents', count: items.filter(i => i.category === 'document').length, icon: FileText },
                    { id: 'identity', label: 'Identities', count: items.filter(i => i.category === 'identity').length, icon: UserCheck },
                    { id: 'note', label: 'Notes', count: items.filter(i => i.category === 'note').length, icon: StickyNote },
                    { id: 'expiring', label: 'Expiring Soon', count: items.filter(i => {
                      let d = i.expiresAt;
                      if (!d && i.category === 'document') d = (i as any).expiryDate;
                      if (!d && i.category === 'identity') d = (i as any).expiryDate;
                      if (!d && i.category === 'card' && (i as any).expiryYear) {
                        d = `${(i as any).expiryYear}-${(i as any).expiryMonth || '01'}-01`;
                      }
                      if (!d) return false;
                      return Math.ceil((new Date(d).getTime() - Date.now()) / (1000*60*60*24)) <= 30;
                    }).length, icon: Clock },
                  ].map((scope) => {
                    const Icon = scope.icon;
                    const isSelected = exportScope === scope.id;
                    return (
                      <button
                        key={scope.id}
                        id={`btn-scope-${scope.id}`}
                        type="button"
                        onClick={() => setExportScope(scope.id as any)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-950/50 border-cyan-500/80 text-cyan-200 ring-1 ring-cyan-500/50'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`} />
                          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300">
                            {scope.count}
                          </span>
                        </div>
                        <span className="text-xs font-medium leading-tight">{scope.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Format Selection & Download Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* CSV Card */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center">
                        <Download className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-100">CSV Spreadsheet (.csv)</h4>
                        <span className="text-[10px] text-emerald-400 font-mono">RFC 4180 with UTF-8 BOM</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                      Standard text-delimited format. Fully supported by Microsoft Excel, Google Sheets, Apple Numbers, Bitwarden, 1Password, and custom Python / SQL scripts.
                    </p>
                  </div>

                  <button
                    id="btn-export-csv-action"
                    onClick={handleExportCSV}
                    disabled={getExportItems().length === 0 || isExportingCSV}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isExportingCSV ? 'Generating CSV...' : `Download CSV (${getExportItems().length} records)`}</span>
                  </button>
                </div>

                {/* Excel Card */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center">
                        <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-100">Microsoft Excel (.xls)</h4>
                        <span className="text-[10px] text-cyan-400 font-mono">Styled SpreadsheetML</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                      Native XML workbook ready for Microsoft Excel. Includes dark header row, frozen pane, customized column widths, and styled alternating grid rows.
                    </p>
                  </div>

                  <button
                    id="btn-export-excel-action"
                    onClick={handleExportExcel}
                    disabled={getExportItems().length === 0 || isExportingExcel}
                    className="w-full py-2.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:scale-[0.98] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>{isExportingExcel ? 'Generating Excel...' : `Download Excel (${getExportItems().length} records)`}</span>
                  </button>
                </div>
              </div>

              {/* Plaintext Security Notice */}
              <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-300 space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  Security Notice Regarding CSV & Excel Exports
                </div>
                <p className="text-[11px] text-amber-300/80 leading-relaxed">
                  Unlike encrypted backup files (.vault), exported CSV and Excel files contain sensitive credentials and records in plaintext. Store them in an encrypted drive (BitLocker, FileVault, or VeraCrypt) and securely delete them once your import is finished.
                </p>
              </div>
            </div>
          )}

          {/* 2. CHANGE PASSWORD TAB */}
          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <p className="text-xs text-slate-400">
                Changing your master password will re-encrypt all stored items with a freshly derived AES-GCM 256-bit key.
              </p>

              {pwdError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                  {pwdError}
                </div>
              )}

              {pwdSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>Master password successfully updated! Vault re-encrypted.</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Current Master Password
                </label>
                <input
                  id="input-change-old-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  New Master Password (min 8 chars)
                </label>
                <input
                  id="input-change-new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new strong password"
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Confirm New Master Password
                </label>
                <input
                  id="input-change-confirm-password"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  New Password Hint (Optional)
                </label>
                <input
                  id="input-change-new-hint"
                  type="text"
                  value={newHint}
                  onChange={(e) => setNewHint(e.target.value)}
                  placeholder="e.g. Favorite street and year"
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  id="btn-submit-change-password"
                  disabled={isChangingPwd}
                  className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isChangingPwd ? 'Re-encrypting Vault...' : 'Update & Re-encrypt Vault'}
                </button>
              </div>
            </form>
          )}

          {/* 3. GENERAL & AUTO-LOCK TAB */}
          {activeTab === 'general' && (
            <div className="space-y-5">
              {/* Auto-lock timer */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-cyan-400" />
                      Inactivity Auto-Lock
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Automatically locks the vault after a specified period of user inactivity to prevent unauthorized access.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
                  {[1, 5, 15, 30, 60, 0].map((mins) => {
                    const isSel = metadata.autoLockMinutes === mins;
                    return (
                      <button
                        key={mins}
                        id={`btn-autolock-${mins}`}
                        onClick={() => onUpdateAutoLock(mins)}
                        className={`py-2 px-2.5 rounded-xl border text-xs font-medium transition-all ${
                          isSel
                            ? 'bg-slate-800 border-cyan-500 text-white font-semibold'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                        }`}
                      >
                        {mins === 0 ? 'Never' : `${mins}m`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Purge Vault Section */}
              <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-900/50 space-y-3">
                <div>
                  <h4 className="text-sm font-semibold text-rose-200 flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    Purge All Vault Data
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Permanently deletes all credentials, documents, and keys from this browser's IndexedDB.
                  </p>
                </div>

                {!showPurgeConfirm ? (
                  <button
                    type="button"
                    id="btn-trigger-purge"
                    onClick={() => setShowPurgeConfirm(true)}
                    className="px-3.5 py-2 rounded-xl bg-rose-900/40 hover:bg-rose-900/70 border border-rose-800/80 text-rose-300 text-xs font-medium cursor-pointer"
                  >
                    Purge Vault...
                  </button>
                ) : (
                  <div className="space-y-3 pt-1 border-t border-rose-900/40">
                    <p className="text-xs text-rose-300">
                      Type <strong>DELETE</strong> below to confirm permanent destruction of all vault data:
                    </p>
                    <input
                      type="text"
                      id="input-purge-confirm"
                      value={purgeInput}
                      onChange={(e) => setPurgeInput(e.target.value)}
                      placeholder="Type DELETE"
                      className="w-full bg-slate-950 border border-rose-800 rounded-xl px-3 py-2 text-sm text-white font-mono"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowPurgeConfirm(false);
                          setPurgeInput('');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        id="btn-confirm-purge"
                        disabled={purgeInput !== 'DELETE'}
                        onClick={onPurgeVault}
                        className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold disabled:opacity-40 cursor-pointer"
                      >
                        Confirm Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. EMERGENCY KIT TAB (PRINTABLE) */}
          {activeTab === 'print' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <Printer className="w-4 h-4 text-cyan-400" />
                    Printable Emergency Vault Sheet
                  </h4>
                  <button
                    id="btn-print-kit"
                    onClick={handlePrintEmergencyKit}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium flex items-center gap-1.5 border border-slate-700"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Sheet</span>
                  </button>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Generate a physical paper backup sheet designed to be printed and kept in a secure home safe or safety deposit box.
                </p>
              </div>

              {/* Printable Template Preview */}
              <div className="p-6 rounded-xl bg-white text-slate-900 border border-slate-300 font-sans space-y-4 shadow-md">
                <div className="border-b-2 border-slate-900 pb-3 flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold uppercase tracking-wider">
                      Personal Vault Emergency Recovery Kit
                    </h2>
                    <p className="text-xs text-slate-600">
                      Confidential Document • Store in Physical Safe or Secure Lockbox
                    </p>
                  </div>
                  <span className="text-[10px] font-mono border border-slate-400 px-2 py-0.5 rounded">
                    Date: {new Date().toLocaleDateString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-100 rounded border border-slate-200">
                    <span className="font-semibold block mb-1">Architecture</span>
                    <p className="text-slate-600">
                      Zero-Knowledge AES-256-GCM client-side encryption. Stored locally in browser IndexedDB. Absolute $0 cost.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-100 rounded border border-slate-200">
                    <span className="font-semibold block mb-1">Password Hint Recorded</span>
                    <p className="text-slate-600 font-mono">
                      {metadata.passwordHint || 'No hint configured'}
                    </p>
                  </div>
                </div>

                <div className="border border-dashed border-slate-400 p-4 rounded text-xs space-y-2">
                  <span className="font-bold block uppercase tracking-wider text-slate-800">
                    Master Password Hand-Written Note:
                  </span>
                  <div className="h-10 border-b border-slate-300 border-dashed" />
                  <p className="text-[10px] text-slate-500 italic">
                    Write your master password or recovery passphrases above by hand after printing. Never store unencrypted passwords digitally.
                  </p>
                </div>

                <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200 flex justify-between">
                  <span>Vault Total Items: {items.length} items</span>
                  <span>Encryption Format: PBKDF2 (150,000 iter) + AES-256-GCM</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-end bg-slate-900">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
