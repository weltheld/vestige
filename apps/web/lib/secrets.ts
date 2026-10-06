import "server-only";
import { createCipheriv, createDecipheriv, createHmac, hkdfSync } from "node:crypto";

/**
 * Encryption for secrets stored in the database (users' AI API keys).
 *
 * AES-256-GCM with a key derived from APP_ENCRYPTION_KEY, which lives only in
 * the server environment — a database leak alone no longer exposes the keys.
 *
 * The IV is derived from the plaintext (HMAC) rather than random, so the same
 * key always encrypts to the same value. That is deliberate: "paste the same
 * key for a second campaign reuses one row" is an equality lookup on the
 * stored value, and a random IV would break it. The only thing this reveals
 * is that two stored values are equal, which is exactly what that lookup
 * already needs.
 *
 * Values are prefixed "enc1:". Anything without the prefix is a legacy
 * plaintext row and is returned unchanged by decryptSecret, so rows can be
 * migrated gradually.
 */
const PREFIX = "enc1:";

function keys() {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (!raw) throw new Error("APP_ENCRYPTION_KEY is not set.");
  const master = Buffer.from(raw, "base64");
  if (master.length !== 32) throw new Error("APP_ENCRYPTION_KEY must be 32 bytes, base64-encoded.");
  const derive = (label: string) =>
    Buffer.from(hkdfSync("sha256", master, Buffer.alloc(0), `vestige:${label}`, 32));
  return { enc: derive("enc"), iv: derive("iv") };
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(PREFIX);
}

export function encryptSecret(plaintext: string): string {
  if (isEncrypted(plaintext)) return plaintext;
  const { enc, iv: ivKey } = keys();
  const iv = createHmac("sha256", ivKey).update(plaintext).digest().subarray(0, 12);
  const cipher = createCipheriv("aes-256-gcm", enc, iv);
  const body = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64");
}

export function decryptSecret(stored: string): string {
  if (!isEncrypted(stored)) return stored;
  const { enc } = keys();
  const buf = Buffer.from(stored.slice(PREFIX.length), "base64");
  const decipher = createDecipheriv("aes-256-gcm", enc, buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
}
