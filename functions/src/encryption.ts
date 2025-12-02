/**
 * Encryption Service for Cloud Functions
 *
 * Implements AES-256-GCM encryption for securing sensitive data
 * Uses Node.js crypto module for production-grade encryption
 */

import * as crypto from 'crypto';
import * as functions from 'firebase-functions';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 bytes for GCM
const AUTH_TAG_LENGTH = 16; // 16 bytes for GCM
const SALT_LENGTH = 32; // 32 bytes for key derivation

/**
 * Get encryption key from environment
 * Throws error if not configured
 */
function getEncryptionKey(): string {
  // Try runtime config first (for deployed functions)
  const key = functions.config().encryption?.key || process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY not configured. Set with: firebase functions:config:set encryption.key="YOUR_KEY"'
    );
  }

  // Validate key is base64 and at least 32 bytes when decoded
  try {
    const decoded = Buffer.from(key, 'base64');
    if (decoded.length < 32) {
      throw new Error('Encryption key must be at least 32 bytes (256 bits)');
    }
  } catch (error) {
    throw new Error('Invalid encryption key format. Must be base64-encoded.');
  }

  return key;
}

/**
 * Derive a key from the master key using PBKDF2
 */
function deriveKey(masterKey: Buffer, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(masterKey, salt, 100000, 32, 'sha256');
}

/**
 * Encrypt plaintext using AES-256-GCM
 *
 * @param plaintext - The string to encrypt
 * @returns Base64-encoded ciphertext with format: salt:iv:authTag:encryptedData
 */
export async function encrypt(plaintext: string): Promise<string> {
  try {
    const masterKey = Buffer.from(getEncryptionKey(), 'base64');

    // Generate random salt for key derivation
    const salt = crypto.randomBytes(SALT_LENGTH);

    // Derive encryption key from master key
    const key = deriveKey(masterKey, salt);

    // Generate random IV
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt data
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Combine all components: salt:iv:authTag:encryptedData
    const combined = Buffer.concat([salt, iv, authTag, encrypted]);

    // Return as base64
    return combined.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error instanceof Error ? error.message : 'Unknown error');
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt ciphertext using AES-256-GCM
 *
 * @param ciphertext - Base64-encoded ciphertext
 * @returns Decrypted plaintext
 */
export async function decrypt(ciphertext: string): Promise<string> {
  try {
    const masterKey = Buffer.from(getEncryptionKey(), 'base64');

    // Decode from base64
    const combined = Buffer.from(ciphertext, 'base64');

    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = combined.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
    );
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

    // Derive decryption key from master key
    const key = deriveKey(masterKey, salt);

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt data
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    // Don't expose detailed error information
    console.error('Decryption error:', error instanceof Error ? error.message : 'Unknown error');
    throw new Error('Failed to decrypt data - the data may be corrupted or the encryption key may have changed');
  }
}

/**
 * Attempt to decrypt data that may be in old format (base64) or new format (AES-GCM)
 * This is a migration helper function
 *
 * @param ciphertext - Encrypted data in any format
 * @returns Decrypted plaintext
 */
export async function decryptWithFallback(ciphertext: string): Promise<string> {
  try {
    // Try new AES-GCM format first
    return await decrypt(ciphertext);
  } catch (error) {
    // Try old base64 format as fallback
    try {
      const decoded = Buffer.from(ciphertext, 'base64').toString('utf-8');

      // Validate that decoded data looks reasonable
      if (decoded.length > 20 && decoded.length < 500) {
        console.warn('Decrypted using legacy base64 format. Data should be re-encrypted.');
        return decoded;
      }

      throw new Error('Decoded data appears invalid');
    } catch (fallbackError) {
      console.error('Both decryption methods failed');
      throw new Error('Failed to decrypt token - please re-add your account');
    }
  }
}

/**
 * Generate a new encryption key
 * Run this locally to generate a new key for configuration
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('base64');
}
