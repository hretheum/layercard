// Self-test of the tracking spike without phones: screenshot the host page, warp it into a fake
// camera feed with ffmpeg, feed it to Chrome as the camera and read the guest stats.
// Usage: node checks/tracking-selftest.mjs [baseUrl] [size] [hostWidthPx]
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const base = process.argv[2] ?? "http://127.0.0.1:5173";
const size = process.argv[3] ?? "size=0.22";
const hostW = process.argv[4] ?? "300"; // host screen width inside a 720 px wide camera frame
const tmp = "/tmp/layercard-selftest";
mkdirSync(tmp, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });
const host = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
await host.goto(`${base}/host.html?${size}`);
await host.waitForTimeout(500);
await host.screenshot({ path: `${tmp}/host.png` });
await browser.close();

// Phone held at arm's length: host screen hostW px wide in a 720x1280 frame, mild keystone, grey surround.
const filter =
  `[1:v]scale=${hostW}:-1,format=rgba,pad=iw+40:ih+40:20:20:color=0x101010[p];` +
  `[p]perspective=x0=0:y0=12:x1=W:y1=0:x2=0:y2=H-12:x3=W:y3=H:sense=destination[s];` +
  `[0:v][s]overlay=(W-w)/2:(H-h)/2,format=yuv420p`;
execFileSync("ffmpeg", [
  "-y", "-loglevel", "error",
  "-f", "lavfi", "-i", "color=c=0x6b6b6b:s=720x1280:r=30:d=1",
  "-i", `${tmp}/host.png`,
  "-filter_complex", filter,
  "-frames:v", "30", `${tmp}/fake.y4m`,
]);

const guestBrowser = await chromium.launch({
  channel: "chrome",
  args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", `--use-file-for-fake-video-capture=${tmp}/fake.y4m`],
});
const ctx = await guestBrowser.newContext({ viewport: { width: 390, height: 844 }, permissions: ["camera"] });
const guest = await ctx.newPage();
guest.on("pageerror", (e) => console.log("pageerror", e.message));
await guest.goto(`${base}/guest.html?${size}`);
await guest.click("#start");
await guest.waitForTimeout(4000);
console.log(await guest.textContent("#stats"));
await guest.screenshot({ path: `${tmp}/guest.png` });
await guestBrowser.close();
console.log(`screens in ${tmp}`);
