// A11 — fly ends opaque; the assemble end frame is the flat composite of the non-QR layers in assembleRect.
import { expect, test } from "@playwright/test";
import { ASPECT, FOV, FRACT, INSET, noPageErrors, open, record, shot } from "./util";

test("assemble-end: flat composite inside assembleRect (three rects, anchored and unanchored)", async ({ page }) => {
  await open(page);
  const r = await page.evaluate(async ({ INSET, FRACT, FOV, ASPECT }) => {
    const H = window.H, out: Record<string, unknown> = {};
    for (const [name, rect] of [["full", undefined], ["inset", INSET], ["fractional", FRACT]] as const) {
      for (const anchored of [false, true]) {
        await H.mount({ role: "guest", assembleRect: rect });
        const h = H.handle!, T = h.test!;
        T.setPaused(true);
        h.setProjection(FOV, ASPECT);
        if (anchored) h.setPose(T.fakePose(-14, 9, 5.6));
        T.seek("fly", 1e3);
        const p = H.pixels().data;
        let minA = 255;
        for (let i = 3; i < p.length; i += 4) if (p[i] < minA) minA = p[i];
        T.seek("assemble", 1e3);
        out[`${name}${anchored ? "-anchored" : ""}`] = { ...H.compare(H.pixels(), H.reference({ area: rect, qr: false })), flyEndMinAlpha: minA };
      }
    }
    return out;
  }, { INSET, FRACT, FOV, ASPECT });
  record("assemble-end", r);
  for (const v of Object.values(r) as { mad: number; flyEndMinAlpha: number }[]) {
    expect(v.mad).toBeLessThanOrEqual(1);
    expect(v.flyEndMinAlpha).toBe(255);
  }
  noPageErrors(page);
});

test("assemble-end: production bundle played in real time", async ({ page }) => {
  await open(page);
  await page.evaluate(async ({ INSET, FOV, ASPECT }) => {
    const H = window.H;
    H.freshCanvas();
    await H.mount({ build: "dist", test: false, role: "guest", assembleRect: INSET });
    H.handle!.setProjection(FOV, ASPECT);
    await H.handle!.play("assemble");
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }, { INSET, FOV, ASPECT });
  await shot(page);
  const r = await page.evaluate((INSET) => window.H.compare(window.__shot, window.H.reference({ area: INSET, qr: false })), INSET);
  record("assemble-end-dist", r);
  expect(r.mad).toBeLessThanOrEqual(1);
  noPageErrors(page);
});
