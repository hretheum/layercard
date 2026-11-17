// Pure timing: durations, per-layer clocks, the well's strength and the level, shared by host and
// guest. Everything here is a closed-form function of time, so two devices given the same `at` agree.
import type { LayerManifest, Timeline } from "../../../types";

export const CONNECT = 0.8;
export const FLY = 1.2;
export const ASSEMBLE = 1.0;
export const BREATH = 5;

export const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
export const mix = (a: number, b: number, t: number): number => a + (b - a) * t;
export const smooth = (a: number, b: number, x: number): number => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const easeInOut = (x: number): number => {
  x = clamp01(x);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
export const easeOut = (x: number): number => 1 - Math.pow(1 - clamp01(x), 3);

// ---------------------------------------------------------------- the well
// Card space: the card is 1 wide, the glass is z = 0, +Z is towards the viewer. The well is a dent
// behind the glass about the card's axis; the same numbers are compiled into the shaders (src/strip.ts).

/** Radius at which the well's pull has halved, in card widths. */
export const WELL_R = 0.25;
/** How far a point at the axis is pulled in, as a share of its distance. */
export const PULL = 0.48;
/** The swirl at the axis, in radians, at full strength. */
export const SWIRL = 1.2;
/** Depth of the sink behind the glass at full strength. */
export const SINK_DEPTH = 0.3;
/** Material radius of the lensing ring (where a point of the card that far from the axis ends up). */
export const RING_RHO = 0.12;
export const wellG = (r: number): number => 1 / (1 + (r * r) / (WELL_R * WELL_R));
export const RING_G = wellG(RING_RHO);
/** Radius of the ring on the glass at full strength. */
export const RING_R = RING_RHO * (1 - PULL * RING_G);

// ---------------------------------------------------------------- the event
// Host `depart` and guest `explode` are one event of EVENT seconds for every manifest.

export const EVENT = 7.75;
/** The pull starts: the strength goes 0 -> 1 in this long. */
export const PULL_IN = 1.2;
/** The sink collapses during the last COLLAPSE seconds. */
export const COLLAPSE = 0.5;
/** Necks start between FIRST and LAST, top layer first, evenly spread. */
export const FIRST = 0.45;
export const LAST = 5.35;
/** A row spends NECK seconds sliding down the well before it enters the sink. */
export const NECK = 0.6;
/** A layer's rows enter the sink during FEED_BASE + FEED_LEN x its longer side (card widths). */
export const FEED_BASE = 0.4;
export const FEED_LEN = 0.26;
/** A row takes TRAVEL seconds from the sink to the guest's screen. */
export const TRAVEL = 1.3;
/** The share of the ribbon path that is the stub (sink -> glass); the rest is the air. */
export const STUB = 0.055;
/** Path fraction after a share x of TRAVEL: slow out of the sink, fast into the phone. */
export const TRAVEL_POW = 1.2;
export const pathS = (x: number): number => Math.pow(clamp01(x), TRAVEL_POW);
/** Seconds a row spends in the stub before it crosses the glass. */
export const STUB_T = TRAVEL * Math.pow(STUB, 1 / TRAVEL_POW);
/** Reduced motion: the well's constant strength, and how long a layer's fade takes. */
export const REDUCED_PULL = 0.35;
export const REDUCED_FADE = 0.5;

/** Strength of the well, 0..1, `t` seconds into the event. */
export function strength(t: number, reduced = false): number {
  if (reduced) return REDUCED_PULL * smooth(0, 0.5, t) * (1 - smooth(EVENT - COLLAPSE, EVENT, t));
  return smooth(0, PULL_IN, t) * (1 - smooth(EVENT - COLLAPSE, EVENT, t));
}

/** The swirl at the axis in radians: it winds up with the pull, then breathes slowly. */
export function swirl(t: number, a: number, reduced = false): number {
  if (reduced) return 0;
  return SWIRL * a * (0.82 + 0.18 * Math.sin((2 * Math.PI * t) / 3.4)) * smooth(0, 2.2, t);
}

/** The ring: its radius as a share of full (it opens with the pull and shrinks to a point) and its opacity. */
export function ringRadius(t: number): number {
  return smooth(0.1, PULL_IN, t) * (1 - smooth(EVENT - COLLAPSE, EVENT - 0.12, t));
}
export function ringAlpha(t: number): number {
  return smooth(0.1, 0.5, t) * (1 - smooth(EVENT - 0.22, EVENT - 0.02, t));
}

/** Where a layer is, as shares of its rows, when its clock (seconds since its head row entered the sink) is `tau`: [host, air, level]. */
export function shares(tau: number, feed: number, out: number[]): number[] {
  const crossed = clamp01((tau - STUB_T) / feed), arrived = clamp01((tau - TRAVEL) / feed);
  out[0] = 1 - crossed;
  out[1] = crossed - arrived;
  out[2] = arrived;
  return out;
}

// ---------------------------------------------------------------- the level (guest)
/** Share of the canvas height the level reaches when every row has arrived in `explode`. */
export const LEVEL_MID = 0.5;
/** Share of the canvas height the level reaches in `fly` (past the top: the wobble must not show the camera). */
export const LEVEL_FULL = 1.1;
/** `fly`: the level is at LEVEL_FULL after this share of the timeline. */
export const FLY_FILL = 0.85;
/** `assemble`: bobbing has died out and every layer is locked at this time; nothing moves afterwards. */
export const LOCK = 0.68;

// ---------------------------------------------------------------- rebuild (host)
export const REBUILD = 1.8;
/** The sink reappears during RB_SINK; the layers unspool from RB_FIRST, starts spread over RB_SPREAD, RB_UNSPOOL each. */
export const RB_SINK = 0.3;
export const RB_FIRST = 0.15;
export const RB_SPREAD = 0.5;
export const RB_UNSPOOL = 0.55;
/** The bend relaxes from RB_RELAX; from RB_FLAT the card is drawn flat; the QR re-forms from RB_QR to the end. */
export const RB_RELAX = 1.15;
export const RB_FLAT = 1.5;
export const RB_QR = 1.3;

export function rebuildStrength(t: number, reduced = false): number {
  return (reduced ? REDUCED_PULL : 1) * smooth(0, RB_SINK, t) * (1 - smooth(RB_RELAX, RB_FLAT, t));
}

export interface Plan {
  /** number of flying (non-QR) layers */
  n: number;
  dur: Record<Timeline, number>;
  /** start of the neck, by leave order (0 = top layer) */
  start: Float64Array;
  /** seconds a layer's rows take to enter the sink, by leave order */
  feed: Float64Array;
  /** start of the unspooling in `rebuild`, by stack index (0 = bottom) */
  rebuildStart: Float64Array;
  /** moment a layer locks flat in `assemble`, by stack index (0 = bottom) */
  assembleLock: Float64Array;
}

export function countFlying(m: LayerManifest): number {
  let n = 0;
  for (const l of m.layers) if (l.role !== "qr") n++;
  return n;
}

export function plan(m: LayerManifest): Plan {
  const fly = m.layers.map((l, i) => ({ l, i })).filter((x) => x.l.role !== "qr").sort((a, b) => a.l.z - b.l.z || a.i - b.i);
  const n = fly.length;
  const start = new Float64Array(n), feed = new Float64Array(n);
  const rebuildStart = new Float64Array(n), assembleLock = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    // leave order k = stack index n - 1 - k
    const r = fly[n - 1 - k].l.rect;
    start[k] = n > 1 ? FIRST + (k * (LAST - FIRST)) / (n - 1) : FIRST;
    feed[k] = FEED_BASE + (FEED_LEN * Math.max(r.w, r.h)) / m.card.w;
    rebuildStart[k] = RB_FIRST + (n > 1 ? (k * RB_SPREAD) / (n - 1) : 0);
    assembleLock[k] = 0.4 + (n > 1 ? (k * (LOCK - 0.4)) / (n - 1) : 0);
  }
  return {
    n, start, feed, rebuildStart, assembleLock,
    dur: { idle: 0, connect: CONNECT, depart: EVENT, rebuild: REBUILD, explode: EVENT, fly: FLY, assemble: ASSEMBLE },
  };
}

