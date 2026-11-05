import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
/** AES-256-GCM for integration credentials at rest. ENCRYPTION_KEY = 32 bytes, base64 (openssl rand -base64 32). */
function key(): Buffer {
  const k = Buffer.from(process.env.ENCRYPTION_KEY ?? "", "base64");
  if (k.length !== 32) throw new Error("ENCRYPTION_KEY must be 32 bytes, base64-encoded.");
  return k;
}
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12), c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64"), c.getAuthTag().toString("base64"), enc.toString("base64")].join(":");
}
export function decryptSecret(blob: string): string {
  const [v, iv, tag, enc] = blob.split(":");
  if (v !== "v1" || !iv || !tag || !enc) throw new Error("Unsupported ciphertext format.");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(enc, "base64")), d.final()]).toString("utf8");
}
