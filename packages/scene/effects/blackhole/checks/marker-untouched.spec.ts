// A3 — the tracking marker lives in safeRects: during `connect` and `depart` the pixels inside them
// never change (they stay untouched, alpha 0), with a viewer that moves and with the tilt eye, while
// the pixels right beside them do change. One rect is where the QR was, one sits on the sink itself,
// two are in corners.
import { expect, test } from "@playwright/test";
import { noPageErrors, open, record } from "./util";

test("marker-untouched: pixels inside safeRects never change through connect and depart", async ({ page }) => {
  await open(page);
  const rects = [{ x: 97.5, y: 640, w: 195, h: 195 }, { x: 150, y: 380, w: 90, h: 90 }, { x: 0, y: 0, w: 44, h: 44 }, { x: 346, y: 800, w: 44, h: 44 }];
  const r = await page.evaluate(async (rects) => {
    const H = window.H, D = H.durations();
    const out: Record<string, unknown> = {};
    for (const mode of ["viewer", "tilt"]) {
      await H.mount({ safeRects: rects, quality: "high" });
      const h = H.handle!, T = h.test!;
      T.setPaused(true);
      const pr = (T.stats() as any).pr as number;
      let frames = 0, changed = 0, nonZero = 0;
      const first: (Uint8ClampedArray | null)[] = rects.map(() => null);
      const beside = new Set<string>();
      for (const tl of ["connect", "depart"] as const) {
        for (let i = 0; i <= 60; i++) {
          if (mode === "viewer") h.setViewer!(new Float32Array([3 * Math.sin(i * 0.37), 2 * Math.cos(i * 0.23), 5 + Math.sin(i * 0.11)]));
          else h.setTilt(Math.sin(i * 0.3), Math.cos(i * 0.2));
          T.seek(tl, (D[tl] * i) / 60);
          const p = H.pixels();
          frames++;
          rects.forEach((q, k) => {
            const x0 = Math.ceil(q.x * pr), y0 = Math.ceil(q.y * pr), x1 = Math.floor((q.x + q.w) * pr), y1 = Math.floor((q.y + q.h) * pr);
            const buf = new Uint8ClampedArray((x1 - x0) * (y1 - y0) * 4);
            let o = 0;
            for (let y = y0; y < y1; y++) {
              const row = p.data.subarray((y * p.width + x0) * 4, (y * p.width + x1) * 4);
              buf.set(row, o);
              o += row.length;
            }
            for (let j = 3; j < buf.length; j += 4) if (buf[j] !== 0) nonZero++;
            const a = first[k];
            if (!a) first[k] = buf;
            else for (let j = 0; j < buf.length; j++) if (a[j] !== buf[j]) { changed++; break; }
          });
          // four pixels just left of the rect on the sink: this is where the card bends most
          const q = rects[1], y = Math.round((q.y + q.h / 2) * pr), x = Math.round((q.x - 6) * pr);
          beside.add(Array.from(p.data.subarray((y * p.width + x) * 4, (y * p.width + x + 4) * 4)).join(","));
        }
      }
      out[mode] = { frames, rectFramesChanged: changed, nonZeroAlphaValues: nonZero, distinctPixelsBesideTheSinkRect: beside.size, pixelRatio: pr };
    }
    return out;
  }, rects) as Record<string, { frames: number; rectFramesChanged: number; nonZeroAlphaValues: number; distinctPixelsBesideTheSinkRect: number }>;
  record("marker-untouched", { rects, ...r });
  for (const v of Object.values(r)) {
    expect(v.frames).toBe(122);
    expect(v.rectFramesChanged).toBe(0);
    expect(v.nonZeroAlphaValues).toBe(0);
    // the check is looking at a live picture: right beside the rect the card is being pulled
    expect(v.distinctPixelsBesideTheSinkRect).toBeGreaterThan(20);
  }
  noPageErrors(page);
});
