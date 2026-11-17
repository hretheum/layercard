// Side-by-side video of the whole sequence (host | guest over the stand-in camera), rendered frame by
// frame through the demo stage and encoded with ffmpeg. Usage: node scripts/video.mjs [out.mp4]
// Needs the dev server (npm run dev) and ffmpeg on PATH.
import { launch } from "./browser.mjs";
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(process.argv[2] ?? join(root, "artifacts/spill-v4-sequence.mp4"));
const tmp = join(root, "artifacts/tmp/video");
const fps = 30;
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
await page.goto(`http://127.0.0.1:5276/demo/index.html?quality=${process.env.SPILL_QUALITY ?? "high"}&inset=${process.env.SPILL_INSET ?? "0"}${process.env.SPILL_BASE ? `&base=${encodeURIComponent(process.env.SPILL_BASE)}` : ""}`);
await page.waitForFunction(() => window.demo && window.demo.ready);
await page.evaluate(() => window.demo.ready);
await page.evaluate(() => { window.demo.pause(true); window.demo.setPose(-14, 6, 6.7); });
const total = await page.evaluate(() => window.demo.total);
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });
const frames = Math.round(total * fps);
for (let i = 0; i <= frames; i++) {
  const T = i / fps;
  await page.evaluate((T) => {
    // a slow tilt wobble while the host idles, so the parallax is visible in the film
    const idle = T < 1.2 ? 1 : 0;
    window.demo.setTilt(idle * Math.sin(T * 2.6) * 0.9, idle * Math.sin(T * 1.9 + 1) * 0.6);
    window.demo.seq(T);
  }, T);
  writeFileSync(join(tmp, `f${String(i).padStart(4, "0")}.png`), await page.locator("#phones").screenshot());
}
await browser.close();
const ff = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(fps), "-i", join(tmp, "f%04d.png"),
  "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-movflags", "+faststart", out], { stdio: "inherit" });
if (ff.status !== 0) throw new Error("ffmpeg failed");
rmSync(tmp, { recursive: true, force: true });
console.log(`saved ${out} (${frames + 1} frames, ${total.toFixed(2)} s at ${fps} fps)`);
