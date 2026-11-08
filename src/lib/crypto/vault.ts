import { argon2id } from "hash-wasm";

/**
 * Client-side vault encryption. Nothing in this file talks to the network:
 * the server only ever stores the `VaultRecord` and `Envelope` values, which
 * are useless without the master password or the recovery key.
 *
 * master password --Argon2id--> KEK --AES-GCM--> vault key --AES-GCM--> items
 */

export type KdfParams = {
  algo: "argon2id";
  memoryKiB: number;
  iterations: number;
  parallelism: number;
};

export type Envelope = { v: 1; iv: string; ct: string };

export type VaultRecord = {
  kdf: KdfParams;
  salt: string;
  wrappedByMaster: Envelope;
  wrappedByRecovery: Envelope;
};

export const DEFAULT_KDF: KdfParams = {
  algo: "argon2id",
  memoryKiB: 64 * 1024,
  iterations: 3,
  parallelism: 1,
};

const KEY_BYTES = 32;
const IV_BYTES = 12;
// These labels are bound into existing ciphertext: changing them makes every vault unreadable.
const WRAP_MASTER = "cloudvault:wrap:master";
const WRAP_RECOVERY = "cloudvault:wrap:recovery";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(length));
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function encode(value: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(encoder.encode(value));
}

function importAesKey(raw: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function seal(
  key: CryptoKey,
  plaintext: Uint8Array<ArrayBuffer>,
  context: string,
): Promise<Envelope> {
  const iv = randomBytes(IV_BYTES);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: encode(context) },
    key,
    plaintext,
  );
  return { v: 1, iv: toBase64(iv), ct: toBase64(new Uint8Array(ciphertext)) };
}

async function open(
  key: CryptoKey,
  envelope: Envelope,
  context: string,
): Promise<Uint8Array<ArrayBuffer>> {
  if (envelope.v !== 1) throw new Error("Unsupported envelope version");
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(envelope.iv), additionalData: encode(context) },
    key,
    fromBase64(envelope.ct),
  );
  return new Uint8Array(plaintext);
}

async function deriveMasterKey(
  masterPassword: string,
  salt: Uint8Array,
  kdf: KdfParams,
): Promise<CryptoKey> {
  const raw = await argon2id({
    password: masterPassword.normalize("NFKC"),
    salt,
    parallelism: kdf.parallelism,
    iterations: kdf.iterations,
    memorySize: kdf.memoryKiB,
    hashLength: KEY_BYTES,
    outputType: "binary",
  });
  return importAesKey(new Uint8Array(raw));
}

function formatRecoveryKey(bytes: Uint8Array): string {
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return hex.match(/.{1,8}/g)!.join("-").toUpperCase();
}

function parseRecoveryKey(recoveryKey: string): Uint8Array<ArrayBuffer> {
  const hex = recoveryKey.replace(/[\s-]/g, "").toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(hex)) throw new Error("Invalid recovery key format");
  return Uint8Array.from(hex.match(/.{2}/g)!, (pair) => parseInt(pair, 16));
}

/** Creates a new vault. Show `recoveryKey` once; it is never stored. */
export async function createVault(masterPassword: string, kdf: KdfParams = DEFAULT_KDF) {
  const salt = randomBytes(16);
  const vaultBytes = randomBytes(KEY_BYTES);
  const recoveryBytes = randomBytes(KEY_BYTES);

  const record: VaultRecord = {
    kdf,
    salt: toBase64(salt),
    wrappedByMaster: await seal(
      await deriveMasterKey(masterPassword, salt, kdf),
      vaultBytes,
      WRAP_MASTER,
    ),
    wrappedByRecovery: await seal(await importAesKey(recoveryBytes), vaultBytes, WRAP_RECOVERY),
  };

  return {
    record,
    vaultKey: await importAesKey(vaultBytes),
    recoveryKey: formatRecoveryKey(recoveryBytes),
  };
}

async function openWithMaster(masterPassword: string, record: VaultRecord) {
  const key = await deriveMasterKey(masterPassword, fromBase64(record.salt), record.kdf);
  return open(key, record.wrappedByMaster, WRAP_MASTER);
}

async function openWithRecovery(recoveryKey: string, record: VaultRecord) {
  const key = await importAesKey(parseRecoveryKey(recoveryKey));
  return open(key, record.wrappedByRecovery, WRAP_RECOVERY);
}

/** Rejects if the master password is wrong. */
export async function unlockWithMaster(masterPassword: string, record: VaultRecord) {
  return importAesKey(await openWithMaster(masterPassword, record));
}

/**
 * For the browser extension, whose popup is destroyed every time it closes.
 * The result is the decrypted vault key: keep it only in memory-backed storage.
 */
export async function unlockToRawKey(masterPassword: string, record: VaultRecord) {
  return toBase64(await openWithMaster(masterPassword, record));
}

export function importVaultKey(rawKey: string) {
  return importAesKey(fromBase64(rawKey));
}

/** Rejects if the recovery key is wrong. */
export async function unlockWithRecovery(recoveryKey: string, record: VaultRecord) {
  return importAesKey(await openWithRecovery(recoveryKey, record));
}

/** Sets a new master password after proving access with the recovery key. */
export async function resetMasterPassword(
  recoveryKey: string,
  newMasterPassword: string,
  record: VaultRecord,
): Promise<VaultRecord> {
  const vaultBytes = await openWithRecovery(recoveryKey, record);
  const salt = randomBytes(16);
  return {
    ...record,
    salt: toBase64(salt),
    wrappedByMaster: await seal(
      await deriveMasterKey(newMasterPassword, salt, record.kdf),
      vaultBytes,
      WRAP_MASTER,
    ),
  };
}

/** `itemId` is authenticated, so a ciphertext cannot be swapped between rows. */
export function encryptItem<T>(vaultKey: CryptoKey, itemId: string, item: T): Promise<Envelope> {
  return seal(vaultKey, encode(JSON.stringify(item)), `cloudvault:item:${itemId}`);
}

export async function decryptItem<T>(
  vaultKey: CryptoKey,
  itemId: string,
  envelope: Envelope,
): Promise<T> {
  const plaintext = await open(vaultKey, envelope, `cloudvault:item:${itemId}`);
  return JSON.parse(decoder.decode(plaintext)) as T;
}
