// A8 — the glass splits a strip between the two phones.
//  1. Both devices hold every layer's clock and shares identically at every sampled moment.
//  2. In test colours (green = how far along the ribbon path, 5.5 % = the glass) the host canvas never
//     shows a pixel past the glass and the anchored guest never one before it.
//  3. The anchored guest draws nothing at all before the first row crosses the glass.
//  4. Through the stand-in camera the ribbon starts at the sink: the first pixels of a ribbon the
//     guest draws are within 2 CSS px of where the camera sees the centre of the ring the host draws.
import { expect, test } from "@playwright/test";
import { camPx, noPageErrors, openStage, record, type V3 } from "./util";

const POSES: [number, number, number][] = [[0, 0, 5.6], [20, 6, 5.6], [35, 0, 6.75], [-35, -20, 4.5]];

// two device pixels per CSS pixel: the ribbon is a few pixels wide where it leaves the glass
test.use({ deviceScaleFactor: 2 });

test("glass-seam: one clock on both devices, the host draws up to the glass, the guest from it, the ribbon starts at the sink", async ({ page }) => {
  test.setTimeout(600_000);
  await openStage(page, "quality=high");
  const r = await page.evaluate(async (POSES) => {
    const d = (window as any).demo;
    const D = d.durations();
    // 1. the states
    d.setPose(20, 6, 5.6);
    let samples = 0, statesDiffer = 0;
    for (let i = 0; i <= 310; i++) {
      const t = (D.explode * i) / 310;
      d.seek(["depart", t], ["explode", t]);
      const info = d.info(), hs = info.host.sheets, gs = info.guest.sheets;
      for (let k = 0; k < hs.length; k++) {
        if (hs[k].qr) continue;
        samples++;
        if (hs[k].tau !== gs[k].tau || hs[k].host !== gs[k].host || hs[k].air !== gs[k].air || hs[k].level !== gs[k].level) statesDiffer++;
      }
      if (info.host.well.a !== info.guest.well.a) statesDiffer++;
    }
    // first crossing: the top layer's first row reaches the glass
    d.seek(["depart", 0], ["explode", 0]);
    const g0 = d.info().guest, first = g0.start[0] + 0.6 + 1.5 * Math.pow(0.055, 1 / 1.2);
    const poses: Record<string, unknown> = {};
    for (const pose of POSES) {
      d.setPose(...pose);
      // 3. nothing before the first crossing
      let before = 0, framesBefore = 0;
      d.setProbe(false);
      d.setOnly(null);
      for (let i = 0; i <= 5; i++) {
        d.seek(["depart", (first - 0.02) * (i / 5)], ["explode", (first - 0.02) * (i / 5)]);
        const p = d.pixels("guest") as ImageData;
        framesBefore++;
        for (let j = 3; j < p.data.length; j += 4) if (p.data[j] !== 0) before++;
      }
      // 2. and 4. in test colours
      let hostPast = 0, guestBefore = 0, hostMax = 0, guestMin = 255, frames = 0;
      const starts: { t: number; id: string; ribbon: number[]; glass: number[]; pixels: number }[] = [];
      const rings: { t: number; host: number[]; glass: number[] }[] = [];
      for (let i = 0; i <= 14; i++) {
        const t = 0.9 + (6.2 * i) / 14;
        d.setProbe(true);
        d.setOnly("strips");
        d.seek(["depart", t], ["explode", t]);
        frames++;
        const info = d.info();
        let p = d.pixels("host") as ImageData;
        for (let j = 0; j < p.data.length; j += 4) {
          if (p.data[j + 3] !== 255) continue;
          const g = p.data[j + 1];
          if (g > hostMax) hostMax = g;
          // green 14 is the glass; the triangle that straddles it is interpolated, so a host pixel may read a little past it
          if (g > 24) hostPast++;
        }
        p = d.pixels("guest") as ImageData;
        for (let j = 0; j < p.data.length; j += 4) {
          if (p.data[j + 3] !== 255) continue;
          const g = p.data[j + 1];
          if (g < guestMin) guestMin = g;
          if (g < 13) guestBefore++;
        }
        // the ribbon whose rows are crossing the glass now: where its first stretch (up to 8.6 % of the path, 3 % past the glass) is drawn
        for (const s of info.guest.sheets) {
          if (s.qr || !(s.host > 0.1 && s.host < 0.9)) continue;
          d.setOnly("strips:" + s.id);
          p = d.pixels("guest") as ImageData;
          let sx = 0, sy = 0, sw = 0, n = 0;
          for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) {
            const o = (y * p.width + x) * 4, a = p.data[o + 3];
            if (a < 64 || p.data[o + 1] > 22) continue;
            sx += (x + 0.5) * a; sy += (y + 0.5) * a; sw += a; n++;
          }
          if (n >= 4) starts.push({ t, id: s.id, ribbon: [(sx / sw) * (390 / p.width), (sy / sw) * (844 / p.height)], glass: s.path.G, pixels: n });
        }
        // the ring as the host draws it: its centre on the host canvas, as a point of the glass (card units)
        d.setProbe(false);
        d.setOnly("ring");
        p = d.pixels("host") as ImageData;
        let rx = 0, ry = 0, rw = 0;
        for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) {
          const a = p.data[(y * p.width + x) * 4 + 3];
          rx += (x + 0.5) * a; ry += (y + 0.5) * a; rw += a;
        }
        if (rw > 0) rings.push({ t, host: [rx / rw / p.width - 0.5, (0.5 - ry / rw / p.height) * (p.height / p.width)], glass: info.host.sink.glass });
      }
      d.setProbe(false);
      d.setOnly(null);
      poses[pose.join(",")] = { pose: d.info().pose, framesBefore, guestPixelsBeforeAnyCrossing: before, frames, hostPixelsPastTheGlass: hostPast, guestPixelsBeforeTheGlass: guestBefore, hostLargestGreen: hostMax, guestSmallestGreen: guestMin, starts, rings };
    }
    return { samples, statesDiffer, firstCrossing: first, poses };
  }, POSES) as any;
  // through the stand-in camera: the ribbon's first pixels against the ring's centre as the host drew it
  let worstStart = 0, worstRing = 0, nStarts = 0;
  for (const v of Object.values(r.poses) as any[]) {
    for (const ring of v.rings) {
      const seen = camPx(v.pose, [ring.host[0], ring.host[1], 0] as V3), want = camPx(v.pose, [ring.glass[0], ring.glass[1], 0] as V3);
      worstRing = Math.max(worstRing, Math.hypot(seen[0] - want[0], seen[1] - want[1]));
    }
    for (const s of v.starts) {
      const ring = v.rings.find((q: any) => q.t === s.t);
      if (!ring) continue;
      const seen = camPx(v.pose, [ring.host[0], ring.host[1], 0] as V3);
      const e = Math.hypot(s.ribbon[0] - seen[0], s.ribbon[1] - seen[1]);
      s.fromRingCssPx = +e.toFixed(3);
      worstStart = Math.max(worstStart, e);
      nStarts++;
    }
    delete v.pose;
  }
  record("glass-seam", { ...r, ribbonStartsMeasured: nStarts, worstRibbonStartFromRingCssPx: +worstStart.toFixed(3), worstRingInCameraCssPx: +worstRing.toFixed(3) });
  expect(r.samples).toBeGreaterThan(1500);
  expect(r.statesDiffer).toBe(0);
  for (const [name, v] of Object.entries(r.poses) as [string, any][]) {
    expect(v.guestPixelsBeforeAnyCrossing, name).toBe(0);
    expect(v.hostPixelsPastTheGlass, name).toBe(0);
    expect(v.guestPixelsBeforeTheGlass, name).toBe(0);
  }
  expect(nStarts).toBeGreaterThanOrEqual(8);
  expect(worstRing).toBeLessThanOrEqual(1);
  expect(worstStart).toBeLessThanOrEqual(2);
  noPageErrors(page);
});
