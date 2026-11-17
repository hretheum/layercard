// A22 — the motion systems run independently.
// Host `depart` and guest `explode` are sampled together every 0.05 s with a fixed pose; each system
// is reduced to one number, and a system "moves" in a sample when that number changes. Two systems
// are independent when there is a sample in which one moves and the other does not. Seven systems
// are judged this way: the canvas zoom, the lift, the travel, the guides, the unrolling (the plane
// of columns and the sheets behind the phone), the measurement line, and the specular sweep.
// Three more are shown apart, because nothing else moves while they do: the QR dissolve (its own
// timeline), the live distance (the number follows the pose with time frozen) and the label easing
// (blocks lag their places one frame after a pose change, with time frozen).
import { expect, test } from "@playwright/test";
import { ASPECT, FOV, noPageErrors, open, record } from "./util";

test("motion: at least five systems move independently of each other", async ({ page }) => {
  await open(page);
  const r = await page.evaluate(async ({ FOV, ASPECT }) => {
    const H = window.H;
    const D = H.durations();
    const times: number[] = [];
    for (let t = 0; t <= D.explode + 1e-9; t += 0.05) times.push(+t.toFixed(2));
    const sig: Record<string, number[]> = { zoom: [], lift: [], travel: [], guides: [], unroll: [], measure: [], sweep: [] };
    // host
    await H.mount({});
    let T = H.handle!.test!;
    T.setPaused(true);
    for (const t of times) {
      T.seek("depart", t);
      const s = T.state() as any;
      sig.zoom.push(s.zoom);
      sig.lift.push((s.sheets as any[]).filter((q) => !q.qr).reduce((a, q) => a + (q.on ? q.op : 0), 0));
    }
    const qr: number[] = [];
    for (let t = 0; t <= D.connect + 1e-9; t += 0.05) { T.seek("connect", t); qr.push(((T.state() as any).sheets as any[]).find((q) => q.qr).qT); }
    T.seek("connect", 0.4);
    const during = T.state() as any;
    const qrAlone = during.zoom === 1 && (during.sheets as any[]).filter((q) => !q.qr).every((q) => q.op === 1 && q.fr === 0);
    // guest
    await H.mount({ role: "guest" });
    const h = H.handle!;
    T = h.test!;
    T.setPaused(true);
    h.setProjection(FOV, ASPECT);
    h.setPose(T.fakePose(-14, 6, 6.7));
    for (const t of times) {
      T.seek("explode", t);
      const s = T.state() as any, fly = (s.sheets as any[]).filter((q) => !q.qr && q.on);
      sig.travel.push(fly.reduce((a, q) => a + q.g, 0));
      sig.guides.push(fly.reduce((a, q) => a + q.guide, 0));
      sig.unroll.push(s.cols.grow + fly.reduce((a, q) => a + q.reveal, 0));
      sig.measure.push(s.distance.progress + s.distance.alpha);
      sig.sweep.push(fly.reduce((a, q) => a + q.sweep, 0));
    }
    const names = Object.keys(sig);
    const moves: Record<string, boolean[]> = {};
    const windows: Record<string, unknown> = {};
    for (const n of names) {
      moves[n] = sig[n].map((v, i) => i > 0 && Math.abs(v - sig[n][i - 1]) > 1e-9);
      const idx = moves[n].map((m, i) => (m ? i : -1)).filter((i) => i >= 0);
      windows[n] = { samplesMoving: idx.length, from: idx.length ? times[idx[0] - 1] : null, to: idx.length ? times[idx[idx.length - 1]] : null };
    }
    const alone: Record<string, Record<string, number>> = {};
    for (const a of names) {
      alone[a] = {};
      for (const b of names) if (a !== b) alone[a][b] = moves[a].filter((m, i) => m && !moves[b][i]).length;
    }
    const independent = names.filter((a) => moves[a].some(Boolean) && names.every((b) => a === b || alone[a][b] > 0 || alone[b][a] > 0));
    // the live distance: the number follows the pose while time stands still
    T.seek("explode", D.explode);
    const before = T.state() as any;
    h.setPose(T.fakePose(-14, 6, 8.2));
    T.seek("explode", D.explode);
    const after = T.state() as any;
    const liveDistance = { cmAt47: before.distance.cm, cmAt57: after.distance.cm, travelUnchanged: JSON.stringify((before.sheets as any[]).map((q) => q.g)) === JSON.stringify((after.sheets as any[]).map((q) => q.g)) };
    // the sweep also follows the pose with time frozen (the highlight moves as the guest does)
    const sweepFollowsPose = (before.sheets as any[]).some((q, i) => !q.qr && Math.abs(q.sweep - after.sheets[i].sweep) > 1e-3);
    // label easing: one frame after a pose change the blocks are not yet on their places
    h.setPose(T.fakePose(4, 6, 6.7));
    T.step("explode", D.explode, 1 / 60);
    let lag = 0;
    for (const l of (T.state() as any).labels) if (l.shown) lag = Math.max(lag, Math.abs(l.x - l.tx), Math.abs(l.y - l.ty));
    return {
      sampledEverySeconds: 0.05, samples: times.length, windows, samplesWhereRowMovesAndColumnDoesNot: alone, independent,
      qrDissolve: { moves: qr.some((v, i) => i > 0 && v !== qr[i - 1]), nothingElseMoves: qrAlone },
      liveDistance, sweepFollowsPose, labelEasing: { lagOneFrameAfterAPoseChangeCssPx: +lag.toFixed(3) },
    };
  }, { FOV, ASPECT });
  record("motion", r);
  const apart = [r.qrDissolve.moves && r.qrDissolve.nothingElseMoves, r.liveDistance.cmAt47 !== r.liveDistance.cmAt57 && r.liveDistance.travelUnchanged, r.labelEasing.lagOneFrameAfterAPoseChangeCssPx > 0.2];
  expect(r.independent.length, `independent systems: ${r.independent.join(", ")}`).toBeGreaterThanOrEqual(5);
  expect(r.independent.length + apart.filter(Boolean).length).toBeGreaterThanOrEqual(8);
  expect(r.sweepFollowsPose).toBe(true);
  noPageErrors(page);
});
