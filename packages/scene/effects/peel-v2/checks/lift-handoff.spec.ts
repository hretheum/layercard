// B2, B3, B4 — one layer, one place.
// Host: a layer lifts in place. While it lifts in `depart`, no pixel changes outside its own rect
// (its tag is chrome and may sit just above a low outline); it never moves sideways, in `depart`
// and in `rebuild`. In `rebuild` several layers land at once and the bottom ones cover the whole
// card, so there the rule is checked on the sheet state, which is the same code path as `depart`.
// Hand-over: the host's print is gone before the guest's sheet is one sheet gap (0.11) above the glass.
// Guest, anchored: at lift start the sheet lies on the glass exactly on the layer's rect
// (projected corners within 1 CSS px), frontal and 35 degrees off axis, by state and by pixels.
import { expect, test } from "@playwright/test";
import { PEEL, SHADOW_HANDOVER, SWELL } from "../src/schedule";
import { ASPECT, FOV, INSET, noPageErrors, open, record } from "./util";

const ZGAP = 0.11;
const TAUS = [0.02, 0.05, 0.08, 0.11, 0.14, 0.17, 0.2, 0.23, 0.25, 0.28, 0.32, 0.36, 0.4, 0.44, 0.46, 0.55];

test("lift-handoff: host layers lift and land in place", async ({ page }) => {
  await open(page);
  const r = await page.evaluate(async ({ TAUS }) => {
    const H = window.H;
    await H.mount({});
    const h = H.handle!, T = h.test!;
    T.setPaused(true);
    const st = T.stats() as any, s0 = T.state() as any;
    const pr = st.pr, fit = st.fit as number[], W = st.buffer[0] as number, Hh = st.buffer[1] as number;
    const flying = (s0.sheets as any[]).filter((s) => !s.qr).sort((a, b) => a.k - b.k);
    const depart: Record<string, unknown>[] = [];
    let worstOutside = 0, moved = 0, maxSwell = 0;
    for (const tilt of [[0, 0], [0.8, -0.6]]) {
      h.setTilt(tilt[0], tilt[1]);
      for (const L of flying) {
        const t0 = s0.start[L.k];
        // the layer's own rect in device px, grown to whole pixels
        const [rx, ry, rw, rh] = L.rect as number[];
        const cardH = fit[3] / fit[2];
        const x0 = Math.floor(fit[0] + (rx - rw / 2 + 0.5) * fit[2] - 1e-3), x1 = Math.ceil(fit[0] + (rx + rw / 2 + 0.5) * fit[2] + 1e-3);
        const y0 = Math.floor(fit[1] + (cardH / 2 - ry - rh / 2) * fit[2] - 1e-3), y1 = Math.ceil(fit[1] + (cardH / 2 - ry + rh / 2) * fit[2] + 1e-3);
        const tg = L.tagRect as number[];
        const tx0 = Math.floor(tg[0]), ty0 = Math.floor(tg[1]), tx1 = Math.ceil(tg[0] + tg[2]), ty1 = Math.ceil(tg[1] + tg[3]);
        T.seek("depart", t0);
        const before = H.pixels();
        let outside = 0, inside = 0, inTag = 0;
        const perTau: number[] = [];
        for (const tau of TAUS) {
          T.seek("depart", t0 + tau);
          const now = H.pixels();
          let o = 0;
          for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
            const i = (y * W + x) * 4;
            if (now.data[i] === before.data[i] && now.data[i + 1] === before.data[i + 1] && now.data[i + 2] === before.data[i + 2] && now.data[i + 3] === before.data[i + 3]) continue;
            if (x >= x0 && x < x1 && y >= y0 && y < y1) inside++;
            else if (x >= tx0 && x < tx1 && y >= ty0 && y < ty1) inTag++;
            else o++;
          }
          outside += o;
          perTau.push(o);
          for (const s of (T.state() as any).sheets) {
            if (s.qr) continue;
            if (Math.abs(s.ox) > 1e-9 || Math.abs(s.oy) > 1e-9) moved++;
            if (s.sc > maxSwell) maxSwell = s.sc;
          }
        }
        if (outside > worstOutside) worstOutside = outside;
        depart.push({ id: L.id, tilt, rectPx: [x0, y0, x1, y1], changedInsideRect: inside, changedInTag: inTag, changedOutside: outside, outsideByTau: perTau });
      }
    }
    h.setTilt(0, 0);
    // rebuild: state of every sheet through the whole timeline
    let rMoved = 0, rSwell = 0, rFrames = 0, landedWithOutline = 0;
    for (let t = 0; t <= 1.2 + 1e-9; t += 0.01) {
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
    return { pixelRatio: pr, depart, worstOutside, sidewaysStatesInDepart: moved, maxSwellInDepart: maxSwell,
      rebuild: { frames: rFrames, sidewaysStates: rMoved, maxSwell: rSwell, landedWithOutline }, tagText: s0.tagText };
  }, { TAUS });
  record("lift-handoff-host", r);
  for (const d of r.depart as any[]) {
    expect(d.changedOutside, `${d.id}: pixels changed outside its rect`).toBe(0);
    expect(d.changedInsideRect, d.id).toBeGreaterThan(50);
  }
  expect(r.sidewaysStatesInDepart).toBe(0);
  expect(r.maxSwellInDepart).toBeGreaterThanOrEqual(1.03);
  expect(r.maxSwellInDepart).toBeLessThanOrEqual(1.04);
  expect(r.rebuild.sidewaysStates).toBe(0);
  expect(r.rebuild.maxSwell).toBeLessThanOrEqual(1 + SWELL + 1e-9);
  expect(r.rebuild.landedWithOutline).toBe(0);
  expect((r.tagText as string).length).toBeLessThanOrEqual(16);
  noPageErrors(page);
});

