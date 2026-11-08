"use client";

import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import type { VaultRecord } from "@/lib/crypto/vault";
import { supabase } from "@/lib/supabase";
import { fetchVaultRecord } from "@/lib/vault-api";
import { AuthScreen } from "./AuthScreen";
import { UnlockScreen } from "./UnlockScreen";
import { VaultSetup } from "./VaultSetup";
import { VaultView } from "./VaultView";

function Message({ children }: { children: string }) {
  return <main className="flex flex-1 items-center justify-center p-4 text-muted">{children}</main>;
}

export function VaultApp() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [vault, setVault] = useState<{ userId: string; record: VaultRecord | null } | null>(null);
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const userId = session?.user.id;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) setVaultKey(null); // The key lives only in memory.
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    fetchVaultRecord(userId)
      .then((record) => active && setVault({ userId, record }))
      .catch(() => active && setLoadFailed(true));
    return () => {
      active = false;
    };
  }, [userId]);

  const lock = useCallback(() => setVaultKey(null), []);
  const signOut = useCallback(() => void supabase.auth.signOut(), []);

  if (session === undefined) return <Message>A carregar…</Message>;
  if (!session || !userId) return <AuthScreen />;
  if (loadFailed) return <Message>Não foi possível ligar ao servidor. Recarrega a página.</Message>;
  if (vault?.userId !== userId) return <Message>A carregar o cofre…</Message>;

  const open = (record: VaultRecord, key: CryptoKey) => {
    setVault({ userId, record });
    setVaultKey(key);
  };

  if (!vault.record) return <VaultSetup userId={userId} onReady={open} />;
  if (!vaultKey) {
    return <UnlockScreen userId={userId} record={vault.record} onUnlock={open} onSignOut={signOut} />;
  }
  return <VaultView userId={userId} vaultKey={vaultKey} onLock={lock} onSignOut={signOut} />;
}
