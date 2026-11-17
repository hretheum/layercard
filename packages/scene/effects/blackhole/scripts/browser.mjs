// One place that starts the browser for every script. BLACKHOLE_BROWSER=webkit runs Playwright WebKit;
// the default is Chromium with the same GL switches as the checks (BLACKHOLE_GL, BLACKHOLE_CHROME, BLACKHOLE_CHANNEL).
import { chromium, webkit } from "@playwright/test";

export const browserName = process.env.BLACKHOLE_BROWSER === "webkit" ? "webkit" : "chromium";

export async function launch() {
  if (browserName === "webkit") return webkit.launch();
  const gl = process.env.BLACKHOLE_GL ?? "";
  return chromium.launch({
    executablePath: process.env.BLACKHOLE_CHROME || undefined,
    channel: process.env.BLACKHOLE_CHANNEL || undefined,
    args: ["--ignore-gpu-blocklist", ...(gl === "swiftshader" ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] : gl ? [`--use-angle=${gl}`, "--enable-gpu"] : [])],
  });
}
