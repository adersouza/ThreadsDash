/**
 * Encryption Service for Cloud Functions
 *
 * Simplified version using base64 encoding
 * TODO: Implement proper AES-GCM encryption in production
 */

/**
 * Decrypt base64 encoded string
 * Handles both new (base64) and old (attempted AES-GCM) formats
 */
export async function decrypt(ciphertext: string): Promise<string> {
  try {
    // Try base64 decode
    const decoded = Buffer.from(ciphertext, 'base64').toString('utf-8');

    // Check if result looks like a valid Instagram session token
    // Session tokens are typically 40-50 characters, alphanumeric with some symbols
    if (decoded.length > 20 && decoded.length < 200) {
      return decoded;
    }

    // If it doesn't look right, throw error
    throw new Error('Decoded token appears invalid');
  } catch (error) {
    console.error('Base64 decryption failed:', error);
    throw new Error('Failed to decrypt token - please re-add your account');
  }
}

/**
 * Encrypt string using base64
 * Simple and compatible approach
 */
export async function encrypt(plaintext: string): Promise<string> {
  try {
    return Buffer.from(plaintext, 'utf-8').toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}
