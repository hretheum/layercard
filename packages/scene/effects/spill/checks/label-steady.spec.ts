// A11 — labels that hold still at room scale.
// The same synthetic jitter as steady-room (1.5 CSS px shift plus a turn worth 0.75 px at the card's
// corners, 30 Hz) is put on the pose; frames are stepped at 60 Hz with the chrome history kept (test
// hook `step`). Label blocks move at most 0.5 CSS px per frame at the 95th percentile and never
// overlap — also while the camera orbits through 70 degrees. Once the pose rests, every block is on
// its stateless place within 0.3 s. A block whose place jumps slides there (no more than a quarter of
// the way in one frame). The same seek twice gives identical pixels. The distance label does not
// flicker under jitter. With `reduced` blocks take their place at once but keep the dead band.
import { expect, test } from "@playwright/test";
import { FOV, noPageErrors, open, record } from "./util";

const W = 390, H = 844, FPS = 60;

test("label-steady: jitter, orbit, rest, slide, seek twice, reduced", async ({ page }) => {
  await open(page);
  const r = await page.evaluate(async ({ W, H, FPS, FOV }) => {
    const Hn = window.H;
    const pct = (v: number[], p: number): number => { const q = [...v].sort((a, b) => a - b); return q.length ? q[Math.min(q.length - 1, Math.floor(p * q.length))] : 0; };
    const shown = (s: any): any[] => (s.labels as any[]).filter((l) => l.shown);
    const overlapping = (s: any): number => {
      // a block that gives way to another while it passes is not drawn (alpha 0)
      const L = shown(s).filter((l) => l.alpha > 0.02), d = s.distance.rect as number[];
      let n = 0;
      const hit = (a: any, b: any) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      for (let i = 0; i < L.length; i++) {
        for (let j = i + 1; j < L.length; j++) if (hit(L[i], L[j])) n++;
        if (d[2] > 0 && hit(L[i], { x: d[0], y: d[1], w: d[2], h: d[3] })) n++;
      }
      return n;
    };

    const run = async (reduced: boolean) => {
      await Hn.mount({ role: "guest", reduced });
      const h = Hn.handle!, T = h.test!;
      T.setPaused(true);
      h.setProjection(FOV, W / H);
      const END = Hn.durations().explode;
      let seed = 12345;
      const rnd = (): number => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      let jit = [0, 0, 0, 0, 0];
      const pose = (yaw: number, pitch: number, dist: number, fresh: boolean, on: boolean): Float32Array => {
        if (fresh) {
          const u = (2 * dist * Math.tan((FOV * Math.PI) / 360)) / H, a = rnd() * Math.PI * 2, ang = ((0.75 * u) / 1.19) * (180 / Math.PI), b = rnd() * Math.PI * 2, c = rnd() * 2 - 1, q = Math.sqrt(1 - c * c);
          jit = [ang * q * Math.cos(b), ang * q * Math.sin(b), ang * c, Math.cos(a) * 1.5 * u, Math.sin(a) * 1.5 * u];
        }
        return on ? T.fakePose(yaw + jit[0], pitch + jit[1], dist, jit[2], jit[3], jit[4]) : T.fakePose(yaw, pitch, dist);
      };
      const scenario = (frames: number, at: (i: number) => [number, number, number]) => {
        h.setPose(pose(...at(0), true, true));
        T.seek("explode", END);
        let prev = new Map<string, number[]>(shown(T.state()).map((l) => [l.id, [l.x + l.w / 2, l.y + l.h / 2, l.ax, l.ay]]));
        const moves: number[] = [], anchors: number[] = [];
        let overlapFrames = 0, labelsMin = 99, hiddenFrames = 0, cmChanges = 0, cmPrev = (T.state() as any).distance.cm as number;
        for (let i = 1; i <= frames; i++) {
          h.setPose(pose(...at(i), i % 2 === 0, true));
          T.step("explode", END, 1 / FPS);
          const s = T.state() as any, L = shown(s);
          if (overlapping(s) > 0) overlapFrames++;
          if (L.some((l) => l.alpha < 1)) hiddenFrames++;
          labelsMin = Math.min(labelsMin, L.length);
          if (s.distance.cm !== cmPrev) cmChanges++;
          cmPrev = s.distance.cm;
          const now = new Map<string, number[]>();
          for (const l of L) {
            const c = [l.x + l.w / 2, l.y + l.h / 2, l.ax, l.ay], p = prev.get(l.id);
            if (p) { moves.push(Math.hypot(c[0] - p[0], c[1] - p[1])); anchors.push(Math.hypot(c[2] - p[2], c[3] - p[3])); }
            now.set(l.id, c);
          }
          prev = now;
        }
        return { frames, seconds: frames / FPS, blockMoveCssPx: { p50: +pct(moves, 0.5).toFixed(4), p95: +pct(moves, 0.95).toFixed(4), max: +Math.max(0, ...moves).toFixed(3) },
          anchorMoveCssPx: { p95: +pct(anchors, 0.95).toFixed(3), max: +Math.max(0, ...anchors).toFixed(3) }, framesWithOverlap: overlapFrames, framesWithABlockGivingWay: hiddenFrames, fewestLabels: labelsMin, distanceLabelChanges: cmChanges };
      };
      // 1. a hand-held phone: fixed pose, jitter only, 4 s — at three poses
      const jitter: Record<string, unknown> = {};
      for (const [name, y, p, d] of [["standard (-14, 6, 47 cm)", -14, 6, 6.7], ["frontal, 30 cm", 0, 0, 4.29], ["35 off axis, 60 cm", 35, 0, 8.57]] as const) {
        jitter[name] = scenario(4 * FPS, () => [y, p, d]);
      }
      // 2. the phone walks round the card: yaw -35 -> 35 in 4 s, with the same jitter
      const orbit = scenario(4 * FPS, (i) => [-35 + (70 * i) / (4 * FPS), 6, 6.7]);
      // 3. rest: the pose stops; 0.3 s later every block is on its stateless place
      h.setPose(T.fakePose(35, 6, 6.7));
      for (let i = 0; i < Math.round(0.3 * FPS); i++) T.step("explode", END, 1 / FPS);
      let restError = 0;
      for (const l of shown(T.state())) restError = Math.max(restError, Math.abs(l.x - l.tx), Math.abs(l.y - l.ty));
      // 4. a jump of the pose: blocks slide to their new places
      h.setPose(T.fakePose(-30, 6, 6.7));
      T.seek("explode", END);
      const from = new Map<string, number[]>(shown(T.state()).map((l) => [l.id, [l.x, l.y]]));
      h.setPose(T.fakePose(30, 6, 6.7));
      const path: Map<string, number[]>[] = [];
      for (let i = 0; i < 30; i++) { T.step("explode", END, 1 / FPS); path.push(new Map(shown(T.state()).map((l) => [l.id, [l.x, l.y]]))); }
      let slideShare = 0, travelled = 0;
      for (const [id, a] of from) {
        const b = path[path.length - 1].get(id);
        if (!b) continue;
        const total = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (total < 20) continue;
        travelled = Math.max(travelled, total);
        let prev = a;
        for (const m of path) { const c = m.get(id); if (!c) break; slideShare = Math.max(slideShare, Math.hypot(c[0] - prev[0], c[1] - prev[1]) / total); prev = c; }
      }
      // 5. the same seek twice, with history in between, gives the same pixels
      h.setPose(T.fakePose(-14, 6, 6.7));
      T.seek("explode", END);
      const a = Hn.pixels();
      for (let i = 0; i < 20; i++) { h.setPose(pose(-20 + i, 6, 6.7, true, true)); T.step("explode", END, 1 / FPS); }
      h.setPose(T.fakePose(-14, 6, 6.7));
      T.seek("explode", END);
      const seekTwice = Hn.compare(a, Hn.pixels());
      // 6. one frame after a pose change: easing shows as a distance between a block and its stateless place
      h.setPose(T.fakePose(-14, 6, 6.7));
      T.seek("explode", END);
      h.setPose(T.fakePose(-4, 6, 6.7));
      T.step("explode", END, 1 / FPS);
      let lag = 0;
      for (const l of shown(T.state())) lag = Math.max(lag, Math.abs(l.x - l.tx), Math.abs(l.y - l.ty));
      return { jitter, orbit, rest: { afterSeconds: 0.3, maxErrorCssPx: +restError.toFixed(4) },
        slide: { longestTravelCssPx: +travelled.toFixed(1), largestShareOfTravelInOneFrame: +slideShare.toFixed(3) }, seekTwice,
        oneFrameAfterAPoseChange: { lagCssPx: +lag.toFixed(3) } };
    };
    return { motion: await run(false), reduced: await run(true) };
  }, { W, H, FPS, FOV });
  record("label-steady", r);
  for (const [mode, m] of Object.entries(r) as [string, any][]) {
    for (const [name, j] of Object.entries(m.jitter) as [string, any][]) {
      expect(j.blockMoveCssPx.p95, `${mode}, ${name}: block movement per frame, 95th percentile`).toBeLessThanOrEqual(0.5);
      expect(j.framesWithOverlap, `${mode}, ${name}: frames with overlapping labels`).toBe(0);
      expect(j.framesWithABlockGivingWay, `${mode}, ${name}: a block gave way under jitter alone`).toBe(0);
      expect(j.fewestLabels, `${mode}, ${name}: labels shown`).toBeGreaterThanOrEqual(3);
      expect(j.distanceLabelChanges, `${mode}, ${name}: the distance label flickered`).toBeLessThanOrEqual(1);
    }
    expect(m.orbit.fewestLabels, `${mode}: orbit`).toBeGreaterThanOrEqual(3);
    expect(m.orbit.framesWithOverlap, `${mode}: orbit, frames with overlapping labels`).toBe(0);
    // giving way is brief: under a tenth of the orbit's frames have a block that is not fully shown
    expect(m.orbit.framesWithABlockGivingWay, `${mode}: orbit`).toBeLessThanOrEqual(24);
    expect(m.rest.maxErrorCssPx, `${mode}: not on the stateless places 0.3 s after the pose rested`).toBeLessThanOrEqual(0.05);
    expect(m.seekTwice.max, mode).toBe(0);
  }
  // motion: a block whose place jumps slides there, and lags a moving pose; reduced: it takes its place at once
  expect(r.motion.slide.longestTravelCssPx).toBeGreaterThan(40);
  expect(r.motion.slide.largestShareOfTravelInOneFrame).toBeLessThanOrEqual(0.25);
  expect(r.motion.oneFrameAfterAPoseChange.lagCssPx).toBeGreaterThan(0.2);
  expect(r.reduced.oneFrameAfterAPoseChange.lagCssPx).toBeLessThanOrEqual(2 + 1e-6);
  expect(r.reduced.slide.largestShareOfTravelInOneFrame).toBeGreaterThanOrEqual(0.9);
  noPageErrors(page);
});
