// layercard worker: rooms (one Durable Object per room), chain statistics, static card app under /k.
import { DurableObject } from "cloudflare:workers";
import { BOT_RE, EVENTS, addCount, dayKey, emptyDay, tagsFromSearch, toRows, tokensEqual, type Day, type EventName, type Page, type Tags } from "./daily.ts";

export interface Env {
  ROOM: DurableObjectNamespace<Room>;
  STATS: DurableObjectNamespace<Stats>;
  ASSETS?: Fetcher;
  STATS_NAME?: string;
  /** Secret (wrangler secret put STATS_TOKEN). Without it the daily read endpoint answers 404. */
  STATS_TOKEN?: string;
}

const ROOM_RE = /^\/k\/room\/([a-z0-9]{6,32})$/;
const statsOf = (env: Env) => env.STATS.get(env.STATS.idFromName(env.STATS_NAME ?? "global"));

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    const room = url.pathname.match(ROOM_RE);
    if (room) {
      if (req.headers.get("Upgrade") !== "websocket") return new Response("expected websocket", { status: 426 });
      return env.ROOM.get(env.ROOM.idFromName(room[1])).fetch(req);
    }
    // The saved contact remembers when (and, on the event day, where) we met: the date is the day it is saved.
    if (url.pathname === "/k/content/contact.vcf" && env.ASSETS) {
      const res = await env.ASSETS.fetch(req);
      if (!res.ok) return res;
      const text = await res.text();
      const nl = text.includes("\r\n") ? "\r\n" : "\n";
      const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(new Date()); // YYYY-MM-DD
      const extra = [`item4.X-ABDATE;type=pref:${day}`, "item4.X-ABLabel:We met"];
      if (day === "2026-11-17") extra.push("item5.X-ABRELATEDNAMES:Figma Maker Collective\\, Warsaw", "item5.X-ABLabel:Met at");
      const body = text.replace(/END:VCARD\s*$/, extra.join(nl) + nl + "END:VCARD" + nl);
      return new Response(body, { headers: { "content-type": "text/vcard; charset=utf-8", "cache-control": "no-store" } });
    }
    // Source code of the card (the public GitHub repo).
    if (url.pathname === "/k/code" || url.pathname === "/k/code/") {
      const CODE_URL = "https://github.com/hretheum/layercard";
      return Response.redirect(CODE_URL, 302);
    }
    // Short address for the saved contact: the vCard shows hretheum.com/k/web, the visit still carries the campaign tags.
    if (url.pathname === "/k/web" || url.pathname === "/k/web/") {
      return Response.redirect("https://hretheum.com/?utm_source=figma-maker&utm_medium=event&utm_campaign=figma-maker-event&utm_content=qr", 302);
    }
    if (url.pathname === "/k/api/stats") {
      const res = await statsOf(env).fetch("https://stats/read");
      return new Response(res.body, { headers: { "content-type": "application/json", "cache-control": "no-store" } });
    }
    if (url.pathname === "/k/api/stats-daily") {
      const want = env.STATS_TOKEN;
      if (!want) return new Response("not found", { status: 404 });
      const got = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
      if (req.method !== "GET" || !tokensEqual(got, want)) return new Response("unauthorized", { status: 401, headers: { "cache-control": "no-store" } });
      const days = Math.max(1, Math.min(90, parseInt(url.searchParams.get("days") ?? "30", 10) || 30));
      const res = await statsOf(env).fetch(`https://stats/daily?days=${days}`);
      return new Response(res.body, { headers: { "content-type": "application/json", "cache-control": "no-store" } });
    }
    // Page entries: only the two HTML pages of the card (the worker runs first for them, see wrangler.toml).
    const page: Page | null = url.pathname === "/k/" ? "card" : url.pathname === "/k/host/" ? "host" : null;
    if (page && req.method === "GET" && !BOT_RE.test(req.headers.get("user-agent") ?? "")) {
      ctx.waitUntil(statsOf(env).fetch("https://stats/count", { method: "POST", body: JSON.stringify({ what: page, tags: tagsFromSearch(url.search) }) }).then(() => undefined, () => undefined));
    }
    if (env.ASSETS) return env.ASSETS.fetch(req);
    return new Response("not found", { status: 404 });
  },
};

