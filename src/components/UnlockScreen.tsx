"use client";

import { useState, type FormEvent } from "react";
import {
  resetMasterPassword,
  unlockWithMaster,
  unlockWithRecovery,
  type VaultRecord,
} from "@/lib/crypto/vault";
import { saveVaultRecord } from "@/lib/vault-api";
import { CenteredCard, ErrorText, Field, SecretInput, primaryButton } from "./ui";
import { MIN_MASTER_LENGTH } from "./VaultSetup";

export function UnlockScreen({ userId, record, onUnlock, onSignOut }: {
  userId: string;
  record: VaultRecord;
  onUnlock: (record: VaultRecord, vaultKey: CryptoKey) => void;
  onSignOut: () => void;
}) {
  const [recovering, setRecovering] = useState(false);
  const [master, setMaster] = useState("");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function unlock(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      onUnlock(record, await unlockWithMaster(master, record));
    } catch {
      setError("Master password incorreta.");
      setBusy(false);
    }
  }

  async function recover(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    let vaultKey: CryptoKey;
    let updated: VaultRecord;
    try {
      vaultKey = await unlockWithRecovery(recoveryKey, record);
      updated = await resetMasterPassword(recoveryKey, master, record);
    } catch {
      setError("Chave de recuperação incorreta.");
      setBusy(false);
      return;
    }
    try {
      await saveVaultRecord(userId, updated);
      onUnlock(updated, vaultKey);
    } catch {
      setError("Não foi possível guardar a nova master password. Tenta novamente.");
      setBusy(false);
    }
  }

  return (
    <CenteredCard
      title={recovering ? "Recuperar o cofre" : "Desbloqueia o cofre"}
      intro={
        recovering
          ? "Introduz a chave de recuperação e define uma nova master password."
          : "Introduz a master password para desencriptar os teus dados."
      }
    >
      <form onSubmit={recovering ? recover : unlock} className="space-y-4">
        {recovering && (
          <Field label="Chave de recuperação">
            <SecretInput
              required
              autoComplete="off"
              value={recoveryKey}
              onChange={(event) => setRecoveryKey(event.target.value)}
            />
          </Field>
        )}
        <Field label={recovering ? "Nova master password" : "Master password"}>
          <SecretInput
            required
            autoFocus
            minLength={recovering ? MIN_MASTER_LENGTH : undefined}
            autoComplete={recovering ? "new-password" : "current-password"}
            value={master}
            onChange={(event) => setMaster(event.target.value)}
          />
        </Field>
        <ErrorText>{error}</ErrorText>
        <button type="submit" disabled={busy} className={`${primaryButton} w-full`}>
          {busy ? "A desencriptar…" : recovering ? "Recuperar" : "Desbloquear"}
        </button>
      </form>
      <div className="mt-4 flex justify-between text-sm text-muted">
        <button
          type="button"
          onClick={() => {
            setRecovering((value) => !value);
            setError("");
            setMaster("");
          }}
          className="underline underline-offset-4 hover:text-ink"
        >
          {recovering ? "Voltar" : "Esqueci a master password"}
        </button>
        <button type="button" onClick={onSignOut} className="underline underline-offset-4 hover:text-ink">
          Terminar sessão
        </button>
      </div>
    </CenteredCard>
  );
}
