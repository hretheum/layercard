// Room client: WebSocket to the room Durable Object, clock sync by pings, typed message handlers.
export type Msg = { type: string; [k: string]: any };
type Handler = (m: Msg) => void;

const BASE = import.meta.env.BASE_URL; // "/k/"
const epochNow = () => performance.timeOrigin + performance.now();

export function newRoomId(): string {
  const a = new Uint8Array(10);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => "abcdefghijkmnpqrstuvwxyz23456789"[b % 32]).join("");
}

export function newClientId(): string { return newRoomId(); }

export class RoomClient {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<Handler>>();
  private offset = 0;
  private bestRtt = Infinity;
  private tries = 0;
  private closed = false;
  open = false;

  constructor(private room: string, private role: "host" | "guest") { this.connect(); }

  private connect() {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    // Campaign tags travel with the socket so the worker can count phone events per source; `g` is a layer number and is not sent.
    const tags = new URLSearchParams();
    const here = new URLSearchParams(location.search);
    for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content"]) { const v = here.get(k); if (v) tags.set(k, v.slice(0, 80)); }
    const ws = new WebSocket(`${proto}://${location.host}${BASE}room/${this.room}?role=${this.role}${tags.size ? "&" + tags : ""}`);
    this.ws = ws;
    ws.onopen = () => {
      this.open = true; this.tries = 0;
      for (let i = 0; i < 6; i++) setTimeout(() => this.raw({ type: "ping", t0: epochNow() }), i * 150);
      this.emit({ type: "open" });
    };
    ws.onmessage = (e) => {
      let m: Msg;
      try { m = JSON.parse(e.data); } catch { return; }
      if (m.type === "pong") {
        const rtt = epochNow() - m.t0;
        if (rtt < this.bestRtt) { this.bestRtt = rtt; this.offset = m.server - (m.t0 + rtt / 2); }
        return;
      }
      this.emit(m);
    };
    ws.onclose = () => {
      this.open = false;
      this.emit({ type: "close" });
      if (!this.closed && this.tries < 6) { this.tries++; setTimeout(() => this.connect(), 600 * this.tries); }
    };
  }

  private raw(m: Msg) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(m)); }
  send(m: Msg) { this.raw(m); }

  on(type: string, fn: Handler) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(fn);
    return () => this.handlers.get(type)!.delete(fn);
  }
  private emit(m: Msg) { this.handlers.get(m.type)?.forEach((fn) => fn(m)); this.handlers.get("*")?.forEach((fn) => fn(m)); }

  /** Server time now (ms since epoch). */
  serverNow() { return epochNow() + this.offset; }
  /** Converts a server time to this device's performance.now() domain. */
  toLocal(serverMs: number) { return serverMs - this.offset - performance.timeOrigin; }
  get rtt() { return this.bestRtt; }

  close() { this.closed = true; this.ws?.close(); }
}
