// A10 — an unsteady hand, and a hand that really moves.
// Jitter: 30 times a second the pose shifts by 1.5 CSS px on the guest screen (the brief's figure, at
// 50 cm) and turns by an angle that moves the card's corners by another 0.75 px — so the error grows
// with the distance from the phone, as a tracker's does. Frames are stepped at 60 Hz for 4 s.
// Measured: how far the corners of the sheets move per frame (CSS px), for every corner in front
// of the camera and within half a frame of the canvas. p95 must be <= 2 px. The same poses without
// the effect's pose filter are projected here for comparison (the "raw" figures).
// A real move: the camera steps back from 30 to 60 cm in 2.5 s while orbiting 30 degrees. The lag of
// the anchored frame at the card's corners must stay <= 4 CSS px (the room stays on the phone).
import { expect, test } from "@playwright/test";
import { ASPECT, FOV, noPageErrors, open, record } from "./util";

test("steady-room: far sheet corners under jitter, lag under a real camera move", async ({ page }) => {
  await open(page);
  const r = await page.evaluate(async ({ FOV, ASPECT }) => {
    const H = window.H;
    await H.mount({ role: "guest" });
    const h = H.handle!, T = h.test!;
    T.setPaused(true);
    h.setProjection(FOV, ASPECT);
    const W = 390, Hh = 844, f = 1 / Math.tan((FOV * Math.PI) / 360), THICK = 0.012, DT = 1 / 60;
    const D = H.durations();
    type P3 = [number, number, number];
    const toPx = (p: P3): [number, number] => [(((p[0] * f) / ASPECT / -p[2]) * 0.5 + 0.5) * W, (0.5 - ((p[1] * f) / -p[2]) * 0.5) * Hh];
    const apply = (M: Float32Array | number[], x: number, y: number, z: number): P3 =>
      [M[0] * x + M[4] * y + M[8] * z + M[12], M[1] * x + M[5] * y + M[9] * z + M[13], M[2] * x + M[6] * y + M[10] * z + M[14]];
    const near = (p: [number, number]) => p[0] > -W / 2 && p[0] < 1.5 * W && p[1] > -Hh / 2 && p[1] < 1.5 * Hh;
    const pct = (a: number[], q: number) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : 0; };
    // rotation matrix + translation from a quaternion and a position (the effect's frame)
    const fromFrame = (pos: number[], q: number[]): number[] => {
      const [x, y, z, w] = q;
      return [1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w), 0, 2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w), 0,
        2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y), 0, pos[0], pos[1], pos[2], 1];
    };
    let seed = 12345;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

    // ---- jitter at 50 cm
    const base: [number, number, number] = [-14, 6, 50 / 7];
    const unitsPerPx = (2 * base[2] * Math.tan((FOV * Math.PI) / 360)) / Hh;
    h.setPose(T.fakePose(base[0], base[1], base[2]));
    T.seek("explode", D.explode);
    const room = ((T.state() as any).sheets as any[]).filter((s) => !s.qr).map((s) => ({ id: s.id, room: s.room, rect: s.rect }));
    const cornersOf = (M: Float32Array | number[]): P3[] => {
      const out: P3[] = [];
      for (const s of room) {
        const R = s.room, c = Math.cos(R.yaw), sn = Math.sin(R.yaw), rw = s.rect[2] * R.scale, rh = s.rect[3] * R.scale;
        for (const [sx, sy] of [[-1, 1], [1, 1], [1, -1], [-1, -1]]) out.push(apply(M, R.x + (c * sx * rw) / 2, R.y + (sy * rh) / 2, R.z + THICK - (sn * sx * rw) / 2));
      }
      return out;
    };
    const moves: number[] = [], rawMoves: number[] = [], cardMoves: number[] = [];
    let prev: [number, number][] | null = null, prevRaw: [number, number][] | null = null, prevCard: [number, number][] | null = null;
    let M = T.fakePose(base[0], base[1], base[2]);
    const frames = 240;
    for (let i = 0; i < frames; i++) {
      if (i % 2 === 0) {
        const a = rnd() * Math.PI * 2, ang = ((0.75 * unitsPerPx) / 1.19) * (180 / Math.PI), b = rnd() * Math.PI * 2, c = rnd() * 2 - 1, q = Math.sqrt(1 - c * c);
        M = T.fakePose(base[0] + ang * q * Math.cos(b), base[1] + ang * q * Math.sin(b), base[2], ang * c, Math.cos(a) * 1.5 * unitsPerPx, Math.sin(a) * 1.5 * unitsPerPx);
        h.setPose(M);
      }
      T.step("explode", D.explode, DT);
      const st = T.state() as any;
      const F = fromFrame(st.frame.pos, st.frame.quat);
      const now = cornersOf(F).map((p) => (p[2] < -0.3 ? toPx(p) : null)) as ([number, number] | null)[];
      const raw = cornersOf(M).map((p) => (p[2] < -0.3 ? toPx(p) : null)) as ([number, number] | null)[];
      const card = ([[-0.5, 1.08], [0.5, 1.08], [0.5, -1.08], [-0.5, -1.08]] as [number, number][]).map((c) => toPx(apply(F, c[0], c[1], 0)));
      if (prev && prevRaw && prevCard && i > 30) {
        for (let k = 0; k < now.length; k++) {
          const a = now[k], b = prev[k], c = raw[k], d = prevRaw[k];
          if (a && b && near(a)) moves.push(Math.hypot(a[0] - b[0], a[1] - b[1]));
          if (c && d && near(c)) rawMoves.push(Math.hypot(c[0] - d[0], c[1] - d[1]));
        }
        for (let k = 0; k < 4; k++) cardMoves.push(Math.hypot(card[k][0] - prevCard[k][0], card[k][1] - prevCard[k][1]));
      }
      prev = now as [number, number][];
      prevRaw = raw as [number, number][];
      prevCard = card;
    }
    const jitter = {
      frames, hz: 60, poseHz: 30, cm: 50, shiftCssPx: 1.5, cornerTurnCssPx: 0.75, cornersSampled: moves.length,
      perFrameCssPx: { p50: +pct(moves, 0.5).toFixed(3), p95: +pct(moves, 0.95).toFixed(3), max: +Math.max(...moves).toFixed(3) },
      withoutFilterCssPx: { p50: +pct(rawMoves, 0.5).toFixed(3), p95: +pct(rawMoves, 0.95).toFixed(3), max: +Math.max(...rawMoves).toFixed(3) },
      cardCornersCssPx: { p95: +pct(cardMoves, 0.95).toFixed(3), max: +Math.max(...cardMoves).toFixed(3) },
    };

    // ---- a real move: step back from 30 to 60 cm in 2.5 s while orbiting from 0 to 30 degrees
    const ease = (x: number) => x * x * (3 - 2 * x);
    h.setPose(T.fakePose(0, 0, 30 / 7));
    T.seek("explode", D.explode);
    const lagCard: number[] = [], lagFar: number[] = [];
    const steps = Math.round(2.5 / DT);
    for (let i = 1; i <= steps + 30; i++) {
      const x = ease(Math.min(1, i / steps));
      const Mt = T.fakePose(30 * x, 4 * x, (30 + 30 * x) / 7);
      h.setPose(Mt);
      T.step("explode", D.explode, DT);
      const st = T.state() as any, F = fromFrame(st.frame.pos, st.frame.quat);
      for (const c of [[-0.5, 1.08], [0.5, 1.08], [0.5, -1.08], [-0.5, -1.08]]) {
        const a = toPx(apply(F, c[0], c[1], 0)), b = toPx(apply(Mt, c[0], c[1], 0));
        lagCard.push(Math.hypot(a[0] - b[0], a[1] - b[1]));
      }
      const fa = cornersOf(F), tb = cornersOf(Mt);
      for (let k = 0; k < fa.length; k++) {
        if (fa[k][2] > -0.3 || tb[k][2] > -0.3) continue;
        const a = toPx(fa[k]), b = toPx(tb[k]);
        if (near(b)) lagFar.push(Math.hypot(a[0] - b[0], a[1] - b[1]));
      }
    }
    const move = {
      seconds: 2.5, fromCm: 30, toCm: 60, orbitDeg: 30,
      cardCornerLagCssPx: { p95: +pct(lagCard, 0.95).toFixed(3), max: +Math.max(...lagCard).toFixed(3) },
      sheetCornerLagCssPx: { p95: +pct(lagFar, 0.95).toFixed(3), max: +Math.max(...lagFar).toFixed(3) },
      restErrorCssPx: +Math.max(...lagCard.slice(-4)).toFixed(4),
    };
    return { jitter, move };
  }, { FOV, ASPECT });
  record("steady-room", r);
  expect(r.jitter.cornersSampled).toBeGreaterThan(1000);
  expect(r.jitter.perFrameCssPx.p95, "sheet corners per frame under jitter (p95)").toBeLessThanOrEqual(2);
  expect(r.move.cardCornerLagCssPx.max, "lag at the card's corners during a real move").toBeLessThanOrEqual(4);
  noPageErrors(page);
});
