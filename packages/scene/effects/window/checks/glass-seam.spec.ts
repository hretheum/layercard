// A8, A9 — the glass. A sheet that is crossing it is split along one line: the host draws what is
// behind, the guest what is in front, and in the stand-in camera the two halves meet. One layer is
// never whole on both phones, and each crossing takes about a quarter of a second.
import { expect, test, type Page } from "@playwright/test";
import { camPx, noPageErrors, open, openStage, record, type V3 } from "./util";

const THICK = 0.012, APPROACH = 0.5, CROSS = 0.25;

test("glass-seam: every layer is on one side or split by the glass, never whole on both; crossings of about 0.25 s", async ({ page }) => {
  test.setTimeout(300_000);
  await open(page);
  const r = await page.evaluate(async () => {
    const H = window.H, stage = document.getElementById("stage")!;
    // only the state is read here: small canvases keep the 1500 frames quick
    await H.mount({ w: 195, h: 422, quality: "low" });
    const host = H.handle!;
    // a second canvas for the guest, mounted from the same source build
    const c2 = document.createElement("canvas");
    c2.style.cssText = "position:absolute;left:400px;top:0;width:195px;height:422px";
    stage.appendChild(c2);
    const src = await import("/src/index.ts" as string);
    const guest = await src.mount(c2, { role: "guest", layers: H.manifest!, baseUrl: H.base, quality: "low", reduced: false, test: true });
    host.test!.setPaused(true);
    guest.test.setPaused(true);
    guest.setProjection(62, 390 / 844);
    guest.setPose(guest.test.fakePose(-20, 10, 5.6));
    const dur = H.durations().depart, dt = 0.005;
    // lowest and highest point of a sheet's slab: the tilt turns it about its centre
    const span = (s: any): [number, number] => {
      const reach = 0.5 * (s.axis === 0 ? s.h : s.w) * Math.sin(s.tilt), thick = 0.012 * s.acr * Math.cos(s.tilt);
      return [s.z - reach - thick, s.z + reach];
    };
    const per: Record<string, { first: number; last: number; wholeOnBoth: number; nowhere: number; differs: number; hostAfter: number; guestBefore: number }> = {};
    for (let i = 0; i * dt <= dur; i++) {
      const t = i * dt;
      host.test!.seek("depart", t);
      guest.test.seek("explode", t);
      const hs = (host.test!.state() as any).sheets, gs = (guest.test.state() as any).sheets;
      for (let k = 0; k < hs.length; k++) {
        const a = hs[k], b = gs[k];
        if (a.qr) continue;
        const p = (per[a.id] ??= { first: -1, last: -1, wholeOnBoth: 0, nowhere: 0, differs: 0, hostAfter: 0, guestBefore: 0 });
        const [lo, hi] = span(a);
        const crossing = lo < 0 && hi > 0, behind = hi <= 0, front = lo > 0;
        if (crossing) { if (p.first < 0) p.first = t; p.last = t; }
        // the host draws the part with z < 0, the guest the part with z > 0
        // (a sheet lying exactly on the glass, as at the start, is the host's)
        const hostDraws = a.on && a.op > 0 && lo <= 0, guestDraws = b.on && b.op > 0 && hi > 0;
        if (hostDraws && guestDraws && !crossing) p.wholeOnBoth++;
        if (!hostDraws && !guestDraws) p.nowhere++;
        if (front && hostDraws) p.hostAfter++;
        if (behind && guestDraws) p.guestBefore++;
        // one layer, one place: both devices hold it at the same depth, tilt and offset
        if (b.on && (a.z !== b.z || a.tilt !== b.tilt || a.x !== b.x || a.y !== b.y || a.acr !== b.acr)) p.differs++;
      }
    }
    const end = (guest.test.state() as any).sheets.filter((s: any) => !s.qr).map((s: any) => ({ id: s.id, j: s.j, z: s.z, oy: s.oy, tilt: s.tilt }));
    guest.dispose();
    c2.remove();
    return { samples: Math.floor(dur / dt) + 1, stepMs: dt * 1000, per, end, start: (host.test!.state() as any).start };
  });
  const layers: Record<string, unknown> = {};
  for (const [id, p] of Object.entries(r.per)) {
    const crossingMs = Math.round((p.last - p.first) * 1000 + r.stepMs);
    layers[id] = { crossingFrom: +p.first.toFixed(3), crossingMs, wholeOnBoth: p.wholeOnBoth, drawnNowhere: p.nowhere, hostDrawsInFront: p.hostAfter, guestDrawsBehind: p.guestBefore, statesDiffer: p.differs };
    expect(p.first, id).toBeGreaterThan(0);
    // the print crosses in 0.25 s; the slab under it is 0.012 thick and follows within 35 ms
    expect(crossingMs, `${id}: crossing`).toBeGreaterThanOrEqual(200);
    expect(crossingMs, `${id}: crossing`).toBeLessThanOrEqual(300);
    expect(p.wholeOnBoth, `${id}: whole on both phones`).toBe(0);
    expect(p.nowhere, `${id}: on neither phone`).toBe(0);
    expect(p.hostAfter, `${id}: host draws it in front of the glass`).toBe(0);
    expect(p.guestBefore, `${id}: guest draws it behind the glass`).toBe(0);
    expect(p.differs, `${id}: host and guest disagree about where it is`).toBe(0);
  }
  // the stack the guest ends with is peel's: 0.08 above the glass, 0.11 apart, 0.012 thick, 0.035 card heights of stair
  for (const s of r.end) {
    expect(s.z).toBeCloseTo(0.08 + 0.11 * s.j + 0.012, 9);
    expect(s.oy).toBeCloseTo(0.035 * (2532 / 1170) * s.j, 9);
    expect(s.tilt).toBe(0);
  }
  record("glass-seam", { samples: r.samples, stepMs: r.stepMs, layers });
  noPageErrors(page);
});

