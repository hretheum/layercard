// Videos through the demo stage (host | guest over the stand-in camera), rendered frame by frame and
// encoded with ffmpeg. Usage: node scripts/video.mjs [out.mp4] [sequence | orbit]
//   sequence (default): the whole sequence side by side, the camera moving slowly as a hand would
//   orbit: the fanned-out hold (2.4 s into the event) while the camera goes from 35 degrees left to 35 degrees right and back
// Needs the dev server (npm run dev) and ffmpeg on PATH.
import { launch } from "./browser.mjs";
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mode = process.argv[3] === "orbit" ? "orbit" : "sequence";
const out = resolve(process.argv[2] ?? join(root, `artifacts/window-${mode}.mp4`));
const tmp = join(root, `artifacts/tmp/video-${mode}`);
const fps = 30;
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
await page.goto(`http://127.0.0.1:5275/demo/index.html?quality=${process.env.WINDOW_QUALITY ?? "high"}&inset=${process.env.WINDOW_INSET ?? "0"}${process.env.WINDOW_BASE ? `&base=${encodeURIComponent(process.env.WINDOW_BASE)}` : ""}`);
await page.waitForFunction(() => window.demo && window.demo.ready);
await page.evaluate(() => window.demo.ready);
await page.evaluate(() => { window.demo.pause(true); window.demo.setPose(-14, 9, 5.6); });
const total = mode === "orbit" ? 7 : await page.evaluate(() => window.demo.total);
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });
const frames = Math.round(total * fps);
for (let i = 0; i <= frames; i++) {
  const T = i / fps;
  await page.evaluate(({ T, mode }) => {
    const d = window.demo;
    if (mode === "orbit") {
      // 35 degrees left -> 35 degrees right in 3 s, a short rest, and back; the scene holds at the fanned-out moment
      const u = T < 3 ? T / 3 : T < 3.5 ? 1 : T < 6.5 ? 1 - (T - 3.5) / 3 : 0, e = u * u * (3 - 2 * u);
      d.setPose(-35 + 70 * e, 6, 4.8);
      d.seek(["depart", 2.4], ["explode", 2.4]);
      return;
    }
    // a slow tilt wobble while the host idles, so the parallax is visible in the film
    const idle = T < 1.2 ? 1 : 0;
    d.setTilt(idle * Math.sin(T * 2.6) * 0.9, idle * Math.sin(T * 1.9 + 1) * 0.6);
    // the guest's hand is never still: the camera drifts a few degrees, and the host's picture follows it
    d.setPose(-14 + 9 * Math.sin(T * 0.7), 9 + 4 * Math.sin(T * 0.53 + 1), 5.6);
    d.seq(T);
  }, { T, mode });
  writeFileSync(join(tmp, `f${String(i).padStart(4, "0")}.png`), await page.locator("#phones").screenshot());
}
await browser.close();
const ff = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(fps), "-i", join(tmp, "f%04d.png"),
  "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-movflags", "+faststart", out], { stdio: "inherit" });
if (ff.status !== 0) throw new Error("ffmpeg failed");
rmSync(tmp, { recursive: true, force: true });
console.log(`saved ${out} (${frames + 1} frames, ${total.toFixed(2)} s at ${fps} fps)`);
