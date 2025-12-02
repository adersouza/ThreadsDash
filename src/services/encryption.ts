/**
 * Encryption Service (Client-Side)
 *
 * Encrypts and decrypts sensitive data like Instagram tokens
 * Uses Web Crypto API for browser-based AES-GCM encryption
 */

const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12;

/**
 * Validate and get encryption key from environment
 * Throws error if not properly configured
 */
function validateEncryptionKey(): string {
  const key = import.meta.env.VITE_ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      'CRITICAL: VITE_ENCRYPTION_KEY not configured. ' +
      'Generate a key with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))" ' +
      'and add to .env file.'
    );
  }

  // Validate key is base64 format
  try {
    const decoded = atob(key);
    if (decoded.length < 32) {
      throw new Error('Encryption key must be at least 32 bytes (256 bits)');
    }
  } catch (error) {
    throw new Error(
      'Invalid VITE_ENCRYPTION_KEY format. Must be a base64-encoded string of at least 32 bytes. ' +
      'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
    );
  }

  return key;
}

/**
 * Get or generate encryption key from validated environment variable
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyMaterial = validateEncryptionKey();

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
 * Encrypt a string using AES-GCM
 *
 * @param plaintext - The string to encrypt
 * @returns Base64-encoded ciphertext with IV prepended
 */
export async function encrypt(plaintext: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const enc = new TextEncoder();
    const data = enc.encode(plaintext);

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Encryption error:', errorMessage);
    throw new Error(`Failed to encrypt data: ${errorMessage}`);
  }
}

/**
 * Decrypt a string using AES-GCM
 *
 * @param ciphertext - Base64-encoded ciphertext with IV prepended
 * @returns Decrypted plaintext
 */
export async function decrypt(ciphertext: string): Promise<string> {
  try {
    const key = await getEncryptionKey();

    // Decode from base64
    const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));

    // Extract IV and encrypted data
    const iv = combined.slice(0, IV_LENGTH);
    const data = combined.slice(IV_LENGTH);

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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Decryption error:', errorMessage);
    throw new Error('Failed to decrypt data - the data may be corrupted or the encryption key may have changed');
  }
}

/**
 * Validate encryption configuration on app startup
 * Call this early in the application lifecycle
 */
export function validateEncryptionConfig(): void {
  try {
    validateEncryptionKey();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Encryption configuration validation failed:', errorMessage);
    throw error;
  }
}
