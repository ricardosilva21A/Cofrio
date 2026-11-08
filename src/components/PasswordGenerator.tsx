"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";
import {
  MAX_LENGTH,
  MIN_LENGTH,
  generatePassword,
  type GeneratorOptions,
} from "@/lib/crypto/generator";
import { CopyButton, iconButton, primaryButton } from "./ui";

type CharacterSet = Exclude<keyof GeneratorOptions, "length">;

const SETS: { key: CharacterSet; label: string }[] = [
  { key: "lowercase", label: "Minúsculas" },
  { key: "uppercase", label: "Maiúsculas" },
  { key: "digits", label: "Números" },
  { key: "symbols", label: "Símbolos" },
];

const DEFAULTS: GeneratorOptions = {
  length: 20,
  lowercase: true,
  uppercase: true,
  digits: true,
  symbols: true,
};

export function PasswordGenerator({ onUse }: { onUse?: (password: string) => void }) {
  const [options, setOptions] = useState(DEFAULTS);
  const [password, setPassword] = useState(() => generatePassword(DEFAULTS));

  function update(next: GeneratorOptions) {
    if (!SETS.some(({ key }) => next[key])) return;
    setOptions(next);
    setPassword(generatePassword(next));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 rounded-lg border border-line bg-canvas py-1 pr-1 pl-3">
        <output className="min-w-0 flex-1 font-mono text-sm break-all">{password}</output>
        <button
          type="button"
          onClick={() => setPassword(generatePassword(options))}
          aria-label="Gerar outra"
          title="Gerar outra"
          className={iconButton}
        >
          <RefreshCw size={16} />
        </button>
        <CopyButton value={password} label="Copiar password gerada" />
      </div>
      <label className="block text-sm">
        <span className="mb-2 flex justify-between font-medium">
          Comprimento <span className="font-mono">{options.length}</span>
        </span>
        <input
          type="range"
          min={MIN_LENGTH}
          max={Math.min(MAX_LENGTH, 64)}
          value={options.length}
          onChange={(event) => update({ ...options, length: Number(event.target.value) })}
          className="w-full accent-[var(--accent)]"
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        {SETS.map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={options[key]}
              onChange={(event) => update({ ...options, [key]: event.target.checked })}
              className="size-4 accent-[var(--accent)]"
            />
            {label}
          </label>
        ))}
      </div>
      {onUse && (
        <button type="button" onClick={() => onUse(password)} className={`${primaryButton} w-full`}>
          Usar esta password
        </button>
      )}
    </div>
  );
}
