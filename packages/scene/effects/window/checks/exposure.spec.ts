// A6 — designed for a camera: the cavity never crushes to black. Nothing the host draws is darker
// than the card background, at any moment of the event and for any eye, and the uncovered back
// panel has at least three times its luminance.
import { expect, test } from "@playwright/test";
import { noPageErrors, open, record } from "./util";

test("exposure: no pixel darker than the card background through the event; back panel at least 3x its luminance", async ({ page }) => {
  await open(page);
  const r = await page.evaluate(async () => {
    const H = window.H;
    await H.mount({});
    const h = H.handle!, T = h.test!;
    T.setPaused(true);
    const lin = (v: number): number => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const lum = (r: number, g: number, b: number): number => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const m = /^#(..)(..)(..)$/.exec(H.manifest!.card.background)!;
    const bg = [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
    const bgLum = lum(bg[0], bg[1], bg[2]);
    // one 8-bit step of rounding below the background is not "darker"
    const floor = lum(Math.max(0, bg[0] - 1), Math.max(0, bg[1] - 1), Math.max(0, bg[2] - 1));
    const dur = H.durations().depart;
    const eyes: { name: string; tilt: [number, number]; viewer: number[] | null }[] = [
      { name: "no viewer, level", tilt: [0, 0], viewer: null },
      { name: "no viewer, tilted", tilt: [1, -0.6], viewer: null },
      { name: "viewer frontal 45 cm", tilt: [0, 0], viewer: [0, 0, 6.75] },
      { name: "viewer 35 deg right, 45 cm", tilt: [0, 0], viewer: [6.75 * Math.sin(0.61), 0, 6.75 * Math.cos(0.61)] },
      { name: "viewer 35 deg below, 30 cm", tilt: [0, 0], viewer: [0, -4.5 * Math.sin(0.61), 4.5 * Math.cos(0.61)] },
      { name: "viewer 20 deg left and above, 60 cm", tilt: [0, 0], viewer: [-9 * 0.34, 9 * 0.2, 9 * 0.92] },
    ];
    const moments = [0.6, 1.2, 1.8, 2.4, 3.0, 3.3, 4.1, 5.2, 5.6, 6.2, dur];
    const rows = [];
    let darkest = 1e9, darkestAt = "", panelMin = 1e9;
    for (const e of eyes) {
      h.setTilt(e.tilt[0], e.tilt[1]);
      h.setViewer!(e.viewer ? new Float32Array(e.viewer) : null);
      let min = 1e9, below = 0, minAt = 0;
      for (const t of moments) {
        T.seek("depart", t);
        const px = H.pixels(), d = px.data;
        let mm = 1e9;
        for (let i = 0; i < d.length; i += 4) {
          const l = lum(d[i], d[i + 1], d[i + 2]);
          if (l < mm) mm = l;
          if (l < floor) below++;
        }
        if (mm < min) { min = mm; minAt = t; }
      }
      // the back panel at the end: the middle of the back wall as this eye sees it on the screen
      T.seek("depart", dur);
      const st = T.state() as any, P: number[] = st.projection, E: number[] = st.eye, px = H.pixels();
      const at = (x: number, y: number): [number, number] => {
        const p = [x - E[0], y - E[1], -3 - E[2]];
        const cx = P[0] * p[0] + P[4] * p[1] + P[8] * p[2] + P[12], cy = P[1] * p[0] + P[5] * p[1] + P[9] * p[2] + P[13], cw = P[3] * p[0] + P[7] * p[1] + P[11] * p[2] + P[15];
        return [(0.5 + (0.5 * cx) / cw) * px.width, (0.5 - (0.5 * cy) / cw) * px.height];
      };
      let sum = 0, n = 0;
      for (let v = -0.3; v <= 0.301; v += 0.05) for (let u = -0.3; u <= 0.301; u += 0.05) {
        const [x, y] = at(u, v * st.cardH);
        if (x < 1 || y < 1 || x >= px.width - 1 || y >= px.height - 1) continue; // hidden by the edge of the window for this eye
        const i = (Math.round(y) * px.width + Math.round(x)) * 4;
        sum += lum(px.data[i], px.data[i + 1], px.data[i + 2]);
        n++;
      }
      const panel = n > 0 ? sum / n : null;
      rows.push({ eye: e.name, minLuminance: +min.toFixed(5), minAt, pixelsBelowBackground: below, panelLuminance: panel === null ? null : +panel.toFixed(4), panelSamples: n, panelOverBackground: panel === null ? null : +(panel / bgLum).toFixed(1) });
      if (min < darkest) { darkest = min; darkestAt = `${e.name} at ${minAt} s`; }
      if (panel !== null && panel < panelMin) panelMin = panel;
      if (below > 0) break;
    }
    const st = T.state() as any;
    return { background: H.manifest!.card.background, backgroundLuminance: +bgLum.toFixed(5), floor: +floor.toFixed(5), lit: st.cavityLit, moments, darkest: +darkest.toFixed(5), darkestAt, panelMin: +panelMin.toFixed(4), panelRatio: +(panelMin / bgLum).toFixed(1), rows };
  });
  record("exposure", r);
  expect(r.lit).toBe(true);
  for (const row of r.rows) expect(row.pixelsBelowBackground, row.eye).toBe(0);
  expect(r.darkest).toBeGreaterThanOrEqual(r.floor);
  expect(r.panelRatio).toBeGreaterThanOrEqual(3);
  expect(r.rows.filter((x: any) => x.panelSamples > 0).length).toBeGreaterThanOrEqual(3);
  noPageErrors(page);
});
