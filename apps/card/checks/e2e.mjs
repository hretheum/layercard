// End-to-end check without phones: a host page, a scripted stand-in guest to make the host show its
// marker, a fake camera made from that screenshot, then a real guest page that tracks it and lands.
// Usage: node checks/e2e.mjs [baseUrl] [outDir]
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const base = process.argv[2] ?? "http://127.0.0.1:8787";
const out = process.argv[3] ?? "/tmp/layercard-e2e";
mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

const hostBrowser = await chromium.launch({ channel: "chrome" });
const host = await hostBrowser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
host.on("pageerror", (e) => log("host pageerror", e.message));
host.on("console", (m) => { if (m.type() === "error") log("host console", m.text()); });
await host.goto(`${base}/k/host/${process.env.FX ? `?fx=${process.env.FX}` : ""}`);
await host.waitForFunction(() => window.__layercard?.roomId, null, { timeout: 15000 });
const { roomId, guestUrl } = await host.evaluate(() => ({ roomId: window.__layercard.roomId, guestUrl: window.__layercard.guestUrl }));
log("room", roomId, guestUrl);
await sleep(800);
await host.screenshot({ path: `${out}/01-host-idle.png` });

// Stand-in guest so the host dissolves the QR and shows the marker.
const ws = new WebSocket(`${base.replace("http", "ws")}/k/room/${roomId}?role=guest`);
await new Promise((r) => (ws.onopen = r));
ws.send(JSON.stringify({ type: "hello", role: "guest", id: "standin", g: 0 }));
await sleep(1500);
await host.screenshot({ path: `${out}/02-host-marker.png` });
ws.send(JSON.stringify({ type: "bye", id: "standin" }));
ws.close();
await sleep(2200);
log("host state after stand-in", await host.evaluate(() => window.__layercard.state));

// Fake camera: the host screen with the marker, ~45% of a 720 px frame, mild keystone.
const filter =
  "[1:v]scale=330:-1,format=rgba,pad=iw+40:ih+40:20:20:color=0x101010[p];" +
  "[p]perspective=x0=0:y0=14:x1=W:y1=0:x2=0:y2=H-14:x3=W:y3=H:sense=destination[s];" +
  "[0:v][s]overlay=(W-w)/2:(H-h)/2,format=yuv420p";
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "lavfi", "-i", "color=c=0x5a5a5a:s=720x1280:r=30:d=1",
  "-i", `${out}/02-host-marker.png`, "-filter_complex", filter, "-frames:v", "30", `${out}/fake.y4m`]);

const guestBrowser = await chromium.launch({
  channel: "chrome",
  args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", `--use-file-for-fake-video-capture=${out}/fake.y4m`],
});
const gctx = await guestBrowser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, permissions: ["camera"] });
const guest = await gctx.newPage();
guest.on("pageerror", (e) => log("guest pageerror", e.message));
guest.on("console", (m) => { if (m.type() === "error") log("guest console", m.text()); });
await guest.goto(guestUrl.replace(/^https?:\/\/[^/]+/, base));
await sleep(400);
await guest.screenshot({ path: `${out}/03-guest-intro.png` });
log("guest intro:", await guest.textContent("#owner"), "| button hidden:", await guest.evaluate(() => document.getElementById("action").hidden));
const shots = [1500, 3000, 4500, 6000, 7500, 9000, 10500];
let last = 0;
for (const [i, ms] of shots.entries()) {
  await sleep(ms - last); last = ms;
  await guest.screenshot({ path: `${out}/04-guest-${String(i).padStart(2, "0")}-${ms}ms.png` });
  log(`t+${ms}ms track`, JSON.stringify(await guest.evaluate(() => window.__track ?? null)));
  if (i === 2) await host.screenshot({ path: `${out}/05-host-departing.png` });
  if (i === 4) await host.screenshot({ path: `${out}/06-host-outlines.png` });
}
await guest.waitForFunction(() => document.getElementById("page")?.classList.contains("shown"), null, { timeout: 15000 });
await sleep(600);
await guest.screenshot({ path: `${out}/07-guest-card.png`, fullPage: true });
log("guest landed; hint:", await guest.textContent("#hint"));
await sleep(2500);
log("host state at end", await host.evaluate(() => window.__layercard.state));
log("host viewer relay", JSON.stringify(await host.evaluate(() => window.__viewer ?? null)));
await host.screenshot({ path: `${out}/08-host-rebuilt.png` });
await guestBrowser.close();
await hostBrowser.close();
log("done ->", out);
