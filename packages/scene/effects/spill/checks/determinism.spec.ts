// A12 — the same timeline and time give identical pixels, whatever was rendered in between, and after a remount.
import { expect, test } from "@playwright/test";
import { ASPECT, FOV, INSET, noPageErrors, open, record } from "./util";

test("determinism: both roles, anchored and unanchored, across seeks and a remount", async ({ page }) => {
  await open(page);
  const r = await page.evaluate(async ({ INSET, FOV, ASPECT }) => {
    const H = window.H;
    const cases: { name: string; role: "host" | "guest"; pose: number[] | null; tilt: [number, number]; frames: [string, number][] }[] = [
      { name: "host", role: "host", pose: null, tilt: [0.6, -0.3], frames: [["idle", 0], ["idle", 1.7], ["connect", 0.37], ["depart", 0.9], ["depart", 2.45], ["depart", 6.1], ["rebuild", 0.6], ["rebuild", 1.2]] },
      { name: "guest-unanchored", role: "guest", pose: null, tilt: [0, 0], frames: [["explode", 0.5], ["explode", 2.3], ["explode", 4.4], ["explode", 6.1], ["fly", 0.5], ["fly", 1.0], ["assemble", 0.3], ["assemble", 0.8]] },
      { name: "guest-anchored", role: "guest", pose: [-14, 9, 5.6], tilt: [0, 0], frames: [["explode", 0.5], ["explode", 2.3], ["explode", 4.4], ["explode", 6.1], ["fly", 0.5], ["fly", 1.0], ["assemble", 0.3], ["assemble", 0.8]] },
    ];
    const out: Record<string, { first: string[]; again: string[]; remount: string[] }> = {};
    for (const c of cases) {
      const run = async (shuffle: boolean) => {
        const h = H.handle!, T = h.test!;
        T.setPaused(true);
        h.setTilt(c.tilt[0], c.tilt[1]);
        if (c.role === "guest") {
          h.setProjection(FOV, ASPECT);
          h.setPose(c.pose ? T.fakePose(c.pose[0], c.pose[1], c.pose[2]) : null);
        }
        const order = c.frames.map((_, i) => i);
        if (shuffle) order.reverse();
        const hashes: string[] = [];
        for (const i of order) {
          if (shuffle) T.seek(c.frames[(i + 3) % c.frames.length][0] as any, 0.123);
          T.seek(c.frames[i][0] as any, c.frames[i][1]);
          hashes[i] = H.hash();
        }
        return hashes;
      };
      await H.mount({ role: c.role, assembleRect: c.role === "guest" ? INSET : undefined });
      const first = await run(false), again = await run(true);
      H.freshCanvas();
      await H.mount({ role: c.role, assembleRect: c.role === "guest" ? INSET : undefined });
      out[c.name] = { first, again, remount: await run(false) };
    }
    return out;
  }, { INSET, FOV, ASPECT });
  record("determinism", r);
  for (const v of Object.values(r)) {
    expect(v.again).toEqual(v.first);
    expect(v.remount).toEqual(v.first);
    expect(new Set(v.first).size).toBeGreaterThan(v.first.length - 2);
  }
  noPageErrors(page);
});
