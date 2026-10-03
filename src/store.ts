/**
 * store.ts — Vault data model and encrypted persistence
 *
 * All credential data lives only in memory while unlocked.
 * The only thing saved to localStorage is the encrypted blob.
 */

import { encrypt, decrypt, hashPassword, verifyPassword } from './crypto';

// ── types ──────────────────────────────────────────────────────────────────

export interface Credential {
  id: string;
  category: string;
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;      // optional expiry timestamp
  lastVisitedAt?: number;  // tracks when credential was last viewed
}

export type CredentialInput = Omit<Credential, 'id' | 'createdAt' | 'updatedAt' | 'lastVisitedAt'>;

export interface ArchivedCredential {
  id: string;
  category: string;
  title: string;
  username: string;
  url: string;
  notes: string;
  archivedAt: number;      // when it was archived (expired)
  originalCreatedAt: number;
  originalExpiresAt: number;
}

export interface VaultHeader {
  version: 2;
  passwordHash: string;   // encrypted verification token
  data: string;           // AES-256-GCM encrypted JSON of Credential[]
  archive: string;        // AES-256-GCM encrypted JSON of ArchivedCredential[]
  updatedAt: number;
}

// ── helpers ────────────────────────────────────────────────────────────────

const LS_KEY = 'public_vault';

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function loadHeader(): VaultHeader | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveHeader(h: VaultHeader) {
  localStorage.setItem(LS_KEY, JSON.stringify(h));
}

// ── VaultStore ─────────────────────────────────────────────────────────────

export class VaultStore {
  private _pass = '';
  private _creds: Credential[] = [];
  private _archived: ArchivedCredential[] = [];
  private _header: VaultHeader | null = null;
  private _unlocked = false;

  // ── state ────────────────────────────────────────────────────────────────

  get isUnlocked() { return this._unlocked; }
  get isSetup()    { return loadHeader() !== null; }
  get count()      { return this._creds.length; }

  // ── vault lifecycle ──────────────────────────────────────────────────────

  /** First-time setup: create a new encrypted vault. */
  async setup(password: string): Promise<void> {
    const passwordHash = await hashPassword(password);
    const data = await encrypt(JSON.stringify([]), password);
    const archive = await encrypt(JSON.stringify([]), password);
    this._header = { version: 2, passwordHash, data, archive, updatedAt: Date.now() };
    saveHeader(this._header);
    this._pass = password;
    this._creds = [];
    this._archived = [];
    this._unlocked = true;
  }

  /** Unlock an existing vault. Returns false if password is wrong. */
  async unlock(password: string): Promise<boolean> {
    this._header = loadHeader();
    if (!this._header) return false;

    const ok = await verifyPassword(password, this._header.passwordHash);
    if (!ok) return false;

    try {
      this._creds = JSON.parse(await decrypt(this._header.data, password));
      
      // Load archive if it exists (backward compatibility)
      if (this._header.archive) {
        this._archived = JSON.parse(await decrypt(this._header.archive, password));
      } else {
        this._archived = [];
      }
      
      // Auto-archive expired credentials on unlock
      await this._autoArchiveExpired();
      
      this._pass = password;
      this._unlocked = true;
      return true;
    } catch {
      return false;
    }
  }

  /** Lock: wipe all sensitive data from memory. */
  lock(): void {
    this._pass = '';
    this._creds = [];
    this._archived = [];
    this._unlocked = false;
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────

  list(query = ''): Credential[] {
    if (!query) return [...this._creds];
    const q = query.toLowerCase();
    return this._creds.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.username.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.url.toLowerCase().includes(q)
    );
  }

  getById(id: string): Credential | undefined {
    const cred = this._creds.find((c) => c.id === id);
    if (cred) {
      // Update last visited timestamp
      cred.lastVisitedAt = Date.now();
      this._persist();
    }
    return cred;
  }

  async add(input: CredentialInput): Promise<Credential> {
    const now = Date.now();
    const cred: Credential = { ...input, id: uid(), createdAt: now, updatedAt: now };
    this._creds.push(cred);
    await this._persist();
    return cred;
  }

  async update(id: string, input: Partial<CredentialInput>): Promise<Credential | null> {
    const i = this._creds.findIndex((c) => c.id === id);
    if (i === -1) return null;
    this._creds[i] = { ...this._creds[i], ...input, updatedAt: Date.now() };
    await this._persist();
    return this._creds[i];
  }

