// The room: where every flying layer stands once the file has spilled. Pure functions of the
// manifest — never of the camera pose — so the room cannot move when the guest does.
// Card frame of the contract: card width 1, origin at the card centre, +X right, +Y up, +Z towards
// the viewer. Negative z is behind the host phone.
import type { LayerManifest, LayerSpec } from "../../../types";

/**
 * Width of the card in centimetres. An assumption of the brief (a phone-sized card), used only to
 * turn pose units into the centimetres shown on the measurement label; it is never drawn itself.
 */
export const CARD_WIDTH_CM = 7;

/** The wall: the bottom layer, this many card widths across, this far behind the phone. */
export const WALL_W = 6;
export const WALL_Z = -3;
/** The second full-bleed layer (the grid): in front of the wall. */
export const GRID_W = 5;
export const GRID_Z = -2;
/** Further full-bleed layers, should a card have them. */
export const BACK_W = 4.4;
export const BACK_Z = -1.2;
/** The widest of the other layers is this many card widths across; all of them share its magnification. */
export const FLOAT_W = 3;
/**
 * Clear space above and below the phone before the first row of sheets, and between rows. The gap
 * between rows is what a label block needs from 40 cm (about 42 px); nearer rows would bring the
 * lower rows into the frame from a little closer, and put labels on the row above.
 */
export const ROW_CLEAR = 1.3;
export const ROW_GAP = 0.35;
/** Sheets alternate this far left and right of the phone's axis. */
export const FLOAT_X = 0.85;
/**
 * How far a row of sheets comes towards the guest: as far as it stays inside the frame from top to
 * bottom for a camera FIT_CM in front of the phone, on its axis, whose field along the phone's long
 * side is 2 x FIT_HALF_FOV — never nearer to the phone than FLOAT_Z0, never further than FLOAT_Z1.
 * FIT_CM is the closest distance the effect is designed for; it is a constant of the layout, not the
 * live pose. A row that cannot fit from there (it is too tall or too far from the phone) stands at
 * FLOAT_Z0, where a camera sees the most of it from every distance.
 */
export const FIT_CM = 30;
export const FIT_HALF_FOV = (30 * Math.PI) / 180;
export const FIT_MARGIN = 0.94;
export const FLOAT_Z0 = 0.2;
export const FLOAT_Z1 = 1.6;
/** Sheets that share a row stand this far apart in depth, the upper one of the stack nearer the guest. */
export const FLOAT_ZSTEP = 0.14;
/** Sheets are turned inwards by this angle (radians). */
export const FLOAT_YAW = (22 * Math.PI) / 180;

export const KIND_WALL = 0;
export const KIND_BACK = 1;
export const KIND_FLOAT = 2;

export interface RoomSheet {
  /** index into manifest.layers */
  i: number;
  /** stack index among flying layers (0 = bottom) */
  j: number;
  kind: number;
  /** centre of the layer's rect, yaw about +Y (radians), magnification */
  x: number; y: number; z: number; yaw: number; scale: number;
  /** -1 left of the phone, +1 right, 0 centred */
  side: number;
}

interface Flying { spec: LayerSpec; i: number }

function flying(m: LayerManifest): Flying[] {
  return m.layers.map((spec, i) => ({ spec, i })).filter((l) => l.spec.role !== "qr").sort((a, b) => a.spec.z - b.spec.z || a.i - b.i);
}

function fullBleed(m: LayerManifest, s: LayerSpec): boolean {
  return s.rect.w >= 0.9 * m.card.w && s.rect.h >= 0.9 * m.card.h;
}

/** Stack indices of the layers that go behind the phone. A card without a full-bleed layer sends its bottom layer. */
function backdrops(m: LayerManifest, f: Flying[]): number[] {
  const out: number[] = [];
  f.forEach((l, j) => { if (fullBleed(m, l.spec)) out.push(j); });
  if (out.length === 0 && f.length > 0) out.push(0);
  return out;
}

/**
 * Leave order of every flying layer, by stack index: the layers that go behind the phone first,
 * from the bottom up (the room is built from the back), then the others from the top down.
 */
export function leaveOrder(m: LayerManifest): Int32Array {
  const f = flying(m), back = backdrops(m, f), order = new Int32Array(f.length);
  let k = 0;
  for (const j of back) order[j] = k++;
  for (let j = f.length - 1; j >= 0; j--) if (!back.includes(j)) order[j] = k++;
  return order;
}

