// The QR layer must scan at any moment of idle: it is only ever translated (at most 4 CSS px), never
// scaled, rotated or skewed. Here a decoder (jsQR) reads it from rendered frames, at 1x and at 2x.
import { expect, test } from "@playwright/test";
import jsQR from "jsqr";
import { noPageErrors, open, record } from "./util";

for (const dsf of [1, 2]) {
  test.describe(`qr at ${dsf}x`, () => {
    test.use({ deviceScaleFactor: dsf });
    test(`qr: decodes from idle frames at every tilt (${dsf}x)`, async ({ page }) => {
      await open(page);
      const frames = await page.evaluate(async (dsf) => {
        const H = window.H;
        await H.mount({ quality: dsf === 1 ? "test" : "high" });
        const h = H.handle!, T = h.test!;
        T.setPaused(true);
        const out: { tilt: number[]; t: number; w: number; h: number; data: number[] }[] = [];
        for (const [tx, ty, t] of [[0, 0, 0], [1, 1, 0], [-1, 0.5, 0.7], [0.3, -1, 2.1], [0, 0, 1.25], [0, 0, 3.75], [-1, -1, 4.4]]) {
          h.setTilt(tx, ty);
          T.seek("idle", t);
          const p = H.pixels();
          // crop to the code with a 14 CSS px margin, as a scanner's finder would
          const q = H.manifest!.layers.find((l) => l.role === "qr")!.rect, k = p.width / H.manifest!.card.w, m = 14 * dsf;
          const x0 = Math.max(0, Math.floor(q.x * k - m)), y0 = Math.max(0, Math.floor(q.y * k - m));
          const w = Math.min(p.width - x0, Math.ceil(q.w * k + 2 * m)), hh = Math.min(p.height - y0, Math.ceil(q.h * k + 2 * m));
          const data: number[] = [];
          for (let y = y0; y < y0 + hh; y++) for (let x = x0; x < x0 + w; x++) {
            const i = (y * p.width + x) * 4;
            data.push(p.data[i], p.data[i + 1], p.data[i + 2], p.data[i + 3]);
          }
          out.push({ tilt: [tx, ty], t, w, h: hh, data });
        }
        return out;
      }, dsf);
      const decoded = frames.map((f) => ({ tilt: f.tilt, t: f.t, text: jsQR(new Uint8ClampedArray(f.data), f.w, f.h)?.data ?? null }));
      record(`qr-${dsf}x`, decoded);
      for (const d of decoded) expect(d.text, JSON.stringify(d)).toBe("https://example.com/k#r=demo");
      noPageErrors(page);
    });
  });
}
