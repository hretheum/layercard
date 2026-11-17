// A7 — a switch between a viewer and none is eased over 0.3 s and never jumps; while there is a
// viewer its position is used in the next frame as given. The page's clock is stepped by the test,
// so the result does not depend on how fast the machine draws.
import { expect, test } from "@playwright/test";
import { noPageErrors, open, record } from "./util";

const STEP = 16, BLEND = 300;
const ease = (x: number): number => { x = Math.max(0, Math.min(1, x)); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };

test("viewer-switch: null <-> eye eases within 0.3 s with a bounded change per frame; a moving viewer is followed at once", async ({ page }) => {
  await page.clock.install();
  await open(page);
  await page.evaluate(async () => {
    const H = window.H;
    await H.mount({});
    // the end hold of depart: the timeline has stopped, so every change comes from the eye
    H.handle!.test!.seek("depart", 1e3);
    H.handle!.test!.setPaused(false);
  });
  await page.clock.pauseAt(Date.now() + 60_000);
  await page.clock.runFor(100);
  const read = (): Promise<{ eye: number[]; blend: number; frames: number }> =>
    page.evaluate(() => { const s = window.H.handle!.test!.state() as any; return { eye: s.eye, blend: s.viewerBlend, frames: window.H.handle!.test!.frames() }; });
  const rest = (await read()).eye, viewer = [2.6, -1.1, 5.4];
  const dist = (a: number[], b: number[]): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const run = async (to: number[] | null, from: number[], target: number[]) => {
    await page.evaluate((to) => window.H.handle!.setViewer!(to ? new Float32Array(to) : null), to);
    const total = dist(from, target), blends: number[] = [];
    let prev = from, maxStep = 0, away = 0, settled = -1, outside = 0, frames0 = (await read()).frames, frames = 0;
    for (let k = 1; k <= 30; k++) {
      await page.clock.runFor(STEP);
      const s = await read(), T = k * STEP;
      // how far along the blend is: the share of the way from `from` to `target`
      const share = 1 - dist(s.eye, target) / total;
      blends.push(+share.toFixed(4));
      // the frame drawn last was drawn at some time in the last two steps: the cubic ease at those times bounds it
      if (share > ease(T / BLEND) + 1e-6 || share < ease((T - 2 * STEP - 2) / BLEND) - 1e-6) outside++;
      const step = dist(s.eye, prev) / total;
      if (step > maxStep) maxStep = step;
      if (dist(s.eye, target) > dist(prev, target) + 1e-9) away++;
      if (settled < 0 && dist(s.eye, target) < 1e-5) settled = T;
      prev = s.eye;
      frames = s.frames - frames0;
    }
    return { total: +total.toFixed(3), frames, blends, outsideTheEase: outside, maxStepShare: +maxStep.toFixed(4), stepsAway: away, settledMs: settled, end: prev };
  };
  const on = await run(viewer, rest, viewer.map((v) => Math.fround(v)));
  const off = await run(null, viewer.map((v) => Math.fround(v)), rest);
  // with a viewer: a new position is the eye of the next frame, exactly
  await page.evaluate((v) => window.H.handle!.setViewer!(new Float32Array(v)), viewer);
  await page.clock.runFor(400);
  let followError = 0;
  for (let i = 0; i < 6; i++) {
    const v = [viewer[0] - 0.4 * i, viewer[1] + 0.25 * i, viewer[2] + 0.3 * i];
    await page.evaluate((v) => window.H.handle!.setViewer!(new Float32Array(v)), v);
    await page.clock.runFor(STEP * 2);
    followError = Math.max(followError, dist((await read()).eye, v.map((x) => Math.fround(x))));
  }
  const r = { stepMs: STEP, rest, viewer, on, off, followError };
  record("viewer-switch", r);
  for (const s of [on, off]) {
    // one frame per step while the eye moves, none once it rests
    expect(s.frames).toBeGreaterThanOrEqual(18);
    expect(s.frames).toBeLessThanOrEqual(22);
    expect(s.outsideTheEase).toBe(0);
    // the cubic ease moves at most 3 times its mean speed: 16 % of the way in a 16 ms step, 32 % if a step drew twice
    expect(s.maxStepShare).toBeLessThanOrEqual(0.33);
    expect(s.blends[0]).toBeLessThanOrEqual(0.01);
    expect(s.stepsAway).toBe(0);
    expect(s.settledMs).toBeGreaterThanOrEqual(BLEND);
    expect(s.settledMs).toBeLessThanOrEqual(BLEND + 2 * STEP + 2);
  }
  expect(dist(on.end, viewer)).toBeLessThan(1e-5);
  expect(dist(off.end, rest)).toBeLessThan(1e-9);
  expect(followError).toBeLessThan(1e-9);
  noPageErrors(page);
});
