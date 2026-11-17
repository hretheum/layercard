// B10 — labels that hold still.
// A fixed synthetic jitter of 1.5 CSS px at 30 Hz is put on the projected card, frames are stepped at
// 60 Hz with the chrome history kept (test hook `step`): block centres move at most 0.5 CSS px per
// frame at the 95th percentile, and slots change at most twice per second — also while the pose
// sweeps through 70 degrees. Once the pose rests the chrome is the stateless layout within 0.3 s.
// A slot change slides (no block moves more than a quarter of the way in one frame). The same seek
// twice gives identical pixels. With `reduced` the blocks take their place at once (no easing) but
// keep the dead band and the held slots, so they hold as still under jitter.
import { expect, test } from "@playwright/test";
import { FOV, INSET, noPageErrors, open, record } from "./util";

const W = 390, H = 844, FPS = 60;

test("label-steady: jitter, sweep, rest, seek twice, reduced", async ({ page }) => {
  await open(page);
  const r = await page.evaluate(async ({ W, H, FPS, FOV, INSET }) => {
    const Hn = window.H;
    const f = 1 / Math.tan((FOV * Math.PI) / 360);
    // deterministic jitter: a unit direction per 30 Hz sample from a small LCG
    let seed = 12345;
    const rnd = (): number => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const dirs: number[][] = [];
    for (let i = 0; i < 400; i++) { const a = rnd() * Math.PI * 2; dirs.push([Math.cos(a), Math.sin(a)]); }
    const centres = (s: any): number[][] => s.labels.map((l: any) => [l.x + l.w / 2, l.y + l.h / 2]);
    const key = (s: any): string => s.labels.map((l: any) => `${l.side}${l.zone}${l.row}`).join("|");
    const pct = (v: number[], p: number): number => { const q = [...v].sort((a, b) => a - b); return q.length ? q[Math.min(q.length - 1, Math.floor(p * q.length))] : 0; };

    const run = async (reduced: boolean) => {
      await Hn.mount({ role: "guest", assembleRect: INSET, reduced });
      const h = Hn.handle!, T = h.test!;
      T.setPaused(true);
      h.setProjection(FOV, W / H);
      // jitter of `px` CSS px on the projected card: a shift of the card in its own plane
      const pose = (yaw: number, pitch: number, dist: number, k: number, px: number): Float32Array => {
        const u = (px * 2 * dist) / (H * f); // card units per CSS px at this distance
        return T.fakePose(yaw, pitch, dist, 0, dirs[k % dirs.length][0] * u, dirs[k % dirs.length][1] * u);
      };
      const scenario = (frames: number, at: (i: number) => [number, number, number], jitterPx: number) => {
        h.setPose(pose(...at(0), 0, jitterPx));
        T.seek("explode", 1e3);
        let prev = centres(T.state()), prevKey = key(T.state());
        const moves: number[] = [], stack: number[] = [];
        let prevBox = (T.state() as any).box as number[];
        let changes = 0, maxMove = 0;
        const start = (T.state() as any).labelSwaps as number;
        for (let i = 1; i <= frames; i++) {
          h.setPose(pose(...at(i), Math.floor(i / 2), jitterPx));
          T.step("explode", 1e3, 1 / FPS);
          const s = T.state() as any, c = centres(s), k = key(s);
          if (k !== prevKey) changes++;
          // how far the stack itself moved on screen this frame (the jitter that the blocks must not follow)
          stack.push(Math.hypot(s.box[0] - prevBox[0], s.box[1] - prevBox[1]));
          prevBox = s.box;
          for (let j = 0; j < c.length; j++) {
            const d = Math.hypot(c[j][0] - prev[j][0], c[j][1] - prev[j][1]);
            moves.push(d);
            if (d > maxMove) maxMove = d;
          }
          prev = c;
          prevKey = k;
        }
        const swaps = ((T.state() as any).labelSwaps as number) - start;
        return { frames, seconds: frames / FPS, p50: +pct(moves, 0.5).toFixed(4), p95: +pct(moves, 0.95).toFixed(4), max: +maxMove.toFixed(3), stackMoveP95: +pct(stack, 0.95).toFixed(3), slotChanges: swaps, changesSeen: changes, swapsPerSecond: +(swaps / (frames / FPS)).toFixed(2) };
      };
      // 1. a hand-held phone: fixed pose, jitter only, 4 s — at three poses
      const jitter: Record<string, unknown> = {};
      for (const [name, y, p, d] of [["standard (-14, 9, 5.6)", -14, 9, 5.6], ["frontal, 30 cm", 0, 0, 4.4], ["35 off axis, 60 cm", 35, 0, 8.8]] as const) {
        jitter[name] = scenario(4 * FPS, () => [y, p, d], 1.5);
      }
      // 2. the phone walks round the card: yaw -35 -> 35 in 4 s, with the same jitter
      const sweep = scenario(4 * FPS, (i) => [-35 + (70 * i) / (4 * FPS), 9, 5.6], 1.5);
      // 3. rest: after the sweep the pose stops; 0.3 s later the chrome must be the stateless layout
      const restPose = T.fakePose(35, 9, 5.6);
      h.setPose(restPose);
      for (let i = 0; i < Math.round(0.3 * FPS); i++) T.step("explode", 1e3, 1 / FPS);
      const held = (T.state() as any).labels;
      T.seek("explode", 1e3);
      const fresh = (T.state() as any).labels;
      let restError = 0, restSame = true;
      for (let j = 0; j < held.length; j++) {
        if (held[j].side !== fresh[j].side || held[j].zone !== fresh[j].zone || held[j].row !== fresh[j].row) restSame = false;
        restError = Math.max(restError, Math.abs(held[j].x - fresh[j].x), Math.abs(held[j].y - fresh[j].y), Math.abs(held[j].ex - fresh[j].ex));
      }
      // 4. a forced slot change slides: from a pose with the stack at the top edge (all rows below) to a centred one
      h.setPose(T.fakePose(-14, 9, 5.6, 0, 0, 1.9));
      T.seek("explode", 1e3);
      const from = centres(T.state());
      h.setPose(T.fakePose(-14, 9, 5.6));
      const path: number[][][] = [];
      for (let i = 0; i < 30; i++) { T.step("explode", 1e3, 1 / FPS); path.push(centres(T.state())); }
      const to = path[path.length - 1];
      let slideShare = 0, travelled = 0;
      for (let j = 0; j < from.length; j++) {
        const total = Math.hypot(to[j][0] - from[j][0], to[j][1] - from[j][1]);
        if (total < 20) continue;
        travelled = Math.max(travelled, total);
        let prev = from[j];
        for (const c of path) { slideShare = Math.max(slideShare, Math.hypot(c[j][0] - prev[0], c[j][1] - prev[1]) / total); prev = c[j]; }
      }
      // 5. the same seek twice, with history in between, gives the same pixels
      h.setPose(T.fakePose(-14, 9, 5.6));
      T.seek("explode", 1e3);
      const a = Hn.pixels();
      for (let i = 0; i < 20; i++) { h.setPose(pose(-20 + i, 9, 5.6, i, 1.5)); T.step("explode", 1e3, 1 / FPS); }
      h.setPose(T.fakePose(-14, 9, 5.6));
      T.seek("explode", 1e3);
      const seekTwice = Hn.compare(a, Hn.pixels());
      // 6. lag one frame after a small pose change: easing shows as a difference from the stateless layout
      h.setPose(T.fakePose(-14, 9, 5.6));
      T.seek("explode", 1e3);
      h.setPose(T.fakePose(-8, 9, 5.6));
      T.step("explode", 1e3, 1 / FPS);
      const stepped = (T.state() as any).labels;
      T.seek("explode", 1e3);
      const direct = (T.state() as any).labels;
      let lag = 0, sameSlots = true;
      for (let j = 0; j < stepped.length; j++) {
        if (stepped[j].side !== direct[j].side || stepped[j].zone !== direct[j].zone || stepped[j].row !== direct[j].row) sameSlots = false;
        lag = Math.max(lag, Math.abs(stepped[j].x - direct[j].x), Math.abs(stepped[j].y - direct[j].y));
      }
      return { jitter, sweep, rest: { afterSeconds: 0.3, maxErrorCssPx: +restError.toFixed(4), sameSlots: restSame },
        slide: { longestTravelCssPx: +travelled.toFixed(1), largestShareOfTravelInOneFrame: +slideShare.toFixed(3) }, seekTwice,
        oneFrameAfterAPoseChange: { sameSlots, lagCssPx: +lag.toFixed(3) } };
    };
    return { motion: await run(false), reduced: await run(true) };
  }, { W, H, FPS, FOV, INSET });
  record("label-steady", r);
  for (const [mode, m] of Object.entries(r) as [string, any][]) {
    for (const [name, j] of Object.entries(m.jitter) as [string, any][]) {
      expect(j.p95, `${mode}, ${name}: block movement per frame, 95th percentile`).toBeLessThanOrEqual(0.5);
      expect(j.swapsPerSecond, `${mode}, ${name}`).toBeLessThanOrEqual(2);
      // the jitter is really there: the stack moves by more than 1 CSS px between 30 Hz samples
      expect(j.stackMoveP95, `${mode}, ${name}`).toBeGreaterThan(1);
    }
    expect(m.sweep.swapsPerSecond, `${mode}: sweep`).toBeLessThanOrEqual(2);
    expect(m.rest.sameSlots, mode).toBe(true);
    expect(m.rest.maxErrorCssPx, `${mode}: not at the stateless layout 0.3 s after the pose rested`).toBeLessThanOrEqual(0.05);
    expect(m.seekTwice.max, mode).toBe(0);
    expect(m.oneFrameAfterAPoseChange.sameSlots, mode).toBe(true);
  }
  // motion: a slot change slides, and blocks lag a moving pose; reduced: blocks take their place at once
  expect(r.motion.slide.longestTravelCssPx).toBeGreaterThan(100);
  expect(r.motion.slide.largestShareOfTravelInOneFrame).toBeLessThanOrEqual(0.25);
  expect(r.motion.oneFrameAfterAPoseChange.lagCssPx).toBeGreaterThan(0.2);
  // reduced: within the dead band (2 CSS px) of its place one frame later, and a slot change is taken in one frame
  expect(r.reduced.oneFrameAfterAPoseChange.lagCssPx).toBeLessThanOrEqual(2 + 1e-6);
  expect(r.reduced.slide.largestShareOfTravelInOneFrame).toBeGreaterThanOrEqual(0.99);
  noPageErrors(page);
});
