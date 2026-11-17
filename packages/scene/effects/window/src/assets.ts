// Images, the screen-resolution bake, QR module-grid detection, the bundled font and the label atlas.
// The only DOM touched besides the given canvas: detached canvases (OffscreenCanvas when available),
// Image elements for decoding, and `document.fonts` for the bundled FontFace.

export type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;
type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export function makeCanvas(w: number, h: number, ref: HTMLCanvasElement): AnyCanvas {
  const W = Math.max(1, Math.round(w)), H = Math.max(1, Math.round(h));
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(W, H);
  const c = ref.ownerDocument.createElement("canvas");
  c.width = W;
  c.height = H;
  return c;
}

export function ctx2d(c: AnyCanvas, readback = false): Ctx2D {
  const ctx = (c as HTMLCanvasElement).getContext("2d", readback ? { willReadFrequently: true } : undefined) as Ctx2D | null;
  if (!ctx) throw new Error("window: 2D canvas context unavailable");
  return ctx;
}

export function resolveUrl(baseUrl: string, src: string): string {
  const base = new URL(baseUrl.endsWith("/") ? baseUrl : baseUrl + "/", self.location.href);
  return new URL(src, base).href;
}

export async function loadImage(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.decoding = "async";
  img.src = url;
  try {
    await img.decode();
  } catch {
    throw new Error(`window: cannot load layer image ${url}`);
  }
  return img;
}

export interface Bake {
  canvas: AnyCanvas;
  /** integer device-pixel box of the texture (y down) */
  x0: number; y0: number; w: number; h: number;
  /** the exact layer rect inside that box, as a uv rect (u0, v0 bottom, width, height) */
  tu: number; tv: number; tw: number; th: number;
}

/**
 * Rasterises one layer exactly as a 2D composite would. Chrome's drawImage is not invariant under
 * whole-pixel translation when edges fall on thirds of a pixel (float32 device coordinates), so the
 * layer is drawn at its absolute position on a scratch canvas the size of the drawing buffer
 * (`view`) and its device-pixel box is then copied out 1:1 — the same call on the same size of
 * canvas as the flat reference, so what the canvas shows in a flat frame is that reference.
 *
 * When the card lands in a rect that runs past the canvas, part of a layer lies outside `view`. It
 * is not in any flat frame but it is visible while the sheet is in the air, so it is baked too, on
 * a second scratch canvas (`over`) that covers the whole fit and starts (ox, oy) whole device pixels
 * left of / above the drawing buffer. That draw is shifted and not clipped like the reference, so
 * it is only used for the pixels `view` cannot give (WebKit: up to 2/255 apart on edges).
 *
 * Both scratch canvases must be unaccelerated (`willReadFrequently`): on a machine with a GPU both
 * Chromium and WebKit scale `drawImage` on the GPU with a different filter than the software path,
 * and the baked edges then differ from a software 2D composite by up to 74/255.
 */
