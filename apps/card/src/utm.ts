// Campaign tags that a card link passes on to the next phone, so the worker's daily counters attribute a whole chain to the source
// that started it. Only the four utm_* keys survive, each cut by the same rules as the worker (worker/src/daily.ts) and the site
// (lib/analytics/normalize.ts). Everything else on the page address (g, fx, q, any other parameter) is dropped, and no identifier is ever added.

export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;

export function normalizeTag(v: unknown): string {
  if (typeof v !== "string" || v.includes("@")) return "";
  return v
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._~+-]/g, "")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

/** "utm_source=qr&utm_campaign=figma-maker" from a query string; "" when there is nothing to pass on. */
export function inheritedUtm(search: string): string {
  let p: URLSearchParams;
  try { p = new URLSearchParams(search); } catch { return ""; }
  const out = new URLSearchParams();
  for (const k of UTM_KEYS) {
    const v = normalizeTag(p.get(k));
    if (v) out.set(k, v);
  }
  return out.toString();
}