/** Room pose of every flying layer, by stack index. */
export function layoutRoom(m: LayerManifest): RoomSheet[] {
  const f = flying(m), back = backdrops(m, f), cw = m.card.w, ch = m.card.h;
  const out: RoomSheet[] = f.map((l, j) => ({ i: l.i, j, kind: KIND_FLOAT, x: 0, y: 0, z: 0, yaw: 0, scale: 1, side: 0 }));
  const cx = (s: LayerSpec) => (s.rect.x + s.rect.w / 2 - cw / 2) / cw;
  const cy = (s: LayerSpec) => (ch / 2 - (s.rect.y + s.rect.h / 2)) / cw;

  back.forEach((j, b) => {
    const s = f[j].spec, o = out[j], rw = s.rect.w / cw, rh = s.rect.h / cw;
    o.kind = b === 0 ? KIND_WALL : KIND_BACK;
    const across = b === 0 ? WALL_W : b === 1 ? GRID_W : BACK_W;
    // a wall is measured across; a layer that is not full-bleed must also stay under 13 units tall
    o.scale = Math.min(across / rw, 13 / rh);
    o.z = b === 0 ? WALL_Z : b === 1 ? GRID_Z : BACK_Z + 0.4 * (b - 2);
    o.x = cx(s) * o.scale;
    o.y = cy(s) * o.scale;
  });

  const floats = out.filter((o) => o.kind === KIND_FLOAT);
  if (floats.length === 0) return out;
  let widest = 0;
  for (const o of floats) widest = Math.max(widest, f[o.j].spec.rect.w / cw);
  const S = FLOAT_W / widest;

  // rows: layers whose vertical ranges overlap by half of the smaller one share a row (they stack in depth)
  interface Row { top: number; bot: number; members: RoomSheet[] }
  const rows: Row[] = [];
  const byTop = [...floats].sort((a, b) => cy(f[b.j].spec) - cy(f[a.j].spec) || a.j - b.j);
  for (const o of byTop) {
    const s = f[o.j].spec, h = s.rect.h / cw, top = cy(s) + h / 2, bot = cy(s) - h / 2;
    const row = rows.find((r) => Math.min(r.top, top) - Math.max(r.bot, bot) >= 0.5 * Math.min(r.top - r.bot, h));
    if (row) {
      row.top = Math.max(row.top, top);
      row.bot = Math.min(row.bot, bot);
      row.members.push(o);
    } else rows.push({ top, bot, members: [o] });
  }
  // rows above the card centre climb from the phone's top, the others descend from its bottom
  const above = rows.filter((r) => (r.top + r.bot) / 2 >= 0).reverse();
  const below = rows.filter((r) => (r.top + r.bot) / 2 < 0);
  const rowY = new Map<Row, number>();
  let cur = ROW_CLEAR;
  for (const r of above) { const h = (r.top - r.bot) * S; rowY.set(r, cur + h / 2); cur += h + ROW_GAP; }
  cur = -ROW_CLEAR;
  for (const r of below) { const h = (r.top - r.bot) * S; rowY.set(r, cur - h / 2); cur -= h + ROW_GAP; }

  const fitDist = FIT_CM / CARD_WIDTH_CM, fitTan = Math.tan(FIT_HALF_FOV) * FIT_MARGIN;
  rows.forEach((r, ri) => {
    const side = ri % 2 === 0 ? -1 : 1, mid = (r.top + r.bot) / 2;
    // the row's edge that is furthest from the phone's axis decides how near the guest it may stand
    const y = rowY.get(r)!, edge = Math.abs(y) + ((r.top - r.bot) * S) / 2;
    const z = Math.min(FLOAT_Z1, Math.max(FLOAT_Z0, fitDist - edge / fitTan));
    r.members.forEach((o, q) => {
      const s = f[o.j].spec, under = r.members.filter((p) => p.j < o.j).length;
      o.scale = S;
      o.side = q % 2 === 0 ? side : -side;
      o.x = o.side * FLOAT_X + cx(s) * S * 0.5;
      o.y = y + (cy(s) - mid) * S;
      o.z = z + under * FLOAT_ZSTEP;
      o.yaw = -o.side * FLOAT_YAW;
    });
  });
  return out;
}
