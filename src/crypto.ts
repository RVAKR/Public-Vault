/**
 * crypto.ts — AES-256-GCM encryption with PBKDF2 key derivation
 *
 * Security guarantees:
 *  - Master password → PBKDF2 (600,000 iterations, SHA-256) → 256-bit AES key
 *  - Each encrypt() call uses a fresh random salt (16B) + IV (12B)
 *  - AES-256-GCM is authenticated: any tampering on ciphertext throws on decrypt
 *  - The password is never stored; only a verification token (also encrypted) is kept
 */

const PBKDF2_ITERATIONS = 600_000;
const SALT_LEN = 16;
const IV_LEN = 12;

// ── helpers ────────────────────────────────────────────────────────────────

function bufToB64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function b64ToBuf(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const raw = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    raw,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// ── public API ─────────────────────────────────────────────────────────────

/**
 * Encrypt plaintext with a master password.
 * Output is base-64 encoded: [salt(16B)] [iv(12B)] [ciphertext]
 */
export async function encrypt(plaintext: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const iv   = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const key  = await deriveKey(password, salt);

  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext)
  );

  const blob = new Uint8Array(SALT_LEN + IV_LEN + cipher.byteLength);
  blob.set(salt, 0);
  blob.set(iv,   SALT_LEN);
  blob.set(new Uint8Array(cipher), SALT_LEN + IV_LEN);
  return bufToB64(blob.buffer);
}

/**
 * Decrypt a base-64 ciphertext. Throws if password is wrong or data is tampered.
 */
export async function decrypt(cipherB64: string, password: string): Promise<string> {
  const blob = b64ToBuf(cipherB64);
  const salt  = blob.slice(0, SALT_LEN);
  const iv    = blob.slice(SALT_LEN, SALT_LEN + IV_LEN);
  const cipher = blob.slice(SALT_LEN + IV_LEN);
  const key   = await deriveKey(password, salt);

  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
  return new TextDecoder().decode(plain);
}

/** Create a password-verification token (stored in vault header). */
export async function hashPassword(password: string): Promise<string> {
  return encrypt('__vault_ok__', password);
}

/** Returns true if password correctly decrypts the stored token. */
export async function verifyPassword(password: string, token: string): Promise<boolean> {
  try {
    return (await decrypt(token, password)) === '__vault_ok__';
  } catch {
    return false;
  }
}