type Probe = { ok: boolean; pos: number; lo: number; hi: number };

/** In the page: where along a scan line a channel passes half way between its two ends (sub-pixel), going from a to b. */
async function probes(page: Page, id: "host" | "cam" | "guest", channel: "lum" | "alpha", lines: number[][]): Promise<Probe[]> {
  return page.evaluate(({ id, channel, lines }) => {
    const im: ImageData = (window as any).demo.pixels(id), w = im.width, h = im.height, d = im.data, k = w / 390;
    const val = (x: number, y: number): number => {
      const sample = (ix: number, iy: number): number => {
        if (ix < 0 || iy < 0 || ix >= w || iy >= h) return 0;
        const i = (iy * w + ix) * 4;
        return channel === "alpha" ? d[i + 3] : (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) * (d[i + 3] / 255);
      };
      // pixel centres are at half-integers
      const fx = x * k - 0.5, fy = y * k - 0.5, x0 = Math.floor(fx), y0 = Math.floor(fy), ax = fx - x0, ay = fy - y0;
      return sample(x0, y0) * (1 - ax) * (1 - ay) + sample(x0 + 1, y0) * ax * (1 - ay) + sample(x0, y0 + 1) * (1 - ax) * ay + sample(x0 + 1, y0 + 1) * ax * ay;
    };
    return lines.map(([ax, ay, bx, by]) => {
      const len = Math.hypot(bx - ax, by - ay), n = Math.max(2, Math.round(len / 0.125)), v: number[] = [];
      for (let i = 0; i <= n; i++) v.push(val(ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n));
      const m = Math.max(1, Math.round(n * 0.15));
      const lo = v.slice(0, m).reduce((s, q) => s + q, 0) / m, hi = v.slice(-m).reduce((s, q) => s + q, 0) / m;
      let pos = -1;
      if (channel === "alpha") {
        // where the picture ends: a sheet is faint between its glyphs, so the edge is taken at half of its faintest
        // level, at the last place the scan leaves it
        const body = v.slice(0, Math.round(n * 0.3)).reduce((s, q) => Math.min(s, q), 255), half = Math.max(3, body / 2);
        for (let i = n; i >= 1; i--) {
          if (v[i - 1] >= half && v[i] < half) { pos = ((i - 1 + (v[i - 1] - half) / (v[i - 1] - v[i])) / n) * len; break; }
        }
        return { ok: pos >= 0 && body > 6 && hi < 3, pos, lo, hi };
      }
      const half = (lo + hi) / 2;
      for (let i = 1; i <= n; i++) {
        if ((v[i - 1] - half) * (v[i] - half) <= 0 && v[i] !== v[i - 1]) { pos = ((i - 1 + (half - v[i - 1]) / (v[i] - v[i - 1])) / n) * len; break; }
      }
      return { ok: pos >= 0 && Math.abs(hi - lo) > 12, pos, lo, hi };
    });
  }, { id, channel, lines });
}