test("lift-handoff: the host print is gone before the guest sheet is one gap up; the sheet starts on the glass", async ({ page }) => {
  await open(page);
  const r = await page.evaluate(async ({ INSET, FOV, ASPECT, PEEL, END }) => {
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

    // guest, anchored: height of each sheet over its lift, and its corners at lift start
    const W = 390, Hh = 844, f = 1 / Math.tan((FOV * Math.PI) / 360);
    const views: Record<string, unknown> = {};
    let guestZ: number[][] = [];
    for (const [name, pose] of [["frontal", [0, 0, 5.6]], ["off-axis 35", [35, 0, 5.6]]] as const) {
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
      const z: number[][] = ids.map(() => []);
      const corners: Record<string, number> = {};
      let worst = 0;
      for (let k = 0; k < ids.length; k++) {
        for (const tau of taus) {
          T.seek("explode", start[k] + tau);
          z[k].push((T.state() as any).sheets.find((q: any) => q.id === ids[k]).z);
        }
        // lift start: the sheet's four corners against the layer's rect on the glass
        T.seek("explode", start[k] + 1e-4);
        const s = (T.state() as any).sheets.find((q: any) => q.id === ids[k]);
        const [rx, ry, rw, rh] = s.rect as number[];
        let d = 0;
        for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          const a = project(s.x + (sx * s.w) / 2, s.y + (sy * s.h) / 2, s.z), b = project(rx + (sx * rw) / 2, ry + (sy * rh) / 2, 0);
          d = Math.max(d, Math.hypot(a[0] - b[0], a[1] - b[1]));
        }
        corners[ids[k]] = +d.toFixed(4);
        worst = Math.max(worst, d);
      }
      // pixels: the first sheet alone, just opaque and still on the glass; its drawn extent against the projected rect
      T.seek("explode", start[0] + 0.08);
      const s = (T.state() as any).sheets.find((q: any) => q.id === ids[0]);
      const [rx, ry, rw, rh] = s.rect as number[];
      let ex0 = 1e9, ey0 = 1e9, ex1 = -1e9, ey1 = -1e9;
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const b = project(rx + (sx * rw) / 2, ry + (sy * rh) / 2, 0);
        ex0 = Math.min(ex0, b[0]); ey0 = Math.min(ey0, b[1]); ex1 = Math.max(ex1, b[0]); ey1 = Math.max(ey1, b[1]);
      }
      const px = H.pixels(), pr = px.width / W;
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (let y = 0; y < px.height; y++) for (let x = 0; x < px.width; x++) {
        if (px.data[(y * px.width + x) * 4 + 3] < 8) continue;
        if (x < x0) x0 = x; if (y < y0) y0 = y; if (x + 1 > x1) x1 = x + 1; if (y + 1 > y1) y1 = y + 1;
      }
      const drawn = [x0 / pr, y0 / pr, x1 / pr, y1 / pr], want = [ex0, ey0, ex1, ey1];
      views[name] = { cornerErrorCssPx: corners, worstCornerCssPx: +worst.toFixed(4), firstSheetDrawnBox: drawn.map((v) => +v.toFixed(2)), firstSheetProjectedRect: want.map((v) => +v.toFixed(2)),
        drawnBoxErrorCssPx: +Math.max(...drawn.map((v, i) => Math.abs(v - want[i]))).toFixed(3), sheetOpacityAt80ms: s.op };
      guestZ = z;
    }
    // hand-over per layer: when the print is gone, when the sheet is one gap up
    const GAP = 0.11;
    const layers = ids.map((id, k) => {
      const gone = taus.find((_, i) => hostOp[k][i] === 0 && i > 0);
      const gapUp = taus.find((_, i) => guestZ[k][i] >= GAP);
      let both = 0;
      for (let i = 0; i < taus.length; i++) if (guestZ[k][i] >= GAP && hostOp[k][i] > 0) both++;
      const iPeel = taus.findIndex((t) => t >= PEEL);
      return { id, printGoneAt: gone ?? null, sheetOneGapUpAt: gapUp ?? null, sheetHeightWhenPrintGone: +guestZ[k][iPeel].toFixed(4), framesWithPrintAndSheetAGapUp: both };
    });
    return { samplesPerLayer: taus.length, layers, views };
  }, { INSET, FOV, ASPECT, PEEL, END: PEEL + SHADOW_HANDOVER + 0.6 });
  record("lift-handoff", r);
  for (const l of r.layers) {
    expect(l.framesWithPrintAndSheetAGapUp, `${l.id}: print still shown with the sheet a gap up`).toBe(0);
    expect(l.printGoneAt, l.id).not.toBeNull();
    expect(l.printGoneAt!, l.id).toBeLessThanOrEqual(PEEL + 1e-9);
    expect(l.sheetHeightWhenPrintGone, l.id).toBeLessThan(ZGAP);
  }
  for (const [name, v] of Object.entries(r.views) as [string, any][]) {
    expect(v.worstCornerCssPx, `${name}: sheet corners at lift start`).toBeLessThanOrEqual(1);
    expect(v.drawnBoxErrorCssPx, `${name}: drawn sheet against the projected rect`).toBeLessThanOrEqual(1.5);
    expect(v.sheetOpacityAt80ms, name).toBe(1);
  }
  noPageErrors(page);
});
