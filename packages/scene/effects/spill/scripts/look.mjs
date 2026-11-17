// Quick look: renders frames through the check harness and saves PNGs.
// Usage: node scripts/look.mjs <out-prefix> '<json>' where json = { mount: {...}, tilt: [x,y], pose: [yaw,pitch,dist]|null,
//   frames: [[timeline, t], ...], backdrop: "#rrggbb" }
// Needs the dev server (npm run dev). SPILL_CHROME can point at a browser binary.
import { launch } from "./browser.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const [prefix, json] = process.argv.slice(2);
const job = JSON.parse(json ?? "{}");
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 900 }, deviceScaleFactor: Number(process.env.SPILL_DSF ?? 1) });
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log("[page]", m.type(), m.text()); });
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
await page.goto("http://127.0.0.1:5276/checks/harness.html");
await page.waitForFunction(() => !!window.H);
const out = await page.evaluate(async (job) => {
  const H = window.H;
  await H.mount(job.mount ?? {});
  const h = H.handle;
  h.test.setPaused(true);
  if (job.tilt) h.setTilt(job.tilt[0], job.tilt[1]);
  if (job.proj) h.setProjection(job.proj[0], job.proj[1]);
  if (job.pose) h.setPose(h.test.fakePose(...job.pose));
  const shots = [];
  for (const [tl, t] of job.frames ?? [["idle", 0]]) {
    h.test.seek(tl, t);
    shots.push({ tl, t, png: H.png(job.backdrop) });
  }
  let diff = null;
  if (job.diff) {
    h.test.seek(job.diff[0], job.diff[1]);
    diff = H.compare(H.pixels(), H.reference(job.ref ?? {}));
  }
  return { shots, diff, stats: h.test.stats(), state: job.state ? h.test.state() : null };
}, job);
mkdirSync(dirname(prefix), { recursive: true });
for (const s of out.shots) {
  const file = `${prefix}-${s.tl}-${String(s.t).replace(".", "_")}.png`;
  writeFileSync(file, Buffer.from(s.png.split(",")[1], "base64"));
  console.log("saved", file);
}
if (out.diff) console.log("diff", JSON.stringify(out.diff));
const { cpuMs, ...stats } = out.stats;
console.log("stats", JSON.stringify(stats));
if (out.state) console.log("state", JSON.stringify(out.state));
await browser.close();
