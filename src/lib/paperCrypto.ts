/**
 * Encryption for pre-downloaded (offline) exam papers. Runs unchanged in the browser and in
 * Node (both expose WebCrypto as globalThis.crypto.subtle).
 *
 * The key is derived from the test's start code with PBKDF2, so a device can hold the paper
 * for an hour before the exam and still not read it until the invigilator announces the code,
 * even with no internet at that moment. The answer key is never part of the bundle.
 */

const ITERATIONS = 200_000;
const enc = new TextEncoder();
const dec = new TextDecoder();

export const normalizeStartCode = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, "");

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(s.length));
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function deriveKey(startCode: string, salt: string): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", enc.encode(normalizeStartCode(startCode)), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: enc.encode(`astra-paper:${salt}`), iterations: ITERATIONS },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export interface EncryptedPaper {
  v: 1;
  salt: string;
  iv: string;
  data: string;
}

export async function encryptPaper(payload: unknown, startCode: string, salt: string): Promise<EncryptedPaper> {
  const key = await deriveKey(startCode, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(payload))));
  return { v: 1, salt, iv: toBase64(iv), data: toBase64(data) };
}

/** Throws if the code is wrong (AES-GCM authenticates the data). */
export async function decryptPaper<T>(paper: EncryptedPaper, startCode: string): Promise<T> {
  const key = await deriveKey(startCode, paper.salt);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(paper.iv) }, key, fromBase64(paper.data));
  return JSON.parse(dec.decode(plain)) as T;
}
