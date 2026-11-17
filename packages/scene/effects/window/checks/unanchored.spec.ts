// A10 — the guest without a pose draws the window itself: a card-sized opening with the cavity
// behind it, seen from a virtual eye that swings 12 degrees either way. One sweep takes half of the
// event (3.875 s), so the swing is back where it began, at rest, when the event ends; `fly` starts
// from that pose. The stack and its chrome stay inside the 8 % margins at every angle of the swing.
import { expect, test } from "@playwright/test";
import { ASPECT, FOV, noPageErrors, open, record } from "./util";

const MX = 0.08 * 390, MY = 0.08 * 844;

test("unanchored: swing of 12 degrees, one sweep in half the event, the cavity through the opening, stack and chrome inside the margins at every angle", async ({ page }) => {
  test.setTimeout(240_000);
  await open(page);
  const r = await page.evaluate(async ({ FOV, ASPECT }) => {
    const H = window.H;
    await H.mount({ role: "guest" });
    const h = H.handle!, T = h.test!;
    T.setPaused(true);
    h.setProjection(FOV, ASPECT);
    h.setPose(null);
    const dur = H.durations().explode;
    const yawOf = (q: number[]): number => {
      // yaw of the frame's rotation (Euler XYZ, as the effect composes it): the angle of the card normal about the vertical
      const [x, y, z, w] = q;
      return (Math.asin(Math.max(-1, Math.min(1, 2 * (x * z + w * y)))) * 180) / Math.PI;
    };
    // the swing through the event, at eighths of it, and in the hold after it (a seek past the end)
    const swing: number[] = [];
    for (let i = 0; i <= 8; i++) {
      T.seek("explode", (dur * i) / 8);
      swing.push(+yawOf((T.state() as any).frame.quat).toFixed(3));
    }
    T.seek("explode", dur + 3);
    const hold = +yawOf((T.state() as any).frame.quat).toFixed(3);
    T.seek("fly", 0);
    const flyStart = +yawOf((T.state() as any).frame.quat).toFixed(3);
    // the stack with its chrome through the second sweep, when every sheet is out or on its way: 49 moments, every angle
    let outside = 0, overlaps = 0, labels = 0, withChrome = 0, minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9, yawMin = 1e9, yawMax = -1e9;
    for (let i = 0; i <= 48; i++) {
      T.seek("explode", dur / 2 + (dur / 2) * (i / 48));
      const s = T.state() as any;
      const yaw = yawOf(s.frame.quat);
      yawMin = Math.min(yawMin, yaw);
      yawMax = Math.max(yawMax, yaw);
      // the blocks of the sheets whose chrome is drawn at this moment
      const shown = new Set(s.sheets.filter((q: any) => !q.qr && q.on && q.chA > 0).map((q: any) => q.id));
      const L = (s.labels as any[]).filter((l) => shown.has(l.id));
      if (L.length === 0) continue;
      withChrome++;
      labels = Math.max(labels, L.length);
      const xs = [s.box[0], s.box[2], ...L.flatMap((l) => [l.x, l.x + l.w])], ys = [s.box[1], s.box[3], ...L.flatMap((l) => [l.y, l.y + l.h])];
      minX = Math.min(minX, ...xs); maxX = Math.max(maxX, ...xs); minY = Math.min(minY, ...ys); maxY = Math.max(maxY, ...ys);
      for (let a = 0; a < L.length; a++) for (let b = a + 1; b < L.length; b++) {
        if (L[a].x < L[b].x + L[b].w && L[b].x < L[a].x + L[a].w && L[a].y < L[b].y + L[b].h && L[b].y < L[a].y + L[a].h) overlaps++;
      }
      if (Math.min(...xs) < 0.08 * 390 - 0.01 || Math.max(...xs) > 0.92 * 390 + 0.01 || Math.min(...ys) < 0.08 * 844 - 0.01 || Math.max(...ys) > 0.92 * 844 + 0.01) outside++;
    }
    // the cavity through the opening: at the fanned-out hold the guest's own picture is opaque over the whole window
    // and darker towards the back than at the opening's edge
    T.seek("explode", 2.4);
    const st = T.state() as any, px = H.pixels();
    const P: number[] = st.projection, f = st.frame;
    const proj = (x: number, y: number, z: number): [number, number] => {
      // rotate by the frame's quaternion, translate, project
      const [qx, qy, qz, qw] = f.quat;
      const ix = qw * x + qy * z - qz * y, iy = qw * y + qz * x - qx * z, iz = qw * z + qx * y - qy * x, iw = -qx * x - qy * y - qz * z;
      const rx = ix * qw + iw * -qx + iy * -qz - iz * -qy + f.pos[0], ry = iy * qw + iw * -qy + iz * -qx - ix * -qz + f.pos[1], rz = iz * qw + iw * -qz + ix * -qy - iy * -qx + f.pos[2];
      const cx = P[0] * rx + P[4] * ry + P[8] * rz + P[12], cy = P[1] * rx + P[5] * ry + P[9] * rz + P[13], cw = P[3] * rx + P[7] * ry + P[11] * rz + P[15];
      return [(0.5 + (0.5 * cx) / cw) * px.width, (0.5 - (0.5 * cy) / cw) * px.height];
    };
    let opaque = 0, n = 0;
    for (let v = -0.45; v <= 0.451; v += 0.05) for (let u = -0.45; u <= 0.451; u += 0.05) {
      const [x, y] = proj(u, v * st.cardH, 0);
      const i = (Math.round(y) * px.width + Math.round(x)) * 4;
      n++;
      if (px.data[i + 3] === 255) opaque++;
    }
    // before the first play nothing is drawn
    await H.mount({ role: "guest" });
    H.handle!.setProjection(FOV, ASPECT);
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    const before = H.pixels().data;
    let drawn = 0;
    for (let i = 3; i < before.length; i += 4) if (before[i] > 0) drawn++;
    return { dur, swing, hold, flyStart, yawMin, yawMax, labels, withChrome, outside, overlaps, bounds: [minX, minY, maxX, maxY], windowSamples: n, windowOpaque: opaque, cavA: st.cavA, behind: st.behind, drawnBeforePlay: drawn };
  }, { FOV, ASPECT });
  const summary = {
    eventSeconds: r.dur, yawAtEighthsOfTheEvent: r.swing, yawInTheHold: r.hold, yawAtFlyStart: r.flyStart, yawRangeWithChrome: [+r.yawMin.toFixed(2), +r.yawMax.toFixed(2)],
    labels: r.labels, momentsWithChrome: r.withChrome, momentsOutsideMargins: r.outside, overlaps: r.overlaps, bounds: r.bounds.map((v: number) => +v.toFixed(1)), margins: [MX, MY, 390 - MX, 844 - MY],
    windowOpaque: `${r.windowOpaque}/${r.windowSamples}`, drawnBeforePlay: r.drawnBeforePlay,
  };
  record("unanchored", summary);
  // the swing: -12 degrees at the start, 12 half way (one sweep in 3.875 s), back at -12 at the end, and at rest there
  expect(r.swing[0]).toBeCloseTo(-12, 2);
  expect(r.swing[2]).toBeCloseTo(0, 2);
  expect(r.swing[4]).toBeCloseTo(12, 2);
  expect(r.swing[6]).toBeCloseTo(0, 2);
  expect(r.swing[8]).toBeCloseTo(-12, 2);
  expect(r.dur / 2).toBeGreaterThanOrEqual(3.75);
  expect(r.dur / 2).toBeLessThanOrEqual(4.25);
  // it holds still after the event, and `fly` starts from exactly that pose: a frame depends on its own timeline's time only
  expect(r.hold).toBe(r.swing[8]);
  expect(r.flyStart).toBe(r.swing[8]);
  expect(r.yawMin).toBeGreaterThanOrEqual(-12.01);
  expect(r.yawMax).toBeLessThanOrEqual(12.01);
  expect(r.yawMax - r.yawMin).toBeGreaterThan(23.5);
  expect(r.withChrome).toBeGreaterThanOrEqual(40);
  expect(r.labels).toBe(6);
  expect(r.outside).toBe(0);
  expect(r.overlaps).toBe(0);
  expect(r.cavA).toBe(1);
  expect(r.behind).toBe(1);
  expect(r.windowOpaque).toBe(r.windowSamples);
  expect(r.drawnBeforePlay).toBe(0);
  noPageErrors(page);
});
