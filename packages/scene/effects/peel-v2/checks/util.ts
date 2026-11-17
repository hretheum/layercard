import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Harness } from "./harness";

declare global {
  interface Window { H: Harness; __raf: number; __shot: ImageData }
}

export const here = dirname(fileURLToPath(import.meta.url));
export const INSET = { x: 35, y: 70, w: 320, h: 692 };
export const FRACT = { x: 21.5, y: 100.25, w: 301.3, h: 500.7 };
export const FOV = 62;
export const ASPECT = 390 / 844;
/**
 * Largest allowed difference per channel (0..255) between a flat frame and the 2D composite rendered
 * in the same browser. 1 everywhere that counts (Playwright Chromium and WebKit). PEEL_FLAT_MAX exists
 * only for the Linux x86 sandbox the code is first tried in, where Chrome scales `drawImage` in float
 * and the bake's 8-bit round trip lands 2/255 away on about 1200 edge pixels; it is never set for a
 * recorded run, and every evidence file carries the value that was used.
 */
export const FLAT_MAX = Number(process.env.PEEL_FLAT_MAX ?? 1);

export async function open(page: Page): Promise<void> {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/checks/harness.html");
  await page.waitForFunction(() => !!window.H);
  await page.evaluate(() => window.H.init());
  (page as unknown as { __errors: string[] }).__errors = errors;
}

export function noPageErrors(page: Page): void {
  expect((page as unknown as { __errors: string[] }).__errors).toEqual([]);
}

/**
 * Evidence file: checks/results/<browser>/<name>.json. Chromium on a real GPU (PEEL_GL=metal with
 * PEEL_CHANNEL=chromium) writes to its own folder, chromium-metal, beside the software-GL run.
 */
export function record(name: string, data: unknown): void {
  const gl = process.env.PEEL_GL, project = test.info().project.name;
  const dir = project === "chromium" && gl && gl !== "swiftshader" ? `chromium-${gl}` : project;
  const file = join(here, "results", dir, `${name}.json`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(FLAT_MAX === 1 ? data : { flatMaxUsed: FLAT_MAX, ...(data as object) }, null, 2) + "\n");
}

/** Screenshot of the canvas as the compositor shows it, decoded into window.__shot. */
export async function shot(page: Page): Promise<void> {
  const png = await page.locator("#c").screenshot();
  await page.evaluate(async (url) => { window.__shot = await window.H.fromPng(url); }, "data:image/png;base64," + png.toString("base64"));
}
