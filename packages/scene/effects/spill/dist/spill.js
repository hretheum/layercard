import { Vector4 as G, Vector2 as bt, BufferGeometry as Ue, BufferAttribute as nt, ShaderMaterial as ht, Vector3 as B, FrontSide as es, OneMinusSrcAlphaFactor as ss, OneFactor as is, AddEquation as as, CustomBlending as os, DoubleSide as rs, InstancedBufferGeometry as Qe, InstancedBufferAttribute as vt, DynamicDrawUsage as Ge, Scene as ns, Camera as hs, Group as cs, Quaternion as at, Euler as ls, Matrix4 as us, WebGLRenderer as fs, Texture as ce, Mesh as X, CanvasTexture as le, LinearFilter as ue, LinearMipmapLinearFilter as vs } from "three";
function st(a, t, s) {
  const i = Math.max(1, Math.round(a)), e = Math.max(1, Math.round(t));
  if (typeof OffscreenCanvas < "u") return new OffscreenCanvas(i, e);
  const h = s.ownerDocument.createElement("canvas");
  return h.width = i, h.height = e, h;
}
function dt(a, t = !1) {
  const s = a.getContext("2d", t ? { willReadFrequently: !0 } : void 0);
  if (!s) throw new Error("spill: 2D canvas context unavailable");
  return s;
}
function fe(a, t) {
  const s = new URL(a.endsWith("/") ? a : a + "/", self.location.href);
  return new URL(t, s).href;
}
async function ve(a) {
  const t = new Image();
  t.crossOrigin = "anonymous", t.decoding = "async", t.src = a;
  try {
    await t.decode();
  } catch {
    throw new Error(`spill: cannot load layer image ${a}`);
  }
  return t;
}
function ds(a, t, s, i, e, h, l, r = null, o = 0, f = 0) {
  const c = Math.floor(t + 1e-4), d = Math.floor(s + 1e-4), u = Math.ceil(t + i - 1e-4), p = Math.ceil(s + e - 1e-4), v = Math.max(1, u - c), x = Math.max(1, p - d), y = h.width, w = h.height, n = st(v, x, l), m = dt(n, !0);
  m.imageSmoothingEnabled = !1, m.globalCompositeOperation = "copy";
  const g = c >= 0 && d >= 0 && u <= y && p <= w;
  if (!g && r) {
    const R = dt(r, !0);
    R.setTransform(1, 0, 0, 1, 0, 0), R.globalCompositeOperation = "source-over", R.imageSmoothingEnabled = !0, R.imageSmoothingQuality = "high", R.clearRect(c - o - 1, d - f - 1, v + 2, x + 2), R.drawImage(a, t - o, s - f, i, e), m.drawImage(r, c - o, d - f, v, x, 0, 0, v, x), R.clearRect(c - o - 1, d - f - 1, v + 2, x + 2);
  }
  const b = Math.max(0, c), S = Math.max(0, d), F = Math.min(y, u), T = Math.min(w, p);
  if (F > b && T > S) {
    const R = dt(h, !0);
    R.setTransform(1, 0, 0, 1, 0, 0), R.globalCompositeOperation = "source-over", R.clearRect(b - 1, S - 1, F - b + 2, T - S + 2), R.imageSmoothingEnabled = !0, R.imageSmoothingQuality = "high", R.drawImage(a, t, s, i, e), g || (m.globalCompositeOperation = "source-over", m.clearRect(b - c, S - d, F - b, T - S)), m.drawImage(h, b, S, F - b, T - S, b - c, S - d, F - b, T - S), R.clearRect(b - 1, S - 1, F - b + 2, T - S + 2);
  }
  return { canvas: n, x0: c, y0: d, w: v, h: x, tu: (t - c) / v, tv: 1 - (s - d + e) / x, tw: i / v, th: e / x };
}
function de(a, t) {
  const s = { ox: 0, oy: 0, nx: 25, ny: 25 };
  try {
    const i = Math.min(512, a.naturalWidth || 256), e = Math.min(512, a.naturalHeight || 256), h = st(i, e, t), l = dt(h, !0);
    l.imageSmoothingEnabled = !1, l.drawImage(a, 0, 0, i, e);
    const r = l.getImageData(0, 0, i, e).data;
    let o = 255, f = 0;
    const c = new Uint8Array(i * e);
    for (let g = 0; g < i * e; g++) {
      const b = r[g * 4 + 3] / 255, S = Math.round((0.299 * r[g * 4] + 0.587 * r[g * 4 + 1] + 0.114 * r[g * 4 + 2]) * b + 255 * (1 - b));
      c[g] = S, S < o && (o = S), S > f && (f = S);
    }
    if (f - o < 60) return s;
    const d = (o + f) / 2;
    let u = i, p = e, v = -1, x = -1;
    for (let g = 0; g < e; g++) for (let b = 0; b < i; b++)
      c[g * i + b] < d && (b < u && (u = b), b > v && (v = b), g < p && (p = g), g > x && (x = g));
    if (v < 0) return s;
    let y = 0;
    for (; u + y < i && c[p * i + u + y] < d; ) y++;
    const w = y / 7, n = Math.round((v - u + 1) / w);
    if (w < 1.5 || n < 21 || n > 177 || (n - 21) % 4 !== 0) return s;
    const m = (v - u + 1) / n;
    return { ox: u % m / i, oy: p % m / e, nx: i / m, ny: e / m };
  } catch {
    return s;
  }
}
const Ne = "SpillMono", ps = `${Ne}, ui-monospace, Menlo, Consolas, monospace`;
let Dt = null, Ht = null, Ot = 0;
function ms() {
  if (Ot++, !Ht) {
    const a = new FontFace(Ne, `url(${new URL("./spill-mono.woff2", import.meta.url).href})`, { weight: "500", style: "normal" });
    Dt = a, Ht = a.load().then(
      () => {
        document.fonts.add(a);
      },
      () => {
      }
    );
  }
  return Ht;
}
function ys() {
  Ot--, Ot <= 0 && (Dt && document.fonts.delete(Dt), Dt = null, Ht = null, Ot = 0);
}
const $t = 20, wt = 18, pe = 2, me = 12, ye = 11, je = 14;
function xs(a, t, s, i) {
  const e = dt(st(4, 4, i)), h = (p) => `500 ${p * t}px ${ps}`, l = [];
  let r = 2, o = 2;
  for (const p of a) {
    const v = p.kind === "tag" ? ye : me, x = p.kind === "segL" || p.kind === "seg" || p.kind === "segR", y = p.kind === "tag" || x ? 0 : 6;
    e.font = h(v);
    let w = p.text;
    const n = (b) => e.measureText(b).width / t + 2 * y <= s;
    if (!x && !n(w)) {
      for (; w.length > 1 && !n(w + "…"); ) w = w.slice(0, -1);
      w += "…";
    }
    const m = p.kind === "segL" ? 5 : Math.ceil(e.measureText(w).width / t + 2 * y) + (p.kind === "segR" ? 6 : 0), g = p.kind === "chip" ? $t : p.kind === "tag" ? je : wt;
    l.push({ w: m, h: g, text: w }), r = Math.max(r, Math.ceil(m * t) + 4), o += Math.ceil(g * t) + 4;
  }
  const f = st(r, o, i), c = dt(f), d = [];
  let u = 2;
  return a.forEach((p, v) => {
    const x = l[v], y = Math.ceil(x.w * t), w = Math.ceil(x.h * t), n = p.kind === "tag" ? ye : me;
    c.font = h(n), c.textBaseline = "alphabetic";
    const m = c.measureText("H").actualBoundingBoxAscent || n * t * 0.72;
    if (p.kind !== "tag") {
      const b = 3 * t, S = p.kind === "seg" || p.kind === "segR" ? 0 : b, F = p.kind === "seg" || p.kind === "segL" ? 0 : b;
      c.fillStyle = p.kind === "chip" ? "#2F80FF" : "#FF4D3D", c.beginPath(), c.moveTo(2 + S, u), c.arcTo(2 + y, u, 2 + y, u + w, F), c.arcTo(2 + y, u + w, 2, u + w, F), c.arcTo(2, u + w, 2, u, S), c.arcTo(2, u, 2 + y, u, S), c.closePath(), c.fill();
    }
    c.fillStyle = p.kind === "tag" ? "#2F80FF" : "#FFFFFF";
    const g = p.kind === "tag" || p.kind === "segR" ? 0 : p.kind === "seg" ? (y - c.measureText(x.text).width) / 2 : 6 * t;
    x.text && c.fillText(x.text, 2 + g, Math.round(u + (w + m) / 2)), d.push({ w: y / t, h: w / t, u0: 2 / r, v0: u / o, u1: (2 + y) / r, v1: (u + w) / o }), u += w + 4;
  }), { canvas: f, entries: d, bytes: r * o * 4 };
}
function ws(a, t) {
  try {
    const e = st(512, 48, t), h = dt(e, !0);
    h.imageSmoothingEnabled = !0, h.imageSmoothingQuality = "high", h.drawImage(a, 0, 0, 512, 48);
    const l = h.getImageData(0, 0, 512, 48).data, r = new Float32Array(512);
    let o = 0;
    for (let y = 0; y < 512; y++) {
      let w = 0;
      for (let n = 0; n < 48; n++) w += l[(n * 512 + y) * 4 + 3];
      r[y] = w / 12240, r[y] > o && (o = r[y]);
    }
    if (o < 0.01) return null;
    const f = o / 2, c = [], d = [], u = (y) => y - 0.5 + (f - r[y - 1]) / (r[y] - r[y - 1]);
    r[0] > f && c.push(0);
    for (let y = 1; y < 512; y++)
      r[y - 1] <= f && r[y] > f ? c.push(u(y) + 0.5) : r[y - 1] > f && r[y] <= f && d.push(u(y) + 0.5);
    d.length < c.length && d.push(512);
    const p = c.length;
    if (p < 2 || p > 24 || d.length !== p) return null;
    const v = (c[p - 1] - c[0]) / (p - 1);
    let x = 0;
    for (let y = 0; y < p; y++) x += (d[y] - c[y]) / p;
    for (let y = 0; y < p; y++)
      if (Math.abs(c[y] - (c[0] + y * v)) > 0.08 * v || Math.abs(d[y] - c[y] - x) > 0.2 * x) return null;
    return x <= 1 || x >= v ? null : { x0: c[0] / 512, pitch: v / 512, width: x / 512 };
  } catch {
    return null;
  }
}
function gs() {
  return {
    uRes: { value: new bt(1, 1) },
    uPr: { value: 1 },
    uSafe: { value: [new G(), new G(), new G(), new G()] },
    uOrtho: { value: 1 },
    uSnap: { value: 0 },
    uHole: { value: [new G(), new G()] },
    uHoleOn: { value: 0 }
  };
}
const pt = (
  /* glsl */
  `
uniform vec4 uSafe[4];
bool spillSafe() {
  vec2 f = gl_FragCoord.xy;
  for (int i = 0; i < 4; i++) {
    vec4 r = uSafe[i];
    if (f.x >= r.x && f.x < r.z && f.y >= r.y && f.y < r.w) return true;
  }
  return false;
}`
), Ye = (
  /* glsl */
  `
uniform vec4 uHole[2];
uniform float uHoleOn;
uniform float uBehind;
uniform vec2 uNear;
varying float vDepth;
float cross2(vec2 a, vec2 b) { return a.x * b.y - a.y * b.x; }
// 1 outside the host phone's quad, 0 inside it (device px, either winding)
float holeMask() {
  vec2 p = gl_FragCoord.xy;
  vec2 a = uHole[0].xy, b = uHole[0].zw, c = uHole[1].xy, d = uHole[1].zw;
  float s = cross2(b - a, c - b) < 0.0 ? -1.0 : 1.0;
  float e0 = s * cross2(b - a, p - a) / max(length(b - a), 1e-3);
  float e1 = s * cross2(c - b, p - b) / max(length(c - b), 1e-3);
  float e2 = s * cross2(d - c, p - c) / max(length(d - c), 1e-3);
  float e3 = s * cross2(a - d, p - d) / max(length(a - d), 1e-3);
  return 1.0 - smoothstep(0.0, 4.0, min(min(e0, e1), min(e2, e3)));
}
// what is left of a fragment: it fades out close to the camera, and behind the host phone it is not drawn
float keepAmount() {
  float f = uNear.y > 0.0 ? smoothstep(uNear.x, uNear.y, vDepth) : 1.0;
  if (uBehind > 0.0 && uHoleOn > 0.0) f *= mix(1.0, holeMask(), uBehind * uHoleOn);
  return f;
}`
), bs = (
  /* glsl */
  `
attribute float aFace;
uniform vec4 uBox;
uniform vec2 uRes;
uniform float uSnap;
uniform float uOrtho;
uniform float uZoom;
varying vec2 vUv;
varying float vFace;
varying vec3 vN;
varying vec3 vV;
varying vec2 vCard;
varying vec3 vNo;
varying float vDepth;
void main() {
  // uZoom < 1 magnifies the print about its centre inside a quad that keeps its size (host lift)
  vUv = (uv - 0.5) * uZoom + 0.5;
  vFace = aFace;
  vNo = normal;
  vCard = uBox.xy + position.xy * uBox.zw;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDepth = -mv.z;
  vN = normalize(normalMatrix * normal);
  vV = uOrtho > 0.5 ? vec3(0.0, 0.0, 1.0) : normalize(-mv.xyz);
  vec4 p = projectionMatrix * mv;
  if (uSnap > 0.5) {
    vec2 px = floor((p.xy / p.w * 0.5 + 0.5) * uRes + 0.5);
    p.xy = (px / uRes * 2.0 - 1.0) * p.w;
  }
  gl_Position = p;
}`
), Ms = (
  /* glsl */
  `
uniform sampler2D map;
uniform sampler2D mapB;
uniform float uMix;
uniform float uOpacity;
uniform float uAcr;
uniform float uSweep;
uniform float uSweepAmt;
uniform float uPr;
uniform vec3 uInner;
uniform vec4 uQr;
uniform vec3 uQrT;
uniform vec4 uTile;
varying vec2 vUv;
varying float vFace;
varying vec3 vN;
varying vec3 vV;
varying vec2 vCard;
varying vec3 vNo;
const vec3 RIM = vec3(0.918, 0.949, 1.0);
const vec3 TINT = vec3(0.624, 0.722, 0.851);
uniform float uReveal;
uniform float uInk;
${pt}
${Ye}
vec4 layerTex(vec2 uv) {
  vec4 a = texture2D(map, uv);
  if (uMix > 0.0) a = mix(a, texture2D(mapB, uv), uMix);
  return a;
}
#ifdef SPILL_QR
// Dissolve along the code's own module grid: each module shrinks, lifts and fades, swept diagonally.
vec4 qrTex(vec2 uv) {
  if (uQrT.x <= 0.0) return layerTex(uv);
  vec2 t = (uv - uTile.xy) / uTile.zw;
  t.y = 1.0 - t.y;
  float n = max(uQr.z + uQr.w - 2.0, 1.0);
  vec2 c0 = floor((t - uQr.xy) * uQr.zw);
  float q0 = clamp((uQrT.x * 1.35 - clamp((c0.x + c0.y) / n, 0.0, 1.0)) / 0.35, 0.0, 1.0);
  vec2 g = (t - uQrT.yz * (q0 * q0 * (3.0 - 2.0 * q0)) - uQr.xy) * uQr.zw;
  vec2 c = floor(g);
  float q = clamp((uQrT.x * 1.35 - clamp((c.x + c.y) / n, 0.0, 1.0)) / 0.35, 0.0, 1.0);
  vec2 f = (fract(g) - 0.5) / (1.0 - 0.3 * q) + 0.5;
  if (f.x < 0.0 || f.y < 0.0 || f.x > 1.0 || f.y > 1.0) return vec4(0.0);
  vec2 s = (c + f) / uQr.zw + uQr.xy;
  if (s.x < 0.0 || s.y < 0.0 || s.x > 1.0 || s.y > 1.0) return vec4(0.0);
  s.y = 1.0 - s.y;
  return layerTex(uTile.xy + s * uTile.zw) * (1.0 - smoothstep(0.3, 1.0, q));
}
#endif
void main() {
  if (spillSafe()) discard;
  // unrolling: the sheet shows from its middle outwards (up and down) as far as uReveal
  float rv = uReveal - abs(vUv.y - 0.5) * 2.0;
  if (uReveal < 1.0 && rv < 0.0) discard;
  float keep = keepAmount();
  if (keep <= 0.0) discard;
  if (vFace > 1.5) {
    float lit = 0.5 + 0.5 * dot(normalize(vNo.xy), vec2(-0.64, 0.77));
    float a = uAcr * uOpacity * 0.9 * keep;
    gl_FragColor = vec4(RIM * (0.45 + 0.55 * lit) * a, a);
    return;
  }
#ifdef SPILL_QR
  vec4 c = qrTex(vUv);
#else
  vec4 c = layerTex(vUv);
#endif
  c *= uInk;
  if (uAcr > 0.0) {
    vec2 fw = max(fwidth(vUv), vec2(1e-6));
    vec2 e = min(vUv, 1.0 - vUv) / fw;
    float d = min(e.x, e.y);
    float lit = e.x < e.y ? (vUv.x < 0.5 ? 1.0 : 0.55) : (vUv.y > 0.5 ? 1.0 : 0.55);
    float rimW = min(1.25 * uPr, 0.14 * min(1.0 / fw.x, 1.0 / fw.y));
    float line = 1.0 - smoothstep(rimW - 0.6, rimW + 0.6, d);
    float soft = 0.16 * exp(-d / (5.0 * uPr));
    float fr = pow(1.0 - clamp(abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0), 2.0);
    if (uInner.z >= 0.0) {
      // the print's own shadow on the back face of the slab: keeps light print readable on a bright room
      float ia = 0.3 * uAcr * textureLod(map, clamp(vUv + uInner.xy, 0.0, 1.0), uInner.z).a;
      c += (1.0 - c.a) * vec4(vec3(0.0196, 0.0275, 0.0392) * ia, ia);
    }
    float tintA = uAcr * (0.06 + 0.2 * fr);
    c += (1.0 - c.a) * vec4(TINT * tintA, tintA);
    float rimA = uAcr * clamp((line + soft) * lit, 0.0, 1.0) * mix(0.8, 1.0, fr);
    c = c * (1.0 - rimA) + vec4(RIM * rimA, rimA);
    float s = dot(vCard, vec2(0.8, -0.6)) - uSweep;
    float sw = uSweepAmt * uAcr * (0.1 * exp(-s * s / 0.0256) + 0.07 * exp(-s * s / 0.0009)) * (1.0 + 1.5 * fr);
    c.rgb += RIM * sw;
    c.a = min(1.0, c.a + sw);
    if (uReveal < 1.0) {
      // the roll: a bright bar along the edge that is still unrolling
      float roll = uAcr * (1.0 - smoothstep(0.0, 5.0 * fw.y, rv));
      c = c * (1.0 - roll) + vec4(RIM * roll, roll);
    }
  }
  gl_FragColor = c * (uOpacity * keep);
}`
), As = (
  /* glsl */
  `
uniform vec4 uBox;
varying vec2 vUv;
varying vec2 vCard;
void main() {
  vUv = uv;
  vCard = uBox.xy + position.xy * uBox.zw;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`
), Ps = (
  /* glsl */
  `
uniform sampler2D map;
uniform vec2 uGrow;
uniform vec2 uRad;
uniform float uLod;
uniform float uAlpha;
uniform float uSlab;
uniform vec4 uClip;
varying vec2 vUv;
varying vec2 vCard;
const vec3 SHADOW = vec3(0.0196, 0.0275, 0.0392);
${pt}
float tap(vec2 uv) { return textureLod(map, clamp(uv, 0.0, 1.0), uLod).a; }
void main() {
  if (spillSafe()) discard;
  vec2 cuv = (vUv - 0.5) * uGrow + 0.5;
  vec2 r = max(uRad, vec2(1e-4));
  vec2 m = smoothstep(-r, r, cuv) * smoothstep(-r, r, 1.0 - cuv);
  float a = tap(cuv);
#if SPILL_TAPS > 1
  a = (a * 2.0 + tap(cuv + r * vec2(0.7, 0.3)) + tap(cuv + r * vec2(-0.3, 0.7))
     + tap(cuv + r * vec2(-0.7, -0.3)) + tap(cuv + r * vec2(0.3, -0.7))) / 6.0;
#endif
  float sh = max(a, uSlab) * m.x * m.y * uAlpha;
  vec2 c0 = smoothstep(uClip.xy - 0.003, uClip.xy + 0.003, vCard);
  vec2 c1 = 1.0 - smoothstep(uClip.zw - 0.003, uClip.zw + 0.003, vCard);
  sh *= c0.x * c0.y * c1.x * c1.y;
  gl_FragColor = vec4(SHADOW * sh, sh);
}`
), Ss = (
  /* glsl */
  `
attribute vec3 iA;
attribute vec3 iB;
attribute vec4 iP;
attribute vec4 iC;
uniform vec2 uRes;
uniform float uPr;
uniform float uScreen;
uniform float uSnap;
uniform vec4 uProg;
uniform vec4 uAlpha;
varying vec4 vC;
varying vec3 vL;
varying vec2 vS;
void main() {
  int g = int(iP.y + 0.5);
  float prog = g == 0 ? uProg.x : g == 1 ? uProg.y : g == 2 ? uProg.z : uProg.w;
  float al = g == 0 ? uAlpha.x : g == 1 ? uAlpha.y : g == 2 ? uAlpha.z : uAlpha.w;
  vec2 a;
  vec2 b;
  bool cut = false;
  if (uScreen > 0.5) {
    a = vec2(iA.x * uPr, uRes.y - iA.y * uPr);
    b = vec2(iB.x * uPr, uRes.y - iB.y * uPr);
  } else {
    vec4 ca = projectionMatrix * modelViewMatrix * vec4(iA, 1.0);
    vec4 cb = projectionMatrix * modelViewMatrix * vec4(iB, 1.0);
    const float NEARW = 0.06;
    if (ca.w < NEARW && (cb.w < NEARW || g == 2)) cut = true;
    else if (ca.w < NEARW) ca = mix(ca, cb, (NEARW - ca.w) / (cb.w - ca.w));
    else if (cb.w < NEARW) cb = mix(cb, ca, (NEARW - cb.w) / (ca.w - cb.w));
    a = (ca.xy / max(ca.w, 1e-4) * 0.5 + 0.5) * uRes;
    b = (cb.xy / max(cb.w, 1e-4) * 0.5 + 0.5) * uRes;
  }
  float w = iP.x * uPr;
  vec2 p;
  float along = 0.0;
  float len = 0.0;
  if (g == 2) {
    float s = w * (0.4 + 0.6 * clamp(prog, 0.0, 1.0));
    p = a + vec2(position.x * 2.0 - 1.0, position.y) * s * 0.5;
    vS = vec2(0.0);
  } else {
    if (uSnap > 0.5) { a = floor(a) + 0.5; b = floor(b) + 0.5; }
    vec2 d = b - a;
    len = length(d);
    vec2 dir = len > 1e-3 ? d / len : vec2(1.0, 0.0);
    float cap = g == 0 ? w * 0.5 : 0.0;
    along = position.x < 0.5 ? -cap : len - cap;
    p = a + dir * along + vec2(-dir.y, dir.x) * position.y * w * 0.5;
    vS = iP.zw;
  }
  vL = vec3(along, len, prog);
  vC = vec4(iC.rgb * iC.a, iC.a) * al;
  gl_Position = cut ? vec4(2.0, 2.0, 2.0, 1.0) : vec4(p / uRes * 2.0 - 1.0, 0.0, 1.0);
}`
), ks = (
  /* glsl */
  `
uniform float uDash;
varying vec4 vC;
varying vec3 vL;
varying vec2 vS;
${pt}
void main() {
  if (spillSafe()) discard;
  if (vL.z <= 0.0) discard;
  float s = mix(vS.x, vS.y, clamp(vL.x / max(vL.y, 1e-3), 0.0, 1.0));
  if (s > vL.z) discard;
  if (uDash > 0.0 && mod(vL.x + uDash * 0.5, uDash * 2.0) >= uDash) discard;
  gl_FragColor = vC;
}`
), Rs = (
  /* glsl */
  `
attribute vec4 iRect;
attribute vec4 iUv;
attribute vec4 iFx;
uniform vec2 uRes;
varying vec2 vUv;
varying vec2 vQ;
varying vec4 vFx;
void main() {
  vec2 q = position.xy;
  vec2 px = floor(iRect.xy + 0.5) + q * iRect.zw;
  vUv = mix(iUv.xy, iUv.zw, q);
  vQ = q;
  vFx = iFx;
  gl_Position = vec4(px.x / uRes.x * 2.0 - 1.0, 1.0 - px.y / uRes.y * 2.0, 0.0, 1.0);
}`
), Cs = (
  /* glsl */
  `
uniform sampler2D map;
varying vec2 vUv;
varying vec2 vQ;
varying vec4 vFx;
${pt}
void main() {
  if (spillSafe()) discard;
  float rv = vFx.z > 0.0 ? vQ.x : 1.0 - vQ.x;
  if (rv > vFx.y || vFx.x <= 0.0) discard;
  gl_FragColor = texture2D(map, vUv) * vFx.x;
}`
), Es = (
  /* glsl */
  `
void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`
), Ts = (
  /* glsl */
  `
uniform vec3 uColor;
uniform float uAlpha;
${pt}
void main() {
  if (spillSafe()) discard;
  gl_FragColor = vec4(uColor * uAlpha, uAlpha);
}`
), ct = {
  transparent: !0,
  side: rs,
  depthTest: !1,
  depthWrite: !1,
  blending: os,
  blendEquation: as,
  blendSrc: is,
  blendDst: ss
};
function Fs(a, t, s) {
  return new ht({
    ...ct,
    side: es,
    defines: s ? { SPILL_QR: 1 } : {},
    vertexShader: bs,
    fragmentShader: Ms,
    uniforms: {
      uRes: a.uRes,
      uPr: a.uPr,
      uSafe: a.uSafe,
      uOrtho: a.uOrtho,
      uSnap: a.uSnap,
      map: { value: t },
      mapB: { value: t },
      uMix: { value: 0 },
      uBox: { value: new G(0, 0, 1, 1) },
      uOpacity: { value: 1 },
      uAcr: { value: 0 },
      uSweep: { value: 0 },
      uSweepAmt: { value: 0 },
      uZoom: { value: 1 },
      uInner: { value: new B(0, 0, -1) },
      uHole: a.uHole,
      uHoleOn: a.uHoleOn,
      uBehind: { value: 0 },
      uNear: { value: new bt(0, 0) },
      uReveal: { value: 1 },
      uInk: { value: 1 },
      uQr: { value: new G(0, 0, 25, 25) },
      uQrT: { value: new B() },
      uTile: { value: new G(0, 0, 1, 1) }
    }
  });
}
function Ls(a, t, s) {
  return new ht({
    ...ct,
    defines: { SPILL_TAPS: s },
    vertexShader: As,
    fragmentShader: Ps,
    uniforms: {
      uSafe: a.uSafe,
      map: { value: t },
      uBox: { value: new G(0, 0, 1, 1) },
      uGrow: { value: new bt(1, 1) },
      uRad: { value: new bt(0.01, 0.01) },
      uLod: { value: 0 },
      uAlpha: { value: 0 },
      uSlab: { value: 0 },
      uClip: { value: new G(-1e3, -1e3, 1e3, 1e3) }
    }
  });
}
function Ft(a, t) {
  return new ht({
    ...ct,
    vertexShader: Ss,
    fragmentShader: ks,
    uniforms: {
      uRes: a.uRes,
      uPr: a.uPr,
      uSafe: a.uSafe,
      uSnap: { value: 0 },
      uScreen: { value: t ? 1 : 0 },
      uProg: { value: new G(1, 1, 1, 1) },
      uAlpha: { value: new G(1, 1, 1, 1) },
      uDash: { value: 0 }
    }
  });
}
function zs(a, t) {
  return new ht({
    ...ct,
    vertexShader: Rs,
    fragmentShader: Cs,
    uniforms: { uRes: a.uRes, uSafe: a.uSafe, map: { value: t } }
  });
}
function _s(a) {
  return new ht({
    ...ct,
    vertexShader: Es,
    fragmentShader: Ts,
    uniforms: { uSafe: a.uSafe, uColor: { value: new B() }, uAlpha: { value: 1 } }
  });
}
function Is() {
  const a = [], t = [], s = [], i = [], e = [], h = (f, c, d, u) => {
    const p = a.length / 3;
    for (let v = 0; v < 4; v++)
      a.push(...f[v]), t.push(...c), s.push(...d[v]), i.push(u);
    e.push(p, p + 1, p + 2, p, p + 2, p + 3);
  }, l = [[0, 0], [1, 0], [1, 1], [0, 1]], r = 0.5;
  h([[-r, -r, 0], [r, -r, 0], [r, r, 0], [-r, r, 0]], [0, 0, 1], l, 0), h([[-r, r, -1], [r, r, -1], [r, -r, -1], [-r, -r, -1]], [0, 0, -1], [[0, 1], [1, 1], [1, 0], [0, 0]], 1), h([[r, -r, -1], [r, r, -1], [r, r, 0], [r, -r, 0]], [1, 0, 0], l, 2), h([[-r, r, -1], [-r, -r, -1], [-r, -r, 0], [-r, r, 0]], [-1, 0, 0], l, 2), h([[r, r, -1], [-r, r, -1], [-r, r, 0], [r, r, 0]], [0, 1, 0], l, 2), h([[-r, -r, -1], [r, -r, -1], [r, -r, 0], [-r, -r, 0]], [0, -1, 0], l, 2);
  const o = new Ue();
  return o.setAttribute("position", new nt(new Float32Array(a), 3)), o.setAttribute("normal", new nt(new Float32Array(t), 3)), o.setAttribute("uv", new nt(new Float32Array(s), 2)), o.setAttribute("aFace", new nt(new Float32Array(i), 1)), o.setIndex(e), o;
}
function xe(a = !1) {
  const t = a ? 1 : 0.5, s = new Ue();
  return s.setAttribute("position", new nt(new Float32Array([-t, -t, 0, t, -t, 0, t, t, 0, -t, t, 0]), 3)), s.setAttribute("uv", new nt(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2)), s.setIndex([0, 1, 2, 0, 2, 3]), s;
}
function Mt(a) {
  const t = new Qe();
  t.setAttribute("position", new nt(new Float32Array([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0]), 3)), t.setIndex([0, 1, 2, 0, 2, 3]);
  const s = new Float32Array(a * 3), i = new Float32Array(a * 3), e = new Float32Array(a * 4), h = new Float32Array(a * 4), l = [
    new vt(s, 3),
    new vt(i, 3),
    new vt(e, 4),
    new vt(h, 4)
  ];
  return ["iA", "iB", "iP", "iC"].forEach((r, o) => {
    l[o].setUsage(Ge), t.setAttribute(r, l[o]);
  }), t.instanceCount = a, { geometry: t, a: s, b: i, p: e, c: h, attrs: l };
}
function D(a, t, s, i, e, h, l, r, o, f, c, d, u, p = 1) {
  const v = t * 3, x = t * 4;
  a.a[v] = s, a.a[v + 1] = i, a.a[v + 2] = e, a.b[v] = h, a.b[v + 1] = l, a.b[v + 2] = r, a.p[x] = o, a.p[x + 1] = f, a.p[x + 2] = c, a.p[x + 3] = d, a.c[x] = u[0], a.c[x + 1] = u[1], a.c[x + 2] = u[2], a.c[x + 3] = p;
}
function Ws(a) {
  const t = new Qe();
  t.setAttribute("position", new nt(new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]), 3)), t.setIndex([0, 2, 1, 0, 3, 2]);
  const s = new Float32Array(a * 4), i = new Float32Array(a * 4), e = new Float32Array(a * 4), h = [new vt(s, 4), new vt(i, 4), new vt(e, 4)];
  return ["iRect", "iUv", "iFx"].forEach((l, r) => {
    h[r].setUsage(Ge), t.setAttribute(l, h[r]);
  }), t.instanceCount = a, { geometry: t, rect: s, uv: i, fx: e, attrs: h };
}
const j = [47 / 255, 128 / 255, 1], ot = [1, 77 / 255, 61 / 255], Ds = (
  /* glsl */
  `
attribute vec3 iA;
attribute vec3 iB;
attribute vec4 iP;
attribute vec4 iC;
uniform vec2 uRes;
uniform float uPr;
uniform float uAlpha;
varying vec4 vC;
varying vec3 vW;
void main() {
  vec4 ca = projectionMatrix * modelViewMatrix * vec4(iA, 1.0);
  vec4 cb = projectionMatrix * modelViewMatrix * vec4(iB, 1.0);
  float sa = iP.z;
  float sb = iP.w;
  const float NEARW = 0.06;
  bool cut = ca.w < NEARW && cb.w < NEARW;
  if (!cut && ca.w < NEARW) { float k = (NEARW - ca.w) / (cb.w - ca.w); ca = mix(ca, cb, k); sa = mix(sa, sb, k); }
  else if (!cut && cb.w < NEARW) { float k = (NEARW - cb.w) / (ca.w - cb.w); cb = mix(cb, ca, k); sb = mix(sb, sa, k); }
  vec2 a = (ca.xy / max(ca.w, 1e-4) * 0.5 + 0.5) * uRes;
  vec2 b = (cb.xy / max(cb.w, 1e-4) * 0.5 + 0.5) * uRes;
  vec2 d = b - a;
  float len = length(d);
  vec2 dir = len > 1e-3 ? d / len : vec2(1.0, 0.0);
  float soft = position.x < 0.5 ? sa : sb;
  float core = 0.5 * iP.x * uPr;
  float outer = core + (1.0 + 5.0 * soft) * uPr;
  vec2 p = (position.x < 0.5 ? a : b) + vec2(-dir.y, dir.x) * position.y * outer;
  vW = vec3(position.y * outer, max(core - 0.5 * uPr, 0.0), outer);
  vC = vec4(iC.rgb * iC.a, iC.a) * (uAlpha / (1.0 + 1.6 * soft));
  gl_Position = cut ? vec4(2.0, 2.0, 2.0, 1.0) : vec4(p / uRes * 2.0 - 1.0, 0.0, 1.0);
}`
), Hs = (
  /* glsl */
  `
varying vec4 vC;
varying vec3 vW;
${pt}
void main() {
  if (spillSafe()) discard;
  gl_FragColor = vC * (1.0 - smoothstep(vW.y, vW.z, abs(vW.x)));
}`
);
function Os(a) {
  return new ht({
    ...ct,
    vertexShader: Ds,
    fragmentShader: Hs,
    uniforms: { uRes: a.uRes, uPr: a.uPr, uSafe: a.uSafe, uAlpha: { value: 1 } }
  });
}
const Bs = (
  /* glsl */
  `
uniform vec4 uPlane;
varying vec2 vP;
varying float vDepth;
void main() {
  vP = uPlane.xy + position.xy * uPlane.zw;
  vec4 mv = modelViewMatrix * vec4(vP, 0.0, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`
), qs = (
  /* glsl */
  `
uniform vec3 uCols;
uniform vec4 uMask;
uniform vec4 uFade;
uniform vec3 uLook;
uniform float uAlpha;
uniform float uGrow;
uniform float uPr;
varying vec2 vP;
const vec3 GUIDE = vec3(0.184, 0.502, 1.0);
${pt}
${Ye}
void main() {
  if (spillSafe()) discard;
  float keep = keepAmount();
  if (keep <= 0.0) discard;
  float px = max(fwidth(vP.x), 1e-6);
  float far = clamp(length(vP) / uFade.w, 0.0, 1.0);
  float u = (vP.x - uCols.x) / uCols.y;
  float f = (u - floor(u)) * uCols.y;
  float dEdge = min(min(f, abs(f - uCols.z)), uCols.y - f);
  float lw = px * uPr * (0.55 + 2.6 * far);
  float line = (1.0 - smoothstep(lw * 0.35, lw + px, dEdge)) / (1.0 + 2.2 * far);
  float band = f < uCols.z ? 1.0 : 0.0;
  vec2 q = abs(vP - uMask.xy) - 0.5 * uMask.zw;
  float outside = (q.x < 0.0 && q.y < 0.0) ? 0.0 : 1.0;
  // uLook = (line strength, band fill, 1 = nothing at all inside the mask / 0 = lines run through it)
  float a = line * uLook.x * mix(1.0, outside, uLook.z) + band * uLook.y * outside;
  float gy = vP.y > 0.0 ? vP.y / uFade.y : -vP.y / uFade.z;
  a *= (1.0 - smoothstep(0.6, 1.0, abs(vP.x) / uFade.x)) * (1.0 - smoothstep(0.7, 1.0, gy));
  a *= 1.0 - smoothstep(uGrow - 0.1, uGrow, gy);
  a *= uAlpha * keep;
  if (a <= 0.002) discard;
  gl_FragColor = vec4(GUIDE * a, a);
}`
);
function Us(a) {
  return new ht({
    ...ct,
    vertexShader: Bs,
    fragmentShader: qs,
    uniforms: {
      uPr: a.uPr,
      uSafe: a.uSafe,
      uHole: a.uHole,
      uHoleOn: a.uHoleOn,
      uBehind: { value: 0 },
      uNear: { value: new bt(0, 0) },
      uPlane: { value: new G(0, 0, 1, 1) },
      uCols: { value: new B(0, 1, 0.5) },
      uMask: { value: new G(0, 0, 0, 0) },
      uFade: { value: new G(1, 1, 1, 1e9) },
      uLook: { value: new B(0.5, 0.05, 0) },
      uAlpha: { value: 1 },
      uGrow: { value: 1.1 }
    }
  });
}
const Qs = (
  /* glsl */
  `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`
), Gs = (
  /* glsl */
  `
uniform vec3 uColor;
uniform float uAlpha;
uniform vec2 uRound;
varying vec2 vUv;
void main() {
  vec2 q = (abs(vUv - 0.5) - (0.5 - uRound)) / max(uRound, vec2(1e-5));
  float r = length(max(q, 0.0));
  float a = uAlpha * (1.0 - smoothstep(1.0 - 1.5 * fwidth(r), 1.0, r));
  if (a <= 0.0) discard;
  gl_FragColor = vec4(uColor * a, a);
}`
);
function we() {
  return new ht({
    ...ct,
    vertexShader: Qs,
    fragmentShader: Gs,
    uniforms: { uColor: { value: new B() }, uAlpha: { value: 1 }, uRound: { value: new bt(0.05, 0.05) } }
  });
}
const ge = 4, rt = 4, be = 2, Ns = 0.05, js = 14, Kt = 8, At = 38, Ys = 700, Ut = 12;
function Xs() {
  return {
    bw: 0,
    bh: 0,
    side: -1,
    on: !1,
    poly: new Float64Array(Ut * 2),
    n: 0,
    area: 0,
    ax: 0,
    ay: 0,
    tx: 0,
    ty: 0,
    gx: 0,
    gy: 0,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    by: 0,
    fade: 1,
    shown: !1,
    held: !1
  };
}
function Zs(a, t, s, i) {
  let e = 0;
  for (let h = 0; h < t; h++) {
    const l = h * 3, r = (h + 1) % t * 3, o = a[l + 2], f = a[r + 2], c = o <= -0.12, d = f <= -0.12;
    if (c && (i[e * 3] = a[l], i[e * 3 + 1] = a[l + 1], i[e * 3 + 2] = o, e++), c !== d) {
      const u = (-0.12 - o) / (f - o);
      i[e * 3] = a[l] + (a[r] - a[l]) * u, i[e * 3 + 1] = a[l + 1] + (a[r + 1] - a[l + 1]) * u, i[e * 3 + 2] = -0.12, e++;
    }
  }
  return e;
}
function Lt(a, t, s, i, e, h) {
  let l = 0;
  for (let r = 0; r < t; r++) {
    const o = r * 2, f = (r + 1) % t * 2, c = a[o + s], d = a[f + s], u = e > 0 ? c >= i : c <= i, p = e > 0 ? d >= i : d <= i;
    if (u && l < Ut && (h[l * 2] = a[o], h[l * 2 + 1] = a[o + 1], l++), u !== p && l < Ut) {
      const v = (i - c) / (d - c);
      h[l * 2] = a[o] + (a[f] - a[o]) * v, h[l * 2 + 1] = a[o + 1] + (a[f + 1] - a[o + 1]) * v, l++;
    }
  }
  return l;
}
function Vs(a, t, s, i, e, h, l) {
  return t = Lt(a, t, 0, s, 1, l), t = Lt(l, t, 0, e, -1, a), t = Lt(a, t, 1, i, 1, l), t = Lt(l, t, 1, h, -1, a), t;
}
function $s(a, t) {
  let s = 0;
  for (let i = 0; i < t; i++) {
    const e = i * 2, h = (i + 1) % t * 2;
    s += a[e] * a[h + 1] - a[h] * a[e + 1];
  }
  return Math.abs(s) / 2;
}
function Nt(a, t, s) {
  let i = 1e9;
  for (let e = 0; e < t; e++) {
    const h = e * 2, l = (e + 1) % t * 2, r = a[h], o = a[l];
    if (s < r && s < o || s > r && s > o) continue;
    const f = r === o ? Math.min(a[h + 1], a[l + 1]) : a[h + 1] + (a[l + 1] - a[h + 1]) * (s - r) / (o - r);
    f < i && (i = f);
  }
  return i;
}
const Me = (a, t, s, i, e, h, l, r) => {
  if (a + s + rt <= e || e + l + rt <= a) return 0;
  const o = Math.min(t + i, h + r) - Math.max(t, h) + rt;
  return o > 0 ? o : 0;
}, Ae = (a, t, s, i, e, h, l, r) => a < e + l && e < a + s && t < h + r && h < t + i;
function Ks(a, t, s, i, e, h, l, r, o) {
  for (let f = 0; f < t; f++) {
    const c = a[f];
    if (c.shown = c.on && c.n >= 3 && c.area >= Ys, !c.shown) continue;
    let d = 1e9, u = -1e9;
    for (let n = 0; n < c.n; n++) {
      const m = c.poly[n * 2];
      m < d && (d = m), m > u && (u = m);
    }
    const p = c.side < 0 ? d : u, v = Math.max(d, c.side < 0 ? p : p - c.bw), x = Math.min(u, c.side < 0 ? p + c.bw : p);
    let y = Math.min(Nt(c.poly, c.n, v), Nt(c.poly, c.n, x));
    for (let n = 0; n < c.n; n++) {
      const m = c.poly[n * 2];
      m > v && m < x && (y = Math.min(y, Nt(c.poly, c.n, m)));
    }
    c.ax = p, c.ay = y;
    let w = y - c.bh - ge;
    w < h && (w = y + ge), c.tx = Math.min(Math.max(c.side < 0 ? p : p - c.bw, e), s - e - c.bw), c.ty = c.by = Math.min(Math.max(w, h), i - h - c.bh);
  }
  for (let f = 0; f < 12; f++) {
    let c = !1;
    for (let d = 0; d < t; d++) {
      const u = a[d];
      if (u.shown) {
        if (l[2] > 0 && Me(u.tx, u.ty, u.bw, u.bh, l[0], l[1], l[2], l[3]) > 0) {
          const x = u.ty + u.bh / 2 < l[1] + l[3] / 2 ? l[1] - u.bh - rt : l[1] + l[3] + rt;
          u.ty = Math.min(Math.max(x, h), i - h - u.bh), c = !0;
        }
        for (let p = d + 1; p < t; p++) {
          const v = a[p];
          if (!v.shown) continue;
          const x = Me(u.tx, u.ty, u.bw, u.bh, v.tx, v.ty, v.bw, v.bh);
          if (x <= 0) continue;
          const y = d * Kt + p, w = u.by - v.by;
          let n = w > 0.5 ? 1 : -1;
          !o && r[y] !== 0 && Math.abs(w) <= js && (n = r[y]), r[y] = n;
          const m = n > 0 ? u : v, g = m === u ? v : u;
          if (m.ty + x <= i - h - m.bh) m.ty += x;
          else if (g.ty - x >= h) g.ty -= x;
          else {
            const b = m.tx + m.bw + rt + g.bw <= s - e;
            g.tx = b ? m.tx + m.bw + rt : Math.max(e, m.tx - g.bw - rt);
          }
          c = !0;
        }
      }
    }
    if (!c) break;
  }
}
function Js(a, t, s, i, e, h) {
  let l = !0;
  for (let r = 0; r < t; r++) {
    const o = a[r];
    if (!o.shown) {
      o.held = !1;
      continue;
    }
    if (!o.held || s <= 0) {
      o.x = o.gx = o.tx, o.y = o.gy = o.ty, o.vx = o.vy = 0, o.fade = 1, o.held = !0;
      continue;
    }
    if ((e || Math.abs(o.tx - o.gx) > be || Math.abs(o.ty - o.gy) > be) && (o.gx = o.tx, o.gy = o.ty), i) {
      o.x = o.gx, o.y = o.gy, o.vx = o.vy = 0, Math.abs(o.x - o.tx) + Math.abs(o.y - o.ty) > 0.02 && (l = !1);
      continue;
    }
    const f = Math.exp(-At * s);
    let c = o.x - o.gx, d = (o.vx + At * c) * s;
    o.vx = (o.vx - At * d) * f, o.x = o.gx + (c + d) * f, c = o.y - o.gy, d = (o.vy + At * c) * s, o.vy = (o.vy - At * d) * f, o.y = o.gy + (c + d) * f, Math.abs(o.x - o.tx) + Math.abs(o.y - o.ty) < 0.02 && Math.abs(o.vx) + Math.abs(o.vy) < 0.5 ? (o.x = o.tx, o.y = o.ty, o.vx = o.vy = 0) : l = !1;
  }
  if (s > 0)
    for (let r = 0; r < t; r++) {
      const o = a[r];
      if (!o.shown || !o.held) continue;
      const f = Math.abs(o.x - o.tx) + Math.abs(o.y - o.ty);
      let c = h[2] > 0 && Ae(o.x, o.y, o.bw, o.bh, h[0], h[1], h[2], h[3]);
      for (let d = 0; d < t && !c; d++) {
        const u = a[d];
        if (d === r || !u.shown || !Ae(o.x, o.y, o.bw, o.bh, u.x, u.y, u.bw, u.bh)) continue;
        const p = Math.abs(u.x - u.tx) + Math.abs(u.y - u.ty);
        (f > p || f === p && r > d) && (c = !0);
      }
      o.fade = c ? 0 : Math.min(1, o.fade + s / 0.12), o.fade < 1 && (l = !1);
    }
  return l;
}
const Jt = 7, ti = 6, ei = -3, si = 5, ii = -2, ai = 4.4, oi = -1.2, ri = 3, Pe = 1.3, Se = 0.35, ni = 0.85, hi = 30, ci = 30 * Math.PI / 180, li = 0.94, ui = 0.2, fi = 1.6, vi = 0.14, di = 22 * Math.PI / 180, Bt = 0, qt = 1, ke = 2;
function Xe(a) {
  return a.layers.map((t, s) => ({ spec: t, i: s })).filter((t) => t.spec.role !== "qr").sort((t, s) => t.spec.z - s.spec.z || t.i - s.i);
}
function pi(a, t) {
  return t.rect.w >= 0.9 * a.card.w && t.rect.h >= 0.9 * a.card.h;
}
function Ze(a, t) {
  const s = [];
  return t.forEach((i, e) => {
    pi(a, i.spec) && s.push(e);
  }), s.length === 0 && t.length > 0 && s.push(0), s;
}
function mi(a) {
  const t = Xe(a), s = Ze(a, t), i = new Int32Array(t.length);
  let e = 0;
  for (const h of s) i[h] = e++;
  for (let h = t.length - 1; h >= 0; h--) s.includes(h) || (i[h] = e++);
  return i;
}
function yi(a) {
  const t = Xe(a), s = Ze(a, t), i = a.card.w, e = a.card.h, h = t.map((m, g) => ({ i: m.i, j: g, kind: ke, x: 0, y: 0, z: 0, yaw: 0, scale: 1, side: 0 })), l = (m) => (m.rect.x + m.rect.w / 2 - i / 2) / i, r = (m) => (e / 2 - (m.rect.y + m.rect.h / 2)) / i;
  s.forEach((m, g) => {
    const b = t[m].spec, S = h[m], F = b.rect.w / i, T = b.rect.h / i;
    S.kind = g === 0 ? Bt : qt;
    const R = g === 0 ? ti : g === 1 ? si : ai;
    S.scale = Math.min(R / F, 13 / T), S.z = g === 0 ? ei : g === 1 ? ii : oi + 0.4 * (g - 2), S.x = l(b) * S.scale, S.y = r(b) * S.scale;
  });
  const o = h.filter((m) => m.kind === ke);
  if (o.length === 0) return h;
  let f = 0;
  for (const m of o) f = Math.max(f, t[m.j].spec.rect.w / i);
  const c = ri / f, d = [], u = [...o].sort((m, g) => r(t[g.j].spec) - r(t[m.j].spec) || m.j - g.j);
  for (const m of u) {
    const g = t[m.j].spec, b = g.rect.h / i, S = r(g) + b / 2, F = r(g) - b / 2, T = d.find((R) => Math.min(R.top, S) - Math.max(R.bot, F) >= 0.5 * Math.min(R.top - R.bot, b));
    T ? (T.top = Math.max(T.top, S), T.bot = Math.min(T.bot, F), T.members.push(m)) : d.push({ top: S, bot: F, members: [m] });
  }
  const p = d.filter((m) => (m.top + m.bot) / 2 >= 0).reverse(), v = d.filter((m) => (m.top + m.bot) / 2 < 0), x = /* @__PURE__ */ new Map();
  let y = Pe;
  for (const m of p) {
    const g = (m.top - m.bot) * c;
    x.set(m, y + g / 2), y += g + Se;
  }
  y = -Pe;
  for (const m of v) {
    const g = (m.top - m.bot) * c;
    x.set(m, y - g / 2), y -= g + Se;
  }
  const w = hi / Jt, n = Math.tan(ci) * li;
  return d.forEach((m, g) => {
    const b = g % 2 === 0 ? -1 : 1, S = (m.top + m.bot) / 2, F = x.get(m), T = Math.abs(F) + (m.top - m.bot) * c / 2, R = Math.min(fi, Math.max(ui, w - T / n));
    m.members.forEach((_, Y) => {
      const L = t[_.j].spec, N = m.members.filter((I) => I.j < _.j).length;
      _.scale = c, _.side = Y % 2 === 0 ? b : -b, _.x = _.side * ni + l(L) * c * 0.5, _.y = F + (r(L) - S) * c, _.z = R + N * vi, _.yaw = -_.side * di;
    });
  }), h;
}
const Re = 7.5, Ce = 0.1, Ve = 0.9, J = 0.34, te = 0.9, xi = 2, wi = 0.55, $ = 0.125, V = 2.3, gi = 0.45, bi = 0.7, Mi = 0.5, Ee = 1.25, jt = 1.95, $e = 0.8, gt = 1.4, Ke = 1, kt = 1.8, Rt = 0.45, Je = 1.3, Te = 1.15, Ai = 5, Pt = 0.28, Fe = 1.12, Pi = 4, k = (a) => a < 0 ? 0 : a > 1 ? 1 : a, H = (a, t, s) => a + (t - a) * s, O = (a, t, s) => {
  const i = k((s - a) / (t - a));
  return i * i * (3 - 2 * i);
}, ft = (a) => (a = k(a), a < 0.5 ? 4 * a * a * a : 1 - Math.pow(-2 * a + 2, 3) / 2), Si = (a) => 1 - Math.pow(1 - k(a), 3), ki = (a, t = 0.9) => {
  const s = k(a) - 1;
  return 1 + (t + 1) * s * s * s + t * s * s;
}, St = (a) => (a = k(a), a * a * a * (10 - 15 * a + 6 * a * a)), q = 0.25, Yt = 0.115, Le = 0.3, Xt = 0.8, Ri = 0.035, zt = 0.2;
function ze(a) {
  if (a <= 0) return 0;
  if (a <= q) return Yt * (a / q) * (a / q);
  if (a < Xt) {
    const t = (a - q) / (Xt - q), s = t * t, i = s * t, e = 2 * Yt / q * (Xt - q);
    return (2 * i - 3 * s + 1) * Yt + (i - 2 * s + t) * e + (-2 * i + 3 * s);
  }
  return 1;
}
function _e(a) {
  return H(1, J, ft((a - Ce) / (Ve - Ce)));
}
function Ci(a) {
  const t = ft((a - Rt) / (Je - Rt));
  return t >= 1 ? 1 : H(J, 1, t);
}
function Ei(a) {
  return -12 * Math.cos(Math.PI * a / Pi);
}
function Ti(a) {
  let t = 0;
  for (const s of a.layers) s.role !== "qr" && t++;
  return t;
}
function ts(a) {
  const t = Ti(a), s = t > 1 ? Math.min(wi, xi / (t - 1)) : 0, i = new Float64Array(t), e = new Float64Array(t), h = new Float64Array(t), l = 0.45, r = 0.55, o = mi(a);
  for (let c = 0; c < t; c++)
    i[c] = te + c * s, h[c] = t > 1 ? c * 0.35 / (t - 1) : 0;
  for (let c = 0; c < t; c++) e[c] = t > 1 ? (t - 1 - o[c]) * 0.55 / (t - 1) : 0;
  const f = te + Math.max(0, t - 1) * s + $ + V;
  return {
    n: t,
    gap: s,
    start: i,
    order: o,
    settled: f,
    rebuildStart: e,
    rebuildLand: l,
    assembleStart: h,
    assembleDrop: r,
    dur: { idle: 0, connect: $e, depart: Re, rebuild: kt, explode: Re, fly: gt, assemble: Ke }
  };
}
const Ie = ["idle", "connect", "depart", "rebuild"], We = ["explode", "fly", "assemble"], et = 0.012, _t = 0.08, It = 0.11, De = 0.035, He = 0.04, Z = 10, Fi = "Spilled to guest", Li = 5 * Math.PI / 180, Wt = 0.7, Zt = 1.9, zi = 0.5, _i = 7, Vt = 9, ut = 0.035, Oe = 1, Ii = 1, Wi = 3, Di = 14, Hi = new B(0, 1, 0), Be = 12, qe = {
  high: { dpr: 2, tex: 2048, taps: 5, sweep: !0, aniso: 4, mem: 64, far: !0, guides: 4, rim: 1 },
  mid: { dpr: 1.5, tex: 1536, taps: 1, sweep: !0, aniso: 2, mem: 40, far: !0, guides: 2, rim: 1 },
  low: { dpr: 1, tex: 1024, taps: 0, sweep: !1, aniso: 1, mem: 24, far: !1, guides: 2, rim: 0.45 },
  test: { dpr: 1, tex: 2048, taps: 5, sweep: !0, aniso: 4, mem: 64, far: !0, guides: 4, rim: 1 }
};
async function Oi(a, t) {
  const s = new Bi(a, t);
  try {
    await s.init();
  } catch (i) {
    throw s.dispose(), i;
  }
  return s.handle();
}
class Bi {
  constructor(t, s) {
    this.canvas = t, this.opts = s, this.role = s.role, this.tier = qe[s.quality] ?? qe.mid, this.reduced = !!s.reduced, this.m = s.layers, this.P = ts(this.m), this.cardH = this.m.card.h / this.m.card.w, this.tl = this.role === "host" ? "idle" : "explode", this.t0 = this.role === "host" ? performance.now() : 1 / 0;
  }
  canvas;
  opts;
  role;
  tier;
  reduced;
  m;
  P;
  cardH;
  renderer;
  scene = new ns();
  camera = new hs();
  frame = new cs();
  shared = gs();
  sheets = [];
  flying = [];
  labels = [];
  /** chrome history: which of two competing label blocks was below the other */
  labelPref = new Int8Array(Kt * Kt);
  /** seconds since the previous frame, for the chrome history and the pose filter */
  chromeDt = 0;
  /** the pose handed in has changed since the last frame; seconds it has held still */
  poseMoved = !0;
  poseStill = 0;
  order = new Int32Array(16);
  bg;
  bgMat;
  sprites;
  spriteMesh;
  spriteMat;
  leaders = null;
  leaderMesh = null;
  atlas = null;
  atlasTex = null;
  atlasItems = [];
  tagEntry = -1;
  segEntry = -1;
  scratch = null;
  over = null;
  geos = [];
  mats = [];
  usesFont = !1;
  // the card's column grid (card units) and the plane that continues it
  cols = { x0: -0.5, pitch: 1, width: 1 };
  colsFound = !1;
  colsMesh;
  colsMat;
  colsA = 0;
  colsGrow = 0;
  /** guest: the sheet the plane of columns hangs on (the grid, else the wall) */
  carrier = null;
  // guest: guides, the measurement, the virtual phone
  guides = null;
  guideMesh = null;
  guideCount = 0;
  measure = null;
  measureMesh = null;
  measureMat = null;
  ghost = null;
  ghostMesh = null;
  ghostMat = null;
  phoneBody = null;
  phoneScreen = null;
  phoneA = 0;
  measureP = 0;
  measureA = 0;
  cmShown = -1;
  cmRaw = 0;
  distRect = new Float64Array(4);
  distLine = new Float64Array(4);
  tagA = 0;
  zoom = 1;
  // canvas metrics
  cw = 1;
  ch = 1;
  bw = 1;
  bh = 1;
  sx = 1;
  sy = 1;
  fitX = 0;
  fitY = 0;
  fitW = 1;
  fitH = 1;
  scrX = 0;
  scrY = 0;
  scrW = 1;
  scrH = 1;
  // guest: the deck at the end of `fly` (size relative to the final fit, centre of the card plane in device px)
  deckZoom = 1;
  deckX = 0;
  deckY = 0;
  texBytes = 0;
  sizeDirty = !1;
  ro = null;
  // timeline
  tl;
  t0;
  t = 0;
  prevT = -1;
  done = !1;
  resolve = null;
  events = {};
  evCursor = 0;
  raf = 0;
  disposed = !1;
  paused = !1;
  dirty = !0;
  lastRender = -1e9;
  frameCount = 0;
  cpuMs = null;
  finish = !1;
  // inputs
  tiltX = 0;
  tiltY = 0;
  pose = new Float32Array(16);
  hasPose = !1;
  everPose = !1;
  uFrom = 1;
  uTo = 1;
  uT0 = -1e9;
  fov = 60;
  aspect = 0;
  // frames (guest): anchored (filtered pose), virtual, screen, and the one in use
  aPos = new B();
  aQuat = new at();
  vPos = new B(0, 0, -6.7);
  vQuat = new at();
  sPos = new B();
  sScaleY = 1;
  fPos = new B();
  fQuat = new at();
  bgA = 0;
  u = 1;
  // pose filter
  rawPos = new B();
  rawQuat = new at();
  prevPos = new B();
  prevQuat = new at();
  vel = new B();
  ang = new B();
  filterOn = !1;
  // scratch
  v = new B();
  v2 = new B();
  v3 = new B();
  ex = new B();
  ey = new B();
  q = new at();
  qi = new at();
  euler = new ls();
  mat = new us();
  box = [0, 0, 0, 0];
  pts = new Float64Array(12);
  pts2 = new Float64Array(18);
  polyTmp = new Float64Array(Ut * 2);
  onLost = (t) => {
    t.preventDefault(), cancelAnimationFrame(this.raf), this.raf = 0, this.opts.onLost?.("WebGL context lost");
  };
  loop = (t) => {
    this.disposed || (this.raf = requestAnimationFrame(this.loop), this.tick(t));
  };
  // ---------------------------------------------------------------- setup
  async init() {
    const s = this.role === "host";
    this.renderer = new fs({
      canvas: this.canvas,
      alpha: !0,
      antialias: !0,
      premultipliedAlpha: !0,
      depth: !1,
      stencil: !1,
      preserveDrawingBuffer: !1,
      powerPreference: "high-performance"
    }), this.renderer.setPixelRatio(1), this.renderer.setClearColor(0, 0), this.canvas.addEventListener("webglcontextlost", this.onLost);
    const i = this.m.layers.map((y, w) => ({ spec: y, i: w })).sort((y, w) => y.spec.z - w.spec.z || y.i - w.i);
    this.usesFont = !0;
    const [e] = await Promise.all([
      Promise.all(i.map((y) => ve(fe(this.opts.baseUrl, y.spec.src)))),
      ms()
    ]);
    if (this.disposed) return;
    let h = 0;
    for (const y of i) y.spec.role !== "qr" && (h = Math.max(h, y.spec.z));
    const l = Is(), r = xe(), o = xe(!0);
    this.geos.push(l, r, o);
    const f = this.P.n, c = yi(this.m), d = this.m.card;
    let u = 0;
    const p = [];
    i.forEach((y, w) => {
      const n = y.spec.role === "qr", m = new ce(), g = Fs(this.shared, m, n), b = new X(l, g), S = this.tier.taps, F = S > 0 ? Ls(this.shared, m, S) : null, T = F ? new X(r, F) : null, R = Mt(11), _ = Ft(this.shared, !1), Y = new X(R.geometry, _);
      this.geos.push(R.geometry);
      const L = {
        i: y.i,
        spec: y.spec,
        qr: n,
        j: n ? -1 : u,
        k: n ? -1 : this.P.order[u],
        zn: h > 0 ? Math.min(1, y.spec.z / h) : 0,
        recv: -1,
        dupe: 0,
        slot: -1,
        chip: -1,
        pill: -1,
        img: e[w],
        tex: m,
        next: null,
        mixT0: 0,
        grid: n ? de(e[w], this.canvas) : null,
        bx: 0,
        by: 0,
        bw: 1,
        bh: 1,
        rx: 0,
        ry: 0,
        rw: 1,
        rh: 1,
        mesh: b,
        mat: g,
        shadow: T,
        smat: F,
        lines: Y,
        lmat: _,
        lset: R,
        room: n ? c[0] : c[u],
        on: !0,
        op: 1,
        ox: 0,
        oy: 0,
        z: 0,
        sc: 1,
        acr: 0,
        sweep: 0,
        qT: 0,
        qLift: 0,
        lifted: !1,
        shA: 0,
        shx: 0,
        shy: 0,
        shBlur: 0,
        shZ: 0,
        shSlab: 0,
        shGlass: !1,
        fr: 0,
        frA: 0,
        ms: 0,
        hd: 0,
        chA: 0,
        lead: 0,
        chipR: 0,
        pillR: 0,
        wx: 0,
        wy: 0,
        wz: -1,
        q: new at(),
        kx: 1,
        ky: 1,
        thick: 0,
        cz: 0,
        g: 0,
        w: 0,
        behind: 0,
        reveal: 1,
        ink: 1,
        near: 0,
        flat: !1,
        guide: 0,
        base: 0,
        shMode: 0,
        shCx: 0,
        shCy: 0,
        shW: 1,
        shH: 1
      };
      for (const N of [b, T, Y])
        N && (N.matrixAutoUpdate = !1, N.frustumCulled = !1, this.frame.add(N));
      if (!n) {
        for (let I = this.flying.length - 1; I >= 0; I--) {
          const W = this.flying[I].spec.rect, Q = y.spec.rect;
          if (Q.x >= W.x - 1 && Q.y >= W.y - 1 && Q.x + Q.w <= W.x + W.w + 1 && Q.y + Q.h <= W.y + W.h + 1) {
            L.recv = this.sheets.indexOf(this.flying[I]);
            break;
          }
        }
        for (const I of this.flying) {
          const W = I.spec.rect, Q = y.spec.rect;
          Math.abs(Q.x - W.x) < 1 && Math.abs(Q.y - W.y) < 1 && Math.abs(Q.w - W.w) < 1 && Math.abs(Q.h - W.h) < 1 && L.dupe++;
        }
        L.slot = this.labels.length;
        const N = Xs();
        if (N.side = L.room.kind === Bt ? -1 : L.room.kind === qt ? 1 : L.room.side < 0 ? -1 : 1, this.labels.push(N), L.chip = p.length, p.push({ text: y.spec.label ?? y.spec.name, kind: "chip" }), y.spec.dims && (L.pill = p.length, p.push({ text: y.spec.dims, kind: "pill" })), !this.colsFound && y.spec.rect.w >= 0.9 * d.w && y.spec.rect.h >= 0.9 * d.h) {
          const I = ws(e[w], this.canvas);
          if (I) {
            const W = y.spec.rect.w / d.w, Q = (y.spec.rect.x - d.w / 2) / d.w;
            this.cols = { x0: Q + I.x0 * W, pitch: I.pitch * W, width: I.width * W }, this.colsFound = !0;
          }
        }
        (!this.carrier || this.carrier.room.kind === Bt && L.room.kind === qt) && (L.room.kind === Bt || L.room.kind === qt) && (this.carrier = L), this.flying.push(L), u++;
      }
      this.sheets.push(L), this.buildLines(L);
    }), this.tagEntry = p.length, p.push({ text: Fi, kind: "tag" }), this.segEntry = p.length, p.push({ text: "", kind: "segL" });
    for (let y = 0; y < 10; y++) p.push({ text: String(y), kind: "seg" });
    p.push({ text: " cm", kind: "segR" }), this.atlasItems = p, this.bgMat = _s(this.shared);
    const v = qi(d.background);
    this.bgMat.uniforms.uColor.value.set(v[0], v[1], v[2]), this.bg = new X(o, this.bgMat), this.bg.frustumCulled = !1, this.bg.renderOrder = 0, this.scene.add(this.bg), this.frame.matrixAutoUpdate = !1, this.scene.add(this.frame);
    const x = (y, w, n = this.scene) => (y.matrixAutoUpdate = !1, y.frustumCulled = !1, y.renderOrder = w, n.add(y), y);
    if (this.colsMat = Us(this.shared), this.mats.push(this.colsMat), this.colsMat.uniforms.uCols.value.set(this.cols.x0, this.cols.pitch, this.cols.width), this.colsMesh = x(new X(r, this.colsMat), 5, s ? this.frame : this.scene), this.sprites = Ws(Math.max(1, f * 2 + 8)), this.geos.push(this.sprites.geometry), this.atlasTex = new ce(), this.spriteMat = zs(this.shared, this.atlasTex), this.spriteMesh = x(new X(this.sprites.geometry, this.spriteMat), s ? 500 : 910), !s) {
      this.leaders = Mt(Math.max(1, f)), this.geos.push(this.leaders.geometry);
      const y = Ft(this.shared, !0);
      this.mats.push(y), this.leaderMesh = x(new X(this.leaders.geometry, y), 900), this.guides = Mt(Math.max(1, f * 4)), this.geos.push(this.guides.geometry);
      const w = Os(this.shared);
      this.mats.push(w), this.guideMesh = x(new X(this.guides.geometry, w), 880), this.measure = Mt(3 + Be), this.geos.push(this.measure.geometry), this.measureMat = Ft(this.shared, !0), this.mats.push(this.measureMat), this.measureMesh = x(new X(this.measure.geometry, this.measureMat), 905);
      const n = we(), m = we();
      this.mats.push(n, m), n.uniforms.uColor.value.set(21 / 255, 23 / 255, 27 / 255), n.uniforms.uRound.value.set(0.1 / (1 + 2 * ut), 0.1 / (this.cardH + 2 * ut)), m.uniforms.uColor.value.set(v[0], v[1], v[2]), m.uniforms.uRound.value.set(0.07, 0.07 / this.cardH), this.phoneBody = x(new X(r, n), 300), this.phoneScreen = x(new X(r, m), 301), this.ghost = Mt(4 * (f + 1)), this.geos.push(this.ghost.geometry), this.ghostMat = Ft(this.shared, !1), this.mats.push(this.ghostMat), this.ghostMesh = x(new X(this.ghost.geometry, this.ghostMat), 330);
    }
    this.buildEvents(), this.measureCanvas(), typeof ResizeObserver < "u" && (this.ro = new ResizeObserver(() => {
      this.sizeDirty = !0, this.dirty = !0;
    }), this.ro.observe(this.canvas)), this.warmUp(), this.update(0), this.render(), this.raf = requestAnimationFrame(this.loop);
  }
  /**
   * Links every program and uploads every texture while mounting: one frame with everything visible,
   * clipped to a single pixel. Without it the first shadow, outline or label would stall its frame.
   */
  warmUp() {
    const t = this.renderer;
    this.update(0), this.scene.traverse((s) => {
      s.visible = !0;
    }), this.sprites.geometry.instanceCount = 1, t.setScissor(0, 0, 1, 1), t.setScissorTest(!0), t.render(this.scene, this.camera), t.setScissorTest(!1);
  }
  /** Frame (4), measurement line + ticks (3) and handles (4) in the sheet's unit space. */
  buildLines(t) {
    const s = t.lset, i = this.role === "host", e = i ? 1 : 1.5, h = i ? 0.55 : 1, l = 0.5;
    D(s, 0, -l, l, 0, l, l, 0, e, 0, 0, 0.25, j, h), D(s, 1, l, l, 0, l, -l, 0, e, 0, 0.25, 0.5, j, h), D(s, 2, l, -l, 0, -l, -l, 0, e, 0, 0.5, 0.75, j, h), D(s, 3, -l, -l, 0, -l, l, 0, e, 0, 0.75, 1, j, h);
    for (let r = 4; r < 11; r++) D(s, r, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, ot, 0);
    t.lmat.uniforms.uSnap.value = i ? 1 : 0, t.lmat.uniforms.uDash.value = 0;
  }
  /** Measurement geometry depends on the rect's aspect, so it is rewritten after every measureCanvas(). */
  placeMeasure(t) {
    if (this.role === "host" || t.qr) return;
    const s = t.lset, i = 0.5, e = Math.min(0.03, 0.3 * t.rh) / t.rh, h = Math.min(0.014, 0.14 * t.rh) / t.rh, l = -i - e;
    D(s, 4, -i, l, 0, i, l, 0, 1, 1, 0.1, 1, ot), D(s, 5, -i, l - h, 0, -i, l + h, 0, 1, 1, 0, 0.1, ot), D(s, 6, i, l - h, 0, i, l + h, 0, 1, 1, 0.9, 1, ot), D(s, 7, -i, i, 0, -i, i, 0, 5, 2, 0, 0, j), D(s, 8, i, i, 0, i, i, 0, 5, 2, 0, 0, j), D(s, 9, i, -i, 0, i, -i, 0, 5, 2, 0, 0, j), D(s, 10, -i, -i, 0, -i, -i, 0, 5, 2, 0, 0, j);
    for (const r of s.attrs) r.needsUpdate = !0;
  }
  buildEvents() {
    const t = this.P, s = this.events;
    for (const i of [...Ie, ...We]) s[i] = [];
    for (const i of this.flying) {
      const e = (h) => ({ index: i.i, id: i.spec.id, phase: h });
      s.depart.push({ t: t.start[i.k], e: e("leave") }), s.explode.push({ t: t.start[i.k], e: e("lift") }, { t: t.start[i.k] + $ + V, e: e("settle") }), s.assemble.push({ t: t.assembleStart[i.j] + t.assembleDrop, e: e("arrive") }), s.rebuild.push({ t: t.rebuildStart[i.j] + t.rebuildLand, e: e("arrive") });
    }
    for (const i of this.sheets)
      i.qr && s.rebuild.push({ t: kt, e: { index: i.i, id: i.spec.id, phase: "arrive" } });
    for (const i in s) s[i].sort((e, h) => e.t - h.t);
  }
  /** Canvas metrics, the flat fit, the screen-resolution bake, the atlas and the static frames. */
  measureCanvas() {
    const t = this.canvas, s = this.m.card, i = this.role === "host";
    this.cw = Math.max(1, t.clientWidth || t.width), this.ch = Math.max(1, t.clientHeight || t.height);
    const e = !i && this.opts.assembleRect || { x: 0, y: 0, w: this.cw, h: this.ch }, h = Math.min(e.w / s.w, e.h / s.h), l = Math.max(s.w, s.h) * h, r = this.opts.quality === "test" ? 1 : self.devicePixelRatio || 1;
    let o = Math.min(r, this.tier.dpr, this.tier.tex / l);
    for (let u = 0; u < 8; u++) {
      this.bw = Math.max(1, Math.round(this.cw * o)), this.bh = Math.max(1, Math.round(this.ch * o)), this.sx = this.bw / this.cw, this.sy = this.bh / this.ch;
      const p = Math.min(e.w * this.sx / s.w, e.h * this.sy / s.h);
      this.fitW = s.w * p, this.fitH = s.h * p, this.fitX = e.x * this.sx + (e.w * this.sx - this.fitW) / 2, this.fitY = e.y * this.sy + (e.h * this.sy - this.fitH) / 2;
      let v = 0;
      for (const x of this.sheets) v += Math.ceil(x.spec.rect.w * p + 1) * Math.ceil(x.spec.rect.h * p + 1) * 4 * (4 / 3);
      if (v <= this.tier.mem * 1048576 * 0.9) break;
      o *= 0.85;
    }
    this.renderer.setSize(this.bw, this.bh, !1), this.shared.uRes.value.set(this.bw, this.bh), this.shared.uPr.value = this.sx, this.shared.uOrtho.value = i ? 1 : 0, this.texBytes = 0, this.scrX = Math.min(0, Math.floor(this.fitX)), this.scrY = Math.min(0, Math.floor(this.fitY)), this.scrW = Math.max(this.bw, Math.ceil(this.fitX + this.fitW)) - this.scrX, this.scrH = Math.max(this.bh, Math.ceil(this.fitY + this.fitH)) - this.scrY, this.scratch = st(this.bw, this.bh, this.canvas), this.over = this.scrW > this.bw || this.scrH > this.bh ? st(this.scrW, this.scrH, this.canvas) : null;
    for (const u of this.sheets) {
      const p = u.spec.rect;
      this.setTexture(u, u.img, !1), u.rx = (p.x + p.w / 2 - s.w / 2) / s.w, u.ry = (s.h / 2 - (p.y + p.h / 2)) / s.w, u.rw = p.w / s.w, u.rh = p.h / s.w, this.placeMeasure(u);
    }
    this.scratch.width = this.scratch.height = 1, this.scratch = null, this.over && (this.over.width = this.over.height = 1), this.over = null, this.atlas = xs(this.atlasItems, this.sx, Math.min(176, this.cw - 2 * Z), this.canvas);
    for (const u of this.labels) u.held = !1;
    this.cmShown = -1, this.atlasTex?.dispose();
    const f = new le(this.atlas.canvas);
    f.flipY = !1, f.premultiplyAlpha = !0, f.generateMipmaps = !1, f.minFilter = f.magFilter = ue, this.atlasTex = f, this.spriteMat.uniforms.map.value = f, this.texBytes += this.atlas.bytes;
    for (const u of this.flying) {
      const p = this.labels[u.slot], v = this.atlas.entries;
      p.bw = Math.max(v[u.chip].w, u.pill >= 0 ? v[u.pill].w : 0), p.bh = $t + (u.pill >= 0 ? pe + wt : 0);
    }
    const c = this.shared.uSafe.value;
    for (const u of c) u.set(0, 0, 0, 0);
    i && this.opts.safeRects && this.opts.safeRects.forEach((u, p) => {
      const v = Math.floor(u.x * this.sx), x = Math.ceil((u.x + u.w) * this.sx), y = this.bh - Math.ceil((u.y + u.h) * this.sy), w = this.bh - Math.floor(u.y * this.sy), n = c[Math.min(p, 3)];
      p < 4 ? n.set(v, y, x, w) : n.set(Math.min(n.x, v), Math.min(n.y, y), Math.max(n.z, x), Math.max(n.w, w));
    });
    const d = this.colsMat.uniforms;
    i ? (this.camera.projectionMatrix.makeOrthographic(0, this.bw, this.bh, 0, -1e4, 1e4), d.uPlane.value.set(0, 0, this.bw / (this.fitW * J) + 1, this.bh / (this.fitW * J) + 1), d.uMask.value.set(0, 0, 1, this.cardH), d.uFade.value.set(1e9, 1e9, 1e9, 1e9), d.uGrow.value = 1.1) : (this.frame.matrix.identity(), this.frame.matrixWorldNeedsUpdate = !0, this.setCamera()), this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert(), this.sizeDirty = !1, this.dirty = !0;
  }
  setTexture(t, s, i) {
    const e = this.m.card, h = t.spec.rect, l = this.fitW / e.w, r = this.scratch ?? st(this.bw, this.bh, this.canvas), o = this.over ?? (this.scrW > this.bw || this.scrH > this.bh ? st(this.scrW, this.scrH, this.canvas) : null), f = ds(s, this.fitX + h.x * l, this.fitY + h.y * l, h.w * l, h.h * l, r, this.canvas, o, this.scrX, this.scrY), c = new le(f.canvas);
    c.premultiplyAlpha = !0, c.generateMipmaps = !0, c.minFilter = vs, c.magFilter = ue, c.anisotropy = Math.min(this.tier.aniso, this.renderer.capabilities.getMaxAnisotropy()), this.texBytes += f.w * f.h * 4 * (4 / 3);
    const d = t.mat.uniforms;
    if (i) {
      t.next?.dispose(), t.next = c, d.mapB.value = c;
      return;
    }
    t.tex.dispose(), t.tex = c, d.map.value = c, d.mapB.value = c, d.uMix.value = 0, t.smat && (t.smat.uniforms.map.value = c);
    const u = this.fitX + this.fitW / 2, p = this.fitY + this.fitH / 2;
    t.bx = (f.x0 + f.w / 2 - u) / this.fitW, t.by = (p - (f.y0 + f.h / 2)) / this.fitW, t.bw = f.w / this.fitW, t.bh = f.h / this.fitW, d.uTile.value.set(f.tu, f.tv, f.tw, f.th), t.grid && d.uQr.value.set(t.grid.ox, t.grid.oy, t.grid.nx, t.grid.ny);
  }
  // ---------------------------------------------------------------- guest frames
  setCamera() {
    const i = 0.05 * Math.tan(this.fov * Math.PI / 360), e = i * (this.aspect > 0 ? this.aspect : this.bw / this.bh);
    this.camera.projectionMatrix.makePerspective(-e, e, i, -i, 0.05, 200), this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert(), this.solveDeck(), this.dirty = !0;
  }
  /**
   * Face-on frame in which the card plane has `zoom` times the size of the flat fit and its centre
   * sits at (cx, cy) device px. zoom 1 at the centre of the fit is the landing itself.
   */
  screenFrame(t, s, i) {
    const e = this.camera.projectionMatrix.elements, h = e[0], l = e[5], r = h * this.bw / (2 * this.fitW * t), o = s / this.bw * 2 - 1, f = 1 - i / this.bh * 2;
    this.sPos.set(o * r / h, f * r / l, -r), this.sScaleY = h * this.bw / (l * this.bh);
  }
  /** Projects a point of the screen frame (card units, face-on at this.sPos) to CSS px; result in this.v (x, y). */
  projectDeck(t, s, i) {
    const e = this.v.set(t + this.sPos.x, s * this.sScaleY + this.sPos.y, i + this.sPos.z).applyMatrix4(this.camera.projectionMatrix);
    return e.x = (e.x * 0.5 + 0.5) * this.cw, e.y = (0.5 - e.y * 0.5) * this.ch, e;
  }
  /** Device-px bounding box of the deck (the stack at DECK spacing, face-on) for the current this.sPos; result in this.box. */
  deckBox() {
    const t = this.box, s = this.bw / this.cw, i = this.bh / this.ch;
    t[0] = t[1] = 1e9, t[2] = t[3] = -1e9;
    for (const e of this.flying) {
      const h = e.by + De * this.cardH * e.j * Pt, l = (_t + It * e.j + et) * Pt;
      for (let r = 0; r < 4; r++) {
        const o = this.projectDeck(e.bx + (r & 1 ? 0.5 : -0.5) * e.bw, h + (r & 2 ? 0.5 : -0.5) * e.bh, l);
        o.x * s < t[0] && (t[0] = o.x * s), o.y * i < t[1] && (t[1] = o.y * i), o.x * s > t[2] && (t[2] = o.x * s), o.y * i > t[3] && (t[3] = o.y * i);
      }
    }
  }
  /**
   * The deck at the end of `fly`: as large as fits the canvas with DECK_MARGIN free on every side,
   * at most DECK_ZOOM times the final size, its box centred on the visible part of the landing
   * rect. A full-bleed landing therefore gets a deck smaller than the page, and `assemble` grows it.
   */
  solveDeck() {
    if (this.role !== "guest" || this.flying.length === 0) return;
    const t = He * this.bw, s = He * this.bh;
    let i = Math.max(0, this.fitX), e = Math.max(0, this.fitY), h = Math.min(this.bw, this.fitX + this.fitW), l = Math.min(this.bh, this.fitY + this.fitH);
    (h - i < 2 || l - e < 2) && (i = 0, e = 0, h = this.bw, l = this.bh);
    const r = (i + h) / 2, o = (e + l) / 2, f = this.box;
    let c = Fe, d = r, u = o;
    for (let p = 0; p < 12; p++) {
      this.screenFrame(c, d, u), this.deckBox();
      let v = r - (f[0] + f[2]) / 2, x = o - (f[1] + f[3]) / 2;
      const y = f[2] - f[0], w = f[3] - f[1], n = this.bw - 2 * t, m = this.bh - 2 * s;
      y <= n && (v = Math.min(Math.max(v, t - f[0]), this.bw - t - f[2])), w <= m && (x = Math.min(Math.max(x, s - f[1]), this.bh - s - f[3])), d += v, u += x, c = Math.min(Fe, c * Math.min(n / y, m / w));
    }
    this.deckZoom = c, this.deckX = d, this.deckY = u;
  }
  /** Projects a point given in camera space to CSS px; result in this.v (x, y; z keeps the camera-space depth, negative in front). */
  toScreen(t, s, i) {
    const e = this.camera.projectionMatrix.elements, h = this.v, l = -i > 1e-4 ? -i : 1e-4;
    return h.set((t * e[0] / l * 0.5 + 0.5) * this.cw, (0.5 - s * e[5] / l * 0.5) * this.ch, i), h;
  }
  /** A point of the card frame (the anchored or virtual frame in use) in camera space; result in this.v2. */
  fromCard(t, s, i) {
    return this.v2.set(t, s, i).applyQuaternion(this.fQuat).add(this.fPos);
  }
  /** The tracked pose through the light low-pass; result in aPos / aQuat. `dt` <= 0 (a seek, the first pose) passes it unchanged. */
  filterPose(t) {
    const s = this.rawPos, i = this.rawQuat;
    if (!this.filterOn || t <= 0 || t > 0.25)
      this.aPos.copy(s), this.aQuat.copy(i), this.vel.set(0, 0, 0), this.ang.set(0, 0, 0), this.filterOn = !0;
    else {
      const e = 1 - Math.exp(-2 * Math.PI * Ii * t);
      this.vel.lerp(this.v.copy(s).sub(this.prevPos).multiplyScalar(1 / t), e), this.aPos.lerp(s, 1 - Math.exp(-2 * Math.PI * (Oe + Wi * this.vel.length()) * t)), this.qi.copy(this.prevQuat).invert().multiply(i);
      const h = (this.qi.w < 0 ? -2 : 2) / t;
      this.ang.lerp(this.v.set(this.qi.x * h, this.qi.y * h, this.qi.z * h), e), this.aQuat.slerp(i, 1 - Math.exp(-2 * Math.PI * (Oe + Di * this.ang.length()) * t)), (this.aPos.distanceToSquared(s) > 1e-12 || 1 - Math.abs(this.aQuat.dot(i)) > 1e-12) && (this.dirty = !0);
    }
    this.prevPos.copy(s), this.prevQuat.copy(i);
  }
  // ---------------------------------------------------------------- per-frame state
  reset(t) {
    t.on = !0, t.op = 1, t.ox = 0, t.oy = 0, t.z = 0, t.sc = 1, t.acr = 0, t.sweep = 0, t.qT = 0, t.qLift = 0, t.lifted = !1, t.shA = 0, t.shx = 0, t.shy = 0, t.shBlur = 0, t.shZ = 0, t.shSlab = 0, t.shGlass = !1, t.fr = 0, t.frA = 0, t.ms = 0, t.hd = 0, t.chA = 0, t.lead = 0, t.chipR = 0, t.pillR = 0, t.g = 0, t.w = 0, t.behind = 0, t.reveal = 1, t.ink = 1, t.near = 0, t.flat = !1, t.guide = 0, t.thick = 0, t.shMode = 0;
  }
  update(t) {
    this.role === "host" ? this.updateHost(this.tl, this.t) : this.updateGuest(this.tl, this.t, t), this.apply();
  }
  updateHost(t, s) {
    const i = this.P, e = this.reduced, h = this.sx / this.fitW;
    let l = 1, r = 1;
    if (t === "depart")
      l = e ? s < 0.5 ? 1 : J : _e(s), e && (r = s < 0.5 ? 1 - O(0.1, 0.5, s) : O(0.5, 0.9, s));
    else if (t === "rebuild") {
      const v = (Rt + Je) / 2;
      l = e ? s < v ? J : 1 : Ci(s), e && (r = s < v ? 1 - O(v - 0.4, v, s) : O(v, v + 0.4, s));
    }
    this.zoom = l, this.colsA = k((1 - l) / (1 - J)) * r, this.tagA = r * (t === "depart" ? k((s - te - 0.15) / 0.15) : t === "rebuild" ? 1 - O(Rt, Rt + 0.3, s) : 0);
    let o = t === "idle" || t === "connect" ? 1 : t === "depart" ? 1 - O(0, Ve, s) : O(kt - 0.3, kt, s);
    e && (o = 0);
    let f = this.tiltX, c = this.tiltY;
    const d = Math.hypot(f, c);
    d > 1 && (f /= d, c /= d);
    let u = f * 10 * o, p = c * 10 * o;
    if (t === "idle" && !e) {
      const v = 1.5 * Math.sin(2 * Math.PI * s / Ai) * (1 - O(0, 0.15, Math.min(1, d)));
      u += v * 0.8, p += v * 0.6;
    }
    this.bgA = 1;
    for (const v of this.sheets) {
      this.reset(v);
      const x = v.qr ? 0.4 * v.zn : v.zn;
      v.ox = u * x * h, v.oy = -p * x * h;
      const y = Math.hypot(u, p) * x / 10;
      if (v.shA = 0.35 * k(y * 1.5), v.shx = -v.ox * 0.6, v.shy = -v.oy * 0.6, v.shBlur = (0.6 + 2.2 * y) * h, v.qr) {
        t === "connect" ? (v.qT = k(s / $e), v.qLift = e ? 0 : 2.5) : t === "rebuild" ? (v.qT = 1 - k((s - Te) / (kt - Te)), v.qLift = e ? 0 : 2.5) : t === "depart" && (v.qT = 1), v.on = v.qT < 1, v.shA *= 1 - v.qT;
        continue;
      }
      if (t === "depart") {
        const w = s - i.start[v.k];
        if (w <= 0) {
          v.op = r;
          continue;
        }
        if (e) {
          v.op = 1 - k(w / 0.5), v.on = v.op > 0, v.fr = 1, v.frA = k(w / 0.5);
          continue;
        }
        this.liftHost(v, w);
      } else if (t === "rebuild") {
        const w = s - i.rebuildStart[v.j], n = i.rebuildLand;
        if (e) {
          v.op = k(w / n) * r, v.on = v.op > 0, v.fr = 1, v.frA = (1 - k(w / n)) * r;
          continue;
        }
        this.liftHost(v, (q + zt) * (1 - k(w / n)));
      }
    }
  }
  /**
   * Host: one layer `tau` seconds into its lift. It never leaves its place: the print swells inside
   * its own box and fades out during the peel, the dashed outline is complete when the print is
   * gone, and a contact shadow, cast from the height the guest's sheet has at this moment, drifts
   * away below it and is handed over to the guest's view of the glass. `rebuild` runs `tau` backwards.
   */
  liftHost(t, s) {
    if (s <= 0) return;
    const i = O(0, q, s);
    t.lifted = !0, t.fr = k((s - 0.03) / (q - 0.03)), t.frA = 1, t.op = 1 - O(0.08, q, s), t.on = s < q + zt, t.acr = i, t.sc = 1 + Ri * i, t.sweep = H(-1.2, 0.6, s / q) + 0.3 * this.tiltX;
    const e = Le * ze(s);
    t.shA = 0.35 * O(0, 0.02, e) * (1 - 0.45 * k(e / 0.8)) * (1 - O(q, q + zt, s)), t.shx = 0.1 * e, t.shy = -0.14 * e, t.shBlur = 4e-3 + 0.05 * e, t.shSlab = 0.3;
  }
  /** Guest: puts a sheet's top face centre at (x, y, z) of the card frame, turned by `yaw` about its vertical, magnified `S` times. */
  place(t, s, i, e, h, l) {
    const r = this.fromCard(s, i, e);
    t.wx = r.x, t.wy = r.y, t.wz = r.z, t.q.copy(this.fQuat), h !== 0 && t.q.multiply(this.q.setFromAxisAngle(Hi, h)), t.kx = t.ky = l, t.cz = e, t.shCx = s, t.shCy = i;
  }
  /** Guest: the sheet's place in the deck (peel v2's fanned stack, face-on in the screen frame) at spacing `e`; result in this.v. */
  deckPos(t, s) {
    return t.oy = De * this.cardH * t.j * s, this.v.set(this.sPos.x + t.rx, this.sPos.y + (t.ry + t.oy) * this.sScaleY, this.sPos.z + (_t + It * t.j + et) * s);
  }
  setDeck(t, s) {
    const i = this.deckPos(t, s);
    t.wx = i.x, t.wy = i.y, t.wz = i.z, t.q.identity(), t.kx = 1, t.ky = this.sScaleY, t.w = 1, t.cz = 0;
  }
  /** Guest: moves a sheet placed in the room the share `w` of the way into the deck. */
  toDeck(t, s, i) {
    const e = this.deckPos(t, i);
    t.wx = H(t.wx, e.x, s), t.wy = H(t.wy, e.y, s), t.wz = H(t.wz, e.z, s), t.q.slerp(this.q.identity(), s), t.kx = H(t.kx, 1, s), t.ky = H(t.ky, this.sScaleY, s), t.w = s;
  }
  /** Guest: contact shadow of a sheet in the deck on the sheet below it (peel v2), weighted by `k`. */
  deckShadow(t, s, i) {
    const e = t.recv >= 0 ? this.sheets[t.recv] : null;
    if (!e || !e.on || i <= 0) return;
    const h = (_t + It * e.j + et) * s, l = Math.max(0, (_t + It * t.j + et) * s - et * t.acr - h);
    t.shMode = 2, t.shZ = h, t.shCx = t.bx + 0.1 * l, t.shCy = t.by + t.oy - 0.14 * l, t.shW = t.bw, t.shH = t.bh, t.shBlur = 4e-3 + 0.05 * l, t.shSlab = 0.3, t.shA = 0.35 * t.op * t.acr * O(0, 0.02, l) * (1 - 0.45 * k(l / 0.8)) * i;
  }
  updateGuest(t, s, i) {
    const e = this.P, h = this.reduced, l = this.chromeDt, r = this.flying.length, o = !this.paused && i - this.uT0 < 350, f = this.u = o ? H(this.uFrom, this.uTo, ft((i - this.uT0) / 350)) : this.uTo;
    this.poseStill = this.poseMoved ? 0 : this.poseStill + l, this.poseMoved = !1, this.hasPose && (this.mat.fromArray(this.pose).decompose(this.rawPos, this.rawQuat, this.v3), this.filterPose(l));
    const c = t === "explode" ? s : t === "fly" ? e.dur.explode + s : e.dur.explode + gt;
    this.vQuat.setFromEuler(this.euler.set(Li, h ? 0 : Ei(c) * Math.PI / 180, 0, "XYZ")), this.everPose || (this.aPos.copy(this.vPos), this.aQuat.copy(this.vQuat)), this.fPos.copy(this.aPos).lerp(this.vPos, f), this.fQuat.copy(this.aQuat).slerp(this.vQuat, f);
    const d = this.zoom = t === "explode" ? h ? s < 0.5 ? 1 : J : _e(s) : J;
    this.bgA = 0, this.shared.uSnap.value = 0;
    let u = 0, p = 1, v = 0;
    if (t === "fly")
      this.screenFrame(this.deckZoom, this.deckX, this.deckY), u = h ? 0 : ft(s / gt), p = 1 - k(s / 0.3), v = h ? k(s / 0.5) : Si(s / 0.45), this.bgA = h ? k(s / gt) : O(0.3, 1, s / gt);
    else if (t === "assemble") {
      const n = h ? 1 : ft(s / 0.75), m = this.fitX + this.fitW / 2, g = this.fitY + this.fitH / 2;
      this.screenFrame(H(this.deckZoom, 1, n), H(this.deckX, m, n), H(this.deckY, g, n)), u = 1, p = 0, v = 1, this.bgA = 1, s >= Ke && (this.shared.uSnap.value = 1);
    }
    for (const n of this.sheets) {
      if (this.reset(n), n.qr) {
        n.on = !1;
        continue;
      }
      const m = n.room, g = m.z < 0, b = t === "explode" ? s - e.start[n.k] : 1e3;
      if (t === "explode") {
        if (b <= 0) {
          if (f <= 0) {
            n.on = !1;
            continue;
          }
          n.flat = !0, n.op = f, this.place(n, d * n.rx, d * n.ry, 2e-3, 0, d), n.base = 310 + n.j * 3;
          continue;
        }
        const T = k((b - $ - V) / gi);
        if (h) {
          if (b < 0.25) {
            if (f <= 0) {
              n.on = !1;
              continue;
            }
            n.flat = !0, n.op = f * (1 - b / 0.25), this.place(n, d * n.rx, d * n.ry, 2e-3, 0, d), n.base = 310 + n.j * 3;
            continue;
          }
          n.g = 1, n.acr = 1, n.op = k((b - 0.25) / 0.5), this.place(n, m.x, m.y, m.z, m.yaw, m.scale), n.chA = T, n.fr = n.ms = n.hd = n.lead = n.chipR = n.pillR = T > 0 ? 1 : 0, n.guide = T > 0 ? 1 : 0;
        } else {
          const R = (b - $) / V, _ = St(R), Y = St(Math.pow(k(R), 0.8)), L = O(0, q, b), N = (g ? -1 : 1) * Le * ze(b) * (1 - _);
          if (n.g = _, n.acr = L, n.op = H(k(b / 0.08), 1, f), this.place(
            n,
            H(d * n.rx, m.x, _),
            H(d * n.ry, m.y, _),
            H(0, m.z, Y) + N + et * L,
            m.yaw * St((b - $ - 0.3) / (V - 0.3)),
            H(d, m.scale, _)
          ), g && (n.reveal = H(1 - 0.8 * O(0.35, 0.8, b), 1, St((b - 0.9) / ($ + V - 0.9)))), this.chrome(n, T), n.guide = k((b - $ - V + Mi) / bi), !g) {
            const I = Math.max(0, n.cz - et * L), W = H(O(q, q + zt, b), 1, f);
            n.shMode = 1, n.shCx += 0.1 * I, n.shCy -= 0.14 * I, n.shW = n.bw * n.kx, n.shH = n.bh * n.ky, n.shBlur = 4e-3 + 0.05 * I, n.shSlab = 0.3, n.shA = 0.35 * n.op * L * O(0, 0.02, I) * (1 - 0.45 * k(I / 0.8)) * W * (1 - O(0.04, 0.3, _));
          }
        }
      } else if (t === "fly") {
        n.g = 1, n.acr = 1, this.place(n, m.x, m.y, m.z, m.yaw, m.scale);
        const T = r > 1 ? 0.25 * (r - 1 - n.k) / (r - 1) : 0, R = h ? 0 : ft(k((s - T) / (gt - 0.25)));
        this.toDeck(n, R, Pt), n.guide = 1 - v, n.chA = p, n.fr = n.ms = n.hd = n.lead = n.chipR = n.pillR = p > 0 ? 1 : 0, h && (n.op = 1 - k(s / 0.7), n.on = n.op > 0), this.deckShadow(n, Pt, O(0.85, 1, R));
      } else {
        const T = s - e.assembleStart[n.j];
        let R = 0;
        n.g = 1, h ? (n.op = k(T / 0.4), n.on = n.op > 0) : (R = Pt * (1 - ki(T / e.assembleDrop)), n.acr = 1 - O(0.5, 0.95, s)), this.setDeck(n, R), this.deckShadow(n, R, 1);
      }
      const S = n.g * (1 - n.w);
      n.behind = k(-n.cz / 0.3) * (1 - n.w), n.ink = H(1, zi, n.behind), n.near = 1 - n.w, n.thick = et * n.acr * H(1, 2.2, S) * this.tier.rim, this.v.set(-n.wx, -n.wy, -n.wz).applyQuaternion(this.qi.copy(n.q).invert()).normalize();
      const F = 1.2 * (this.v.x * 0.8 - this.v.y * 0.6);
      n.sweep = 0.08 * n.j + F + (t === "explode" ? -1.2 + 1.9 * n.g + 0.05 * Math.max(0, b - $ - V) : t === "fly" ? 0.7 + 0.9 * u : 1.2 + 0.6 * s);
    }
    const x = this.order, y = t === "assemble" ? 1e3 : 1e-5;
    for (let n = 0; n < r; n++) {
      const m = this.flying[n], g = m.wz + m.j * y;
      let b = n - 1;
      for (; b >= 0 && this.flying[x[b]].wz + this.flying[x[b]].j * y > g; )
        x[b + 1] = x[b], b--;
      x[b + 1] = n;
    }
    for (let n = 0; n < r; n++) {
      const m = this.flying[x[n]];
      m.flat || (m.base = (m.behind > 0.5 ? 10 : 400) + n * 10);
    }
    this.phoneA = t === "assemble" ? 0 : f * (1 - u) * (h && t === "fly" ? 1 - k(s / 0.7) : 1), this.shared.uHoleOn.value = t === "assemble" ? 0 : (1 - f) * (1 - u);
    const w = this.carrier;
    if (w && t !== "assemble") {
      const n = t === "explode" ? s - e.start[w.k] : 1e3;
      this.colsGrow = 1.1 * (1 - v) * (h ? n >= $ + V ? 1 : 0 : St((n - $ - 0.45 * V) / (0.7 * V))), this.colsA = w.op * (1 - v) * (h ? k((n - $ - V) / 0.4) : 1);
    } else
      this.colsGrow = 0, this.colsA = 0;
    this.measureP = t === "explode" ? h ? s >= jt ? 1 : 0 : ft((s - Ee) / (jt - Ee)) : 1 - v, this.measureA = t === "explode" ? k((s - jt) / 0.25) : t === "fly" ? p : 0, this.cmRaw = this.fPos.length() * Jt, (this.cmShown < 0 || l <= 0 || Math.abs(this.cmRaw - this.cmShown) > 0.8) && (this.cmShown = Math.round(this.cmRaw));
  }
  /** Chrome draw-in over CHROME seconds: frame trace, handles, measurement, leader, chip, pill. */
  chrome(t, s) {
    t.chA = s > 0 ? 1 : 0, t.fr = k(s / 0.556), t.hd = k((s - 0.45) / 0.2), t.ms = k((s - 0.5) / 0.35), t.lead = k((s - 0.55) / 0.3), t.chipR = k((s - 0.75) / 0.25), t.pillR = k((s - 0.85) / 0.15);
  }
  // ---------------------------------------------------------------- state -> GPU
  apply() {
    const t = this.role === "host", s = this.sx / this.fitW;
    if (this.bg.visible = this.bgA > 0, this.bgMat.uniforms.uAlpha.value = this.bgA, t) {
      const e = this.fitW * this.zoom, h = this.fitX + this.fitW / 2, l = this.fitY + this.fitH / 2;
      this.frame.matrix.set(e, 0, 0, h, 0, e, 0, this.bh - l, 0, 0, e, 0, 0, 0, 0, 1), this.colsMesh.visible = this.colsA > 3e-3, this.colsMat.uniforms.uAlpha.value = this.colsA, this.colsMat.uniforms.uLook.value.set(0.3, 0.06, 1);
    }
    let i = 0;
    for (const e of this.sheets) {
      const h = e.acr, l = e.mesh, r = e.mat.uniforms, o = e.shadow, f = e.smat?.uniforms, c = e.lines, d = e.lmat.uniforms;
      if (l.visible = e.on && e.op > 0, l.visible && (r.uOpacity.value = e.op, r.uAcr.value = h, r.uSweep.value = e.sweep, r.uSweepAmt.value = this.tier.sweep && !this.reduced ? 1 : 0, r.uInner.value.set(-4e-3 / e.bw, 6e-3 / e.bh, this.tier.sweep ? 1 : -1), r.uBehind.value = e.behind, r.uReveal.value = e.reveal, r.uInk.value = e.ink, r.uNear.value.set(Wt * e.near, Zt * e.near), e.next)) {
        const u = k((performance.now() - e.mixT0) / 150);
        r.uMix.value = u, this.dirty = !0, u >= 1 && this.finishSwap(e);
      }
      if (t) {
        const u = 10 + i * 3, p = e.bw, v = e.bh, x = e.bx + e.ox, y = e.by + e.oy;
        if (l.visible && (l.matrix.set(p, 0, 0, x, 0, v, 0, y, 0, 0, Math.max(1e-5, et * h), e.z, 0, 0, 0, 1), l.renderOrder = u + 1, r.uBox.value.set(x, y, p, v), r.uZoom.value = 1 / e.sc, e.qr && r.uQrT.value.set(e.qT, -0.8 * e.qLift * s / e.rw, -e.qLift * s / e.rh)), o && f && (o.visible = e.on && e.shA > 4e-3, o.visible)) {
          const w = e.bw * e.sc, n = e.bh * e.sc, m = e.shBlur * 2 + 2e-3, g = w + 2 * m, b = n + 2 * m, S = x + e.shx, F = y + e.shy;
          o.matrix.set(g, 0, 0, S, 0, b, 0, F, 0, 0, 1, e.shZ, 0, 0, 0, 1), f.uBox.value.set(S, F, g, b), f.uGrow.value.set(g / w, b / n), f.uRad.value.set(e.shBlur / w, e.shBlur / n), f.uLod.value = Math.log2(Math.max(1, e.shBlur * this.fitW * 0.9)), f.uAlpha.value = e.shA, f.uSlab.value = e.shSlab * h, e.lifted ? f.uClip.value.set(e.bx - e.bw / 2 + 3e-3, e.by - e.bh / 2 + 3e-3, e.bx + e.bw / 2 - 3e-3, e.by + e.bh / 2 - 3e-3) : f.uClip.value.set(-1e3, -1e3, 1e3, 1e3), o.renderOrder = u;
        }
        if (c.visible = !e.qr && e.frA > 0, c.visible) {
          const w = (1 + 8 * e.dupe) * s / this.zoom;
          c.matrix.set(e.rw - w, 0, 0, e.rx, 0, e.rh - w, 0, e.ry, 0, 0, 1, 0, 0, 0, 0, 1), d.uDash.value = 6 * this.sx, d.uProg.value.set(e.fr, 0, 0, 0), d.uAlpha.value.set(e.frA, 0, 0, 0), c.renderOrder = 400 + i;
        }
      } else {
        if (l.visible) {
          const u = this.v.set((e.bx - e.rx) * e.kx, (e.by - e.ry) * e.ky, 0).applyQuaternion(e.q);
          l.matrix.compose(this.v2.set(e.wx + u.x, e.wy + u.y, e.wz + u.z), e.q, this.v3.set(e.bw * e.kx, e.bh * e.ky, Math.max(1e-5, e.thick))), l.renderOrder = e.base + 1, r.uBox.value.set(e.bx, e.by, e.bw, e.bh), r.uZoom.value = 1;
        }
        if (o && f && (o.visible = e.on && e.shMode > 0 && e.shA > 4e-3, o.visible)) {
          const u = e.shBlur * 2 + 2e-3, p = e.shW + 2 * u, v = e.shH + 2 * u;
          if (e.shMode === 1)
            o.matrix.compose(this.v3.copy(this.fromCard(e.shCx, e.shCy, 1e-3)), this.fQuat, this.v.set(p, v, 1)), f.uClip.value.set(-0.5, -this.cardH / 2, 0.5, this.cardH / 2), o.renderOrder = 305;
          else {
            const x = this.sheets[e.recv];
            o.matrix.compose(this.v3.set(this.sPos.x + e.shCx, this.sPos.y + e.shCy * this.sScaleY, this.sPos.z + e.shZ), this.q.identity(), this.v.set(p, v * this.sScaleY, 1)), f.uClip.value.set(x.bx - x.bw / 2, x.by + x.oy - x.bh / 2, x.bx + x.bw / 2, x.by + x.oy + x.bh / 2), o.renderOrder = x.base + 2;
          }
          f.uBox.value.set(e.shCx, e.shCy, p, v), f.uGrow.value.set(p / e.shW, v / e.shH), f.uRad.value.set(e.shBlur / e.shW, e.shBlur / e.shH), f.uLod.value = Math.log2(Math.max(1, e.shBlur * e.bw / e.shW * this.fitW * 0.9)), f.uAlpha.value = e.shA, f.uSlab.value = e.shSlab * h;
        }
        if (c.visible = !e.qr && !e.flat && e.chA > 0 && l.visible, c.visible) {
          const u = e.chA * e.op * this.nearAlpha(e);
          c.matrix.compose(this.v2.set(e.wx, e.wy, e.wz), e.q, this.v3.set(e.rw * e.kx, e.rh * e.ky, 1)), d.uProg.value.set(e.fr, e.ms, e.hd, 0), d.uAlpha.value.set(u, u, u, 0), c.renderOrder = e.base + 3;
        }
      }
      i++;
    }
    t ? this.writeTag() : this.writeRoom();
  }
  /** Guest: how much of a sheet's chrome is left when the sheet is close to the camera (1 away from it, and in the deck). */
  nearAlpha(t) {
    return H(k((-t.wz - Wt) / (Zt - Wt)), 1, t.w);
  }
  /** Host: where the artboard's tag sits (device px, y down): above the artboard's top-left corner. */
  tagRect(t) {
    const s = this.atlas.entries[this.tagEntry], i = this.fitX + this.fitW / 2, e = this.fitY + this.fitH / 2;
    return t[0] = i - this.fitW * this.zoom / 2, t[1] = e - this.fitH * this.zoom / 2 - (je + 4) * this.sy, t[2] = s.w * this.sx, t[3] = s.h * this.sy, t;
  }
  /** Host: one tag above the artboard once layers have begun to leave it. */
  writeTag() {
    if (this.tagA <= 0) {
      this.finishSprites(0);
      return;
    }
    const t = this.tagRect(this.box);
    this.sprite(this.sprites, 0, t[0], t[1], t[2], t[3], this.atlas.entries[this.tagEntry], this.tagA * 0.9, 1, 1), this.finishSprites(1);
  }
  sprite(t, s, i, e, h, l, r, o, f, c) {
    const d = s * 4;
    t.rect[d] = i, t.rect[d + 1] = e, t.rect[d + 2] = h, t.rect[d + 3] = l, t.uv[d] = r.u0, t.uv[d + 1] = r.v0, t.uv[d + 2] = r.u1, t.uv[d + 3] = r.v1, t.fx[d] = o, t.fx[d + 1] = f, t.fx[d + 2] = c, t.fx[d + 3] = 0;
  }
  finishSprites(t) {
    if (this.spriteMesh.visible = t > 0, this.sprites.geometry.instanceCount = t, t > 0) for (const s of this.sprites.attrs) s.needsUpdate = !0;
  }
  /** One dashed rectangle of the virtual phone's screen (card frame); returns the next free line index. */
  ghostRect(t, s, i, e, h, l, r) {
    const o = i - h / 2, f = i + h / 2, c = e - l / 2, d = e + l / 2;
    return D(t, s, o, d, 0, f, d, 0, 1, 0, 0, 1, j, r), D(t, s + 1, f, d, 0, f, c, 0, 1, 0, 0, 1, j, r), D(t, s + 2, f, c, 0, o, c, 0, 1, 0, 0, 1, j, r), D(t, s + 3, o, c, 0, o, d, 0, 1, 0, 0, 1, j, r), s + 4;
  }
  /** One guide: from the point (lx, ly) of the sheet's plane, `E` units along (dx, dy) of that plane; returns the next free index. */
  guide(t, s, i, e, h, l, r, o, f) {
    const c = this.ex, d = this.ey, u = i.wx + c.x * e + d.x * h, p = i.wy + c.y * e + d.y * h, v = i.wz + c.z * e + d.z * h, x = u + (c.x * l + d.x * r) * o, y = p + (c.y * l + d.y * r) * o, w = v + (c.z * l + d.z * r) * o, n = this.fPos, m = k(0.6 * Math.hypot(u - n.x, p - n.y, v - n.z) / Vt), g = k(Math.hypot(x - n.x, y - n.y, w - n.z) / Vt);
    return D(t, s, u, p, v, x, y, w, 1, 0, m, g, j, f), s + 1;
  }
  /** Guest: everything of the room that is not a sheet — hole, plane of columns, virtual phone, guides, measurement, labels. */
  writeRoom() {
    const t = this.tl, s = this.cw, i = this.ch, e = this.shared.uHole.value, h = 0.5 + ut, l = this.cardH / 2 + ut;
    let r = this.shared.uHoleOn.value > 0;
    for (let M = 0; M < 4 && r; M++) {
      const A = this.fromCard(M === 0 || M === 3 ? -h : h, M < 2 ? l : -l, 0);
      if (A.z > -0.1) {
        r = !1;
        break;
      }
      const P = this.toScreen(A.x, A.y, A.z), E = P.x * this.sx, z = this.bh - P.y * this.sy, C = e[M >> 1];
      M & 1 ? (C.z = E, C.w = z) : (C.x = E, C.y = z);
    }
    r || (this.shared.uHoleOn.value = 0);
    const o = this.carrier, f = this.colsMesh;
    if (f.visible = !!o && this.tier.far && o.on && !o.flat && this.colsA > 3e-3 && this.colsGrow > 3e-3, f.visible && o) {
      const M = o.kx, A = this.colsMat.uniforms, P = this.v.set(-o.rx * o.kx, -o.ry * o.ky, 2e-3).applyQuaternion(o.q);
      f.matrix.compose(this.v2.set(o.wx + P.x, o.wy + P.y, o.wz + P.z), o.q, this.v3.set(o.kx, o.ky, 1)), A.uPlane.value.set(0, -5 / M, 18 / M, 24 / M), A.uFade.value.set(9 / M, 7 / M, 17 / M, Vt / M), A.uMask.value.set(o.rx, o.ry, o.rw, o.rh), A.uLook.value.set(0.34, 0.03, 0), A.uAlpha.value = this.colsA, A.uGrow.value = this.colsGrow, A.uBehind.value = o.behind, A.uNear.value.set(Wt, Zt), f.renderOrder = o.base + 4;
    }
    const c = this.phoneA, d = this.phoneBody, u = this.phoneScreen, p = this.ghostMesh, v = this.ghost;
    if (d.visible = u.visible = p.visible = c > 3e-3, d.visible) {
      d.matrix.compose(this.v3.copy(this.fromCard(0, 0, -0.012)), this.fQuat, this.v.set(1 + 2 * ut, this.cardH + 2 * ut, 1)), u.matrix.compose(this.fPos, this.fQuat, this.v.set(1, this.cardH, 1)), d.material.uniforms.uAlpha.value = c, u.material.uniforms.uAlpha.value = c;
      const M = this.zoom;
      let A = this.ghostRect(v, 0, 0, 0, M, M * this.cardH, 0.8 * k((1 - M) / (1 - J)));
      for (const E of this.flying) A = this.ghostRect(v, A, M * E.rx, M * E.ry, M * E.rw, M * E.rh, E.flat || !E.on ? 0 : 0.55 * E.acr);
      p.matrix.compose(this.v3.copy(this.fromCard(0, 0, 4e-3)), this.fQuat, this.v.set(1, 1, 1));
      const P = this.ghostMat.uniforms;
      P.uDash.value = 4 * this.sx, P.uAlpha.value.set(c, 0, 0, 0);
      for (const E of v.attrs) E.needsUpdate = !0;
    }
    const x = this.guides, y = this.tier.guides;
    let w = 0;
    for (const M of this.flying) {
      const A = (this.reduced ? k(M.chA * 1.5) : k(M.guide * 4)) * M.op * (1 - M.w) * this.nearAlpha(M) * 0.85;
      if (!M.on || M.flat || M.guide <= 0 || A <= 3e-3) continue;
      const P = M.rw * M.kx / 2, E = M.rh * M.ky / 2, z = _i * M.guide, C = M.room.side < 0 ? 1 : -1;
      this.ex.set(1, 0, 0).applyQuaternion(M.q), this.ey.set(0, 1, 0).applyQuaternion(M.q), w = this.guide(x, w, M, -P, E, -1, 0, z, A), w = this.guide(x, w, M, P, E, 1, 0, z, A), y >= 4 && (w = this.guide(x, w, M, C * P, E, 0, 1, z, A * 0.6), w = this.guide(x, w, M, C * P, -E, 0, -1, z, A * 0.6));
    }
    if (this.guideCount = w, x.geometry.instanceCount = w, this.guideMesh.visible = this.guideCount > 0, w > 0) for (const M of x.attrs) M.needsUpdate = !0;
    const n = this.measure, m = this.atlas.entries, g = this.distRect, b = this.distLine, S = this.fromCard(0, -(this.cardH / 2 + ut), 0), F = S.x, T = S.y, R = S.z;
    let _ = this.measureP > 0 && R < -0.2 && t !== "assemble";
    if (g[2] = 0, _) {
      const M = this.toScreen(F, T, R), A = M.x, P = M.y, E = s / 2, z = i - 12;
      if (P > z - 30) _ = !1;
      else {
        const C = E - A, U = z - P, tt = Math.hypot(C, U), K = -U / tt, yt = C / tt;
        D(n, 0, A, P, 0, E, z, 0, 1.5, 3, 0, 1, ot, 1), D(n, 1, A - K * 6, P - yt * 6, 0, A + K * 6, P + yt * 6, 0, 1.5, 3, 0, 0, ot, 1), D(n, 2, E - K * 6, z - yt * 6, 0, E + K * 6, z + yt * 6, 0, 1.5, 3, 1, 1, ot, 1);
        const ee = this.camera.projectionMatrix.elements, Qt = 0.6, se = (E / s * 2 - 1) * Qt / ee[0] - F, ie = (1 - z / i * 2) * Qt / ee[5] - T, ae = -Qt - R, oe = Math.hypot(se, ie, ae), re = 10 / Jt;
        let Gt = 3;
        for (let it = re, Et = 1; it < oe - 0.4 && Gt < 3 + Be; it += re, Et++) {
          const lt = it / oe, xt = this.toScreen(F + se * lt, T + ie * lt, R + ae * lt), he = Math.hypot(xt.x - A, xt.y - P) / tt, Tt = Et % 5 === 0 ? 5 : 3;
          D(n, Gt++, xt.x - K * Tt, xt.y - yt * Tt, 0, xt.x + K * Tt, xt.y + yt * Tt, 0, 1, 3, he, he, ot, 1);
        }
        n.geometry.instanceCount = Gt;
        for (const it of n.attrs) it.needsUpdate = !0;
        const ne = this.measureMat.uniforms;
        if (ne.uProg.value.set(0, 0, 0, this.measureP), ne.uAlpha.value.set(0, 0, 0, this.reduced ? this.measureA : 1), b[0] = A, b[1] = P, b[2] = E, b[3] = z, this.measureA > 0) {
          const it = Math.min(999, Math.max(0, this.cmShown)), Et = it >= 100 ? 3 : it >= 10 ? 2 : 1, lt = m[this.segEntry].w + Et * m[this.segEntry + 1].w + m[this.segEntry + 11].w;
          g[0] = Math.round(Math.min(Math.max(A - lt / 2, Z), s - Z - lt) * this.sx) / this.sx, g[1] = Math.round(Math.min(Math.max(P - wt / 2, Z), i - Z - wt) * this.sy) / this.sy, g[2] = lt, g[3] = wt;
        }
      }
    }
    this.measureMesh.visible = _;
    const Y = this.labels, L = this.sprites, N = this.leaders, I = this.pts, W = this.pts2;
    let Q = !1;
    for (const M of this.flying) {
      const A = Y[M.slot];
      if (A.on = M.on && !M.flat && M.chA > 0 && M.op > 0, A.n = 0, A.area = 0, !A.on) continue;
      Q = !0;
      const P = M.rw * M.kx / 2, E = M.rh * M.ky / 2;
      this.ex.set(1, 0, 0).applyQuaternion(M.q), this.ey.set(0, 1, 0).applyQuaternion(M.q);
      for (let C = 0; C < 4; C++) {
        const U = C === 0 || C === 3 ? -P : P, tt = C < 2 ? E : -E;
        I[C * 3] = M.wx + this.ex.x * U + this.ey.x * tt, I[C * 3 + 1] = M.wy + this.ex.y * U + this.ey.y * tt, I[C * 3 + 2] = M.wz + this.ex.z * U + this.ey.z * tt;
      }
      const z = Zs(I, 4, 0.12, W);
      for (let C = 0; C < z; C++) {
        const U = this.toScreen(W[C * 3], W[C * 3 + 1], W[C * 3 + 2]);
        A.poly[C * 2] = U.x, A.poly[C * 2 + 1] = U.y;
      }
      A.n = Vs(A.poly, z, Z, Z, s - Z, i - Z, this.polyTmp), A.area = $s(A.poly, A.n);
    }
    let mt = 0, Ct = 0;
    if (Q) {
      const M = this.hasPose ? this.poseStill >= Ns : this.reduced;
      Ks(Y, this.flying.length, s, i, Z, Z, g, this.labelPref, this.chromeDt <= 0 || M), (!Js(Y, this.flying.length, this.chromeDt, this.reduced, M, g) || this.hasPose && !M) && (this.dirty = !0);
      for (const A of this.flying) {
        const P = Y[A.slot];
        if (!P.shown) continue;
        const E = A.chA * A.op * this.nearAlpha(A) * P.fade, z = m[A.chip], C = Math.min(Math.max(P.ax, P.x), P.x + P.bw), U = Math.min(Math.max(P.ay, P.y), P.y + P.bh), tt = Math.hypot(C - P.ax, U - P.ay) > Z ? 1 : 0;
        if (D(N, Ct++, P.ax, P.ay, 0, C, U, 0, 1, 3, 0, 1, j, E * tt * (A.lead > 0 ? 1 : 0)), A.chipR > 0 && this.sprite(L, mt++, P.x * this.sx, P.y * this.sy, z.w * this.sx, z.h * this.sy, z, E, A.chipR, 1), A.pill >= 0 && A.pillR > 0) {
          const K = m[A.pill];
          this.sprite(L, mt++, P.x * this.sx, (P.y + $t + pe) * this.sy, K.w * this.sx, K.h * this.sy, K, E, A.pillR, 1);
        }
      }
    } else
      for (const M of Y) M.held = !1;
    if (N.geometry.instanceCount = Ct, this.leaderMesh.visible = Ct > 0, Ct > 0) {
      const M = this.leaderMesh.material.uniforms;
      M.uProg.value.set(1, 1, 1, 1), M.uAlpha.value.set(1, 1, 1, 1);
      for (const A of N.attrs) A.needsUpdate = !0;
    }
    if (_ && g[2] > 0) {
      const M = Math.min(999, Math.max(0, this.cmShown)), A = this.measureA, P = g[1] * this.sy, E = wt * this.sy;
      let z = g[0] * this.sx, C = m[this.segEntry];
      this.sprite(L, mt++, z, P, C.w * this.sx, E, C, A, 1, 1), z += C.w * this.sx;
      for (let U = M >= 100 ? 100 : M >= 10 ? 10 : 1; U >= 1; U = U / 10)
        C = m[this.segEntry + 1 + Math.floor(M / U) % 10], this.sprite(L, mt++, z, P, C.w * this.sx, E, C, A, 1, 1), z += C.w * this.sx;
      C = m[this.segEntry + 11], this.sprite(L, mt++, z, P, C.w * this.sx, E, C, A, 1, 1);
    }
    this.finishSprites(mt);
  }
  // ---------------------------------------------------------------- loop
  tick(t) {
    if (this.paused) return;
    const s = this.P.dur[this.tl];
    let i = Math.max(0, (t - this.t0) / 1e3);
    i >= 0 || (i = 0);
    const e = this.tl === "idle";
    if (!e && i > s && (i = s), !(!(e ? !this.reduced : i !== this.t) && !this.dirty && !this.sizeDirty) && !(e && t - this.lastRender < 33 && !this.sizeDirty) && (this.t = i, this.chromeDt = Math.min(0.1, Math.max(0, (t - this.lastRender) / 1e3)), this.sizeDirty && this.measureCanvas(), this.emit(i), this.dirty = !1, this.update(t), this.render(), this.lastRender = t, !e && i >= s && !this.done)) {
      this.done = !0;
      const l = this.resolve;
      this.resolve = null, l?.(), this.opts.onDone?.({ timeline: this.tl });
    }
  }
  emit(t) {
    const s = this.events[this.tl];
    for (; this.evCursor < s.length && s[this.evCursor].t <= t; )
      s[this.evCursor].t > this.prevT && this.opts.onLayer?.(s[this.evCursor].e), this.evCursor++;
    this.prevT = t;
  }
  render() {
    this.renderer.render(this.scene, this.camera), this.frameCount++;
  }
  finishSwap(t) {
    if (!t.next) return;
    const s = t.mat.uniforms;
    t.tex.dispose(), t.tex = t.next, t.next = null, s.map.value = t.tex, s.mapB.value = t.tex, s.uMix.value = 0, t.smat && (t.smat.uniforms.map.value = t.tex);
  }
  // ---------------------------------------------------------------- public handle
  handle() {
    return {
      play: (s, i) => this.play(s, i?.at),
      setTilt: (s, i) => {
        const e = Math.max(-1, Math.min(1, s || 0)), h = Math.max(-1, Math.min(1, i || 0));
        (e !== this.tiltX || h !== this.tiltY) && (this.tiltX = e, this.tiltY = h, this.dirty = !0);
      },
      setPose: (s) => {
        const i = this.hasPose;
        if (this.hasPose = !!s && s.length >= 16, s && this.hasPose) {
          for (let e = 0; e < 16; e++)
            this.pose[e] !== s[e] && (this.poseMoved = !0), this.pose[e] = s[e];
          this.everPose = !0;
        }
        i !== this.hasPose && (this.uFrom = this.u, this.uTo = this.hasPose ? 0 : 1, this.uT0 = performance.now(), this.filterOn = !1), this.dirty = !0;
      },
      setProjection: (s, i) => {
        s > 1 && s < 179 && (this.fov = s, this.aspect = i > 0 ? i : 0, this.role === "guest" && this.setCamera());
      },
      replaceLayer: (s, i) => this.replaceLayer(s, i),
      where: () => ({ role: this.role, timeline: this.tl, t: this.t }),
      dispose: () => this.dispose()
    };
  }
  play(t, s) {
    if (!(this.role === "host" ? Ie : We).includes(t)) return Promise.reject(new Error(`spill: timeline "${t}" does not belong to role "${this.role}"`));
    if (this.disposed) return Promise.reject(new Error("spill: disposed"));
    const e = this.resolve;
    return this.resolve = null, e?.(), this.tl = t, this.t0 = typeof s == "number" && isFinite(s) ? s : performance.now(), this.t = 0, this.prevT = -1, this.evCursor = 0, this.done = !1, this.dirty = !0, t === "idle" ? new Promise(() => {
    }) : new Promise((h) => {
      this.resolve = h;
    });
  }
  async replaceLayer(t, s) {
    const i = this.sheets.find((h) => h.spec.id === t);
    if (!i) throw new Error(`spill: no layer "${t}"`);
    const e = await ve(fe(this.opts.baseUrl, s));
    if (!this.disposed) {
      if (i.img = e, i.qr && (i.grid = de(e, this.canvas), i.mat.uniforms.uQr.value.set(i.grid.ox, i.grid.oy, i.grid.nx, i.grid.ny)), this.setTexture(i, e, !0), i.mixT0 = performance.now(), this.dirty = !0, this.paused) {
        this.finishSwap(i);
        return;
      }
      await new Promise((h) => setTimeout(h, 170)), this.disposed || this.finishSwap(i);
    }
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = !0, cancelAnimationFrame(this.raf), this.raf = 0, this.ro?.disconnect(), this.ro = null, this.canvas.removeEventListener("webglcontextlost", this.onLost);
    const t = this.resolve;
    this.resolve = null, t?.();
    for (const s of this.sheets)
      s.tex.dispose(), s.next?.dispose(), s.mat.dispose(), s.smat?.dispose(), s.lmat.dispose();
    this.atlasTex?.dispose(), this.bgMat?.dispose(), this.spriteMat?.dispose();
    for (const s of this.mats) s.dispose();
    for (const s of this.geos) s.dispose();
    this.scene.clear(), this.sheets = [], this.flying = [], this.labels = [], this.carrier = null, this.renderer && (this.renderer.renderLists.dispose(), this.renderer.dispose()), this.usesFont && ys(), this.usesFont = !1;
  }
}
function qi(a) {
  const t = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(a.trim());
  if (!t) return [0, 0, 0];
  let s = t[1];
  s.length === 3 && (s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2]);
  const i = parseInt(s, 16);
  return [(i >> 16 & 255) / 255, (i >> 8 & 255) / 255, (i & 255) / 255];
}
async function Qi() {
  try {
    if (typeof FontFace > "u" || typeof requestAnimationFrame != "function") return !1;
    const t = (typeof OffscreenCanvas < "u" ? new OffscreenCanvas(1, 1) : document.createElement("canvas")).getContext("webgl2");
    return t ? (t.getExtension("WEBGL_lose_context")?.loseContext(), !0) : !1;
  } catch {
    return !1;
  }
}
function Gi(a) {
  return { ...ts(a).dur };
}
function Ni(a, t) {
  return !t || t.role !== "host" && t.role !== "guest" ? Promise.reject(new Error("spill: opts.role must be host or guest")) : !t.layers || !Array.isArray(t.layers.layers) || t.layers.layers.length === 0 ? Promise.reject(new Error("spill: opts.layers is not a layer manifest")) : Oi(a, t);
}
export {
  Gi as durations,
  Ni as mount,
  Qi as supported
};
