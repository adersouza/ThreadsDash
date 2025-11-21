/**
 * Encryption Service for Cloud Functions
 *
 * Node.js version of encryption/decryption for Instagram tokens
 * Uses Node.js crypto module instead of Web Crypto API
 */

import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Get encryption key from environment or use default
 */
function getEncryptionKey(): Buffer {
  const keyMaterial = process.env.ENCRYPTION_KEY || 'default-key-change-in-production-123456789012';
  // Ensure key is exactly 32 bytes for AES-256
  return Buffer.from(keyMaterial.padEnd(32, '0').substring(0, 32));
}

/**
 * Decrypt AES-GCM encrypted string
 */
export async function decrypt(ciphertext: string): Promise<string> {
  try {
    const key = getEncryptionKey();

    // Decode from base64
    const combined = Buffer.from(ciphertext, 'base64');

    // Extract IV, encrypted data, and auth tag
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH);
    const encryptedData = combined.subarray(IV_LENGTH, combined.length - AUTH_TAG_LENGTH);

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt
    const decrypted = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final()
    ]);

    return decrypted.toString('utf-8');
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Encrypt string using AES-GCM
 */
export async function encrypt(plaintext: string): Promise<string> {
  try {
    const key = getEncryptionKey();

    // Generate random IV
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf-8'),
      cipher.final()
    ]);

    // Get auth tag
    const authTag = cipher.getAuthTag();

    // Combine IV + encrypted data + auth tag
    const combined = Buffer.concat([iv, encrypted, authTag]);

    // Convert to base64
    return combined.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}
