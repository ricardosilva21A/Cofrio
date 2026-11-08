/**
 * Website recognition. The catalogue is local on purpose: looking up logos or
 * metadata on a third-party service would reveal which sites a user has accounts on.
 */

export type KnownSite = { name: string; domain: string; hue: number; aliases?: string[] };

export type RecognizedSite = {
  /** Value to display, such as "GitHub" or "intranet.empresa.pt". */
  name: string;
  /** Normalized host, or null when the text is not a website (a desktop app, for example). */
  domain: string | null;
  hue: number;
  known: boolean;
};

export const KNOWN_SITES: KnownSite[] = [
  { name: "Google", domain: "google.com", hue: 217, aliases: ["gmail", "youtube", "google drive"] },
  { name: "Microsoft", domain: "microsoft.com", hue: 200, aliases: ["outlook", "hotmail", "office", "xbox"] },
  { name: "Microsoft Live", domain: "live.com", hue: 200 },
  { name: "Apple", domain: "apple.com", hue: 220, aliases: ["icloud"] },
  { name: "GitHub", domain: "github.com", hue: 260, aliases: ["git hub"] },
  { name: "GitLab", domain: "gitlab.com", hue: 22 },
  { name: "Facebook", domain: "facebook.com", hue: 221 },
  { name: "Instagram", domain: "instagram.com", hue: 330 },
  { name: "WhatsApp", domain: "whatsapp.com", hue: 142 },
  { name: "X", domain: "x.com", hue: 210, aliases: ["twitter"] },
  { name: "Twitter", domain: "twitter.com", hue: 203 },
  { name: "LinkedIn", domain: "linkedin.com", hue: 201 },
  { name: "TikTok", domain: "tiktok.com", hue: 345 },
  { name: "Reddit", domain: "reddit.com", hue: 16 },
  { name: "Discord", domain: "discord.com", hue: 235 },
  { name: "Slack", domain: "slack.com", hue: 300 },
  { name: "Twitch", domain: "twitch.tv", hue: 265 },
  { name: "Netflix", domain: "netflix.com", hue: 357 },
  { name: "Spotify", domain: "spotify.com", hue: 141 },
  { name: "Disney+", domain: "disneyplus.com", hue: 225, aliases: ["disney plus"] },
  { name: "Prime Video", domain: "primevideo.com", hue: 197 },
  { name: "Amazon", domain: "amazon.com", hue: 36 },
  { name: "Amazon Espanha", domain: "amazon.es", hue: 36 },
  { name: "eBay", domain: "ebay.com", hue: 4 },
  { name: "AliExpress", domain: "aliexpress.com", hue: 12 },
  { name: "PayPal", domain: "paypal.com", hue: 212 },
  { name: "Revolut", domain: "revolut.com", hue: 228 },
  { name: "Steam", domain: "steampowered.com", hue: 210 },
  { name: "Epic Games", domain: "epicgames.com", hue: 220 },
  { name: "PlayStation", domain: "playstation.com", hue: 222 },
  { name: "Dropbox", domain: "dropbox.com", hue: 214 },
  { name: "Notion", domain: "notion.so", hue: 40 },
  { name: "Figma", domain: "figma.com", hue: 12 },
  { name: "Vercel", domain: "vercel.com", hue: 240 },
  { name: "Supabase", domain: "supabase.com", hue: 153 },
  { name: "OLX", domain: "olx.pt", hue: 175 },
  { name: "Portal das Finanças", domain: "portaldasfinancas.gov.pt", hue: 150, aliases: ["financas", "finanças", "at"] },
];

const HOST_PATTERN = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;

/** Stable fallback colour for sites outside the catalogue. */
function hueFor(text: string): number {
  return [...text].reduce((total, char) => (total * 31 + char.charCodeAt(0)) % 360, 7);
}

/** Extracts the host from "https://www.site.com/login" or "site.com"; null if not a website. */
export function normalizeDomain(input: string): string | null {
  const text = input.trim().toLowerCase();
  if (!text || /\s/.test(text)) return null;

  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//.test(text);
  if (hasScheme && !/^https?:\/\//.test(text)) return null;

  try {
    const host = new URL(hasScheme ? text : `https://${text}`).hostname.replace(/^www\./, "");
    return HOST_PATTERN.test(host) ? host : null;
  } catch {
    return null;
  }
}

function findKnown(input: string, domain: string | null): KnownSite | undefined {
  if (domain) {
    // Suffix must start at a label boundary, so "github.com.evil.io" never matches.
    return KNOWN_SITES.find((site) => domain === site.domain || domain.endsWith(`.${site.domain}`));
  }
  const text = input.trim().toLowerCase();
  return KNOWN_SITES.find(
    (site) => site.name.toLowerCase() === text || site.aliases?.includes(text),
  );
}

export function recognizeSite(input: string): RecognizedSite {
  const domain = normalizeDomain(input);
  const known = findKnown(input, domain);
  if (known) return { name: known.name, domain: known.domain, hue: known.hue, known: true };
  const name = domain ?? input.trim();
  return { name, domain, hue: hueFor(name), known: false };
}

/** Value stored for an entry: the canonical domain whenever one can be determined. */
export function canonicalSite(input: string): string {
  return recognizeSite(input).domain ?? input.trim();
}

/** True when an entry belongs to this page's host: the same domain or a subdomain of it. */
export function matchesHost(site: string, host: string): boolean {
  const { domain } = recognizeSite(site);
  if (!domain) return false;
  const current = host.toLowerCase().replace(/^www\./, "");
  return current === domain || current.endsWith(`.${domain}`);
}

/** Every word must appear in the site name, domain or username, in any order. */
export function matchesQuery(entry: { site: string; username: string }, query: string): boolean {
  const { name, domain } = recognizeSite(entry.site);
  const haystack = `${name} ${domain ?? ""} ${entry.site} ${entry.username}`.toLowerCase();
  return query.toLowerCase().split(/\s+/).filter(Boolean).every((term) => haystack.includes(term));
}
