// Where a frame differs from the flat reference: saves the frame, the reference and an amplified
// difference map, and prints how many pixels differ inside each layer rect.
// Usage: node scripts/diffmap.mjs <out-prefix> '<json>'   json = { mount, seek: [timeline, t], ref: { area, qr } }
// PEEL_BROWSER=webkit runs it in WebKit. Needs the dev server.
import { launch, browserName } from "./browser.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const [prefix, json] = process.argv.slice(2);
const job = JSON.parse(json ?? "{}");
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 900 }, deviceScaleFactor: Number(process.env.PEEL_DSF ?? 1) });
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
await page.goto("http://127.0.0.1:5274/checks/harness.html");
await page.waitForFunction(() => !!window.H);
const out = await page.evaluate(async (job) => {
  const H = window.H;
  await H.mount(job.mount ?? {});
  const h = H.handle;
  h.test.setPaused(true);
  const [tl, t] = job.seek ?? ["idle", 0];
  h.test.seek(tl, t);
  const a = H.pixels(), b = H.reference(job.ref ?? {});
  const W = a.width, Hh = a.height;
  const d = new ImageData(W, Hh);
  let x0 = W, y0 = Hh, x1 = -1, y1 = -1, n = 0;
  const hist = new Array(9).fill(0);
  for (let i = 0; i < W * Hh; i++) {
    let m = 0;
    for (let c = 0; c < 4; c++) m = Math.max(m, Math.abs(a.data[i * 4 + c] - b.data[i * 4 + c]));
    hist[m === 0 ? 0 : Math.min(8, 1 + Math.floor(Math.log2(m)))]++;
    const v = m === 0 ? 0 : Math.min(255, 60 + m * 6);
    d.data[i * 4] = v; d.data[i * 4 + 1] = m > 8 ? 0 : v; d.data[i * 4 + 2] = m > 8 ? 0 : v; d.data[i * 4 + 3] = 255;
    if (m > 1) { n++; const x = i % W, y = (i / W) | 0; if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  }
  const url = (img) => { const c = document.createElement("canvas"); c.width = W; c.height = Hh; c.getContext("2d").putImageData(img, 0, 0); return c.toDataURL("image/png"); };
  const st = h.test.stats(), s = st.fit[2] / H.manifest.card.w;
  const layers = H.manifest.layers.map((l) => {
    let k = 0;
    const lx0 = Math.floor(st.fit[0] + l.rect.x * s), ly0 = Math.floor(st.fit[1] + l.rect.y * s), lx1 = Math.ceil(st.fit[0] + (l.rect.x + l.rect.w) * s), ly1 = Math.ceil(st.fit[1] + (l.rect.y + l.rect.h) * s);
    for (let y = Math.max(0, ly0); y < Math.min(Hh, ly1); y++) for (let x = Math.max(0, lx0); x < Math.min(W, lx1); x++) if (d.data[(y * W + x) * 4] > 66) k++;
    return { id: l.id, box: [lx0, ly0, lx1, ly1], over1: k };
  });
  return { stats: H.compare(a, b), over1: n, bbox: [x0, y0, x1, y1], histLog2: hist, layers, fit: st.fit, pr: st.pr, gpu: st.gpu, frame: url(a), ref: url(b), diff: url(d) };
}, job);
mkdirSync(dirname(prefix), { recursive: true });
for (const k of ["frame", "ref", "diff"]) writeFileSync(`${prefix}-${k}.png`, Buffer.from(out[k].split(",")[1], "base64"));
const { frame, ref, diff, ...rest } = out;
console.log(browserName, JSON.stringify(rest));
await browser.close();