  async remove(id: string): Promise<boolean> {
    const i = this._creds.findIndex((c) => c.id === id);
    if (i === -1) return false;
    this._creds.splice(i, 1);
    await this._persist();
    return true;
  }

  categories(): string[] {
    return [...new Set(this._creds.map((c) => c.category).filter(Boolean))].sort();
  }

  // ── archive management ────────────────────────────────────────────────────

  /** Get archived credentials (expired ones with secrets removed). */
  getArchived(): ArchivedCredential[] {
    return [...this._archived];
  }

  /** Find archived credential by title (for auto-fill). */
  findArchivedByTitle(title: string): ArchivedCredential | undefined {
    return this._archived.find((a) => a.title.toLowerCase() === title.toLowerCase());
  }

  /** Manually archive a credential (remove secrets, keep metadata). */
  async archiveCredential(id: string): Promise<boolean> {
    const i = this._creds.findIndex((c) => c.id === id);
    if (i === -1) return false;

    const cred = this._creds[i];
    const archived: ArchivedCredential = {
      id: uid(),
      category: cred.category,
      title: cred.title,
      username: cred.username,
      url: cred.url,
      notes: cred.notes,
      archivedAt: Date.now(),
      originalCreatedAt: cred.createdAt,
      originalExpiresAt: cred.expiresAt || 0,
    };

    this._archived.push(archived);
    this._creds.splice(i, 1);
    await this._persist();
    return true;
  }

  /** Delete an archived credential permanently. */
  async deleteArchived(id: string): Promise<boolean> {
    const i = this._archived.findIndex((a) => a.id === id);
    if (i === -1) return false;
    this._archived.splice(i, 1);
    await this._persist();
    return true;
  }

  /** Auto-archive expired credentials (called on unlock). */
  private async _autoArchiveExpired(): Promise<void> {
    const now = Date.now();
    const expired = this._creds.filter((c) => c.expiresAt && c.expiresAt < now);
    
    if (expired.length === 0) return;

    for (const cred of expired) {
      const archived: ArchivedCredential = {
        id: uid(),
        category: cred.category,
        title: cred.title,
        username: cred.username,
        url: cred.url,
        notes: cred.notes,
        archivedAt: now,
        originalCreatedAt: cred.createdAt,
        originalExpiresAt: cred.expiresAt || 0,
      };
      this._archived.push(archived);
    }

    // Remove expired from active credentials
    this._creds = this._creds.filter((c) => !c.expiresAt || c.expiresAt >= now);
    await this._persist();
  }

  // ── import / export ───────────────────────────────────────────────────────

  /** Export the encrypted vault JSON (safe to commit to GitHub). */
  exportEncrypted(): string {
    const h = loadHeader();
    if (!h) throw new Error('No vault data');
    return JSON.stringify(h, null, 2);
  }

  /** Import a previously exported encrypted JSON. */
  importEncrypted(json: string): void {
    const h: VaultHeader = JSON.parse(json);
    if (h.version !== 2 || !h.passwordHash || !h.data) {
      throw new Error('Invalid vault file');
    }
    saveHeader(h);
    this.lock();
  }

  /** Export plaintext credentials as JSON (for emergency backup). */
  exportPlaintext(): string {
    if (!this._unlocked) throw new Error('Vault is locked');
    return JSON.stringify(this._creds, null, 2);
  }

  /** Change master password — re-encrypts everything. */
  async changeMasterPassword(oldPwd: string, newPwd: string): Promise<boolean> {
    this._header = loadHeader();
    if (!this._header) return false;
    const ok = await verifyPassword(oldPwd, this._header.passwordHash);
    if (!ok) return false;
    this._pass = newPwd;
    this._header.passwordHash = await hashPassword(newPwd);
    await this._persist();
    return true;
  }

  // ── private ────────────────────────────────────────────────────────────────

  private async _persist(): Promise<void> {
    if (!this._header || !this._pass) return;
    this._header.data = await encrypt(JSON.stringify(this._creds), this._pass);
    this._header.archive = await encrypt(JSON.stringify(this._archived), this._pass);
    this._header.updatedAt = Date.now();
    saveHeader(this._header);
  }
}

export const vault = new VaultStore();
