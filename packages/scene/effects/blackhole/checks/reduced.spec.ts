// A14 — reduced motion: the same schedule, but the well is static and gentle (0.35, no swirl), nothing
// travels (no necks, no ribbons: a layer fades from the host and fades in under the level), the level
// rises without wobble and nothing bobs; the eye made from tilt stays frontal, a real viewer still
// moves the perspective; the end frames stay exact.
import { expect, test } from "@playwright/test";
import { FLAT_MAX, ASPECT, FOV, INSET, noPageErrors, open, record } from "./util";

test("reduced: a static gentle well, fades instead of ribbons, a level without wobble, exact end frames", async ({ page }) => {
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
    const idleRef = H.compare(H.pixels(), H.reference());
    h.setTilt(1, -1);
    T.seek("idle", 1.3);
    const tilted = H.hash();
    const host = { moved: 0, opOut: 0, eyeMoved: 0, swirl: 0, strongest: 0, plateauFrames: 0, plateauOff: 0, fadedUp: 0, twoPlaces: 0, lost: 0 };
    const last: Record<string, number> = {};
    for (const tl of ["connect", "depart", "rebuild"] as const) {
      for (let i = 0; i <= 80; i++) {
        const t = (D[tl] * i) / 80;
        T.seek(tl, t);
        const st = T.state() as any;
        // the tilt set above must not move the eye
        if (st.persp && (Math.abs(st.eye[0]) > 1e-12 || Math.abs(st.eye[1]) > 1e-12 || st.eye[2] !== 6)) host.eyeMoved++;
        if (st.well.swirl !== 0) host.swirl++;
        host.strongest = Math.max(host.strongest, st.well.a);
        // the well does not move while layers leave: one strength from 0.5 s to the collapse
        if (tl === "depart" && t >= 0.5 && t <= D.depart - 0.5) { host.plateauFrames++; if (st.well.a !== 0.35) host.plateauOff++; }
        for (const s of st.sheets) {
          if (Math.abs(s.ox) + Math.abs(s.oy) > 1e-9) host.moved++;
          if (s.qr) continue;
          if (s.stripOp < 0 || s.stripOp > 1) host.opOut++;
          if (Math.abs(s.host + s.air + s.level - 1) > 1e-9) host.lost++;
          if ([s.host, s.air, s.level].filter((v: number) => v > 0).length > 1) host.twoPlaces++;
          // a layer only fades out while the card leaves
          if (tl === "depart" && s.strip) {
            if (s.stripOp > (last[s.id] ?? 1) + 1e-9) host.fadedUp++;
            last[s.id] = s.stripOp;
          }
        }
      }
    }
    T.seek("rebuild", 1e3);
    const rebuildEnd = H.hash();
    // a real viewer still moves the perspective
    h.setViewer!(new Float32Array([2, 1, 5]));
    T.seek("depart", 2.4);
    const viewerEye = (T.state() as any).eye;
    // guest: no strip is ever drawn, the level never wobbles, nothing floats off its place, a layer only fades in
    const guest: Record<string, unknown> = {};
    for (const pose of [null, [-14, 9, 5.6]]) {
      await H.mount({ role: "guest", reduced: true, assembleRect: INSET });
      h = H.handle!;
      T = h.test!;
      T.setPaused(true);
      h.setProjection(FOV, ASPECT);
      h.setPose(pose ? T.fakePose(pose[0], pose[1], pose[2]) : null);
      T.seek("explode", 0);
      const frame0 = JSON.stringify((T.state() as any).frame);
      let strips = 0, wobble = 0, moved = 0, opDown = 0, frameMoved = 0, labels = 0, levelDown = 0, twoPlaces = 0, lost = 0, lv = 0;
      const seen: Record<string, number> = {};
      for (const tl of ["explode", "fly", "assemble"] as const) {
        for (let i = 0; i <= 80; i++) {
          T.seek(tl, (D[tl] * i) / 80);
          const st = T.state() as any;
          if (JSON.stringify(st.frame) !== frame0) frameMoved++;
          if (st.level.wobble !== 0) wobble++;
          if (st.level.share < lv - 1e-12) levelDown++;
          lv = st.level.share;
          for (const l of st.labels) if (l.on) labels++;
          for (const s of st.sheets) {
            if (s.qr) continue;
            if (s.strip) strips++;
            if (Math.abs(s.host + s.air + s.level - 1) > 1e-9) lost++;
            if ([s.host, s.air, s.level].filter((v: number) => v > 0).length > 1) twoPlaces++;
            if (!s.on || s.op <= 0) continue;
            if (Math.abs(s.ox) + Math.abs(s.oy) + Math.abs(s.rot) > 1e-12) moved++;
            if (s.op < (seen[s.id] ?? 0) - 1e-9) opDown++;
            seen[s.id] = s.op;
          }
        }
      }
      T.seek("assemble", 1e3);
      guest[pose ? "anchored" : "unanchored"] = {
        strips, wobble, moved, opDown, frameMoved, labels, levelDown, twoPlaces, lost,
        end: H.compare(H.pixels(), H.reference({ area: INSET, qr: false })),
      };
    }
    return { host: { ...host, tiltChangesFrame: flat !== tilted, idleZero: idleRef, rebuildEndIsIdleZero: rebuildEnd === flat, viewerEye }, guest, durations: D };
  }, { INSET, FOV, ASPECT });
  record("reduced", r);
  expect(r.host).toMatchObject({ moved: 0, opOut: 0, eyeMoved: 0, swirl: 0, plateauOff: 0, fadedUp: 0, twoPlaces: 0, lost: 0, tiltChangesFrame: false, rebuildEndIsIdleZero: true });
  expect(r.host.strongest).toBe(0.35);
  expect(r.host.plateauFrames).toBeGreaterThan(60);
  expect(r.host.idleZero.max).toBeLessThanOrEqual(FLAT_MAX);
  expect(r.host.viewerEye).toEqual([2, 1, 5]);
  for (const g of Object.values(r.guest) as any[]) {
    expect(g).toMatchObject({ strips: 0, wobble: 0, moved: 0, opDown: 0, frameMoved: 0, labels: 0, levelDown: 0, twoPlaces: 0, lost: 0 });
    expect(g.end.max).toBeLessThanOrEqual(FLAT_MAX);
  }
  noPageErrors(page);
});
