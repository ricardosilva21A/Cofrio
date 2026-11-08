import { decryptItem, encryptItem, type Envelope, type VaultRecord } from "./crypto/vault";
import { supabase } from "./supabase";

export type EntryData = {
  site: string;
  username: string;
  password: string;
  notes: string;
};

export type Entry = EntryData & { id: string };

export async function fetchVaultRecord(userId: string): Promise<VaultRecord | null> {
  const { data, error } = await supabase
    .from("vaults")
    .select("kdf, salt, wrapped_by_master, wrapped_by_recovery")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    kdf: data.kdf,
    salt: data.salt,
    wrappedByMaster: data.wrapped_by_master,
    wrappedByRecovery: data.wrapped_by_recovery,
  };
}

export async function saveVaultRecord(userId: string, record: VaultRecord): Promise<void> {
  const { error } = await supabase.from("vaults").upsert({
    user_id: userId,
    kdf: record.kdf,
    salt: record.salt,
    wrapped_by_master: record.wrappedByMaster,
    wrapped_by_recovery: record.wrappedByRecovery,
  });
  if (error) throw error;
}

/** Entries that fail authentication are counted, never shown. */
export async function loadEntries(vaultKey: CryptoKey) {
  const { data, error } = await supabase.from("vault_items").select("id, envelope");
  if (error) throw error;

  const results = await Promise.allSettled(
    data.map(async (row) => ({
      id: row.id as string,
      ...(await decryptItem<EntryData>(vaultKey, row.id, row.envelope as Envelope)),
    })),
  );
  const entries = results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );
  return { entries, unreadable: results.length - entries.length };
}

export async function saveEntry(vaultKey: CryptoKey, userId: string, entry: Entry): Promise<void> {
  const { id, ...data } = entry;
  const envelope = await encryptItem(vaultKey, id, data);
  const { error } = await supabase.from("vault_items").upsert({ id, user_id: userId, envelope });
  if (error) throw error;
}

export async function deleteEntry(id: string): Promise<void> {
  const { error } = await supabase.from("vault_items").delete().eq("id", id);
  if (error) throw error;
}
