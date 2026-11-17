// One place that starts the browser for every script. SPILL_BROWSER=webkit runs Playwright WebKit;
// the default is Chromium with the same GL switches as the checks (SPILL_GL, SPILL_CHROME, SPILL_CHANNEL).
import { chromium, webkit } from "@playwright/test";

export const browserName = process.env.SPILL_BROWSER === "webkit" ? "webkit" : "chromium";

export async function launch() {
  if (browserName === "webkit") return webkit.launch();
  const gl = process.env.SPILL_GL ?? "";
  return chromium.launch({
    executablePath: process.env.SPILL_CHROME || undefined,
    channel: process.env.SPILL_CHANNEL || undefined,
    args: ["--ignore-gpu-blocklist", ...(gl === "swiftshader" ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] : gl ? [`--use-angle=${gl}`, "--enable-gpu"] : [])],
  });
}