test("glass-seam: the halves of a crossing sheet meet within 1 CSS px in the stand-in camera", async ({ page }) => {
  test.setTimeout(240_000);
  const rows: any[] = [];
  let worstGuest = 0, worstHost = 0, worstCam = 0, worstGap = 0, strays = 0, measured = 0;
  // two cards of one sheet each over the background: a tall sheet (it tips about its horizontal axis and the cut
  // sweeps down it) and a wide one (the cut sweeps across it)
  for (const set of [{ layers: "bg,qr", id: "bg", poses: [[0, 0, 5.6], [0, 14, 6.75], [-12, 0, 4.5], [0, -12, 6.75], [10, 5, 5.6], [30, 0, 5.6], [-25, 20, 4.5]] }, { layers: "bg,contact,qr", id: "contact", poses: [[0, 0, 4.5], [-25, 8, 3.6], [30, -10, 4.5]] }]) {
    await openStage(page, `quality=test&layers=${set.layers}`);
    for (const pose of set.poses) for (const f of [0.2, 0.4, 0.6, 0.8]) {
      const st = await page.evaluate(({ pose, f, id, APPROACH, CROSS }) => {
        const d = (window as any).demo;
        d.setViewer(true);
        d.setDirect(false);
        d.setPose(pose[0], pose[1], pose[2]);
        const info0 = d.info(), s0 = info0.host.sheets.find((s: any) => s.id === id);
        const t = info0.host.start[s0.k] + APPROACH + f * CROSS;
        d.seek(["depart", t], ["explode", t]);
        const info = d.info();
        return { t, pose: info.pose, eye: info.eye, H: info.card.h / info.card.w, fit: info.hostStats.fit.map((v: number) => v / info.hostStats.pr),
          h: info.host.sheets.find((s: any) => s.id === id), g: info.guest.sheets.find((s: any) => s.id === id), others: info.guest.sheets.filter((s: any) => s.on && s.id !== id).length };
      }, { pose, f, id: set.id, APPROACH, CROSS });
      const s = st.h, H: number = st.H, sin = Math.sin(s.tilt), cos = Math.cos(s.tilt), zt = THICK * s.acr;
      expect(st.others, "only the sheet under test is in front of the glass").toBe(0);
      expect(sin).toBeGreaterThan(0);
      // where the glass cuts the sheet's print (its top face; the underside faces away and is not drawn), as an offset along the tipping direction
      const top = -s.z / sin;
      void zt;
      const along = (q: number, v: number, lift: number): V3 => (s.axis === 0 ? [s.x + q, s.y + v * cos + lift, 0] : [s.x + v * cos + lift, s.y + q, 0]);
      const size = s.axis === 0 ? s.w : s.h;
      const row: any = { sheet: set.id, pose, fraction: f, t: +st.t.toFixed(3), tiltDeg: +((s.tilt * 180) / Math.PI).toFixed(2), guest: [], host: [], cam: [], gap: [] };
      const lines: { g: number[]; hostLine: number[] | null; camLine: number[] | null }[] = [];
      for (const q of [-0.36, -0.18, 0, 0.18, 0.36]) {
        const pt = along(q * size, top, 0);
        // camera: the cut of the print, and a scan across it from the front side (the leading side) to the side still behind
        const c = camPx(st.pose, pt), ahead = camPx(st.pose, along(q * size, top + 0.05, 0));
        const dir = [ahead[0] - c[0], ahead[1] - c[1]], dl = Math.hypot(dir[0], dir[1]);
        const n = [dir[0] / dl, dir[1] / dl], R = 5;
        const g = [c[0] + n[0] * R, c[1] + n[1] * R, c[0] - n[0] * R, c[1] - n[1] * R];
        // host screen: the same cut; what is seen just in front of it must be the lit panel for the scan to find an edge
        const hx = st.fit[0] + (pt[0] + 0.5) * st.fit[2], hy = st.fit[1] + (H / 2 - pt[1]) * st.fit[2];
        const hd = s.axis === 0 ? [0, -1] : [1, 0]; // towards the leading side on the screen (up, or right)
        let panel = set.id === "bg";
        for (const off of [0.01, 0.06]) {
          const gp: V3 = s.axis === 0 ? [pt[0], pt[1] + off, 0] : [pt[0] + off, pt[1], 0];
          const kk = (st.eye[2] + 3) / st.eye[2], bx = st.eye[0] + (gp[0] - st.eye[0]) * kk, by = st.eye[1] + (gp[1] - st.eye[1]) * kk;
          if (Math.abs(bx) > 0.44 || Math.abs(by) > H / 2 - 0.08) panel = false;
        }
        lines.push({
          g,
          hostLine: panel ? [hx - hd[0] * 6, hy - hd[1] * 6, hx + hd[0] * 6, hy + hd[1] * 6] : null,
          camLine: panel ? [c[0] - n[0] * R, c[1] - n[1] * R, c[0] + n[0] * R, c[1] + n[1] * R] : null,
        });
      }
      const pg = await probes(page, "guest", "alpha", lines.map((l) => l.g));
      const hostLines = lines.filter((l) => l.hostLine), ph = await probes(page, "host", "lum", hostLines.map((l) => l.hostLine!)), pc = await probes(page, "cam", "lum", hostLines.map((l) => l.camLine!));
      pg.forEach((p) => {
        // the guest's edge: the scan starts 5 px in front of the cut, so the edge should be found 5 px along it
        expect(p.ok, `${set.id} ${pose} f=${f}: the guest draws the front part`).toBe(true);
        const e = p.pos - 5;
        row.guest.push(+e.toFixed(2));
        worstGuest = Math.max(worstGuest, Math.abs(e));
        measured++;
      });
      ph.forEach((p, i) => {
        if (!p.ok) return;
        const e = p.pos - 6, ec = pc[i].ok ? pc[i].pos - 5 : null;
        row.host.push(+e.toFixed(2));
        worstHost = Math.max(worstHost, Math.abs(e));
        if (ec !== null) {
          row.cam.push(+ec.toFixed(2));
          worstCam = Math.max(worstCam, Math.abs(ec));
        }
      });
      // the gap between the halves as the camera sees them: both edges measured along the same scan across the cut,
      // the guest's on its own canvas, the host's on the camera's picture of the screen
      hostLines.forEach((l, i) => {
        if (!pc[i].ok) return;
        const k = lines.indexOf(l);
        // positions along the leading direction, relative to the cut: where the guest's part ends, where the host's part ends
        const guestEdge = -(pg[k].pos - 5), hostEdge = pc[i].pos - 5;
        const gap = guestEdge - hostEdge; // > 0: a sliver between the halves; < 0: they overlap
        row.gap.push(+gap.toFixed(2));
        worstGap = Math.max(worstGap, Math.abs(gap));
      });
      // nothing of the guest's picture lies behind the cut
      const stray = await page.evaluate(({ a, b, c }) => {
        const im: ImageData = (window as any).demo.pixels("guest"), w = im.width, k = w / 390;
        // the cut as a line through a and b; c is a point on the leading side
        const nx = b[1] - a[1], ny = a[0] - b[0], len = Math.hypot(nx, ny), side = Math.sign((c[0] - a[0]) * nx + (c[1] - a[1]) * ny);
        let n = 0;
        for (let y = 0; y < im.height; y++) for (let x = 0; x < w; x++) {
          if (im.data[(y * w + x) * 4 + 3] < 40) continue;
          const dd = ((((x + 0.5) / k - a[0]) * nx + ((y + 0.5) / k - a[1]) * ny) / len) * side;
          if (dd < -1.5) n++;
        }
        return n;
      }, { a: camPx(st.pose, along(-0.5 * size, top, 0)), b: camPx(st.pose, along(0.5 * size, top, 0)), c: camPx(st.pose, along(0, top + 0.1, 0)) });
      row.guestPixelsBehindTheCut = stray;
      strays += stray;
      rows.push(row);
    }
  }
  // while every layer is still inside, the anchored guest draws nothing at all: no part of the cavity over the camera image
  const before = await page.evaluate(() => {
    const d = (window as any).demo, out: number[] = [];
    for (const pose of [[0, 0, 5.6], [-25, 8, 3.6], [35, 0, 4.5]]) {
      d.setPose(pose[0], pose[1], pose[2]);
      for (const t of [0, 0.6, 1.2, 2.4, 2.85]) {
        d.seek(["depart", t], ["explode", t]);
        const im: ImageData = d.pixels("guest");
        let n = 0;
        for (let i = 3; i < im.data.length; i += 4) if (im.data[i] > 0) n++;
        out.push(n);
      }
    }
    return out;
  });
  // the rim of light along the cut: only when the host has no viewer
  const rim = await page.evaluate(({ APPROACH, CROSS }) => {
    const d = (window as any).demo, out: Record<string, unknown> = {};
    d.setPose(0, 0, 4.5);
    const t = d.info().host.start[0] + APPROACH + 0.5 * CROSS;
    for (const viewer of [true, false]) {
      d.setViewer(viewer);
      d.seek(["depart", t], ["explode", t]);
      const im: ImageData = d.pixels("host");
      let bright = 0;
      for (let i = 0; i < im.data.length; i += 4) if (im.data[i] > 200 && im.data[i + 1] > 210 && im.data[i + 2] > 220) bright++;
      out[viewer ? "withViewer" : "withoutViewer"] = { rimLight: d.info().host.rimLight, nearWhitePixels: bright };
    }
    return out;
  }, { APPROACH, CROSS }) as any;
  record("glass-seam-pixels", {
    measured, worstGuestEdgePx: +worstGuest.toFixed(2), worstHostEdgePx: +worstHost.toFixed(2), worstHostEdgeInCameraPx: +worstCam.toFixed(2),
    worstGapPx: +worstGap.toFixed(2), guestPixelsBehindTheCut: strays, guestPixelsBeforeAnyCrossing: before, rim, rows,
  });
  expect(worstGuest).toBeLessThanOrEqual(1);
  expect(worstHost).toBeLessThanOrEqual(1);
  expect(worstCam).toBeLessThanOrEqual(1);
  expect(worstGap).toBeLessThanOrEqual(1);
  expect(strays).toBe(0);
  expect(before.every((n) => n === 0)).toBe(true);
  expect(rows.filter((r) => r.host.length > 0).length).toBeGreaterThanOrEqual(8);
  expect(rim.withViewer.rimLight).toBe(0);
  expect(rim.withoutViewer.rimLight).toBe(1);
  expect(rim.withoutViewer.nearWhitePixels).toBeGreaterThan(rim.withViewer.nearWhitePixels + 20);
  noPageErrors(page);
});
