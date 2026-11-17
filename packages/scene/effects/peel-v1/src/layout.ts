// Label placement for the selection chrome. Pure and allocation-free: slots are preallocated and
// mutated in place every frame. All coordinates are CSS px, y down.
import { CHIP_H } from "./assets";

export const LABEL_PITCH = 1.4;
export const LABEL_GAP = 14;
export const LABEL_STUB = 8;
export const LABEL_RAIL = 7;

export interface LabelSlot {
  /** -1 = left of the stack, +1 = right */
  side: number;
  /** block size */
  bw: number; bh: number;
  /** projected corners of the sheet (top-left, top-right, bottom-left, bottom-right) */
  tlx: number; tly: number; trx: number; try_: number;
  blx: number; bly: number; brx: number; bry: number;
  // results
  /** block top-left */
  x: number; y: number;
  /** inner edge of the block (where the stub starts), the rail (elbow) and the gate where the leader turns to the sheet */
  ix: number; ex: number; ey: number; gy: number;
  /** anchor on the sheet */
  ax: number; ay: number;
  /** 0 beside the stack, -1 above it, +1 below it; row 0 is the one nearest to the stack */
  zone: number; row: number;
}

export function makeSlot(side: number): LabelSlot {
  return {
    side, bw: 0, bh: 0, tlx: 0, tly: 0, trx: 0, try_: 0, blx: 0, bly: 0, brx: 0, bry: 0,
    x: 0, y: 0, ix: 0, ex: 0, ey: 0, gy: 0, ax: 0, ay: 0, zone: 0, row: 0,
  };
}

