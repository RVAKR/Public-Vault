import React from 'react';
import { 
  Key, 
  FileText, 
  CreditCard, 
  UserCheck, 
  StickyNote, 
  Star, 
  Clock, 
  Layers, 
  ShieldCheck, 
  Coins,
  AlertTriangle,
  FileCheck
} from 'lucide-react';
import { VaultCategory, VaultItem } from '../types';

export type SidebarFilter = VaultCategory | 'all' | 'favorites' | 'expiring' | 'weak';

interface VaultSidebarProps {
  currentFilter: SidebarFilter;
  onSelectFilter: (filter: SidebarFilter) => void;
  items: VaultItem[];
}

export const VaultSidebar: React.FC<VaultSidebarProps> = ({
  currentFilter,
  onSelectFilter,
  items,
}) => {
  const counts = {
    all: items.length,
    login: items.filter((i) => i.category === 'login').length,
    document: items.filter((i) => i.category === 'document').length,
    identity: items.filter((i) => i.category === 'identity').length,
    card: items.filter((i) => i.category === 'card').length,
    note: items.filter((i) => i.category === 'note').length,
    favorites: items.filter((i) => i.favorite).length,
    expiring: items.filter((i) => {
      let expiry: string | undefined = i.expiresAt;
      if (!expiry && i.category === 'document') expiry = i.expiryDate;
      if (!expiry && i.category === 'identity') expiry = i.expiryDate;
      if (!expiry && i.category === 'card' && i.expiryYear && i.expiryMonth) {
        expiry = `${i.expiryYear}-${i.expiryMonth.padStart(2, '0')}-01`;
      }
      if (!expiry) return false;
      const target = new Date(expiry).getTime();
      const now = Date.now();
      const diffDays = (target - now) / (1000 * 60 * 60 * 24);
      return diffDays <= 90; // within 90 days or already expired
    }).length,
  };

  const navItems = [
    { id: 'all', label: 'All Items', icon: Layers, count: counts.all, color: 'text-slate-300' },
    { id: 'login', label: 'Logins & Passwords', icon: Key, count: counts.login, color: 'text-cyan-400' },
    { id: 'document', label: 'Documents & Files', icon: FileText, count: counts.document, color: 'text-amber-400' },
    { id: 'identity', label: 'Identities & IDs', icon: UserCheck, count: counts.identity, color: 'text-emerald-400' },
    { id: 'card', label: 'Payment Cards', icon: CreditCard, count: counts.card, color: 'text-purple-400' },
    { id: 'note', label: 'Secure Notes', icon: StickyNote, count: counts.note, color: 'text-sky-400' },
  ];

  return (
    <aside id="vault-sidebar" className="w-64 bg-slate-950/60 border-r border-slate-800/80 p-3 sm:p-4 flex flex-col justify-between shrink-0 select-none">
      <div className="space-y-6">
        {/* Categories navigation */}
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-3 mb-2">
            Vault Categories
          </h3>
          <nav className="space-y-1">
            {navItems.map((nav) => {
              const Icon = nav.icon;
              const isActive = currentFilter === nav.id;
              return (
                <button
                  key={nav.id}
                  id={`nav-filter-${nav.id}`}
                  onClick={() => onSelectFilter(nav.id as SidebarFilter)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-slate-800 text-white shadow-sm border border-slate-700/80'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${nav.color}`} />
                    <span>{nav.label}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-slate-700 text-white' : 'bg-slate-900 text-slate-400'
                  }`}>
                    {nav.count}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Quick Filters */}
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-3 mb-2">
            Special Views
          </h3>
          <nav className="space-y-1">
            <button
              id="nav-filter-favorites"
              onClick={() => onSelectFilter('favorites')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                currentFilter === 'favorites'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700/80'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                <span>Favorites</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                currentFilter === 'favorites' ? 'bg-slate-700 text-white' : 'bg-slate-900 text-slate-400'
              }`}>
                {counts.favorites}
              </span>
            </button>

            <button
              id="nav-filter-expiring"
              onClick={() => onSelectFilter('expiring')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                currentFilter === 'expiring'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700/80'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-rose-400" />
                <span>Expiring Soon</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                counts.expiring > 0
                  ? 'bg-rose-950/80 text-rose-300 border border-rose-800/40'
                  : 'bg-slate-900 text-slate-400'
              }`}>
                {counts.expiring}
              </span>
            </button>
          </nav>
        </div>
      </div>

      {/* GCP Firebase Free Tier & Monthly Archival Assurance Box */}
      <div className="mt-6 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/90 text-xs text-slate-300 space-y-2">
        <div className="flex items-center gap-2 text-emerald-400 font-semibold">
          <Coins className="w-4 h-4 shrink-0" />
          <span>GCP Firebase Free Tier for Life</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Permanent $0 cloud cost with Gmail SSO ingress, AES-256 client-side zero-knowledge encryption, and monthly ZIP backup packages sent directly to your email.
        </p>
        <div className="flex items-center gap-1.5 text-[10px] text-cyan-400/90 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          <span>Zero-Knowledge & Monthly Archival</span>
        </div>
      </div>
    </aside>
  );
};
