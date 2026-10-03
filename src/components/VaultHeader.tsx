import React, { useState, useRef, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Plus, 
  Lock, 
  Key, 
  FileText, 
  CreditCard, 
  UserCheck, 
  StickyNote, 
  Settings, 
  ShieldAlert, 
  Sparkles,
  ChevronDown,
  X,
  Terminal,
  FolderArchive,
  User as UserIcon,
  Cloud
} from 'lucide-react';
import { VaultCategory } from '../types';

interface VaultHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAddNew: (category: VaultCategory) => void;
  onOpenGenerator: () => void;
  onOpenAudit: () => void;
  onOpenPythonTerminal: () => void;
  onOpenArchive: () => void;
  onOpenSettings: () => void;
  onLockVault: () => void;
  healthScore: number;
  autoLockSecondsRemaining: number;
  userEmail?: string | null;
}

export const VaultHeader: React.FC<VaultHeaderProps> = ({
  searchQuery,
  onSearchChange,
  onAddNew,
  onOpenGenerator,
  onOpenAudit,
  onOpenPythonTerminal,
  onOpenArchive,
  onOpenSettings,
  onLockVault,
  healthScore,
  autoLockSecondsRemaining,
  userEmail,
}) => {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowAddMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatAutoLockTime = (secs: number) => {
    if (secs <= 0) return '0s';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <header id="vault-header" className="h-16 bg-slate-900/90 border-b border-slate-800/90 px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-30 backdrop-blur-md">
      {/* Brand title */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500/30 to-emerald-500/30 border border-slate-700 flex items-center justify-center text-cyan-400 shadow-sm">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm sm:text-base tracking-tight">Personal Vault</span>
            {userEmail ? (
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-cyan-950/60 border border-cyan-800/60 text-cyan-300">
                <Cloud className="w-3 h-3 text-cyan-400" />
                {userEmail}
              </span>
            ) : (
              <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
                GCP Firebase Free Tier
              </span>
            )}
          </div>
          <span className="hidden sm:block text-[11px] text-slate-400 leading-none">AES-256-GCM • Lifetime Cloud & Offline</span>
        </div>
      </div>

      {/* Central Search bar */}
      <div className="flex-1 max-w-md mx-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="input-vault-search"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search credentials, documents, notes, cards..."
            className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl pl-9 pr-8 py-1.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
          />
          {searchQuery && (
            <button
              id="btn-clear-search"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Action controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* New Item Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            id="btn-new-item-dropdown"
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="h-9 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white text-xs sm:text-sm font-medium flex items-center gap-1.5 shadow-md shadow-cyan-900/20 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Item</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-80" />
          </button>

          {showAddMenu && (
            <div className="absolute right-0 mt-2 w-52 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1.5 z-40 animate-in fade-in zoom-in-95">
              <button
                id="btn-add-login"
                onClick={() => { onAddNew('login'); setShowAddMenu(false); }}
                className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-200 hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
              >
                <Key className="w-4 h-4 text-cyan-400" />
                <span>Login & Password</span>
              </button>
              <button
                id="btn-add-document"
                onClick={() => { onAddNew('document'); setShowAddMenu(false); }}
                className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-200 hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
              >
                <FileText className="w-4 h-4 text-amber-400" />
                <span>Document & File Scan</span>
              </button>
              <button
                id="btn-add-identity"
                onClick={() => { onAddNew('identity'); setShowAddMenu(false); }}
                className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-200 hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
              >
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>Identity & Passport ID</span>
              </button>
              <button
                id="btn-add-card"
                onClick={() => { onAddNew('card'); setShowAddMenu(false); }}
                className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-200 hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
              >
                <CreditCard className="w-4 h-4 text-purple-400" />
                <span>Payment Card</span>
              </button>
              <button
                id="btn-add-note"
                onClick={() => { onAddNew('note'); setShowAddMenu(false); }}
                className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-200 hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
              >
                <StickyNote className="w-4 h-4 text-sky-400" />
                <span>Secure Note / Seed</span>
              </button>
            </div>
          )}
        </div>

        {/* Password Generator tool button */}
        <button
          id="btn-open-generator"
          onClick={onOpenGenerator}
          title="Password Generator"
          className="h-9 px-2.5 sm:px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline">Generator</span>
        </button>

        {/* Security Audit button with health score */}
        <button
          id="btn-open-audit"
          onClick={onOpenAudit}
          title="Security Health Audit"
          className="h-9 px-2.5 sm:px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden md:inline">Audit</span>
          <span className={`px-1.5 py-0.2 rounded text-[11px] font-bold ${
            healthScore > 80 ? 'bg-emerald-950 text-emerald-400' : healthScore > 50 ? 'bg-amber-950 text-amber-400' : 'bg-rose-950 text-rose-400'
          }`}>
            {healthScore}%
          </span>
        </button>

        {/* Python CLI / Engine Modal Button */}
        <button
          id="btn-open-python-terminal"
          onClick={onOpenPythonTerminal}
          title="Python 3.10 Engine & CLI"
          className="h-9 px-2.5 sm:px-3 rounded-xl bg-blue-950/40 hover:bg-blue-900/60 text-blue-300 hover:text-blue-200 border border-blue-800/60 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Terminal className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Python CLI</span>
        </button>

        {/* Monthly Archive Zip & Email */}
        <button
          id="btn-open-monthly-archive"
          onClick={onOpenArchive}
          title="Monthly Credential & Document ZIP Archival"
          className="h-9 px-2.5 sm:px-3 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-800/60 text-indigo-300 hover:text-indigo-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <FolderArchive className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden lg:inline">Monthly ZIP</span>
        </button>

        {/* Settings / Backup */}
        <button
          id="btn-open-settings"
          onClick={onOpenSettings}
          title="Vault Backup & Settings"
          className="h-9 w-9 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 flex items-center justify-center transition-colors cursor-pointer"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Lock Now Button */}
        <button
          id="btn-lock-vault-header"
          onClick={onLockVault}
          title={`Lock Vault now (Auto-lock in ${formatAutoLockTime(autoLockSecondsRemaining)})`}
          className="h-9 px-2.5 sm:px-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Lock className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Lock</span>
          <span className="text-[10px] text-rose-400/80 hidden lg:inline">
            ({formatAutoLockTime(autoLockSecondsRemaining)})
          </span>
        </button>
      </div>
    </header>
  );
};
