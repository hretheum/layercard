// A13 — reduced motion: same schedule, only fades at fixed places. No travel, no tilt, no parallax, no sweep;
// the eye made from tilt stays frontal, a real viewer still moves the perspective.
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
    const host = { moved: 0, scaled: 0, acrylic: 0, opOut: 0, tilted: 0, mostPlaces: 0, eyeMoved: 0 };
    const seen: Record<string, Set<string>> = {};
    for (const tl of ["connect", "depart", "rebuild"] as const) {
      for (let i = 0; i <= 60; i++) {
        T.seek(tl, (D[tl] * i) / 60);
        const st = T.state() as any;
        // the tilt set above must not move the eye
        if (st.persp && (Math.abs(st.eye[0]) > 1e-12 || Math.abs(st.eye[1]) > 1e-12 || st.eye[2] !== 6)) host.eyeMoved++;
        for (const s of st.sheets) {
          if (Math.abs(s.ox) + Math.abs(s.oy) > 1e-9) host.moved++;
          if (s.sc !== 1) host.scaled++;
          if (s.acr !== 0) host.acrylic++;
          if (s.op < 0 || s.op > 1) host.opOut++;
          if (s.tilt !== 0) host.tilted++;
          // a sheet is only ever at the glass or at its place inside: it fades between the two
          if (s.on && s.op > 0 && !s.qr) (seen[s.id] ??= new Set()).add(s.z.toFixed(9));
        }
      }
    }
    host.mostPlaces = Math.max(...Object.values(seen).map((v) => v.size));
    // a real viewer still moves the perspective
    h.setViewer!(new Float32Array([2, 1, 5]));
    T.seek("depart", 2.4);
    const viewerEye = (T.state() as any).eye;
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
      let overshoot = 0, opDown = 0, frameMoved = 0, tilted = 0;
      const last: Record<string, number> = {}, places: Record<string, Set<string>> = {};
      for (const tl of ["explode", "fly"] as const) {
        for (let i = 0; i <= 80; i++) {
          T.seek(tl, (D[tl] * i) / 80);
          const st = T.state() as any;
          if (JSON.stringify(st.frame) !== frame0) frameMoved++;
          for (const s of st.sheets) {
            if (s.qr || !s.on || s.op <= 0) continue;
            const f = fin.find((q: any) => q.id === s.id);
            (places[s.id] ??= new Set()).add(`${s.x.toFixed(9)} ${s.y.toFixed(9)} ${s.z.toFixed(9)}`);
            if (s.z > f.z + 1e-9) overshoot++;
            if (s.tilt !== 0) tilted++;
            // anchored: a sheet only fades in, at its place in front (alone, the guest also shows it fading out inside)
            if (tl === "explode" && pose) {
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
        mostPlaces: Math.max(...Object.values(places).map((v) => v.size)), tilted, overshoot, opDown, frameMoved, assembleLifted: lifted, assembleAcrylic: acrylic,
        sweepOn: (T.state() as any).sweepOn, end: H.compare(H.pixels(), H.reference({ area: INSET, qr: false })),
      };
    }
    return { host: { ...host, tiltChangesFrame: flat !== tilted, sweepOn: sweepHost, viewerEye }, guest, durations: D };
  }, { INSET, FOV, ASPECT });
  record("reduced", r);
  expect(r.host).toMatchObject({ moved: 0, scaled: 0, acrylic: 0, opOut: 0, tilted: 0, eyeMoved: 0, tiltChangesFrame: false, sweepOn: false });
  // host: at the glass and at its place inside, nowhere between
  expect(r.host.mostPlaces).toBeLessThanOrEqual(2);
  expect(r.host.viewerEye).toEqual([2, 1, 5]);
  for (const [name, g] of Object.entries(r.guest) as [string, any][]) {
    expect(g).toMatchObject({ tilted: 0, overshoot: 0, opDown: 0, frameMoved: 0, assembleLifted: 0, assembleAcrylic: 0, sweepOn: false });
    // anchored: one place, in front of the glass. Alone: at the glass, inside, in front
    expect(g.mostPlaces, name).toBeLessThanOrEqual(name === "anchored" ? 1 : 3);
    expect(g.end.max).toBeLessThanOrEqual(FLAT_MAX);
  }
  noPageErrors(page);
});
