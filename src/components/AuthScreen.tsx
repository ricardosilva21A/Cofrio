"use client";

import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { CenteredCard, ErrorText, Field, SecretInput, inputClass, primaryButton } from "./ui";

export function AuthScreen() {
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const isSignUp = mode === "signUp";

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    if (isSignUp) {
      const { data, error: failure } = await supabase.auth.signUp({ email, password });
      if (failure) setError("Não foi possível criar a conta. Verifica os dados e tenta novamente.");
      else if (!data.session) setNotice("Conta criada. Confirma o teu email para continuar.");
    } else {
      const { error: failure } = await supabase.auth.signInWithPassword({ email, password });
      if (failure) setError("Email ou password incorretos.");
    }
    setBusy(false);
  }

  return (
    <CenteredCard
      title={isSignUp ? "Cria a tua conta" : "Bem-vindo de volta"}
      intro="As tuas passwords são encriptadas neste dispositivo antes de saírem dele."
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Password da conta">
          <SecretInput
            required
            minLength={8}
            autoComplete={isSignUp ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        <ErrorText>{error}</ErrorText>
        {notice && <p role="status" className="text-sm text-accent">{notice}</p>}
        <button type="submit" disabled={busy} className={`${primaryButton} w-full`}>
          {busy ? "Aguarda…" : isSignUp ? "Criar conta" : "Entrar"}
        </button>
      </form>
      <button
        type="button"
        onClick={() => {
          setMode(isSignUp ? "signIn" : "signUp");
          setError("");
          setNotice("");
        }}
        className="mt-4 text-sm text-muted underline underline-offset-4 hover:text-ink"
      >
        {isSignUp ? "Já tenho conta" : "Criar uma conta nova"}
      </button>
    </CenteredCard>
  );
}
