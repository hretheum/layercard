// Label placement for the selection chrome. Allocation-free: slots and the history are preallocated
// and mutated in place every frame. All coordinates are CSS px, y down.
//
// One arrangement: label blocks sit in rows above and below the stack, in two columns either side of
// a narrow channel. A leader runs block -> stub -> rail (down the channel) -> gate (a line between
// the rows and the stack) -> straight to a corner of the sheet. Rails and stubs live on the block
// side of the gate line and never meet by construction; the straight parts are uncrossed by
// swapping slots, which always ends because every swap shortens their total length.
//
// `layoutLabels` is the stateless layout. `layoutLabelsHeld` adds the short history the contract
// allows for chrome: the slot assignment is held (a change at most every HOLD seconds while the pose
// moves, at once when it rests), and blocks follow their place through a dead band and a
// critically damped spring. The sheet end of every leader stays exact.
import { CHIP_H } from "./assets";

export const LABEL_PITCH = 1.4;
export const LABEL_GAP = 14;
export const LABEL_STUB = 8;
export const LABEL_RAIL = 7;
/** Rails move closer together, down to this, when one end holds more rows than the channel has room for. */
export const LABEL_RAIL_MIN = 2.5;
/** Clear space between the innermost rails of the two columns. */
const RAIL_SEP = 4;
/** Widest channel between the two columns (wide canvases). */
const CHANNEL_MAX = 64;
/** A slot change happens at most once in this many seconds while the pose moves. */
export const LABEL_HOLD = 0.5;
/** The pose counts as resting after this many seconds without change; then the chrome goes to its stateless layout. */
export const LABEL_STILL = 0.05;
/** Blocks ignore changes of their place smaller than this (CSS px) while the pose moves. */
export const LABEL_DEAD = 2;
/** Critically damped spring: within 0.5 % of a step after 0.22 s. */
const OMEGA = 34;

export interface LabelSlot {
  /** fixed per sheet: -1 = its leader ends on a left corner of the sheet, +1 = on a right corner */
  corner: number;
  /** column: -1 = left of the channel, +1 = right of it */
  side: number;
  /** block size */
  bw: number; bh: number;
  /** projected corners of the sheet (top-left, top-right, bottom-left, bottom-right) */
  tlx: number; tly: number; trx: number; try_: number;
  blx: number; bly: number; brx: number; bry: number;
  // results
  /** block top-left */
  x: number; y: number;
  /** inner edge of the block (where the stub starts), the rail and the gate where the leader turns to the sheet */
  ix: number; ex: number; ey: number; gy: number;
  /** anchor on the sheet */
  ax: number; ay: number;
  /** -1 above the stack, +1 below it; row 0 is the one nearest to the stack */
  zone: number; row: number;
}

