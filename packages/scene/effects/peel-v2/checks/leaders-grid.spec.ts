// B9 — labels in a grid of synthetic poses: 30-60 cm, up to 35 degrees off axis, with the stack cut
// by every edge and every corner of the screen. No leader crosses another, no blocks overlap, every
// block is inside the 8 % margins, text is at least 12 CSS px, and every leader ends exactly on a
// corner of its own sheet. Records which poses needed the one-end arrangement.
import { expect, test } from "@playwright/test";
import { FOV, noPageErrors, open, record } from "./util";

type Label = { id: string; corner: number; side: number; zone: number; row: number; x: number; y: number; w: number; h: number; ax: number; ay: number; ex: number; ey: number; gy: number; ix: number; corners: number[] };
type Pose = { name: string; p: number[]; cut: string };

function cross(a: number[], b: number[]): boolean {
  const o = (px: number, py: number, qx: number, qy: number, rx: number, ry: number) => (qx - px) * (ry - py) - (qy - py) * (rx - px);
  const d1 = o(b[0], b[1], b[2], b[3], a[0], a[1]), d2 = o(b[0], b[1], b[2], b[3], a[2], a[3]);
  const d3 = o(a[0], a[1], a[2], a[3], b[0], b[1]), d4 = o(a[0], a[1], a[2], a[3], b[2], b[3]);
  return d1 * d2 < 0 && d3 * d4 < 0;
}
const segments = (l: Label): number[][] => [[l.ax, l.ay, l.ex, l.gy], [l.ex, l.gy, l.ex, l.ey], [l.ex, l.ey, l.ix, l.ey]];

// The card is 1 unit wide; a phone screen is about 6.8 cm wide, so 30-60 cm is 4.4-8.8 units.
const CM = 1 / 6.8;
function poses(aspect: number): Pose[] {
  const out: Pose[] = [];
  const tan = Math.tan((FOV * Math.PI) / 360);
  const angles = [[0, 0], [35, 0], [-35, 0], [0, 35], [0, -35], [25, 25], [-25, 25], [25, -25], [-25, -25]];
  for (const cm of [30, 40, 50, 60]) for (const [yaw, pitch] of angles) out.push({ name: `${cm} cm, yaw ${yaw}, pitch ${pitch}`, p: [yaw, pitch, cm * CM], cut: "" });
  // the stack cut by an edge or a corner: the card centre is moved to just inside that edge
  const dirs: [string, number, number][] = [["left", -1, 0], ["right", 1, 0], ["top", 0, 1], ["bottom", 0, -1], ["top-left", -1, 1], ["top-right", 1, 1], ["bottom-left", -1, -1], ["bottom-right", 1, -1]];
  for (const cm of [30, 45]) for (const [yaw, pitch, roll] of [[0, 0, 0], [25, -15, 0], [-30, 20, 8]]) for (const [cut, dx, dy] of dirs) {
    const d = cm * CM, halfW = d * tan * aspect, halfH = d * tan;
    out.push({ name: `${cm} cm, yaw ${yaw}, pitch ${pitch}, roll ${roll}, cut ${cut}`, p: [yaw, pitch, d, roll, dx * (halfW - 0.1), dy * (halfH - 0.7)], cut });
  }
  return out;
}

