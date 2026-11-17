// Test page: mounts the effect (source build with test hooks, or the committed dist bundle) and
// exposes pixel helpers to the Playwright specs as `window.H`.
import type { LayerManifest, MountOptions, Rect } from "../../../types";
import * as source from "../src/index";
import type { WindowHandle } from "../src/effect";

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
  handle: null as WindowHandle | null,
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
    const distUrl = "/dist/window.js";
    const mod: typeof source = o.build === "dist" ? await import(/* @vite-ignore */ distUrl) : source;
    const { w: _w, h: _h, build: _b, ...rest } = o;
    H.handle = (await mod.mount(canvas, {
      role: "host", layers: H.manifest!, baseUrl: H.base, quality: "test", reduced: false, test: true,
      onLayer: (e: unknown) => H.events.push(e),
      onDone: (e: unknown) => H.events.push(e),
      ...rest,
    })) as WindowHandle;
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
};

(window as unknown as { H: typeof H }).H = H;
export type Harness = typeof H;
