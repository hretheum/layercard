// Contact sheets (12 frames per role x timeline, JPEG) through the demo stage: the host on its own (tilt eye)
// and drawing for a viewer at 20 and 35 degrees, the guest anchored (frontal, 20 and 35 degrees off axis) and unanchored. Used for
// milestone looks and for the final artifacts. Usage: node scripts/sheets.mjs [outDir] [filter]   (dev server must be running)
import { browserName, launch } from "./browser.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const outDir = resolve(process.argv[2] ?? "artifacts");
const filter = process.argv[3] ?? "";
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("[page]", m.text()); });
await page.goto(`http://127.0.0.1:5277/demo/index.html?quality=${process.env.BLACKHOLE_QUALITY ?? "high"}&inset=${process.env.BLACKHOLE_INSET ?? "0"}${process.env.BLACKHOLE_BASE ? `&base=${encodeURIComponent(process.env.BLACKHOLE_BASE)}` : ""}`);
await page.waitForFunction(() => window.demo && window.demo.ready);
await page.evaluate(() => window.demo.ready);
await page.evaluate(() => window.demo.pause(true));
const D = await page.evaluate(() => window.demo.durations());

// role, timeline, pose ([yaw, pitch, dist] | null), tilt, the host frame that accompanies a guest frame
const END = 1e3;
const explode = (t) => ["explode", t], depart = (t) => ["depart", t];
const guest = (name, pose) => [
  { name: `guest-${name}-explode`, el: "#guestPhone", pose, h: depart, g: explode, len: D.explode },
  { name: `guest-${name}-fly`, el: "#guestPhone", pose, h: () => ["depart", END], g: (t) => ["fly", t], len: D.fly },
  { name: `guest-${name}-assemble`, el: "#guestPhone", pose, h: () => ["depart", END], g: (t) => ["assemble", t], len: D.assemble },
];
const jobs = [
  // the host on its own: no viewer, the eye comes from tilt
  { name: "host-idle", el: "#hostPhone", viewer: false, tilt: (t) => [Math.sin(t * 1.3), Math.cos(t * 0.9) * 0.8], h: (t) => ["idle", t], g: null, len: 5 },
  { name: "host-connect", el: "#hostPhone", viewer: false, h: (t) => ["connect", t], g: null, len: D.connect },
  { name: "host-depart", el: "#hostPhone", viewer: false, tilt: () => [0.6, -0.4], h: depart, g: null, len: D.depart },
  { name: "host-rebuild", el: "#hostPhone", viewer: false, tilt: () => [0.6, -0.4], h: (t) => ["rebuild", t], g: null, len: D.rebuild },
  // the host drawing for a guest camera 20 degrees to the side (what the screen shows; meant to be seen from there)
  { name: "host-depart-viewer20", el: "#hostPhone", pose: [20, 6, 5.6], h: depart, g: null, len: D.depart },
  { name: "host-depart-viewer35", el: "#hostPhone", pose: [35, 0, 5.6], h: depart, g: null, len: D.depart },
  ...guest("anchored-frontal", [0, 0, 5.6]),
  ...guest("anchored-20", [20, 6, 5.6]),
  ...guest("anchored-35", [35, 0, 5.6]),
  ...guest("unanchored", null),
].filter((j) => j.name.includes(filter));

mkdirSync(outDir, { recursive: true });
const composer = await browser.newPage({ viewport: { width: 800, height: 600 } });
for (const job of jobs) {
  const frames = [];
  await page.evaluate(({ p, viewer }) => { window.demo.setViewer(viewer); window.demo.setPose(...(p ?? [null])); }, { p: job.pose === undefined ? [-14, 9, 5.6] : job.pose, viewer: job.viewer !== false });
  for (let i = 0; i < 12; i++) {
    const t = (job.len * i) / 11;
    await page.evaluate(({ h, g, tilt }) => { window.demo.setTilt(tilt[0], tilt[1]); window.demo.seek(h, g); }, { h: job.h(t), g: job.g ? job.g(t) : null, tilt: job.tilt ? job.tilt(t) : [0, 0] });
    const png = await page.locator(job.el).screenshot();
    frames.push({ t, url: "data:image/png;base64," + png.toString("base64") });
  }
  const sheet = await composer.evaluate(async ({ frames, title }) => {
    const cols = 6, fw = 234, fh = 506, gap = 10, top = 40, cap = 22;
    const c = document.createElement("canvas");
    c.width = cols * fw + (cols + 1) * gap;
    c.height = top + 2 * (fh + cap + gap);
    const x = c.getContext("2d");
    x.fillStyle = "#14171b";
    x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = "#e6eaef";
    x.font = "600 16px system-ui, sans-serif";
    x.fillText(title, gap, 26);
    x.font = "12px ui-monospace, Menlo, monospace";
    x.imageSmoothingQuality = "high";
    for (let i = 0; i < frames.length; i++) {
      const img = new Image();
      img.src = frames[i].url;
      await img.decode();
      const px = gap + (i % cols) * (fw + gap), py = top + Math.floor(i / cols) * (fh + cap + gap);
      x.drawImage(img, px, py, fw, fh);
      x.fillStyle = "#9aa3ae";
      x.fillText(`t = ${frames[i].t.toFixed(2)} s`, px, py + fh + 15);
    }
    return c.toDataURL("image/jpeg", 0.9);
  }, { frames, title: `blackhole ${process.env.BLACKHOLE_TITLE ?? "v5"} — ${job.name} (12 frames, ${job.len.toFixed(2)} s, ${browserName})` });
  const file = join(outDir, `sheet-${job.name}${process.env.BLACKHOLE_SUFFIX ?? ""}.jpg`);
  writeFileSync(file, Buffer.from(sheet.split(",")[1], "base64"));
  console.log("saved", file);
}
await browser.close();
