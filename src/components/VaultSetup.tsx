"use client";

import { useState, type FormEvent } from "react";
import { createVault } from "@/lib/crypto/vault";
import { saveVaultRecord } from "@/lib/vault-api";
import type { VaultRecord } from "@/lib/crypto/vault";
import { CenteredCard, CopyButton, ErrorText, Field, SecretInput, primaryButton } from "./ui";

export const MIN_MASTER_LENGTH = 12;
type Created = Awaited<ReturnType<typeof createVault>>;

export function VaultSetup({ userId, onReady }: {
  userId: string;
  onReady: (record: VaultRecord, vaultKey: CryptoKey) => void;
}) {
  const [master, setMaster] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [created, setCreated] = useState<Created | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function generate(event: FormEvent) {
    event.preventDefault();
    if (master !== confirmation) {
      setError("As passwords não coincidem.");
      return;
    }
    setBusy(true);
    setError("");
    setCreated(await createVault(master));
    setMaster("");
    setConfirmation("");
    setBusy(false);
  }

  // Saved only after the recovery key is acknowledged, so it can never be missed.
  async function finish() {
    if (!created) return;
    setBusy(true);
    setError("");
    try {
      await saveVaultRecord(userId, created.record);
      onReady(created.record, created.vaultKey);
    } catch {
      setError("Não foi possível guardar o cofre. Tenta novamente.");
      setBusy(false);
    }
  }

  if (created) {
    return (
      <CenteredCard
        title="Guarda a chave de recuperação"
        intro="É a única forma de recuperares o cofre se esqueceres a master password. Só a vais ver agora."
      >
        <div className="flex items-start gap-2 rounded-lg border border-line bg-surface p-4">
          <code className="flex-1 font-mono text-sm leading-6 break-all">{created.recoveryKey}</code>
          <CopyButton value={created.recoveryKey} label="Copiar chave de recuperação" />
        </div>
        <label className="mt-4 flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={saved}
            onChange={(event) => setSaved(event.target.checked)}
            className="mt-0.5 size-4 accent-[var(--accent)]"
          />
          Guardei a chave num sítio seguro, fora deste cofre.
        </label>
        <div className="mt-4 space-y-3">
          <ErrorText>{error}</ErrorText>
          <button onClick={finish} disabled={!saved || busy} className={`${primaryButton} w-full`}>
            {busy ? "A guardar…" : "Abrir o cofre"}
          </button>
        </div>
      </CenteredCard>
    );
  }

  return (
    <CenteredCard
      title="Cria a master password"
      intro="Usa uma password diferente da conta. Nunca sai deste dispositivo e ninguém a consegue repor por ti."
    >
      <form onSubmit={generate} className="space-y-4">
        <Field label={`Master password (mínimo ${MIN_MASTER_LENGTH} caracteres)`}>
          <SecretInput
            required
            minLength={MIN_MASTER_LENGTH}
            autoComplete="new-password"
            value={master}
            onChange={(event) => setMaster(event.target.value)}
          />
        </Field>
        <Field label="Confirma a master password">
          <SecretInput
            required
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </Field>
        <ErrorText>{error}</ErrorText>
        <button type="submit" disabled={busy} className={`${primaryButton} w-full`}>
          {busy ? "A preparar o cofre…" : "Continuar"}
        </button>
      </form>
    </CenteredCard>
  );
}