export function makeSlot(corner: number): LabelSlot {
  return {
    corner, side: corner, bw: 0, bh: 0, tlx: 0, tly: 0, trx: 0, try_: 0, blx: 0, bly: 0, brx: 0, bry: 0,
    x: 0, y: 0, ix: 0, ex: 0, ey: 0, gy: 0, ax: 0, ay: 0, zone: -1, row: 0,
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

/** Rows one column needs at one end for `count` blocks of one corner kind (at most half of them per end). */
export function rowsFor(count: number): number {
  return Math.ceil(count / 2);
}

/** Height reserved at each end of the stack for `rows` rows of blocks `bh` tall. */
export function reserveFor(rows: number, bh: number): number {
  return rows > 0 ? (rows - 1) * LABEL_PITCH * bh + bh + LABEL_GAP : 0;
}

/** Narrowest channel that still holds the rails of `n` labels when all of them sit at one end. */
export function channelFor(n: number): number {
  return 2 * LABEL_STUB + RAIL_SEP + 2 * LABEL_RAIL_MIN * Math.max(0, Math.ceil(n / 2) - 1);
}

const rowsIn = (room: number, bh: number, pitch: number): number => (room >= bh ? Math.floor((room - bh) / pitch + 1e-6) + 1 : 0);
const spanOf = (rows: number, bh: number, pitch: number): number => (rows > 0 ? (rows - 1) * pitch + bh : 0);

/** Insertion sort of `order[from..m)` by a key read from the slots (m <= 8, no allocation). */
function sortBy(order: Int32Array, m: number, s: LabelSlot[], key: (o: LabelSlot) => number, from = 0): void {
  for (let a = from + 1; a < m; a++) {
    const v = order[a], k = key(s[v]);
    let b = a - 1;
    while (b >= from && key(s[order[b]]) > k) { order[b + 1] = order[b]; b--; }
    order[b + 1] = v;
  }
}

// geometry of the current frame (module-level: nothing is allocated per frame)
let gH = 0, gMy = 0, gMinY = 0, gMaxY = 0, gBh = 0, gPitch = 0;
let gInnerL = 0, gInnerR = 0, gChan = 0, gRoomUp = 0, gRoomDown = 0;
// derived from the assignment by place()
let rowsUp = 0, rowsDown = 0, baseUp = 0, baseDown = 0, gateUp = 0, gateDown = 0, railUp = LABEL_RAIL, railDown = LABEL_RAIL;

const primaryX = (o: LabelSlot): number => (o.zone < 0 ? (o.corner < 0 ? o.tlx : o.trx) : o.corner < 0 ? o.blx : o.brx);
const primaryXRev = (o: LabelSlot): number => -primaryX(o);
/**
 * Negative when the sheet's top corner is nearer to the top of the stack than its bottom corner is
 * to the bottom. Biased by 8 % of the stack height so sheets that span the stack go above.
 */
const zoneKey = (o: LabelSlot): number => (o.tly - gMinY) - (gMaxY - o.bly) - 0.08 * (gMaxY - gMinY);

function setGeometry(
  s: LabelSlot[], n: number, minX: number, minY: number, maxX: number, maxY: number, W: number, H: number, mx: number, my: number,
): void {
  let bh = 0, maxW = 0;
  for (let i = 0; i < n; i++) {
    if (s[i].bh > bh) bh = s[i].bh;
    if (s[i].bw > maxW) maxW = s[i].bw;
  }
  gH = H; gMy = my; gMinY = minY; gMaxY = maxY; gBh = bh; gPitch = LABEL_PITCH * bh;
  // the two columns either side of the channel, centred on the stack as far as the margins allow
  gChan = Math.min(CHANNEL_MAX, Math.max(channelFor(n), W - 2 * mx - 2 * maxW));
  const lo = mx + maxW + gChan / 2, hi = W - mx - maxW - gChan / 2;
  const c = lo <= hi ? Math.min(hi, Math.max(lo, (minX + maxX) / 2)) : W / 2;
  gInnerL = c - gChan / 2;
  gInnerR = c + gChan / 2;
  gRoomUp = rowsIn(minY - LABEL_GAP - my, bh, gPitch);
  gRoomDown = rowsIn(H - my - maxY - LABEL_GAP, bh, gPitch);
}

const railPitch = (rows: number): number => (rows > 1 ? Math.min(LABEL_RAIL, Math.max(LABEL_RAIL_MIN, (gChan - 2 * LABEL_STUB - RAIL_SEP) / (2 * (rows - 1)))) : LABEL_RAIL);

function placeOne(o: LabelSlot): void {
  const inner = o.side < 0 ? gInnerL : gInnerR, up = o.zone < 0;
  o.ix = inner;
  o.x = o.side < 0 ? inner - o.bw : inner;
  o.y = up ? baseUp - o.bh - o.row * gPitch : baseDown + o.row * gPitch;
  o.ex = inner - o.side * (LABEL_STUB + (up ? railUp : railDown) * o.row);
  o.ey = o.y + CHIP_H / 2;
  o.gy = up ? gateUp : gateDown;
  // the leader ends on the corner that faces its end of the stack; when rows had to move in over the
  // stack and that corner is on the wrong side of the gate line, on the other corner of the same side
  const tx = o.corner < 0 ? o.tlx : o.trx, ty = o.corner < 0 ? o.tly : o.try_;
  const bx = o.corner < 0 ? o.blx : o.brx, by = o.corner < 0 ? o.bly : o.bry;
  if (up) {
    const far = ty < gateUp + 1 && by > ty;
    o.ax = far ? bx : tx;
    o.ay = far ? by : ty;
  } else {
    const far = by > gateDown - 1 && ty < by;
    o.ax = far ? tx : bx;
    o.ay = far ? ty : by;
  }
}

/** Positions and leader geometry for the assignment (zone, side, row) the slots carry. */
function place(s: LabelSlot[], n: number): void {
  rowsUp = rowsDown = 0;
  for (let i = 0; i < n; i++) {
    const o = s[i];
    if (o.zone < 0) { if (o.row + 1 > rowsUp) rowsUp = o.row + 1; } else if (o.row + 1 > rowsDown) rowsDown = o.row + 1;
  }
  // rows keep to the margins even when the stack leaves no room above or below it: they move inwards
  baseUp = Math.max(gMinY - LABEL_GAP, gMy + spanOf(rowsUp, gBh, gPitch));
  baseDown = Math.min(gMaxY + LABEL_GAP, gH - gMy - spanOf(rowsDown, gBh, gPitch));
  gateUp = baseUp + LABEL_GAP * 0.55;
  gateDown = baseDown - LABEL_GAP * 0.55;
  railUp = railPitch(rowsUp);
  railDown = railPitch(rowsDown);
  for (let i = 0; i < n; i++) placeOne(s[i]);
}

function leadersCross(p: LabelSlot, q: LabelSlot): boolean {
  for (let a = 0; a < 3; a++) {
    const ax0 = a === 0 ? p.ax : p.ex, ay0 = a === 0 ? p.ay : a === 1 ? p.gy : p.ey;
    const ax1 = a === 2 ? p.ix : p.ex, ay1 = a === 0 ? p.gy : p.ey;
    for (let b = 0; b < 3; b++) {
      const bx0 = b === 0 ? q.ax : q.ex, by0 = b === 0 ? q.ay : b === 1 ? q.gy : q.ey;
      const bx1 = b === 2 ? q.ix : q.ex, by1 = b === 0 ? q.gy : q.ey;
      if (segmentsCross(ax0, ay0, ax1, ay1, bx0, by0, bx1, by1)) return true;
    }
  }
  return false;
}

/** Number of pairs of leaders that cross, for the placed slots. */
export function countCrossings(s: LabelSlot[], n: number): number {
  let c = 0;
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) if (leadersCross(s[a], s[b])) c++;
  return c;
}

/** Swaps the slots of crossing leaders until none cross or `passes` run out; returns the crossings left. */
function uncross(s: LabelSlot[], n: number, passes: number): number {
  for (let pass = 0; pass < passes; pass++) {
    let swapped = false;
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
      const p = s[a], q = s[b];
      if (!leadersCross(p, q)) continue;
      const z = p.zone, d = p.side, r = p.row;
      p.zone = q.zone; p.side = q.side; p.row = q.row;
      q.zone = z; q.side = d; q.row = r;
      placeOne(p);
      placeOne(q);
      swapped = true;
    }
    if (!swapped) return 0;
  }
  return countCrossings(s, n);
}

