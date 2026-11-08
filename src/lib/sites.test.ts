import { describe, expect, it } from "vitest";
import { canonicalSite, matchesHost, matchesQuery, normalizeDomain, recognizeSite } from "./sites";

describe("normalizeDomain", () => {
  it("extracts the host from URLs", () => {
    expect(normalizeDomain("https://www.GitHub.com/login?x=1")).toBe("github.com");
    expect(normalizeDomain("exemplo.pt/conta")).toBe("exemplo.pt");
  });

  it("rejects text and non-web schemes", () => {
    expect(normalizeDomain("Minha App")).toBeNull();
    expect(normalizeDomain("steam")).toBeNull();
    expect(normalizeDomain("javascript:alert(1)")).toBeNull();
    expect(normalizeDomain("ftp://site.com")).toBeNull();
  });
});

describe("recognizeSite", () => {
  it("recognizes subdomains, names and aliases", () => {
    expect(recognizeSite("https://accounts.google.com/x").name).toBe("Google");
    expect(recognizeSite("github").domain).toBe("github.com");
    expect(recognizeSite("Gmail").domain).toBe("google.com");
  });

  it("does not trust lookalike domains", () => {
    expect(recognizeSite("github.com.evil.io").known).toBe(false);
    expect(recognizeSite("notgithub.com").known).toBe(false);
  });

  it("keeps unknown sites and plain app names", () => {
    expect(recognizeSite("intranet.empresa.pt")).toMatchObject({
      name: "intranet.empresa.pt",
      known: false,
    });
    expect(recognizeSite("Minha App")).toMatchObject({ name: "Minha App", domain: null });
  });

  it("stores the canonical domain when there is one", () => {
    expect(canonicalSite("https://www.netflix.com/browse")).toBe("netflix.com");
    expect(canonicalSite(" Minha App ")).toBe("Minha App");
  });
});

describe("matchesHost", () => {
  it("matches the domain and its subdomains", () => {
    expect(matchesHost("github.com", "github.com")).toBe(true);
    expect(matchesHost("github.com", "www.github.com")).toBe(true);
    expect(matchesHost("google.com", "accounts.google.com")).toBe(true);
  });

  it("never matches lookalikes or plain app names", () => {
    expect(matchesHost("github.com", "github.com.evil.io")).toBe(false);
    expect(matchesHost("github.com", "notgithub.com")).toBe(false);
    expect(matchesHost("empresa.pt", "pt")).toBe(false);
    expect(matchesHost("Minha App", "minhaapp.com")).toBe(false);
  });
});

describe("matchesQuery", () => {
  const entry = { site: "github.com", username: "ricardo@exemplo.pt" };

  it("finds by username, domain and display name", () => {
    expect(matchesQuery(entry, "ricardo")).toBe(true);
    expect(matchesQuery(entry, "GITHUB")).toBe(true);
    expect(matchesQuery({ ...entry, site: "steampowered.com" }, "steam")).toBe(true);
  });

  it("requires every word, in any order", () => {
    expect(matchesQuery(entry, "ricardo github")).toBe(true);
    expect(matchesQuery(entry, "ricardo netflix")).toBe(false);
  });
});
