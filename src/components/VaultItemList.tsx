import React, { useState, useEffect } from 'react';
import { 
  Key, 
  FileText, 
  CreditCard, 
  UserCheck, 
  StickyNote, 
  Star, 
  Copy, 
  Check, 
  Paperclip, 
  Clock, 
  AlertCircle,
  ShieldCheck,
  Globe,
  ExternalLink
} from 'lucide-react';
import { VaultItem } from '../types';
import { generateTotpCode, getTotpSecondsRemaining } from '../services/totp';

interface VaultItemListProps {
  items: VaultItem[];
  selectedItemId: string | null;
  onSelectItem: (item: VaultItem) => void;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  onCopyText: (text: string, label: string) => void;
  searchQuery: string;
}

export const VaultItemList: React.FC<VaultItemListProps> = ({
  items,
  selectedItemId,
  onSelectItem,
  onToggleFavorite,
  onCopyText,
  searchQuery,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [totpCodes, setTotpCodes] = useState<Record<string, string>>({});
  const [totpRemaining, setTotpRemaining] = useState(30);

  // Live TOTP generator timer
  useEffect(() => {
    let isMounted = true;

    const updateTotp = async () => {
      const remaining = getTotpSecondsRemaining();
      if (isMounted) setTotpRemaining(remaining);

      const newCodes: Record<string, string> = {};
      for (const item of items) {
        if (item.category === 'login' && item.totpSecret) {
          const code = await generateTotpCode(item.totpSecret);
          if (code && isMounted) {
            newCodes[item.id] = code;
          }
        }
      }
      if (isMounted) setTotpCodes(newCodes);
    };

    updateTotp();
    const interval = setInterval(updateTotp, 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [items]);

  const handleCopy = (text: string, label: string, actionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onCopyText(text, label);
    setCopiedId(actionId);
    setTimeout(() => {
      setCopiedId((prev) => (prev === actionId ? null : prev));
    }, 2000);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'login': return <Key className="w-4 h-4 text-cyan-400" />;
      case 'document': return <FileText className="w-4 h-4 text-amber-400" />;
      case 'identity': return <UserCheck className="w-4 h-4 text-emerald-400" />;
      case 'card': return <CreditCard className="w-4 h-4 text-purple-400" />;
      case 'note': return <StickyNote className="w-4 h-4 text-sky-400" />;
      default: return <Key className="w-4 h-4 text-slate-400" />;
    }
  };

  const getExpiryInfo = (item: VaultItem) => {
    let dateStr: string | undefined = item.expiresAt;
    if (!dateStr && item.category === 'document') dateStr = item.expiryDate;
    if (!dateStr && item.category === 'identity') dateStr = item.expiryDate;
    if (!dateStr && item.category === 'card' && item.expiryYear && item.expiryMonth) {
      dateStr = `${item.expiryYear}-${item.expiryMonth.padStart(2, '0')}-01`;
    }
    if (!dateStr) return null;

    const expiryTime = new Date(dateStr).getTime();
    const now = Date.now();
    const diffDays = Math.ceil((expiryTime - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: `Expired ${Math.abs(diffDays)}d ago`, color: 'bg-rose-950/80 text-rose-300 border-rose-800/60' };
    }
    if (diffDays <= 30) {
      return { label: `Expires in ${diffDays}d`, color: 'bg-amber-950/80 text-amber-300 border-amber-800/60' };
    }
    if (diffDays <= 90) {
      return { label: `Expires in ${diffDays}d`, color: 'bg-blue-950/80 text-blue-300 border-blue-800/60' };
    }
    return { label: `Expires in ${diffDays}d`, color: 'bg-slate-900 text-slate-400 border-slate-800' };
  };

  if (items.length === 0) {
    return (
      <div id="vault-list-empty" className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-950/30">
        <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-3">
          <Key className="w-7 h-7" />
        </div>
        <h3 className="text-base font-semibold text-slate-200">No vault items found</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          {searchQuery ? `No results matching "${searchQuery}". Try another keyword.` : 'This section is empty. Create your first credential, document, or card using the "New Item" button above.'}
        </p>
      </div>
    );
  }

  return (
    <div id="vault-items-list" className="flex-1 overflow-y-auto divide-y divide-slate-800/60 bg-slate-950/40">
      {items.map((item) => {
        const isSelected = item.id === selectedItemId;
        const expiry = getExpiryInfo(item);
        const totpCode = totpCodes[item.id];

        let secondaryText = '';
        if (item.category === 'login') secondaryText = item.username || item.url || '';
        else if (item.category === 'document') secondaryText = item.docNumber ? `Doc #${item.docNumber}` : item.docType;
        else if (item.category === 'identity') secondaryText = item.idNumber ? `ID #${item.idNumber}` : item.fullName;
        else if (item.category === 'card') secondaryText = item.cardNumber ? `•••• ${item.cardNumber.slice(-4)}` : '';
        else if (item.category === 'note') secondaryText = item.content.slice(0, 45).replace(/[#*`]/g, '') + '...';

        return (
          <div
            key={item.id}
            id={`vault-item-${item.id}`}
            onClick={() => onSelectItem(item)}
            className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer transition-all border-l-2 ${
              isSelected
                ? 'bg-slate-800/90 border-l-cyan-400 shadow-inner'
                : 'border-l-transparent hover:bg-slate-900/70'
            }`}
          >
            {/* Left: Icon & Info */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 shadow-sm">
                {getCategoryIcon(item.category)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-slate-100 truncate tracking-tight">
                    {item.title}
                  </h4>

                  {expiry && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded border font-medium shrink-0 ${expiry.color}`}>
                      {expiry.label}
                    </span>
                  )}

                  {item.category === 'document' && item.attachments?.length > 0 && (
                    <span className="text-[10px] text-slate-400 flex items-center gap-0.5 shrink-0" title={`${item.attachments.length} attachment(s)`}>
                      <Paperclip className="w-3 h-3" />
                      <span>{item.attachments.length}</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 truncate">
                  <span className="truncate font-mono">{secondaryText || 'No secondary details'}</span>

                  {item.tags && item.tags.length > 0 && (
                    <div className="hidden sm:flex items-center gap-1">
                      {item.tags.slice(0, 2).map((t) => (
                        <span key={t} className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[10px]">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Quick actions & TOTP */}
            <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              {/* Live TOTP Code if available */}
              {totpCode && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-cyan-950/40 border border-cyan-800/50">
                  <div className="relative w-4 h-4 flex items-center justify-center text-[9px] font-bold text-cyan-400">
                    <span>{totpRemaining}</span>
                  </div>
                  <button
                    id={`btn-copy-totp-${item.id}`}
                    onClick={(e) => handleCopy(totpCode, '2FA Code', `totp-${item.id}`, e)}
                    className="font-mono text-xs font-semibold text-cyan-300 hover:text-white flex items-center gap-1"
                    title="Click to copy 2FA token"
                  >
                    <span>{totpCode.slice(0, 3)} {totpCode.slice(3)}</span>
                    {copiedId === `totp-${item.id}` ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3 opacity-70" />
                    )}
                  </button>
                </div>
              )}

              {/* Quick Copy Password / Card / Doc Number */}
              {item.category === 'login' && item.password && (
                <button
                  id={`btn-quick-copy-pwd-${item.id}`}
                  onClick={(e) => handleCopy(item.password!, 'Password', `pwd-${item.id}`, e)}
                  title="Copy password"
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  {copiedId === `pwd-${item.id}` ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Key className="w-4 h-4" />
                  )}
                </button>
              )}

              {item.category === 'login' && item.username && (
                <button
                  id={`btn-quick-copy-usr-${item.id}`}
                  onClick={(e) => handleCopy(item.username, 'Username', `usr-${item.id}`, e)}
                  title="Copy username"
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  {copiedId === `usr-${item.id}` ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              )}

              {/* Favorite toggle */}
              <button
                id={`btn-toggle-fav-${item.id}`}
                onClick={(e) => onToggleFavorite(item.id, e)}
                title={item.favorite ? 'Remove from favorites' : 'Add to favorites'}
                className={`p-2 rounded-lg transition-colors ${
                  item.favorite
                    ? 'text-amber-400 hover:bg-amber-950/40'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Star className={`w-4 h-4 ${item.favorite ? 'fill-amber-400' : ''}`} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
