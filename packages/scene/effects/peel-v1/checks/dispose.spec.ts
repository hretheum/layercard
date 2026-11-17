// A14 — dispose leaves no rAF, frees every GPU resource, is idempotent, and the canvas can be mounted again.
import { expect, test } from "@playwright/test";
import { noPageErrors, open, record } from "./util";

test("dispose: no running rAF, memory counters at zero, remount works", async ({ page }) => {
  await page.addInitScript(() => {
    window.__raf = 0;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => raf((t) => { window.__raf++; cb(t); });
  });
  await open(page);
  const r = await page.evaluate(async () => {
    const H = window.H, sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
    const out: Record<string, unknown> = {};
    for (const role of ["host", "guest"] as const) {
      await H.mount({ role });
      const h = H.handle!, T = h.test!;
      T.seek(role === "host" ? "idle" : "explode", role === "host" ? 0 : 1e3); // draw everything once so GPU resources exist
      await sleep(250);
      const live = T.stats() as any, rafBefore = window.__raf;
      await sleep(900); // software GL can take 150 ms per frame
      const rafWhileMounted = window.__raf - rafBefore;
      let resolved = false;
      void h.play(role === "host" ? "depart" : "explode").then(() => { resolved = true; });
      h.dispose();
      h.dispose();
      await sleep(50);
      const base = window.__raf;
      await sleep(400);
      const dead = T.stats() as any;
      // same canvas, second mount
      await H.mount({ role });
      const T2 = H.handle!.test!;
      T2.setPaused(true);
      T2.seek(role === "host" ? "idle" : "assemble", role === "host" ? 0 : 1e3);
      const diff = H.compare(H.pixels(), H.reference({ qr: role === "host" }));
      out[role] = {
        liveTextures: live.textures, liveGeometries: live.geometries, livePrograms: live.programs, rafWhileMounted,
        rafAfterDispose: window.__raf - base, pendingPlayResolved: resolved,
        textures: dead.textures, geometries: dead.geometries, programs: dead.programs, rafFlag: dead.raf, remountDiff: diff,
      };
      H.handle!.dispose();
      H.handle = null;
    }
    return out;
  });
  record("dispose", r);
  for (const v of Object.values(r) as any[]) {
    expect(v.liveTextures).toBeGreaterThan(0);
    expect(v.rafWhileMounted).toBeGreaterThan(0);
    expect(v.rafAfterDispose).toBe(0);
    expect(v.rafFlag).toBe(false);
    expect(v.textures).toBe(0);
    expect(v.geometries).toBe(0);
    expect(v.programs).toBe(0);
    expect(v.pendingPlayResolved).toBe(true);
    expect(v.remountDiff.mad).toBeLessThanOrEqual(1);
  }
  noPageErrors(page);
});
