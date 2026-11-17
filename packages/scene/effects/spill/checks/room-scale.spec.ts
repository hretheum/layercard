// A7, A8, A12, A26 — the file stands in the room at room scale, and the room does not depend on the pose.
// At the end of `explode`, for 16 poses between 30 and 60 cm and up to 35 degrees off axis:
//   - the host phone is inside the frame;
//   - at least three sheets are in the frame (visible part >= 1.5 % of the canvas);
//   - at least one sheet crosses a frame edge (partly visible, partly outside);
//   - the largest sheet is 5 to 7 card widths across;
//   - every sheet in the frame carries a label; labels are 12 px text, inside the canvas, and no two
//     overlap (nor does one overlap the distance label);
//   - at least one guide runs past a frame edge;
//   - A26: the row of sheets next below the phone is inside the frame from top to bottom (the frame
//     may cut it at the sides); on the phone's horizon and at the standard pose no label of a sheet
//     lies on another sheet, and the distance label lies on none;
//   - every sheet is exactly where its room pose, a function of the manifest alone, puts it:
//     the corners the effect draws equal pose x room pose, computed here independently.
import { expect, test } from "@playwright/test";
import { ASPECT, FOV, noPageErrors, open, record } from "./util";

const CM = 1 / 7;
const POSES: [number, number, number][] = [
  [0, 0, 30 * CM], [0, 0, 47 * CM], [0, 0, 60 * CM], [20, 0, 47 * CM], [-20, 0, 47 * CM], [35, 0, 47 * CM], [-35, 0, 47 * CM],
  [0, 20, 47 * CM], [0, -20, 47 * CM], [0, 35, 55 * CM], [0, -35, 55 * CM], [-14, 6, 47 * CM], [35, 10, 30 * CM],
  [-35, -10, 60 * CM], [25, 25, 39 * CM], [-25, -25, 52 * CM],
];

