import React, { useState } from 'react';
import { 
  X, 
  Key, 
  FileText, 
  CreditCard, 
  UserCheck, 
  StickyNote, 
  Sparkles, 
  Upload, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  Paperclip,
  Check,
  AlertCircle
} from 'lucide-react';
import { 
  VaultCategory, 
  VaultItem, 
  DocumentType, 
  CardType, 
  EncryptedFileAttachment, 
  CustomField 
} from '../types';
import { generatePassword, calculatePasswordStrength } from '../services/crypto';
import { isValidBase32 } from '../services/totp';

interface VaultItemEditorProps {
  item?: VaultItem | null;
  initialCategory?: VaultCategory;
  onSave: (itemData: Partial<VaultItem> & { category: VaultCategory; title: string }) => void;
  onClose: () => void;
}

export const VaultItemEditor: React.FC<VaultItemEditorProps> = ({
  item,
  initialCategory = 'login',
  onSave,
  onClose,
}) => {
  const [category, setCategory] = useState<VaultCategory>(item?.category || initialCategory);
  const [title, setTitle] = useState(item?.title || '');
  const [favorite, setFavorite] = useState(item?.favorite || false);
  const [tagsInput, setTagsInput] = useState(item?.tags?.join(', ') || '');
  const [notes, setNotes] = useState(item?.notes || '');
  const [customFields, setCustomFields] = useState<CustomField[]>(item?.customFields || []);
  const [expiresAt, setExpiresAt] = useState(item?.expiresAt || (item as any)?.expiryDate || '');

  // Login fields
  const [username, setUsername] = useState((item as any)?.username || '');
  const [password, setPassword] = useState((item as any)?.password || '');
  const [isMultilineCredential, setIsMultilineCredential] = useState(
    Boolean((item as any)?.password && ((item as any)?.password.includes('\n') || (item as any)?.password.length > 80))
  );
  const [url, setUrl] = useState((item as any)?.url || '');
  const [totpSecret, setTotpSecret] = useState((item as any)?.totpSecret || '');

  const setExpiryInDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setExpiresAt(d.toISOString().split('T')[0]);
  };

  // Document fields
  const [docType, setDocType] = useState<DocumentType>((item as any)?.docType || 'passport');
  const [docNumber, setDocNumber] = useState((item as any)?.docNumber || '');
  const [issuer, setIssuer] = useState((item as any)?.issuer || '');
  const [issueDate, setIssueDate] = useState((item as any)?.issueDate || '');
  const [expiryDate, setExpiryDate] = useState((item as any)?.expiryDate || '');
  const [attachments, setAttachments] = useState<EncryptedFileAttachment[]>((item as any)?.attachments || []);

  // Identity fields
  const [fullName, setFullName] = useState((item as any)?.fullName || '');
  const [idType, setIdType] = useState((item as any)?.idType || "Driver's License");
  const [idNumber, setIdNumber] = useState((item as any)?.idNumber || '');
  const [dateOfBirth, setDateOfBirth] = useState((item as any)?.dateOfBirth || '');
  const [nationality, setNationality] = useState((item as any)?.nationality || '');
  const [taxNumber, setTaxNumber] = useState((item as any)?.taxNumber || '');
  const [emergencyContact, setEmergencyContact] = useState((item as any)?.emergencyContact || '');

  // Card fields
  const [cardholderName, setCardholderName] = useState((item as any)?.cardholderName || '');
  const [cardNumber, setCardNumber] = useState((item as any)?.cardNumber || '');
  const [cardType, setCardType] = useState<CardType>((item as any)?.cardType || 'visa');
  const [expiryMonth, setExpiryMonth] = useState((item as any)?.expiryMonth || '');
  const [expiryYear, setExpiryYear] = useState((item as any)?.expiryYear || '');
  const [cvv, setCvv] = useState((item as any)?.cvv || '');
  const [pin, setPin] = useState((item as any)?.pin || '');
  const [bank, setBank] = useState((item as any)?.bank || '');
  const [billingAddress, setBillingAddress] = useState((item as any)?.billingAddress || '');

  // Note fields
  const [content, setContent] = useState((item as any)?.content || '');
  const [folder, setFolder] = useState((item as any)?.folder || '');

  const [errorMessage, setErrorMessage] = useState('');

  // Password generator helper
  const handleGeneratePassword = () => {
    const newPwd = generatePassword({
      length: 18,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
      avoidAmbiguous: true,
      mode: 'random'
    });
    setPassword(newPwd);
  };

  // Handle file uploads
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.size > 8 * 1024 * 1024) {
        alert(`File "${file.name}" is over 8MB. Please choose a smaller file.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        const result = loadEvt.target?.result as string;
        if (result) {
          const newAttachment: EncryptedFileAttachment = {
            id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
            dataUrl: result,
            uploadedAt: Date.now(),
          };
          setAttachments((prev) => [...prev, newAttachment]);
        }
      };
      reader.readAsDataURL(file);
    });
    // Reset file input
    e.target.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const addCustomField = () => {
    setCustomFields((prev) => [
      ...prev,
      {
        id: `cf-${Date.now()}`,
        label: '',
        value: '',
        isMasked: false,
      },
    ]);
  };

  const removeCustomField = (id: string) => {
    setCustomFields((prev) => prev.filter((cf) => cf.id !== id));
  };

  const updateCustomField = (id: string, updates: Partial<CustomField>) => {
    setCustomFields((prev) =>
      prev.map((cf) => (cf.id === id ? { ...cf, ...updates } : cf))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Please enter a title.');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const baseData = {
      title: title.trim(),
      category,
      favorite,
      tags,
      expiresAt: expiresAt || undefined,
      notes: notes.trim() || undefined,
      customFields: customFields.filter((cf) => cf.label.trim() && cf.value.trim()),
    };

    let itemData: any = { ...baseData };

    if (category === 'login') {
      itemData = {
        ...itemData,
        username: username.trim(),
        password: password.trim() || undefined,
        url: url.trim() || undefined,
        totpSecret: totpSecret.trim() ? totpSecret.trim().toUpperCase().replace(/\s/g, '') : undefined,
      };
    } else if (category === 'document') {
      itemData = {
        ...itemData,
        docType,
        docNumber: docNumber.trim() || undefined,
        issuer: issuer.trim() || undefined,
        issueDate: issueDate || undefined,
        expiryDate: expiresAt || expiryDate || undefined,
        attachments,
      };
    } else if (category === 'identity') {
      itemData = {
        ...itemData,
        fullName: fullName.trim() || title.trim(),
        idType: idType.trim(),
        idNumber: idNumber.trim(),
        dateOfBirth: dateOfBirth || undefined,
        nationality: nationality.trim() || undefined,
        taxNumber: taxNumber.trim() || undefined,
        emergencyContact: emergencyContact.trim() || undefined,
        expiryDate: expiresAt || expiryDate || undefined,
        attachments,
      };
    } else if (category === 'card') {
      itemData = {
        ...itemData,
        cardholderName: cardholderName.trim(),
        cardNumber: cardNumber.replace(/\s/g, '').trim(),
        cardType,
        expiryMonth: expiryMonth.trim(),
        expiryYear: expiryYear.trim(),
        cvv: cvv.trim(),
        pin: pin.trim() || undefined,
        bank: bank.trim() || undefined,
        billingAddress: billingAddress.trim() || undefined,
      };
    } else if (category === 'note') {
      itemData = {
        ...itemData,
        content: content.trim(),
        folder: folder.trim() || undefined,
      };
    }

    onSave(itemData);
  };

  return (
    <div id="vault-item-editor-modal" className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              {item ? `Edit: ${item.title}` : 'Add New Vault Item'}
            </h3>
            <p className="text-xs text-slate-400">
              Encrypted locally with AES-256-GCM before saving to IndexedDB
            </p>
          </div>
          <button
            id="btn-close-editor"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Category Selector (only enabled for new items) */}
          {!item && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Item Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { id: 'login', label: 'Login', icon: Key, color: 'text-cyan-400' },
                  { id: 'document', label: 'Document', icon: FileText, color: 'text-amber-400' },
                  { id: 'identity', label: 'Identity', icon: UserCheck, color: 'text-emerald-400' },
                  { id: 'card', label: 'Card', icon: CreditCard, color: 'text-purple-400' },
                  { id: 'note', label: 'Note', icon: StickyNote, color: 'text-sky-400' },
                ].map((c) => {
                  const Icon = c.icon;
                  const isSel = category === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      id={`select-category-${c.id}`}
                      onClick={() => setCategory(c.id as VaultCategory)}
                      className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1.5 transition-all ${
                        isSel
                          ? 'bg-slate-800 border-cyan-500 text-white shadow-sm'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/60'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${c.color}`} />
                      <span>{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Title and Favorite */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Item Title <span className="text-rose-400">*</span>
              </label>
              <input
                id="input-editor-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Google Workspace, Driver's License, Primary Visa"
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Favorite</label>
              <button
                type="button"
                id="btn-editor-toggle-favorite"
                onClick={() => setFavorite(!favorite)}
                className={`w-full py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
                  favorite
                    ? 'bg-amber-950/40 border-amber-600/60 text-amber-300'
                    : 'bg-slate-950/60 border-slate-700/80 text-slate-400 hover:text-white'
                }`}
              >
                <span>{favorite ? '★ Favorited' : '☆ Not Favorite'}</span>
              </button>
            </div>
          </div>

          {/* CATEGORY SPECIFIC INPUTS */}

          {/* LOGIN */}
          {category === 'login' && (
            <div className="space-y-3.5 pt-2 border-t border-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Username / Email
                  </label>
                  <input
                    id="input-editor-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className={isMultilineCredential ? 'sm:col-span-2' : ''}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <label className="block text-xs font-medium text-slate-300">
                        {isMultilineCredential ? 'Long Credential / Private Key / Secret Token' : 'Password'}
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsMultilineCredential(!isMultilineCredential)}
                        className="text-[11px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700"
                        title="Toggle single-line password vs multi-line long credential"
                      >
                        {isMultilineCredential ? 'Single-Line Mode' : 'Multi-Line / SSH Key'}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      {password && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {password.length} chars {password.includes('\n') ? `(${password.split('\n').length} lines)` : ''}
                        </span>
                      )}
                      <button
                        type="button"
                        id="btn-inline-gen-pwd"
                        onClick={handleGeneratePassword}
                        className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
                        title="Generate strong password"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Generate</span>
                      </button>
                    </div>
                  </div>
                  {isMultilineCredential ? (
                    <div>
                      <textarea
                        id="textarea-editor-password"
                        rows={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Paste long private key (e.g. -----BEGIN OPENSSH PRIVATE KEY-----), JWT bearer token, or multi-line credential without size limit..."
                        className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl p-3 text-xs font-mono text-cyan-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 leading-relaxed"
                      />
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Encrypted with authenticated AES-CTR + HMAC-SHA256 in Python SQLite with zero length restrictions.
                      </p>
                    </div>
                  ) : (
                    <input
                      id="input-editor-password"
                      type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••••••"
                      className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Website URL
                </label>
                <input
                  id="input-editor-url"
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://accounts.google.com"
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-300">
                    2FA / TOTP Secret Key (RFC 6238 Base32)
                  </label>
                  {totpSecret && (
                    <span className={`text-[11px] ${isValidBase32(totpSecret) ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isValidBase32(totpSecret) ? '✓ Valid Base32 Key' : '✕ Invalid Key format'}
                    </span>
                  )}
                </div>
                <input
                  id="input-editor-totp"
                  type="text"
                  value={totpSecret}
                  onChange={(e) => setTotpSecret(e.target.value)}
                  placeholder="e.g. JBSWY3DPEHPK3PXP"
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm font-mono uppercase text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Generates 6-digit one-time codes in real-time completely offline.
                </p>
              </div>
            </div>
          )}

          {/* DOCUMENT */}
          {category === 'document' && (
            <div className="space-y-3.5 pt-2 border-t border-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Document Category
                  </label>
                  <select
                    id="select-doc-type"
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as DocumentType)}
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="passport">Passport</option>
                    <option value="id_card">National ID Card</option>
                    <option value="driver_license">Driver's License</option>
                    <option value="tax">Tax Record / W2</option>
                    <option value="insurance">Insurance Policy</option>
                    <option value="contract">Contract / Agreement</option>
                    <option value="medical">Medical / Vaccine Record</option>
                    <option value="certificate">Certificate</option>
                    <option value="other">Other Official Document</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Document Number / ID
                  </label>
                  <input
                    id="input-doc-number"
                    type="text"
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    placeholder="e.g. P12345678"
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Issuing Authority
                  </label>
                  <input
                    id="input-doc-issuer"
                    type="text"
                    value={issuer}
                    onChange={(e) => setIssuer(e.target.value)}
                    placeholder="e.g. Department of State / DMV"
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Issue Date
                  </label>
                  <input
                    id="input-doc-issue-date"
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Expiration Date (for renewal alerts)
                  </label>
                  <input
                    id="input-doc-expiry-date"
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Attachments Section */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Encrypted File Attachments (Scans, PDFs, Images)
                </label>
                <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-950/40">
                  <label className="cursor-pointer flex flex-col items-center">
                    <Upload className="w-6 h-6 text-cyan-400 mb-1" />
                    <span className="text-xs font-semibold text-slate-200">
                      Click to browse or drag & drop documents
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5">
                      PDF, JPG, PNG, TXT (Encrypted with AES-GCM 256 before storage)
                    </span>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {attachments.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {attachments.map((att) => (
                      <div
                        key={att.id}
                        className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Paperclip className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="text-slate-200 truncate">{att.name}</span>
                          <span className="text-slate-400">({(att.size / 1024).toFixed(0)} KB)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(att.id)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                          title="Remove attachment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* IDENTITY */}
          {category === 'identity' && (
            <div className="space-y-3.5 pt-2 border-t border-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Full Legal Name
                  </label>
                  <input
                    id="input-identity-fullname"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="First Middle Last"
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    ID Type
                  </label>
                  <input
                    id="input-identity-type"
                    type="text"
                    value={idType}
                    onChange={(e) => setIdType(e.target.value)}
                    placeholder="Driver's License, Passport, National ID"
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    ID Number
                  </label>
                  <input
                    id="input-identity-number"
                    type="text"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    placeholder="Document or license number"
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Date of Birth
                  </label>
                  <input
                    id="input-identity-dob"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nationality
                  </label>
                  <input
                    id="input-identity-nationality"
                    type="text"
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    placeholder="e.g. United States"
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Social Security / Tax ID
                  </label>
                  <input
                    id="input-identity-tax"
                    type="text"
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                    placeholder="XXX-XX-XXXX"
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Emergency Contact
                  </label>
                  <input
                    id="input-identity-emergency"
                    type="text"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder="Name and phone number"
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Expiration Date
                  </label>
                  <input
                    id="input-identity-expiry"
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* CARD */}
          {category === 'card' && (
            <div className="space-y-3.5 pt-2 border-t border-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Cardholder Name
                  </label>
                  <input
                    id="input-card-holder"
                    type="text"
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
                    placeholder="NAME AS PRINTED ON CARD"
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm font-mono uppercase text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Card Number
                  </label>
                  <input
                    id="input-card-number"
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="4111 2222 3333 4444"
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Card Network
                  </label>
                  <select
                    id="select-card-type"
                    value={cardType}
                    onChange={(e) => setCardType(e.target.value as CardType)}
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="visa">Visa</option>
                    <option value="mastercard">Mastercard</option>
                    <option value="amex">American Express</option>
                    <option value="discover">Discover</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Expiry Month</label>
                    <input
                      id="input-card-month"
                      type="text"
                      maxLength={2}
                      value={expiryMonth}
                      onChange={(e) => setExpiryMonth(e.target.value)}
                      placeholder="MM (e.g. 08)"
                      className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyan-500 text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Expiry Year</label>
                    <input
                      id="input-card-year"
                      type="text"
                      maxLength={4}
                      value={expiryYear}
                      onChange={(e) => setExpiryYear(e.target.value)}
                      placeholder="YYYY (e.g. 2028)"
                      className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyan-500 text-center"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">CVV / CVC</label>
                    <input
                      id="input-card-cvv"
                      type="password"
                      maxLength={4}
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value)}
                      placeholder="123"
                      className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyan-500 text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">ATM PIN (opt)</label>
                    <input
                      id="input-card-pin"
                      type="password"
                      maxLength={6}
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="••••"
                      className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyan-500 text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Issuing Bank</label>
                  <input
                    id="input-card-bank"
                    type="text"
                    value={bank}
                    onChange={(e) => setBank(e.target.value)}
                    placeholder="Chase, Barclays, Capital One..."
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Billing Address</label>
                  <input
                    id="input-card-billing"
                    type="text"
                    value={billingAddress}
                    onChange={(e) => setBillingAddress(e.target.value)}
                    placeholder="Street, City, Postal Code"
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* NOTE */}
          {category === 'note' && (
            <div className="space-y-3.5 pt-2 border-t border-slate-800">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Folder / Topic
                </label>
                <input
                  id="input-note-folder"
                  type="text"
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                  placeholder="e.g. Crypto Recovery, WiFi Keys, Infrastructure"
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Encrypted Content (Supports Markdown)
                </label>
                <textarea
                  id="textarea-note-content"
                  rows={8}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Type or paste your sensitive notes, recovery phrases, server SSH configs, or credentials..."
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl p-3.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* CUSTOM FIELDS (UNIVERSAL) */}
          <div className="pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Custom Secure Fields
              </label>
              <button
                type="button"
                id="btn-add-custom-field"
                onClick={addCustomField}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Field</span>
              </button>
            </div>

            {customFields.length > 0 && (
              <div className="space-y-2">
                {customFields.map((cf) => (
                  <div key={cf.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={cf.label}
                      onChange={(e) => updateCustomField(cf.id, { label: e.target.value })}
                      placeholder="Field Label (e.g. Security Answer)"
                      className="w-1/3 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                    <input
                      type={cf.isMasked ? 'password' : 'text'}
                      value={cf.value}
                      onChange={(e) => updateCustomField(cf.id, { value: e.target.value })}
                      placeholder="Value"
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => updateCustomField(cf.id, { isMasked: !cf.isMasked })}
                      className={`px-2 py-1.5 rounded-lg border text-[11px] ${
                        cf.isMasked
                          ? 'bg-slate-800 border-slate-700 text-cyan-400'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                      title={cf.isMasked ? 'Masked field' : 'Visible field'}
                    >
                      {cf.isMasked ? 'Masked' : 'Plain'}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCustomField(cf.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* NOTES & TAGS */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Tags <span className="text-slate-500">(comma separated)</span>
              </label>
              <input
                id="input-editor-tags"
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Finance, Important, Personal, Work"
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {category !== 'note' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  General Notes
                </label>
                <textarea
                  id="textarea-editor-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional context, recovery instructions, or security guidelines..."
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            )}
          </div>

          {/* CREDENTIAL EXPIRATION & LIFECYCLE */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/90 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  Credential Expiry Date & Rotation
                </label>
                <p className="text-[11px] text-slate-400">
                  Set an expiry date for API keys, passwords, certificates, or documents to receive automatic alerts.
                </p>
              </div>
              {expiresAt && (() => {
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                const exp = new Date(expiresAt);
                exp.setHours(0, 0, 0, 0);
                const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const isExp = diffDays < 0;
                const isSoon = diffDays >= 0 && diffDays <= 30;
                return (
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-medium ${
                    isExp
                      ? 'bg-rose-950/40 text-rose-400 border-rose-800/60'
                      : isSoon
                      ? 'bg-amber-950/40 text-amber-300 border-amber-800/60'
                      : 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60'
                  }`}>
                    {isExp ? `Expired ${Math.abs(diffDays)}d ago` : `Expires in ${diffDays} days`}
                  </span>
                );
              })()}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-center">
              <div>
                <input
                  id="input-editor-expires-at"
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setExpiryInDays(30)}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] transition-colors"
                >
                  +30 Days
                </button>
                <button
                  type="button"
                  onClick={() => setExpiryInDays(90)}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] transition-colors"
                >
                  +90 Days
                </button>
                <button
                  type="button"
                  onClick={() => setExpiryInDays(365)}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] transition-colors"
                >
                  +1 Year
                </button>
                {expiresAt && (
                  <button
                    type="button"
                    onClick={() => setExpiresAt('')}
                    className="px-2 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 text-[11px] border border-rose-900/50 transition-colors"
                  >
                    Clear Expiry
                  </button>
                )}
              </div>
            </div>

            {item?.createdAt && (
              <p className="text-[10px] text-slate-500">
                Created: {new Date(item.createdAt).toLocaleString()} • Last Updated: {new Date(item.updatedAt || item.createdAt).toLocaleString()}
              </p>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              id="btn-cancel-editor"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="btn-save-vault-item"
              className="px-5 py-2 rounded-xl text-xs font-medium text-white bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 shadow-md shadow-cyan-900/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{item ? 'Update Encrypted Item' : 'Save Encrypted Item'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
