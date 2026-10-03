import React from 'react';
import { 
  X, 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  Copy, 
  Check, 
  Clock, 
  KeyRound, 
  Key, 
  Layers,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { VaultItem } from '../types';
import { calculatePasswordStrength } from '../services/crypto';

interface SecurityAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: VaultItem[];
  onSelectItem: (item: VaultItem) => void;
}

export const SecurityAuditModal: React.FC<SecurityAuditModalProps> = ({
  isOpen,
  onClose,
  items,
  onSelectItem,
}) => {
  if (!isOpen) return null;

  // 1. Weak Passwords (< 12 chars or strength score < 50)
  const logins = items.filter((i) => i.category === 'login' && (i as any).password);
  const weakLogins = logins.filter((i) => {
    const pwd = (i as any).password;
    const str = calculatePasswordStrength(pwd);
    return str.score < 50 || pwd.length < 12;
  });

  // 2. Reused Passwords
  const passwordMap = new Map<string, VaultItem[]>();
  logins.forEach((item) => {
    const pwd = (item as any).password;
    if (pwd) {
      const existing = passwordMap.get(pwd) || [];
      existing.push(item);
      passwordMap.set(pwd, existing);
    }
  });
  const reusedGroups: Array<{ password: string; items: VaultItem[] }> = [];
  passwordMap.forEach((matchedItems, pwd) => {
    if (matchedItems.length > 1) {
      reusedGroups.push({ password: pwd, items: matchedItems });
    }
  });

  // 3. Expiring Documents / Cards
  const expiringItems: Array<{ item: VaultItem; daysRemaining: number; isExpired: boolean }> = [];
  items.forEach((item) => {
    let dateStr: string | undefined;
    if (item.category === 'document') dateStr = (item as any).expiryDate;
    if (item.category === 'identity') dateStr = (item as any).expiryDate;
    if (item.category === 'card') {
      const c = item as any;
      if (c.expiryYear && c.expiryMonth) {
        dateStr = `${c.expiryYear}-${c.expiryMonth.padStart(2, '0')}-01`;
      }
    }

    if (dateStr) {
      const expiry = new Date(dateStr).getTime();
      const now = Date.now();
      const days = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
      if (days <= 90) {
        expiringItems.push({
          item,
          daysRemaining: days,
          isExpired: days < 0,
        });
      }
    }
  });

  // 4. Missing 2FA
  const missingTotp = logins.filter((i) => !(i as any).totpSecret);

  // Overall Score Calculation (0-100)
  let score = 100;
  if (weakLogins.length > 0) score -= Math.min(30, weakLogins.length * 10);
  if (reusedGroups.length > 0) score -= Math.min(30, reusedGroups.length * 15);
  if (expiringItems.some((e) => e.isExpired)) score -= 15;
  if (missingTotp.length > 0) score -= Math.min(15, missingTotp.length * 3);
  score = Math.max(10, Math.min(100, score));

  const handleInspect = (item: VaultItem) => {
    onSelectItem(item);
    onClose();
  };

  return (
    <div id="security-audit-modal" className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-base font-bold text-white">Vault Health & Security Audit</h3>
              <p className="text-xs text-slate-400">Zero-knowledge heuristic analysis of your stored credentials and documents</p>
            </div>
          </div>
          <button
            id="btn-close-audit"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          {/* Health Score Overview Box */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 flex items-center justify-between gap-4">
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-1">
                Overall Vault Health Score
              </span>
              <div className="text-3xl font-extrabold text-white flex items-baseline gap-2">
                <span className={score > 80 ? 'text-emerald-400' : score > 50 ? 'text-amber-400' : 'text-rose-400'}>
                  {score}%
                </span>
                <span className="text-xs font-normal text-slate-400">
                  {score >= 90 ? 'Excellent security posture' : score >= 70 ? 'Good, minor improvements needed' : 'Action recommended'}
                </span>
              </div>
            </div>

            <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center font-bold text-lg ${
              score > 80 ? 'border-emerald-500 text-emerald-400' : score > 50 ? 'border-amber-500 text-amber-400' : 'border-rose-500 text-rose-400'
            }`}>
              {score}
            </div>
          </div>

          {/* 1. Reused Passwords */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-rose-400" />
                <span>Reused Passwords ({reusedGroups.length} instances)</span>
              </h4>
            </div>

            {reusedGroups.length > 0 ? (
              <div className="space-y-2">
                {reusedGroups.map((grp, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-950/60 border border-rose-900/40 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-rose-300 font-medium">Shared across {grp.items.length} accounts:</span>
                      <span className="text-slate-500 font-mono">••• (Same Password)</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {grp.items.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleInspect(item)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1.5 transition-colors"
                        >
                          <span>{item.title}</span>
                          <ChevronRight className="w-3 h-3 text-slate-400" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>No reused passwords detected. Every login has a distinct secret!</span>
              </div>
            )}
          </div>

          {/* 2. Weak Passwords */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>Weak Passwords ({weakLogins.length} accounts)</span>
            </h4>

            {weakLogins.length > 0 ? (
              <div className="divide-y divide-slate-800/80 rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden">
                {weakLogins.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleInspect(item)}
                    className="p-3 flex items-center justify-between hover:bg-slate-800/60 cursor-pointer transition-colors"
                  >
                    <div className="min-w-0">
                      <h5 className="text-xs font-semibold text-slate-200">{item.title}</h5>
                      <span className="text-[11px] text-amber-400 font-mono">
                        Password length: {(item as any).password?.length || 0} chars (Recommend 16+)
                      </span>
                    </div>
                    <button className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                      <span>Fix</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>All your login passwords meet high cryptographic entropy standards.</span>
              </div>
            )}
          </div>

          {/* 3. Expiring Documents or Cards */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Expiring Documents & Cards ({expiringItems.length} items)</span>
            </h4>

            {expiringItems.length > 0 ? (
              <div className="divide-y divide-slate-800/80 rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden">
                {expiringItems.map(({ item, daysRemaining, isExpired }) => (
                  <div
                    key={item.id}
                    onClick={() => handleInspect(item)}
                    className="p-3 flex items-center justify-between hover:bg-slate-800/60 cursor-pointer transition-colors"
                  >
                    <div>
                      <h5 className="text-xs font-semibold text-slate-200">{item.title}</h5>
                      <span className="text-[11px] text-slate-400">
                        {isExpired ? (
                          <span className="text-rose-400 font-medium">Expired {Math.abs(daysRemaining)} days ago</span>
                        ) : (
                          <span className="text-amber-400 font-medium">Expires in {daysRemaining} days</span>
                        )}
                      </span>
                    </div>
                    <button className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                      <span>View</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>All registered documents, passports, and cards are currently valid.</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-end bg-slate-900">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
};