export function bakeLayer(
  img: CanvasImageSource, dx: number, dy: number, dw: number, dh: number, view: AnyCanvas, ref: HTMLCanvasElement,
  over: AnyCanvas | null = null, ox = 0, oy = 0,
): Bake {
  const x0 = Math.floor(dx + 1e-4), y0 = Math.floor(dy + 1e-4);
  const x1 = Math.ceil(dx + dw - 1e-4), y1 = Math.ceil(dy + dh - 1e-4);
  const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0);
  const vw = view.width, vh = view.height;
  const canvas = makeCanvas(w, h, ref);
  const ctx = ctx2d(canvas, true);
  ctx.imageSmoothingEnabled = false;
  ctx.globalCompositeOperation = "copy";
  const inside = x0 >= 0 && y0 >= 0 && x1 <= vw && y1 <= vh;
  if (!inside && over) {
    const oc = ctx2d(over, true);
    oc.setTransform(1, 0, 0, 1, 0, 0);
    oc.globalCompositeOperation = "source-over";
    oc.imageSmoothingEnabled = true;
    oc.imageSmoothingQuality = "high";
    oc.clearRect(x0 - ox - 1, y0 - oy - 1, w + 2, h + 2);
    oc.drawImage(img, dx - ox, dy - oy, dw, dh);
    ctx.drawImage(over, x0 - ox, y0 - oy, w, h, 0, 0, w, h);
    oc.clearRect(x0 - ox - 1, y0 - oy - 1, w + 2, h + 2);
  }
  // the part the canvas can show: drawn exactly as the reference draws it
  const cx0 = Math.max(0, x0), cy0 = Math.max(0, y0), cx1 = Math.min(vw, x1), cy1 = Math.min(vh, y1);
  if (cx1 > cx0 && cy1 > cy0) {
    const sc = ctx2d(view, true);
    sc.setTransform(1, 0, 0, 1, 0, 0);
    sc.globalCompositeOperation = "source-over";
    sc.clearRect(cx0 - 1, cy0 - 1, cx1 - cx0 + 2, cy1 - cy0 + 2);
    sc.imageSmoothingEnabled = true;
    sc.imageSmoothingQuality = "high";
    sc.drawImage(img, dx, dy, dw, dh);
    if (!inside) {
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(cx0 - x0, cy0 - y0, cx1 - cx0, cy1 - cy0);
    }
    ctx.drawImage(view, cx0, cy0, cx1 - cx0, cy1 - cy0, cx0 - x0, cy0 - y0, cx1 - cx0, cy1 - cy0);
    sc.clearRect(cx0 - 1, cy0 - 1, cx1 - cx0 + 2, cy1 - cy0 + 2);
  }
  return { canvas, x0, y0, w, h, tu: (dx - x0) / w, tv: 1 - (dy - y0 + dh) / h, tw: dw / w, th: dh / h };
}

export interface QrGrid { ox: number; oy: number; nx: number; ny: number }

/**
 * Finds the module grid of a QR image: the top-left finder pattern starts with a 7-module dark run.
 * Returns the grid origin (fraction of the image) and the number of modules across the whole image
 * (quiet zone included). Falls back to a plain 25 x 25 grid when the image does not look like a code.
 */
export function detectQrGrid(img: HTMLImageElement, ref: HTMLCanvasElement): QrGrid {
  const fallback = { ox: 0, oy: 0, nx: 25, ny: 25 };
  try {
    const W = Math.min(512, img.naturalWidth || 256), H = Math.min(512, img.naturalHeight || 256);
    const c = makeCanvas(W, H, ref);
    const ctx = ctx2d(c, true);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, W, H);
    const d = ctx.getImageData(0, 0, W, H).data;
    let lo = 255, hi = 0;
    const luma = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) {
      const a = d[i * 4 + 3] / 255;
      const v = Math.round((0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]) * a + 255 * (1 - a));
      luma[i] = v;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    if (hi - lo < 60) return fallback;
    const th = (lo + hi) / 2;
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (luma[y * W + x] < th) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
    if (x1 < 0) return fallback;
    let run = 0;
    while (x0 + run < W && luma[y0 * W + x0 + run] < th) run++;
    const guess = run / 7;
    const modules = Math.round((x1 - x0 + 1) / guess);
    if (guess < 1.5 || modules < 21 || modules > 177 || (modules - 21) % 4 !== 0) return fallback;
    const m = (x1 - x0 + 1) / modules;
    return { ox: (x0 % m) / W, oy: (y0 % m) / H, nx: W / m, ny: H / m };
  } catch {
    return fallback;
  }
}

export const FONT_FAMILY = "WindowMono";
const FONT_STACK = `${FONT_FAMILY}, ui-monospace, Menlo, Consolas, monospace`;
let fontFace: FontFace | null = null;
let fontReady: Promise<void> | null = null;
let fontUsers = 0;

