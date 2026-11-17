// Stage looks: frames of the demo stage (host phone, guest phone over the stand-in camera) at given
// moments, poses and inputs. Usage: node scripts/stage.mjs <out-prefix> '<json>' where json =
//   { query: "quality=high", frames: [{ name, el: "#guestPhone" | "#hostPhone" | "#phones", pose: [yaw,pitch,dist] | null,
//     viewer: true, direct: false, tilt: [x,y], h: [timeline, t], g: [timeline, t] | null }] }
// Needs the dev server (npm run dev).
import { launch } from "./browser.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const [prefix, json] = process.argv.slice(2);
const job = JSON.parse(json ?? "{}");
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: Number(process.env.WINDOW_DSF ?? 1) });
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("[page]", m.text()); });
await page.goto(`http://127.0.0.1:5275/demo/index.html?${job.query ?? "quality=high"}${process.env.WINDOW_BASE ? `&base=${encodeURIComponent(process.env.WINDOW_BASE)}` : ""}`);
await page.waitForFunction(() => window.demo && window.demo.ready);
await page.evaluate(() => window.demo.ready);
await page.evaluate(() => window.demo.pause(true));
mkdirSync(dirname(prefix), { recursive: true });
for (const [i, f] of (job.frames ?? []).entries()) {
  await page.evaluate((f) => {
    const d = window.demo;
    d.setViewer(f.viewer !== false);
    d.setDirect(!!f.direct);
    d.setPose(...(f.pose ?? [null]));
    d.setTilt(...(f.tilt ?? [0, 0]));
    d.seek(f.h ?? ["idle", 0], f.g ?? null);
  }, f);
  const file = `${prefix}-${f.name ?? i}.png`;
  writeFileSync(file, await page.locator(f.el ?? "#phones").screenshot());
  console.log("saved", file);
}
await browser.close();
