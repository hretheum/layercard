// A5 — the picture on the host screen is a window. Seen from the eye it was drawn for, every corner
// and edge of the cavity is where a real box behind the glass would be, and the stand-in camera's
// image of the screen matches a direct 3D render of the same box.
import { expect, test } from "@playwright/test";
import { EYES, camPx, eyeOf, noPageErrors, onGlass, openStage, record, xf, type V3 } from "./util";

const DEPTH = 3;

test("window-truth: corners and edges of the cavity within 1 CSS px of the real box, image against a direct render, 19 eyes", async ({ page }) => {
  test.setTimeout(240_000);
  await openStage(page);
  const rows: any[] = [];
  const blends: number[] = [];
  let worstHost = 0, worstCam = 0, worstShift = 0, worstQuad = 0, images = 0, placed = 0;
  for (const [yaw, pitch, dist] of EYES) {
    // the fanned-out hold: sheets at many depths inside the cavity
    const r = await page.evaluate(({ yaw, pitch, dist }) => {
      const d = (window as any).demo;
      d.setViewer(true);
      d.setDirect(true);
      d.setPose(yaw, pitch, dist);
      d.seek(["depart", 2.4], ["explode", 2.4]);
      const info = d.info(), cam: ImageData = d.pixels("cam"), dir: ImageData = d.pixels("guest");
      // luminance, 3x3 box blurred (the camera image is a filtered copy of the screen, the direct render is not)
      const lum = (im: ImageData): Float32Array => {
        const w = im.width, h = im.height, a = new Float32Array(w * h), b = new Float32Array(w * h), q = im.data;
        for (let i = 0; i < w * h; i++) a[i] = (0.2126 * q[i * 4] + 0.7152 * q[i * 4 + 1] + 0.0722 * q[i * 4 + 2]) * (q[i * 4 + 3] / 255);
        for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
          let s = 0;
          for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) s += a[(y + v) * w + x + u];
          b[y * w + x] = s / 9;
        }
        return b;
      };
      return { info, w: cam.width, h: cam.height, cam: Array.from(lum(cam)), dir: Array.from(lum(dir)), alpha: Array.from(dir.data.filter((_, i) => i % 4 === 3)) };
    }, { yaw, pitch, dist });
    const { info } = r, pose: number[] = info.pose, H: number = info.card.h / info.card.w, eye = eyeOf(pose);
    const hs = info.host, pr: number = info.hostStats.pr, fit: number[] = info.hostStats.fit.map((v: number) => v / pr);
    const [cw, ch]: number[] = info.css;

    // 1. analytic: the points the host drew, against the real box. Four wall edges, five points on each, the back corners among them.
    let errHost = 0, errCam = 0;
    for (const sx of [-0.5, 0.5]) for (const sy of [-H / 2, H / 2]) for (let i = 0; i <= 4; i++) {
      const p: V3 = [sx, sy, (-DEPTH * i) / 4];
      // where the host put it: its own projection, through the eye it used
      const c = xf(hs.projection, [p[0] - hs.eye[0], p[1] - hs.eye[1], p[2] - hs.eye[2]]);
      const hx = (0.5 + (0.5 * c[0]) / c[3]) * cw, hy = (0.5 - (0.5 * c[1]) / c[3]) * ch;
      // where a real box would show it on the glass, from the camera's true position
      const g = onGlass(eye, p), ix = fit[0] + (g[0] + 0.5) * fit[2], iy = fit[1] + (H / 2 - g[1]) * fit[2];
      errHost = Math.max(errHost, Math.hypot(hx - ix, hy - iy));
      // the same two points as the camera sees them: the drawn one lies on the screen, the real one in the box
      const drawn: V3 = [(hx - fit[0]) / fit[2] - 0.5, H / 2 - (hy - fit[1]) / fit[2], 0];
      const a = camPx(pose, drawn, cw, ch), b = camPx(pose, p, cw, ch);
      errCam = Math.max(errCam, Math.hypot(a[0] - b[0], a[1] - b[1]));
    }

    // 2. image: the stand-in camera's view of the screen against the direct render, inside the window
    const quad = ([[-0.5, H / 2], [0.5, H / 2], [0.5, -H / 2], [-0.5, -H / 2]] as [number, number][]).map(([x, y]) => camPx(pose, [x, y, 0], cw, ch));
    const cx = quad.reduce((s, q) => s + q[0], 0) / 4, cy = quad.reduce((s, q) => s + q[1], 0) / 4;
    const inside = (x: number, y: number, margin: number): boolean => {
      for (let i = 0; i < 4; i++) {
        const a = quad[i], b = quad[(i + 1) % 4], nx = b[1] - a[1], ny = a[0] - b[0], len = Math.hypot(nx, ny);
        const side = ((cx - a[0]) * nx + (cy - a[1]) * ny) / len, dd = ((x - a[0]) * nx + (y - a[1]) * ny) / len;
        if (side > 0 ? dd < margin : dd > -margin) return false;
      }
      return true;
    };
    const W = r.w, R = 3;
    // sum of absolute differences for whole-pixel shifts, in the whole window and in its four quarters
    const sad = Array.from({ length: 5 }, () => new Float64Array((2 * R + 1) ** 2));
    const cnt = new Float64Array(5), tex = new Float64Array(5);
    let transparent = 0, n = 0;
    for (let y = Math.floor(cy - 500); y < cy + 500; y++) for (let x = Math.floor(cx - 300); x < cx + 300; x++) {
      if (x < R + 1 || y < R + 1 || x >= W - R - 1 || y >= r.h - R - 1 || !inside(x, y, R + 2)) continue;
      const i = y * W + x, part = 1 + (x < cx ? 0 : 1) + (y < cy ? 0 : 2);
      if (r.alpha[i] < 250) transparent++;
      n++;
      cnt[0]++; cnt[part]++;
      const t = Math.abs(r.dir[i] - r.dir[i + 1]) + Math.abs(r.dir[i] - r.dir[i + W]);
      tex[0] += t; tex[part] += t;
      for (let v = -R; v <= R; v++) for (let u = -R; u <= R; u++) {
        const e = Math.abs(r.cam[i + v * W + u] - r.dir[i]), k = (v + R) * (2 * R + 1) + u + R;
        sad[0][k] += e; sad[part][k] += e;
      }
    }
    // best shift with a parabola through the minimum and its neighbours
    // (third value: how much worse the best shift two or more pixels away is; near 1 means the patch repeats and cannot be placed)
    const best = (s: Float64Array): [number, number, number] => {
      let k = 0;
      for (let i = 1; i < s.length; i++) if (s[i] < s[k]) k = i;
      const u = (k % (2 * R + 1)) - R, v = Math.floor(k / (2 * R + 1)) - R;
      let other = Infinity;
      for (let i = 0; i < s.length; i++) {
        const uu = (i % (2 * R + 1)) - R, vv = Math.floor(i / (2 * R + 1)) - R;
        if (Math.max(Math.abs(uu - u), Math.abs(vv - v)) >= 2 && s[i] < other) other = s[i];
      }
      const sub = (a: number, b: number, c: number): number => (a + c - 2 * b > 1e-9 ? (0.5 * (a - c)) / (a + c - 2 * b) : 0);
      const dx = Math.abs(u) < R ? sub(s[k - 1], s[k], s[k + 1]) : 0, dy = Math.abs(v) < R ? sub(s[k - (2 * R + 1)], s[k], s[k + 2 * R + 1]) : 0;
      return [u + dx, v + dy, other / Math.max(1e-9, s[k])];
    };
    const shift = best(sad[0]), mid = R * (2 * R + 1) + R;
    const quarters: ([number, number] | null)[] = [];
    let quadShift = 0;
    for (let q = 1; q <= 4; q++) {
      // a quarter that cannot be placed is left out: too little in it, or only the rulers of a wall, which repeat
      const s = best(sad[q]);
      if (cnt[q] < 400 || tex[q] / cnt[q] < 1.5 || s[2] < 1.12) { quarters.push(null); continue; }
      quarters.push([+s[0].toFixed(2), +s[1].toFixed(2)]);
      quadShift = Math.max(quadShift, Math.hypot(s[0], s[1]));
      placed++;
    }
    const row = {
      yaw, pitch, dist, eye: eye.map((v) => +v.toFixed(3)), screenWidthPx: +Math.hypot(quad[1][0] - quad[0][0], quad[1][1] - quad[0][1]).toFixed(1),
      errHostPx: +errHost.toFixed(6), errCamPx: +errCam.toFixed(6),
      image: { pixels: n, transparent, meanAbsDiff: +(sad[0][mid] / Math.max(1, cnt[0])).toFixed(2), shift: [+shift[0].toFixed(2), +shift[1].toFixed(2)], distinct: +shift[2].toFixed(2), quarters },
    };
    rows.push(row);
    worstHost = Math.max(worstHost, errHost);
    worstCam = Math.max(worstCam, errCam);
    worstShift = Math.max(worstShift, Math.hypot(shift[0], shift[1]));
    worstQuad = Math.max(worstQuad, quadShift);
    images++;
    blends.push(hs.viewerBlend);
  }
  record("window-truth", {
    eyes: EYES.length, images, worstHostPx: +worstHost.toFixed(6), worstCamPx: +worstCam.toFixed(6),
    worstImageShiftPx: +worstShift.toFixed(2), worstQuarterShiftPx: +worstQuad.toFixed(2), quartersPlaced: placed, quarters: 4 * EYES.length, rows,
  });
  expect(EYES.length).toBeGreaterThanOrEqual(12);
  expect(placed).toBeGreaterThanOrEqual(1.5 * EYES.length);
  for (const [i, row] of rows.entries()) {
    const at = `eye ${row.yaw},${row.pitch},${row.dist}`;
    expect(blends[i], `${at}: the host uses the viewer`).toBe(1);
    expect(row.errHostPx, `${at}: host screen`).toBeLessThanOrEqual(1);
    expect(row.errCamPx, `${at}: camera`).toBeLessThanOrEqual(1);
    expect(row.image.transparent, `${at}: the direct render fills the window`).toBe(0);
    expect(Math.hypot(row.image.shift[0], row.image.shift[1]), `${at}: image shift`).toBeLessThanOrEqual(1);
    for (const q of row.image.quarters) if (q) expect(Math.hypot(q[0], q[1]), `${at}: image shift in a quarter`).toBeLessThanOrEqual(1);
    // lines are one pixel wide in each render (one host pixel on the screen, one camera pixel in the direct render), so
    // their brightness differs; the bound only catches a picture that is not the same scene at all
    expect(row.image.meanAbsDiff, `${at}: image difference`).toBeLessThanOrEqual(30);
  }
  noPageErrors(page);
});
