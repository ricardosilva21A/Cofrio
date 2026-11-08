import { describe, expect, it } from "vitest";
import { generatePassword } from "./generator";
import {
  createVault,
  decryptItem,
  encryptItem,
  resetMasterPassword,
  unlockWithMaster,
  unlockWithRecovery,
  type KdfParams,
} from "./vault";

const FAST_KDF: KdfParams = { algo: "argon2id", memoryKiB: 1024, iterations: 1, parallelism: 1 };
const ITEM = { site: "example.com", username: "ana", password: "s3gredo-ção" };

describe("vault", () => {
  it("decrypts items after unlocking with the master password", async () => {
    const { record, vaultKey } = await createVault("master", FAST_KDF);
    const envelope = await encryptItem(vaultKey, "id-1", ITEM);
    const unlocked = await unlockWithMaster("master", record);
    await expect(decryptItem(unlocked, "id-1", envelope)).resolves.toEqual(ITEM);
  });

  it("does not leak plaintext into stored values", async () => {
    const { record, vaultKey } = await createVault("master", FAST_KDF);
    const stored = JSON.stringify([record, await encryptItem(vaultKey, "id-1", ITEM)]);
    expect(stored).not.toContain("example.com");
    expect(stored).not.toContain("master\"");
  });

  it("rejects a wrong master password", async () => {
    const { record } = await createVault("master", FAST_KDF);
    await expect(unlockWithMaster("wrong", record)).rejects.toThrow();
  });

  it("unlocks with the recovery key and rejects a wrong one", async () => {
    const { record, vaultKey, recoveryKey } = await createVault("master", FAST_KDF);
    const envelope = await encryptItem(vaultKey, "id-1", ITEM);
    const unlocked = await unlockWithRecovery(recoveryKey.toLowerCase(), record);
    await expect(decryptItem(unlocked, "id-1", envelope)).resolves.toEqual(ITEM);
    await expect(unlockWithRecovery("0".repeat(64), record)).rejects.toThrow();
  });

  it("resets the master password and keeps existing items readable", async () => {
    const { record, vaultKey, recoveryKey } = await createVault("old", FAST_KDF);
    const envelope = await encryptItem(vaultKey, "id-1", ITEM);
    const updated = await resetMasterPassword(recoveryKey, "new", record);
    await expect(unlockWithMaster("old", updated)).rejects.toThrow();
    const unlocked = await unlockWithMaster("new", updated);
    await expect(decryptItem(unlocked, "id-1", envelope)).resolves.toEqual(ITEM);
  });

  it("rejects tampered ciphertext and ciphertext moved to another row", async () => {
    const { vaultKey } = await createVault("master", FAST_KDF);
    const envelope = await encryptItem(vaultKey, "id-1", ITEM);
    const flipped = (envelope.ct[0] === "A" ? "B" : "A") + envelope.ct.slice(1);
    await expect(decryptItem(vaultKey, "id-1", { ...envelope, ct: flipped })).rejects.toThrow();
    await expect(decryptItem(vaultKey, "id-2", envelope)).rejects.toThrow();
  });

  it("uses a fresh IV for every encryption", async () => {
    const { vaultKey } = await createVault("master", FAST_KDF);
    const [a, b] = await Promise.all([
      encryptItem(vaultKey, "id-1", ITEM),
      encryptItem(vaultKey, "id-1", ITEM),
    ]);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ct).not.toBe(b.ct);
  });
});

describe("generatePassword", () => {
  const all = { lowercase: true, uppercase: true, digits: true, symbols: true };

  it("respects length and includes every selected set", () => {
    for (let i = 0; i < 200; i++) {
      const password = generatePassword({ ...all, length: 8 });
      expect(password).toHaveLength(8);
      expect(password).toMatch(/[a-z]/);
      expect(password).toMatch(/[A-Z]/);
      expect(password).toMatch(/[0-9]/);
      expect(password).toMatch(/[^a-zA-Z0-9]/);
    }
  });

  it("excludes unselected sets", () => {
    const password = generatePassword({
      length: 64,
      lowercase: false,
      uppercase: false,
      digits: true,
      symbols: false,
    });
    expect(password).toMatch(/^[0-9]{64}$/);
  });

  it("rejects invalid options", () => {
    expect(() => generatePassword({ ...all, length: 4 })).toThrow(RangeError);
    expect(() =>
      generatePassword({
        length: 16,
        lowercase: false,
        uppercase: false,
        digits: false,
        symbols: false,
      }),
    ).toThrow();
  });
});
