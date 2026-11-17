// B7, B8 — the landing is the page.
// The end frame of `assemble` is the flat composite inside `assembleRect`, clipped by the canvas,
// within 1/255, for a full-bleed rect, for rects that run below the canvas, and for an old centred
// smaller rect. During `fly` and `assemble` no sheet crosses a side edge of the canvas, and the deck
// at the end of `fly` is inside the canvas on all four sides.
import { expect, test } from "@playwright/test";
import { FLAT_MAX, FOV, INSET, noPageErrors, open, record, shot } from "./util";

type Case = { name: string; w: number; h: number; rect: { x: number; y: number; w: number; h: number }; sides: boolean };
const CASES: Case[] = [
  { name: "full-bleed 390x844 in 390x844", w: 390, h: 844, rect: { x: 0, y: 0, w: 390, h: 844 }, sides: true },
  { name: "393x850 in 393x659", w: 393, h: 659, rect: { x: 0, y: 0, w: 393, h: 850 }, sides: true },
  { name: "320x693 in 320x568", w: 320, h: 568, rect: { x: 0, y: 0, w: 320, h: 693 }, sides: true },
  { name: "centred 320x692 in 390x844", w: 390, h: 844, rect: INSET, sides: true },
  // not asked for by the brief: a rect that also runs past the top and the left edge
  { name: "extra: 430x930 at (-20,-30) in 390x844", w: 390, h: 844, rect: { x: -20, y: -30, w: 430, h: 930 }, sides: false },
];

test("assemble-overflow: exact landing in full-bleed, overflowing and centred rects; nothing crosses a side edge", async ({ page }) => {
  test.setTimeout(400_000);
  await open(page);
  const r = await page.evaluate(async ({ CASES, FOV }) => {
    const H = window.H, out: Record<string, unknown> = {};
    for (const c of CASES) {
      for (const anchored of [false, true]) {
        await H.mount({ role: "guest", w: c.w, h: c.h, assembleRect: c.rect });
        const h = H.handle!, T = h.test!;
        T.setPaused(true);
        h.setProjection(FOV, c.w / c.h);
        if (anchored) h.setPose(T.fakePose(-14, 9, 5.6));
        const D = H.durations();
        // every sheet corner on screen, CSS px
        const extent = (): number[] => {
          const s = T.state() as any, P = s.projection as number[], [qx, qy, qz, qw] = s.frame.quat as number[];
          const pos = s.frame.pos as number[], scl = s.frame.scale as number[];
          let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
          for (const q of s.sheets) {
            if (q.qr || !q.on || q.op <= 0) continue;
            for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
              const vx = (q.x + (sx * q.w) / 2) * scl[0], vy = (q.y + (sy * q.h) / 2) * scl[1], vz = q.z * scl[2];
              // rotate by the frame quaternion, then translate
              const tx = 2 * (qy * vz - qz * vy), ty = 2 * (qz * vx - qx * vz), tz = 2 * (qx * vy - qy * vx);
              const wx = vx + qw * tx + (qy * tz - qz * ty) + pos[0], wy = vy + qw * ty + (qz * tx - qx * tz) + pos[1], wz = vz + qw * tz + (qx * ty - qy * tx) + pos[2];
              const cx = P[0] * wx + P[8] * wz, cy = P[5] * wy + P[9] * wz, cw = -wz;
              const X = ((cx / cw) * 0.5 + 0.5) * c.w, Y = (0.5 - (cy / cw) * 0.5) * c.h;
              if (X < x0) x0 = X; if (Y < y0) y0 = Y; if (X > x1) x1 = X; if (Y > y1) y1 = Y;
            }
          }
          return [x0, y0, x1, y1];
        };
        let left = 1e9, right = 1e9, frames = 0;
        for (const [tl, len, step] of [["fly", D.fly, 0.05], ["assemble", D.assemble, 0.025]] as const) {
          for (let t = 0; t <= len + 1e-9; t += step) {
            T.seek(tl, t);
            const e = extent();
            left = Math.min(left, e[0]);
            right = Math.min(right, c.w - e[2]);
            frames++;
          }
        }
        T.seek("fly", 1e3);
        const deck = extent();
        const p = H.pixels().data;
        let minA = 255;
        for (let i = 3; i < p.length; i += 4) if (p[i] < minA) minA = p[i];
        T.seek("assemble", 1e3);
        const end = H.compare(H.pixels(), H.reference({ area: c.rect, qr: false }));
        const st = T.stats() as any, s = T.state() as any;
        out[`${c.name}${anchored ? ", anchored" : ""}`] = {
          end, flyEndMinAlpha: minA, pixelRatio: st.pr, buffer: st.buffer, textureMB: +(st.texBytes / 1048576).toFixed(2),
          deckZoom: +s.deck.zoom.toFixed(4), deckBoxCssPx: deck.map((v: number) => +v.toFixed(1)),
          deckMarginsCssPx: { left: +deck[0].toFixed(1), top: +deck[1].toFixed(1), right: +(c.w - deck[2]).toFixed(1), bottom: +(c.h - deck[3]).toFixed(1) },
          framesSampled: frames, closestToLeftEdgeCssPx: +left.toFixed(2), closestToRightEdgeCssPx: +right.toFixed(2), sides: c.sides,
        };
      }
    }
    return out;
  }, { CASES, FOV });
  record("assemble-overflow", r);
  for (const [name, v] of Object.entries(r) as [string, any][]) {
    expect(v.end.max, `${name}: end frame`).toBeLessThanOrEqual(FLAT_MAX);
    expect(v.flyEndMinAlpha, name).toBe(255);
    if (!v.sides) continue;
    expect(v.closestToLeftEdgeCssPx, `${name}: a sheet crossed the left edge`).toBeGreaterThanOrEqual(-0.5);
    expect(v.closestToRightEdgeCssPx, `${name}: a sheet crossed the right edge`).toBeGreaterThanOrEqual(-0.5);
    for (const side of ["left", "top", "right", "bottom"]) expect(v.deckMarginsCssPx[side], `${name}: deck ${side}`).toBeGreaterThanOrEqual(0);
  }
  noPageErrors(page);
});

test("assemble-overflow: production bundle played in real time into a rect that runs below the canvas", async ({ page }) => {
  await open(page);
  const rect = { x: 0, y: 0, w: 393, h: 850 };
  await page.evaluate(async ({ rect, FOV }) => {
    const H = window.H;
    H.freshCanvas();
    await H.mount({ build: "dist", test: false, role: "guest", w: 393, h: 659, assembleRect: rect });
    H.handle!.setProjection(FOV, 393 / 659);
    await H.handle!.play("assemble");
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }, { rect, FOV });
  await shot(page);
  const r = await page.evaluate((rect) => window.H.compare(window.__shot, window.H.reference({ area: rect, qr: false })), rect);
  record("assemble-overflow-dist", r);
  expect(r.max).toBeLessThanOrEqual(FLAT_MAX);
  noPageErrors(page);
});
