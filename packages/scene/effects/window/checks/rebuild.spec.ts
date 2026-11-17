// The way back (host `rebuild`, 1.8 s): the layers come in through the glass in the reverse order
// of their exits, slide to their depths, the stack gathers, comes to the glass and flattens, the
// walls close and the QR re-forms last. The timelines join without a jump.
import { expect, test } from "@playwright/test";
import { noPageErrors, open, record } from "./util";

test("rebuild: bottom layer first, gather, close, QR last; depart end = rebuild start; idle = depart start", async ({ page }) => {
  await open(page);
  const r = await page.evaluate(async () => {
    const H = window.H;
    await H.mount({});
    const h = H.handle!, T = h.test!;
    T.setPaused(true);
    const D = H.durations();
    const enter: Record<string, number> = {}, flatAt: Record<string, number> = {};
    let qrFirst = -1, qrDone = -1, perspUntil = -1, litStart = -1, litEnd = -1, backEnd = -1, deepest = 0, residueGone = -1, forwardOnly = 0, tiltedAfterSlide = 0;
    const last: Record<string, number> = {};
    for (let i = 0; i <= 180; i++) {
      const t = i / 100;
      T.seek("rebuild", t);
      const s = T.state() as any;
      if (s.persp) perspUntil = t;
      if (i === 0) litStart = s.lit;
      litEnd = s.lit;
      backEnd = s.backA;
      let residue = 0;
      for (const q of s.sheets) {
        if (q.qr) {
          if (q.on && qrFirst < 0) qrFirst = t;
          if (q.qT === 0 && qrDone < 0) qrDone = t;
          continue;
        }
        if (q.on && enter[q.id] === undefined) enter[q.id] = t;
        if (q.on && q.z === 0 && q.tilt === 0 && q.acr === 0 && flatAt[q.id] === undefined && t > 1) flatAt[q.id] = t;
        if (q.z < deepest) deepest = q.z;
        // once the stack has gathered it only comes forward
        if (t > 1.2 && last[q.id] !== undefined && q.z < last[q.id] - 1e-9) forwardOnly++;
        if (t > 0.95 && q.tilt !== 0) tiltedAfterSlide++;
        last[q.id] = q.z;
        residue = Math.max(residue, q.rsA);
      }
      if (residue === 0 && residueGone < 0) residueGone = t;
    }
    // joins: the picture a timeline starts with is the one the timeline before it ended with
    T.seek("depart", 1e3);
    const departEnd = H.pixels();
    T.seek("rebuild", 0);
    const rebuildStart = H.pixels();
    T.seek("idle", 0);
    const idle = H.pixels();
    T.seek("connect", 1e3);
    const connectEnd = H.pixels();
    T.seek("depart", 0);
    const departStart = H.pixels();
    T.seek("rebuild", 1e3);
    const rebuildEnd = H.pixels();
    const order = (T.state() as any).sheets.filter((q: any) => !q.qr).sort((a: any, b: any) => a.j - b.j).map((q: any) => q.id);
    return {
      durations: D, order, enter, flatAt, qrFirst, qrDone, perspUntil, litStart, litEnd, backEnd, deepest, residueGone, forwardOnly, tiltedAfterSlide,
      departEndToRebuildStart: H.compare(departEnd, rebuildStart), connectEndToDepartStart: H.compare(connectEnd, departStart),
      rebuildEndToIdle: H.compare(rebuildEnd, idle),
    };
  });
  record("rebuild", r);
  expect(r.durations.rebuild).toBe(1.8);
  // reverse order of the exits: the bottom layer (the last to leave) comes back first
  const times = r.order.map((id: string) => r.enter[id]);
  for (let i = 1; i < times.length; i++) expect(times[i], `${r.order[i]} after ${r.order[i - 1]}`).toBeGreaterThan(times[i - 1]);
  expect(times[0]).toBeLessThanOrEqual(0.02);
  expect(times[times.length - 1]).toBeLessThanOrEqual(0.5);
  // they slide into the room, gather, and the whole stack is flat on the glass at 1.5 s
  expect(r.deepest).toBeLessThan(-0.6);
  expect(r.forwardOnly).toBe(0);
  expect(r.tiltedAfterSlide).toBe(0);
  for (const id of r.order) expect(r.flatAt[id], id).toBeCloseTo(1.5, 5);
  expect(r.perspUntil).toBeCloseTo(1.49, 5);
  // the panel is covered again, the outlines on it go
  expect(r.litStart).toBe(1);
  expect(r.litEnd).toBe(0);
  expect(r.residueGone).toBeGreaterThan(0.3);
  expect(r.residueGone).toBeLessThanOrEqual(1.0);
  // the QR re-forms last
  expect(r.qrFirst).toBeGreaterThanOrEqual(1.3);
  expect(r.qrDone).toBeCloseTo(1.8, 5);
  // joins without a jump: depart's last frame is rebuild's first, exactly; the flat card and the closed window
  // differ by rounding only (the same sheets drawn through two projections)
  expect(r.departEndToRebuildStart.max).toBe(0);
  expect(r.connectEndToDepartStart.max).toBeLessThanOrEqual(3);
  expect(r.rebuildEndToIdle.max).toBe(0);
  noPageErrors(page);
});