/**
 * The stateless assignment and placement. Returns the arrangement that was needed:
 * 0 — rows at both ends (each sheet to the nearer end, at most half of a column's blocks per end
 *     unless the other end has no room);
 * 1 — that left a crossing, so every block went to the end with more room (there the straight
 *     parts all run between one gate line and corners of one kind, and uncrossing always ends);
 * 2 — crossings remain (the rows had to move in over the stack; not reached in the checked poses).
 */
function assignLabels(s: LabelSlot[], n: number, order: Int32Array): number {
  if (!skipTwoEnds) {
    twoEnds(s, n, order);
    place(s, n);
    if (uncross(s, n, 16) === 0) return 0;
  }
  oneEnd(s, n, order);
  place(s, n);
  return uncross(s, n, 48) === 0 ? 1 : 2;
}

/** Test only: go straight to the one-end arrangement, so that it can be checked in poses that never need it. */
let skipTwoEnds = false;
export function forceOneEnd(on: boolean): void {
  skipTwoEnds = on;
}

/** Arrangement 0: each sheet to the nearer end of the stack, as v1 did per side. */
function twoEnds(s: LabelSlot[], n: number, order: Int32Array): void {
  for (let t = -1; t <= 1; t += 2) {
    let m = 0;
    for (let i = 0; i < n; i++) if (s[i].corner === t) order[m++] = i;
    if (m === 0) continue;
    const half = rowsFor(m);
    const capUp = Math.min(gRoomUp, Math.max(half, m - gRoomDown)), capDown = Math.min(gRoomDown, Math.max(half, m - gRoomUp));
    sortBy(order, m, s, zoneKey);
    let above = 0;
    for (let q = 0; q < m; q++) if (zoneKey(s[order[q]]) <= 0) above++;
    above = Math.min(above, capUp);
    if (m - above > capDown) above = Math.min(m, Math.max(above, m - capDown, capUp + capDown >= m ? 0 : Math.round((m * capUp) / Math.max(1, capUp + capDown))));
    for (let q = 0; q < m; q++) {
      const o = s[order[q]];
      o.zone = q < above ? -1 : 1;
      o.side = t;
    }
    // row 0 (nearest to the stack, shortest rail) takes the outermost corner
    sortBy(order, above, s, t < 0 ? primaryX : primaryXRev);
    sortBy(order, m, s, t < 0 ? primaryX : primaryXRev, above);
    for (let q = 0; q < m; q++) s[order[q]].row = q < above ? q : q - above;
  }
}

