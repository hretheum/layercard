// A12 — the way back. The sink reappears and pours the card back out: layers unspool from it bottom
// layer first, each one's outline goes as its rows come to rest, the bend relaxes, from 1.5 s the card
// is flat and the QR re-forms last. The joins are exact: the end of depart is the start of rebuild,
// the end of rebuild is idle frame zero. The start of depart (the card drawn through the eye, the well at
// zero) against the end of connect (the card drawn flat) is not one of the contract's exact frames; it has
// to be a seam nobody can see: no value more than 8/255 apart and a mean difference under 0.05/255. On a
// GPU (WebKit, Chromium on Metal) the two frames are identical; Chromium's software renderer rasterises
// the tessellated strips a hair differently from the flat sheets (largest difference 5/255, mean 0.008).
import { expect, test } from "@playwright/test";
import { noPageErrors, open, record } from "./util";

test("rebuild: the sink pours the card back out, bottom layer first, QR last; depart end = rebuild start; idle = depart start", async ({ page }) => {
  await open(page);
  const r = await page.evaluate(async () => {
    const H = window.H, D = H.durations();
    await H.mount({});
    const h = H.handle!, T = h.test!;
    T.setPaused(true);
    const N = 360;
    const backAt: Record<string, number> = {}, firstRow: Record<string, number> = {};
    let flatFrom = -1, qrFrom = -1, qrDone = -1, strongest = 0, strongAt = -1, ringFrames = 0, outlineUp = 0, lost = 0;
    const lastOutline: Record<string, number> = {};
    for (let i = 0; i <= N; i++) {
      const t = (D.rebuild * i) / N;
      T.seek("rebuild", t);
      const st = T.state() as any;
      if (flatFrom < 0 && !st.persp) flatFrom = t;
      if (st.well.a > strongest) { strongest = st.well.a; strongAt = t; }
      if (st.well.ringAlpha > 0.5) ringFrames++;
      for (const s of st.sheets) {
        if (s.qr) {
          if (qrFrom < 0 && s.on) qrFrom = t;
          if (qrDone < 0 && s.on && s.qT === 0) qrDone = t;
          continue;
        }
        if (Math.abs(s.host + s.air + s.level - 1) > 1e-9) lost++;
        // its first row is back behind the glass; every row is back at rest (the clock is past the neck)
        if (firstRow[s.id] === undefined && s.host > 0) firstRow[s.id] = t;
        if (backAt[s.id] === undefined && (!st.persp || s.tau <= -0.6)) backAt[s.id] = t;
        if (st.persp) {
          if (s.rsA > (lastOutline[s.id] ?? 1) + 1e-9) outlineUp++;
          lastOutline[s.id] = s.rsA;
        }
      }
    }
    const order = (m: Record<string, number>) => Object.entries(m).sort((a, b) => a[1] - b[1] || 0).map((e) => e[0]);
    // the joins
    T.seek("depart", 1e3);
    const departEnd = H.pixels();
    T.seek("rebuild", 0);
    const rebuildStart = H.pixels();
    T.seek("connect", 1e3);
    const connectEnd = H.pixels();
    T.seek("depart", 0);
    const departStart = H.pixels();
    T.seek("idle", 0);
    const idle = H.pixels();
    T.seek("rebuild", 1e3);
    const rebuildEnd = H.pixels();
    // with a viewer and with tilt the joins hold too
    h.setViewer!(new Float32Array([2.2, -1, 5.5]));
    h.setTilt(0.7, -0.4);
    T.seek("depart", 1e3);
    const a = H.pixels();
    T.seek("rebuild", 0);
    const b = H.pixels();
    return {
      firstRowBack: firstRow, everyRowAtRest: backAt, orderFirstRow: order(firstRow), orderAtRest: order(backAt),
      flatFrom, qrFrom, qrDone, strongest, strongestAt: strongAt, framesWithRing: ringFrames, outlineGrewBack: outlineUp, sharesNotOne: lost,
      departEndToRebuildStart: H.compare(departEnd, rebuildStart), connectEndToDepartStart: H.compare(connectEnd, departStart),
      rebuildEndToIdle: H.compare(rebuildEnd, idle), departEndToRebuildStartWithViewer: H.compare(a, b),
    };
  });
  record("rebuild", r);
  // bottom layer first
  expect(r.orderFirstRow).toEqual(["bg", "grid", "mark", "name", "role", "contact"]);
  expect(r.orderAtRest).toEqual(["bg", "grid", "mark", "name", "role", "contact"]);
  // every layer is back before the bend relaxes; flat from 1.5 s; the QR last, 1.3 to 1.8 s
  for (const t of Object.values(r.everyRowAtRest) as number[]) expect(t).toBeLessThanOrEqual(1.21);
  expect(r.flatFrom).toBeCloseTo(1.5, 2);
  expect(r.qrFrom).toBeGreaterThan(1.29);
  expect(r.qrFrom).toBeLessThan(1.32);
  expect(r.qrDone).toBeCloseTo(1.8, 2);
  // the sink is back at full strength in between
  expect(r.strongest).toBe(1);
  expect(r.framesWithRing).toBeGreaterThan(120);
  expect(r.outlineGrewBack).toBe(0);
  expect(r.sharesNotOne).toBe(0);
  expect(r.departEndToRebuildStart.max).toBe(0);
  expect(r.departEndToRebuildStartWithViewer.max).toBe(0);
  expect(r.connectEndToDepartStart.over8).toBe(0);
  expect(r.connectEndToDepartStart.mad).toBeLessThan(0.05);
  expect(r.rebuildEndToIdle.max).toBe(0);
  noPageErrors(page);
});
