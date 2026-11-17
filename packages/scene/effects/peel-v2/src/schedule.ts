// Pure timing: durations, per-layer starts and the easing curves shared by host and guest.
// Everything here is a closed-form function of time, so two devices given the same `at` agree.
import type { LayerManifest, Timeline } from "../../../types";

export const LIFT_START = 0.2;
export const LIFT = 0.9;
export const SETTLE = 0.35;
export const CHROME = 0.45;
export const HOLD = 1.2;
export const OVERSHOOT = 0.06;
export const CONNECT = 0.8;
export const FLY = 1.2;
export const ASSEMBLE = 1.0;
export const REBUILD = 1.5;
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

/** The peel: the first part of every lift, while the sheet is still within one sheet gap of the glass. */
export const PEEL = 0.25;
/**
 * Share of a sheet's rest height reached at the end of the peel. With 8 flying layers the highest sheet
 * rests 0.85 above the glass (0.862 with its thickness): 0.115 of that plus the thickness is 0.1098,
 * under one sheet gap (0.11) — so no sheet of any manifest is a gap up before the peel ends.
 */
export const PEEL_RISE = 0.115;
/** Host: how much the print swells while it peels. */
export const SWELL = 0.035;
/** After the peel the shadow on the glass is handed from the host's screen to the guest's view over this long. */
export const SHADOW_HANDOVER = 0.2;

/**
 * Height of one sheet, as a share of its rest height, `tau` seconds after its start. Shared by the
 * host (print, shadow) and the anchored guest (sheet), so both show the same lift:
 * peel (quadratic, slow off the glass) -> rise (cubic Hermite into the peak, 1 + OVERSHOOT at LIFT)
 * -> settle to exactly 1 over SETTLE. All three joins are smooth.
 */
export function liftCurve(tau: number): number {
  if (tau <= 0) return 0;
  if (tau <= PEEL) return PEEL_RISE * (tau / PEEL) * (tau / PEEL);
  if (tau <= LIFT) {
    const x = (tau - PEEL) / (LIFT - PEEL), x2 = x * x, x3 = x2 * x;
    const m0 = ((2 * PEEL_RISE) / PEEL) * (LIFT - PEEL);
    return (2 * x3 - 3 * x2 + 1) * PEEL_RISE + (x3 - 2 * x2 + x) * m0 + (-2 * x3 + 3 * x2) * (1 + OVERSHOOT);
  }
  if (tau < LIFT + SETTLE) return 1 + OVERSHOOT * 0.5 * (1 + Math.cos((Math.PI * (tau - LIFT)) / SETTLE));
  return 1;
}

/**
 * v1's lift (straight onto the bezier), kept for the unanchored guest, whose sheets do not start on
 * a glass: they enter from the top edge and only the overshoot and the settle of this curve show.
 */
export function enterCurve(tau: number): number {
  if (tau <= 0) return 0;
  if (tau <= LIFT) return (1 + OVERSHOOT) * bez(tau / LIFT);
  if (tau < LIFT + SETTLE) return 1 + OVERSHOOT * 0.5 * (1 + Math.cos((Math.PI * (tau - LIFT)) / SETTLE));
  return 1;
}

export interface Plan {
  /** number of flying (non-QR) layers */
  n: number;
  /** seconds between consecutive layer starts in depart / explode */
  gap: number;
  dur: Record<Timeline, number>;
  /** start of the lift, by leave order (0 = top layer) */
  start: Float64Array;
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
  const gap = n > 1 ? Math.min(0.75, Math.max(0.4, 3.0 / (n - 1))) : 0;
  const shared = LIFT_START + Math.max(0, n - 1) * gap + LIFT + SETTLE + CHROME + HOLD;
  const start = new Float64Array(n);
  const rebuildStart = new Float64Array(n);
  const assembleStart = new Float64Array(n);
  const rebuildLand = 0.5;
  const assembleDrop = 0.55;
  for (let k = 0; k < n; k++) {
    start[k] = LIFT_START + k * gap;
    rebuildStart[k] = n > 1 ? (k * (1.0 - rebuildLand)) / (n - 1) : 0;
    assembleStart[k] = n > 1 ? (k * 0.35) / (n - 1) : 0;
  }
  return {
    n, gap, start, rebuildStart, rebuildLand, assembleStart, assembleDrop,
    dur: { idle: 0, connect: CONNECT, depart: shared, rebuild: REBUILD, explode: shared, fly: FLY, assemble: ASSEMBLE },
  };
}

export function durations(m: LayerManifest): Record<Timeline, number> {
  return plan(m).dur;
}

export const HOST_TIMELINES: readonly Timeline[] = ["idle", "connect", "depart", "rebuild"];
export const GUEST_TIMELINES: readonly Timeline[] = ["explode", "fly", "assemble"];
