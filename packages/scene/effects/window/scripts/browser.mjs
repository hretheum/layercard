// One place that starts the browser for every script. WINDOW_BROWSER=webkit runs Playwright WebKit;
// the default is Chromium with the same GL switches as the checks (WINDOW_GL, WINDOW_CHROME, WINDOW_CHANNEL).
import { chromium, webkit } from "@playwright/test";

export const browserName = process.env.WINDOW_BROWSER === "webkit" ? "webkit" : "chromium";

export async function launch() {
  if (browserName === "webkit") return webkit.launch();
  const gl = process.env.WINDOW_GL ?? "";
  return chromium.launch({
    executablePath: process.env.WINDOW_CHROME || undefined,
    channel: process.env.WINDOW_CHANNEL || undefined,
    args: ["--ignore-gpu-blocklist", ...(gl === "swiftshader" ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] : gl ? [`--use-angle=${gl}`, "--enable-gpu"] : [])],
  });
}
