// A5 — the sink follows the eye. SPEC 1.1: the sink is the centre of the lensing ring, the point
// S = (0, 0, -0.30 a) on the card's axis; on the host screen it shows where the line from the eye to S
// meets the glass, (E.x, E.y) d / (E.z + d) with d = 0.30 a. Here the ring is drawn alone, its centre
// is measured in the canvas pixels, and compared with that point computed in the test: for 19 eyes of
// a guest camera (30-60 cm, up to 35 degrees off the normal on both axes), at full and at half
// strength, and for the tilt eye when there is no viewer.
import { expect, test } from "@playwright/test";
import { EYES, eyeOf, noPageErrors, open, record, type V3 } from "./util";

const DEPTH = 0.3, CSS_W = 390, CSS_H = 844;
const smooth = (a: number, b: number, x: number): number => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/** Where the sink shows, CSS px on a 390 x 844 host canvas (the card fills it: 1 card width = 390 px, centre at 195, 422). */
const expected = (E: V3, a: number): [number, number] => {
  const d = DEPTH * a, k = d / (E[2] + d);
  return [CSS_W / 2 + E[0] * k * CSS_W, CSS_H / 2 - E[1] * k * CSS_W];
};
/** SPEC 1.1: the eye without a viewer, 6 card widths out, swung by tilt up to 25 degrees. */
const tiltEye = (tx: number, ty: number): V3 => {
  const len = Math.hypot(tx, ty);
  if (len > 1) { tx /= len; ty /= len; }
  const ax = (25 * Math.PI / 180) * tx, ay = (25 * Math.PI / 180) * ty;
  return [-6 * Math.sin(ax) * Math.cos(ay), 6 * Math.sin(ay), 6 * Math.cos(ax) * Math.cos(ay)];
};

test("sink-follows-eye: the ring's centre is where the line from the eye to the sink meets the glass", async ({ page }) => {
  await open(page);
  const cases: { name: string; eye: V3 | null; tilt: [number, number]; t: number }[] = [];
  const poses = await page.evaluate(async (EYES) => {
    const H = window.H;
    await H.mount({});
    const T = H.handle!.test!;
    T.setPaused(true);
    return EYES.map((e) => Array.from(T.fakePose(e[0], e[1], e[2])));
  }, EYES);
  EYES.forEach((e, i) => {
    cases.push({ name: `yaw ${e[0]}, pitch ${e[1]}, ${e[2]} card widths`, eye: eyeOf(poses[i]), tilt: [0, 0], t: 3 });
    if (i % 4 === 0) cases.push({ name: `yaw ${e[0]}, pitch ${e[1]}, ${e[2]} card widths, half strength`, eye: eyeOf(poses[i]), tilt: [0, 0], t: 0.6 });
  });
  for (const tilt of [[0, 0], [1, 0], [0, -1], [0.7, 0.7], [-0.5, 0.3]] as [number, number][]) cases.push({ name: `tilt eye ${tilt}`, eye: null, tilt, t: 3 });
  const got = await page.evaluate(async (cases) => {
    const H = window.H, h = H.handle!, T = h.test!;
    T.setOnly("ring");
    const out: { cx: number; cy: number; pixels: number; a: number; state: number[] }[] = [];
    for (const c of cases) {
      h.setViewer!(c.eye ? new Float32Array(c.eye) : null);
      h.setTilt(c.tilt[0], c.tilt[1]);
      T.seek("depart", c.t);
      const p = H.pixels(), st = T.state() as any;
      let sx = 0, sy = 0, sw = 0, n = 0;
      for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) {
        const a = p.data[(y * p.width + x) * 4 + 3];
        if (a === 0) continue;
        sx += (x + 0.5) * a;
        sy += (y + 0.5) * a;
        sw += a;
        n++;
      }
      out.push({ cx: (sx / sw) * (390 / p.width), cy: (sy / sw) * (844 / p.height), pixels: n, a: st.well.a, state: st.sink.css });
    }
    T.setOnly(null);
    return out;
  }, cases);
  let worst = 0, travel = 0;
  const rows = cases.map((c, i) => {
    const a = smooth(0, 1.2, c.t), E = c.eye ?? tiltEye(c.tilt[0], c.tilt[1]), want = expected(E, a), g = got[i];
    const err = Math.hypot(g.cx - want[0], g.cy - want[1]);
    worst = Math.max(worst, err);
    travel = Math.max(travel, Math.hypot(want[0] - CSS_W / 2, want[1] - CSS_H / 2));
    return { name: c.name, eye: E.map((v) => +v.toFixed(3)), strength: +a.toFixed(3), expectedCssPx: want.map((v) => +v.toFixed(2)), measuredCssPx: [+g.cx.toFixed(2), +g.cy.toFixed(2)], errorCssPx: +err.toFixed(3), ringPixels: g.pixels };
  });
  record("sink-follows-eye", { sinkDepth: DEPTH, cases: rows.length, worstErrorCssPx: +worst.toFixed(3), farthestFromTheCentreCssPx: +travel.toFixed(1), rows });
  expect(rows.length).toBeGreaterThanOrEqual(12);
  for (const r of rows) {
    expect(r.ringPixels, r.name).toBeGreaterThan(100);
    expect(r.errorCssPx, r.name).toBeLessThanOrEqual(2);
  }
  // the sink does move: for the farthest eye it is tens of pixels from the card's centre
  expect(travel).toBeGreaterThan(40);
  noPageErrors(page);
});
