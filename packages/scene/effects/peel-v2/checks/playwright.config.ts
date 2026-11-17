import { defineConfig } from "@playwright/test";

// PEEL_GL: "swiftshader" (software, any machine), "metal" / "gl" / "d3d11" (ANGLE backend on a real GPU),
// empty = the browser's default (Playwright's headless shell renders WebGL in software).
// PEEL_CHROME: path to a browser binary instead of Playwright's Chromium.
const gl = process.env.PEEL_GL ?? "";
const args = ["--ignore-gpu-blocklist"];
if (gl === "swiftshader") args.push("--use-angle=swiftshader", "--enable-unsafe-swiftshader");
else if (gl) args.push(`--use-angle=${gl}`, "--enable-gpu");

export default defineConfig({
  testDir: ".",
  testMatch: /.*\.spec\.ts$/,
  outputDir: "../artifacts/tmp/test-results",
  timeout: 180_000,
  workers: 1,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5274",
    viewport: { width: 1000, height: 900 },
    deviceScaleFactor: 1,
  },
  // Every check runs in both engines; evidence is written to checks/results/<project>/.
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        // PEEL_CHANNEL=chromium runs the full Chromium in new-headless mode (GPU access) instead of the headless shell
        channel: process.env.PEEL_CHANNEL || undefined,
        launchOptions: { args, executablePath: process.env.PEEL_CHROME || undefined },
      },
    },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
  webServer: {
    command: "npx vite --port 5274 --strictPort",
    cwd: "..",
    url: "http://127.0.0.1:5274/checks/harness.html",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
