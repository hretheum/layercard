// A5, A6 — one layer, one place.
// Host: the canvas has zoomed out before the first layer lifts; a layer lifts in place on the small
// artboard. While it lifts in `depart`, no pixel changes outside the rects of the layers that are
// lifting at that moment (and the artboard's tag, which is chrome); a layer never moves sideways, in
// `depart` and in `rebuild`. At the end of `depart` no print is left: outlines only.
// Hand-over: the host's print is gone before the guest's sheet is one sheet gap (0.11) off the glass.
// Guest, anchored: at lift start the sheet lies on the glass exactly on the host's zoomed print
// (projected corners within 1 CSS px), frontal and 35 degrees off axis, by state and by pixels.
import { expect, test } from "@playwright/test";
import { LIFT_START, PEEL, SHADOW_HANDOVER, SWELL, ZOOM } from "../src/schedule";
import { ASPECT, FOV, INSET, noPageErrors, open, record } from "./util";

const ZGAP = 0.11;
const TAUS = [0.02, 0.05, 0.08, 0.11, 0.14, 0.17, 0.2, 0.23, 0.25, 0.28, 0.32, 0.36, 0.4, 0.44, 0.46, 0.55];

test("lift-handoff: host layers lift and land in place on the zoomed-out canvas", async ({ page }) => {
  await open(page);
  const r = await page.evaluate(async ({ TAUS, LIFE, ZOOM }) => {
    const H = window.H;
    await H.mount({});
    const h = H.handle!, T = h.test!;
    T.setPaused(true);
    const st = T.stats() as any, s0 = T.state() as any;
    const fit = st.fit as number[], W = st.buffer[0] as number, Hh = st.buffer[1] as number;
    const flying = (s0.sheets as any[]).filter((s) => !s.qr).sort((a, b) => a.k - b.k);
    const start = s0.start as number[];
    const cx = fit[0] + fit[2] / 2, cy = fit[1] + fit[3] / 2;
    // a layer's rect on the zoomed-out canvas, in device px, grown to whole pixels
    const box = (L: any): number[] => {
      const [rx, ry, rw, rh] = L.rect as number[], z = ZOOM * fit[2];
      return [Math.floor(cx + (rx - rw / 2) * z - 1e-3), Math.floor(cy - (ry + rh / 2) * z - 1e-3), Math.ceil(cx + (rx + rw / 2) * z + 1e-3), Math.ceil(cy - (ry - rh / 2) * z + 1e-3)];
    };
    const depart: Record<string, unknown>[] = [];
    let moved = 0, maxSwell = 0, zoomWrong = 0;
    for (const tilt of [[0, 0], [0.8, -0.6]]) {
      h.setTilt(tilt[0], tilt[1]);
      for (const L of flying) {
        const t0 = start[L.k], own = box(L);
        T.seek("depart", t0);
        const before = H.pixels(), tg = ((T.state() as any).tag.rect as number[]);
        const tag = [Math.floor(tg[0]), Math.floor(tg[1]), Math.ceil(tg[0] + tg[2]), Math.ceil(tg[1] + tg[3])];
        let outside = 0, inside = 0, inTag = 0, inOthers = 0;
        const perTau: number[] = [];
        for (const tau of TAUS) {
          const t = t0 + tau;
          T.seek("depart", t);
          const now = H.pixels(), state = T.state() as any;
          if (Math.abs(state.zoom - ZOOM) > 1e-9) zoomWrong++;
          // the other layers that are lifting at this moment (their starts are closer together than a lift is long)
          const others = flying.filter((o) => o !== L && t - start[o.k] > 0 && t0 - start[o.k] < LIFE).map(box);
          let o = 0;
          for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
            const i = (y * W + x) * 4;
            if (now.data[i] === before.data[i] && now.data[i + 1] === before.data[i + 1] && now.data[i + 2] === before.data[i + 2] && now.data[i + 3] === before.data[i + 3]) continue;
            if (x >= own[0] && x < own[2] && y >= own[1] && y < own[3]) inside++;
            else if (x >= tag[0] && x < tag[2] && y >= tag[1] && y < tag[3]) inTag++;
            else if (others.some((b) => x >= b[0] && x < b[2] && y >= b[1] && y < b[3])) inOthers++;
            else o++;
          }
          outside += o;
          perTau.push(o);
          for (const s of state.sheets) {
            if (s.qr) continue;
            if (Math.abs(s.ox) > 1e-9 || Math.abs(s.oy) > 1e-9) moved++;
            if (s.sc > maxSwell) maxSwell = s.sc;
          }
        }
        depart.push({ id: L.id, tilt, rectPx: own, changedInsideRect: inside, changedInTag: inTag, changedInOtherLiftingRects: inOthers, changedOutside: outside, outsideByTau: perTau });
      }
    }
    h.setTilt(0, 0);
    // the end of depart: the artboard is empty — no print, every outline whole, the canvas grid drawn
    T.seek("depart", 1e3);
    const endState = T.state() as any;
    const end = {
      zoom: endState.zoom, printsLeft: (endState.sheets as any[]).filter((s) => s.on && s.op > 0).length,
      outlines: (endState.sheets as any[]).filter((s) => !s.qr && s.fr === 1 && s.frA === 1).length, flying: flying.length,
      gridAlpha: endState.cols.alpha, gridVisible: endState.cols.visible, columnsFound: endState.cols.found, tagAlpha: endState.tag.alpha,
    };
    // rebuild: state of every sheet through the whole timeline
    let rMoved = 0, rSwell = 0, rFrames = 0, landedWithOutline = 0;
    for (let t = 0; t <= 1.8 + 1e-9; t += 0.01) {
      T.seek("rebuild", t);
      rFrames++;
      for (const s of (T.state() as any).sheets) {
        if (s.qr) continue;
        if (Math.abs(s.ox) > 1e-9 || Math.abs(s.oy) > 1e-9) rMoved++;
        if (s.sc > rSwell) rSwell = s.sc;
        // "its outline clears as it lands": a layer back at full opacity and rest size has no outline left
        if (s.on && s.op === 1 && s.sc === 1 && s.fr > 0) landedWithOutline++;
      }
    }
    return { pixelRatio: st.pr, zoom: ZOOM, depart, sidewaysStatesInDepart: moved, maxSwellInDepart: maxSwell, framesWithAnotherZoom: zoomWrong, end,
      rebuild: { frames: rFrames, sidewaysStates: rMoved, maxSwell: rSwell, landedWithOutline }, tagText: s0.tagText };
  }, { TAUS, LIFE: PEEL + SHADOW_HANDOVER, ZOOM });
  record("lift-handoff-host", r);
  for (const d of r.depart as any[]) {
    expect(d.changedOutside, `${d.id}: pixels changed outside the lifting layers' rects`).toBe(0);
    expect(d.changedInsideRect, d.id).toBeGreaterThan(20);
  }
  expect(r.framesWithAnotherZoom).toBe(0);
  expect(r.sidewaysStatesInDepart).toBe(0);
  expect(r.maxSwellInDepart).toBeGreaterThanOrEqual(1.03);
  expect(r.maxSwellInDepart).toBeLessThanOrEqual(1.04);
  expect(r.end.zoom).toBeCloseTo(ZOOM, 9);
  expect(r.end.printsLeft).toBe(0);
  expect(r.end.outlines).toBe(r.end.flying);
  expect(r.end.gridVisible && r.end.gridAlpha === 1 && r.end.columnsFound).toBe(true);
  expect(r.rebuild.sidewaysStates).toBe(0);
  expect(r.rebuild.maxSwell).toBeLessThanOrEqual(1 + SWELL + 1e-9);
  expect(r.rebuild.landedWithOutline).toBe(0);
  expect((r.tagText as string).length).toBeLessThanOrEqual(16);
  noPageErrors(page);
});

