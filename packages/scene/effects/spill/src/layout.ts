// Label placement for the selection chrome at room scale. Allocation-free: labels and their
// buffers are preallocated and mutated in place every frame. All coordinates are CSS px, y down.
//
// A sheet the size of a table is rarely whole inside the frame, so a label cannot sit on a corner
// of the sheet: it sits on the *visible* part of it, like a frame title in a design tool — on the
// top-most point of the visible outline, above it when there is room, inside it otherwise — and
// blocks that would overlap are pushed apart. A sheet with no visible part worth naming has no label.
//
// `placeLabels` is the stateless layout. The short history the contract allows for chrome (v1.1)
// is added in two places: while the pose moves, two blocks that compete for one spot keep the order
// they had (`pref`), and `easeLabels` lets a block ignore moves of its place smaller than a dead
// band and follow larger ones through a critically damped spring. Once the pose rests both go to
// the stateless layout. The sheet end of every leader stays exact.

/** Clear px between a block and the outline it sits on, and between two blocks. */
export const LABEL_GAP = 4;
export const LABEL_SEP = 4;
/** A block ignores changes of its place smaller than this (CSS px) while the pose moves. */
export const LABEL_DEAD = 2;
/** The pose counts as resting after this many seconds without change; then the chrome goes to its stateless layout. */
export const LABEL_STILL = 0.05;
/** Two blocks whose unpushed places are closer than this (CSS px) keep their order while the pose moves. */
export const LABEL_ORDER_HOLD = 14;
export const LABEL_MAX = 8;
/** Critically damped spring: within 0.1 % of a step after 0.25 s, at most 23 % of it in one 60 Hz frame. */
const OMEGA = 38;
/** Visible area (CSS px²) below which a sheet is not named. */
export const LABEL_MIN_AREA = 700;
export const POLY_MAX = 12;

export interface RoomLabel {
  /** block size */
  bw: number; bh: number;
  /** -1: the block hangs on the left end of the visible top edge, +1: on the right end */
  side: number;
  /** the sheet's chrome is on in this frame */
  on: boolean;
  /** visible outline of the sheet: n points (x, y pairs) and its area; n = 0 when nothing is visible */
  poly: Float64Array; n: number; area: number;
  /** anchor on the visible outline */
  ax: number; ay: number;
  /** stateless place of the block (top-left) */
  tx: number; ty: number;
  /** the place the block is heading for (the stateless place seen through the dead band) */
  gx: number; gy: number;
  /** where the block is drawn, and its speed */
  x: number; y: number; vx: number; vy: number;
  /** the place before blocks were pushed apart */
  by: number;
  /** 1 shown; 0 while the block gives way to another one it has to pass */
  fade: number;
  shown: boolean;
  held: boolean;
}

export function makeLabel(): RoomLabel {
  return {
    bw: 0, bh: 0, side: -1, on: false, poly: new Float64Array(POLY_MAX * 2), n: 0, area: 0, ax: 0, ay: 0,
    tx: 0, ty: 0, gx: 0, gy: 0, x: 0, y: 0, vx: 0, vy: 0, by: 0, fade: 1, shown: false, held: false,
  };
}

/**
 * Clips a polygon in camera space (x, y, z triples, camera looking down -z) against the plane
 * z = -near, keeping what is in front of the camera. Returns the number of points written to `out`.
 */
export function clipNear(pts: Float64Array, n: number, near: number, out: Float64Array): number {
  let m = 0;
  for (let i = 0; i < n; i++) {
    const a = i * 3, b = ((i + 1) % n) * 3;
    const za = pts[a + 2], zb = pts[b + 2], ina = za <= -near, inb = zb <= -near;
    if (ina) { out[m * 3] = pts[a]; out[m * 3 + 1] = pts[a + 1]; out[m * 3 + 2] = za; m++; }
    if (ina !== inb) {
      const k = (-near - za) / (zb - za);
      out[m * 3] = pts[a] + (pts[b] - pts[a]) * k;
      out[m * 3 + 1] = pts[a + 1] + (pts[b + 1] - pts[a + 1]) * k;
      out[m * 3 + 2] = -near;
      m++;
    }
  }
  return m;
}

/** Sutherland–Hodgman against one edge of an axis-aligned rect. axis 0 = x, 1 = y; keep = +1 keeps >= bound, -1 keeps <= bound. */
function clipEdge(src: Float64Array, n: number, axis: number, bound: number, keep: number, dst: Float64Array): number {
  let m = 0;
  for (let i = 0; i < n; i++) {
    const a = i * 2, b = ((i + 1) % n) * 2;
    const va = src[a + axis], vb = src[b + axis];
    const ina = keep > 0 ? va >= bound : va <= bound, inb = keep > 0 ? vb >= bound : vb <= bound;
    if (ina && m < POLY_MAX) { dst[m * 2] = src[a]; dst[m * 2 + 1] = src[a + 1]; m++; }
    if (ina !== inb && m < POLY_MAX) {
      const k = (bound - va) / (vb - va);
      dst[m * 2] = src[a] + (src[b] - src[a]) * k;
      dst[m * 2 + 1] = src[a + 1] + (src[b + 1] - src[a + 1]) * k;
      m++;
    }
  }
  return m;
}

