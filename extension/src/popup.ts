import { importVaultKey, unlockToRawKey, type VaultRecord } from "@/lib/crypto/vault";
import { matchesHost, matchesQuery, recognizeSite } from "@/lib/sites";
import { fetchVaultRecord, loadEntries, type Entry } from "@/lib/vault-api";
import {
  CLEAR_CLIPBOARD_ALARM,
  CLEAR_CLIPBOARD_MINUTES,
  LOCK_AFTER_MINUTES,
  LOCK_ALARM,
  SESSION_KEY,
} from "./constants";
import { fillLoginForm, type FillResult } from "./fill";
import { supabase } from "./supabase";

type Attributes = Partial<Record<string, string | boolean | ((event: Event) => void)>>;

/** Builds DOM nodes. Vault data only ever reaches the page as text, never as HTML. */
function h(tag: string, attributes: Attributes = {}, ...children: (Node | string)[]) {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (typeof value === "function") element.addEventListener(name, value);
    else if (typeof value === "boolean") element.toggleAttribute(name, value);
    else if (value !== undefined) element.setAttribute(name, value);
  }
  element.append(...children);
  return element;
}

const app = document.getElementById("app")!;

function show(...nodes: Node[]) {
  app.replaceChildren(...nodes);
  app.querySelector<HTMLElement>("[autofocus]")?.focus();
}

function header(...actions: Node[]) {
  return h("header", {}, h("span", { class: "brand" }, "Cofrio"), h("div", {}, ...actions));
}

function message(text: string) {
  show(header(), h("p", { class: "empty" }, text));
}

function credentialForm(options: {
  title: string;
  intro: string;
  fields: { name: string; label: string; type: string }[];
  submitLabel: string;
  failure: string;
  onSubmit: (values: Record<string, string>) => Promise<void>;
  extra?: Node[];
}) {
  const error = h("p", { class: "error", role: "alert" });
  const submit = h("button", { class: "primary", type: "submit" }, options.submitLabel) as HTMLButtonElement;
  const inputs = options.fields.map((field, index) =>
    h("input", {
      name: field.name,
      type: field.type,
      "aria-label": field.label,
      placeholder: field.label,
      required: true,
      autofocus: index === 0,
    }),
  ) as HTMLInputElement[];

  const form = h(
    "form",
    {
      class: "form",
      submit: async (event) => {
        event.preventDefault();
        submit.disabled = true;
        error.textContent = "";
        try {
          await options.onSubmit(Object.fromEntries(inputs.map((input) => [input.name, input.value])));
        } catch {
          error.textContent = options.failure;
          submit.disabled = false;
        }
      },
    },
    h("h1", {}, options.title),
    h("p", { class: "muted" }, options.intro),
    ...inputs,
    error,
    submit,
    ...(options.extra ?? []),
  );
  show(header(), form);
}

function signInView() {
  credentialForm({
    title: "Entrar",
    intro: "Usa a mesma conta da app Cofrio.",
    fields: [
      { name: "email", label: "Email", type: "email" },
      { name: "password", label: "Password da conta", type: "password" },
    ],
    submitLabel: "Entrar",
    failure: "Email ou password incorretos.",
    onSubmit: async ({ email, password }) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await start();
    },
  });
}

async function signOut() {
  await chrome.storage.session.remove(SESSION_KEY);
  await supabase.auth.signOut();
  signInView();
}

function keepUnlocked() {
  return chrome.alarms.create(LOCK_ALARM, { delayInMinutes: LOCK_AFTER_MINUTES });
}

function unlockView(record: VaultRecord) {
  credentialForm({
    title: "Desbloquear",
    intro: "Introduz a master password do teu cofre.",
    fields: [{ name: "master", label: "Master password", type: "password" }],
    submitLabel: "Desbloquear",
    failure: "Master password incorreta.",
    onSubmit: async ({ master }) => {
      const rawKey = await unlockToRawKey(master, record);
      // storage.session stays in memory and is cleared when the browser closes.
      await chrome.storage.session.set({ [SESSION_KEY]: rawKey });
      await keepUnlocked();
      await vaultView(await importVaultKey(rawKey));
    },
    extra: [h("button", { class: "ghost", type: "button", click: () => void signOut() }, "Terminar sessão")],
  });
}

async function copyField(value: string, status: HTMLElement, what: string) {
  await navigator.clipboard.writeText(value);
  await chrome.alarms.create(CLEAR_CLIPBOARD_ALARM, { delayInMinutes: CLEAR_CLIPBOARD_MINUTES });
  status.textContent = `${what} copiado. Limpa em 30 s.`;
}

