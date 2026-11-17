// A7 — the rebuild end frame equals idle frame zero.
import { expect, test } from "@playwright/test";
import { noPageErrors, open, record, shot } from "./util";

test("rebuild-end: identical pixels to idle frame zero (source build)", async ({ page }) => {
  await open(page);
  const r = await page.evaluate(async () => {
    const H = window.H;
    await H.mount({});
    const T = H.handle!.test!;
    T.setPaused(true);
    T.seek("idle", 0);
    const a = H.pixels();
    T.seek("rebuild", 1e3);
    const b = H.pixels();
    T.seek("depart", 1e3);
    const empty = H.compare(H.pixels(), a);
    return { diff: H.compare(a, b), departEndDiffersFromCard: empty.mad };
  });
  record("rebuild-end", r);
  expect(r.diff.max).toBe(0);
  expect(r.departEndDiffersFromCard).toBeGreaterThan(1);
  noPageErrors(page);
});

test("rebuild-end: production bundle played in real time", async ({ page }) => {
  await open(page);
  await page.evaluate(async () => {
    const H = window.H;
    H.freshCanvas();
    await H.mount({ build: "dist", test: false });
    await H.handle!.play("rebuild");
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
  await shot(page);
  await page.evaluate(async () => {
    (window as any).__end = window.__shot;
    void window.H.handle!.play("idle", { at: performance.now() + 1e7 });
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
  await shot(page);
  const r = await page.evaluate(() => window.H.compare((window as any).__end, window.__shot));
  record("rebuild-end-dist", r);
  expect(r.max).toBe(0);
  noPageErrors(page);
});
