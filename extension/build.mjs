import { build } from "esbuild";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const outdir = join(here, "dist");

function readEnv() {
  const file = join(root, ".env.local");
  if (!existsSync(file)) throw new Error("Missing .env.local (see .env.example)");
  return Object.fromEntries(
    readFileSync(file, "utf8")
      .split(/\r?\n/)
      .filter((line) => line.includes("=") && !line.startsWith("#"))
      .map((line) => [line.slice(0, line.indexOf("=")).trim(), line.slice(line.indexOf("=") + 1).trim()]),
  );
}

const env = readEnv();
for (const name of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]) {
  if (!env[name]) throw new Error(`Missing ${name} in .env.local`);
}

// The web app's Supabase client uses localStorage; the extension needs its own.
const useExtensionSupabase = {
  name: "use-extension-supabase",
  setup(context) {
    context.onResolve({ filter: /^\.\/supabase$/ }, (args) =>
      args.importer.endsWith("vault-api.ts") ? { path: join(here, "src", "supabase.ts") } : undefined,
    );
  },
};

rmSync(outdir, { recursive: true, force: true });
mkdirSync(outdir, { recursive: true });

await build({
  entryPoints: ["popup", "background", "offscreen"].map((name) => join(here, "src", `${name}.ts`)),
  outdir,
  bundle: true,
  format: "iife",
  target: "chrome120",
  minify: true,
  tsconfig: join(root, "tsconfig.json"),
  plugins: [useExtensionSupabase],
  define: {
    __SUPABASE_URL__: JSON.stringify(env.NEXT_PUBLIC_SUPABASE_URL),
    __SUPABASE_KEY__: JSON.stringify(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  },
});

for (const file of ["manifest.json", "popup.html", "popup.css", "offscreen.html"]) {
  cpSync(join(here, file), join(outdir, file));
}

console.log(`Extension built in ${outdir}`);
