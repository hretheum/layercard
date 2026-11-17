// Daily counters for the event card (/k/ and /k/host/). Pure functions, no Workers imports, so they run under node:test.
// Privacy contract: only counters keyed by a day and by normalised campaign tags. No IP, no cookie, no user agent,
// no client or room identifier ever reaches this module or its output.

export const TZ = "Europe/Warsaw";
export const MAX_COMBOS_PER_DAY = 50;
export const OTHER = "inne";
export const PAGES = ["card", "host"] as const;
export const EVENTS = ["hello", "ready", "assembled", "bye"] as const;
export type Page = (typeof PAGES)[number];
export type EventName = (typeof EVENTS)[number];
export type Tags = { source: string; medium: string; campaign: string; content: string };
export type Counts = Record<Page | EventName, number>;
export type Day = { total: Counts; utm: Record<string, Counts> };

/** Same rules as lib/analytics/normalize.ts on the site: lower-case, no accents, [a-z0-9._~+-], at most 64 characters, "@" drops the value. */
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

/** Tags from a query string. `g` (layer number), `fx`, `q` and everything else are ignored on purpose: they are not traffic sources. */
export function tagsFromSearch(search: string): Tags {
  let p: URLSearchParams;
  try { p = new URLSearchParams(search); } catch { p = new URLSearchParams(); }
  return {
    source: normalizeTag(p.get("utm_source")),
    medium: normalizeTag(p.get("utm_medium")),
    campaign: normalizeTag(p.get("utm_campaign")),
    content: normalizeTag(p.get("utm_content")),
  };
}

export const comboKey = (t: Tags) => [t.source, t.medium, t.campaign, t.content].join("|");
export function parseCombo(key: string): Tags {
  const [source = "", medium = "", campaign = "", content = ""] = key.split("|");
  return { source, medium, campaign, content };
}

/** The calendar day (YYYY-MM-DD) in Warsaw time. */
export function dayKey(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));
}

export const emptyCounts = (): Counts => ({ card: 0, host: 0, hello: 0, ready: 0, assembled: 0, bye: 0 });
export const emptyDay = (): Day => ({ total: emptyCounts(), utm: {} });

/**
 * Adds one count to a day. At most MAX_COMBOS_PER_DAY different tag combinations are kept per day; a new combination
 * beyond that goes to the "inne" bucket (all four tags "inne"). The day total always counts everything.
 */
export function addCount(day: Day, what: Page | EventName, tags: Tags): Day {
  day.total[what] += 1;
  let key = comboKey(tags);
  if (!(key in day.utm)) {
    const distinct = Object.keys(day.utm).filter((k) => k !== OTHER_KEY).length;
    if (distinct >= MAX_COMBOS_PER_DAY) key = OTHER_KEY;
  }
  (day.utm[key] ??= emptyCounts())[what] += 1;
  return day;
}
export const OTHER_KEY = [OTHER, OTHER, OTHER, OTHER].join("|");

export type DailyRow = { date: string; total: Counts; utm: (Tags & Counts)[] };
/** The public shape of the read endpoint. Numbers only; there is no field that could hold an identifier. */
export function toRows(days: Record<string, Day>): DailyRow[] {
  return Object.keys(days)
    .sort()
    .reverse()
    .map((date) => ({
      date,
      total: days[date].total,
      utm: Object.entries(days[date].utm).map(([k, c]) => ({ ...parseCombo(k), ...c })),
    }));
}

/** Bots and link-preview fetchers must not count as visits. */
export const BOT_RE = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|slack|curl|wget|python-requests|headless/i;

/** Constant-time string comparison for the bearer token. */
export function tokensEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
