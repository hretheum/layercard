// A16 — the guest without a pose reads on its own: a small virtual host phone near the top (its card
// 0.38 of the canvas tall), bending and draining, ribbons pouring from it down into the level, from an
// eye that swings 10 degrees either way once over the event and is back at rest when it ends (so
// `fly` always starts from one pose). The same schedule as the anchored guest. Nothing is drawn
// before the first play.
import { expect, test } from "@playwright/test";
import { ASPECT, FOV, noPageErrors, open, record } from "./util";

test("unanchored: a small phone near the top, a swing that ends at rest, ribbons that reach the level, everything shows", async ({ page }) => {
  test.setTimeout(300_000);
  await open(page);
  const r = await page.evaluate(async ({ FOV, ASPECT }) => {
    const H = window.H, D = H.durations();
    await H.mount({ role: "guest" });
    const h = H.handle!, T = h.test!;
    T.setPaused(true);
    h.setProjection(FOV, ASPECT);
    const count = (): number => { const p = H.pixels().data; let n = 0; for (let i = 3; i < p.length; i += 4) if (p[i] !== 0) n++; return n; };
    const beforePlay = count();
    // the frame is turned by pitch about X, then yaw about Y: the yaw is the asin of the rotation's m13
    const yawOf = (q: number[]): number => (Math.asin(Math.max(-1, Math.min(1, 2 * (q[0] * q[2] + q[3] * q[1])))) * 180) / Math.PI;
    // the phone at the start: where the card is on the canvas
    T.setOnly("phone");
    T.seek("explode", 0);
    let p = H.pixels(), x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) {
      if (p.data[(y * p.width + x) * 4 + 3] < 200) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    T.setOnly(null);
    const phone = { heightShare: (y1 - y0 + 1) / p.height, widthShare: (x1 - x0 + 1) / p.width, centreFromTopShare: (y0 + y1 + 1) / 2 / p.height, topShare: y0 / p.height };
    // the swing
    const yaw: Record<string, number> = {};
    for (const [name, tl, t] of [["start", "explode", 0], ["quarter", "explode", D.explode / 4], ["half", "explode", D.explode / 2], ["end", "explode", D.explode], ["flyStart", "fly", 0], ["flyEnd", "fly", D.fly]] as const) {
      T.seek(tl, t);
      yaw[name] = +yawOf((T.state() as any).frame.quat).toFixed(4);
    }
    T.seek("explode", D.explode);
    const endFrame = JSON.stringify((T.state() as any).frame);
    T.seek("fly", 0);
    const flyFrame = JSON.stringify((T.state() as any).frame);
    // what shows, and whether ribbons reach from the phone to the level
    let ringFrames = 0, outlineFrames = 0, labelFrames = 0, ribbonFrames = 0, reaching = 0, lowest = 0, frames = 0, phoneFrames = 0;
    for (let i = 0; i <= 40; i++) {
      const t = (D.explode * i) / 40;
      T.setProbe(false);
      T.setOnly(null);
      T.seek("explode", t);
      frames++;
      const st = T.state() as any;
      if (st.labels.some((l: any) => l.on && l.alpha > 0.5)) labelFrames++;
      if (st.phoneA > 0) phoneFrames++;
      T.setOnly("ring");
      if (count() > 30) ringFrames++;
      T.setOnly("outlines");
      if (count() > 30) outlineFrames++;
      // ribbons alone, in test colours: rows of the canvas that hold a pixel of the air (green past the glass)
      T.setProbe(true);
      T.setOnly("strips");
      p = H.pixels();
      const surfaceY = p.height * (1 - st.level.share);
      let top = 1e9, bottom = -1, n = 0;
      for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x += 2) {
        const o = (y * p.width + x) * 4;
        if (p.data[o + 3] !== 255 || p.data[o + 1] <= 14) continue;
        n++;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
      if (n > 50) {
        ribbonFrames++;
        lowest = Math.max(lowest, bottom / p.height);
        // from within the phone (its lower half ends at 0.46 of the height) down to the surface
        if (top < p.height * 0.46 && bottom >= Math.min(p.height - 2, surfaceY)) reaching++;
      }
    }
    T.setProbe(false);
    T.setOnly(null);
    T.seek("fly", 0.31);
    const phoneInFly = (T.state() as any).phoneA;
    // the schedule is the anchored guest's
    const alone = (T.state() as any).start as number[];
    h.setPose(T.fakePose(-14, 9, 5.6));
    T.seek("explode", 1);
    const anchored = (T.state() as any).start as number[];
    return { beforePlay, phone, yaw, flyStartsFromTheEndPose: endFrame === flyFrame, frames, phoneFrames, ringFrames, outlineFrames, labelFrames, ribbonFrames, framesWithRibbonsFromPhoneToLevel: reaching, lowestRibbonPixelShare: lowest, phoneOpacity310msIntoFly: phoneInFly, sameSchedule: JSON.stringify(alone) === JSON.stringify(anchored) };
  }, { FOV, ASPECT });
  record("unanchored", r);
  expect(r.beforePlay).toBe(0);
  // a small phone near the top: the card 0.38 of the canvas tall (a little less seen from above), its top inside the canvas
  expect(r.phone.heightShare).toBeGreaterThan(0.33);
  expect(r.phone.heightShare).toBeLessThan(0.41);
  expect(r.phone.centreFromTopShare).toBeGreaterThan(0.22);
  expect(r.phone.centreFromTopShare).toBeLessThan(0.32);
  expect(r.phone.topShare).toBeGreaterThan(0.04);
  // one sweep there and back: -10, 10 half way, -10 at the end, and fly starts from that pose
  expect(r.yaw.start).toBeCloseTo(-10, 3);
  expect(r.yaw.half).toBeCloseTo(10, 3);
  expect(r.yaw.end).toBeCloseTo(-10, 3);
  expect(r.yaw.flyStart).toBeCloseTo(-10, 3);
  expect(r.flyStartsFromTheEndPose).toBe(true);
  // everything named shows
  expect(r.phoneFrames).toBe(r.frames);
  expect(r.ringFrames).toBeGreaterThan(30);
  expect(r.outlineFrames).toBeGreaterThan(25);
  expect(r.labelFrames).toBeGreaterThan(15);
  expect(r.ribbonFrames).toBeGreaterThan(25);
  expect(r.framesWithRibbonsFromPhoneToLevel).toBeGreaterThan(12);
  expect(r.lowestRibbonPixelShare).toBeGreaterThan(0.95);
  expect(r.phoneOpacity310msIntoFly).toBe(0);
  expect(r.sameSchedule).toBe(true);
  noPageErrors(page);
});
