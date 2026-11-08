"use client";

import { ArrowLeft, Eye, EyeOff, Lock, LogOut, Pencil, Plus, Search, Trash2, Wand2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { deleteEntry, loadEntries, saveEntry, type Entry, type EntryData } from "@/lib/vault-api";
import { EntryEditor } from "./EntryEditor";
import { PasswordGenerator } from "./PasswordGenerator";
import { Brand, CopyButton, ErrorText, iconButton, inputClass, primaryButton, secondaryButton } from "./ui";

const IDLE_LOCK_MS = 5 * 60 * 1000;
const TILE_HUES = [162, 28, 210, 340, 90, 262];

type Pane = { kind: "empty" } | { kind: "detail"; id: string } | { kind: "edit"; id: string | null };

function Tile({ site }: { site: string }) {
  const hash = [...site].reduce((total, char) => total + char.charCodeAt(0), 0);
  return (
    <span
      aria-hidden
      style={{ background: `hsl(${TILE_HUES[hash % TILE_HUES.length]} 45% 38%)` }}
      className="flex size-10 shrink-0 items-center justify-center rounded-lg font-display font-semibold text-white uppercase"
    >
      {site.charAt(0)}
    </span>
  );
}

function Row({ label, value, secret, multiline }: {
  label: string;
  value: string;
  secret?: boolean;
  multiline?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="border-b border-line py-3 last:border-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 flex items-start gap-1">
        <span className={`min-w-0 flex-1 py-1.5 break-all ${secret ? "font-mono text-sm" : ""} ${multiline ? "whitespace-pre-wrap" : ""}`}>
          {secret && !visible ? "•".repeat(12) : value}
        </span>
        {secret && (
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? "Ocultar password" : "Mostrar password"}
            className={iconButton}
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
        {!multiline && <CopyButton value={value} label={`Copiar ${label.toLowerCase()}`} />}
      </dd>
    </div>
  );
}

function EntryDetail({ entry, onEdit, onDelete }: {
  entry: Entry;
  onEdit: () => void;
  onDelete: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  async function confirmDelete() {
    try {
      await onDelete();
    } catch {
      setError("Não foi possível apagar. Tenta novamente.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl p-4 sm:p-8">
      <div className="flex items-center gap-3">
        <Tile site={entry.site} />
        <h2 className="min-w-0 flex-1 font-display text-2xl font-semibold tracking-tight break-words">
          {entry.site}
        </h2>
      </div>
      <dl className="mt-6 rounded-xl border border-line bg-surface px-4">
        <Row label="Utilizador" value={entry.username} />
        <Row key={entry.id} label="Password" value={entry.password} secret />
        {entry.notes && <Row label="Notas" value={entry.notes} multiline />}
      </dl>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button onClick={onEdit} className={secondaryButton}>
          <Pencil size={15} aria-hidden /> Editar
        </button>
        {confirming ? (
          <>
            <button onClick={confirmDelete} className={`${secondaryButton} border-danger text-danger`}>
              Confirmar eliminação
            </button>
            <button onClick={() => setConfirming(false)} className={secondaryButton}>
              Cancelar
            </button>
          </>
        ) : (
          <button onClick={() => setConfirming(true)} className={`${secondaryButton} text-danger`}>
            <Trash2 size={15} aria-hidden /> Apagar
          </button>
        )}
      </div>
      <div className="mt-3">
        <ErrorText>{error}</ErrorText>
      </div>
    </div>
  );
}

export function VaultView({ userId, vaultKey, onLock, onSignOut }: {
  userId: string;
  vaultKey: CryptoKey;
  onLock: () => void;
  onSignOut: () => void;
}) {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [unreadable, setUnreadable] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");
  const [pane, setPane] = useState<Pane>({ kind: "empty" });
  const [generatorOpen, setGeneratorOpen] = useState(false);

  useEffect(() => {
    let active = true;
    loadEntries(vaultKey)
      .then((result) => {
        if (!active) return;
        setEntries(result.entries);
        setUnreadable(result.unreadable);
      })
      .catch(() => active && setLoadError(true));
    return () => {
      active = false;
    };
  }, [vaultKey]);

  useEffect(() => {
    let timer = setTimeout(onLock, IDLE_LOCK_MS);
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(onLock, IDLE_LOCK_MS);
    };
    const events = ["pointerdown", "keydown", "scroll"] as const;
    events.forEach((name) => window.addEventListener(name, reset, { passive: true }));
    return () => {
      clearTimeout(timer);
      events.forEach((name) => window.removeEventListener(name, reset));
    };
  }, [onLock]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (entries ?? [])
      .filter(({ site, username }) => `${site} ${username}`.toLowerCase().includes(term))
      .sort((a, b) => a.site.localeCompare(b.site, "pt"));
  }, [entries, query]);

  const selectedId = pane.kind === "empty" ? null : pane.id;
  const selected = entries?.find((entry) => entry.id === selectedId) ?? null;

  async function save(data: EntryData) {
    const entry: Entry = { ...data, id: selected?.id ?? crypto.randomUUID() };
    await saveEntry(vaultKey, userId, entry);
    setEntries((current) => [...(current ?? []).filter(({ id }) => id !== entry.id), entry]);
    setPane({ kind: "detail", id: entry.id });
  }

  async function remove(id: string) {
    await deleteEntry(id);
    setEntries((current) => (current ?? []).filter((entry) => entry.id !== id));
    setPane({ kind: "empty" });
  }

  const paneOpen = pane.kind !== "empty";

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <Brand />
        <div className="flex items-center gap-1">
          <button onClick={() => setGeneratorOpen(true)} aria-label="Gerador de passwords" title="Gerador de passwords" className={iconButton}>
            <Wand2 size={18} />
          </button>
          <button onClick={onLock} aria-label="Bloquear cofre" title="Bloquear cofre" className={iconButton}>
            <Lock size={18} />
          </button>
          <button onClick={onSignOut} aria-label="Terminar sessão" title="Terminar sessão" className={iconButton}>
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className={`w-full flex-col border-line md:flex md:w-80 md:border-r lg:w-96 ${paneOpen ? "hidden" : "flex"}`}>
          <div className="flex gap-2 p-3">
            <div className="relative min-w-0 flex-1">
              <Search size={16} aria-hidden className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Procurar"
                aria-label="Procurar por site ou utilizador"
                className={`${inputClass} pl-9`}
              />
            </div>
            <button onClick={() => setPane({ kind: "edit", id: null })} aria-label="Nova entrada" title="Nova entrada" className={`${primaryButton} px-3`}>
              <Plus size={18} />
            </button>
          </div>
          {unreadable > 0 && (
            <p role="alert" className="px-4 pb-2 text-sm text-danger">
              {unreadable} {unreadable === 1 ? "entrada não pôde" : "entradas não puderam"} ser desencriptadas.
            </p>
          )}
          <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
            {visible.map((entry) => (
              <li key={entry.id}>
                <button
                  onClick={() => setPane({ kind: "detail", id: entry.id })}
                  aria-current={entry.id === selectedId}
                  className={`flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-raised ${entry.id === selectedId ? "bg-raised" : ""}`}
                >
                  <Tile site={entry.site} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{entry.site}</span>
                    <span className="block truncate text-sm text-muted">{entry.username}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {entries === null && !loadError && <p className="p-4 text-sm text-muted">A desencriptar…</p>}
          {loadError && <p role="alert" className="p-4 text-sm text-danger">Não foi possível carregar o cofre.</p>}
          {entries?.length === 0 && (
            <p className="px-6 pb-16 text-center text-sm text-muted">O cofre está vazio. Adiciona a primeira password com o botão +.</p>
          )}
          {entries && entries.length > 0 && visible.length === 0 && (
            <p className="px-6 pb-16 text-center text-sm text-muted">Sem resultados para esta pesquisa.</p>
          )}
        </aside>

        <main className={`min-w-0 flex-1 overflow-y-auto ${paneOpen ? "block" : "hidden md:block"}`}>
          {paneOpen && (
            <button onClick={() => setPane({ kind: "empty" })} className="inline-flex items-center gap-1 p-4 pb-0 text-sm text-muted md:hidden">
              <ArrowLeft size={16} aria-hidden /> Voltar
            </button>
          )}
          {pane.kind === "empty" && (
            <div className="flex h-full items-center justify-center p-8 text-center text-muted">
              Escolhe uma entrada para ver os detalhes.
            </div>
          )}
          {pane.kind === "detail" && selected && (
            <EntryDetail
              key={selected.id}
              entry={selected}
              onEdit={() => setPane({ kind: "edit", id: selected.id })}
              onDelete={() => remove(selected.id)}
            />
          )}
          {pane.kind === "edit" && (
            <EntryEditor
              key={pane.id ?? "new"}
              entry={selected}
              onSave={save}
              onCancel={() => setPane(pane.id ? { kind: "detail", id: pane.id } : { kind: "empty" })}
            />
          )}
        </main>
      </div>

      {generatorOpen && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50 p-4">
          <div role="dialog" aria-modal="true" aria-label="Gerador de passwords" className="w-full max-w-md rounded-xl border border-line bg-surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">Gerador</h2>
              <button onClick={() => setGeneratorOpen(false)} aria-label="Fechar" className={iconButton}>
                <X size={18} />
              </button>
            </div>
            <PasswordGenerator />
          </div>
        </div>
      )}
    </div>
  );
}
