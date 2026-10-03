/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  VaultItem, 
  VaultCategory, 
  VaultMetadata, 
  VaultPayload, 
  StoredEncryptedVault, 
  EncryptedFileAttachment 
} from './types';
import { 
  deriveKeyFromPassword, 
  encryptData, 
  decryptData, 
  createVerifier, 
  verifyMasterKey, 
  generateRandomBytes, 
  arrayBufferToBase64, 
  base64ToArrayBuffer,
  calculatePasswordStrength
} from './services/crypto';
import { 
  loadEncryptedVaultFromStorage, 
  saveEncryptedVaultToStorage, 
  deleteEncryptedVaultFromStorage, 
  exportVaultBackupFile, 
  parseImportedVaultFile,
  exportVaultToCSV,
  exportVaultToExcel
} from './services/storage';
import { INITIAL_SAMPLE_ITEMS } from './services/sampleData';
import { FileSpreadsheet, Download, ChevronDown } from 'lucide-react';

import { VaultLockScreen } from './components/VaultLockScreen';
import { VaultHeader } from './components/VaultHeader';
import { VaultSidebar, SidebarFilter } from './components/VaultSidebar';
import { VaultItemList } from './components/VaultItemList';
import { VaultItemDetail } from './components/VaultItemDetail';
import { VaultItemEditor } from './components/VaultItemEditor';
import { PasswordGeneratorModal } from './components/PasswordGeneratorModal';
import { SecurityAuditModal } from './components/SecurityAuditModal';
import { BackupSettingsModal } from './components/BackupSettingsModal';
import { PythonTerminalModal } from './components/PythonTerminalModal';
import { MonthlyArchiveModal } from './components/MonthlyArchiveModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { 
  auth, 
  signInWithGoogleSSO, 
  signOutSSO, 
  saveVaultToFirestore, 
  loadVaultFromFirestore 
} from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

