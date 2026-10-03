export type VaultCategory = 'login' | 'document' | 'identity' | 'card' | 'note';

export type DocumentType = 
  | 'passport' 
  | 'id_card' 
  | 'driver_license' 
  | 'tax' 
  | 'insurance' 
  | 'contract' 
  | 'medical' 
  | 'certificate'
  | 'other';

export type CardType = 'visa' | 'mastercard' | 'amex' | 'discover' | 'other';

export interface EncryptedFileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string; // Base64 data url stored securely encrypted
  uploadedAt: number;
}

export interface CustomField {
  id: string;
  label: string;
  value: string;
  isMasked: boolean;
}

export interface BaseVaultItem {
  id: string;
  category: VaultCategory;
  title: string;
  favorite: boolean;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  expiresAt?: string; // YYYY-MM-DD format for credential expiration
  notes?: string;
  customFields?: CustomField[];
}

export interface LoginVaultItem extends BaseVaultItem {
  category: 'login';
  username: string;
  password?: string;
  url?: string;
  totpSecret?: string;
  passwordHistory?: Array<{ password: string; changedAt: number }>;
}

export interface DocumentVaultItem extends BaseVaultItem {
  category: 'document';
  docType: DocumentType;
  docNumber?: string;
  issuer?: string;
  issueDate?: string;
  expiryDate?: string;
  attachments: EncryptedFileAttachment[];
}

export interface IdentityVaultItem extends BaseVaultItem {
  category: 'identity';
  fullName: string;
  idType: string;
  idNumber: string;
  dateOfBirth?: string;
  nationality?: string;
  expiryDate?: string;
  taxNumber?: string;
  emergencyContact?: string;
  attachments?: EncryptedFileAttachment[];
}

export interface CardVaultItem extends BaseVaultItem {
  category: 'card';
  cardholderName: string;
  cardNumber: string;
  cardType: CardType;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  pin?: string;
  billingAddress?: string;
  bank?: string;
}

export interface NoteVaultItem extends BaseVaultItem {
  category: 'note';
  content: string;
  folder?: string;
}

export type VaultItem = 
  | LoginVaultItem 
  | DocumentVaultItem 
  | IdentityVaultItem 
  | CardVaultItem 
  | NoteVaultItem;

export interface VaultMetadata {
  isConfigured: boolean;
  salt: string; // Base64 salt for PBKDF2
  verifier: string; // Encrypted known token to verify master password
  verifierIv: string;
  passwordHint?: string;
  autoLockMinutes: number;
  lastActive: number;
  version: number;
  updatedAt: number;
}

export interface VaultPayload {
  items: VaultItem[];
  folders?: string[];
  updatedAt: number;
}

export interface StoredEncryptedVault {
  meta: VaultMetadata;
  ciphertext: string; // Base64 AES-GCM encrypted VaultPayload
  iv: string;         // Base64 IV
}

export interface PasswordGeneratorOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  avoidAmbiguous: boolean;
  mode: 'random' | 'passphrase' | 'pin';
  wordCount?: number;
}

export interface SecurityAuditResult {
  totalItems: number;
  healthScore: number;
  weakPasswords: VaultItem[];
  reusedPasswords: { password: string; items: VaultItem[] }[];
  expiringItems: { item: VaultItem; daysRemaining: number; isExpired: boolean }[];
  missingTotpLogins: VaultItem[];
}
