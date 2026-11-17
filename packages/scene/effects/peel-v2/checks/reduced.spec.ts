// A15 — reduced motion: same schedule, only fades at fixed offsets. No overshoot, no parallax, no sweep.
import { expect, test } from "@playwright/test";
import { FLAT_MAX, ASPECT, FOV, INSET, noPageErrors, open, record } from "./util";

test("reduced: no overshoot, no parallax, only fades and fixed offsets", async ({ page }) => {
  await open(page);
  const r = await page.evaluate(async ({ INSET, FOV, ASPECT }) => {
    const H = window.H;
    const D = H.durations();
    // host
    await H.mount({ reduced: true });
    let h = H.handle!, T = h.test!;
    T.setPaused(true);
    T.seek("idle", 0);
    const flat = H.hash();
    h.setTilt(1, -1);
    T.seek("idle", 1.3);
    const tilted = H.hash();
    const host: { moved: number; scaled: number; acrylic: number; opOut: number } = { moved: 0, scaled: 0, acrylic: 0, opOut: 0 };
    for (const tl of ["connect", "depart", "rebuild"] as const) {
      for (let i = 0; i <= 60; i++) {
        T.seek(tl, (D[tl] * i) / 60);
        for (const s of (T.state() as any).sheets) {
          if (Math.abs(s.ox) + Math.abs(s.oy) > 1e-9) host.moved++;
          if (s.sc !== 1) host.scaled++;
          if (s.acr !== 0) host.acrylic++;
          if (s.op < 0 || s.op > 1) host.opOut++;
        }
      }
    }
    const sweepHost = (T.state() as any).sweepOn;
    // guest: positions never change while a sheet is visible, opacity only rises in explode
    const guest: Record<string, unknown> = {};
    for (const pose of [null, [-14, 9, 5.6]]) {
      await H.mount({ role: "guest", reduced: true, assembleRect: INSET });
      h = H.handle!;
      T = h.test!;
      T.setPaused(true);
      h.setProjection(FOV, ASPECT);
      h.setPose(pose ? T.fakePose(pose[0], pose[1], pose[2]) : null);
      T.seek("explode", 1e3);
      const fin = (T.state() as any).sheets.filter((s: any) => !s.qr).map((s: any) => ({ id: s.id, x: s.x, y: s.y, z: s.z }));
      const frame0 = JSON.stringify((T.state() as any).frame);
      let drift = 0, overshoot = 0, opDown = 0, frameMoved = 0;
      const last: Record<string, number> = {};
      for (const tl of ["explode", "fly"] as const) {
        for (let i = 0; i <= 80; i++) {
          T.seek(tl, (D[tl] * i) / 80);
          const st = T.state() as any;
          if (JSON.stringify(st.frame) !== frame0) frameMoved++;
          for (const s of st.sheets) {
            if (s.qr || !s.on) continue;
            const f = fin.find((q: any) => q.id === s.id);
            const d = Math.abs(s.x - f.x) + Math.abs(s.y - f.y) + Math.abs(s.z - f.z);
            if (d > 1e-9) drift++;
            if (s.z > f.z + 1e-9) overshoot++;
            if (tl === "explode") {
              if (s.op < (last[s.id] ?? 0) - 1e-9) opDown++;
              last[s.id] = s.op;
            }
          }
        }
      }
      let lifted = 0, acrylic = 0;
      for (let i = 0; i <= 40; i++) {
        T.seek("assemble", (D.assemble * i) / 40);
        for (const s of (T.state() as any).sheets) {
          if (s.qr || !s.on) continue;
          if (Math.abs(s.z) > 1e-9 || Math.abs(s.ox) + Math.abs(s.oy) > 1e-9) lifted++;
          if (s.acr !== 0) acrylic++;
        }
      }
      T.seek("assemble", 1e3);
      guest[pose ? "anchored" : "unanchored"] = {
        drift, overshoot, opDown, frameMoved, assembleLifted: lifted, assembleAcrylic: acrylic,
        sweepOn: (T.state() as any).sweepOn, end: H.compare(H.pixels(), H.reference({ area: INSET, qr: false })),
      };
    }
    return { host: { ...host, tiltChangesFrame: flat !== tilted, sweepOn: sweepHost }, guest, durations: D };
  }, { INSET, FOV, ASPECT });
  record("reduced", r);
  expect(r.host).toMatchObject({ moved: 0, scaled: 0, acrylic: 0, opOut: 0, tiltChangesFrame: false, sweepOn: false });
  for (const g of Object.values(r.guest) as any[]) {
    expect(g).toMatchObject({ drift: 0, overshoot: 0, opDown: 0, frameMoved: 0, assembleLifted: 0, assembleAcrylic: 0, sweepOn: false });
    expect(g.end.max).toBeLessThanOrEqual(FLAT_MAX);
  }
  noPageErrors(page);
});
