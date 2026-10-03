/**
 * RFC 6238 Time-based One-Time Password (TOTP) generator
 * Implemented using standard Web Crypto API (SubtleCrypto HMAC-SHA1)
 * 100% offline, zero-cost, zero network requests.
 */

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function cleanBase32Key(raw: string): string {
  return raw.toUpperCase().replace(/[\s-]/g, '').replace(/=+$/, '');
}

export function isValidBase32(secret: string): boolean {
  const cleaned = cleanBase32Key(secret);
  if (!cleaned || cleaned.length < 8) return false;
  for (let i = 0; i < cleaned.length; i++) {
    if (!BASE32_CHARS.includes(cleaned[i])) return false;
  }
  return true;
}

export function base32ToUint8Array(base32: string): Uint8Array {
  const cleaned = cleanBase32Key(base32);
  let bits = '';
  for (let i = 0; i < cleaned.length; i++) {
    const val = BASE32_CHARS.indexOf(cleaned[i]);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }

  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.substring(i * 8, (i + 1) * 8), 2);
  }
  return bytes;
}

/**
 * Generates 6-digit TOTP code for a given base32 secret and timestamp
 */
export async function generateTotpCode(secret: string, timeSec: number = Math.floor(Date.now() / 1000)): Promise<string | null> {
  try {
    if (!isValidBase32(secret)) return null;
    const keyBytes = base32ToUint8Array(secret);
    if (keyBytes.length === 0) return null;

    const epoch = Math.floor(timeSec / 30);
    const timeBuffer = new ArrayBuffer(8);
    const timeView = new DataView(timeBuffer);
    // Big-endian 64-bit integer
    timeView.setUint32(0, 0, false);
    timeView.setUint32(4, epoch, false);

    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyBytes as BufferSource,
      { name: 'HMAC', hash: { name: 'SHA-1' } },
      false,
      ['sign']
    );

    const signature = await window.crypto.subtle.sign('HMAC', cryptoKey, timeBuffer);
    const hash = new Uint8Array(signature);

    const offset = hash[hash.length - 1] & 0x0f;
    const binary =
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);

    const otp = binary % 1000000;
    return otp.toString().padStart(6, '0');
  } catch (err) {
    console.error('TOTP generation failed', err);
    return null;
  }
}

/**
 * Returns remaining seconds in the current 30s cycle
 */
export function getTotpSecondsRemaining(nowMs: number = Date.now()): number {
  const currentSec = Math.floor(nowMs / 1000);
  return 30 - (currentSec % 30);
}
