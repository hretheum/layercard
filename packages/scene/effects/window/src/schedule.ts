// Pure timing: durations, per-layer starts and the easing curves shared by host and guest.
// Everything here is a closed-form function of time, so two devices given the same `at` agree.
import type { LayerManifest, Timeline } from "../../../types";

export const CHROME = 0.45;
export const HOLD = 1.2;
export const CONNECT = 0.8;
export const FLY = 1.2;
export const ASSEMBLE = 1.0;
export const BREATH = 5;
/** Share of the exploded spacing that survives `fly` (the stack arrives as a fanned deck). */
export const DECK = 0.28;
/** Largest size of the deck at the end of `fly`, relative to the final fit (v1's size; v2 shrinks it to fit the canvas). */
export const DECK_ZOOM = 1.12;

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

// cubic-bezier(.16, 1, .3, 1) sampled once into a table (bisection on x), then linearly interpolated.
const LUT_N = 256;
const LUT = new Float64Array(LUT_N + 1);
(() => {
  const x1 = 0.16, y1 = 1, x2 = 0.3, y2 = 1;
  const bx = (s: number) => 3 * (1 - s) * (1 - s) * s * x1 + 3 * (1 - s) * s * s * x2 + s * s * s;
  const by = (s: number) => 3 * (1 - s) * (1 - s) * s * y1 + 3 * (1 - s) * s * s * y2 + s * s * s;
  for (let i = 0; i <= LUT_N; i++) {
    const x = i / LUT_N;
    let lo = 0, hi = 1;
    for (let it = 0; it < 40; it++) {
      const mid = (lo + hi) / 2;
      if (bx(mid) < x) lo = mid; else hi = mid;
    }
    LUT[i] = by((lo + hi) / 2);
  }
  LUT[0] = 0;
  LUT[LUT_N] = 1;
})();

/** cubic-bezier(.16,1,.3,1) */
export function bez(x: number): number {
  x = clamp01(x);
  const f = x * LUT_N;
  const i = Math.min(LUT_N - 1, Math.floor(f));
  return LUT[i] + (LUT[i + 1] - LUT[i]) * (f - i);
}

// ---------------------------------------------------------------- the window event
// Host `depart` and guest `explode` are one event. Everything below is card space: the glass is
// z = 0, the cavity runs to z = -CAVITY_DEPTH, +Z is towards the viewer.

/** Depth of the cavity behind the glass, in card widths. */
export const CAVITY_DEPTH = 3;
/** 1. The glass opens: the stack recedes as one, this deep, in this long. */
export const OPEN = 1.2;
export const OPEN_DEPTH = 0.6;
/**
 * 2. Exploded inside: the layers fan out in depth during FAN. The bottom one goes to the back wall
 * (BACK_GAP off it). The others hang near the glass, the top one HANG_NEAR behind it and the rest
 * HANG_STEP apart (closer when there are many, never deeper than HANG_FAR): from 35 degrees off the
 * normal a sheet deeper than about 1.4 is hidden by the edge of the window, so this is where layers
 * can still be told apart.
 */
export const FAN = 1.2;
export const HANG_NEAR = 0.25;
export const HANG_STEP = 0.2;
export const HANG_FAR = 1.4;
export const BACK_GAP = 0.02;
/** 3. Out through the glass: the first exit starts at EXITS, the starts are spread over EXIT_SPREAD. */
export const EXITS = OPEN + FAN;
export const EXIT_SPREAD = 2.5;
/** One exit: approach inside, crossing the glass, landing in the stack. */
export const APPROACH = 0.5;
export const CROSS = 0.25;
export const LAND = 0.35;
export const EXIT = APPROACH + CROSS + LAND;
/** A sheet springs a little past its place and is back when its chrome starts, SETTLE after the landing. */
export const SETTLE = 0.1;
/** How far past its place, as a share of the way from the glass. */
export const OVERSHOOT = 0.06;
/** The share of LAND after which the sheet is at the top of that spring. */
const LAND_PEAK = 0.77;
/** Largest half extent in z of a sheet while it crosses (it is tilted so that the glass cuts it along a line). */
export const CROSS_HALF = 0.1;

/** Depth at which stack index j of n hangs when the stack is fanned out inside the cavity. */
export function hangDepth(j: number, n: number): number {
  if (j <= 0 || n <= 1) return -(CAVITY_DEPTH - BACK_GAP);
  const step = Math.min(HANG_STEP, (HANG_FAR - HANG_NEAR) / Math.max(1, n - 2));
  return -(HANG_NEAR + (n - 1 - j) * step);
}

/** Depth of stack index j of n before its exit starts: the stack recedes, then fans out (back layers first). */
export function insideDepth(j: number, n: number, t: number): number {
  if (t <= OPEN) return -OPEN_DEPTH * easeInOut(t / OPEN);
  const lag = n > 1 ? 0.3 * (j / (n - 1)) : 0;
  return mix(-OPEN_DEPTH, hangDepth(j, n), easeInOut((t - OPEN - lag) / (FAN - 0.3)));
}

/** Half extent in z of a sheet that rests `rest` above the glass while it crosses: small enough to land without turning back. */
export function crossHalf(rest: number): number {
  return Math.min(CROSS_HALF, 0.5 * rest);
}

