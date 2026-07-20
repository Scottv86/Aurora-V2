import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const SECRET_KEY = process.env.ENCRYPTION_SECRET || process.env.JWT_SECRET || 'aurora-byok-default-secure-secret-key-32chars!';

// Ensure master key is 32 bytes
const getMasterKey = (): Buffer => {
  return crypto.createHash('sha256').update(SECRET_KEY).digest();
};

export interface EncryptedData {
  encryptedKey: string; // Format: "iv:authTag:encryptedContent"
  keyHint: string;
}

/**
 * Encrypts a sensitive API key using AES-256-GCM
 */
export function encryptSecret(plainText: string): EncryptedData {
  const iv = crypto.randomBytes(16);
  const masterKey = getMasterKey();
  const cipher = crypto.createCipheriv(ALGORITHM, masterKey, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');
  const encryptedKey = `${iv.toString('hex')}:${authTag}:${encrypted}`;

  return {
    encryptedKey,
    keyHint: generateKeyHint(plainText)
  };
}

/**
 * Decrypts an AES-256-GCM encrypted API key string
 */
export function decryptSecret(encryptedKey: string): string {
  try {
    const parts = encryptedKey.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted key payload structure');
    }

    const [ivHex, authTagHex, encryptedText] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const masterKey = getMasterKey();

    const decipher = crypto.createDecipheriv(ALGORITHM, masterKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error: any) {
    console.error('[Crypto] Decryption failed:', error.message);
    throw new Error('Failed to decrypt secret payload');
  }
}

/**
 * Generates a masked hint string (e.g. "sk-proj-...4a9f")
 */
export function generateKeyHint(secret: string): string {
  if (!secret) return '****';
  const clean = secret.trim();
  if (clean.length <= 8) {
    return `${clean.slice(0, 2)}...${clean.slice(-2)}`;
  }
  return `${clean.slice(0, 7)}...${clean.slice(-4)}`;
}