/** A layer's clock in the event: seconds since its head row entered the sink (negative before). `t` may run past EVENT (guest `fly`). */
export function clock(P: Plan, k: number, t: number): number {
  return t - P.start[k] - NECK;
}

/** A layer's clock in `rebuild`: from "every row out" back to "every row at rest", by stack index j. */
export function rebuildClock(P: Plan, j: number, t: number): number {
  const k = P.n - 1 - j, out = P.feed[k] + STUB_T + 0.02;
  return mix(out, -NECK - 0.02, easeInOut((t - P.rebuildStart[j]) / RB_UNSPOOL));
}

/** Share of all rows that have arrived in the guest's level, `t` seconds after the event started (it runs on through `fly`). */
export function arrived(P: Plan, t: number): number {
  if (P.n === 0) return clamp01(t / EVENT);
  let a = 0;
  for (let k = 0; k < P.n; k++) a += clamp01((clock(P, k, t) - TRAVEL) / P.feed[k]);
  return a / P.n;
}

/** The level as a share of the canvas height, by guest timeline. Monotonic along explode -> fly -> assemble. */
export function level(P: Plan, tl: Timeline, t: number): number {
  if (tl === "explode") return LEVEL_MID * arrived(P, Math.min(t, EVENT));
  if (tl === "fly") {
    const from = LEVEL_MID * arrived(P, EVENT);
    return Math.max(LEVEL_MID * arrived(P, EVENT + t), mix(from, LEVEL_FULL, easeInOut(t / (FLY * FLY_FILL))));
  }
  return LEVEL_FULL;
}

export function durations(m: LayerManifest): Record<Timeline, number> {
  return plan(m).dur;
}

export const HOST_TIMELINES: readonly Timeline[] = ["idle", "connect", "depart", "rebuild"];
export const GUEST_TIMELINES: readonly Timeline[] = ["explode", "fly", "assemble"];
