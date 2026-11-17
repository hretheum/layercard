// "Passed on by": a guest who passes the card on can put their own LinkedIn on it. The link travels only
// in the URL (`by` = profile slug, `n` = display name), nothing is stored on the server. The next guest
// gets the passer's own card (see personalize.ts), credited to the original owner.

export type Passer = { slug: string; name: string; role?: string };

const KEY = "layercard.by";
const SLUG = /^[A-Za-z0-9\-_%]{3,100}$/;

const clean = (p: Partial<Passer> | null | undefined): Passer | null => {
  if (!p?.slug || !SLUG.test(p.slug)) return null;
  const name = (p.name ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
  const role = (p.role ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
  return { slug: p.slug, name: name || nameFromSlug(p.slug), ...(role ? { role } : {}) };
};

/** "anna-kowalska-3b2a91" → "Anna Kowalska" (a guess the passer can correct). */
export function nameFromSlug(slug: string): string {
  let s = slug;
  try { s = decodeURIComponent(slug); } catch { /* keep raw */ }
  return s.replace(/-[0-9a-f]{5,}$/i, "").split(/[-_]/).filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1)).join(" ").slice(0, 40);
}

/** Finds a LinkedIn profile link in pasted text. */
export function slugFromText(text: string): string | null {
  const m = text.match(/linkedin\.com\/in\/([A-Za-z0-9\-_%]+)/i);
  return m && SLUG.test(m[1]) ? m[1] : null;
}

export const profileUrl = (p: Passer) => `https://www.linkedin.com/in/${p.slug}/`;

/** The passer named in this page's URL (query or hash). */
export function passerFromUrl(): Passer | null {
  const q = new URLSearchParams(location.search);
  const h = new URLSearchParams(location.hash.slice(1));
  const slug = h.get("by") ?? q.get("by");
  const name = h.get("n") ?? q.get("n");
  const role = h.get("ro") ?? q.get("ro");
  return clean(slug ? { slug, name: name ?? "", role: role ?? "" } : null);
}

/** URL parameters that name the passer: "by=…&n=…", or "" for nobody. */
export const passerParam = (p: Passer | null) =>
  p ? `by=${encodeURIComponent(p.slug)}&n=${encodeURIComponent(p.name)}${p.role ? `&ro=${encodeURIComponent(p.role)}` : ""}` : "";

export function loadOwn(): Passer | null {
  try { return clean(JSON.parse(localStorage.getItem(KEY) ?? "null")); } catch { return null; }
}

export function saveOwn(p: Passer | null) {
  try { p ? localStorage.setItem(KEY, JSON.stringify(p)) : localStorage.removeItem(KEY); } catch { /* private mode */ }
}