function orient(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

/** Proper intersection of segments p1-p2 and p3-p4. */
export function segmentsCross(
  x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number,
): boolean {
  const d1 = orient(x3, y3, x4, y4, x1, y1), d2 = orient(x3, y3, x4, y4, x2, y2);
  const d3 = orient(x1, y1, x2, y2, x3, y3), d4 = orient(x1, y1, x2, y2, x4, y4);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** Rows of blocks reserved above and below the stack when a side cannot sit beside it. */
export function rowsFor(count: number): number {
  return Math.ceil(count / 2);
}

/** Height reserved at each end of the stack for `rows` rows of blocks `bh` tall. */
export function reserveFor(rows: number, bh: number): number {
  return rows > 0 ? (rows - 1) * LABEL_PITCH * bh + bh + LABEL_GAP : 0;
}

/** How many rows fit into `room` px, and the height `rows` rows take (module-level: nothing is allocated per frame). */
const rowsIn = (room: number, bh: number, pitch: number): number => (room >= bh ? Math.floor((room - bh) / pitch + 1e-6) + 1 : 0);
const spanOf = (rows: number, bh: number, pitch: number): number => (rows > 0 ? (rows - 1) * pitch + bh : 0);

/** Insertion sort of `order[0..m)` by a key read from the slots (m <= 8, no allocation). */
function sortBy(order: Int32Array, m: number, s: LabelSlot[], key: (o: LabelSlot) => number, from = 0): void {
  for (let a = from + 1; a < m; a++) {
    const v = order[a], k = key(s[v]);
    let b = a - 1;
    while (b >= from && key(s[order[b]]) > k) { order[b + 1] = order[b]; b--; }
    order[b + 1] = v;
  }
}

const anchorY = (o: LabelSlot): number => o.ay;
const anchorX = (o: LabelSlot): number => o.ax;
const anchorXRev = (o: LabelSlot): number => -o.ax;
let boxMinY = 0, boxMaxY = 0;
/**
 * Negative when the sheet's top corner is nearer to the top of the stack than its bottom corner is
 * to the bottom. Biased by 8 % of the stack height so sheets that span the stack go above.
 */
const zoneKey = (o: LabelSlot): number => (o.tly - boxMinY) - (boxMaxY - o.bly) - 0.08 * (boxMaxY - boxMinY);

/**
 * Places every block. A side goes beside the stack when its widest block fits between the stack and
 * the margin: blocks follow the vertical order of their anchors, leader = stub + diagonal.
 * Otherwise its blocks are stacked in rows above and below the stack (each sheet to the nearer end,
 * at most half of them per end): the leader runs along the row to a rail, drops to a gate just
 * outside the stack and only then turns to the sheet corner, so it never passes behind another block.
 * Any remaining crossing between two leaders of one group is removed by swapping their slots.
 */
export function layoutLabels(
  s: LabelSlot[], n: number, minX: number, minY: number, maxX: number, maxY: number,
  W: number, H: number, mx: number, my: number, order: Int32Array,
): void {
  let bh = 0;
  for (let i = 0; i < n; i++) if (s[i].bh > bh) bh = s[i].bh;
  const pitch = LABEL_PITCH * bh;
  boxMinY = minY;
  boxMaxY = maxY;
  for (let side = -1; side <= 1; side += 2) {
    let m = 0, maxW = 0;
    for (let i = 0; i < n; i++) {
      if (s[i].side !== side) continue;
      order[m++] = i;
      if (s[i].bw > maxW) maxW = s[i].bw;
    }
    if (m === 0) continue;
    const band = side < 0 ? minX - mx - LABEL_GAP : W - mx - maxX - LABEL_GAP;
    const beside = band >= maxW;
    const inner = beside ? (side < 0 ? minX - LABEL_GAP : maxX + LABEL_GAP) : side < 0 ? mx + maxW : W - mx - maxW;
    let above = 0;
    if (beside) {
      for (let q = 0; q < m; q++) {
        const o = s[order[q]];
        o.zone = 0;
        o.ax = side < 0 ? o.blx : o.brx;
        o.ay = side < 0 ? o.bly : o.bry;
      }
      sortBy(order, m, s, anchorY);
      let prev = -1e9;
      for (let q = 0; q < m; q++) {
        const o = s[order[q]];
        o.row = q;
        o.y = Math.max(o.ay - CHIP_H / 2, prev + pitch);
        prev = o.y;
      }
      // the column keeps to the vertical extent of the stack (rows of the other side live above and
      // below it), or to the margins when the stack is shorter than the column
      const need = (m - 1) * pitch + bh;
      const top = maxY - minY >= need ? Math.max(my, minY) : my;
      const bottom = maxY - minY >= need ? Math.min(H - my, maxY) : H - my;
      const last = s[order[m - 1]];
      const over = last.y + last.bh - bottom;
      if (over > 0) for (let q = 0; q < m; q++) s[order[q]].y -= over;
      prev = top - pitch;
      for (let q = 0; q < m; q++) {
        const o = s[order[q]];
        if (o.y < prev + pitch) o.y = prev + pitch;
        prev = o.y;
      }
    } else {
      // rows that fit between the stack and the margin at each end; at most half of the blocks go to
      // one end unless the other end has no room for its half
      const half = rowsFor(m);
      const roomUp = rowsIn(minY - LABEL_GAP - my, bh, pitch), roomDown = rowsIn(H - my - maxY - LABEL_GAP, bh, pitch);
      const capUp = Math.min(roomUp, Math.max(half, m - roomDown)), capDown = Math.min(roomDown, Math.max(half, m - roomUp));
      sortBy(order, m, s, zoneKey);
      for (let q = 0; q < m; q++) if (zoneKey(s[order[q]]) <= 0) above++;
      above = Math.min(above, capUp);
      if (m - above > capDown) above = Math.min(m, Math.max(above, m - capDown, capUp + capDown >= m ? 0 : Math.round((m * capUp) / Math.max(1, capUp + capDown))));
      for (let q = 0; q < m; q++) {
        const o = s[order[q]], up = q < above;
        o.zone = up ? -1 : 1;
        o.ax = side < 0 ? (up ? o.tlx : o.blx) : up ? o.trx : o.brx;
        o.ay = side < 0 ? (up ? o.tly : o.bly) : up ? o.try_ : o.bry;
      }
      // row 0 (nearest to the stack, shortest rail) takes the outermost anchor
      sortBy(order, above, s, side < 0 ? anchorX : anchorXRev);
      sortBy(order, m, s, side < 0 ? anchorX : anchorXRev, above);
      for (let q = 0; q < m; q++) s[order[q]].row = q < above ? q : q - above;
    }
    // rows keep to the margins even when the stack leaves no room above or below it: they move inwards
    const baseUp = Math.max(minY - LABEL_GAP, my + spanOf(above, bh, pitch));
    const baseDown = Math.min(maxY + LABEL_GAP, H - my - spanOf(m - above, bh, pitch));
    const gateUp = baseUp + LABEL_GAP * 0.55, gateDown = baseDown - LABEL_GAP * 0.55;
    // uncross: swap the slots of any two crossing leaders in the same group
    for (let pass = 0; pass < 8; pass++) {
      let swapped = false;
      for (let a = 0; a < m; a++) for (let b = a + 1; b < m; b++) {
        const p = s[order[a]], q = s[order[b]];
        if (p.zone !== q.zone) continue;
        let cross: boolean;
        if (beside) {
          const ex = inner - side * LABEL_STUB;
          cross = segmentsCross(ex, p.y + CHIP_H / 2, p.ax, p.ay, ex, q.y + CHIP_H / 2, q.ax, q.ay);
        } else {
          const gy = p.zone < 0 ? gateUp : gateDown;
          cross = segmentsCross(
            inner - side * (LABEL_STUB + LABEL_RAIL * p.row), gy, p.ax, p.ay,
            inner - side * (LABEL_STUB + LABEL_RAIL * q.row), gy, q.ax, q.ay,
          );
        }
        if (cross) {
          if (beside) { const y = p.y; p.y = q.y; q.y = y; }
          const r = p.row; p.row = q.row; q.row = r;
          swapped = true;
        }
      }
      if (!swapped) break;
    }
    for (let q = 0; q < m; q++) {
      const o = s[order[q]];
      o.ix = inner;
      o.x = side < 0 ? inner - o.bw : inner;
      if (beside) {
        o.ex = inner - side * LABEL_STUB;
        o.ey = o.gy = o.y + CHIP_H / 2;
      } else {
        o.y = o.zone < 0 ? baseUp - o.bh - o.row * pitch : baseDown + o.row * pitch;
        o.ex = inner - side * (LABEL_STUB + LABEL_RAIL * o.row);
        o.ey = o.y + CHIP_H / 2;
        o.gy = o.zone < 0 ? gateUp : gateDown;
      }
    }
  }
}