test("room-scale: phone and three sheets in frame, a sheet and a guide across the edge, labels apart, room independent of the pose", async ({ page }) => {
  await open(page);
  const r = await page.evaluate(async ({ POSES, FOV, ASPECT }) => {
    const H = window.H;
    await H.mount({ role: "guest" });
    const h = H.handle!, T = h.test!;
    T.setPaused(true);
    h.setProjection(FOV, ASPECT);
    const W = 390, Hh = 844, f = 1 / Math.tan((FOV * Math.PI) / 360), THICK = 0.012;
    const D = H.durations();
    type P3 = [number, number, number];
    const toPx = (p: P3): [number, number] => [(((p[0] * f) / ASPECT / -p[2]) * 0.5 + 0.5) * W, (0.5 - ((p[1] * f) / -p[2]) * 0.5) * Hh];
    const clipNear = (pts: P3[], near = 0.12): P3[] => {
      const out: P3[] = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length], ina = a[2] <= -near, inb = b[2] <= -near;
        if (ina) out.push(a);
        if (ina !== inb) { const k = (-near - a[2]) / (b[2] - a[2]); out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, -near]); }
      }
      return out;
    };
    const clip2 = (poly: [number, number][], x0: number, y0: number, x1: number, y1: number): [number, number][] => {
      const edge = (src: [number, number][], axis: number, bound: number, keep: number) => {
        const out: [number, number][] = [];
        for (let i = 0; i < src.length; i++) {
          const a = src[i], b = src[(i + 1) % src.length], ina = keep > 0 ? a[axis] >= bound : a[axis] <= bound, inb = keep > 0 ? b[axis] >= bound : b[axis] <= bound;
          if (ina) out.push(a);
          if (ina !== inb) { const k = (bound - a[axis]) / (b[axis] - a[axis]); out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]); }
        }
        return out;
      };
      return edge(edge(edge(edge(poly, 0, x0, 1), 0, x1, -1), 1, y0, 1), 1, y1, -1);
    };
    const area = (p: [number, number][]) => { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return Math.abs(a) / 2; };
    const apply = (M: Float32Array, x: number, y: number, z: number): P3 =>
      [M[0] * x + M[4] * y + M[8] * z + M[12], M[1] * x + M[5] * y + M[9] * z + M[13], M[2] * x + M[6] * y + M[10] * z + M[14]];
    const inside = (p: [number, number]) => p[0] >= 0 && p[0] <= W && p[1] >= 0 && p[1] <= Hh;

    const views: Record<string, unknown>[] = [];
    let roomRef: string | null = null, roomSame = true, worstCornerUnits = 0, worstCornerPx = 0;
    for (const pose of POSES) {
      const M = T.fakePose(pose[0], pose[1], pose[2]);
      h.setPose(M);
      T.seek("explode", D.explode);
      const st = T.state() as any;
      const flying = (st.sheets as any[]).filter((s) => !s.qr);
      // the room: the same numbers for every pose
      const roomNow = JSON.stringify(flying.map((s) => s.room));
      if (roomRef === null) roomRef = roomNow;
      else if (roomNow !== roomRef) roomSame = false;
      // the phone
      const cardH = st.cardH as number;
      const phone = ([[-0.5, cardH / 2], [0.5, cardH / 2], [0.5, -cardH / 2], [-0.5, -cardH / 2]] as [number, number][]).map((c) => toPx(apply(M, c[0], c[1], 0)));
      const phoneIn = phone.every(inside);
      const sheets = flying.map((s) => {
        const c: P3[] = [0, 1, 2, 3].map((k) => [s.corners[k * 3], s.corners[k * 3 + 1], s.corners[k * 3 + 2]] as P3);
        // independent: room pose (centre, yaw about +Y, scale) of the layer's rect, through the pose matrix
        const R = s.room, cy = Math.cos(R.yaw), sy = Math.sin(R.yaw), rw = s.rect[2] * R.scale, rh = s.rect[3] * R.scale;
        let errU = 0, errPx = 0;
        [[-1, 1], [1, 1], [1, -1], [-1, -1]].forEach(([sx, sy2], k) => {
          const lx = (sx * rw) / 2, ly = (sy2 * rh) / 2;
          const want = apply(M, R.x + cy * lx, R.y + ly, R.z + THICK - sy * lx);
          errU = Math.max(errU, Math.hypot(want[0] - c[k][0], want[1] - c[k][1], want[2] - c[k][2]));
          if (want[2] < -0.3 && c[k][2] < -0.3) { const a = toPx(want), b = toPx(c[k]); errPx = Math.max(errPx, Math.hypot(a[0] - b[0], a[1] - b[1])); }
        });
        worstCornerUnits = Math.max(worstCornerUnits, errU);
        worstCornerPx = Math.max(worstCornerPx, errPx);
        const near = clipNear(c), proj = near.map(toPx), vis = near.length >= 3 ? clip2(proj, 0, 0, W, Hh) : [];
        const visArea = vis.length >= 3 ? area(vis) : 0;
        const allIn = near.length === 4 && proj.every(inside);
        // of the sheet's points that are between the left and right edges of the frame, the share that is
        // also between its top and bottom edges: 1 when the frame does not cut the sheet from above or below
        let cols = 0, colsIn = 0;
        const N = 16;
        for (let a = 0; a <= N; a++) for (let b = 0; b <= N; b++) {
          const u = a / N, v = b / N;
          const q = [0, 1, 2].map((k) => (c[0][k] * (1 - u) + c[1][k] * u) * (1 - v) + (c[3][k] * (1 - u) + c[2][k] * u) * v) as P3;
          if (q[2] > -0.12) continue;
          const px = toPx(q);
          if (px[0] < 0 || px[0] > W) continue;
          cols++;
          if (px[1] >= 0 && px[1] <= Hh) colsIn++;
        }
        return {
          id: s.id, on: s.on, kind: R.kind, roomY: R.y, widthUnits: +(s.rect[2] * s.scale[0]).toFixed(3), visibleShareOfCanvas: +(visArea / (W * Hh)).toFixed(4),
          visibleShareOfSheet: near.length === 4 ? +(visArea / Math.max(1, area(proj))).toFixed(3) : null,
          insideTopToBottom: cols > 0 ? +(colsIn / cols).toFixed(3) : null,
          inFrame: s.on && visArea >= 0.015 * W * Hh, crossesEdge: s.on && visArea >= 2000 && !allIn, outline: vis,
        };
      });
      // the row of sheets next below the phone, and the one next above it
      const floats = sheets.filter((s) => s.kind === 2);
      const rowNext = (below: boolean) => {
        const side = floats.filter((s) => (below ? s.roomY < 0 : s.roomY > 0));
        if (side.length === 0) return null;
        const edge = below ? Math.max(...side.map((s) => s.roomY)) : Math.min(...side.map((s) => s.roomY));
        const row = side.filter((s) => Math.abs(s.roomY - edge) <= 0.3);
        return { ids: row.map((s) => s.id), insideTopToBottom: Math.min(...row.map((s) => s.insideTopToBottom ?? 0)), visibleShareOfSheet: Math.min(...row.map((s) => s.visibleShareOfSheet ?? 0)) };
      };
      const labels = (st.labels as any[]).filter((l) => l.shown);
      let overlaps = 0, outside = 0;
      const hit = (a: any, b: any) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      for (let i = 0; i < labels.length; i++) {
        const a = labels[i];
        if (a.x < 0 || a.y < 0 || a.x + a.w > W || a.y + a.h > Hh) outside++;
        for (let j = i + 1; j < labels.length; j++) if (hit(a, labels[j])) overlaps++;
        const d = st.distance.rect as number[];
        if (d[2] > 0 && hit(a, { x: d[0], y: d[1], w: d[2], h: d[3] })) overlaps++;
      }
      const unnamed = sheets.filter((s) => s.inFrame && !labels.some((l) => l.id === s.id)).map((s) => s.id);
      // a block that lies on the visible part of a sheet other than its own (the wall and the grid are backdrops, not counted)
      const onSheet = (b: { x: number; y: number; w: number; h: number }, own: string | null) =>
        floats.filter((s) => s.id !== own && s.on && s.outline.length >= 3 && area(clip2(s.outline, b.x, b.y, b.x + b.w, b.y + b.h)) > 4).map((s) => s.id);
      const labelsOnOtherSheets = labels.map((l) => ({ id: l.id, on: onSheet(l, l.id) })).filter((l) => l.on.length > 0);
      const dr = st.distance.rect as number[];
      const distanceLabelOnSheets = dr[2] > 0 ? onSheet({ x: dr[0], y: dr[1], w: dr[2], h: dr[3] }, null) : [];
      // guides: a guide runs past a frame edge when part of it is drawn in the frame and it does not end there
      let guidesPast = 0;
      for (const g of st.guides as number[][]) {
        const seg = clipNear([[g[0], g[1], g[2]], [g[3], g[4], g[5]]] as P3[]);
        if (seg.length < 2 || g[6] <= 0.05) continue;
        const a = toPx(seg[0]), b = toPx(seg[1]);
        // length of the part inside the canvas (Liang-Barsky)
        let t0 = 0, t1 = 1;
        const dx = b[0] - a[0], dy = b[1] - a[1];
        const clipT = (p: number, q: number) => { if (p === 0) return q >= 0; const tt = q / p; if (p < 0) { if (tt > t1) return false; if (tt > t0) t0 = tt; } else { if (tt < t0) return false; if (tt < t1) t1 = tt; } return true; };
        if (clipT(-dx, a[0]) && clipT(dx, W - a[0]) && clipT(-dy, a[1]) && clipT(dy, Hh - a[1]) && (t1 - t0) * Math.hypot(dx, dy) >= 40 && (!inside(a) || !inside(b))) guidesPast++;
      }
      views.push({
        pose: { yawDeg: pose[0], pitchDeg: pose[1], cm: +(pose[2] * 7).toFixed(1) }, phoneInFrame: phoneIn,
        sheetsInFrame: sheets.filter((s) => s.inFrame).length, sheetsCrossingEdge: sheets.filter((s) => s.crossesEdge).length,
        largestSheetCardWidths: Math.max(...sheets.map((s) => s.widthUnits)), labelsShown: labels.length, labelOverlaps: overlaps,
        labelsOutsideCanvas: outside, sheetsInFrameWithoutLabel: unnamed, guidesDrawn: (st.guides as number[][]).length, guidesPastFrameEdge: guidesPast,
        distanceCm: st.distance.cm, rowNextBelowPhone: rowNext(true), rowNextAbovePhone: rowNext(false),
        labelsOnOtherSheets, distanceLabelOnSheets, sheets: sheets.map(({ outline, ...rest }) => rest),
      });
    }
    const st = T.state() as any;
    return {
      poses: POSES.length, textPx: st.textPx, roomIdenticalAcrossPoses: roomSame, layoutSpread: roomSame ? 0 : 1,
      worstCornerErrorCardUnits: +worstCornerUnits.toExponential(2), worstCornerErrorCssPx: +worstCornerPx.toFixed(4),
      room: (st.sheets as any[]).filter((s) => !s.qr).map((s) => ({ id: s.id, ...s.room })), columns: st.cols, views,
    };
  }, { POSES, FOV, ASPECT });
  record("room-scale", r);
  expect(r.poses).toBeGreaterThanOrEqual(12);
  expect(r.textPx).toBeGreaterThanOrEqual(12);
  expect(r.roomIdenticalAcrossPoses).toBe(true);
  expect(r.worstCornerErrorCssPx).toBeLessThanOrEqual(0.05);
  const backdrops = (r.room as any[]).filter((s) => s.kind !== 2).map((s) => s.id);
  for (const v of r.views as any[]) {
    const name = `${v.pose.yawDeg}/${v.pose.pitchDeg}/${v.pose.cm} cm`;
    expect(v.phoneInFrame, `${name}: phone in frame`).toBe(true);
    expect(v.sheetsInFrame, `${name}: sheets in frame`).toBeGreaterThanOrEqual(3);
    expect(v.sheetsCrossingEdge, `${name}: a sheet crossing a frame edge`).toBeGreaterThanOrEqual(1);
    expect(v.largestSheetCardWidths, name).toBeGreaterThanOrEqual(5);
    expect(v.largestSheetCardWidths, name).toBeLessThanOrEqual(7);
    expect(v.labelOverlaps, `${name}: overlapping labels`).toBe(0);
    expect(v.labelsOutsideCanvas, `${name}: labels outside the canvas`).toBe(0);
    expect(v.sheetsInFrameWithoutLabel, `${name}: sheets in frame without a label`).toEqual([]);
    expect(v.guidesPastFrameEdge, `${name}: a guide past a frame edge`).toBeGreaterThanOrEqual(1);
    // A26: the frame does not cut the row next below the phone from below (it may cut it at the sides)
    expect(v.rowNextBelowPhone.insideTopToBottom, `${name}: the row next below the phone, inside the frame top to bottom`).toBeGreaterThanOrEqual(0.97);
    // A26: on the phone's horizon and at the standard pose no sheet's label lies on another sheet, nor does the distance label
    if (v.pose.pitchDeg === 0 || (v.pose.yawDeg === -14 && v.pose.pitchDeg === 6)) {
      expect(v.labelsOnOtherSheets.filter((l: any) => !backdrops.includes(l.id)), `${name}: labels lying on another sheet`).toEqual([]);
      expect(v.distanceLabelOnSheets, `${name}: the distance label lying on a sheet`).toEqual([]);
    }
  }
  noPageErrors(page);
});
