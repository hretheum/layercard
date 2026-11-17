// A13 — no phone in view: the guest's screen becomes the room.
// Without a pose the effect draws its own phone, small in the middle, and looks at it from an eye
// that drifts from side to side: +-12 degrees, one sweep in 4 s. The schedule is the same as with a
// pose (same lift starts, same travel), and at the end of `explode` everything the anchored guest
// shows is there: three sheets in the frame, one across a frame edge, labels apart, a guide past
// the edge, the red line with its label. Before a layer lifts it lies as a print on the virtual
// phone's glass (one layer, one place). The canvas stays transparent around the scene.
import { expect, test } from "@playwright/test";
import { ASPECT, FOV, noPageErrors, open, record } from "./util";

test("unanchored: a virtual phone, a drifting eye, the same schedule, the same room", async ({ page }) => {
  await open(page);
  const r = await page.evaluate(async ({ FOV, ASPECT }) => {
    const H = window.H, W = 390, Hh = 844, G = H.geo(W, Hh, FOV, ASPECT);
    await H.mount({ role: "guest" });
    const h = H.handle!, T = h.test!;
    T.setPaused(true);
    h.setProjection(FOV, ASPECT);
    const END = H.durations().explode;
    // the eye: yaw of the card's normal against the camera axis, over the whole event
    const yaws: number[] = [], times: number[] = [], phoneW: number[] = [];
    let phoneOut = 0, phoneOffCentre = 0, alphaLow = 0, holeOn = 0;
    for (let t = 0; t <= END + 1e-9; t += 0.05) {
      T.seek("explode", t);
      const st = T.state() as any, F = G.fromFrame(st.frame.pos, st.frame.quat), cardH = st.cardH as number;
      yaws.push((Math.asin(F[8]) * 180) / Math.PI);
      times.push(+t.toFixed(2));
      const c = ([[-0.5, cardH / 2], [0.5, cardH / 2], [0.5, -cardH / 2], [-0.5, -cardH / 2]] as [number, number][]).map((p) => G.toPx(G.apply(F, p[0], p[1], 0)));
      if (!c.every(G.inside)) phoneOut++;
      const mid = G.toPx(G.apply(F, 0, 0, 0));
      phoneOffCentre = Math.max(phoneOffCentre, Math.abs(mid[0] - W / 2) / W, Math.abs(mid[1] - Hh / 2) / Hh);
      phoneW.push(Math.hypot(c[1][0] - c[0][0], c[1][1] - c[0][1]));
      if (st.phone.alpha < 1) alphaLow++;
      if (st.phone.holeOn > 0) holeOn++;
    }
    const iMin = yaws.indexOf(Math.min(...yaws)), iMax = yaws.indexOf(Math.max(...yaws));
    // the schedule: travel of every sheet at the same moments, with and without a pose
    const sample = (): number[][] => [1.0, 1.5, 2.2, 3.0, 4.0, 5.0, 6.0, END].map((t) => {
      T.seek("explode", t);
      return ((T.state() as any).sheets as any[]).filter((s) => !s.qr).map((s) => +(s.flat ? 0 : s.g).toFixed(9));
    });
    const free = sample(), startFree = (T.state() as any).start as number[];
    // prints on the virtual glass before the first lift, and while the canvas zooms out
    T.seek("explode", 0);
    const at0 = ((T.state() as any).sheets as any[]).filter((s) => !s.qr);
    const printsAtZero = { flat: at0.filter((s) => s.on && s.flat).length, flying: at0.length, zoom: (T.state() as any).zoom, scale: at0[0].scale[0] };
    T.seek("explode", 0.85);
    const at85 = ((T.state() as any).sheets as any[]).filter((s) => !s.qr);
    const printsBeforeLift = { flat: at85.filter((s) => s.on && s.flat).length, scale: +at85[0].scale[0].toFixed(4) };
    // the end of explode: the same room as the anchored guest shows
    T.seek("explode", END);
    const st = T.state() as any;
    const sheets = (st.sheets as any[]).filter((s) => !s.qr).map((s) => ({ id: s.id, ...G.visible(s.corners) }));
    const labels = (st.labels as any[]).filter((l) => l.shown);
    let overlaps = 0;
    const hit = (a: any, b: any) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) if (hit(labels[i], labels[j])) overlaps++;
      const d = st.distance.rect as number[];
      if (d[2] > 0 && hit(labels[i], { x: d[0], y: d[1], w: d[2], h: d[3] })) overlaps++;
    }
    const guidesPast = (st.guides as number[][]).filter((g) => g[6] > 0.05 && G.pastEdge(g)).length;
    // pixels: the corners of the canvas are transparent, the middle (the phone) is opaque
    const px = H.pixels(), pr = px.width / W, alphaAt = (x: number, y: number) => px.data[(Math.round(y * pr) * px.width + Math.round(x * pr)) * 4 + 3];
    T.seek("explode", 0.3);
    const px0 = H.pixels(), a0 = (x: number, y: number) => px0.data[(Math.round(y * pr) * px0.width + Math.round(x * pr)) * 4 + 3];
    const end = {
      sheetsInFrame: sheets.filter((s) => s.area >= 0.015 * W * Hh).length, sheetsCrossingEdge: sheets.filter((s) => s.area >= 2000 && !s.allIn).length,
      labelsShown: labels.length, labelOverlaps: overlaps, guidesDrawn: (st.guides as number[][]).length, guidesPastFrameEdge: guidesPast,
      distance: { cm: st.distance.cm, visible: st.distance.visible }, columnsVisible: st.cols.visible,
      phoneCentreAlphaAtStart: a0(W / 2, Hh / 2), cornerAlphaAtStart: [a0(4, 4), a0(W - 4, 4), a0(4, Hh - 4), a0(W - 4, Hh - 4)], phoneCentreAlphaAtEnd: alphaAt(W / 2, Hh / 2),
    };
    // with a pose: the same starts and the same travel
    h.setPose(T.fakePose(-14, 6, 6.7));
    const anchored = sample(), startAnchored = (T.state() as any).start as number[];
    return {
      eye: { minYawDeg: +Math.min(...yaws).toFixed(2), maxYawDeg: +Math.max(...yaws).toFixed(2), sweepSeconds: +Math.abs(times[iMax] - times[iMin]).toFixed(2), samples: yaws.length },
      phone: { framesOutsideCanvas: phoneOut, largestOffCentreShare: +phoneOffCentre.toFixed(3), widthCssPx: [+Math.min(...phoneW).toFixed(1), +Math.max(...phoneW).toFixed(1)], framesNotOpaque: alphaLow, framesWithHole: holeOn },
      schedule: { sameStarts: JSON.stringify(startFree) === JSON.stringify(startAnchored), sameTravel: JSON.stringify(free) === JSON.stringify(anchored), samples: free.length },
      printsAtZero, printsBeforeLift, end,
    };
  }, { FOV, ASPECT });
  record("unanchored", r);
  expect(r.eye.minYawDeg).toBeGreaterThanOrEqual(-13);
  expect(r.eye.minYawDeg).toBeLessThanOrEqual(-11);
  expect(r.eye.maxYawDeg).toBeGreaterThanOrEqual(11);
  expect(r.eye.maxYawDeg).toBeLessThanOrEqual(13);
  expect(Math.abs(r.eye.sweepSeconds - 4)).toBeLessThanOrEqual(0.3);
  expect(r.phone.framesOutsideCanvas).toBe(0);
  expect(r.phone.largestOffCentreShare).toBeLessThanOrEqual(0.1);
  expect(r.phone.widthCssPx[1]).toBeLessThanOrEqual(0.4 * 390);
  expect(r.phone.framesNotOpaque + r.phone.framesWithHole).toBe(0);
  expect(r.schedule).toMatchObject({ sameStarts: true, sameTravel: true });
  expect(r.printsAtZero.flat).toBe(r.printsAtZero.flying);
  expect(r.printsAtZero.zoom).toBe(1);
  expect(r.printsBeforeLift.flat).toBe(r.printsAtZero.flying);
  expect(r.end.sheetsInFrame).toBeGreaterThanOrEqual(3);
  expect(r.end.sheetsCrossingEdge).toBeGreaterThanOrEqual(1);
  expect(r.end.labelsShown).toBeGreaterThanOrEqual(3);
  expect(r.end.labelOverlaps).toBe(0);
  expect(r.end.guidesPastFrameEdge).toBeGreaterThanOrEqual(1);
  expect(r.end.distance).toEqual({ cm: 47, visible: true });
  expect(r.end.columnsVisible).toBe(true);
  expect(r.end.phoneCentreAlphaAtStart).toBe(255);
  expect(Math.max(...r.end.cornerAlphaAtStart)).toBe(0);
  noPageErrors(page);
});