/** Relays messages between the phones in one room; answers clock pings; counts guest arrivals. */
export class Room extends DurableObject<Env> {
  async fetch(req: Request): Promise<Response> {
    const role = new URL(req.url).searchParams.get("role") === "host" ? "host" : "guest";
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server, [role]);
    // Campaign tags of the page that opened the socket, kept on the socket only (never an identifier).
    server.serializeAttachment({ tags: tagsFromSearch(new URL(req.url).search), seen: [] as string[] });
    this.broadcast(null, { type: "peers", count: this.ctx.getWebSockets().length });
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, data: string | ArrayBuffer) {
    let msg: any;
    try { msg = JSON.parse(typeof data === "string" ? data : new TextDecoder().decode(data)); } catch { return; }
    if (!msg || typeof msg.type !== "string") return;
    if (msg.type === "ping") {
      ws.send(JSON.stringify({ type: "pong", t0: msg.t0, server: Date.now() }));
      return;
    }
    if (msg.type === "hello" && msg.role === "guest") {
      const g = Number.isFinite(msg.g) ? Math.max(0, Math.min(1000, Math.floor(msg.g))) : 0;
      this.ctx.waitUntil(this.env.STATS.get(this.env.STATS.idFromName(this.env.STATS_NAME ?? "global")).fetch("https://stats/hit", {
        method: "POST", body: JSON.stringify({ g }),
      }).then(() => undefined, () => undefined));
    }
    if ((EVENTS as readonly string[]).includes(msg.type)) this.countEvent(ws, msg.type as EventName);
    this.broadcast(ws, msg);
  }

  /** One count per event type per socket: the card resends "ready" once, a reconnect opens a new socket and counts again (numbers are a lower bound anyway). */
  private countEvent(ws: WebSocket, what: EventName) {
    const att = (ws.deserializeAttachment() ?? { tags: tagsFromSearch(""), seen: [] }) as { tags: Tags; seen: string[] };
    if (att.seen.includes(what)) return;
    att.seen.push(what);
    ws.serializeAttachment(att);
    this.ctx.waitUntil(this.env.STATS.get(this.env.STATS.idFromName(this.env.STATS_NAME ?? "global")).fetch("https://stats/count", {
      method: "POST", body: JSON.stringify({ what, tags: att.tags }),
    }).then(() => undefined, () => undefined));
  }

  webSocketClose(ws: WebSocket) {
    const left = this.ctx.getWebSockets().filter((w) => w !== ws).length;
    this.broadcast(ws, { type: "peers", count: left });
  }

  private broadcast(from: WebSocket | null, msg: unknown) {
    const s = JSON.stringify(msg);
    for (const w of this.ctx.getWebSockets()) {
      if (w === from) continue;
      try { w.send(s); } catch { /* socket closing */ }
    }
  }
}

/** Aggregate counters only: how many phones the card reached and the longest chain. No identifiers. */
export class Stats extends DurableObject<Env> {
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    let phones = ((await this.ctx.storage.get("phones")) as number) ?? 0;
    let longest = ((await this.ctx.storage.get("longest")) as number) ?? 0;
    if (url.pathname === "/hit" && req.method === "POST") {
      const { g } = (await req.json().catch(() => ({ g: 0 }))) as { g: number };
      phones += 1;
      longest = Math.max(longest, (g ?? 0) + 1);
      await this.ctx.storage.put({ phones, longest });
    }
    if (url.pathname === "/count" && req.method === "POST") {
      const { what, tags } = (await req.json().catch(() => ({}))) as { what?: string; tags?: Tags };
      if (what && ([...EVENTS, "card", "host"] as string[]).includes(what) && tags) {
        const key = `d:${dayKey(Date.now())}`;
        const day = ((await this.ctx.storage.get(key)) as Day | undefined) ?? emptyDay();
        // tags are normalised again here: this endpoint is internal, but it must never store free text
        const t = tagsFromSearch(new URLSearchParams({ utm_source: tags.source ?? "", utm_medium: tags.medium ?? "", utm_campaign: tags.campaign ?? "", utm_content: tags.content ?? "" }).toString());
        await this.ctx.storage.put(key, addCount(day, what as Page | EventName, t));
      }
      return new Response(null, { status: 204 });
    }
    if (url.pathname === "/daily") {
      const days = Math.max(1, Math.min(90, parseInt(url.searchParams.get("days") ?? "30", 10) || 30));
      const list = await this.ctx.storage.list<Day>({ prefix: "d:", reverse: true, limit: days });
      const byDay: Record<string, Day> = {};
      for (const [k, v] of list) byDay[k.slice(2)] = v;
      return Response.json({
        timezone: "Europe/Warsaw",
        note: "Lower bound: no consent, no cookie, no IP and no identifier, so there are no unique visitors and no returns. A day is a calendar day in Warsaw time.",
        days: toRows(byDay),
      });
    }
    return Response.json({ phones, longest });
  }
}
