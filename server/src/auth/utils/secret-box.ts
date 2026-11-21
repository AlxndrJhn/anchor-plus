import * as crypto from 'crypto';

const PREFIX = 'v1:';
const IV_BYTES = 12;
const TAG_BYTES = 16;

/**
 * Seals short secrets (an authenticator app's key) with AES-256-GCM, so a copy
 * of the database alone can't make sign-in codes. The key comes from
 * JWT_SECRET by HKDF, so nothing new needs setting up; changing JWT_SECRET
 * makes sealed secrets unreadable, and people then sign in with a recovery
 * code and set their app up again.
 */
export class SecretBox {
  private readonly key: Buffer;

  constructor(serverSecret: string, purpose: string) {
    this.key = Buffer.from(
      crypto.hkdfSync(
        'sha256',
        serverSecret,
        Buffer.alloc(0),
        `anchor:${purpose}`,
        32,
      ),
    );
  }

  static isSealed(value: string) {
    return value.startsWith(PREFIX);
  }

  seal(plain: string): string {
    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    return (
      PREFIX + Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64')
    );
  }

  /**
   * The secret in [value], or null when it was sealed with another key. A
   * value from before sealing is passed through as it is.
   */
  open(value: string): string | null {
    if (!SecretBox.isSealed(value)) return value;
    const raw = Buffer.from(value.slice(PREFIX.length), 'base64');
    if (raw.length < IV_BYTES + TAG_BYTES) return null;
    try {
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        this.key,
        raw.subarray(0, IV_BYTES),
      );
      decipher.setAuthTag(raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
      return Buffer.concat([
        decipher.update(raw.subarray(IV_BYTES + TAG_BYTES)),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      return null;
    }
  }
}
