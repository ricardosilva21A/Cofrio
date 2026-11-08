"use client";

import { Check, Copy, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useRef, useState, type ComponentProps, type ReactNode } from "react";

export const inputClass =
  "w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-base text-ink placeholder:text-muted sm:text-sm";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export const primaryButton = `${buttonBase} bg-accent text-on-accent hover:bg-accent-hover`;
export const secondaryButton = `${buttonBase} border border-line text-ink hover:bg-raised`;
export const iconButton =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-raised hover:text-ink";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

export function SecretInput(props: ComponentProps<"input">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        spellCheck={false}
        className={`${inputClass} pr-11 font-mono`}
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? "Ocultar" : "Mostrar"}
        className={`${iconButton} absolute top-1/2 right-1 -translate-y-1/2`}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="text-sm text-danger">
      {children}
    </p>
  );
}

export function Brand() {
  return (
    <span className="inline-flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
      <LockKeyhole size={20} className="text-accent" aria-hidden />
      CloudVault
    </span>
  );
}

export function CenteredCard({ title, intro, children }: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Brand />
        <h1 className="mt-8 font-display text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 mb-6 text-muted">{intro}</p>
        {children}
      </div>
    </main>
  );
}

let clearTimer: ReturnType<typeof setTimeout> | undefined;
const CLIPBOARD_CLEAR_MS = 30_000;

/** Copies a value and wipes the clipboard after 30 seconds. */
async function copySecret(value: string) {
  await navigator.clipboard.writeText(value);
  clearTimeout(clearTimer);
  clearTimer = setTimeout(() => {
    // The browser refuses this while the tab has no focus; nothing else can be done then.
    navigator.clipboard.writeText("").catch(() => {});
  }, CLIPBOARD_CLEAR_MS);
}

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  async function copy() {
    await copySecret(value);
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button type="button" onClick={copy} aria-label={label} title={label} className={iconButton}>
      {copied ? <Check size={16} className="text-accent" /> : <Copy size={16} />}
    </button>
  );
}
