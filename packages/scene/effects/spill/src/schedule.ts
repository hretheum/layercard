// Pure timing: durations, per-layer starts and the curves shared by host and guest.
// Everything here is a closed-form function of time, so two devices given the same `at` agree.
import type { LayerManifest, Timeline } from "../../../types";
import { leaveOrder } from "./room";

/** Host `depart` = guest `explode`: one event, the same length for every manifest and tier. */
export const SHARED = 7.5;
/** The canvas zooms out between these two moments of the shared event. */
export const ZOOM_T0 = 0.1;
export const ZOOM_T1 = 0.9;
/** Size of the artboard (the card) on the zoomed-out canvas, relative to the flat fit. */
export const ZOOM = 0.34;
/** First lift: when the zoom-out has ended. */
export const LIFT_START = 0.9;
/** First lift to last lift. */
export const STAGGER = 2.0;
export const MAX_GAP = 0.55;
/** A sheet leaves the glass half-way through its peel and is at its room pose TRAVEL later. */
export const TRAVEL_DELAY = 0.125;
export const TRAVEL = 2.3;
export const CHROME = 0.45;
/** Guides shoot out of a settled sheet over this long, starting GUIDE_LEAD before it settles. */
export const GUIDE = 0.7;
export const GUIDE_LEAD = 0.5;
/** The red measurement line is drawn from the host phone towards the guest between these moments. */
export const MEASURE_T0 = 1.25;
export const MEASURE_T1 = 1.95;
export const CONNECT = 0.8;
export const FLY = 1.4;
export const ASSEMBLE = 1.0;
export const REBUILD = 1.8;
/** `rebuild`: layers land in the first part, the canvas zooms in between these moments, the QR re-forms last. */
export const REBUILD_ZOOM_T0 = 0.45;
export const REBUILD_ZOOM_T1 = 1.3;
export const REBUILD_QR_T0 = 1.15;
export const BREATH = 5;
/** Share of the exploded spacing that survives `fly` (the stack arrives as a fanned deck). */
export const DECK = 0.28;
/** Largest size of the deck at the end of `fly`, relative to the final fit. */
export const DECK_ZOOM = 1.12;
/** Unanchored guest: the virtual eye swings between -EYE_YAW and +EYE_YAW degrees, one sweep in EYE_SWEEP seconds. */
export const EYE_YAW = 12;
export const EYE_SWEEP = 4;

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
/** Ease-out with one small overshoot (about 4 % for s = 0.9): the "single soft settle". */
export const backOut = (x: number, s = 0.9): number => {
  const u = clamp01(x) - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
};
/**
 * The heavy curve of a big sheet: zero speed and zero acceleration at both ends (quintic), so a
 * sheet the size of a table neither jumps off the glass nor snaps into its place.
 */
export const heavy = (x: number): number => {
  x = clamp01(x);
  return x * x * x * (10 - 15 * x + 6 * x * x);
};

/** The peel: the first part of every lift, while the sheet is still on (or just off) the glass. */
export const PEEL = 0.25;
/** Share of the hop reached at the end of the peel. */
export const PEEL_RISE = 0.115;
/** How far a sheet hops off the glass before its travel takes over (card units). */
export const HOP = 0.3;
const HOP_T = 0.8;
/** Host: how much the print swells while it peels. */
export const SWELL = 0.035;
/** After the peel the shadow on the glass is handed from the host's screen to the guest's view over this long. */
export const SHADOW_HANDOVER = 0.2;

/**
 * Height of one sheet above the glass, as a share of HOP, `tau` seconds after its start. Shared by
 * the host (print, shadow) and the guest (sheet), so both show the same lift: peel (quadratic, slow
 * off the glass), then a cubic Hermite up to 1 at HOP_T, flat from there. Both joins are smooth.
 */
