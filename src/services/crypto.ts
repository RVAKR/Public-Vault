import { PasswordGeneratorOptions } from '../types';

const PBKDF2_ITERATIONS = 150000;
const AES_KEY_LENGTH = 256;
const VERIFIER_PLAINTEXT = 'PERSONAL_VAULT_DECRYPTION_VERIFIED_OK_2026';

// Common words for passphrase generation
const PASSPHRASE_WORDS = [
  'autumn', 'beacon', 'breeze', 'canyon', 'castle', 'clover', 'cobalt', 'cosmos',
  'crater', 'crystal', 'dolphin', 'ember', 'falcon', 'feather', 'forest', 'galaxy',
  'glacier', 'granite', 'harbor', 'haven', 'horizon', 'island', 'jungle', 'lagoon',
  'lantern', 'lotus', 'meadow', 'meteor', 'mirage', 'monarch', 'mosaic', 'nebula',
  'oasis', 'ocean', 'orchid', 'pebble', 'phoenix', 'planet', 'portal', 'prism',
  'quartz', 'quiver', 'radiant', 'rainbow', 'ravine', 'ripple', 'river', 'safari',
  'sahara', 'saffron', 'sapphire', 'shadow', 'shelter', 'shimmer', 'silver', 'solace',
  'solar', 'spiral', 'spring', 'starling', 'stellar', 'stream', 'summit', 'sunburst',
  'temple', 'thunder', 'timber', 'topaz', 'torrent', 'tundra', 'valley', 'velvet',
  'vessel', 'vortex', 'voyage', 'whisper', 'willow', 'zenith', 'zephyr', 'zodiac'
];

/**
 * Converts ArrayBuffer to Base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts Base64 string to Uint8Array
 */
export function base64ToArrayBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generates cryptographically secure random bytes
 */
export function generateRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  window.crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * Derives an AES-GCM 256-bit key from master password and salt using PBKDF2
 */
export async function deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts arbitrary UTF-8 string with AES-GCM
 */
export async function encryptData(plainText: string, key: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
  const iv = generateRandomBytes(12); // 96-bit IV recommended for AES-GCM
  const encoder = new TextEncoder();
  const encoded = encoder.encode(plainText);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource,
    },
    key,
    encoded
  );

  return {
    ciphertext: arrayBufferToBase64(encryptedBuffer),
    iv: arrayBufferToBase64(iv),
  };
}

/**
 * Decrypts AES-GCM ciphertext back to UTF-8 string
 */
export async function decryptData(ciphertext: string, iv: string, key: CryptoKey): Promise<string> {
  const cipherBytes = base64ToArrayBuffer(ciphertext);
  const ivBytes = base64ToArrayBuffer(iv);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes as BufferSource,
    },
    key,
    cipherBytes as BufferSource
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

/**
 * Creates verifier token to confirm correct master password without exposing secrets
 */
export async function createVerifier(key: CryptoKey): Promise<{ verifier: string; verifierIv: string }> {
  const { ciphertext, iv } = await encryptData(VERIFIER_PLAINTEXT, key);
  return { verifier: ciphertext, verifierIv: iv };
}

/**
 * Checks if the derived key can successfully decrypt the verifier
 */
export async function verifyMasterKey(key: CryptoKey, verifier: string, verifierIv: string): Promise<boolean> {
  try {
    const decrypted = await decryptData(verifier, verifierIv, key);
    return decrypted === VERIFIER_PLAINTEXT;
  } catch {
    return false;
  }
}

/**
 * Password Generator with multiple modes
 */
