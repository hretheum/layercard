// A strip of frames at chosen times through the demo stage, for close looks at one moment.
// Usage: node scripts/strip.mjs out.png '<json>'   (dev server must be running)
// json = { el: "#hostPhone" | "#guestPhone" | "#stage", pose: [yaw, pitch, dist] | null, h: timeline, g: timeline | null,
//          viewer: false (the host draws for its tilt eye), times: [t, ...], tilt: [x, y], cols, scale,
//          crop: [x, y, w, h] (CSS px inside el), title, query }
import { launch, browserName } from "./browser.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const out = resolve(process.argv[2]);
const job = JSON.parse(process.argv[3] ?? "{}");
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: job.dsf ?? 1 });
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
await page.goto(`http://127.0.0.1:5275/demo/index.html?quality=${process.env.WINDOW_QUALITY ?? "high"}&${job.query ?? "inset=0"}`);
await page.waitForFunction(() => window.demo && window.demo.ready);
await page.evaluate(() => window.demo.ready);
await page.evaluate(() => window.demo.pause(true));
await page.evaluate(({ p, viewer }) => { window.demo.setViewer(viewer); window.demo.setPose(...(p ?? [null])); }, { p: job.pose === undefined ? [-14, 9, 5.6] : job.pose, viewer: job.viewer !== false });
const frames = [];
for (const t of job.times ?? [0]) {
  await page.evaluate(({ h, g, tilt }) => { window.demo.setTilt(tilt[0], tilt[1]); window.demo.seek(h, g); },
    { h: [job.h ?? "depart", t], g: job.g === null ? null : [job.g ?? "explode", t], tilt: job.tilt ?? [0, 0] });
  const png = await page.locator(job.el ?? "#guestPhone").screenshot();
  frames.push({ t, url: "data:image/png;base64," + png.toString("base64") });
}
const composer = await browser.newPage({ viewport: { width: 800, height: 600 } });
const sheet = await composer.evaluate(async ({ frames, job, browserName }) => {
  const first = new Image();
  first.src = frames[0].url;
  await first.decode();
  const dsf = job.dsf ?? 1;
  const crop = job.crop ? job.crop.map((v) => v * dsf) : [0, 0, first.naturalWidth, first.naturalHeight];
  const scale = (job.scale ?? 1) / dsf;
  const cols = job.cols ?? Math.min(frames.length, 6), rows = Math.ceil(frames.length / cols);
  const fw = Math.round(crop[2] * scale), fh = Math.round(crop[3] * scale), gap = 10, top = 40, cap = 22;
  const c = document.createElement("canvas");
  c.width = cols * fw + (cols + 1) * gap;
  c.height = top + rows * (fh + cap + gap);
  const x = c.getContext("2d");
  x.fillStyle = "#14171b";
  x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = "#e6eaef";
  x.font = "600 16px system-ui, sans-serif";
  x.fillText(`${job.title ?? "window"} (${browserName})`, gap, 26);
  x.font = "12px ui-monospace, Menlo, monospace";
  x.imageSmoothingQuality = "high";
  for (let i = 0; i < frames.length; i++) {
    const img = new Image();
    img.src = frames[i].url;
    await img.decode();
    const px = gap + (i % cols) * (fw + gap), py = top + Math.floor(i / cols) * (fh + cap + gap);
    x.drawImage(img, crop[0], crop[1], crop[2], crop[3], px, py, fw, fh);
    x.fillStyle = "#9aa3ae";
    x.fillText(`t = ${frames[i].t.toFixed(2)} s`, px, py + fh + 15);
  }
  return c.toDataURL("image/png");
}, { frames, job, browserName });
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, Buffer.from(sheet.split(",")[1], "base64"));
console.log("saved", out);
await browser.close();
