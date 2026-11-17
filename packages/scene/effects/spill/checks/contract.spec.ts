// A1, A13, A19, A20 — exports, durations, events, requests, errors, and what the production bundle contains.
import { expect, test } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { here, noPageErrors, open, record } from "./util";

test("contract: exports, durations, play, events, replaceLayer, rejections", async ({ page }) => {
  await open(page);
  const r = await page.evaluate(async () => {
    const H = window.H;
    const src = await import("/src/index.ts" as string), dist = await import("/dist/spill.js" as string);
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
    out.wrongRole = await H.handle!.play("explode").then(() => "resolved", (e: Error) => e.message);
    out.where = H.handle!.where();
    // events: start depart 5 s in the past, wait for it to finish (2.5 s)
    H.events.length = 0;
    await H.handle!.play("depart", { at: performance.now() - 5000 });
    out.events = [...H.events];
    await H.handle!.replaceLayer("qr", "layers/qr.png");
    out.replaceUnknown = await H.handle!.replaceLayer("nope", "layers/qr.png").then(() => "resolved", (e: Error) => e.message);
    out.badImage = await src.mount(document.createElement("canvas"), { role: "host", layers: H.manifest!, baseUrl: "/examples/nowhere/", quality: "test", reduced: false })
      .then(() => "resolved", (e: Error) => e.message);
    out.badRole = await src.mount(document.createElement("canvas"), { role: "x" as any, layers: H.manifest!, baseUrl: H.base, quality: "test", reduced: false })
      .then(() => "resolved", (e: Error) => e.message);
    // other manifests run too: four flying layers, and a card without any full-bleed layer (its bottom layer becomes the wall)
    const bare = { ...H.manifest!, layers: H.manifest!.layers.filter((l) => !["bg", "grid"].includes(l.id)) };
    const others: Record<string, unknown> = {};
    for (const [name, m] of [["four flying layers", small], ["no full-bleed layer", bare]] as const) {
      const c = document.createElement("canvas");
      c.width = 390;
      c.height = 844;
      const g = await src.mount(c, { role: "guest", layers: m, baseUrl: H.base, quality: "test", reduced: false, test: true });
      g.test.setPaused(true);
      g.setProjection(62, 390 / 844);
      g.setPose(g.test.fakePose(-14, 6, 6.7));
      for (const t of [0, 1, 2, 3.5, 5, 7.5]) g.test.seek("explode", t);
      const fl = (g.test.state().sheets as any[]).filter((s) => !s.qr);
      others[name] = {
        flying: fl.length, shownAtEnd: fl.filter((s) => s.on && s.op === 1 && s.g === 1).length, walls: fl.filter((s) => s.room.kind === 0).length,
        widestCardWidths: +Math.max(...fl.map((s) => s.rect[2] * s.scale[0])).toFixed(3), labelsShown: (g.test.state().labels as any[]).filter((l) => l.shown).length,
      };
      g.test.seek("fly", 1e3);
      g.test.seek("assemble", 1e3);
      g.dispose();
    }
    out.otherManifests = others;
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

  const js = readFileSync(join(here, "../dist/spill.js"), "utf8");
  const imports = [...js.matchAll(/(?:from|import)\s*["']([^"']+)["']/g)].map((m) => m[1]);
  const bundle = {
    imports: [...new Set(imports)],
    hasTestHooks: /fakePose|setPaused|setFinish/.test(js),
    fontUrlLiteral: js.includes('new URL("./spill-mono.woff2", import.meta.url)'),
    fontShipped: existsSync(join(here, "../dist/spill-mono.woff2")) && existsSync(join(here, "../dist/OFL.txt")),
    licence: readFileSync(join(here, "../assets/OFL.txt"), "utf8").includes("SIL Open Font License"),
  };
  record("contract", { ...r, mountRequests, bundle });

  const api = ["durations", "mount", "supported"];
  expect(r.exportsSrc).toEqual(api);
  expect(r.exportsDist).toEqual(api);
  expect(r.supported && r.supportedDist).toBe(true);
  expect(r.durationsPure).toBe(true);
  expect(r.durationsDist).toEqual(r.durations);
  expect(r.durations).toMatchObject({ idle: 0, connect: 0.8, fly: 1.4, assemble: 1, rebuild: 1.8 });
  expect(r.durations.depart).toBe(r.durations.explode);
  expect(r.durations.depart).toBeGreaterThanOrEqual(7);
  expect(r.durations.depart).toBeLessThanOrEqual(8);
  expect(r.durationsFourFlying.depart).toBe(r.durationsFourFlying.explode);
  // one length for every manifest: host and guest need no manifest-dependent arithmetic to stay aligned
  expect(r.durationsFourFlying.depart).toBe(r.durations.depart);
  expect(r.hooksWithoutTestFlag).toBe(false);
  expect(r.wrongRole).toContain("does not belong");
  expect(r.where).toMatchObject({ role: "host", timeline: "idle" });
  const leaves = r.events.filter((e: any) => e.phase === "leave").map((e: any) => e.id);
  // the room is built from the back: the layers that go behind the phone first, then the others from the top down
  expect(leaves).toEqual(["bg", "grid", "contact", "role", "name", "mark"]);
  expect(r.events[r.events.length - 1]).toEqual({ timeline: "depart" });
  expect(r.replaceUnknown).toContain("no layer");
  expect(r.badImage).toContain("cannot load");
  expect(r.badRole).toContain("role");
  for (const [name, o] of Object.entries(r.otherManifests) as [string, any][]) {
    expect(o.shownAtEnd, `${name}: sheets at their room pose at the end of explode`).toBe(o.flying);
    expect(o.walls, name).toBe(1);
    expect(o.widestCardWidths, name).toBeGreaterThanOrEqual(5);
    expect(o.widestCardWidths, name).toBeLessThanOrEqual(7);
    expect(o.labelsShown, name).toBeGreaterThanOrEqual(2);
  }
  expect(mountRequests.every((p) => p.startsWith("/examples/jane-maker/layers/") || p === "/assets/spill-mono.woff2")).toBe(true);
  expect(mountRequests.filter((p) => p.startsWith("/examples/")).length).toBe(7);
  expect(bundle.imports).toEqual(["three"]);
  expect(bundle.hasTestHooks).toBe(false);
  expect(bundle.fontUrlLiteral && bundle.fontShipped && bundle.licence).toBe(true);
  noPageErrors(page);
});
