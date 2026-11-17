// Fallback paths: solo link, stale room, busy host, camera refused. Each must land on the card page.
// Usage: node checks/fallbacks.mjs [baseUrl]
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://127.0.0.1:8787";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const landed = (page, timeout = 40000) =>
  page.waitForFunction(() => document.getElementById("page")?.classList.contains("shown"), null, { timeout }).then(() => true, () => false);

async function guestPage(args = [], permissions = []) {
  const b = await chromium.launch({ channel: "chrome", args });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, permissions });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => console.log("pageerror", e.message));
  return { b, p };
}

// A: link without a room
{ const { b, p } = await guestPage(); const t0 = Date.now(); await p.goto(`${base}/k/${process.env.FX ? `#fx=${process.env.FX}` : ""}`);
  results.push(["solo link", await landed(p), Date.now() - t0]); await b.close(); }

// B: stale room (nobody hosts it)
{ const { b, p } = await guestPage(["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"], ["camera"]);
  const t0 = Date.now(); await p.goto(`${base}/k/#r=zzzzzzzzzz.0${process.env.FX ? `&fx=${process.env.FX}` : ""}`);
  results.push(["stale room", await landed(p), Date.now() - t0]); await b.close(); }

// Host for C and D
const hb = await chromium.launch({ channel: "chrome" });
const host = await (await hb.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await host.goto(`${base}/k/host/${process.env.FX ? `?fx=${process.env.FX}` : ""}`);
await host.waitForFunction(() => window.__layercard?.roomId, null, { timeout: 20000 });
const { roomId } = await host.evaluate(() => ({ roomId: window.__layercard.roomId }));
const state = () => host.evaluate(() => window.__layercard.state);

// C: host busy with another guest
{ const ws = new WebSocket(`${base.replace("http", "ws")}/k/room/${roomId}?role=guest`);
  await new Promise((r) => (ws.onopen = r));
  ws.send(JSON.stringify({ type: "hello", role: "guest", id: "standin", g: 0 }));
  await sleep(800);
  const { b, p } = await guestPage(["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"], ["camera"]);
  const t0 = Date.now(); await p.goto(`${base}/k/#r=${roomId}.0${process.env.FX ? `&fx=${process.env.FX}` : ""}`);
  results.push(["busy host", await landed(p), Date.now() - t0]); await b.close();
  ws.send(JSON.stringify({ type: "bye", id: "standin" })); ws.close();
  await sleep(2500); results.push(["host idle after stand-in left", (await state()) === "idle", 0]); }

// D: camera refused
{ const { b, p } = await guestPage(["--deny-permission-prompts"], []);
  const t0 = Date.now(); await p.goto(`${base}/k/#r=${roomId}.0${process.env.FX ? `&fx=${process.env.FX}` : ""}`);
  results.push(["camera refused", await landed(p, 50000), Date.now() - t0]); await b.close();
  await sleep(3500); results.push(["host idle after refused guest", (await state()) === "idle", 0]); }

await hb.close();
for (const [name, ok, ms] of results) console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ms ? `  (${(ms / 1000).toFixed(1)} s)` : ""}`);
process.exit(results.every((r) => r[1]) ? 0 : 1);
