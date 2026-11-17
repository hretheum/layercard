// Puts PNG files side by side with captions (process images, comparisons).
// Usage: node scripts/montage.mjs out.png '<json>' where json = { title, cols, scale, jpeg: true (for a .jpg), items: [{ file, caption, crop: [x, y, w, h] }] }
import { launch } from "./browser.mjs";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const out = resolve(process.argv[2]);
const job = JSON.parse(process.argv[3] ?? "{}");
const items = job.items.map((it) => ({ ...it, url: "data:image/png;base64," + readFileSync(resolve(it.file)).toString("base64") }));
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
const png = await page.evaluate(async ({ items, job }) => {
  const imgs = [];
  for (const it of items) {
    const im = new Image();
    im.src = it.url;
    await im.decode();
    imgs.push(im);
  }
  const scale = job.scale ?? 1, cols = job.cols ?? items.length, rows = Math.ceil(items.length / cols);
  const box = (i) => items[i].crop ?? [0, 0, imgs[i].naturalWidth, imgs[i].naturalHeight];
  const fw = Math.max(...items.map((_, i) => Math.round(box(i)[2] * scale))), fh = Math.max(...items.map((_, i) => Math.round(box(i)[3] * scale)));
  const gap = 10, top = job.title ? 40 : gap, cap = 22;
  const c = document.createElement("canvas");
  c.width = cols * fw + (cols + 1) * gap;
  c.height = top + rows * (fh + cap + gap);
  const x = c.getContext("2d");
  x.fillStyle = "#14171b";
  x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = "#e6eaef";
  x.font = "600 16px system-ui, sans-serif";
  if (job.title) x.fillText(job.title, gap, 26);
  x.font = "12px ui-monospace, Menlo, monospace";
  x.imageSmoothingQuality = "high";
  items.forEach((it, i) => {
    const b = box(i), px = gap + (i % cols) * (fw + gap), py = top + Math.floor(i / cols) * (fh + cap + gap);
    x.drawImage(imgs[i], b[0], b[1], b[2], b[3], px, py, Math.round(b[2] * scale), Math.round(b[3] * scale));
    x.fillStyle = "#9aa3ae";
    x.fillText(it.caption ?? "", px, py + fh + 15);
  });
  return c.toDataURL(job.jpeg ? "image/jpeg" : "image/png", 0.9);
}, { items, job });
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, Buffer.from(png.split(",")[1], "base64"));
console.log("saved", out);
await browser.close();