/** Loads the bundled font once (shared between mounts). A failed load falls back to system monospace. */
export function acquireFont(): Promise<void> {
  fontUsers++;
  if (!fontReady) {
    const face = new FontFace(FONT_FAMILY, `url(${__WINDOW_FONT_URL__})`, { weight: "500", style: "normal" });
    fontFace = face;
    fontReady = face.load().then(
      () => { document.fonts.add(face); },
      () => { /* fall back to the system monospace stack */ },
    );
  }
  return fontReady;
}

export function releaseFont(): void {
  fontUsers--;
  if (fontUsers <= 0) {
    if (fontFace) document.fonts.delete(fontFace);
    fontFace = null;
    fontReady = null;
    fontUsers = 0;
  }
}

export const CHIP_H = 20;
export const PILL_H = 18;
export const BLOCK_GAP = 2;
export const TEXT_PX = 12;
export const TAG_PX = 11;
export const TAG_H = 14;

export interface AtlasItem { text: string; kind: "chip" | "pill" | "tag" }
export interface AtlasEntry { w: number; h: number; u0: number; v0: number; u1: number; v1: number }
export interface Atlas { canvas: AnyCanvas; entries: AtlasEntry[]; bytes: number }

/** Bakes chips (blue, label), pills (red, dims) and the host tag into one texture at device resolution. */
export function buildAtlas(items: AtlasItem[], pr: number, maxW: number, ref: HTMLCanvasElement): Atlas {
  const probe = ctx2d(makeCanvas(4, 4, ref));
  const font = (px: number) => `500 ${px * pr}px ${FONT_STACK}`;
  const sizes: { w: number; h: number; text: string }[] = [];
  let aw = 2, ah = 2;
  for (const it of items) {
    const px = it.kind === "tag" ? TAG_PX : TEXT_PX;
    const pad = it.kind === "tag" ? 0 : 6;
    probe.font = font(px);
    let text = it.text;
    const fits = (s: string) => probe.measureText(s).width / pr + 2 * pad <= maxW;
    if (!fits(text)) {
      while (text.length > 1 && !fits(text + "…")) text = text.slice(0, -1);
      text += "…";
    }
    const w = Math.ceil(probe.measureText(text).width / pr + 2 * pad);
    const h = it.kind === "chip" ? CHIP_H : it.kind === "pill" ? PILL_H : TAG_H;
    sizes.push({ w, h, text });
    aw = Math.max(aw, Math.ceil(w * pr) + 4);
    ah += Math.ceil(h * pr) + 4;
  }
  const canvas = makeCanvas(aw, ah, ref);
  const ctx = ctx2d(canvas);
  const entries: AtlasEntry[] = [];
  let y = 2;
  items.forEach((it, i) => {
    const s = sizes[i];
    const W = Math.ceil(s.w * pr), H = Math.ceil(s.h * pr);
    const px = it.kind === "tag" ? TAG_PX : TEXT_PX;
    ctx.font = font(px);
    ctx.textBaseline = "alphabetic";
    const cap = ctx.measureText("H").actualBoundingBoxAscent || px * pr * 0.72;
    if (it.kind !== "tag") {
      const r = 3 * pr;
      ctx.fillStyle = it.kind === "chip" ? "#2F80FF" : "#FF4D3D";
      ctx.beginPath();
      ctx.moveTo(2 + r, y);
      ctx.arcTo(2 + W, y, 2 + W, y + H, r);
      ctx.arcTo(2 + W, y + H, 2, y + H, r);
      ctx.arcTo(2, y + H, 2, y, r);
      ctx.arcTo(2, y, 2 + W, y, r);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = it.kind === "tag" ? "#2F80FF" : "#FFFFFF";
    ctx.fillText(s.text, 2 + (it.kind === "tag" ? 0 : 6 * pr), Math.round(y + (H + cap) / 2));
    entries.push({ w: W / pr, h: H / pr, u0: 2 / aw, v0: y / ah, u1: (2 + W) / aw, v1: (y + H) / ah });
    y += H + 4;
  });
  return { canvas, entries, bytes: aw * ah * 4 };
}