export function liftCurve(tau: number): number {
  if (tau <= 0) return 0;
  if (tau <= PEEL) return PEEL_RISE * (tau / PEEL) * (tau / PEEL);
  if (tau < HOP_T) {
    const x = (tau - PEEL) / (HOP_T - PEEL), x2 = x * x, x3 = x2 * x;
    const m0 = ((2 * PEEL_RISE) / PEEL) * (HOP_T - PEEL);
    return (2 * x3 - 3 * x2 + 1) * PEEL_RISE + (x3 - 2 * x2 + x) * m0 + (-2 * x3 + 3 * x2);
  }
  return 1;
}

/** Scale of the artboard on the host canvas `t` seconds into `depart` / `explode`. */
export function zoomAt(t: number): number {
  return mix(1, ZOOM, easeInOut((t - ZOOM_T0) / (ZOOM_T1 - ZOOM_T0)));
}

/** Scale of the artboard `t` seconds into `rebuild`. */
export function zoomBack(t: number): number {
  const k = easeInOut((t - REBUILD_ZOOM_T0) / (REBUILD_ZOOM_T1 - REBUILD_ZOOM_T0));
  // exactly 1 at the end: the last frame of `rebuild` is `idle` frame zero
  return k >= 1 ? 1 : mix(ZOOM, 1, k);
}

/** Yaw of the unanchored guest's virtual eye (degrees) `t` seconds into the shared event. */
export function eyeYaw(t: number): number {
  return -EYE_YAW * Math.cos((Math.PI * t) / EYE_SWEEP);
}

export interface Plan {
  /** number of flying (non-QR) layers */
  n: number;
  /** seconds between consecutive layer starts in depart / explode */
  gap: number;
  dur: Record<Timeline, number>;
  /** start of the lift, by leave order */
  start: Float64Array;
  /** leave order of each flying layer, by stack index (0 = bottom) */
  order: Int32Array;
  /** when the last sheet is at its room pose */
  settled: number;
  /** start of the landing in `rebuild`, by stack index (0 = bottom) */
  rebuildStart: Float64Array;
  rebuildLand: number;
  /** start of the drop in `assemble`, by stack index (0 = bottom) */
  assembleStart: Float64Array;
  assembleDrop: number;
}

export function countFlying(m: LayerManifest): number {
  let n = 0;
  for (const l of m.layers) if (l.role !== "qr") n++;
  return n;
}

export function plan(m: LayerManifest): Plan {
  const n = countFlying(m);
  const gap = n > 1 ? Math.min(MAX_GAP, STAGGER / (n - 1)) : 0;
  const start = new Float64Array(n);
  const rebuildStart = new Float64Array(n);
  const assembleStart = new Float64Array(n);
  const rebuildLand = 0.45;
  const assembleDrop = 0.55;
  const order = leaveOrder(m);
  for (let k = 0; k < n; k++) {
    start[k] = LIFT_START + k * gap;
    // rebuild: the reverse of the leave order, all landed by REBUILD_ZOOM_T0 + rebuildLand
    assembleStart[k] = n > 1 ? (k * 0.35) / (n - 1) : 0;
  }
  for (let j = 0; j < n; j++) rebuildStart[j] = n > 1 ? ((n - 1 - order[j]) * 0.55) / (n - 1) : 0;
  const settled = LIFT_START + Math.max(0, n - 1) * gap + TRAVEL_DELAY + TRAVEL;
  return {
    n, gap, start, order, settled, rebuildStart, rebuildLand, assembleStart, assembleDrop,
    dur: { idle: 0, connect: CONNECT, depart: SHARED, rebuild: REBUILD, explode: SHARED, fly: FLY, assemble: ASSEMBLE },
  };
}

export function durations(m: LayerManifest): Record<Timeline, number> {
  return plan(m).dur;
}

export const HOST_TIMELINES: readonly Timeline[] = ["idle", "connect", "depart", "rebuild"];
export const GUEST_TIMELINES: readonly Timeline[] = ["explode", "fly", "assemble"];
