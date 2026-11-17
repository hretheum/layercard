import { expect, type Page } from "@playwright/test";
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

/** Evidence file: checks/results/<name>.json */
export function record(name: string, data: unknown): void {
  const file = join(here, "results", `${name}.json`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}

/** Screenshot of the canvas as the compositor shows it, decoded into window.__shot. */
export async function shot(page: Page): Promise<void> {
  const png = await page.locator("#c").screenshot();
  await page.evaluate(async (url) => { window.__shot = await window.H.fromPng(url); }, "data:image/png;base64," + png.toString("base64"));
}
