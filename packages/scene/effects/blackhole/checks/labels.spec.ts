// A15 — labels ride the ribbons. Each ribbon in the air carries its layer's chip and dims pill:
// text of 12 CSS px, the block inside the canvas, no two blocks overlapping, the leader starting on
// the layer's own ribbon (checked in the pixels, in test colours). What is drawn follows the layout on
// a short history: after the pose jumps a block does not jump with it, it is back on its target
// within 0.3 s, and `seek` clears the history (the same seek gives the same pixels).
import { expect, test } from "@playwright/test";
import { ASPECT, FOV, noPageErrors, open, record } from "./util";

test("labels: beside their own ribbon, inside the canvas, never overlapping, eased on a history that settles within 0.3 s", async ({ page }) => {
  test.setTimeout(300_000);
  await open(page);
  const r = await page.evaluate(async ({ FOV, ASPECT }) => {
    const H = window.H, D = H.durations();
    const out: Record<string, unknown> = {};
    for (const pose of [[20, 6, 5.6], [-30, 10, 4.5], null] as (number[] | null)[]) {
      await H.mount({ role: "guest" });
      const h = H.handle!, T = h.test!;
      T.setPaused(true);
      h.setProjection(FOV, ASPECT);
      h.setPose(pose ? T.fakePose(pose[0], pose[1], pose[2]) : null);
      const shown: Record<string, number> = {};
      let frames = 0, outside = 0, overlapping = 0, offRibbon = 0, checked = 0, most = 0, farthest = 0;
      const N = 120, dt = (D.explode + D.fly) / N;
      for (let i = 0; i <= N; i++) {
        const te = i * dt, tl = te <= D.explode ? "explode" : "fly", t = te <= D.explode ? te : te - D.explode;
        T.setProbe(false);
        T.setOnly(null);
        T.seek(tl as any, t);
        const st = T.state() as any, on = st.labels.filter((l: any) => l.on && l.alpha > 0);
        frames++;
        most = Math.max(most, on.length);
        for (const l of on) {
          shown[l.id] = (shown[l.id] ?? 0) + dt;
          if (l.x < 0 || l.y < 0 || l.x + l.w > 390 || l.y + l.h > 844) outside++;
          // the leader is short: the block hangs beside its anchor
          farthest = Math.max(farthest, Math.hypot(Math.max(l.x - l.ax, 0, l.ax - l.x - l.w), Math.max(l.y - l.ay, 0, l.ay - l.y - l.h)));
          for (const m of on) if (m !== l && l.x < m.x + m.w && m.x < l.x + l.w && l.y < m.y + m.h && m.y < l.y + l.h) overlapping++;
        }
        // every fourth frame: is the leader's start on that layer's ribbon? (the layer alone, in test colours)
        if (i % 4 === 0) {
          for (const l of on) {
            if (l.alpha < 0.5) continue;
            T.setProbe(true);
            T.setOnly("strips:" + l.id);
            const p = H.pixels();
            let hit = false;
            for (let y = Math.round(l.ay) - 6; y <= Math.round(l.ay) + 6 && !hit; y++) for (let x = Math.round(l.ax) - 6; x <= Math.round(l.ax) + 6; x++) {
              if (x < 0 || y < 0 || x >= p.width || y >= p.height) continue;
              const o = (y * p.width + x) * 4;
              // a ribbon pixel within 6 px: past the glass, not the level (where the ribbon is edge-on it covers only part of a pixel)
              if (p.data[o + 3] >= 128 && p.data[o + 1] > 13 && p.data[o + 1] < 255) { hit = true; break; }
            }
            checked++;
            if (!hit) offRibbon++;
          }
        }
      }
      T.setProbe(false);
      T.setOnly(null);
      // the history: at a moment with a label on, the pose jumps; the block follows in steps of 16 ms
      let history: unknown = null;
      if (pose) {
        const at = 3.3;
        T.seek("explode", at);
        const a = (T.state() as any).labels.find((l: any) => l.on && l.alpha > 0.9);
        if (a) {
          const hash0 = H.hash();
          h.setPose(T.fakePose(pose[0] + 30, pose[1] - 18, pose[2] - 1.2, 0, 0.5, -0.4));
          T.step("explode", at, 0.016);
          const b = (T.state() as any).labels.find((l: any) => l.id === a.id);
          const jump = Math.hypot(b.tx - a.x, b.ty - a.y), firstStep = Math.hypot(b.x - a.x, b.y - a.y);
          let settledMs = -1, left = 0;
          for (let k = 2; k <= 30; k++) {
            T.step("explode", at, 0.016);
            const c = (T.state() as any).labels.find((l: any) => l.id === a.id);
            left = Math.hypot(c.tx - c.x, c.ty - c.y);
            if (settledMs < 0 && left === 0) settledMs = k * 16;
          }
          // back to the first pose: a seek starts from nothing
          h.setPose(T.fakePose(pose[0], pose[1], pose[2]));
          T.seek("explode", at);
          const again = H.hash();
          T.seek("fly", 0.4);
          T.seek("explode", at);
          history = { label: a.id, jumpCssPx: +jump.toFixed(2), firstStepShare: +(firstStep / jump).toFixed(3), settledMs, leftAfter480MsCssPx: left, sameSeekSamePixels: hash0 === again && again === H.hash() };
        }
      }
      const st = T.state() as any;
      out[pose ? pose.join(",") : "unanchored"] = {
        frames, textCssPx: st.textPx, labelsShownSeconds: Object.fromEntries(Object.entries(shown).map(([k, v]) => [k, +v.toFixed(2)])),
        mostAtOnce: most, outsideTheCanvas: outside, overlapping, leaderStartsChecked: checked, leaderStartsOffTheRibbon: offRibbon,
        farthestBlockFromItsAnchorCssPx: +farthest.toFixed(1), history,
      };
    }
    return out;
  }, { FOV, ASPECT }) as Record<string, any>;
  record("labels", r);
  for (const [name, v] of Object.entries(r)) {
    expect(v.textCssPx, name).toBeGreaterThanOrEqual(12);
    // every flying layer gets its label, for at least a third of a second
    expect(Object.keys(v.labelsShownSeconds).sort(), name).toEqual(["bg", "contact", "grid", "mark", "name", "role"]);
    for (const s of Object.values(v.labelsShownSeconds) as number[]) expect(s, name).toBeGreaterThanOrEqual(0.33);
    expect(v.outsideTheCanvas, name).toBe(0);
    expect(v.overlapping, name).toBe(0);
    expect(v.leaderStartsChecked, name).toBeGreaterThan(10);
    expect(v.leaderStartsOffTheRibbon, name).toBe(0);
    expect(v.farthestBlockFromItsAnchorCssPx, name).toBeLessThanOrEqual(120);
    if (v.history) {
      // (the far end of a ribbon hangs from the guest's screen, so even a large change of pose moves a block only a little)
      expect(v.history.jumpCssPx, name).toBeGreaterThan(4);
      // eased: the first 16 ms take the block a fifth of the way, not all of it
      expect(v.history.firstStepShare, name).toBeLessThanOrEqual(0.35);
      expect(v.history.settledMs, name).toBeGreaterThan(16);
      expect(v.history.settledMs, name).toBeLessThanOrEqual(300);
      expect(v.history.sameSeekSamePixels, name).toBe(true);
    }
  }
  expect(Object.values(r).filter((v) => v.history).length).toBeGreaterThanOrEqual(2);
  noPageErrors(page);
});
