// A4 — pixels inside safeRects are never drawn, in any host timeline.
import { expect, test } from "@playwright/test";
import { noPageErrors, open, record } from "./util";

test("safe-rects: untouched (alpha 0) through idle, connect, depart and rebuild", async ({ page }) => {
  await open(page);
  const rects = [{ x: 97.5, y: 640, w: 195, h: 195 }, { x: 0, y: 0, w: 44, h: 44 }, { x: 300.4, y: 300.6, w: 89.6, h: 60.2 }];
  const r = await page.evaluate(async (rects) => {
    const H = window.H, D = H.durations();
    await H.mount({ safeRects: rects, quality: "high" });
    const h = H.handle!, T = h.test!;
    T.setPaused(true);
    h.setTilt(1, -1);
    let frames = 0, touched = 0, maxAlpha = 0, drawnOutside = 0;
    for (const tl of ["idle", "connect", "depart", "rebuild"] as const) {
      const len = tl === "idle" ? 5 : D[tl];
      for (let i = 0; i <= 24; i++) {
        T.seek(tl, (len * i) / 24);
        const p = H.pixels();
        frames++;
        for (const q of rects) {
          for (let y = Math.ceil(q.y); y < Math.floor(q.y + q.h); y++) for (let x = Math.ceil(q.x); x < Math.floor(q.x + q.w); x++) {
            const a = p.data[(y * p.width + x) * 4 + 3];
            if (a !== 0) touched++;
            if (a > maxAlpha) maxAlpha = a;
          }
        }
        if (p.data[(500 * p.width + 20) * 4 + 3] === 255) drawnOutside++;
      }
    }
    return { frames, touched, maxAlpha, drawnOutside };
  }, rects);
  record("safe-rects", { rects, ...r });
  expect(r.touched).toBe(0);
  expect(r.drawnOutside).toBe(r.frames);
  noPageErrors(page);
});
