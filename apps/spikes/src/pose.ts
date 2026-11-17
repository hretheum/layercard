// Homography (DLT, normalised) and planar pose recovery, plus a One Euro filter.

type P2 = [number, number];

function normalise(pts: P2[]) {
  let cx = 0, cy = 0;
  for (const [x, y] of pts) { cx += x; cy += y; }
  cx /= pts.length; cy /= pts.length;
  let d = 0;
  for (const [x, y] of pts) d += Math.hypot(x - cx, y - cy);
  d /= pts.length;
  const s = d > 0 ? Math.SQRT2 / d : 1;
  return { s, cx, cy, pts: pts.map(([x, y]) => [s * (x - cx), s * (y - cy)] as P2) };
}

function solve(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

function mul3(a: number[], b: number[]): number[] {
  const r = new Array(9).fill(0);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) r[i * 3 + j] += a[i * 3 + k] * b[k * 3 + j];
  return r;
}

/** Row-major 3x3 homography mapping src (card units) to dst (image px). Needs >= 4 points. */
export function homography(src: P2[], dst: P2[]): number[] | null {
  if (src.length < 4) return null;
  const ns = normalise(src), nd = normalise(dst);
  const AtA = Array.from({ length: 8 }, () => new Array(8).fill(0));
  const Atb = new Array(8).fill(0);
  for (let i = 0; i < src.length; i++) {
    const [x, y] = ns.pts[i], [u, v] = nd.pts[i];
    const rows: [number[], number][] = [
      [[x, y, 1, 0, 0, 0, -u * x, -u * y], u],
      [[0, 0, 0, x, y, 1, -v * x, -v * y], v],
    ];
    for (const [r, bv] of rows) {
      for (let a = 0; a < 8; a++) {
        Atb[a] += r[a] * bv;
        for (let c = 0; c < 8; c++) AtA[a][c] += r[a] * r[c];
      }
    }
  }
  const h = solve(AtA, Atb);
  if (!h) return null;
  const Hn = [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
  const Ts = [ns.s, 0, -ns.s * ns.cx, 0, ns.s, -ns.s * ns.cy, 0, 0, 1];
  const TdInv = [1 / nd.s, 0, nd.cx, 0, 1 / nd.s, nd.cy, 0, 0, 1];
  return mul3(mul3(TdInv, Hn), Ts);
}

const norm = (v: number[]) => Math.hypot(v[0], v[1], v[2]);
const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Pose of the card plane in camera space, recovered in OpenCV convention (x right, y down,
 *  z forward) and returned in Three.js camera space (y up, z backward) as a column-major 4x4. */
export function poseFromHomography(H: number[], f: number, cx: number, cy: number): Float32Array | null {
  const col = (j: number) => [H[j], H[3 + j], H[6 + j]];
  const kinv = (v: number[]) => [(v[0] - cx * v[2]) / f, (v[1] - cy * v[2]) / f, v[2]];
  const m1 = kinv(col(0)), m2 = kinv(col(1)), m3 = kinv(col(2));
  const lambda = 2 / (norm(m1) + norm(m2));
  let r1 = m1.map((x) => x * lambda), r2 = m2.map((x) => x * lambda), t = m3.map((x) => x * lambda);
  if (t[2] < 0) { r1 = r1.map((x) => -x); r2 = r2.map((x) => -x); t = t.map((x) => -x); }
  const n1 = norm(r1);
  r1 = r1.map((x) => x / n1);
  const d = dot(r1, r2);
  r2 = r2.map((x, i) => x - d * r1[i]);
  const n2 = norm(r2);
  if (!isFinite(n2) || n2 < 1e-9) return null;
  r2 = r2.map((x) => x / n2);
  const r3 = cross(r1, r2);
  const F = (v: number[]) => [v[0], -v[1], -v[2]];
  const a = F(r1), b = F(r2), c = F(r3), tt = F(t);
  return new Float32Array([a[0], a[1], a[2], 0, b[0], b[1], b[2], 0, c[0], c[1], c[2], 0, tt[0], tt[1], tt[2], 1]);
}

/** One Euro filter for a scalar signal. */
export class OneEuro {
  private x: number | null = null;
  private dx = 0;
  private t: number | null = null;
  constructor(private minCutoff = 1.2, private beta = 0.02, private dCutoff = 1.0) {}
  private alpha(cutoff: number, dt: number) { const tau = 1 / (2 * Math.PI * cutoff); return 1 / (1 + tau / dt); }
  filter(value: number, tMs: number): number {
    if (this.x === null || this.t === null) { this.x = value; this.t = tMs; return value; }
    const dt = Math.max(1e-3, (tMs - this.t) / 1000);
    this.t = tMs;
    const dxRaw = (value - this.x) / dt;
    this.dx += this.alpha(this.dCutoff, dt) * (dxRaw - this.dx);
    const cutoff = this.minCutoff + this.beta * Math.abs(this.dx);
    this.x += this.alpha(cutoff, dt) * (value - this.x);
    return this.x;
  }
  reset() { this.x = null; this.t = null; this.dx = 0; }
}
