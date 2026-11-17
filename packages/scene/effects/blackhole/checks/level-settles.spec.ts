// A10 — the level. It only ever rises (through explode, fly and assemble), it is about half the
// canvas at the end of explode, it covers the canvas at the end of fly, its surface wobbles while it
// fills and carries a hairline meniscus; and the last 0.3 s of assemble contain no wobble: the state
// says so and the pixels do not change.
import { expect, test } from "@playwright/test";
import { ASPECT, FLAT_MAX, FOV, INSET, noPageErrors, open, record } from "./util";

test("level-settles: the level is monotonic, wobbles while it fills, and nothing moves in the last 0.3 s of assemble", async ({ page }) => {
  test.setTimeout(300_000);
  await open(page);
  const r = await page.evaluate(async ({ FOV, ASPECT, INSET }) => {
    const H = window.H, D = H.durations();
    const out: Record<string, unknown> = {};
    for (const c of [{ name: "anchored, full-bleed", pose: [-14, 9, 5.6], rect: undefined }, { name: "unanchored, full-bleed", pose: null, rect: undefined }, { name: "anchored, inset rect", pose: [20, 0, 6.75], rect: INSET }]) {
      await H.mount({ role: "guest", assembleRect: c.rect });
      const h = H.handle!, T = h.test!;
      T.setPaused(true);
      h.setProjection(FOV, ASPECT);
      h.setPose(c.pose ? T.fakePose(c.pose[0], c.pose[1], c.pose[2]) : null);
      // the level along the three timelines
      let prev = -1, fell = 0, samples = 0, firstRise = -1, wobbling = 0;
      const ends: Record<string, number> = {};
      for (const tl of ["explode", "fly", "assemble"] as const) {
        for (let i = 0; i <= 100; i++) {
          const t = (D[tl] * i) / 100;
          T.seek(tl, t);
          const lv = (T.state() as any).level;
          samples++;
          if (lv.share < prev - 1e-12) fell++;
          if (firstRise < 0 && tl === "explode" && lv.share > 0) firstRise = t;
          if (lv.wobble > 0) wobbling++;
          prev = lv.share;
        }
        ends[tl] = prev;
      }
      // the surface in the pixels, 5.2 s into explode: opaque below it, clear above, light hairline on it
      // (the level and its layers alone: a ribbon pouring in would hide the surface under it)
      T.setOnly("level");
      T.seek("explode", 5.2);
      let p = H.pixels();
      T.setOnly(null);
      const lvMid = (T.state() as any).level;
      const surf: number[] = [];
      let light = 0;
      for (let x = 4; x < p.width; x += 6) {
        let y = p.height - 1;
        while (y >= 0 && p.data[(y * p.width + x) * 4 + 3] === 255) y--;
        surf.push(p.height - 1 - y);
        // the meniscus: on the surface's own row (the last one that is not fully opaque) or within two pixels under it,
        // a pixel much lighter than the card background
        for (let k = 0; k <= 3; k++) {
          const o = ((y + k) * p.width + x) * 4;
          if (y + k >= 0 && y + k < p.height && p.data[o] > 150 && p.data[o + 1] > 150 && p.data[o + 2] > 150) { light++; break; }
        }
      }
      const mean = surf.reduce((a, b) => a + b, 0) / surf.length;
      const pxPerCss = p.height / 844;
      // the end of fly: the canvas is opaque
      T.seek("fly", 1e3);
      p = H.pixels();
      let minA = 255;
      for (let i = 3; i < p.data.length; i += 4) if (p.data[i] < minA) minA = p.data[i];
      // the last 0.3 s of assemble
      const hashes = new Set<string>();
      let moving = 0, stillFrames = 0;
      for (let i = 0; i <= 30; i++) {
        const t = D.assemble - 0.3 + (0.299 * i) / 30;
        T.seek("assemble", t);
        const st = T.state() as any;
        stillFrames++;
        if (st.level.wobble !== 0) moving++;
        for (const s of st.sheets) if (!s.qr && (s.ox !== 0 || s.oy !== 0 || s.rot !== 0)) moving++;
        hashes.add(H.hash());
      }
      const before = H.pixels();
      T.seek("assemble", 1e3);
      const end = H.pixels();
      out[c.name] = {
        samples, levelFell: fell, firstRiseS: firstRise, framesWithWobble: wobbling, levelAtEnd: ends,
        midExplode: { stateShare: +lvMid.share.toFixed(4), wobbleCssPx: lvMid.wobble, surfaceCssPx: { mean: +(mean / pxPerCss).toFixed(2), min: Math.min(...surf) / pxPerCss, max: Math.max(...surf) / pxPerCss }, columns: surf.length, columnsWithMeniscus: light },
        flyEndMinAlpha: minA,
        last300ms: { frames: stillFrames, movingValuesInState: moving, distinctFrames: hashes.size, lastFrameAgainstThem: H.compare(before, end), endAgainstFlat: H.compare(end, H.reference({ area: c.rect, qr: false })) },
      };
    }
    return out;
  }, { FOV, ASPECT, INSET }) as Record<string, any>;
  record("level-settles", r);
  for (const [name, v] of Object.entries(r)) {
    expect(v.levelFell, name).toBe(0);
    // the first rows arrive between 2 and 3 s
    expect(v.firstRiseS, name).toBeGreaterThan(2);
    expect(v.firstRiseS, name).toBeLessThan(3);
    // about the middle of the screen at the end of explode, past the top after fly
    expect(v.levelAtEnd.explode, name).toBeGreaterThan(0.38);
    expect(v.levelAtEnd.explode, name).toBeLessThan(0.52);
    expect(v.levelAtEnd.fly, name).toBeGreaterThanOrEqual(1);
    expect(v.levelAtEnd.assemble, name).toBe(v.levelAtEnd.fly);
    expect(v.flyEndMinAlpha, name).toBe(255);
    // while it fills: the surface is where the state says (within the wobble), it is not a straight line, and it carries the hairline
    expect(Math.abs(v.midExplode.surfaceCssPx.mean - v.midExplode.stateShare * 844), name).toBeLessThanOrEqual(3);
    expect(v.midExplode.surfaceCssPx.max - v.midExplode.surfaceCssPx.min, name).toBeGreaterThanOrEqual(2);
    expect(v.midExplode.surfaceCssPx.max - v.midExplode.surfaceCssPx.min, name).toBeLessThanOrEqual(24);
    expect(v.midExplode.columnsWithMeniscus / v.midExplode.columns, name).toBeGreaterThan(0.9);
    expect(v.framesWithWobble, name).toBeGreaterThan(50);
    // the last 0.3 s: nothing moves
    expect(v.last300ms.movingValuesInState, name).toBe(0);
    expect(v.last300ms.distinctFrames, name).toBe(1);
    expect(v.last300ms.lastFrameAgainstThem.max, name).toBeLessThanOrEqual(1);
    expect(v.last300ms.endAgainstFlat.max, name).toBeLessThanOrEqual(FLAT_MAX);
  }
  noPageErrors(page);
});