/** Clips `poly` (n points, in place) to the rect; `tmp` is scratch of the same size. Returns the new point count. */
export function clipRect(poly: Float64Array, n: number, x0: number, y0: number, x1: number, y1: number, tmp: Float64Array): number {
  n = clipEdge(poly, n, 0, x0, 1, tmp);
  n = clipEdge(tmp, n, 0, x1, -1, poly);
  n = clipEdge(poly, n, 1, y0, 1, tmp);
  n = clipEdge(tmp, n, 1, y1, -1, poly);
  return n;
}

export function polyArea(poly: Float64Array, n: number): number {
  let a = 0;
  for (let i = 0; i < n; i++) {
    const p = i * 2, q = ((i + 1) % n) * 2;
    a += poly[p] * poly[q + 1] - poly[q] * poly[p + 1];
  }
  return Math.abs(a) / 2;
}

/** The highest point (smallest y) of the outline on the vertical line at x; 1e9 when the line misses it. */
function topAt(poly: Float64Array, n: number, x: number): number {
  let top = 1e9;
  for (let i = 0; i < n; i++) {
    const p = i * 2, q = ((i + 1) % n) * 2, x0 = poly[p], x1 = poly[q];
    if ((x < x0 && x < x1) || (x > x0 && x > x1)) continue;
    const y = x0 === x1 ? Math.min(poly[p + 1], poly[q + 1]) : poly[p + 1] + ((poly[q + 1] - poly[p + 1]) * (x - x0)) / (x1 - x0);
    if (y < top) top = y;
  }
  return top;
}

const overlap = (ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number): number => {
  if (ax + aw + LABEL_SEP <= bx || bx + bw + LABEL_SEP <= ax) return 0;
  const d = Math.min(ay + ah, by + bh) - Math.max(ay, by) + LABEL_SEP;
  return d > 0 ? d : 0;
};

/** Two drawn blocks overlap (they may touch, and they may be closer than LABEL_SEP while they move). */
const collide = (ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number): boolean =>
  ax < bx + bw && bx < ax + aw && ay < by + bh && by < ay + ah;

/**
 * The stateless layout. Every label whose sheet has a visible outline gets an anchor and a place
 * (tx, ty); labels are kept inside the margins and pushed apart vertically. `fixed` is an optional
 * block that never moves (the distance label): x, y, w, h, or w = 0 for none. `pref` remembers
 * which of two competing blocks went below the other (LABEL_MAX x LABEL_MAX); with `fresh` it is
 * ignored and rewritten, which makes the layout a pure function of its inputs.
 */
export function placeLabels(
  L: RoomLabel[], count: number, cw: number, ch: number, mx: number, my: number, fixed: Float64Array, pref: Int8Array, fresh: boolean,
): void {
  for (let i = 0; i < count; i++) {
    const o = L[i];
    o.shown = o.on && o.n >= 3 && o.area >= LABEL_MIN_AREA;
    if (!o.shown) continue;
    // anchor: the outer end of the visible outline's top edge — the left end for a sheet left of the
    // phone, the right end for the others — so a label never hangs over the row next to its sheet.
    // The block sits above the highest point of the top edge along its own width.
    let lo = 1e9, hi = -1e9;
    for (let k = 0; k < o.n; k++) {
      const x = o.poly[k * 2];
      if (x < lo) lo = x;
      if (x > hi) hi = x;
    }
    const ax = o.side < 0 ? lo : hi;
    const x0 = Math.max(lo, o.side < 0 ? ax : ax - o.bw), x1 = Math.min(hi, o.side < 0 ? ax + o.bw : ax);
    let top = Math.min(topAt(o.poly, o.n, x0), topAt(o.poly, o.n, x1));
    for (let k = 0; k < o.n; k++) {
      const x = o.poly[k * 2];
      if (x > x0 && x < x1) top = Math.min(top, topAt(o.poly, o.n, x));
    }
    o.ax = ax;
    o.ay = top;
    let ty = top - o.bh - LABEL_GAP;
    if (ty < my) ty = top + LABEL_GAP;
    o.tx = Math.min(Math.max(o.side < 0 ? ax : ax - o.bw, mx), cw - mx - o.bw);
    o.ty = o.by = Math.min(Math.max(ty, my), ch - my - o.bh);
  }
  // push overlapping blocks apart: the lower one goes down while it can, otherwise the upper one goes up
  for (let pass = 0; pass < 12; pass++) {
    let moved = false;
    for (let i = 0; i < count; i++) {
      const a = L[i];
      if (!a.shown) continue;
      if (fixed[2] > 0) {
        const d = overlap(a.tx, a.ty, a.bw, a.bh, fixed[0], fixed[1], fixed[2], fixed[3]);
        if (d > 0) {
          const up = a.ty + a.bh / 2 < fixed[1] + fixed[3] / 2;
          const ny = up ? fixed[1] - a.bh - LABEL_SEP : fixed[1] + fixed[3] + LABEL_SEP;
          a.ty = Math.min(Math.max(ny, my), ch - my - a.bh);
          moved = true;
        }
      }
      for (let j = i + 1; j < count; j++) {
        const b = L[j];
        if (!b.shown) continue;
        const d = overlap(a.tx, a.ty, a.bw, a.bh, b.tx, b.ty, b.bw, b.bh);
        if (d <= 0) continue;
        // which of the two goes below: the one whose own place is lower; near a tie the later sheet,
        // and while the pose moves the one that was below already
        const k = i * LABEL_MAX + j, gap = a.by - b.by;
        let down = gap > 0.5 ? 1 : -1;
        if (!fresh && pref[k] !== 0 && Math.abs(gap) <= LABEL_ORDER_HOLD) down = pref[k];
        pref[k] = down;
        const lo = down > 0 ? a : b, hi = lo === a ? b : a;
        if (lo.ty + d <= ch - my - lo.bh) lo.ty += d;
        else if (hi.ty - d >= my) hi.ty -= d;
        else {
          // no room either way: step sideways
          const right = lo.tx + lo.bw + LABEL_SEP + hi.bw <= cw - mx;
          hi.tx = right ? lo.tx + lo.bw + LABEL_SEP : Math.max(mx, lo.tx - hi.bw - LABEL_SEP);
        }
        moved = true;
      }
    }
    if (!moved) break;
  }
}

