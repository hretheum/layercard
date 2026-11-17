// A1, A13, A19, A20 — exports, durations, events, requests, errors, and what the production bundle contains.
import { expect, test } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { here, noPageErrors, open, record } from "./util";

test("contract: exports, durations, play, events, replaceLayer, rejections", async ({ page }) => {
  await open(page);
  const r = await page.evaluate(async () => {
    const H = window.H;
    const src = await import("/src/index.ts" as string), dist = await import("/dist/window.js" as string);
    const d1 = src.durations(H.manifest), d2 = src.durations(H.manifest);
    const small = { ...H.manifest!, layers: H.manifest!.layers.filter((l) => !["grid", "role"].includes(l.id)) };
    const out: Record<string, unknown> = {
      exportsSrc: Object.keys(src).sort(), exportsDist: Object.keys(dist).sort(),
      supported: await src.supported(), supportedDist: await dist.supported(),
      durations: d1, durationsPure: JSON.stringify(d1) === JSON.stringify(d2) && d1 !== d2,
      durationsDist: dist.durations(H.manifest), durationsFourFlying: src.durations(small),
    };
    await H.mount({ test: false });
    out.hooksWithoutTestFlag = !!H.handle!.test;
    out.setViewer = typeof H.handle!.setViewer;
    out.wrongRole = await H.handle!.play("explode").then(() => "resolved", (e: Error) => e.message);
    out.where = H.handle!.where();
    // events: start depart 5 s in the past, wait for it to finish
    H.events.length = 0;
    await H.handle!.play("depart", { at: performance.now() - 7000 });
    out.events = [...H.events];
    await H.handle!.replaceLayer("qr", "layers/qr.png");
    out.replaceUnknown = await H.handle!.replaceLayer("nope", "layers/qr.png").then(() => "resolved", (e: Error) => e.message);
    out.badImage = await src.mount(document.createElement("canvas"), { role: "host", layers: H.manifest!, baseUrl: "/examples/nowhere/", quality: "test", reduced: false })
      .then(() => "resolved", (e: Error) => e.message);
    out.badRole = await src.mount(document.createElement("canvas"), { role: "x" as any, layers: H.manifest!, baseUrl: H.base, quality: "test", reduced: false })
      .then(() => "resolved", (e: Error) => e.message);
    return out;
  }) as any;
  // a fresh page with the request log on: besides the page's own scripts and the manifest the harness
  // fetches, mounting may only request the manifest's layer files and the bundled font
  const clean = await page.context().newPage();
  const log: string[] = [];
  clean.on("request", (q) => { if (q.resourceType() !== "script" && q.resourceType() !== "document") log.push(new URL(q.url()).pathname); });
  await clean.goto("/checks/harness.html");
  await clean.waitForFunction(() => !!window.H);
  await clean.evaluate(async () => {
    const H = window.H;
    H.manifest = await (await fetch(H.base + "layers.json")).json();
    await H.mount({ role: "guest", test: false });
    await new Promise((res) => setTimeout(res, 300));
  });
  const mountRequests = [...new Set(log)].filter((p) => p !== "/examples/jane-maker/layers.json" && p !== "/favicon.ico").sort();
  await clean.close();

  const js = readFileSync(join(here, "../dist/window.js"), "utf8");
  const imports = [...js.matchAll(/(?:from|import)\s*["']([^"']+)["']/g)].map((m) => m[1]);
  const bundle = {
    imports: [...new Set(imports)],
    hasTestHooks: /fakePose|setPaused|setFinish|setDirect/.test(js),
    fontUrlLiteral: js.includes('new URL("./window-mono.woff2", import.meta.url)'),
    fontShipped: existsSync(join(here, "../dist/window-mono.woff2")) && existsSync(join(here, "../dist/OFL.txt")),
    licence: readFileSync(join(here, "../assets/OFL.txt"), "utf8").includes("SIL Open Font License"),
  };
  record("contract", { ...r, mountRequests, bundle });

  const api = ["durations", "mount", "supported"];
  expect(r.exportsSrc).toEqual(api);
  expect(r.exportsDist).toEqual(api);
  expect(r.supported && r.supportedDist).toBe(true);
  expect(r.durationsPure).toBe(true);
  expect(r.durationsDist).toEqual(r.durations);
  expect(r.durations).toMatchObject({ idle: 0, connect: 0.8, fly: 1.2, assemble: 1, rebuild: 1.8 });
  // the window event: one length on both roles, 7.5 to 8.5 s, the same for any number of layers
  expect(r.durations.depart).toBe(r.durations.explode);
  expect(r.durations.depart).toBeGreaterThanOrEqual(7.5);
  expect(r.durations.depart).toBeLessThanOrEqual(8.5);
  expect(r.durationsFourFlying.depart).toBe(r.durationsFourFlying.explode);
  expect(r.durationsFourFlying.depart).toBe(r.durations.depart);
  expect(r.hooksWithoutTestFlag).toBe(false);
  // contract v1.2: the host takes the guest camera's position
  expect(r.setViewer).toBe("function");
  expect(r.wrongRole).toContain("does not belong");
  expect(r.where).toMatchObject({ role: "host", timeline: "idle" });
  const leaves = r.events.filter((e: any) => e.phase === "leave").map((e: any) => e.id);
  expect(leaves).toEqual(["contact", "role", "name", "mark", "grid", "bg"]);
  expect(r.events[r.events.length - 1]).toEqual({ timeline: "depart" });
  expect(r.replaceUnknown).toContain("no layer");
  expect(r.badImage).toContain("cannot load");
  expect(r.badRole).toContain("role");
  expect(mountRequests.every((p) => p.startsWith("/examples/jane-maker/layers/") || p === "/assets/window-mono.woff2")).toBe(true);
  expect(mountRequests.filter((p) => p.startsWith("/examples/")).length).toBe(7);
  expect(bundle.imports).toEqual(["three"]);
  expect(bundle.hasTestHooks).toBe(false);
  expect(bundle.fontUrlLiteral && bundle.fontShipped && bundle.licence).toBe(true);
  noPageErrors(page);
});