/** Arrangement 1: every block at the end of the stack that has more room. */
function oneEnd(s: LabelSlot[], n: number, order: Int32Array): void {
  const end = gRoomDown > gRoomUp ? 1 : -1;
  let nl = 0, nr = 0;
  for (let i = 0; i < n; i++) {
    s[i].zone = end;
    s[i].side = s[i].corner;
    if (s[i].corner < 0) nl++; else nr++;
  }
  // even the columns out: the innermost blocks of the longer one move across
  while (Math.abs(nl - nr) > 1) {
    const from = nl > nr ? -1 : 1;
    let pick = -1, best = -1e9;
    for (let i = 0; i < n; i++) {
      if (s[i].side !== from) continue;
      const k = from < 0 ? primaryX(s[i]) : -primaryX(s[i]);
      if (k > best) { best = k; pick = i; }
    }
    s[pick].side = -from;
    if (from < 0) { nl--; nr++; } else { nr--; nl++; }
  }
  for (let t = -1; t <= 1; t += 2) {
    let m = 0;
    for (let i = 0; i < n; i++) if (s[i].side === t) order[m++] = i;
    sortBy(order, m, s, t < 0 ? primaryX : primaryXRev);
    for (let q = 0; q < m; q++) s[order[q]].row = q;
  }
}

/** Stateless layout of all blocks and leaders; returns the arrangement (see assignLabels). */
export function layoutLabels(
  s: LabelSlot[], n: number, minX: number, minY: number, maxX: number, maxY: number,
  W: number, H: number, mx: number, my: number, order: Int32Array,
): number {
  setGeometry(s, n, minX, minY, maxX, maxY, W, H, mx, my);
  return assignLabels(s, n, order);
}

// ---------------------------------------------------------------- history

export interface LabelHistory {
  valid: boolean; n: number;
  /** the held assignment */
  zone: Int8Array; side: Int8Array; row: Int8Array;
  /** scratch: the stateless assignment of the current frame */
  tz: Int8Array; ts: Int8Array; tr: Int8Array;
  /** held place of each block (x, y) and of its rail, their eased values and velocities */
  hx: Float32Array; hy: Float32Array; hr: Float32Array;
  px: Float32Array; py: Float32Array; pr: Float32Array;
  vx: Float32Array; vy: Float32Array; vr: Float32Array;
  box: Float32Array;
  sinceSwap: number; still: number;
  /** assignment changes since the history was cleared, and the arrangement in use */
  swaps: number; level: number;
}

export function makeHistory(max = 8): LabelHistory {
  const f = (): Float32Array => new Float32Array(max);
  return {
    valid: false, n: 0, zone: new Int8Array(max), side: new Int8Array(max), row: new Int8Array(max),
    tz: new Int8Array(max), ts: new Int8Array(max), tr: new Int8Array(max),
    hx: f(), hy: f(), hr: f(), px: f(), py: f(), pr: f(), vx: f(), vy: f(), vr: f(),
    box: new Float32Array(4), sinceSwap: 0, still: 0, swaps: 0, level: 0,
  };
}

/** One spring step towards `target` (closed form, stable for any dt); returns the new value, velocity in springV. */
let springV = 0;
function spring(pos: number, vel: number, target: number, dt: number): number {
  const d = pos - target, tmp = (vel + OMEGA * d) * dt, e = Math.exp(-OMEGA * dt);
  springV = (vel - OMEGA * tmp) * e;
  return target + (d + tmp) * e;
}

const follow = (held: number, p: number): number => (p - held > LABEL_DEAD ? p - LABEL_DEAD : held - p > LABEL_DEAD ? p + LABEL_DEAD : held);

/**
 * The layout with history: `dt` seconds after the previous call. The held assignment is kept while
 * it is still free of crossings and fits, and replaced by the stateless one at most every
 * LABEL_HOLD seconds, or at once when the pose has rested for LABEL_STILL. Blocks and rails ease to
 * their place (`reduced`: they take it at once, still through the dead band and the held
 * assignment). With a cleared history the result is the stateless layout.
 * Returns false while something is still on its way, so the caller keeps drawing frames.
 */