const hermite = (x: number, p0: number, m0: number, p1: number, m1: number): number => {
  const x2 = x * x, x3 = x2 * x;
  return (2 * x3 - 3 * x2 + 1) * p0 + (x3 - 2 * x2 + x) * m0 + (-2 * x3 + 3 * x2) * p1 + (x3 - x2) * m1;
};

/**
 * Depth of a sheet's centre `tau` seconds into its exit, from `hang` (inside) to `rest` (in front):
 * a smooth approach to -half, a crossing at constant speed from -half to +half in CROSS seconds,
 * then one soft spring: a little past its place and back by EXIT + SETTLE. Speeds match at every join.
 */
export function exitDepth(tau: number, hang: number, rest: number, half: number): number {
  if (tau <= 0) return hang;
  const v = (2 * half) / CROSS;
  if (tau < APPROACH) return hermite(tau / APPROACH, hang, 0, -half, v * APPROACH);
  if (tau < APPROACH + CROSS) return -half + v * (tau - APPROACH);
  const over = OVERSHOOT * (rest - half), up = LAND * LAND_PEAK, x = tau - APPROACH - CROSS;
  if (x < up) return hermite(x / up, half, v * up, rest + over, 0);
  if (tau < EXIT + SETTLE) return rest + over * (0.5 + 0.5 * Math.cos((Math.PI * (x - up)) / (LAND - up + SETTLE)));
  return rest;
}

/** How much of its crossing tilt a sheet has, 0..1: it leans in just before the glass and is flat again when it lands. */
export function exitTilt(tau: number): number {
  if (tau <= APPROACH - 0.25 || tau >= EXIT) return 0;
  if (tau < APPROACH) return smooth(APPROACH - 0.25, APPROACH, tau);
  if (tau <= APPROACH + CROSS) return 1;
  return 1 - smooth(APPROACH + CROSS, EXIT, tau);
}

// `rebuild` (host): the layers come back in, bottom first, slide to a shallow fan, gather, move to the glass.
export const REBUILD = 1.8;
/** Starts of the re-entries are spread over this long; one re-entry crosses in RB_CROSS and slides for RB_SLIDE. */
export const RB_SPREAD = 0.42;
export const RB_CROSS = 0.2;
export const RB_SLIDE = 0.3;
/** The stack gathers at OPEN_DEPTH during RB_GATHER..RB_FORWARD, then moves to the glass until RB_FLAT. */
export const RB_GATHER = 0.92;
export const RB_FORWARD = 1.2;
export const RB_FLAT = 1.5;
/** The QR re-forms from RB_QR to the end. */
export const RB_QR = 1.3;

/** Depth of stack index j of n, `t` seconds into `rebuild`, and (second value, in rebuildTilt) its tilt 0..1. */
export function rebuildDepth(j: number, n: number, t: number, start: number, half: number): number {
  const tau = t - start, fan = 0.4 * hangDepth(j, n);
  let z: number;
  if (tau < RB_CROSS) z = half - ((2 * half) / RB_CROSS) * tau; // > 0 before it starts: still outside
  else if (tau < RB_CROSS + RB_SLIDE) z = hermite((tau - RB_CROSS) / RB_SLIDE, -half, -((2 * half) / RB_CROSS) * RB_SLIDE, fan, 0);
  else z = fan;
  if (t > RB_GATHER) z = mix(z, -OPEN_DEPTH, easeInOut((t - RB_GATHER) / (RB_FORWARD - RB_GATHER)));
  if (t > RB_FORWARD) z = mix(-OPEN_DEPTH, 0, easeInOut((t - RB_FORWARD) / (RB_FLAT - RB_FORWARD)));
  return t >= RB_FLAT ? 0 : z;
}

export function rebuildTilt(tau: number): number {
  if (tau <= 0) return 1;
  if (tau < RB_CROSS) return 1;
  return 1 - smooth(RB_CROSS, RB_CROSS + RB_SLIDE, tau);
}

export interface Plan {
  /** number of flying (non-QR) layers */
  n: number;
  dur: Record<Timeline, number>;
  /** start of the exit, by leave order (0 = top layer) */
  start: Float64Array;
  /** start of the re-entry in `rebuild`, by stack index (0 = bottom) */
  rebuildStart: Float64Array;
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
  // the same length for every manifest: the exits share EXIT_SPREAD between them
  const shared = EXITS + EXIT_SPREAD + EXIT + SETTLE + CHROME + HOLD;
  const start = new Float64Array(n);
  const rebuildStart = new Float64Array(n);
  const assembleStart = new Float64Array(n);
  const assembleDrop = 0.55;
  for (let k = 0; k < n; k++) {
    start[k] = EXITS + (n > 1 ? (k * EXIT_SPREAD) / (n - 1) : 0);
    rebuildStart[k] = n > 1 ? (k * RB_SPREAD) / (n - 1) : 0;
    assembleStart[k] = n > 1 ? (k * 0.35) / (n - 1) : 0;
  }
  return {
    n, start, rebuildStart, assembleStart, assembleDrop,
    dur: { idle: 0, connect: CONNECT, depart: shared, rebuild: REBUILD, explode: shared, fly: FLY, assemble: ASSEMBLE },
  };
}

export function durations(m: LayerManifest): Record<Timeline, number> {
  return plan(m).dur;
}

export const HOST_TIMELINES: readonly Timeline[] = ["idle", "connect", "depart", "rebuild"];
export const GUEST_TIMELINES: readonly Timeline[] = ["explode", "fly", "assemble"];
