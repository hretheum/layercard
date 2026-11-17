// A16 — at most 3 luminance flashes per second (WCAG general flash: a pair of opposing changes of at
// least 10 % of full relative luminance where the darker state is below 0.80), sampled at 30 fps.
import { expect, test } from "@playwright/test";
import { ASPECT, FOV, INSET, noPageErrors, open, record } from "./util";

function flashesPerSecond(L: number[], fps: number): { max: number; transitions: number } {
  const marks: number[] = [];
  let lo = L[0], hi = L[0], dir = 0;
  for (let i = 1; i < L.length; i++) {
    const v = L[i];
    if (dir >= 0) {
      if (v > hi) hi = v;
      if (hi - v >= 0.1 && v < 0.8) { marks.push(i); dir = -1; lo = v; continue; }
    }
    if (dir <= 0) {
      if (v < lo) lo = v;
      if (v - lo >= 0.1 && lo < 0.8) { marks.push(i); dir = 1; hi = v; }
    }
  }
  let max = 0;
  for (let a = 0; a < marks.length; a++) {
    let n = 0;
    for (let b = a; b < marks.length && marks[b] - marks[a] < fps; b++) n++;
    max = Math.max(max, Math.floor(n / 2));
  }
  return { max, transitions: marks.length };
}

test("flash: every timeline stays at or under 3 flashes per second", async ({ page }) => {
  test.setTimeout(300_000);
  await open(page);
  const series = await page.evaluate(async ({ INSET, FOV, ASPECT }) => {
    const H = window.H, D = H.durations(), fps = 30;
    const out: Record<string, number[]> = {};
    const sample = (tl: string, len: number, key: string, backdrop: [number, number, number]) => {
      const L: number[] = [];
      for (let i = 0; i <= Math.round(len * fps); i++) {
        H.handle!.test!.seek(tl as any, i / fps);
        L.push(H.luminance(backdrop));
      }
      out[key] = L;
    };
    await H.mount({ quality: "high" });
    H.handle!.test!.setPaused(true);
    H.handle!.setTilt(0.7, 0.4);
    sample("idle", 5, "host-idle", [0, 0, 0]);
    for (const tl of ["connect", "depart", "rebuild"]) sample(tl, D[tl], `host-${tl}`, [0, 0, 0]);
    for (const pose of [null, [-14, 9, 5.6]]) {
      await H.mount({ role: "guest", quality: "high", assembleRect: INSET });
      const h = H.handle!;
      h.test!.setPaused(true);
      h.setProjection(FOV, ASPECT);
      h.setPose(pose ? h.test!.fakePose(pose[0], pose[1], pose[2]) : null);
      for (const tl of ["explode", "fly", "assemble"]) {
        for (const [bn, bd] of [["white", [255, 255, 255]], ["black", [0, 0, 0]]] as const) {
          sample(tl, D[tl], `guest-${pose ? "anchored" : "unanchored"}-${tl}-on-${bn}`, bd as [number, number, number]);
        }
      }
    }
    return out;
  }, { INSET, FOV, ASPECT });
  const result: Record<string, { flashesPerSecond: number; transitions: number; minL: number; maxL: number }> = {};
  for (const [k, L] of Object.entries(series)) {
    const f = flashesPerSecond(L, 30);
    result[k] = { flashesPerSecond: f.max, transitions: f.transitions, minL: +Math.min(...L).toFixed(4), maxL: +Math.max(...L).toFixed(4) };
  }
  record("flash", result);
  for (const v of Object.values(result)) expect(v.flashesPerSecond).toBeLessThanOrEqual(3);
  noPageErrors(page);
});
