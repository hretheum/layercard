// A9 — the measurement is true.
// The red label shows the distance between the phones: the length of the pose's translation (card
// widths) times 7 cm (the brief's assumption for the width of the card). For eight poses, some with
// the host phone off the centre of the frame, the shown number is within 1 cm of that distance, the
// label is drawn (red pixels where the state says it is), inside the canvas, pinned on the start of
// the red line, and the line starts at the bottom of the host phone and ends at the bottom centre
// of the frame.
// Under jitter the number does not flicker; without a pose it shows the virtual scene's 47 cm.
import { expect, test } from "@playwright/test";
import { ASPECT, FOV, noPageErrors, open, record } from "./util";

// yaw, pitch, distance (card widths), roll, x, y
const POSES: number[][] = [
  [0, 0, 30 / 7, 0, 0, 0], [0, 0, 47 / 7, 0, 0, 0], [0, 0, 60 / 7, 0, 0, 0], [20, 10, 5, 0, 0, 0], [-35, 0, 7.3, 0, 0, 0],
  [10, -25, 6.1, 0, 0.8, 0.9], [0, 0, 3.4, 4, 0.2, 0.4], [30, 15, 9.4, -3, -1.0, 1.4],
];

test("distance-label: the shown distance equals the pose distance times 7 cm", async ({ page }) => {
  await open(page);
  const r = await page.evaluate(async ({ POSES, FOV, ASPECT }) => {
    const H = window.H, G = H.geo(390, 844, FOV, ASPECT);
    await H.mount({ role: "guest" });
    const h = H.handle!, T = h.test!;
    T.setPaused(true);
    h.setProjection(FOV, ASPECT);
    const END = H.durations().explode;
    const redShare = (rect: number[]): number => {
      const px = H.pixels(), pr = px.width / 390;
      let red = 0, n = 0;
      for (let y = Math.ceil(rect[1] * pr); y < Math.floor((rect[1] + rect[3]) * pr); y++) for (let x = Math.ceil(rect[0] * pr); x < Math.floor((rect[0] + rect[2]) * pr); x++) {
        const i = (y * px.width + x) * 4;
        n++;
        if (px.data[i + 3] > 200 && px.data[i] > 200 && px.data[i + 1] < 140 && px.data[i + 2] < 120) red++;
      }
      return n ? red / n : 0;
    };
    const views: Record<string, unknown>[] = [];
    for (const p of POSES) {
      const M = T.fakePose(p[0], p[1], p[2], p[3], p[4], p[5]);
      h.setPose(M);
      T.seek("explode", END);
      const d = (T.state() as any).distance, cardH = (T.state() as any).cardH as number;
      const wantCm = Math.hypot(M[12], M[13], M[14]) * 7;
      const foot = G.toPx(G.apply(M, 0, -(cardH / 2 + 0.035), 0));
      views.push({
        pose: { yawDeg: p[0], pitchDeg: p[1], rollDeg: p[3], offset: [p[4], p[5]], distanceUnits: +Math.hypot(M[12], M[13], M[14]).toFixed(4) },
        poseDistanceCm: +wantCm.toFixed(2), shownCm: d.cm, errorCm: +Math.abs(d.cm - wantCm).toFixed(2), visible: d.visible && d.rect[2] > 0,
        labelRect: (d.rect as number[]).map((v) => +v.toFixed(2)), labelInsideCanvas: d.rect[0] >= 0 && d.rect[1] >= 0 && d.rect[0] + d.rect[2] <= 390 && d.rect[1] + d.rect[3] <= 844,
        redShareOfLabel: +redShare(d.rect).toFixed(3),
        labelOffLineStartCssPx: +Math.hypot(d.rect[0] + d.rect[2] / 2 - d.line[0], d.rect[1] + d.rect[3] / 2 - d.line[1]).toFixed(2),
        lineStartOffPhoneFootCssPx: +Math.hypot(d.line[0] - foot[0], d.line[1] - foot[1]).toFixed(3), lineEnd: [d.line[2], d.line[3]],
      });
    }
    // jitter at 47 cm: the number holds
    let seed = 777, changes = 0;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    h.setPose(T.fakePose(-14, 6, 6.7));
    T.seek("explode", END);
    let prev = (T.state() as any).distance.cm as number, worst = 0;
    const u = (2 * 6.7 * Math.tan((FOV * Math.PI) / 360)) / 844;
    for (let i = 0; i < 240; i++) {
      if (i % 2 === 0) { const a = rnd() * 6.283; h.setPose(T.fakePose(-14, 6, 6.7 + (rnd() - 0.5) * 3 * u, 0, Math.cos(a) * 1.5 * u, Math.sin(a) * 1.5 * u)); }
      T.step("explode", END, 1 / 60);
      const d = (T.state() as any).distance;
      if (d.cm !== prev) changes++;
      prev = d.cm;
      worst = Math.max(worst, Math.abs(d.cm - d.raw));
    }
    // no pose: the virtual scene
    h.setPose(null);
    T.seek("explode", END);
    const v = (T.state() as any).distance;
    return { assumedCardWidthCm: 7, views, jitter: { frames: 240, changesOfTheShownNumber: changes, worstErrorCm: +worst.toFixed(3) }, unanchored: { shownCm: v.cm, visible: v.visible, virtualDistanceCm: +v.raw.toFixed(2) } };
  }, { POSES, FOV, ASPECT });
  record("distance-label", r);
  expect(r.views.length).toBeGreaterThanOrEqual(6);
  for (const v of r.views as any[]) {
    const name = `${v.pose.yawDeg}/${v.pose.pitchDeg}/${v.poseDistanceCm} cm`;
    expect(v.errorCm, `${name}: shown ${v.shownCm} cm`).toBeLessThanOrEqual(1);
    expect(v.visible && v.labelInsideCanvas, `${name}: label drawn inside the canvas`).toBe(true);
    expect(v.redShareOfLabel, `${name}: red pixels in the label`).toBeGreaterThan(0.5);
    expect(v.labelOffLineStartCssPx, `${name}: label pinned on the start of the line, at the phone's foot`).toBeLessThanOrEqual(1);
    expect(v.lineStartOffPhoneFootCssPx, `${name}: line starts at the host phone`).toBeLessThanOrEqual(0.5);
    expect(v.lineEnd, name).toEqual([195, 832]);
  }
  expect(r.jitter.changesOfTheShownNumber).toBeLessThanOrEqual(1);
  expect(r.jitter.worstErrorCm).toBeLessThanOrEqual(1);
  expect(r.unanchored).toMatchObject({ shownCm: 47, visible: true });
  noPageErrors(page);
});
