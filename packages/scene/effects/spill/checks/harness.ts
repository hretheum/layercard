// Test page: mounts the effect (source build with test hooks, or the committed dist bundle) and
// exposes pixel helpers to the Playwright specs as `window.H`.
import type { LayerManifest, MountOptions, Rect } from "../../../types";
import * as source from "../src/index";
import type { SpillHandle } from "../src/effect";

type Opts = Partial<MountOptions> & { w?: number; h?: number; build?: "src" | "dist" };

const stage = document.getElementById("stage") as HTMLDivElement;
let canvas = document.getElementById("c") as HTMLCanvasElement;

function contain(card: { w: number; h: number }, area: Rect): Rect & { s: number } {
  const s = Math.min(area.w / card.w, area.h / card.h);
  const w = card.w * s, h = card.h * s;
  return { x: area.x + (area.w - w) / 2, y: area.y + (area.h - h) / 2, w, h, s };
}

const H = {
  manifest: null as LayerManifest | null,
  handle: null as SpillHandle | null,
  events: [] as unknown[],
  images: new Map<string, HTMLImageElement>(),
  base: "/examples/jane-maker/",

  async init(): Promise<boolean> {
    H.manifest = (await (await fetch(H.base + "layers.json")).json()) as LayerManifest;
    for (const l of H.manifest.layers) {
      const img = new Image();
      img.src = H.base + l.src;
      await img.decode();
      H.images.set(l.id, img);
    }
    return true;
  },

  /** A fresh canvas element (a canvas keeps its first context forever, so remount tests reuse #c). */
  freshCanvas(): void {
    const c = document.createElement("canvas");
    c.id = "c";
    canvas.replaceWith(c);
    canvas = c;
  },

  async mount(o: Opts = {}): Promise<boolean> {
    if (!H.manifest) await H.init();
    H.handle?.dispose();
    H.handle = null;
    H.events = [];
    stage.style.width = (o.w ?? 390) + "px";
    stage.style.height = (o.h ?? 844) + "px";
    const distUrl = "/dist/spill.js";
    const mod: typeof source = o.build === "dist" ? await import(/* @vite-ignore */ distUrl) : source;
    const { w: _w, h: _h, build: _b, ...rest } = o;
    H.handle = (await mod.mount(canvas, {
      role: "host", layers: H.manifest!, baseUrl: H.base, quality: "test", reduced: false, test: true,
      onLayer: (e: unknown) => H.events.push(e),
      onDone: (e: unknown) => H.events.push(e),
      ...rest,
    })) as SpillHandle;
    return true;
  },

  /** Current canvas pixels (straight alpha as the 2D canvas reports them). */
  pixels(): ImageData {
    const c = document.createElement("canvas");
    c.width = canvas.width;
    c.height = canvas.height;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(canvas, 0, 0);
    return ctx.getImageData(0, 0, c.width, c.height);
  },

  /**
   * The flat reference: a plain 2D-canvas composite of the layers in z order on card.background,
   * card fitted (contain, centred) into `area` (canvas CSS px; whole canvas when omitted).
   */
  reference(o: { area?: Rect; qr?: boolean } = {}): ImageData {
    const m = H.manifest!, W = canvas.width, Hh = canvas.height;
    const sx = W / canvas.clientWidth, sy = Hh / canvas.clientHeight;
    const a = o.area ?? { x: 0, y: 0, w: canvas.clientWidth, h: canvas.clientHeight };
    const f = contain(m.card, { x: a.x * sx, y: a.y * sy, w: a.w * sx, h: a.h * sy });
    const c = document.createElement("canvas");
    c.width = W;
    c.height = Hh;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    ctx.fillStyle = m.card.background;
    ctx.fillRect(0, 0, W, Hh);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    const layers = [...m.layers].sort((p, q) => p.z - q.z);
    for (const l of layers) {
      if (l.role === "qr" && o.qr === false) continue;
      ctx.drawImage(H.images.get(l.id)!, f.x + l.rect.x * f.s, f.y + l.rect.y * f.s, l.rect.w * f.s, l.rect.h * f.s);
    }
    return ctx.getImageData(0, 0, W, Hh);
  },

  /** Mean / max absolute difference per channel (0..255), optionally inside a device-px rect. */
  compare(a: ImageData, b: ImageData, r?: Rect): { mad: number; max: number; over8: number; n: number } {
    const x0 = Math.max(0, Math.floor(r?.x ?? 0)), y0 = Math.max(0, Math.floor(r?.y ?? 0));
    const x1 = Math.min(a.width, Math.ceil(r ? r.x + r.w : a.width)), y1 = Math.min(a.height, Math.ceil(r ? r.y + r.h : a.height));
    let sum = 0, max = 0, over8 = 0, n = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = (y * a.width + x) * 4;
      for (let c = 0; c < 4; c++) {
        const d = Math.abs(a.data[i + c] - b.data[i + c]);
        sum += d;
        if (d > max) max = d;
        if (d > 8) over8++;
        n++;
      }
    }
    return { mad: sum / n, max, over8, n };
  },

  /** PNG data URL of the canvas over an optional backdrop colour. */
  png(backdrop?: string): string {
    const c = document.createElement("canvas");
    c.width = canvas.width;
    c.height = canvas.height;
    const ctx = c.getContext("2d")!;
    if (backdrop) {
      ctx.fillStyle = backdrop;
      ctx.fillRect(0, 0, c.width, c.height);
    }
    ctx.drawImage(canvas, 0, 0);
    return c.toDataURL("image/png");
  },

  /** Mean relative luminance of the canvas composited over `backdrop` (0..1). */
  luminance(backdrop: [number, number, number]): number {
    const d = H.pixels().data;
    const lin = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) {
      const a = d[i + 3] / 255;
      sum += 0.2126 * lin(d[i] * a + backdrop[0] * (1 - a)) + 0.7152 * lin(d[i + 1] * a + backdrop[1] * (1 - a)) + 0.0722 * lin(d[i + 2] * a + backdrop[2] * (1 - a));
    }
    return sum / (d.length / 4);
  },

  /** FNV-1a hash of the current canvas pixels: equal hashes mean identical frames. */
  hash(): string {
    const d = H.pixels().data;
    let h = 0x811c9dc5;
    for (let i = 0; i < d.length; i++) {
      h ^= d[i];
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16);
  },

  /** Decodes a PNG data URL (a Playwright screenshot of the canvas) into pixels. */
  async fromPng(url: string): Promise<ImageData> {
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, c.width, c.height);
  },

  durations(): Record<string, number> {
    return source.durations(H.manifest!);
  },

  /**
   * Geometry the room checks share, independent of the effect: a pinhole camera with the canvas
   * size, vertical field of view and aspect the effect was given (camera space: looking down -z).
   */
  geo(W: number, Hh: number, fov: number, aspect: number) {
    type P3 = [number, number, number];
    type P2 = [number, number];
    const f = 1 / Math.tan((fov * Math.PI) / 360);
    const toPx = (p: P3): P2 => [(((p[0] * f) / aspect / -p[2]) * 0.5 + 0.5) * W, (0.5 - ((p[1] * f) / -p[2]) * 0.5) * Hh];
    const apply = (M: ArrayLike<number>, x: number, y: number, z: number): P3 =>
      [M[0] * x + M[4] * y + M[8] * z + M[12], M[1] * x + M[5] * y + M[9] * z + M[13], M[2] * x + M[6] * y + M[10] * z + M[14]];
    const inside = (p: P2): boolean => p[0] >= 0 && p[0] <= W && p[1] >= 0 && p[1] <= Hh;
    const clipNear = (pts: P3[], near = 0.12): P3[] => {
      const out: P3[] = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length], ina = a[2] <= -near, inb = b[2] <= -near;
        if (ina) out.push(a);
        if (ina !== inb && (pts.length > 2 || i === 0)) { const k = (-near - a[2]) / (b[2] - a[2]); out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, -near]); }
      }
      return out;
    };
    const clip2 = (poly: P2[], x0: number, y0: number, x1: number, y1: number): P2[] => {
      const edge = (src: P2[], axis: number, bound: number, keep: number): P2[] => {
        const out: P2[] = [];
        for (let i = 0; i < src.length; i++) {
          const a = src[i], b = src[(i + 1) % src.length], ina = keep > 0 ? a[axis] >= bound : a[axis] <= bound, inb = keep > 0 ? b[axis] >= bound : b[axis] <= bound;
          if (ina) out.push(a);
          if (ina !== inb) { const k = (bound - a[axis]) / (b[axis] - a[axis]); out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]); }
        }
        return out;
      };
      return edge(edge(edge(edge(poly, 0, x0, 1), 0, x1, -1), 1, y0, 1), 1, y1, -1);
    };
    const area = (p: P2[]): number => { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return Math.abs(a) / 2; };
    /** Column-major 4x4 from a position and a quaternion (x, y, z, w). */
    const fromFrame = (pos: number[], q: number[]): number[] => {
      const [x, y, z, w] = q;
      return [1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w), 0, 2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w), 0,
        2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y), 0, pos[0], pos[1], pos[2], 1];
    };
    /** Visible part of a quad given as 12 numbers (four corners in camera space): its area in CSS px2 and whether the whole quad is inside the canvas. */
    const visible = (c: number[]): { area: number; allIn: boolean } => {
      const q: P3[] = [0, 1, 2, 3].map((k) => [c[k * 3], c[k * 3 + 1], c[k * 3 + 2]] as P3);
      const near = clipNear(q), proj = near.map(toPx), vis = near.length >= 3 ? clip2(proj, 0, 0, W, Hh) : [];
      return { area: vis.length >= 3 ? area(vis) : 0, allIn: near.length === 4 && proj.every(inside) };
    };
    /** A guide (ax, ay, az, bx, by, bz, ...) runs past a frame edge: at least 40 px of it are inside the canvas and it does not end there. */
    const pastEdge = (g: number[]): boolean => {
      const a3: P3 = [g[0], g[1], g[2]], b3: P3 = [g[3], g[4], g[5]];
      if (a3[2] > -0.12 && b3[2] > -0.12) return false;
      const cut = (p: P3, q: P3): P3 => { if (p[2] <= -0.12) return p; const k = (-0.12 - p[2]) / (q[2] - p[2]); return [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k, -0.12]; };
      const a = toPx(cut(a3, b3)), b = toPx(cut(b3, a3));
      let t0 = 0, t1 = 1;
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const clipT = (p: number, q: number): boolean => { if (p === 0) return q >= 0; const t = q / p; if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; } return true; };
      return clipT(-dx, a[0]) && clipT(dx, W - a[0]) && clipT(-dy, a[1]) && clipT(dy, Hh - a[1]) && (t1 - t0) * Math.hypot(dx, dy) >= 40 && (!inside(a) || !inside(b));
    };
    return { toPx, apply, inside, clipNear, clip2, area, fromFrame, visible, pastEdge };
  },
};

(window as unknown as { H: typeof H }).H = H;
export type Harness = typeof H;