test("lift-handoff: the host print is gone before the guest sheet is one gap off the glass; the sheet starts on the host's print", async ({ page }) => {
  await open(page);
  const r = await page.evaluate(async ({ INSET, FOV, ASPECT, PEEL, END, ZOOM, LIFT_START }) => {
    const H = window.H;
    const taus: number[] = [];
    for (let tau = 0; tau <= END + 1e-9; tau += 0.01) taus.push(+tau.toFixed(3));

    // host: opacity of each print over its lift
    await H.mount({});
    let T = H.handle!.test!;
    T.setPaused(true);
    const start = (T.state() as any).start as number[];
    const ids = ((T.state() as any).sheets as any[]).filter((s) => !s.qr).sort((a, b) => a.k - b.k).map((s) => s.id as string);
    const hostOp: number[][] = ids.map(() => []);
    for (let k = 0; k < ids.length; k++) for (const tau of taus) {
      T.seek("depart", start[k] + tau);
      const s = (T.state() as any).sheets.find((q: any) => q.id === ids[k]);
      hostOp[k].push(s.on ? s.op : 0);
    }
    T.seek("depart", LIFT_START);
    const hostZoomAtFirstLift = (T.state() as any).zoom as number;

    // guest, anchored: distance of each sheet from the glass over its lift, and its corners at lift start
    const W = 390, Hh = 844, f = 1 / Math.tan((FOV * Math.PI) / 360);
    const views: Record<string, unknown> = {};
    let guestZ: number[][] = [];
    for (const [name, pose] of [["frontal", [0, 0, 6.7]], ["off-axis 35", [35, 0, 6.7]], ["30 cm, -20 / 15", [-20, 15, 4.29]]] as const) {
      await H.mount({ role: "guest", assembleRect: INSET });
      const h = H.handle!;
      T = h.test!;
      T.setPaused(true);
      h.setProjection(FOV, ASPECT);
      const M = T.fakePose(pose[0], pose[1], pose[2]);
      h.setPose(M);
      const project = (x: number, y: number, z: number): [number, number] => {
        const cx = M[0] * x + M[4] * y + M[8] * z + M[12], cy = M[1] * x + M[5] * y + M[9] * z + M[13], cz = M[2] * x + M[6] * y + M[10] * z + M[14];
        return [(((cx * f) / ASPECT / -cz) * 0.5 + 0.5) * W, (0.5 - ((cy * f) / -cz) * 0.5) * Hh];
      };
      const camPx = (c: number[], k: number): [number, number] =>
        [(((c[k * 3] * f) / ASPECT / -c[k * 3 + 2]) * 0.5 + 0.5) * W, (0.5 - ((c[k * 3 + 1] * f) / -c[k * 3 + 2]) * 0.5) * Hh];
      const z: number[][] = ids.map(() => []);
      const corners: Record<string, number> = {};
      let worst = 0;
      for (let k = 0; k < ids.length; k++) {
        for (const tau of taus) {
          T.seek("explode", start[k] + tau);
          const q = (T.state() as any).sheets.find((s: any) => s.id === ids[k]);
          // before its lift the sheet is not drawn: the layer is the host's print, on the glass
          z[k].push(q.on ? Math.abs(q.cz) : 0);
        }
        // lift start: the sheet's four corners against the layer's rect on the host's zoomed-out artboard
        T.seek("explode", start[k] + 1e-4);
        const s = (T.state() as any).sheets.find((q: any) => q.id === ids[k]);
        const [rx, ry, rw, rh] = s.rect as number[];
        let d = 0;
        [[-1, 1], [1, 1], [1, -1], [-1, -1]].forEach(([sx, sy], c) => {
          const a = camPx(s.corners, c), b = project(ZOOM * (rx + (sx * rw) / 2), ZOOM * (ry + (sy * rh) / 2), 0);
          d = Math.max(d, Math.hypot(a[0] - b[0], a[1] - b[1]));
        });
        corners[ids[k]] = +d.toFixed(4);
        worst = Math.max(worst, d);
      }
      // pixels: the first sheet alone, just opaque and still on the glass; its drawn extent against the projected print
      T.seek("explode", start[0] + 0.08);
      const s = (T.state() as any).sheets.find((q: any) => q.id === ids[0]);
      const [rx, ry, rw, rh] = s.rect as number[];
      let ex0 = 1e9, ey0 = 1e9, ex1 = -1e9, ey1 = -1e9;
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const b = project(ZOOM * (rx + (sx * rw) / 2), ZOOM * (ry + (sy * rh) / 2), 0);
        ex0 = Math.min(ex0, b[0]); ey0 = Math.min(ey0, b[1]); ex1 = Math.max(ex1, b[0]); ey1 = Math.max(ey1, b[1]);
      }
      const px = H.pixels(), pr = px.width / W;
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (let y = 0; y < px.height; y++) for (let x = 0; x < px.width; x++) {
        if (px.data[(y * px.width + x) * 4 + 3] < 8) continue;
        if (x < x0) x0 = x; if (y < y0) y0 = y; if (x + 1 > x1) x1 = x + 1; if (y + 1 > y1) y1 = y + 1;
      }
      const drawn = [x0 / pr, y0 / pr, x1 / pr, y1 / pr], want = [ex0, ey0, ex1, ey1];
      views[name] = { cornerErrorCssPx: corners, worstCornerCssPx: +worst.toFixed(4), firstSheet: ids[0], firstSheetDrawnBox: drawn.map((v) => +v.toFixed(2)), firstSheetProjectedPrint: want.map((v) => +v.toFixed(2)),
        drawnBoxErrorCssPx: +Math.max(...drawn.map((v, i) => Math.abs(v - want[i]))).toFixed(3), sheetOpacityAt80ms: s.op };
      guestZ = z;
    }
    // hand-over per layer: when the print is gone, when the sheet is one gap off the glass
    const GAP = 0.11;
    const layers = ids.map((id, k) => {
      const gone = taus.find((_, i) => hostOp[k][i] === 0 && i > 0);
      const gapUp = taus.find((_, i) => guestZ[k][i] >= GAP);
      let both = 0;
      for (let i = 0; i < taus.length; i++) if (guestZ[k][i] >= GAP && hostOp[k][i] > 0) both++;
      const iPeel = taus.findIndex((t) => t >= PEEL);
      return { id, printGoneAt: gone ?? null, sheetOneGapOffAt: gapUp ?? null, sheetDistanceWhenPrintGone: +guestZ[k][iPeel].toFixed(4), framesWithPrintAndSheetAGapOff: both };
    });
    return { samplesPerLayer: taus.length, hostZoomAtFirstLift, layers, views };
  }, { INSET, FOV, ASPECT, PEEL, END: PEEL + SHADOW_HANDOVER + 0.6, ZOOM, LIFT_START });
  record("lift-handoff", r);
  expect(r.hostZoomAtFirstLift).toBeCloseTo(ZOOM, 9);
  for (const l of r.layers) {
    expect(l.framesWithPrintAndSheetAGapOff, `${l.id}: print still shown with the sheet a gap off the glass`).toBe(0);
    expect(l.printGoneAt, l.id).not.toBeNull();
    expect(l.printGoneAt!, l.id).toBeLessThanOrEqual(PEEL + 1e-9);
    expect(l.sheetDistanceWhenPrintGone, l.id).toBeLessThan(ZGAP);
  }
  for (const [name, v] of Object.entries(r.views) as [string, any][]) {
    expect(v.worstCornerCssPx, `${name}: sheet corners at lift start`).toBeLessThanOrEqual(1);
    expect(v.drawnBoxErrorCssPx, `${name}: drawn sheet against the projected print`).toBeLessThanOrEqual(1.5);
    expect(v.sheetOpacityAt80ms, name).toBeGreaterThan(0.999);
  }
  noPageErrors(page);
});
