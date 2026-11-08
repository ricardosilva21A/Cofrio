"use client";

import { Wand2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { Entry, EntryData } from "@/lib/vault-api";
import { PasswordGenerator } from "./PasswordGenerator";
import { ErrorText, Field, SecretInput, inputClass, primaryButton, secondaryButton } from "./ui";

export function EntryEditor({ entry, onSave, onCancel }: {
  entry: Entry | null;
  onSave: (data: EntryData) => Promise<void>;
  onCancel: () => void;
}) {
  const [data, setData] = useState<EntryData>({
    site: entry?.site ?? "",
    username: entry?.username ?? "",
    password: entry?.password ?? "",
    notes: entry?.notes ?? "",
  });
  const [showGenerator, setShowGenerator] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSave({ ...data, site: data.site.trim(), username: data.username.trim() });
    } catch {
      setError("Não foi possível guardar. Verifica a ligação e tenta novamente.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-xl space-y-4 p-4 sm:p-8">
      <h2 className="font-display text-2xl font-semibold tracking-tight">
        {entry ? "Editar entrada" : "Nova entrada"}
      </h2>
      <Field label="Site ou aplicação">
        <input
          required
          autoFocus
          value={data.site}
          onChange={(event) => setData({ ...data, site: event.target.value })}
          placeholder="github.com"
          className={inputClass}
        />
      </Field>
      <Field label="Utilizador">
        <input
          required
          autoComplete="off"
          value={data.username}
          onChange={(event) => setData({ ...data, username: event.target.value })}
          className={inputClass}
        />
      </Field>
      <div>
        <Field label="Password">
          <SecretInput
            required
            autoComplete="off"
            value={data.password}
            onChange={(event) => setData({ ...data, password: event.target.value })}
          />
        </Field>
        <button
          type="button"
          onClick={() => setShowGenerator((value) => !value)}
          aria-expanded={showGenerator}
          className="mt-2 inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
        >
          <Wand2 size={14} aria-hidden />
          {showGenerator ? "Fechar gerador" : "Gerar uma password forte"}
        </button>
        {showGenerator && (
          <div className="mt-3 rounded-lg border border-line bg-surface p-4">
            <PasswordGenerator
              onUse={(password) => {
                setData({ ...data, password });
                setShowGenerator(false);
              }}
            />
          </div>
        )}
      </div>
      <Field label="Notas (opcional)">
        <textarea
          rows={3}
          value={data.notes}
          onChange={(event) => setData({ ...data, notes: event.target.value })}
          className={inputClass}
        />
      </Field>
      <ErrorText>{error}</ErrorText>
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className={primaryButton}>
          {busy ? "A encriptar…" : "Guardar"}
        </button>
        <button type="button" onClick={onCancel} className={secondaryButton}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
