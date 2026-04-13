/**
 * Client-side decryption for protected item descriptions.
 *
 * Mirrors the encryption parameters used by scripts/encrypt-descriptions.ts
 * (PBKDF2-SHA256, 100k iterations, 32-byte salt, AES-256-GCM, 12-byte IV).
 * Web Crypto AES-GCM expects the ciphertext + auth tag concatenated in that
 * order, which matches how the build script emits the blob.
 */

export type DescriptionMap = Record<string, { desc: string }>;

// These constants MUST match scripts/encrypt-descriptions.ts.
const KEY_ITERATIONS = 100_000;
const HASH_ALGO = 'SHA-256';

/**
 * Convert a base64 string to a Uint8Array backed by a plain ArrayBuffer.
 * The explicit ArrayBuffer type parameter is required so TypeScript treats
 * the result as `BufferSource` — as of TS 5.7 the default `Uint8Array`
 * alias uses `ArrayBufferLike` which also covers `SharedArrayBuffer`,
 * which Web Crypto refuses to accept.
 */
function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  // atob is available in all modern browsers.
  const binary = atob(b64.trim());
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Encode a UTF-8 string into an ArrayBuffer-backed Uint8Array. */
function utf8(str: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(new ArrayBuffer(str.length * 3)); // upper bound
  const out = new TextEncoder().encodeInto(str, bytes);
  return bytes.subarray(0, out.written) as Uint8Array<ArrayBuffer>;
}

/** Derive a 256-bit AES-GCM key from the password + salt via PBKDF2. */
async function deriveKey(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    utf8(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: KEY_ITERATIONS,
      hash: HASH_ALGO,
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  );
}

/**
 * Fetch the encrypted blob + metadata and decrypt it.
 * Returns the parsed description map on success, or null on any failure
 * (missing files, wrong password, malformed data).
 *
 * The Vite base path (`import.meta.env.BASE_URL`) is prepended so this
 * works on both the custom-domain deploy (base: '/') and any future
 * subpath deploy.
 */
export async function decryptDescriptions(
  password: string,
): Promise<DescriptionMap | null> {
  try {
    const basePath = import.meta.env.BASE_URL || '/';
    const [encRes, metaRes] = await Promise.all([
      fetch(`${basePath}data/item-protected.enc`),
      fetch(`${basePath}data/item-protected.meta.json`),
    ]);
    if (!encRes.ok || !metaRes.ok) return null;

    const ciphertextB64 = await encRes.text();
    const meta = (await metaRes.json()) as { salt: string; iv: string };

    const salt = base64ToBytes(meta.salt);
    const iv = base64ToBytes(meta.iv);
    const ciphertextAndTag = base64ToBytes(ciphertextB64);

    const key = await deriveKey(password, salt);

    // Web Crypto AES-GCM automatically verifies the auth tag (which it
    // expects as the last 16 bytes of the ciphertext). A wrong password
    // → tag mismatch → this throws, caught by the outer try/catch.
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertextAndTag,
    );

    const text = new TextDecoder().decode(plaintext);
    return JSON.parse(text) as DescriptionMap;
  } catch {
    return null;
  }
}