/**
 * Moves every block towards its place. `dt` <= 0 (a seek, the first frame) puts the blocks on their
 * stateless places at once; `rest` (the pose has not changed for LABEL_STILL seconds) drops the dead
 * band; `reduced` skips the spring but keeps the dead band. `fixed` is the block that never moves
 * (see placeLabels). Returns true when every block has arrived and is shown.
 */
export function easeLabels(L: RoomLabel[], count: number, dt: number, reduced: boolean, rest: boolean, fixed: Float64Array): boolean {
  let settled = true;
  for (let i = 0; i < count; i++) {
    const o = L[i];
    if (!o.shown) { o.held = false; continue; }
    if (!o.held || dt <= 0) {
      o.x = o.gx = o.tx;
      o.y = o.gy = o.ty;
      o.vx = o.vy = 0;
      o.fade = 1;
      o.held = true;
      continue;
    }
    // dead band: the goal follows the stateless place only when that has moved far enough, or rests
    if (rest || Math.abs(o.tx - o.gx) > LABEL_DEAD || Math.abs(o.ty - o.gy) > LABEL_DEAD) {
      o.gx = o.tx;
      o.gy = o.ty;
    }
    if (reduced) {
      // reduced motion: no easing — the block takes its goal at once (the dead band still holds it under a shaking pose)
      o.x = o.gx;
      o.y = o.gy;
      o.vx = o.vy = 0;
      if (Math.abs(o.x - o.tx) + Math.abs(o.y - o.ty) > 0.02) settled = false;
      continue;
    }
    // exact step of a critically damped spring (stable for any dt)
    const e = Math.exp(-OMEGA * dt);
    let d = o.x - o.gx, tmp = (o.vx + OMEGA * d) * dt;
    o.vx = (o.vx - OMEGA * tmp) * e;
    o.x = o.gx + (d + tmp) * e;
    d = o.y - o.gy;
    tmp = (o.vy + OMEGA * d) * dt;
    o.vy = (o.vy - OMEGA * tmp) * e;
    o.y = o.gy + (d + tmp) * e;
    if (Math.abs(o.x - o.tx) + Math.abs(o.y - o.ty) < 0.02 && Math.abs(o.vx) + Math.abs(o.vy) < 0.5) {
      o.x = o.tx;
      o.y = o.ty;
      o.vx = o.vy = 0;
    } else settled = false;
  }
  // Blocks on their way never collide: of two drawn blocks that overlap, the one further from its
  // place gives way (it is not drawn while they overlap) and comes back over 0.12 s once it is clear.
  if (dt > 0) {
    for (let i = 0; i < count; i++) {
      const a = L[i];
      if (!a.shown || !a.held) continue;
      const da = Math.abs(a.x - a.tx) + Math.abs(a.y - a.ty);
      let hide = fixed[2] > 0 && collide(a.x, a.y, a.bw, a.bh, fixed[0], fixed[1], fixed[2], fixed[3]);
      for (let j = 0; j < count && !hide; j++) {
        const b = L[j];
        if (j === i || !b.shown || !collide(a.x, a.y, a.bw, a.bh, b.x, b.y, b.bw, b.bh)) continue;
        const db = Math.abs(b.x - b.tx) + Math.abs(b.y - b.ty);
        if (da > db || (da === db && i > j)) hide = true;
      }
      a.fade = hide ? 0 : Math.min(1, a.fade + dt / 0.12);
      if (a.fade < 1) settled = false;
    }
  }
  return settled;
}
