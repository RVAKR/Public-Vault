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
  Eye, 
  EyeOff, 
  Edit3, 
  Trash2, 
  ExternalLink, 
  Clock, 
  Download, 
  Paperclip, 
  ShieldCheck, 
  Calendar, 
  Building, 
  User, 
  Lock, 
  AlertCircle,
  Hash,
  X
} from 'lucide-react';
import { VaultItem, EncryptedFileAttachment } from '../types';
import { generateTotpCode, getTotpSecondsRemaining } from '../services/totp';
import { calculatePasswordStrength } from '../services/crypto';

interface VaultItemDetailProps {
  item: VaultItem | null;
  onClose: () => void;
  onEdit: (item: VaultItem) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  onCopyText: (text: string, label: string) => void;
}

export const VaultItemDetail: React.FC<VaultItemDetailProps> = ({
  item,
  onClose,
  onEdit,
  onDelete,
  onToggleFavorite,
  onCopyText,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showCvv, setShowCvv] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [unmaskedFields, setUnmaskedFields] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState<string | null>(null);
  const [totpRemaining, setTotpRemaining] = useState(30);
  const [previewAttachment, setPreviewAttachment] = useState<EncryptedFileAttachment | null>(null);

  useEffect(() => {
    setShowPassword(false);
    setShowCvv(false);
    setShowPin(false);
    setUnmaskedFields({});
    setPreviewAttachment(null);
  }, [item?.id]);

  // Live TOTP generator
  useEffect(() => {
    if (!item || item.category !== 'login' || !item.totpSecret) {
      setTotpCode(null);
      return;
    }

    let isMounted = true;
    const update = async () => {
      const remaining = getTotpSecondsRemaining();
      if (isMounted) setTotpRemaining(remaining);
      const code = await generateTotpCode(item.totpSecret!);
      if (isMounted) setTotpCode(code);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [item?.id, (item as any)?.totpSecret]);

  if (!item) {
    return (
      <div id="vault-detail-empty" className="h-full flex flex-col items-center justify-center p-8 text-center bg-slate-950/20 text-slate-500">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-3">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h3 className="text-sm font-semibold text-slate-300">Select an item to view details</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">
          Credentials, documents, identity records, and cards are securely decrypted in memory on demand.
        </p>
      </div>
    );
  }

  const handleCopy = (text: string, label: string, key: string) => {
    onCopyText(text, label);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  const downloadAttachment = (att: EncryptedFileAttachment) => {
    const a = document.createElement('a');
    a.href = att.dataUrl;
    a.download = att.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatCardNumber = (num: string) => {
    return num.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim();
  };

  const getExpiryBadge = (dateStr?: string) => {
    if (!dateStr) return null;
    const target = new Date(dateStr).getTime();
    const now = Date.now();
    const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-rose-950 border border-rose-800 text-rose-300">Expired</span>;
    }
    if (diffDays <= 30) {
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-rose-950 border border-rose-800 text-rose-300">Expires in {diffDays} days</span>;
    }
    if (diffDays <= 90) {
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-950 border border-amber-800 text-amber-300">Expires in {diffDays} days</span>;
    }
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300">Valid until {dateStr}</span>;
  };

  return (
    <div id="vault-item-detail" className="h-full flex flex-col bg-slate-900/90 border-l border-slate-800/90 overflow-y-auto">
      {/* Detail Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 sticky top-0 bg-slate-900/95 backdrop-blur-md z-10 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="uppercase text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {item.category}
            </span>
            <span className="text-xs text-slate-400">
              Updated {new Date(item.updatedAt).toLocaleDateString()}
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight mt-1 truncate">
            {item.title}
          </h2>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            id="btn-detail-fav"
            onClick={(e) => onToggleFavorite(item.id, e)}
            className={`p-2 rounded-xl transition-colors ${
              item.favorite
                ? 'text-amber-400 bg-amber-950/40 border border-amber-800/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title={item.favorite ? 'Unmark favorite' : 'Mark favorite'}
          >
            <Star className={`w-4 h-4 ${item.favorite ? 'fill-amber-400' : ''}`} />
          </button>

          <button
            id="btn-detail-edit"
            onClick={() => onEdit(item)}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/80 transition-colors"
            title="Edit item"
          >
            <Edit3 className="w-4 h-4" />
          </button>

          <button
            id="btn-detail-delete"
            onClick={() => {
              if (window.confirm(`Are you sure you want to delete "${item.title}"?`)) {
                onDelete(item.id);
              }
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 border border-slate-700/80 transition-colors"
            title="Delete item"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            id="btn-detail-close"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 md:hidden transition-colors"
            title="Close details"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Universal Expiration / Lifecycle Bar */}
      {(item.expiresAt || (item as any).expiryDate || item.createdAt) && (
        <div className="px-4 sm:px-6 py-2.5 bg-slate-950/70 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <span>Created: <strong className="text-slate-200">{new Date(item.createdAt || item.updatedAt).toLocaleDateString()}</strong></span>
            {(item.expiresAt || (item as any).expiryDate) && (
              <>
                <span className="text-slate-600">•</span>
                <span>Expiry: <strong className="text-slate-200">{item.expiresAt || (item as any).expiryDate}</strong></span>
              </>
            )}
          </div>
          <div>
            {getExpiryBadge(item.expiresAt || (item as any).expiryDate)}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="p-4 sm:p-6 space-y-6 flex-1">
        {/* Category-Specific Fields */}

        {/* 1. LOGIN CATEGORY */}
        {item.category === 'login' && (
          <div className="space-y-4">
            {/* Username */}
            {item.username && (
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>Username / Email</span>
                  <button
                    id="btn-copy-username"
                    onClick={() => handleCopy(item.username, 'Username', 'username')}
                    className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
                  >
                    {copiedKey === 'username' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'username' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="text-sm font-mono text-slate-100 select-all font-semibold">
                  {item.username}
                </div>
              </div>
            )}

            {/* Password / Long Credential */}
            {item.password && (
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <div className="flex items-center gap-2">
                    <span>{item.password.includes('\n') || item.password.length > 80 ? 'Long Credential / Private Key' : 'Password'}</span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      ({item.password.length} chars{item.password.includes('\n') ? `, ${item.password.split('\n').length} lines` : ''})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      id="btn-toggle-password-view"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-white flex items-center gap-1"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showPassword ? 'Hide' : 'Reveal'}</span>
                    </button>
                    <span className="text-slate-700">•</span>
                    <button
                      id="btn-copy-password"
                      onClick={() => handleCopy(item.password!, 'Password', 'password')}
                      className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
                    >
                      {copiedKey === 'password' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'password' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {showPassword ? (
                  item.password.includes('\n') || item.password.length > 80 ? (
                    <div className="mt-2 relative">
                      <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-200 overflow-x-auto max-h-56 leading-relaxed select-all">
                        {item.password}
                      </pre>
                    </div>
                  ) : (
                    <div className="text-sm font-mono text-slate-100 select-all py-1">
                      {item.password}
                    </div>
                  )
                ) : (
                  <div className="text-sm font-mono text-slate-500 select-none py-1">
                    {item.password.includes('\n')
                      ? `•••••••• [Encrypted Multi-Line Key (${item.password.split('\n').length} lines, ${item.password.length} bytes)]`
                      : '••••••••••••••••••••'}
                  </div>
                )}

                {/* Password Strength rating */}
                {showPassword && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-xs">
                    {(() => {
                      const str = calculatePasswordStrength(item.password);
                      return (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Strength: <strong className={str.color}>{str.label}</strong></span>
                          <span className="text-slate-500 font-mono">{item.password.length} characters</span>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* Live 2FA / TOTP Authenticator */}
            {item.totpSecret && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-950/40 via-slate-950 to-slate-900 border border-cyan-800/40 shadow-inner">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">
                      2FA Authenticator Token (TOTP)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span>{totpRemaining}s remaining</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 mt-2">
                  <div className="text-2xl sm:text-3xl font-mono font-bold tracking-widest text-white">
                    {totpCode ? `${totpCode.slice(0, 3)} ${totpCode.slice(3)}` : '------'}
                  </div>

                  <button
                    id="btn-copy-totp-detail"
                    onClick={() => totpCode && handleCopy(totpCode, '2FA Code', 'totp')}
                    disabled={!totpCode}
                    className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white font-medium text-xs flex items-center gap-1.5 transition-all shadow-md shadow-cyan-900/20"
                  >
                    {copiedKey === 'totp' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'totp' ? 'Copied' : 'Copy Code'}</span>
                  </button>
                </div>

                {/* Progress bar for 30s countdown */}
                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-3">
                  <div
                    className="h-full bg-cyan-400 transition-all duration-1000 ease-linear"
                    style={{ width: `${(totpRemaining / 30) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* URL / Website */}
            {item.url && (
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="text-xs text-slate-400 block mb-0.5">Website / Service URL</span>
                  <span className="text-sm font-mono text-cyan-300 truncate block">{item.url}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    id="btn-copy-url"
                    onClick={() => handleCopy(item.url!, 'URL', 'url')}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                    title="Copy URL"
                  >
                    {copiedKey === 'url' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <a
                    href={item.url.startsWith('http') ? item.url : `https://${item.url}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="p-1.5 rounded-lg text-cyan-400 hover:text-cyan-300 hover:bg-slate-800"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. DOCUMENT CATEGORY */}
        {item.category === 'document' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-xs text-slate-400 block mb-0.5">Document Type</span>
                <span className="text-sm font-semibold text-slate-200 capitalize">{item.docType.replace('_', ' ')}</span>
              </div>

              {item.docNumber && (
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Document Number</span>
                    <button
                      onClick={() => handleCopy(item.docNumber!, 'Document Number', 'docNum')}
                      className="text-cyan-400 hover:text-cyan-300 text-xs flex items-center gap-1"
                    >
                      {copiedKey === 'docNum' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <span className="text-sm font-mono font-semibold text-slate-200">{item.docNumber}</span>
                </div>
              )}

              {item.issuer && (
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-0.5">Issuing Authority</span>
                  <span className="text-sm font-medium text-slate-200">{item.issuer}</span>
                </div>
              )}

              {item.issueDate && (
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-0.5">Issue Date</span>
                  <span className="text-sm font-mono text-slate-200">{item.issueDate}</span>
                </div>
              )}

              {item.expiryDate && (
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 sm:col-span-2 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block mb-0.5">Expiration Date</span>
                    <span className="text-sm font-mono font-semibold text-slate-200">{item.expiryDate}</span>
                  </div>
                  {getExpiryBadge(item.expiryDate)}
                </div>
              )}
            </div>

            {/* Attached Encrypted Files */}
            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5" />
                <span>Encrypted Document Attachments ({item.attachments?.length || 0})</span>
              </h3>

              {item.attachments && item.attachments.length > 0 ? (
                <div className="space-y-2">
                  {item.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-amber-400 shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-xs font-semibold text-slate-200 truncate">{att.name}</h5>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {formatFileSize(att.size)} • {att.type || 'Encrypted File'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {att.type.startsWith('image/') && (
                          <button
                            onClick={() => setPreviewAttachment(att)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-200 hover:bg-slate-700"
                          >
                            Preview
                          </button>
                        )}
                        <button
                          onClick={() => downloadAttachment(att)}
                          className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
                          title="Download decrypted file"
                        >
                          <Download className="w-4 h-4 text-cyan-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                  No encrypted files attached to this document. Click "Edit" to upload scans, PDFs, or photos.
                </p>
              )}
            </div>
          </div>
        )}

        {/* 3. IDENTITY CATEGORY */}
        {item.category === 'identity' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-xs text-slate-400 block mb-0.5">Full Legal Name</span>
                <span className="text-sm font-semibold text-slate-100">{item.fullName}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">ID / Document Number</span>
                  <button
                    onClick={() => handleCopy(item.idNumber, 'ID Number', 'idNum')}
                    className="text-cyan-400 hover:text-cyan-300 text-xs flex items-center gap-1"
                  >
                    {copiedKey === 'idNum' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                <span className="text-sm font-mono font-semibold text-slate-100">{item.idNumber}</span>
              </div>

              {item.dateOfBirth && (
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-0.5">Date of Birth</span>
                  <span className="text-sm font-mono text-slate-200">{item.dateOfBirth}</span>
                </div>
              )}

              {item.nationality && (
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-0.5">Nationality / Citizenship</span>
                  <span className="text-sm text-slate-200">{item.nationality}</span>
                </div>
              )}

              {item.taxNumber && (
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Tax ID / SSN</span>
                    <button
                      onClick={() => handleCopy(item.taxNumber!, 'Tax ID', 'taxNum')}
                      className="text-cyan-400 hover:text-cyan-300 text-xs flex items-center gap-1"
                    >
                      {copiedKey === 'taxNum' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <span className="text-sm font-mono font-semibold text-slate-200">{item.taxNumber}</span>
                </div>
              )}

              {item.emergencyContact && (
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-0.5">Emergency Contact</span>
                  <span className="text-sm text-slate-200">{item.emergencyContact}</span>
                </div>
              )}

              {item.expiryDate && (
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 sm:col-span-2 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block mb-0.5">ID Expiration</span>
                    <span className="text-sm font-mono font-semibold text-slate-200">{item.expiryDate}</span>
                  </div>
                  {getExpiryBadge(item.expiryDate)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. PAYMENT CARD CATEGORY */}
        {item.category === 'card' && (
          <div className="space-y-4">
            {/* Realistic Digital Card Representation */}
            <div className="p-5 rounded-2xl bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-800 border border-slate-700/80 shadow-2xl relative overflow-hidden text-white">
              <div className="flex items-center justify-between mb-6">
                <div className="w-10 h-7 rounded-md bg-amber-400/80 border border-amber-300 flex items-center justify-center">
                  <div className="w-6 h-4 border border-amber-600/60 rounded" />
                </div>
                <span className="font-bold tracking-widest text-xs uppercase px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700">
                  {item.cardType}
                </span>
              </div>

              <div className="font-mono text-lg sm:text-xl tracking-widest mb-6 font-semibold select-all">
                {formatCardNumber(item.cardNumber)}
              </div>

              <div className="flex items-end justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Cardholder</span>
                  <span className="font-semibold tracking-wider uppercase font-mono">{item.cardholderName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Expires</span>
                  <span className="font-mono font-semibold">{item.expiryMonth}/{item.expiryYear}</span>
                </div>
              </div>
            </div>

            {/* Detailed Card Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Card Number</span>
                  <button
                    onClick={() => handleCopy(item.cardNumber, 'Card Number', 'cardNum')}
                    className="text-cyan-400 hover:text-cyan-300 text-xs flex items-center gap-1 font-medium"
                  >
                    {copiedKey === 'cardNum' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'cardNum' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <span className="text-sm font-mono font-semibold text-slate-100">{item.cardNumber}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">CVV / Security Code</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowCvv(!showCvv)}
                      className="text-slate-400 hover:text-white text-xs flex items-center gap-1"
                    >
                      {showCvv ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={() => handleCopy(item.cvv, 'CVV', 'cvv')}
                      className="text-cyan-400 hover:text-cyan-300 text-xs flex items-center gap-1 font-medium"
                    >
                      {copiedKey === 'cvv' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
                <span className="text-sm font-mono font-semibold text-slate-100">{showCvv ? item.cvv : '•••'}</span>
              </div>

              {item.pin && (
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Card PIN</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowPin(!showPin)}
                        className="text-slate-400 hover:text-white text-xs flex items-center gap-1"
                      >
                        {showPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => handleCopy(item.pin!, 'PIN', 'pin')}
                        className="text-cyan-400 hover:text-cyan-300 text-xs flex items-center gap-1 font-medium"
                      >
                        {copiedKey === 'pin' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                  <span className="text-sm font-mono font-semibold text-slate-100">{showPin ? item.pin : '••••'}</span>
                </div>
              )}

              {item.bank && (
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-0.5">Issuing Bank / Financial Provider</span>
                  <span className="text-sm font-medium text-slate-200">{item.bank}</span>
                </div>
              )}

              {item.billingAddress && (
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Billing Address</span>
                    <button
                      onClick={() => handleCopy(item.billingAddress!, 'Billing Address', 'billing')}
                      className="text-cyan-400 hover:text-cyan-300 text-xs flex items-center gap-1"
                    >
                      {copiedKey === 'billing' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <span className="text-sm text-slate-200 block mt-0.5">{item.billingAddress}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. SECURE NOTE CATEGORY */}
        {item.category === 'note' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Encrypted Note Content
              </span>
              <button
                id="btn-copy-note-content"
                onClick={() => handleCopy(item.content, 'Note Content', 'note')}
                className="text-cyan-400 hover:text-cyan-300 text-xs flex items-center gap-1 font-medium"
              >
                {copiedKey === 'note' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'note' ? 'Copied Content' : 'Copy Content'}</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-slate-200 font-mono whitespace-pre-wrap leading-relaxed select-all">
              {item.content}
            </div>
          </div>
        )}

        {/* Custom Fields (Applicable across all items) */}
        {item.customFields && item.customFields.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Additional Custom Fields
            </h4>
            <div className="space-y-2">
              {item.customFields.map((cf) => {
                const isUnmasked = unmaskedFields[cf.id];
                return (
                  <div key={cf.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <span className="text-xs text-slate-400 block mb-0.5">{cf.label}</span>
                      <span className="text-sm font-mono text-slate-200">
                        {cf.isMasked && !isUnmasked ? '••••••••' : cf.value}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {cf.isMasked && (
                        <button
                          onClick={() => setUnmaskedFields((prev) => ({ ...prev, [cf.id]: !prev[cf.id] }))}
                          className="text-slate-400 hover:text-white text-xs"
                        >
                          {isUnmasked ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      )}
                      <button
                        onClick={() => handleCopy(cf.value, cf.label, `cf-${cf.id}`)}
                        className="text-cyan-400 hover:text-cyan-300 text-xs flex items-center gap-1"
                      >
                        {copiedKey === `cf-${cf.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* General Notes Field */}
        {item.notes && (
          <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              General Notes
            </h4>
            <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
              {item.notes}
            </div>
          </div>
        )}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Tags
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <span key={tag} className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs text-slate-300">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Attachment Image Preview Modal */}
      {previewAttachment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-4 relative shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <h4 className="text-sm font-semibold text-white truncate">{previewAttachment.name}</h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadAttachment(previewAttachment)}
                  className="px-3 py-1 rounded-lg bg-cyan-600 text-white text-xs hover:bg-cyan-500"
                >
                  Download
                </button>
                <button
                  onClick={() => setPreviewAttachment(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="max-h-[70vh] overflow-auto flex items-center justify-center bg-slate-950 rounded-xl p-2">
              <img
                src={previewAttachment.dataUrl}
                alt={previewAttachment.name}
                className="max-h-[65vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
