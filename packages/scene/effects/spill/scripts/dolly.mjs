// The stand-in camera dolly film: the guest's view over the stand-in room while the file spills,
// the camera stepping back from 30 to 60 cm during the hold at the end of `explode`, then (time
// frozen) orbiting the host phone and coming back, so the room can be seen to stay put.
// Rendered frame by frame through the demo stage with `step` (the pose filter and the label easing
// run as they do live) and encoded with ffmpeg.
// Usage: node scripts/dolly.mjs [out.mp4]      Needs the dev server (npm run dev) and ffmpeg on PATH.
// SPILL_JITTER=1 adds the hand-held jitter (1.5 px shift + turn, 30 Hz). SPILL_BASE picks another card.
import { launch } from "./browser.mjs";
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(process.argv[2] ?? join(root, "artifacts/spill-v4-dolly.mp4"));
const tmp = join(root, "artifacts/tmp/dolly");
const fps = 30, CM = 1 / 7;
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: Number(process.env.SPILL_DSF ?? 2) });
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
await page.goto(`http://127.0.0.1:5276/demo/index.html?quality=${process.env.SPILL_QUALITY ?? "high"}${process.env.SPILL_BASE ? `&base=${encodeURIComponent(process.env.SPILL_BASE)}` : ""}`);
await page.waitForFunction(() => window.demo && window.demo.ready);
await page.evaluate(() => window.demo.ready);
await page.evaluate(() => window.demo.pause(true));
const D = await page.evaluate(() => window.demo.durations());

const ease = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const HOLD = 5.9;               // the last sheet has settled and its chrome is drawn
const ORBIT = 4.5;              // seconds of orbit after the event, time frozen at its end
const total = D.explode + ORBIT;
/** Camera at film time T: [yaw, pitch, dist], and the event time. */
function shot(T) {
  if (T <= D.explode) {
    const k = ease((T - HOLD) / (D.explode - HOLD));
    return { t: T, pose: [-8 - 6 * k, 4 + 2 * k, (30 + 30 * k) * CM] };
  }
  // orbit: out to +32 degrees and back to the front, closing in to 47 cm
  const x = (T - D.explode) / ORBIT, swing = Math.sin(Math.PI * ease(x));
  return { t: D.explode, pose: [-14 + 46 * swing + 14 * ease(x), 6 - 2 * swing, (60 - 13 * ease(x)) * CM] };
}

rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });
if (process.env.SPILL_JITTER === "1") await page.evaluate(() => window.demo.setJitter(true));
const frames = Math.round(total * fps);
for (let i = 0; i <= frames; i++) {
  const { t, pose } = shot(i / fps);
  await page.evaluate(({ t, pose, dt, first }) => {
    window.demo.setPose(pose[0], pose[1], pose[2]);
    if (first) window.demo.seek(["depart", t], ["explode", t]);
    else window.demo.step(["depart", t], ["explode", t], dt);
  }, { t, pose, dt: 1 / fps, first: i === 0 });
  writeFileSync(join(tmp, `f${String(i).padStart(4, "0")}.png`), await page.locator("#guestPhone").screenshot());
}
await browser.close();
const ff = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(fps), "-i", join(tmp, "f%04d.png"),
  "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-movflags", "+faststart", out], { stdio: "inherit" });
if (ff.status !== 0) throw new Error("ffmpeg failed");
rmSync(tmp, { recursive: true, force: true });
console.log(`saved ${out} (${frames + 1} frames, ${total.toFixed(2)} s at ${fps} fps)`);