export function generatePassword(options: PasswordGeneratorOptions): string {
  if (options.mode === 'pin') {
    const len = Math.max(4, Math.min(12, options.length || 6));
    let pin = '';
    const bytes = generateRandomBytes(len);
    for (let i = 0; i < len; i++) {
      pin += (bytes[i] % 10).toString();
    }
    return pin;
  }

  if (options.mode === 'passphrase') {
    const count = options.wordCount || 4;
    const selected: string[] = [];
    const bytes = generateRandomBytes(count * 2);
    for (let i = 0; i < count; i++) {
      const index = ((bytes[i * 2] << 8) | bytes[i * 2 + 1]) % PASSPHRASE_WORDS.length;
      const word = PASSPHRASE_WORDS[index];
      // Capitalize first letter
      selected.push(word.charAt(0).toUpperCase() + word.slice(1));
    }
    // append a random 2-digit number and symbol for extra entropy
    const num = (generateRandomBytes(1)[0] % 90 + 10).toString();
    const symbols = ['!', '@', '#', '$', '%', '&', '*', '-'];
    const sym = symbols[generateRandomBytes(1)[0] % symbols.length];
    return selected.join('-') + sym + num;
  }

  // Random Character Mode
  let chars = '';
  const upper = options.avoidAmbiguous ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = options.avoidAmbiguous ? 'abcdefghijkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
  const digits = options.avoidAmbiguous ? '23456789' : '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  if (options.uppercase) chars += upper;
  if (options.lowercase) chars += lower;
  if (options.numbers) chars += digits;
  if (options.symbols) chars += symbols;

  if (!chars) chars = lower + digits;

  const length = Math.max(8, Math.min(64, options.length));
  const randomBytes = generateRandomBytes(length * 2);
  let result = '';

  for (let i = 0; i < length; i++) {
    const rand = (randomBytes[i * 2] << 8) | randomBytes[i * 2 + 1];
    result += chars[rand % chars.length];
  }

  return result;
}

/**
 * Calculates password entropy and strength score (0 to 100)
 */
export function calculatePasswordStrength(password: string): {
  score: number;
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong';
  color: string;
  feedback: string[];
} {
  if (!password) {
    return { score: 0, label: 'Very Weak', color: 'text-red-500', feedback: ['Password cannot be empty'] };
  }

  let poolSize = 0;
  if (/[a-z]/.test(password)) poolSize += 26;
  if (/[A-Z]/.test(password)) poolSize += 26;
  if (/[0-9]/.test(password)) poolSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) poolSize += 33;

  if (poolSize === 0) poolSize = 10;

  // Shannon entropy ~ L * log2(poolSize)
  const entropy = password.length * Math.log2(poolSize);
  const feedback: string[] = [];

  if (password.length < 12) {
    feedback.push(`Increase length (${password.length}/14+ characters)`);
  }
  if (!/[A-Z]/.test(password)) feedback.push('Add uppercase letters');
  if (!/[a-z]/.test(password)) feedback.push('Add lowercase letters');
  if (!/[0-9]/.test(password)) feedback.push('Add numbers');
  if (!/[^a-zA-Z0-9]/.test(password)) feedback.push('Add special symbols');

  let score = 0;
  let label: 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong' = 'Very Weak';
  let color = 'text-red-500';

  if (entropy < 35) {
    score = Math.min(25, Math.round((entropy / 35) * 25));
    label = 'Very Weak';
    color = 'text-red-500';
  } else if (entropy < 55) {
    score = Math.min(50, 25 + Math.round(((entropy - 35) / 20) * 25));
    label = 'Weak';
    color = 'text-amber-500';
  } else if (entropy < 75) {
    score = Math.min(75, 50 + Math.round(((entropy - 55) / 20) * 25));
    label = 'Fair';
    color = 'text-yellow-500';
  } else if (entropy < 95) {
    score = Math.min(90, 75 + Math.round(((entropy - 75) / 20) * 15));
    label = 'Strong';
    color = 'text-emerald-500';
  } else {
    score = Math.min(100, 90 + Math.round(((entropy - 95) / 30) * 10));
    label = 'Very Strong';
    color = 'text-teal-400';
  }

  return { score, label, color, feedback };
}