export function layoutLabelsHeld(
  s: LabelSlot[], n: number, minX: number, minY: number, maxX: number, maxY: number,
  W: number, H: number, mx: number, my: number, order: Int32Array, h: LabelHistory, dt: number, reduced: boolean,
): boolean {
  setGeometry(s, n, minX, minY, maxX, maxY, W, H, mx, my);
  const level = assignLabels(s, n, order);
  const b = h.box;
  if (!h.valid || h.n !== n) {
    for (let i = 0; i < n; i++) {
      const o = s[i];
      h.zone[i] = o.zone; h.side[i] = o.side; h.row[i] = o.row;
      h.hx[i] = h.px[i] = o.x; h.hy[i] = h.py[i] = o.y; h.hr[i] = h.pr[i] = o.ex;
      h.vx[i] = h.vy[i] = h.vr[i] = 0;
    }
    b[0] = minX; b[1] = minY; b[2] = maxX; b[3] = maxY;
    h.valid = true; h.n = n; h.sinceSwap = LABEL_HOLD; h.still = LABEL_STILL; h.swaps = 0; h.level = level;
    return true;
  }
  const moved = Math.abs(minX - b[0]) + Math.abs(minY - b[1]) + Math.abs(maxX - b[2]) + Math.abs(maxY - b[3]) > 0.01;
  h.still = moved ? 0 : h.still + dt;
  h.sinceSwap += dt;
  b[0] = minX; b[1] = minY; b[2] = maxX; b[3] = maxY;
  let same = true;
  for (let i = 0; i < n; i++) if (s[i].zone !== h.zone[i] || s[i].side !== h.side[i] || s[i].row !== h.row[i]) same = false;
  if (!same) {
    let keep = h.sinceSwap < LABEL_HOLD && h.still < LABEL_STILL;
    if (keep) {
      // is the held assignment still good for this frame? It must be free of crossings and must not
      // need more rows at an end than fit there (unless the new one needs as many)
      const upT = rowsUp, downT = rowsDown;
      for (let i = 0; i < n; i++) {
        const o = s[i];
        h.tz[i] = o.zone; h.ts[i] = o.side; h.tr[i] = o.row;
        o.zone = h.zone[i]; o.side = h.side[i]; o.row = h.row[i];
      }
      place(s, n);
      keep = countCrossings(s, n) === 0 && rowsUp <= Math.max(gRoomUp, upT) && rowsDown <= Math.max(gRoomDown, downT);
      if (!keep) {
        for (let i = 0; i < n; i++) { s[i].zone = h.tz[i]; s[i].side = h.ts[i]; s[i].row = h.tr[i]; }
        place(s, n);
      }
    }
    if (!keep) {
      for (let i = 0; i < n; i++) { h.zone[i] = s[i].zone; h.side[i] = s[i].side; h.row[i] = s[i].row; }
      h.swaps++;
      h.sinceSwap = 0;
      h.level = level;
    }
  } else {
    h.level = level;
  }
  const rest = h.still >= LABEL_STILL;
  let settled = rest;
  for (let i = 0; i < n; i++) {
    const o = s[i];
    // the held place: exact when the pose rests, otherwise it ignores changes inside the dead band
    h.hx[i] = rest ? o.x : follow(h.hx[i], o.x);
    h.hy[i] = rest ? o.y : follow(h.hy[i], o.y);
    h.hr[i] = rest ? o.ex : follow(h.hr[i], o.ex);
    if (reduced) {
      // reduced motion: no easing, the block takes its held place at once
      h.px[i] = h.hx[i]; h.py[i] = h.hy[i]; h.pr[i] = h.hr[i];
      h.vx[i] = h.vy[i] = h.vr[i] = 0;
    } else {
      h.px[i] = spring(h.px[i], h.vx[i], h.hx[i], dt); h.vx[i] = springV;
      h.py[i] = spring(h.py[i], h.vy[i], h.hy[i], dt); h.vy[i] = springV;
      h.pr[i] = spring(h.pr[i], h.vr[i], h.hr[i], dt); h.vr[i] = springV;
    }
    // the block end of the leader moves with the block; gate and sheet corner stay exact
    o.ix += h.px[i] - o.x;
    o.x = h.px[i];
    o.y = h.py[i];
    o.ey = o.y + CHIP_H / 2;
    o.ex = h.pr[i];
    if (Math.abs(h.px[i] - h.hx[i]) + Math.abs(h.py[i] - h.hy[i]) + Math.abs(h.pr[i] - h.hr[i]) > 0.02) settled = false;
    else if (rest) {
      // close enough: land exactly on the stateless place
      o.ix += h.hx[i] - o.x;
      o.x = h.px[i] = h.hx[i]; o.y = h.py[i] = h.hy[i]; o.ex = h.pr[i] = h.hr[i];
      o.ey = o.y + CHIP_H / 2;
      h.vx[i] = h.vy[i] = h.vr[i] = 0;
    }
  }
  return settled;
}
