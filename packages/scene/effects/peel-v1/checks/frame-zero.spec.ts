// A2, A3, A5 — host idle frame zero is the flat composite; parallax bounds; connect touches only the QR.
import { expect, test } from "@playwright/test";
import { noPageErrors, open, record, shot } from "./util";

test("frame-zero: host idle at t = 0 equals the 2D composite (source build, test hooks)", async ({ page }) => {
  await open(page);
  const r = await page.evaluate(async () => {
    const H = window.H;
    await H.mount({});
    const h = H.handle!, T = h.test!;
    T.setPaused(true);
    T.seek("idle", 0);
    const flat = H.compare(H.pixels(), H.reference());
    const idle0 = H.pixels();
    const cssW = (T.stats() as any).fit[2] / (T.stats() as any).pr;
    const offsets = () => (T.state() as any).sheets.map((s: any) => ({ id: s.id, qr: s.qr, px: Math.hypot(s.ox, s.oy) * cssW, sc: s.sc }));
    h.setTilt(1, 0);
    T.seek("idle", 0);
    const tiltX = offsets();
    h.setTilt(1, 1);
    T.seek("idle", 0);
    const tiltXY = offsets();
    h.setTilt(0, 0);
    T.seek("idle", 1.25);
    const breath = offsets();
    T.seek("idle", 0);
    const back = H.compare(H.pixels(), idle0);
    // connect: everything outside the QR rect (plus the 4 px lift margin) is untouched
    T.seek("connect", 0.4);
    const mid = H.pixels();
    const q = H.manifest!.layers.find((l) => l.role === "qr")!.rect, s = cssW / H.manifest!.card.w;
    const qx0 = q.x * s - 4, qy0 = q.y * s - 4, qx1 = (q.x + q.w) * s + 4, qy1 = (q.y + q.h) * s + 4;
    let outside = 0, inside = 0;
    for (let y = 0; y < mid.height; y++) for (let x = 0; x < mid.width; x++) {
      const i = (y * mid.width + x) * 4;
      const d = Math.abs(mid.data[i] - idle0.data[i]) + Math.abs(mid.data[i + 1] - idle0.data[i + 1]) + Math.abs(mid.data[i + 2] - idle0.data[i + 2]);
      if (x >= qx0 && x < qx1 && y >= qy0 && y < qy1) inside += d > 0 ? 1 : 0; else outside += d > 0 ? 1 : 0;
    }
    return { flat, tiltX, tiltXY, breath, back, connect: { changedOutsideQr: outside, changedInsideQr: inside }, stats: T.stats() };
  });
  const { cpuMs: _c, ...stats } = r.stats as Record<string, unknown>;
  record("frame-zero", { ...r, stats });
  expect(r.flat.mad).toBeLessThanOrEqual(1);
  const top = (list: { id: string; qr: boolean; px: number; sc: number }[]) => Math.max(...list.filter((s) => !s.qr).map((s) => s.px));
  const qr = (list: { qr: boolean; px: number }[]) => Math.max(...list.filter((s) => s.qr).map((s) => s.px));
  expect(top(r.tiltX)).toBeCloseTo(10, 3);
  expect(qr(r.tiltX)).toBeCloseTo(4, 3);
  expect(top(r.tiltXY)).toBeLessThanOrEqual(10.001);
  expect(qr(r.tiltXY)).toBeLessThanOrEqual(4.001);
  expect(top(r.breath)).toBeLessThanOrEqual(1.5001);
  expect(top(r.breath)).toBeGreaterThan(1);
  for (const s of [...r.tiltX, ...r.tiltXY, ...r.breath]) expect(s.sc).toBe(1);
  expect(r.back.max).toBe(0);
  expect(r.connect.changedOutsideQr).toBe(0);
  expect(r.connect.changedInsideQr).toBeGreaterThan(1000);
  noPageErrors(page);
});

test("frame-zero: production bundle, public API only", async ({ page }) => {
  await open(page);
  await page.evaluate(async () => {
    const H = window.H;
    H.freshCanvas();
    await H.mount({ build: "dist", test: false });
    void H.handle!.play("idle", { at: performance.now() + 1e7 });
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
  await shot(page);
  const r = await page.evaluate(() => ({ diff: window.H.compare(window.__shot, window.H.reference()), hooks: !!window.H.handle!.test }));
  record("frame-zero-dist", r);
  expect(r.hooks).toBe(false);
  expect(r.diff.mad).toBeLessThanOrEqual(1);
  noPageErrors(page);
});
