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
 * in the same browser. 1 everywhere that counts (Playwright Chromium and WebKit). BLACKHOLE_FLAT_MAX exists
 * only for the Linux x86 sandbox the code is first tried in, where Chrome scales `drawImage` in float
 * and the bake's 8-bit round trip lands 2/255 away on about 1200 edge pixels; it is never set for a
 * recorded run, and every evidence file carries the value that was used.
 */
export const FLAT_MAX = Number(process.env.BLACKHOLE_FLAT_MAX ?? 1);

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
 * Evidence file: checks/results/<browser>/<name>.json. Chromium on a real GPU (BLACKHOLE_GL=metal with
 * BLACKHOLE_CHANNEL=chromium) writes to its own folder, chromium-metal, beside the software-GL run.
 */
export function record(name: string, data: unknown): void {
  const gl = process.env.BLACKHOLE_GL, project = test.info().project.name;
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

// ---------------------------------------------------------------- the stage (host, stand-in camera, guest)

/** Eyes of the stand-in camera: [yaw, pitch, distance] of the fake pose (degrees, card widths). 4.5, 6.75 and 9 card widths are about 30, 45 and 60 cm for a screen 6.7 cm wide. */
export const EYES: [number, number, number][] = [
  [0, 0, 4.5], [0, 0, 6.75], [0, 0, 9],
  [20, 0, 4.5], [-20, 0, 9], [20, 0, 9], [-20, 0, 4.5], [0, 20, 6.75], [0, -20, 6.75],
  [35, 0, 6.75], [-35, 0, 6.75], [0, 35, 6.75], [0, -35, 6.75], [35, 0, 4.5], [-35, 0, 9], [0, 35, 9], [0, -35, 4.5],
  [25, 25, 6.75], [-35, -20, 5.5],
];

/** Opens the demo stage (host and guest side by side over the stand-in camera) with both effects paused. */
export async function openStage(page: Page, query = "quality=test"): Promise<void> {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`/demo/index.html?${query}`);
  await page.waitForFunction(() => !!(window as any).demo && !!(window as any).demo.ready);
  await page.evaluate(async () => { await (window as any).demo.ready; (window as any).demo.pause(true); });
  (page as unknown as { __errors: string[] }).__errors = errors;
}

export type V3 = [number, number, number];

/** A column-major 4x4 matrix times a point: [x, y, z, w]. */
export function xf(m: number[], p: V3): [number, number, number, number] {
  return [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
    m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15],
  ];
}

/** Where a pinhole camera (vertical field of view `fov`, image w x h CSS px) sees a card-space point, given the pose (card -> camera). */
export function camPx(pose: number[], p: V3, w = 390, h = 844, fov = FOV): [number, number] {
  const c = xf(pose, p), f = 1 / Math.tan((fov * Math.PI) / 360);
  return [(0.5 + (0.5 * f * c[0]) / ((w / h) * -c[2])) * w, (0.5 - (0.5 * f * c[1]) / -c[2]) * h];
}

/** The camera's position in card space: the inverse of the (rigid) pose applied to the origin. */
export function eyeOf(m: number[]): V3 {
  const x = m[12], y = m[13], z = m[14];
  return [-(m[0] * x + m[1] * y + m[2] * z), -(m[4] * x + m[5] * y + m[6] * z), -(m[8] * x + m[9] * y + m[10] * z)];
}

/** Where the line from `eye` to the card-space point `p` meets the glass (z = 0): card-space x, y. */
export function onGlass(eye: V3, p: V3): [number, number] {
  const k = eye[2] / (eye[2] - p[2]);
  return [eye[0] + (p[0] - eye[0]) * k, eye[1] + (p[1] - eye[1]) * k];
}
