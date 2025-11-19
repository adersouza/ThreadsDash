/**
 * Encryption Service
 *
 * Encrypts and decrypts sensitive data like Instagram tokens
 * Uses Web Crypto API for browser-based encryption
 */

const ALGORITHM = 'AES-GCM';

/**
 * Get or generate encryption key
 * In production, this should be stored securely (e.g., environment variable)
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  // For demo purposes, using a deterministic key
  // In production, use a secure key from environment variables
  const keyMaterial = import.meta.env.VITE_ENCRYPTION_KEY || 'default-key-change-in-production-123456789012';

  const enc = new TextEncoder();
  const keyData = enc.encode(keyMaterial.padEnd(32, '0').substring(0, 32));

  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: ALGORITHM },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a string
 */
export async function encrypt(plaintext: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const enc = new TextEncoder();
    const data = enc.encode(plaintext);

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encryptedData = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv,
      },
      key,
      data
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedData), iv.length);

    // Convert to base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt a string
 */
export async function decrypt(ciphertext: string): Promise<string> {
  try {
    const key = await getEncryptionKey();

    // Decode from base64
    const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decryptedData = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv,
      },
      key,
      data
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedData);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Synchronous encryption fallback (less secure)
 * Use only when async is not available
 */
export function encryptSync(plaintext: string): string {
  // Simple base64 encoding (NOT SECURE - use only for development)
  console.warn('Using insecure synchronous encryption. Use async encrypt() in production.');
  return btoa(plaintext);
}

/**
 * Synchronous decryption fallback (less secure)
 * Use only when async is not available
 */
export function decryptSync(ciphertext: string): string {
  // Simple base64 decoding (NOT SECURE - use only for development)
  console.warn('Using insecure synchronous decryption. Use async decrypt() in production.');
  try {
    return atob(ciphertext);
  } catch {
    // If it's not base64, return as-is
    return ciphertext;
  }
}
