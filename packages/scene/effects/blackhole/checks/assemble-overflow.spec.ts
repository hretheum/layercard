// B7, B8 — the landing is the page.
// The end frame of `assemble` is the flat composite inside `assembleRect`, clipped by the canvas,
// within 1/255, for a full-bleed rect, for rects that run below the canvas, and for an old centred
// smaller rect. The canvas is opaque at the end of `fly` (the level has taken it over) and nothing
// moves in the last 0.3 s of `assemble`.
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

test("assemble-overflow: exact landing in full-bleed, overflowing and centred rects; opaque at the end of fly", async ({ page }) => {
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
        // the level takes the canvas over during fly: opaque everywhere at its end
        T.seek("fly", 1e3);
        const p = H.pixels().data;
        let minA = 255;
        for (let i = 3; i < p.length; i += 4) if (p[i] < minA) minA = p[i];
        // nothing moves in the last 0.3 s of assemble, and its end is the flat card
        T.seek("assemble", D.assemble - 0.3);
        const still = H.hash();
        T.seek("assemble", 1e3);
        const end = H.compare(H.pixels(), H.reference({ area: c.rect, qr: false }));
        const st = T.stats() as any;
        out[`${c.name}${anchored ? ", anchored" : ""}`] = {
          end, flyEndMinAlpha: minA, stillFromLock: still === H.hash(), pixelRatio: st.pr, buffer: st.buffer, textureMB: +(st.texBytes / 1048576).toFixed(2),
        };
      }
    }
    return out;
  }, { CASES, FOV });
  record("assemble-overflow", r);
  for (const [name, v] of Object.entries(r) as [string, any][]) {
    expect(v.end.max, `${name}: end frame`).toBeLessThanOrEqual(FLAT_MAX);
    expect(v.flyEndMinAlpha, name).toBe(255);
    expect(v.stillFromLock, `${name}: something still moves 0.3 s before the end`).toBe(true);
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