async function fill(entry: Entry, tabId: number, host: string, status: HTMLElement) {
  let result: FillResult | undefined;
  try {
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId },
      func: fillLoginForm,
      args: [entry.username, entry.password, host],
    });
    result = injection?.result as FillResult | undefined;
  } catch {
    result = undefined;
  }
  if (result === "filled") window.close();
  else if (result === "username-only") status.textContent = "Utilizador preenchido. Abre de novo no passo da password.";
  else if (result === "no-fields") status.textContent = "Não encontrei um formulário de login nesta página.";
  else status.textContent = "Não foi possível preencher nesta página.";
}

async function vaultView(vaultKey: CryptoKey) {
  message("A desencriptar…");
  const [{ entries, unreadable }, [tab]] = await Promise.all([
    loadEntries(vaultKey),
    chrome.tabs.query({ active: true, currentWindow: true }),
  ]);

  const url = tab?.url ? new URL(tab.url) : null;
  const host = url?.protocol === "https:" ? url.hostname : null;
  const canFill = (entry: Entry) => host !== null && matchesHost(entry.site, host);

  const sorted = [...entries].sort((a, b) =>
    recognizeSite(a.site).name.localeCompare(recognizeSite(b.site).name, "pt"),
  );
  const status = h("p", { class: "status", role: "status" });
  const list = h("ul");
  const section = h("p", { class: "section" });
  let firstFillable: Entry | undefined;

  function row(entry: Entry) {
    const { name, hue } = recognizeSite(entry.site);
    const tile = h("span", { class: "tile", style: `background:hsl(${hue} 45% 38%)` }, name.charAt(0));
    const actions = [
      h("button", { class: "ghost", title: "Copiar utilizador", click: () => void copyField(entry.username, status, "Utilizador") }, "User"),
      h("button", { class: "ghost", title: "Copiar password", click: () => void copyField(entry.password, status, "Password") }, "Pass"),
    ];
    if (canFill(entry) && tab?.id !== undefined) {
      const tabId = tab.id;
      actions.push(
        h("button", { class: "primary small", click: () => void fill(entry, tabId, host!, status) }, "Preencher"),
      );
    }
    return h(
      "li",
      {},
      tile,
      h("div", { class: "info" }, h("span", {}, name), h("span", { class: "user" }, entry.username)),
      ...actions,
    );
  }

  function renderList(query: string) {
    const term = query.trim();
    const shown = term
      ? sorted.filter((entry) => matchesQuery(entry, term))
      : sorted.filter(canFill);
    section.textContent = term ? "Resultados" : "Neste site";
    firstFillable = shown.find(canFill);
    list.replaceChildren(
      ...(shown.length
        ? shown.map(row)
        : [h("p", { class: "empty" }, term ? "Sem resultados." : "Sem contas para este site. Pesquisa acima.")]),
    );
  }

  const search = h("input", {
    type: "search",
    placeholder: "Procurar por site ou utilizador",
    "aria-label": "Procurar por site ou utilizador",
    autofocus: true,
    input: (event) => renderList((event.target as HTMLInputElement).value),
    keydown: (event) => {
      const entry = firstFillable;
      if ((event as KeyboardEvent).key === "Enter" && entry && tab?.id !== undefined) {
        void fill(entry, tab.id, host!, status);
      }
    },
  });

  const lock = async () => {
    await chrome.storage.session.remove(SESSION_KEY);
    await start();
  };

  renderList("");
  show(
    header(
      h("button", { class: "ghost", click: () => void lock() }, "Bloquear"),
      h("button", { class: "ghost", click: () => void signOut() }, "Sair"),
    ),
    h("div", { class: "search" }, search),
    ...(unreadable > 0 ? [h("p", { class: "error section" }, `${unreadable} entradas ilegíveis.`)] : []),
    section,
    list,
    status,
  );
}

async function start() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return signInView();

  const record = await fetchVaultRecord(data.session.user.id);
  if (!record) return message("Cria primeiro o cofre na app Cofrio.");

  const stored = await chrome.storage.session.get(SESSION_KEY);
  const rawKey = stored[SESSION_KEY] as string | undefined;
  if (!rawKey) return unlockView(record);

  await keepUnlocked();
  await vaultView(await importVaultKey(rawKey));
}

start().catch(() => message("Não foi possível ligar ao servidor."));