export default function App() {
  // Authentication & Cryptographic State
  const [isInitialized, setIsInitialized] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [metadata, setMetadata] = useState<VaultMetadata | null>(null);
  const [storedVault, setStoredVault] = useState<StoredEncryptedVault | null>(null);

  // Vault Items State (held in memory only while unlocked)
  const [items, setItems] = useState<VaultItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFilter, setCurrentFilter] = useState<SidebarFilter>('all');

  // Modals & Drawers
  const [editorState, setEditorState] = useState<{
    isOpen: boolean;
    item?: VaultItem | null;
    initialCategory?: VaultCategory;
  }>({ isOpen: false });

  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPythonTerminalOpen, setIsPythonTerminalOpen] = useState(false);
  const [isMonthlyArchiveOpen, setIsMonthlyArchiveOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Auto-Lock Inactivity Timer
  const [autoLockSeconds, setAutoLockSeconds] = useState(300); // 5 mins default
  const lastActivityRef = useRef<number>(Date.now());

  // Toast Helper
  const addToast = useCallback((type: 'success' | 'error' | 'info', title: string, description?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    setToasts((prev) => [...prev, { id, type, title, description }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Listen for Firebase Auth user status (Gmail SSO)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Attempt to sync vault from Firestore free tier if local vault is absent
        try {
          const cloudVault = await loadVaultFromFirestore(user.uid);
          if (cloudVault && !storedVault) {
            setStoredVault(cloudVault);
            setMetadata(cloudVault.meta);
            setAutoLockSeconds(cloudVault.meta.autoLockMinutes * 60);
            addToast('info', 'Cloud Vault Synchronized', `Connected to Gmail SSO (${user.email}) via GCP Firebase Free Tier.`);
          }
        } catch (e) {
          console.warn('Could not sync cloud vault:', e);
        }
      }
    });
    return () => unsubscribe();
  }, [storedVault, addToast]);

  const handleGoogleSignIn = async () => {
    try {
      const user = await signInWithGoogleSSO();
      addToast('success', 'Signed In With Google', `Welcome ${user.displayName || user.email}!`);
      // If we have an existing local vault, back it up to Firestore
      if (storedVault) {
        await saveVaultToFirestore(user.uid, storedVault, items.length);
      }
    } catch (err: any) {
      addToast('error', 'Google Sign-In Cancelled', err.message || 'Could not complete Google SSO login.');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutSSO();
      addToast('info', 'Signed Out', 'You have been signed out of Google SSO.');
    } catch (err: any) {
      addToast('error', 'Sign-Out Error', err.message);
    }
  };

  // 1. Initial Load from IndexedDB
  useEffect(() => {
    const initVault = async () => {
      try {
        const vault = await loadEncryptedVaultFromStorage();
        if (vault) {
          setStoredVault(vault);
          setMetadata(vault.meta);
          setAutoLockSeconds(vault.meta.autoLockMinutes * 60);
        }
      } catch (err) {
        console.error('Failed to load initial vault:', err);
      } finally {
        setIsInitialized(true);
      }
    };
    initVault();
  }, []);

  // 2. Auto-Lock Timer & Inactivity Tracking
  useEffect(() => {
    if (!isUnlocked || !metadata || metadata.autoLockMinutes === 0) return;

    const interval = setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      const remaining = Math.max(0, metadata.autoLockMinutes * 60 - elapsedSec);
      setAutoLockSeconds(remaining);

      if (remaining <= 0) {
        // Lock the vault
        handleLockVault();
        addToast('info', 'Vault Locked', 'Auto-locked due to inactivity to protect your credentials.');
      }
    }, 1000);

    const recordActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('mousemove', recordActivity);
    window.addEventListener('keydown', recordActivity);
    window.addEventListener('click', recordActivity);
    window.addEventListener('touchstart', recordActivity);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', recordActivity);
      window.removeEventListener('keydown', recordActivity);
      window.removeEventListener('click', recordActivity);
      window.removeEventListener('touchstart', recordActivity);
    };
  }, [isUnlocked, metadata]);

  // Lock Vault
  const handleLockVault = useCallback(() => {
    setCryptoKey(null);
    setIsUnlocked(false);
    setSelectedItemId(null);
    setEditorState({ isOpen: false });
    setIsGeneratorOpen(false);
    setIsAuditOpen(false);
    setIsSettingsOpen(false);
  }, []);

  // 3. Create Brand New Vault
  const handleCreateVault = async (password: string, hint?: string) => {
    const saltBytes = generateRandomBytes(16);
    const saltBase64 = arrayBufferToBase64(saltBytes);

    // Derive PBKDF2 Key
    const key = await deriveKeyFromPassword(password, saltBytes);

    // Create verification token
    const { verifier, verifierIv } = await createVerifier(key);

    const meta: VaultMetadata = {
      isConfigured: true,
      salt: saltBase64,
      verifier,
      verifierIv,
      passwordHint: hint,
      autoLockMinutes: 5,
      lastActive: Date.now(),
      version: 1,
      updatedAt: Date.now(),
    };

    // Initialize with comprehensive sample items so user has rich starting credentials & documents
    const initialPayload: VaultPayload = {
      items: INITIAL_SAMPLE_ITEMS,
      updatedAt: Date.now(),
    };

    // Encrypt payload
    const { ciphertext, iv } = await encryptData(JSON.stringify(initialPayload), key);

    const newStoredVault: StoredEncryptedVault = {
      meta,
      ciphertext,
      iv,
    };

    await saveEncryptedVaultToStorage(newStoredVault);

    setStoredVault(newStoredVault);
    setMetadata(meta);
    setCryptoKey(key);
    setItems(initialPayload.items);
    setIsUnlocked(true);
    setSelectedItemId(initialPayload.items[0]?.id || null);

    addToast('success', 'Personal Vault Initialized', 'Secured with AES-256-GCM zero-knowledge client encryption at $0 cost.');
  };

  // 4. Unlock Existing Vault
  const handleUnlockVault = async (password: string): Promise<boolean> => {
    if (!storedVault || !metadata) return false;

    try {
      const saltBytes = base64ToArrayBuffer(metadata.salt);
      const key = await deriveKeyFromPassword(password, saltBytes);

      // Verify master password with verifier
      const isValid = await verifyMasterKey(key, metadata.verifier, metadata.verifierIv);
      if (!isValid) return false;

      // Decrypt items payload
      const decryptedString = await decryptData(storedVault.ciphertext, storedVault.iv, key);
      const payload: VaultPayload = JSON.parse(decryptedString);

      setCryptoKey(key);
      setItems(payload.items || []);
      setIsUnlocked(true);
      lastActivityRef.current = Date.now();
      if (payload.items?.length > 0) {
        setSelectedItemId(payload.items[0].id);
      }

      addToast('success', 'Vault Unlocked', 'Decrypted successfully with zero server transmission.');
      return true;
    } catch (err) {
      console.error('Unlock error:', err);
      return false;
    }
  };

  // 5. Persist Items to IndexedDB (AES-GCM Encrypted)
  const persistVaultItems = async (newItems: VaultItem[], currentKey: CryptoKey) => {
    if (!metadata) return;

    const payload: VaultPayload = {
      items: newItems,
      updatedAt: Date.now(),
    };

    const { ciphertext, iv } = await encryptData(JSON.stringify(payload), currentKey);

    const updatedStoredVault: StoredEncryptedVault = {
      meta: { ...metadata, updatedAt: Date.now() },
      ciphertext,
      iv,
    };

    await saveEncryptedVaultToStorage(updatedStoredVault);
    setStoredVault(updatedStoredVault);

    // If signed into Google SSO, also synchronize encrypted vault to Firestore
    if (currentUser) {
      saveVaultToFirestore(currentUser.uid, updatedStoredVault, newItems.length).catch((err) => {
        console.warn('Firestore cloud sync notice:', err);
      });
    }
  };

  // 6. Save or Update Item
  const handleSaveItem = async (itemData: Partial<VaultItem> & { category: VaultCategory; title: string }) => {
    if (!cryptoKey) return;

    let updatedItems: VaultItem[];
    let targetId = editorState.item?.id;

    if (targetId) {
      // Editing existing item
      updatedItems = items.map((i) =>
        i.id === targetId
          ? ({ ...i, ...itemData, updatedAt: Date.now() } as VaultItem)
          : i
      );
      addToast('success', 'Item Updated', `"${itemData.title}" was re-encrypted and saved.`);
    } else {
      // Creating new item
      const newItem: VaultItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        favorite: false,
        tags: [],
        ...itemData,
      } as VaultItem;
      updatedItems = [newItem, ...items];
      targetId = newItem.id;
      addToast('success', 'Item Added', `"${itemData.title}" was encrypted and stored.`);
    }

    setItems(updatedItems);
    setSelectedItemId(targetId);
    setEditorState({ isOpen: false });

    await persistVaultItems(updatedItems, cryptoKey);
  };

  // 7. Delete Item
  const handleDeleteItem = async (id: string) => {
    if (!cryptoKey) return;
    const targetItem = items.find((i) => i.id === id);
    const updated = items.filter((i) => i.id !== id);

    setItems(updated);
    if (selectedItemId === id) {
      setSelectedItemId(updated[0]?.id || null);
    }

    await persistVaultItems(updated, cryptoKey);
    addToast('info', 'Item Removed', targetItem ? `"${targetItem.title}" has been deleted.` : 'Item deleted.');
  };

  // 8. Toggle Favorite
  const handleToggleFavorite = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!cryptoKey) return;

    const updated = items.map((item) =>
      item.id === id ? { ...item, favorite: !item.favorite, updatedAt: Date.now() } : item
    );
    setItems(updated);
    await persistVaultItems(updated, cryptoKey);
  };

  // 9. Copy to Clipboard with 30s Auto-Clear Protection
  const handleCopyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast('success', `${label} Copied`, 'Sensitive data copied to clipboard. Auto-clearing in 30 seconds for privacy.');

      // Auto-clear clipboard safety timeout
      setTimeout(async () => {
        try {
          const currentClip = await navigator.clipboard.readText();
          if (currentClip === text) {
            await navigator.clipboard.writeText('');
          }
        } catch {
          // Clipboard read might be blocked by browser permissions; benign
        }
      }, 30000);
    } catch {
      addToast('error', 'Copy Failed', 'Please manually copy the text.');
    }
  };

  // 10. Backup Export
  const handleExportBackup = () => {
    if (!storedVault) return;
    exportVaultBackupFile(storedVault);
    addToast('success', 'Backup Exported', 'Encrypted .vault file has been saved to your downloads.');
  };

  // Bulk CSV & Excel Exports
  const handleExportAllCSV = () => {
    if (items.length === 0) {
      addToast('info', 'Vault Empty', 'No credentials or records to export.');
      return;
    }
    exportVaultToCSV(items, 'vault-all-database');
    addToast('success', 'Database Exported', `Exported all ${items.length} records to CSV format (.csv).`);
    setIsExportMenuOpen(false);
  };

  const handleExportAllExcel = () => {
    if (items.length === 0) {
      addToast('info', 'Vault Empty', 'No credentials or records to export.');
      return;
    }
    exportVaultToExcel(items, 'vault-all-database');
    addToast('success', 'Database Exported', `Exported all ${items.length} records to Microsoft Excel (.xls).`);
    setIsExportMenuOpen(false);
  };

  const handleExportFilteredCSV = () => {
    if (filteredItems.length === 0) return;
    exportVaultToCSV(filteredItems, `vault-${currentFilter}`);
    addToast('success', 'Export Completed', `Exported ${filteredItems.length} records to CSV format.`);
    setIsExportMenuOpen(false);
  };

  const handleExportFilteredExcel = () => {
    if (filteredItems.length === 0) return;
    exportVaultToExcel(filteredItems, `vault-${currentFilter}`);
    addToast('success', 'Export Completed', `Exported ${filteredItems.length} records to Microsoft Excel.`);
    setIsExportMenuOpen(false);
  };

  // 11. Backup Import
  const handleImportBackup = async (file: File) => {
    const text = await file.text();
    const importedVault = parseImportedVaultFile(text);

    await saveEncryptedVaultToStorage(importedVault);
    setStoredVault(importedVault);
    setMetadata(importedVault.meta);
    setIsUnlocked(false);
    setCryptoKey(null);

    addToast('success', 'Backup File Loaded', 'Please enter the Master Password for this backup to unlock.');
  };

  // 12. Change Master Password
  const handleChangePassword = async (oldPass: string, newPass: string, newHint?: string): Promise<boolean> => {
    if (!metadata || !cryptoKey) return false;

    // Verify old password
    const saltBytes = base64ToArrayBuffer(metadata.salt);
    const oldKey = await deriveKeyFromPassword(oldPass, saltBytes);
    const isValid = await verifyMasterKey(oldKey, metadata.verifier, metadata.verifierIv);
    if (!isValid) return false;

    // Derive new key with new random salt
    const newSalt = generateRandomBytes(16);
    const newKey = await deriveKeyFromPassword(newPass, newSalt);
    const { verifier: newVerifier, verifierIv: newVerifierIv } = await createVerifier(newKey);

    const updatedMeta: VaultMetadata = {
      ...metadata,
      salt: arrayBufferToBase64(newSalt),
      verifier: newVerifier,
      verifierIv: newVerifierIv,
      passwordHint: newHint,
      updatedAt: Date.now(),
    };

    setMetadata(updatedMeta);
    setCryptoKey(newKey);

    // Re-encrypt all items with new key
    await persistVaultItems(items, newKey);
    addToast('success', 'Master Password Changed', 'Vault has been re-encrypted with your new cryptographic key.');
    return true;
  };

  // 13. Auto-Lock Duration Update
  const handleUpdateAutoLock = async (minutes: number) => {
    if (!metadata) return;
    const updatedMeta = { ...metadata, autoLockMinutes: minutes };
    setMetadata(updatedMeta);
    setAutoLockSeconds(minutes * 60);

    if (storedVault && cryptoKey) {
      const updatedStored = { ...storedVault, meta: updatedMeta };
      await saveEncryptedVaultToStorage(updatedStored);
      setStoredVault(updatedStored);
    }
    addToast('info', 'Auto-Lock Updated', minutes === 0 ? 'Auto-lock disabled.' : `Auto-lock set to ${minutes} minutes.`);
  };

  // 14. Purge All Data
  const handlePurgeVault = async () => {
    await deleteEncryptedVaultFromStorage();
    setStoredVault(null);
    setMetadata(null);
    setCryptoKey(null);
    setItems([]);
    setIsUnlocked(false);
    setSelectedItemId(null);
    setIsSettingsOpen(false);
    addToast('info', 'Vault Purged', 'All local vault keys and records have been deleted.');
  };

  // Filter & Search Logic
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Category filter
      if (currentFilter === 'favorites') {
        if (!item.favorite) return false;
      } else if (currentFilter === 'expiring') {
        let dateStr: string | undefined = item.expiresAt;
        if (!dateStr && item.category === 'document') dateStr = item.expiryDate;
        if (!dateStr && item.category === 'identity') dateStr = item.expiryDate;
        if (!dateStr && item.category === 'card' && item.expiryYear && item.expiryMonth) {
          dateStr = `${item.expiryYear}-${item.expiryMonth.padStart(2, '0')}-01`;
        }
        if (!dateStr) return false;
        const expiry = new Date(dateStr).getTime();
        const diffDays = (expiry - Date.now()) / (1000 * 60 * 60 * 24);
        if (diffDays > 90) return false;
      } else if (currentFilter !== 'all') {
        if (item.category !== currentFilter) return false;
      }

      // Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = item.title.toLowerCase().includes(q);
        const tagsMatch = item.tags?.some((t) => t.toLowerCase().includes(q));
        const notesMatch = item.notes?.toLowerCase().includes(q);

        let categoryMatch = false;
        if (item.category === 'login') {
          categoryMatch = item.username.toLowerCase().includes(q) || (item.url?.toLowerCase().includes(q) ?? false);
        } else if (item.category === 'document') {
          categoryMatch = (item.docNumber?.toLowerCase().includes(q) ?? false) || item.docType.toLowerCase().includes(q);
        } else if (item.category === 'identity') {
          categoryMatch = item.fullName.toLowerCase().includes(q) || item.idNumber.toLowerCase().includes(q);
        } else if (item.category === 'card') {
          categoryMatch = item.cardholderName.toLowerCase().includes(q) || item.cardNumber.includes(q);
        } else if (item.category === 'note') {
          categoryMatch = item.content.toLowerCase().includes(q);
        }

        return titleMatch || tagsMatch || notesMatch || categoryMatch;
      }

      return true;
    });
  }, [items, currentFilter, searchQuery]);

  const selectedItem = useMemo(() => {
    return items.find((i) => i.id === selectedItemId) || null;
  }, [items, selectedItemId]);

  // Overall Health Score
  const healthScore = useMemo(() => {
    const logins = items.filter((i) => i.category === 'login');
    if (logins.length === 0) return 100;

    let score = 100;
    const weakCount = logins.filter((i) => {
      const pwd = (i as any).password;
      return !pwd || pwd.length < 12;
    }).length;

    const noTotp = logins.filter((i) => !(i as any).totpSecret).length;

    score -= Math.min(40, weakCount * 10);
    score -= Math.min(20, noTotp * 4);
    return Math.max(20, score);
  }, [items]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-sm">
        Initializing Personal Vault...
      </div>
    );
  }

  // If vault is locked or not configured
  if (!isUnlocked) {
    return (
      <>
        <VaultLockScreen
          isConfigured={!!storedVault?.meta?.isConfigured}
          passwordHint={storedVault?.meta?.passwordHint}
          onUnlock={handleUnlockVault}
          onCreateVault={handleCreateVault}
          onImportBackup={handleImportBackup}
          onResetVault={handlePurgeVault}
          currentUser={currentUser}
          onGoogleSignIn={handleGoogleSignIn}
          onSignOut={handleSignOut}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  // Main Dashboard View (Unlocked)
  return (
    <div id="personal-vault-app" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* Top Header */}
      <VaultHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddNew={(category) => setEditorState({ isOpen: true, initialCategory: category })}
        onOpenGenerator={() => setIsGeneratorOpen(true)}
        onOpenAudit={() => setIsAuditOpen(true)}
        onOpenPythonTerminal={() => setIsPythonTerminalOpen(true)}
        onOpenArchive={() => setIsMonthlyArchiveOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLockVault={handleLockVault}
        healthScore={healthScore}
        autoLockSecondsRemaining={autoLockSeconds}
        userEmail={currentUser?.email || null}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <VaultSidebar
          currentFilter={currentFilter}
          onSelectFilter={(filter) => {
            setCurrentFilter(filter);
            // On mobile if selecting filter, keep view clean
          }}
          items={items}
        />

        {/* Center Items List */}
        <main className="flex-1 flex flex-col min-w-0 border-r border-slate-800/80 bg-slate-950">
          <div className="p-3 sm:p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/80 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                {currentFilter === 'all'
                  ? 'All Items'
                  : currentFilter === 'favorites'
                  ? 'Favorite Items'
                  : currentFilter === 'expiring'
                  ? 'Expiring Items'
                  : `${currentFilter}s`}
              </h2>
              <span className="text-xs text-slate-500 font-mono">
                ({filteredItems.length})
              </span>
            </div>

            <div className="flex items-center gap-2 relative">
              {searchQuery && (
                <span className="hidden sm:inline text-xs text-cyan-400 truncate max-w-xs">
                  Results for "{searchQuery}"
                </span>
              )}

              {/* Quick Bulk Export Dropdown */}
              <div className="relative">
                <button
                  id="btn-quick-export-menu"
                  onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                  title="Bulk Export Database in CSV or Excel format"
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs text-slate-200 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden xs:inline">Export</span>
                  <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isExportMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-20" 
                      onClick={() => setIsExportMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl z-30 p-2 text-xs divide-y divide-slate-800">
                      <div className="pb-1.5 px-2">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          Bulk Database Export
                        </span>
                      </div>
                      <div className="py-1 space-y-0.5">
                        <button
                          id="btn-export-all-csv"
                          onClick={handleExportAllCSV}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center justify-between cursor-pointer group"
                        >
                          <span className="flex items-center gap-2">
                            <Download className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Export All as CSV (.csv)</span>
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 group-hover:text-slate-400">
                            {items.length}
                          </span>
                        </button>
                        <button
                          id="btn-export-all-excel"
                          onClick={handleExportAllExcel}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center justify-between cursor-pointer group"
                        >
                          <span className="flex items-center gap-2">
                            <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Export All as Excel (.xls)</span>
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 group-hover:text-slate-400">
                            {items.length}
                          </span>
                        </button>
                      </div>
                      {(currentFilter !== 'all' || searchQuery) && (
                        <div className="py-1 space-y-0.5">
                          <button
                            id="btn-export-filtered-csv"
                            onClick={handleExportFilteredCSV}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 flex items-center justify-between cursor-pointer group"
                          >
                            <span className="flex items-center gap-2">
                              <Download className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Export Filtered as CSV</span>
                            </span>
                            <span className="text-[10px] font-mono text-cyan-400">
                              {filteredItems.length}
                            </span>
                          </button>
                          <button
                            id="btn-export-filtered-excel"
                            onClick={handleExportFilteredExcel}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 flex items-center justify-between cursor-pointer group"
                          >
                            <span className="flex items-center gap-2">
                              <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Export Filtered as Excel</span>
                            </span>
                            <span className="text-[10px] font-mono text-cyan-400">
                              {filteredItems.length}
                            </span>
                          </button>
                        </div>
                      )}
                      <div className="pt-1">
                        <button
                          id="btn-open-full-export-modal"
                          onClick={() => {
                            setIsExportMenuOpen(false);
                            setIsSettingsOpen(true);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-cyan-400 text-[11px] font-medium flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>Open Full Export Studio...</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <VaultItemList
            items={filteredItems}
            selectedItemId={selectedItemId}
            onSelectItem={(item) => setSelectedItemId(item.id)}
            onToggleFavorite={handleToggleFavorite}
            onCopyText={handleCopyText}
            searchQuery={searchQuery}
          />
        </main>

        {/* Right Detail Pane (Desktop side-by-side, Mobile Drawer) */}
        <div className={`${selectedItemId ? 'flex' : 'hidden md:flex'} w-full md:w-96 lg:w-[460px] flex-col shrink-0`}>
          <VaultItemDetail
            item={selectedItem}
            onClose={() => setSelectedItemId(null)}
            onEdit={(item) => setEditorState({ isOpen: true, item })}
            onDelete={handleDeleteItem}
            onToggleFavorite={handleToggleFavorite}
            onCopyText={handleCopyText}
          />
        </div>
      </div>

      {/* Modals */}
      {editorState.isOpen && (
        <VaultItemEditor
          item={editorState.item}
          initialCategory={editorState.initialCategory}
          onSave={handleSaveItem}
          onClose={() => setEditorState({ isOpen: false })}
        />
      )}

      {isGeneratorOpen && (
        <PasswordGeneratorModal
          isOpen={isGeneratorOpen}
          onClose={() => setIsGeneratorOpen(false)}
          onCopyText={handleCopyText}
        />
      )}

      {isAuditOpen && (
        <SecurityAuditModal
          isOpen={isAuditOpen}
          onClose={() => setIsAuditOpen(false)}
          items={items}
          onSelectItem={(item) => {
            setSelectedItemId(item.id);
            setIsAuditOpen(false);
          }}
        />
      )}

      {isSettingsOpen && metadata && (
        <BackupSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          metadata={metadata}
          items={items}
          onExportBackup={handleExportBackup}
          onImportBackup={handleImportBackup}
          onChangePassword={handleChangePassword}
          onUpdateAutoLock={handleUpdateAutoLock}
          onPurgeVault={handlePurgeVault}
        />
      )}

      {isPythonTerminalOpen && (
        <PythonTerminalModal
          isOpen={isPythonTerminalOpen}
          onClose={() => setIsPythonTerminalOpen(false)}
          onCopyText={handleCopyText}
        />
      )}

      {isMonthlyArchiveOpen && (
        <MonthlyArchiveModal
          isOpen={isMonthlyArchiveOpen}
          onClose={() => setIsMonthlyArchiveOpen(false)}
          items={items}
          userEmail={currentUser?.email || 'admin@boreddy.com'}
          userId={currentUser?.uid}
          onSuccessToast={(msg) => addToast('success', 'Monthly Archive', msg)}
        />
      )}

      {/* Floating Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
