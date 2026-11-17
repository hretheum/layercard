// A17, A18 — frame times per role and tier written to JSON; texture memory against the tier budgets;
// bundle and font size. The 6 ms budget is asserted only on a real GPU (software GL is recorded, not judged).
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { ASPECT, FOV, INSET, here, noPageErrors, open, record } from "./util";

test.use({ deviceScaleFactor: 2 });

test("perf: frame times, texture memory, bundle size", async ({ page }) => {
  test.setTimeout(420_000);
  await open(page);
  const runs = await page.evaluate(async ({ INSET, FOV, ASPECT }) => {
    const H = window.H;
    const stat = (a: number[]) => {
      const s = [...a].sort((x, y) => x - y), q = (p: number) => (s.length ? +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(3) : 0);
      return { n: s.length, median: q(0.5), p95: q(0.95), max: q(1) };
    };
    const out: unknown[] = [];
    for (const role of ["host", "guest"] as const) {
      for (const quality of ["high", "mid", "low"] as const) {
        H.freshCanvas();
        await H.mount({ role, quality, assembleRect: role === "guest" ? INSET : undefined });
        const h = H.handle!, T = h.test!;
        T.setFinish(true);
        if (role === "guest") {
          h.setProjection(FOV, ASPECT);
          h.setPose(T.fakePose(-14, 9, 5.6));
        } else {
          h.setTilt(0.5, -0.4);
        }
        const timelines = role === "host" ? ["idle", "connect", "depart", "rebuild"] : ["explode", "fly", "assemble"];
        const per: Record<string, unknown> = {};
        for (const tl of timelines) {
          const intervals: number[] = [];
          let last = 0, on = true;
          const tick = (t: number) => { if (last) intervals.push(t - last); last = t; if (on) requestAnimationFrame(tick); };
          requestAnimationFrame(tick);
          const f0 = T.frames();
          if (tl === "idle") { void h.play("idle"); await new Promise((r) => setTimeout(r, 1500)); }
          else await h.play(tl as any);
          on = false;
          const st = T.stats() as any;
          per[tl] = { frames: T.frames() - f0, sceneMs: stat(st.cpuMs.slice(-Math.min(240, T.frames() - f0))), rafIntervalMs: stat(intervals), drawCalls: st.calls };
        }
        const st = T.stats() as any;
        out.push({ role, quality, pixelRatio: st.pr, buffer: st.buffer, textureMB: +(st.texBytes / 1048576).toFixed(2), budgetMB: st.budgetBytes / 1048576, gpu: st.gpu, timelines: per });
        h.dispose();
        H.handle = null;
      }
    }
    return out;
  }, { INSET, FOV, ASPECT }) as { role: string; quality: string; textureMB: number; budgetMB: number; gpu: string; timelines: Record<string, { sceneMs: { median: number } }> }[];

  const js = readFileSync(join(here, "../dist/peel.js"));
  const font = readFileSync(join(here, "../dist/peel-mono.woff2"));
  const sizes = { bundleBytes: js.length, bundleGzipBytes: gzipSync(js).length, fontBytes: font.length };
  const gpu = runs[0].gpu;
  const software = /swiftshader|llvmpipe|software/i.test(gpu);
  record("perf", {
    note: "sceneMs = update + render + gl.finish() per frame, measured inside the effect (test build). rafIntervalMs = time between animation frames while the timeline played.",
    userAgent: await page.evaluate(() => navigator.userAgent), gpu, softwareRenderer: software, devicePixelRatio: 2, canvasCss: [390, 844], sizes, runs,
  });
  expect(sizes.bundleGzipBytes).toBeLessThanOrEqual(120 * 1024);
  expect(sizes.fontBytes).toBeLessThanOrEqual(40 * 1024);
  for (const r of runs) {
    expect(r.textureMB).toBeLessThanOrEqual(r.budgetMB);
    if (!software && r.quality === "high") for (const t of Object.values(r.timelines)) expect(t.sceneMs.median).toBeLessThanOrEqual(6);
  }
  noPageErrors(page);
});
