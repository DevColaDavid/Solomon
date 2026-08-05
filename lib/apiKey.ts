import { randomBytes, createHash } from "crypto";

const PREFIX_LEN = 10; // "sk_live_" + 2 chars, enough to recognize a key in a list without exposing it

export function generateApiKey(): { key: string; keyHash: string; keyPrefix: string } {
  const key = `sk_live_${randomBytes(24).toString("base64url")}`;
  return { key, keyHash: hashApiKey(key), keyPrefix: key.slice(0, PREFIX_LEN) };
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}
