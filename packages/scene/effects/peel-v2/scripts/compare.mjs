// v1 beside v2, frame by frame: the host's `depart` and the anchored guest's `explode` (frontal and
// 35 degrees off axis) around the lift of one layer. Both versions run as production bundles under a
// fake clock; nothing but the public contract is used.
//
// Before: extract v1's bundle from its tag (the tag itself is never checked out):
//   mkdir -p artifacts/tmp/v1 && for f in peel.js peel-mono.woff2; do git show peel-v1.0:packages/scene/effects/peel/dist/$f > artifacts/tmp/v1/$f; done
// Usage: node scripts/compare.mjs [outDir]   (dev server must be running; `npm run build` first)
import { launch, browserName } from "./browser.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const outDir = resolve(process.argv[2] ?? "artifacts");
// the fourth layer to leave (the mark of the example card) starts at 2.0 s
const T0 = Number(process.env.PEEL_LIFT_AT ?? 2.0);
const TIMES = [0, 0.06, 0.12, 0.18, 0.25, 0.4, 0.6, 0.9].map((d) => +(T0 + d).toFixed(3));
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1700, height: 900 }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
await page.clock.install({ time: 0 });
await page.goto(`http://127.0.0.1:5274/demo/compare.html${process.env.PEEL_BASE ? `?base=${encodeURIComponent(process.env.PEEL_BASE)}` : ""}`);
await page.waitForFunction(() => window.compare && window.compare.ready);
await page.evaluate(() => window.compare.ready);
await page.clock.pauseAt(60_000);
await page.clock.runFor(100);
// the frames are only right if the fake clock hands requestAnimationFrame the same time as performance.now()
const skew = await page.evaluate(() => window.rafSkew);
if (Math.abs(skew) > 0.5) throw new Error(`fake clock: rAF time differs from performance.now() by ${skew} ms`);

// Three frames are run for every moment and the third one shows t: whichever canvas is photographed
// before it has been redrawn in a frame is then 16 ms of timeline behind, not a whole step.
async function frame(t) {
  await page.evaluate((t) => window.compare.seek(["depart", t], ["explode", t], performance.now() + 48), t);
  await page.clock.runFor(48);
  // real time for the compositor to present what was just drawn
  await page.waitForTimeout(80);
}

const jobs = [
  { name: "host-depart", els: ["#v1host", "#v2host"], pose: [0, 0, 4.2], crop: null, scale: 0.45, title: "host depart" },
  { name: "anchored-explode-frontal", els: ["#v1guest", "#v2guest"], pose: [0, 0, 4.2], crop: [85, 232, 220, 380], scale: 0.84, title: "guest anchored explode, frontal" },
  { name: "anchored-explode-35", els: ["#v1guest", "#v2guest"], pose: [35, 0, 4.2], crop: [70, 250, 250, 380], scale: 0.74, title: "guest anchored explode, 35 degrees off axis" },
];
mkdirSync(outDir, { recursive: true });
const composer = await browser.newPage({ viewport: { width: 800, height: 600 } });
for (const job of jobs) {
  await page.evaluate((p) => window.compare.setPose(...p), job.pose);
  // a new pose is blended in over 350 ms; let that pass before any frame is taken
  await page.clock.runFor(600);
  const rows = [[], []];
  for (const t of TIMES) {
    await frame(t);
    for (let v = 0; v < 2; v++) rows[v].push("data:image/png;base64," + (await page.locator(job.els[v]).screenshot()).toString("base64"));
  }
  const sheet = await composer.evaluate(async ({ rows, job, TIMES, T0, browserName }) => {
    const first = new Image();
    first.src = rows[0][0];
    await first.decode();
    const crop = job.crop ?? [0, 0, first.naturalWidth, first.naturalHeight];
    const fw = Math.round(crop[2] * job.scale), fh = Math.round(crop[3] * job.scale), gap = 10, top = 44, lab = 26, cap = 20;
    const c = document.createElement("canvas");
    c.width = TIMES.length * fw + (TIMES.length + 1) * gap;
    c.height = top + 2 * (lab + fh) + cap + gap;
    const x = c.getContext("2d");
    x.fillStyle = "#14171b";
    x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = "#e6eaef";
    x.font = "600 16px system-ui, sans-serif";
    x.fillText(`peel — v1 beside v2: ${job.title}; one layer lifts at ${T0.toFixed(2)} s (${browserName}, production bundles)`, gap, 27);
    x.imageSmoothingQuality = "high";
    for (let v = 0; v < 2; v++) {
      const y = top + v * (lab + fh);
      x.fillStyle = v === 0 ? "#ff9d6e" : "#7fd6a4";
      x.font = "600 13px system-ui, sans-serif";
      x.fillText(v === 0 ? "v1 (tag peel-v1.0)" : "v2", gap, y + 17);
      for (let i = 0; i < TIMES.length; i++) {
        const img = new Image();
        img.src = rows[v][i];
        await img.decode();
        x.drawImage(img, crop[0], crop[1], crop[2], crop[3], gap + i * (fw + gap), y + lab, fw, fh);
      }
    }
    x.fillStyle = "#9aa3ae";
    x.font = "12px ui-monospace, Menlo, monospace";
    for (let i = 0; i < TIMES.length; i++) x.fillText(`t = ${TIMES[i].toFixed(2)} s`, gap + i * (fw + gap), top + 2 * (lab + fh) + 15);
    return c.toDataURL("image/png");
  }, { rows, job, TIMES, T0, browserName });
  const file = join(outDir, `compare-v1-v2-${job.name}.png`);
  writeFileSync(file, Buffer.from(sheet.split(",")[1], "base64"));
  console.log("saved", file);
}
await browser.close();