for (const [w, h] of [[390, 844], [320, 568]]) {
  test(`leaders-grid: ${w}x${h} — no crossings, no overlaps, margins held`, async ({ page }) => {
    await open(page);
    const list = poses(w / h);
    const r = await page.evaluate(async ({ list, w, h, FOV }) => {
      const H = window.H;
      await H.mount({ role: "guest", w, h });
      const hd = H.handle!, T = hd.test!;
      T.setPaused(true);
      hd.setProjection(FOV, w / h);
      const out: unknown[] = [];
      for (const q of list) {
        hd.setPose(T.fakePose(q.p[0], q.p[1], q.p[2], q.p[3] ?? 0, q.p[4] ?? 0, q.p[5] ?? 0));
        T.seek("explode", 1e3);
        const s = T.state() as any;
        out.push({ name: q.name, cut: q.cut, box: s.box, textPx: s.textPx, arrangement: s.arrangement, labels: s.labels });
      }
      // and the unanchored view
      hd.setPose(null);
      T.seek("explode", 1e3);
      const s = T.state() as any;
      out.push({ name: "unanchored", cut: "", box: s.box, textPx: s.textPx, arrangement: s.arrangement, labels: s.labels });
      // the one-end arrangement is never needed in these poses; force it, so that it is checked as well
      T.forceOneEnd(true);
      for (const q of list) {
        hd.setPose(T.fakePose(q.p[0], q.p[1], q.p[2], q.p[3] ?? 0, q.p[4] ?? 0, q.p[5] ?? 0));
        T.seek("explode", 1e3);
        const f = T.state() as any;
        out.push({ name: q.name, cut: q.cut, box: f.box, textPx: f.textPx, arrangement: f.arrangement, labels: f.labels, forced: true });
      }
      T.forceOneEnd(false);
      return out;
    }, { list, w, h, FOV }) as { name: string; cut: string; box: number[]; textPx: number; arrangement: number; labels: Label[]; forced?: boolean }[];

    const MX = 0.08 * w, MY = 0.08 * h;
    const measure = (v: (typeof r)[number]) => {
      const L = v.labels;
      let overlaps = 0, crossings = 0, outside = 0, offCorner = 0;
      for (let i = 0; i < L.length; i++) {
        const a = L[i];
        if (a.x < MX - 0.01 || a.y < MY - 0.01 || a.x + a.w > w - MX + 0.01 || a.y + a.h > h - MY + 0.01) outside++;
        let onCorner = false;
        for (let c = 0; c < 4; c++) if (Math.abs(a.corners[c * 2] - a.ax) < 1e-6 && Math.abs(a.corners[c * 2 + 1] - a.ay) < 1e-6) onCorner = true;
        if (!onCorner) offCorner++;
        for (let j = i + 1; j < L.length; j++) {
          const b = L[j];
          if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) overlaps++;
          for (const p of segments(a)) for (const q of segments(b)) if (cross(p, q)) crossings++;
        }
      }
      const cutBy = [v.box[0] < 0 ? "left" : "", v.box[2] > w ? "right" : "", v.box[1] < 0 ? "top" : "", v.box[3] > h ? "bottom" : ""].filter(Boolean).join("+");
      return { pose: v.name, wanted: v.cut, stackCutBy: cutBy, labels: L.length, textPx: v.textPx, arrangement: v.arrangement, crossings, overlaps, outside, offCorner,
        slots: L.map((l) => `${l.id}:${l.side < 0 ? "L" : "R"}${l.zone < 0 ? "above" : "below"}${l.row}`).join(" ") };
    };
    const rows = r.filter((v) => !v.forced).map(measure), forced = r.filter((v) => v.forced).map(measure);
    // forced one-end: where the effect says it found a crossing-free layout (1), this check must find none either
    const forcedOk = forced.filter((x) => x.arrangement === 1);
    const cuts = new Set(rows.map((x) => x.stackCutBy));
    const summary = {
      canvas: [w, h], poses: rows.length,
      crossings: rows.reduce((a, x) => a + x.crossings, 0), overlaps: rows.reduce((a, x) => a + x.overlaps, 0),
      blocksOutsideMargins: rows.reduce((a, x) => a + x.outside, 0), leadersNotOnACorner: rows.reduce((a, x) => a + x.offCorner, 0),
      stackCutBy: [...cuts].filter(Boolean).sort(),
      posesNeedingOneEnd: rows.filter((x) => x.arrangement === 1).map((x) => x.pose),
      posesUnresolved: rows.filter((x) => x.arrangement === 2).map((x) => x.pose),
      forcedOneEnd: {
        poses: forced.length, resolved: forcedOk.length, crossingsInResolved: forcedOk.reduce((a, x) => a + x.crossings, 0),
        overlaps: forced.reduce((a, x) => a + x.overlaps, 0), blocksOutsideMargins: forced.reduce((a, x) => a + x.outside, 0),
        // one end cannot always hold three rows clear of the stack; there the rows move in over it and a crossing can stay
        unresolved: forced.length - forcedOk.length,
      },
    };
    record(`leaders-grid-${w}x${h}`, { summary, rows, forced });
    expect(rows.length).toBeGreaterThanOrEqual(60);
    for (const x of rows) {
      expect(x.labels, x.pose).toBe(6);
      expect(x.textPx, x.pose).toBeGreaterThanOrEqual(12);
      expect(x.crossings, `${x.pose}: leader crossings`).toBe(0);
      expect(x.overlaps, `${x.pose}: overlapping blocks`).toBe(0);
      expect(x.outside, `${x.pose}: blocks outside the 8 % margins`).toBe(0);
      expect(x.offCorner, `${x.pose}: a leader does not end on a corner of its sheet`).toBe(0);
      expect(x.arrangement, x.pose).toBeLessThan(2);
    }
    for (const x of forcedOk) expect(x.crossings, `forced one end, ${x.pose}`).toBe(0);
    for (const x of forced) {
      expect(x.overlaps, `forced one end, ${x.pose}: overlapping blocks`).toBe(0);
      expect(x.outside, `forced one end, ${x.pose}: blocks outside the margins`).toBe(0);
    }
    expect(forcedOk.length).toBeGreaterThan(forced.length / 2);
    // the grid really contains the stack cut by each edge and each corner
    for (const c of ["left", "right", "top", "bottom", "left+top", "right+top", "left+bottom", "right+bottom"]) expect([...cuts], `no pose with the stack cut by ${c}`).toContain(c);
    noPageErrors(page);
  });
}
