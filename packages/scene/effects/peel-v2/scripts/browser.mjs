// One place that starts the browser for every script. PEEL_BROWSER=webkit runs Playwright WebKit;
// the default is Chromium with the same GL switches as the checks (PEEL_GL, PEEL_CHROME, PEEL_CHANNEL).
import { chromium, webkit } from "@playwright/test";

export const browserName = process.env.PEEL_BROWSER === "webkit" ? "webkit" : "chromium";

export async function launch() {
  if (browserName === "webkit") return webkit.launch();
  const gl = process.env.PEEL_GL ?? "";
  return chromium.launch({
    executablePath: process.env.PEEL_CHROME || undefined,
    channel: process.env.PEEL_CHANNEL || undefined,
    args: ["--ignore-gpu-blocklist", ...(gl === "swiftshader" ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] : gl ? [`--use-angle=${gl}`, "--enable-gpu"] : [])],
  });
}
