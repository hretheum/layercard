// The tracking marker: one ArUco 4x4 marker (id 5) in the bottom zone of the card, where the QR code
// sits before it dissolves. The shell draws it on top of the scene after `connect`.
import type { LayerManifest } from "../../../packages/scene/types";

export const MARKER_ID = 5;
const CELLS = 8; // quiet + border + 4 bits + border + quiet

export interface Slot { x: number; y: number; s: number } // design px of the outer square (with quiet zone)

export function markerSlot(m: LayerManifest): Slot {
  const W = m.card.w, H = m.card.h;
  const s = Math.round(W * 0.5);
  const inset = Math.round(W * 0.105);
  return { x: Math.round((W - s) / 2), y: H - inset - s, s };
}

/** Corners of the black marker square in card units (origin at centre, +x right, +y up, width 1). */
export function markerCorners(m: LayerManifest): [number, number][] {
  const W = m.card.w, H = m.card.h, slot = markerSlot(m), c = slot.s / CELLS;
  const x0 = slot.x + c, y0 = slot.y + c, x1 = slot.x + slot.s - c, y1 = slot.y + slot.s - c;
  const u = (x: number, y: number): [number, number] => [(x - W / 2) / W, -(y - H / 2) / W];
  return [u(x0, y0), u(x1, y0), u(x1, y1), u(x0, y1)];
}

/** The 4x4 bit pattern of marker id 5 in ARUCO_4X4_1000 (row-major, "1" = white). */
function bits(): string {
  const AR = (globalThis as any).AR;
  return new AR.Dictionary("ARUCO_4X4_1000").codeList[MARKER_ID];
}

/** Draws the marker into a canvas that covers the scene canvas, using the same contain fit. */
export function drawMarker(canvas: HTMLCanvasElement, m: LayerManifest, visible: boolean) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!visible) return;
  const k = Math.min(w / m.card.w, h / m.card.h) * dpr;
  const ox = (canvas.width - m.card.w * k) / 2, oy = (canvas.height - m.card.h * k) / 2;
  const slot = markerSlot(m), c = slot.s / CELLS;
  ctx.setTransform(k, 0, 0, k, ox, oy);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(slot.x, slot.y, slot.s, slot.s);
  ctx.fillStyle = "#000000";
  ctx.fillRect(slot.x + c, slot.y + c, c * 6, c * 6);
  ctx.fillStyle = "#FFFFFF";
  const b = bits();
  for (let r = 0; r < 4; r++) for (let q = 0; q < 4; q++) {
    if (b[r * 4 + q] === "1") ctx.fillRect(slot.x + c * (2 + q) - 0.25, slot.y + c * (2 + r) - 0.25, c + 0.5, c + 0.5);
  }
}
