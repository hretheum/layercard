import { Vector2 as U, Vector3 as A, Vector4 as B, BufferGeometry as mt, BufferAttribute as W, ShaderMaterial as H, Matrix4 as yt, FrontSide as Ce, OneMinusSrcAlphaFactor as ke, OneFactor as qe, AddEquation as Oe, CustomBlending as ze, DoubleSide as Bt, InstancedBufferGeometry as pe, InstancedBufferAttribute as Q, DynamicDrawUsage as me, Scene as Ie, Camera as We, Group as It, Quaternion as K, Euler as _e, WebGLRenderer as Ue, Texture as Wt, Mesh as I, CanvasTexture as xt, DataTexture as De, RepeatWrapping as He, LinearFilter as wt, LinearMipmapLinearFilter as Ge } from "three";
function _(a, t, e) {
  const i = Math.max(1, Math.round(a)), r = Math.max(1, Math.round(t));
  if (typeof OffscreenCanvas < "u") return new OffscreenCanvas(i, r);
  const h = e.ownerDocument.createElement("canvas");
  return h.width = i, h.height = r, h;
}
function D(a, t = !1) {
  const e = a.getContext("2d", t ? { willReadFrequently: !0 } : void 0);
  if (!e) throw new Error("blackhole: 2D canvas context unavailable");
  return e;
}
function _t(a, t) {
  const e = new URL(a.endsWith("/") ? a : a + "/", self.location.href);
  return new URL(t, e).href;
}
async function Ut(a) {
  const t = new Image();
  t.crossOrigin = "anonymous", t.decoding = "async", t.src = a;
  try {
    await t.decode();
  } catch {
    throw new Error(`blackhole: cannot load layer image ${a}`);
  }
  return t;
}
function Qe(a, t, e, i, r, h, d, o = null, f = 0, s = 0) {
  const n = Math.floor(t + 1e-4), v = Math.floor(e + 1e-4), l = Math.ceil(t + i - 1e-4), u = Math.ceil(e + r - 1e-4), m = Math.max(1, l - n), p = Math.max(1, u - v), c = h.width, x = h.height, g = _(m, p, d), M = D(g, !0);
  M.imageSmoothingEnabled = !1, M.globalCompositeOperation = "copy";
  const y = n >= 0 && v >= 0 && l <= c && u <= x;
  if (!y && o) {
    const P = D(o, !0);
    P.setTransform(1, 0, 0, 1, 0, 0), P.globalCompositeOperation = "source-over", P.imageSmoothingEnabled = !0, P.imageSmoothingQuality = "high", P.clearRect(n - f - 1, v - s - 1, m + 2, p + 2), P.drawImage(a, t - f, e - s, i, r), M.drawImage(o, n - f, v - s, m, p, 0, 0, m, p), P.clearRect(n - f - 1, v - s - 1, m + 2, p + 2);
  }
  const w = Math.max(0, n), b = Math.max(0, v), R = Math.min(c, l), L = Math.min(x, u);
  if (R > w && L > b) {
    const P = D(h, !0);
    P.setTransform(1, 0, 0, 1, 0, 0), P.globalCompositeOperation = "source-over", P.clearRect(w - 1, b - 1, R - w + 2, L - b + 2), P.imageSmoothingEnabled = !0, P.imageSmoothingQuality = "high", P.drawImage(a, t, e, i, r), y || (M.globalCompositeOperation = "source-over", M.clearRect(w - n, b - v, R - w, L - b)), M.drawImage(h, w, b, R - w, L - b, w - n, b - v, R - w, L - b), P.clearRect(w - 1, b - 1, R - w + 2, L - b + 2);
  }
  return { canvas: g, x0: n, y0: v, w: m, h: p, tu: (t - n) / m, tv: 1 - (e - v + r) / p, tw: i / m, th: r / p };
}
function Dt(a, t) {
  const e = { ox: 0, oy: 0, nx: 25, ny: 25 };
  try {
    const i = Math.min(512, a.naturalWidth || 256), r = Math.min(512, a.naturalHeight || 256), h = _(i, r, t), d = D(h, !0);
    d.imageSmoothingEnabled = !1, d.drawImage(a, 0, 0, i, r);
    const o = d.getImageData(0, 0, i, r).data;
    let f = 255, s = 0;
    const n = new Uint8Array(i * r);
    for (let y = 0; y < i * r; y++) {
      const w = o[y * 4 + 3] / 255, b = Math.round((0.299 * o[y * 4] + 0.587 * o[y * 4 + 1] + 0.114 * o[y * 4 + 2]) * w + 255 * (1 - w));
      n[y] = b, b < f && (f = b), b > s && (s = b);
    }
    if (s - f < 60) return e;
    const v = (f + s) / 2;
    let l = i, u = r, m = -1, p = -1;
    for (let y = 0; y < r; y++) for (let w = 0; w < i; w++)
      n[y * i + w] < v && (w < l && (l = w), w > m && (m = w), y < u && (u = y), y > p && (p = y));
    if (m < 0) return e;
    let c = 0;
    for (; l + c < i && n[u * i + l + c] < v; ) c++;
    const x = c / 7, g = Math.round((m - l + 1) / x);
    if (x < 1.5 || g < 21 || g > 177 || (g - 21) % 4 !== 0) return e;
    const M = (m - l + 1) / g;
    return { ox: l % M / i, oy: u % M / r, nx: i / M, ny: r / M };
  } catch {
    return e;
  }
}
const ye = "BlackholeMono", $e = `${ye}, ui-monospace, Menlo, Consolas, monospace`;
let ot = null, nt = null, ht = 0;
function Ne() {
  if (ht++, !nt) {
    const a = new FontFace(ye, `url(${new URL("./blackhole-mono.woff2", import.meta.url).href})`, { weight: "500", style: "normal" });
    ot = a, nt = a.load().then(
      () => {
        document.fonts.add(a);
      },
      () => {
      }
    );
  }
  return nt;
}
function Ve() {
  ht--, ht <= 0 && (ot && document.fonts.delete(ot), ot = null, nt = null, ht = 0);
}
const lt = 20, xe = 18, Ht = 2, Gt = 12, Qt = 11, ut = 14;
function je(a, t, e, i) {
  const r = D(_(4, 4, i)), h = (u) => `500 ${u * t}px ${$e}`, d = [];
  let o = 2, f = 2;
  for (const u of a) {
    const m = u.kind === "tag" ? Qt : Gt, p = u.kind === "tag" ? 0 : 6;
    r.font = h(m);
    let c = u.text;
    const x = (y) => r.measureText(y).width / t + 2 * p <= e;
    if (!x(c)) {
      for (; c.length > 1 && !x(c + "…"); ) c = c.slice(0, -1);
      c += "…";
    }
    const g = Math.ceil(r.measureText(c).width / t + 2 * p), M = u.kind === "chip" ? lt : u.kind === "pill" ? xe : ut;
    d.push({ w: g, h: M, text: c }), o = Math.max(o, Math.ceil(g * t) + 4), f += Math.ceil(M * t) + 4;
  }
  const s = _(o, f, i), n = D(s), v = [];
  let l = 2;
  return a.forEach((u, m) => {
    const p = d[m], c = Math.ceil(p.w * t), x = Math.ceil(p.h * t), g = u.kind === "tag" ? Qt : Gt;
    n.font = h(g), n.textBaseline = "alphabetic";
    const M = n.measureText("H").actualBoundingBoxAscent || g * t * 0.72;
    if (u.kind !== "tag") {
      const y = 3 * t;
      n.fillStyle = u.kind === "chip" ? "#2F80FF" : "#FF4D3D", n.beginPath(), n.moveTo(2 + y, l), n.arcTo(2 + c, l, 2 + c, l + x, y), n.arcTo(2 + c, l + x, 2, l + x, y), n.arcTo(2, l + x, 2, l, y), n.arcTo(2, l, 2 + c, l, y), n.closePath(), n.fill();
    }
    n.fillStyle = u.kind === "tag" ? "#2F80FF" : "#FFFFFF", n.fillText(p.text, 2 + (u.kind === "tag" ? 0 : 6 * t), Math.round(l + (x + M) / 2)), v.push({ w: c / t, h: x / t, u0: 2 / o, v0: l / f, u1: (2 + c) / o, v1: (l + x) / f }), l += x + 4;
  }), { canvas: s, entries: v, bytes: o * f * 4 };
}
function Ye() {
  return {
    uRes: { value: new U(1, 1) },
    uPr: { value: 1 },
    uSafe: { value: [new B(), new B(), new B(), new B()] },
    uOrtho: { value: 1 },
    uSnap: { value: 0 },
    uSide: { value: 2 },
    uBehind: { value: 1 },
    uEye: { value: new A(0, 0, 6) },
    uWin: { value: new U(0.5, 0.5) },
    uRim: { value: 0 }
  };
}
const tt = (
  /* glsl */
  `
uniform float uSide;
uniform vec3 uEye;
uniform vec2 uWin;
uniform float uBehind;
bool windowDrop(vec3 p) {
  if (uSide > 1.5) return false;
  if (uSide < -0.5 && p.z > 0.0) return true;
  if (uSide > 0.5 && p.z <= 0.0) return true;
  if (p.z < 0.0) {
    vec2 h = uEye.xy + (p.xy - uEye.xy) * (uEye.z / (uEye.z - p.z));
    if (abs(h.x) > uWin.x + 1e-4 || abs(h.y) > uWin.y + 1e-4) return true;
  }
  return false;
}
float windowFade(vec3 p) { return uSide < 1.5 && p.z <= 0.0 ? uBehind : 1.0; }`
), vt = 4;
function Xe() {
  return { uLq: { value: new B(1e9, 0, 0, 0.01) }, uLqR: { value: [new B(), new B(), new B(), new B()] } };
}
const we = (
  /* glsl */
  `
uniform vec4 uLq;
uniform vec4 uLqR[${vt}];
float lqSurface(float x) {
  float y = uLq.x;
  if (uLq.y > 0.0) {
    y += uLq.y * (0.6 * sin(x * uLq.w + uLq.z * 2.3) + 0.4 * sin(x * uLq.w * 2.3 - uLq.z * 3.7 + 1.3));
    for (int i = 0; i < ${vt}; i++) {
      vec4 r = uLqR[i];
      float d = (x - r.x) / max(r.w, 1.0);
      y += r.y * exp(-d * d) * cos(d * 3.5 - r.z);
    }
  }
  return y;
}
// 1 below the surface, 0 above it, with one pixel of ramp
float lqBelow() { return clamp(lqSurface(gl_FragCoord.x) - gl_FragCoord.y + 0.5, 0.0, 1.0); }`
), N = (
  /* glsl */
  `
uniform vec4 uSafe[4];
bool windowSafe() {
  vec2 f = gl_FragCoord.xy;
  for (int i = 0; i < 4; i++) {
    vec4 r = uSafe[i];
    if (f.x >= r.x && f.x < r.z && f.y >= r.y && f.y < r.w) return true;
  }
  return false;
}`
), Ke = (
  /* glsl */
  `
attribute float aFace;
uniform vec4 uBox;
uniform vec2 uRes;
uniform float uSnap;
uniform float uOrtho;
uniform float uZoom;
uniform mat4 uLocal;
// centroid: a slab's side face seen edge-on covers a fraction of a pixel, and a position extrapolated to the
// pixel centre would be off by several thicknesses, which moves the cut along the sheet by pixels
centroid varying vec3 vP;
varying vec2 vUv;
varying float vFace;
varying vec3 vN;
varying vec3 vV;
varying vec2 vCard;
varying vec3 vNo;
void main() {
  // uZoom < 1 magnifies the print about its centre inside a quad that keeps its size (host lift)
  vUv = (uv - 0.5) * uZoom + 0.5;
  vFace = aFace;
  vNo = normal;
  vCard = uBox.xy + position.xy * uBox.zw;
  vP = (uLocal * vec4(position, 1.0)).xyz;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = uOrtho > 0.5 ? vec3(0.0, 0.0, 1.0) : normalize(-mv.xyz);
  vec4 p = projectionMatrix * mv;
  if (uSnap > 0.5) {
    vec2 px = floor((p.xy / p.w * 0.5 + 0.5) * uRes + 0.5);
    p.xy = (px / uRes * 2.0 - 1.0) * p.w;
  }
  gl_Position = p;
}`
), Ze = (
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
centroid varying vec3 vP;
uniform float uRim;
uniform float uGain;
uniform float uSub;
uniform vec3 uRev;
uniform float uProbe;
const vec3 RIM = vec3(0.918, 0.949, 1.0);
const vec3 TINT = vec3(0.624, 0.722, 0.851);
${N}
${tt}
${we}
vec4 layerTex(vec2 uv) {
  vec4 a = texture2D(map, uv);
  if (uMix > 0.0) a = mix(a, texture2D(mapB, uv), uMix);
  return a;
}
#ifdef BLACKHOLE_QR
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
  if (windowSafe()) discard;
  if (windowDrop(vP)) discard;
  // a layer floating in the level: only the rows that have arrived (uRev: longer side vertical, head at its far end, share), only below the surface
  float along = uRev.x > 0.5 ? vUv.y : vUv.x;
  float row = uRev.y > 0.5 ? 1.0 - along : along;
  if (row > uRev.z) discard;
  float below = uSub > 0.5 ? lqBelow() : 1.0;
  if (below <= 0.0) discard;
  if (uProbe > 0.5) { gl_FragColor = vec4(row, 1.0, 1.0, 1.0); return; }
  if (vFace > 1.5) {
    float lit = 0.5 + 0.5 * dot(normalize(vNo.xy), vec2(-0.64, 0.77));
    float a = uAcr * uOpacity * 0.9;
    gl_FragColor = vec4(RIM * (0.45 + 0.55 * lit) * a, a);
    return;
  }
#ifdef BLACKHOLE_QR
  vec4 c = qrTex(vUv);
#else
  vec4 c = layerTex(vUv);
#endif
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
  }
  // the rim of light where the glass cuts the sheet (host without a viewer): about 1.5 px along the cut
  float fz = fwidth(vP.z);
  if (uRim > 0.0 && fz > 1e-6) {
    float cut = uRim * (1.0 - smoothstep(1.0, 2.5, -vP.z / fz));
    c = c * (1.0 - cut) + vec4(RIM * cut, cut);
  }
  // light of the room behind the glass: the print is brighter there, never darker
  c.rgb = min(c.rgb * uGain, vec3(c.a));
  gl_FragColor = c * (uOpacity * windowFade(vP) * below);
}`
), Je = (
  /* glsl */
  `
uniform vec4 uBox;
uniform mat4 uLocal;
varying vec2 vUv;
varying vec2 vCard;
varying vec3 vP;
void main() {
  vUv = uv;
  vP = (uLocal * vec4(position, 1.0)).xyz;
  vCard = uBox.xy + position.xy * uBox.zw;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`
), ts = (
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
varying vec3 vP;
const vec3 SHADOW = vec3(0.0196, 0.0275, 0.0392);
${N}
${tt}
float tap(vec2 uv) { return textureLod(map, clamp(uv, 0.0, 1.0), uLod).a; }
void main() {
  if (windowSafe()) discard;
  if (windowDrop(vP)) discard;
  vec2 cuv = (vUv - 0.5) * uGrow + 0.5;
  vec2 r = max(uRad, vec2(1e-4));
  vec2 m = smoothstep(-r, r, cuv) * smoothstep(-r, r, 1.0 - cuv);
  float a = tap(cuv);
#if BLACKHOLE_TAPS > 1
  a = (a * 2.0 + tap(cuv + r * vec2(0.7, 0.3)) + tap(cuv + r * vec2(-0.3, 0.7))
     + tap(cuv + r * vec2(-0.7, -0.3)) + tap(cuv + r * vec2(0.3, -0.7))) / 6.0;
#endif
  float sh = max(a, uSlab) * m.x * m.y * uAlpha;
  vec2 c0 = smoothstep(uClip.xy - 0.003, uClip.xy + 0.003, vCard);
  vec2 c1 = 1.0 - smoothstep(uClip.zw - 0.003, uClip.zw + 0.003, vCard);
  sh *= c0.x * c0.y * c1.x * c1.y;
  sh *= windowFade(vP);
  gl_FragColor = vec4(SHADOW * sh, sh);
}`
), es = (
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
uniform mat4 uLocal;
varying vec4 vC;
varying vec3 vL;
varying vec2 vS;
varying vec3 vP;
vec2 toPx(vec3 p) {
  if (uScreen > 0.5) return vec2(p.x * uPr, uRes.y - p.y * uPr);
  vec4 c = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  return (c.xy / c.w * 0.5 + 0.5) * uRes;
}
void main() {
  int g = int(iP.y + 0.5);
  float prog = g == 0 ? uProg.x : g == 1 ? uProg.y : g == 2 ? uProg.z : uProg.w;
  float al = g == 0 ? uAlpha.x : g == 1 ? uAlpha.y : g == 2 ? uAlpha.z : uAlpha.w;
  vec2 a = toPx(iA);
  vec2 b = toPx(iB);
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
  // card-space position along the line; screen-space lines (leaders) are in front of everything
  vP = uScreen > 0.5 ? vec3(0.0, 0.0, 1.0) : (uLocal * vec4(g == 2 || position.x < 0.5 ? iA : iB, 1.0)).xyz;
  vC = vec4(iC.rgb * iC.a, iC.a) * al;
  gl_Position = vec4(p / uRes * 2.0 - 1.0, 0.0, 1.0);
}`
), ss = (
  /* glsl */
  `
uniform float uDash;
uniform float uScreen;
varying vec4 vC;
varying vec3 vL;
varying vec2 vS;
varying vec3 vP;
${N}
${tt}
void main() {
  if (windowSafe()) discard;
  if (uScreen < 0.5 && windowDrop(vP)) discard;
  if (vL.z <= 0.0) discard;
  float s = mix(vS.x, vS.y, clamp(vL.x / max(vL.y, 1e-3), 0.0, 1.0));
  if (s > vL.z) discard;
  if (uDash > 0.0 && mod(vL.x + uDash * 0.5, uDash * 2.0) >= uDash) discard;
  gl_FragColor = vC * (uScreen < 0.5 ? windowFade(vP) : 1.0);
}`
), is = (
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
), as = (
  /* glsl */
  `
uniform sampler2D map;
varying vec2 vUv;
varying vec2 vQ;
varying vec4 vFx;
${N}
void main() {
  if (windowSafe()) discard;
  float rv = vFx.z > 0.0 ? vQ.x : 1.0 - vQ.x;
  if (rv > vFx.y || vFx.x <= 0.0) discard;
  gl_FragColor = texture2D(map, vUv) * vFx.x;
}`
), rs = (
  /* glsl */
  `
void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`
), os = (
  /* glsl */
  `
uniform vec3 uColor;
uniform float uAlpha;
${N}
void main() {
  if (windowSafe()) discard;
  gl_FragColor = vec4(uColor * uAlpha, uAlpha);
}`
), G = {
  transparent: !0,
  side: Bt,
  depthTest: !1,
  depthWrite: !1,
  blending: ze,
  blendEquation: Oe,
  blendSrc: qe,
  blendDst: ke
};
function $t(a, t, e, i, r = a.uSide) {
  return new H({
    ...G,
    side: Ce,
    defines: e ? { BLACKHOLE_QR: 1 } : {},
    vertexShader: Ke,
    fragmentShader: Ze,
    uniforms: {
      uRes: a.uRes,
      uPr: a.uPr,
      uSafe: a.uSafe,
      uOrtho: a.uOrtho,
      uSnap: a.uSnap,
      uSide: r,
      uEye: a.uEye,
      uWin: a.uWin,
      uBehind: a.uBehind,
      uRim: a.uRim,
      uLocal: { value: new yt() },
      uGain: { value: 1 },
      uLq: i.uLq,
      uLqR: i.uLqR,
      uSub: { value: 0 },
      uRev: { value: new A(0, 0, 1) },
      uProbe: { value: 0 },
      map: { value: t },
      mapB: { value: t },
      uMix: { value: 0 },
      uBox: { value: new B(0, 0, 1, 1) },
      uOpacity: { value: 1 },
      uAcr: { value: 0 },
      uSweep: { value: 0 },
      uSweepAmt: { value: 0 },
      uZoom: { value: 1 },
      uInner: { value: new A(0, 0, -1) },
      uQr: { value: new B(0, 0, 25, 25) },
      uQrT: { value: new A() },
      uTile: { value: new B(0, 0, 1, 1) }
    }
  });
}
function ns(a, t, e) {
  return new H({
    ...G,
    defines: { BLACKHOLE_TAPS: e },
    vertexShader: Je,
    fragmentShader: ts,
    uniforms: {
      uSafe: a.uSafe,
      uSide: a.uSide,
      uEye: a.uEye,
      uWin: a.uWin,
      uBehind: a.uBehind,
      uLocal: { value: new yt() },
      map: { value: t },
      uBox: { value: new B(0, 0, 1, 1) },
      uGrow: { value: new U(1, 1) },
      uRad: { value: new U(0.01, 0.01) },
      uLod: { value: 0 },
      uAlpha: { value: 0 },
      uSlab: { value: 0 },
      uClip: { value: new B(-1e3, -1e3, 1e3, 1e3) }
    }
  });
}
function st(a, t) {
  return new H({
    ...G,
    vertexShader: es,
    fragmentShader: ss,
    uniforms: {
      uRes: a.uRes,
      uPr: a.uPr,
      uSafe: a.uSafe,
      uSnap: { value: 0 },
      uSide: a.uSide,
      uEye: a.uEye,
      uWin: a.uWin,
      uBehind: a.uBehind,
      uLocal: { value: new yt() },
      uScreen: { value: t ? 1 : 0 },
      uProg: { value: new B(1, 1, 1, 1) },
      uAlpha: { value: new B(1, 1, 1, 1) },
      uDash: { value: 0 }
    }
  });
}
function hs(a, t) {
  return new H({
    ...G,
    vertexShader: is,
    fragmentShader: as,
    uniforms: { uRes: a.uRes, uSafe: a.uSafe, map: { value: t } }
  });
}
function ls(a) {
  return new H({
    ...G,
    vertexShader: rs,
    fragmentShader: os,
    uniforms: { uSafe: a.uSafe, uColor: { value: new A() }, uAlpha: { value: 1 } }
  });
}
function us() {
  const a = [], t = [], e = [], i = [], r = [], h = (s, n, v, l) => {
    const u = a.length / 3;
    for (let m = 0; m < 4; m++)
      a.push(...s[m]), t.push(...n), e.push(...v[m]), i.push(l);
    r.push(u, u + 1, u + 2, u, u + 2, u + 3);
  }, d = [[0, 0], [1, 0], [1, 1], [0, 1]], o = 0.5;
  h([[-o, -o, 0], [o, -o, 0], [o, o, 0], [-o, o, 0]], [0, 0, 1], d, 0), h([[-o, o, -1], [o, o, -1], [o, -o, -1], [-o, -o, -1]], [0, 0, -1], [[0, 1], [1, 1], [1, 0], [0, 0]], 1), h([[o, -o, -1], [o, o, -1], [o, o, 0], [o, -o, 0]], [1, 0, 0], d, 2), h([[-o, o, -1], [-o, -o, -1], [-o, -o, 0], [-o, o, 0]], [-1, 0, 0], d, 2), h([[o, o, -1], [-o, o, -1], [-o, o, 0], [o, o, 0]], [0, 1, 0], d, 2), h([[-o, -o, -1], [o, -o, -1], [o, -o, 0], [-o, -o, 0]], [0, -1, 0], d, 2);
  const f = new mt();
  return f.setAttribute("position", new W(new Float32Array(a), 3)), f.setAttribute("normal", new W(new Float32Array(t), 3)), f.setAttribute("uv", new W(new Float32Array(e), 2)), f.setAttribute("aFace", new W(new Float32Array(i), 1)), f.setIndex(r), f;
}
function Nt(a = !1) {
  const t = a ? 1 : 0.5, e = new mt();
  return e.setAttribute("position", new W(new Float32Array([-t, -t, 0, t, -t, 0, t, t, 0, -t, t, 0]), 3)), e.setAttribute("uv", new W(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2)), e.setIndex([0, 1, 2, 0, 2, 3]), e;
}
function it(a) {
  const t = new pe();
  t.setAttribute("position", new W(new Float32Array([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0]), 3)), t.setIndex([0, 1, 2, 0, 2, 3]);
  const e = new Float32Array(a * 3), i = new Float32Array(a * 3), r = new Float32Array(a * 4), h = new Float32Array(a * 4), d = [
    new Q(e, 3),
    new Q(i, 3),
    new Q(r, 4),
    new Q(h, 4)
  ];
  return ["iA", "iB", "iP", "iC"].forEach((o, f) => {
    d[f].setUsage(me), t.setAttribute(o, d[f]);
  }), t.instanceCount = a, { geometry: t, a: e, b: i, p: r, c: h, attrs: d };
}
function $(a, t, e, i, r, h, d, o, f, s, n, v, l, u = 1) {
  const m = t * 3, p = t * 4;
  a.a[m] = e, a.a[m + 1] = i, a.a[m + 2] = r, a.b[m] = h, a.b[m + 1] = d, a.b[m + 2] = o, a.p[p] = f, a.p[p + 1] = s, a.p[p + 2] = n, a.p[p + 3] = v, a.c[p] = l[0], a.c[p + 1] = l[1], a.c[p + 2] = l[2], a.c[p + 3] = u;
}
function cs(a) {
  const t = new pe();
  t.setAttribute("position", new W(new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]), 3)), t.setIndex([0, 2, 1, 0, 3, 2]);
  const e = new Float32Array(a * 4), i = new Float32Array(a * 4), r = new Float32Array(a * 4), h = [new Q(e, 4), new Q(i, 4), new Q(r, 4)];
  return ["iRect", "iUv", "iFx"].forEach((d, o) => {
    h[o].setUsage(me), t.setAttribute(d, h[o]);
  }), t.instanceCount = a, { geometry: t, rect: e, uv: i, fx: r, attrs: h };
}
const Pt = [47 / 255, 128 / 255, 1];
function fs(a) {
  return { on: !1, alpha: 0, ax: 0, ay: 0, side: a, bw: 0, bh: 0, tx: 0, ty: 0, x: 0, y: 0, lx: 0, ly: 0, held: !1 };
}
const at = 26, vs = 14, ds = 0.045;
function ps(a, t, e, i, r, h, d) {
  for (const s of a) {
    if (!s.on) continue;
    let n = s.side;
    n > 0 && s.ax + at + s.bw > t - i ? n = -1 : n < 0 && s.ax - at - s.bw < i && (n = 1), s.tx = n > 0 ? s.ax + at : s.ax - at - s.bw, s.ty = s.ay - vs - s.bh / 2, s.tx = Math.min(Math.max(s.tx, i), t - i - s.bw), s.ty = Math.min(Math.max(s.ty, r), e - r - s.bh);
  }
  for (let s = 0; s < a.length; s++) {
    const n = a[s];
    if (n.on)
      for (let v = 0; v < s; v++) {
        const l = a[v];
        l.on && n.tx < l.tx + l.bw + 4 && l.tx < n.tx + n.bw + 4 && n.ty < l.ty + l.bh + 4 && l.ty < n.ty + n.bh + 4 && (n.ty = Math.min(l.ty + l.bh + 4, e - r - n.bh));
      }
  }
  let o = !0;
  const f = h > 0 && !d ? 1 - Math.exp(-h / ds) : 1;
  for (const s of a) {
    if (!s.on) {
      s.held = !1;
      continue;
    }
    !s.held || f >= 1 ? (s.x = s.tx, s.y = s.ty, s.lx = s.ax, s.ly = s.ay) : (s.x += (s.tx - s.x) * f, s.y += (s.ty - s.y) * f, s.lx += (s.ax - s.lx) * f, s.ly += (s.ay - s.ly) * f, Math.abs(s.tx - s.x) < 0.5 && Math.abs(s.ty - s.y) < 0.5 && (s.x = s.tx, s.y = s.ty), Math.abs(s.ax - s.lx) < 0.5 && Math.abs(s.ay - s.ly) < 0.5 && (s.lx = s.ax, s.ly = s.ay), (s.x !== s.tx || s.y !== s.ty || s.lx !== s.ax || s.ly !== s.ay) && (o = !1)), s.held = !0;
  }
  return o;
}
const ms = (
  /* glsl */
  `
void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`
), ys = (
  /* glsl */
  `
uniform vec3 uColor;
uniform float uPr;
uniform float uLine;   // 0: the body of the liquid, > 0: only the meniscus, with this opacity
uniform float uProbe;
const vec3 RIM = vec3(0.918, 0.949, 1.0);
${we}
void main() {
  float d = lqSurface(gl_FragCoord.x) - gl_FragCoord.y;
  if (uLine > 0.0) {
    // a hairline lying just under the surface, one CSS px wide
    float m = uLine * (1.0 - smoothstep(0.5 * uPr, 0.5 * uPr + 1.0, abs(d - 0.5 * uPr)));
    if (m <= 0.0 || uProbe > 0.5) discard;
    gl_FragColor = vec4(RIM * m, m);
    return;
  }
  float a = clamp(d + 0.5, 0.0, 1.0);
  if (a <= 0.0) discard;
  gl_FragColor = uProbe > 0.5 ? vec4(0.0, 0.0, 0.0, a) : vec4(uColor * a, a);
}`
);
function Vt(a, t, e) {
  return new H({
    ...G,
    vertexShader: ms,
    fragmentShader: ys,
    uniforms: { uLq: a.uLq, uLqR: a.uLqR, uPr: t, uColor: { value: new A() }, uLine: { value: e ? 1 : 0 }, uProbe: { value: 0 } }
  });
}
const ge = 0.8, dt = 1.2, be = 1, xs = 5, E = (a) => a < 0 ? 0 : a > 1 ? 1 : a, Y = (a, t, e) => a + (t - a) * e, S = (a, t, e) => {
  const i = E((e - a) / (t - a));
  return i * i * (3 - 2 * i);
}, J = (a) => (a = E(a), a < 0.5 ? 4 * a * a * a : 1 - Math.pow(-2 * a + 2, 3) / 2), pt = 0.25, ws = 0.48, gs = 1.2, Et = 0.3, Me = 0.12, bs = (a) => 1 / (1 + a * a / (pt * pt)), Ms = bs(Me), C = 7.75, Ae = 1.2, Rt = 0.5, gt = 0.45, As = 5.35, X = 0.6, Ss = 0.4, Ps = 0.26, O = 1.3, k = 0.055, Ct = 1.2, jt = (a) => Math.pow(E(a), Ct), kt = O * Math.pow(k, 1 / Ct), Se = 0.35, rt = 0.5;
function Yt(a, t = !1) {
  return t ? Se * S(0, 0.5, a) * (1 - S(C - Rt, C, a)) : S(0, Ae, a) * (1 - S(C - Rt, C, a));
}
function Xt(a, t, e = !1) {
  return e ? 0 : gs * t * (0.82 + 0.18 * Math.sin(2 * Math.PI * a / 3.4)) * S(0, 2.2, a);
}
function Kt(a) {
  return S(0.1, Ae, a) * (1 - S(C - Rt, C - 0.12, a));
}
function Zt(a) {
  return S(0.1, 0.5, a) * (1 - S(C - 0.22, C - 0.02, a));
}
function Rs(a, t, e) {
  const i = E((a - kt) / t), r = E((a - O) / t);
  return e[0] = 1 - i, e[1] = i - r, e[2] = r, e;
}
const bt = 0.5, Jt = 1.1, Ls = 0.85, Ts = 0.68, ct = 1.8, Fs = 0.3, Bs = 0.15, Es = 0.5, Lt = 0.55, Cs = 1.15, Tt = 1.5, te = 1.3;
function Mt(a, t = !1) {
  return (t ? Se : 1) * S(0, Fs, a) * (1 - S(Cs, Tt, a));
}
function Pe(a) {
  const t = a.layers.map((o, f) => ({ l: o, i: f })).filter((o) => o.l.role !== "qr").sort((o, f) => o.l.z - f.l.z || o.i - f.i), e = t.length, i = new Float64Array(e), r = new Float64Array(e), h = new Float64Array(e), d = new Float64Array(e);
  for (let o = 0; o < e; o++) {
    const f = t[e - 1 - o].l.rect;
    i[o] = e > 1 ? gt + o * (As - gt) / (e - 1) : gt, r[o] = Ss + Ps * Math.max(f.w, f.h) / a.card.w, h[o] = Bs + (e > 1 ? o * Es / (e - 1) : 0), d[o] = 0.4 + (e > 1 ? o * (Ts - 0.4) / (e - 1) : 0);
  }
  return {
    n: e,
    start: i,
    feed: r,
    rebuildStart: h,
    assembleLock: d,
    dur: { idle: 0, connect: ge, depart: C, rebuild: ct, explode: C, fly: dt, assemble: be }
  };
}
function ft(a, t, e) {
  return e - a.start[t] - X;
}
function ks(a, t, e) {
  const i = a.n - 1 - t, r = a.feed[i] + kt + 0.02;
  return Y(r, -X - 0.02, J((e - a.rebuildStart[t]) / Lt));
}
function At(a, t) {
  if (a.n === 0) return E(t / C);
  let e = 0;
  for (let i = 0; i < a.n; i++) e += E((ft(a, i, t) - O) / a.feed[i]);
  return e / a.n;
}
function qs(a, t, e) {
  if (t === "explode") return bt * At(a, Math.min(e, C));
  if (t === "fly") {
    const i = bt * At(a, C);
    return Math.max(bt * At(a, C + e), Y(i, Jt, J(e / (dt * Ls))));
  }
  return Jt;
}
const ee = ["idle", "connect", "depart", "rebuild"], se = ["explode", "fly", "assemble"], Ft = 0.012, Os = 1.35, zs = 0.94;
function Is() {
  return { uWell: { value: new B(0, 0, 0, 0) } };
}
const T = (a) => a.toFixed(7), Re = (
  /* glsl */
  `
uniform vec4 uWell;
float wellG(vec2 q) { return 1.0 / (1.0 + dot(q, q) / ${T(pt * pt)}); }
vec3 well(vec2 q) {
  float g = wellG(q);
  float k = 1.0 - ${T(ws)} * uWell.x * g;
  float an = uWell.y * g, c = cos(an), s = sin(an);
  return vec3((c * q.x - s * q.y) * k, (s * q.x + c * q.y) * k, -${T(Et)} * uWell.x * min(1.0, g / ${T(Ms)}));
}`
), Ws = (
  /* glsl */
  `
uniform vec3 uB1;
uniform vec3 uB2;
uniform vec3 uB3;
uniform vec3 uB4;
void pathAt(float s, out vec3 p, out vec3 t) {
  float d = ${T(Et)} * uWell.x;
  vec3 A = vec3(0.0, 0.0, -d);
  vec3 toEye = uEye - A;
  vec3 G = A + toEye * (d / max(uEye.z + d, 1e-3));
  if (s <= ${T(k)}) {
    p = mix(A, G, s / ${T(k)});
    t = normalize(toEye);
  } else {
    float x = (s - ${T(k)}) / ${T(1 - k)}, y = 1.0 - x;
    p = y * y * y * y * G + 4.0 * y * y * y * x * uB1 + 6.0 * y * y * x * x * uB2 + 4.0 * y * x * x * x * uB3 + x * x * x * x * uB4;
    vec3 dp = y * y * y * (uB1 - G) + 3.0 * y * y * x * (uB2 - uB1) + 3.0 * y * x * x * (uB3 - uB2) + x * x * x * (uB4 - uB3);
    t = dot(dp, dp) > 1e-12 ? normalize(dp) : normalize(toEye);
  }
}`
), _s = (
  /* glsl */
  `
uniform vec3 uEye;
uniform vec4 uBox;     // the baked box on the card: centre x, y, width, height
uniform vec2 uOff;     // idle's parallax offset, fading out as the pull starts
uniform vec2 uLong;    // unit vector along the longer side, head -> tail
uniform vec2 uShort;   // unit vector along the shorter side
uniform vec2 uLen;     // length along uLong, along uShort
uniform float uHand;   // +1 when uShort is uLong turned by +90 degrees, else -1
uniform float uClock;  // seconds since the head row entered the sink
uniform float uFeed;   // seconds between the head row and the tail row entering it
uniform float uDu;     // half a row, in u
uniform float uWidth;  // width of the ribbon in the air
uniform vec3 uTwist;   // whole turns between glass and guest, wobble carried by the material (turns), phase
uniform vec3 uRef;     // across-direction of the ribbon where it enters the guest's screen (card space)
centroid varying vec3 vP;
varying vec2 vUv;
// centroid, like vP: where the strip is seen edge-on its triangles are slivers, and a value extrapolated to the
// pixel centre would name another row
centroid varying vec4 vRow;     // u, across (-0.5..0.5), ribbon-ness 0..1, path fraction
${Re}
${Ws}
vec2 rowRest(float u) { return uBox.xy + uOff + uLong * ((u - 0.5) * uLen.x); }
// the row with material coordinate u: its centre, its progress through the neck (0 at rest, 1 at the sink), its path fraction
void rowAt(float u, out vec3 c, out float w, out float s) {
  float tau = uClock - u * uFeed;
  w = clamp(1.0 + tau / ${T(X)}, 0.0, 1.0);
  s = pow(clamp(tau / ${T(O)}, 0.0, 1.0), ${T(Ct)});
  if (tau <= 0.0) {
    float e = w * w * (3.0 - 2.0 * w);
    float an = ${T(Os)} * e, cs = cos(an), sn = sin(an);
    vec2 q = rowRest(u);
    c = well(vec2(cs * q.x - sn * q.y, sn * q.x + cs * q.y) * (1.0 - e));
  } else {
    vec3 t;
    pathAt(s, c, t);
  }
}
void main() {
  float u = position.x, v = position.y;
  vec2 q = rowRest(u) + uShort * (v * uLen.y);
  vUv = (q - uOff - uBox.xy) / uBox.zw + 0.5;
  vec3 P = well(q);
  vec3 c;
  float w, s, k = 0.0;
  rowAt(u, c, w, s);
  if (w > 0.0) {
    if (s <= 0.0) {
      // the neck: a straight row across the line the row centres draw on the well
      vec3 ca, cb;
      float wa, sa, wb, sb;
      rowAt(u - uDu, ca, wa, sa);
      rowAt(u + uDu, cb, wb, sb);
      vec2 t2 = cb.xy - ca.xy;
      float l = length(t2);
      vec2 across = l > 1e-6 ? vec2(-t2.y, t2.x) * (uHand / l) : uShort;
      float e = w * w * (3.0 - 2.0 * w);
      vec3 pn = c + vec3(across, 0.0) * (v * mix(uLen.y, ${T(Ft)}, e));
      P = mix(P, pn, smoothstep(0.0, 0.35, w));
      k = smoothstep(0.3, 0.95, w);
    } else {
      vec3 pc, t;
      pathAt(s, pc, t);
      float x = clamp((s - ${T(k)}) / ${T(1 - k)}, 0.0, 1.0);
      vec3 ref = mix(vec3(uShort, 0.0), uRef, smoothstep(0.1, 0.8, x));
      vec3 n0 = ref - t * dot(ref, t);
      n0 = dot(n0, n0) > 1e-8 ? normalize(n0) : normalize(cross(t, vec3(0.3, 0.5, 0.8)));
      vec3 bn = cross(t, n0);
      float th = 6.2831853 * (uTwist.x * smoothstep(0.0, 1.0, x) + uTwist.y * sin(3.1415927 * x) * sin(6.2831853 * (0.8 * u + uTwist.z)));
      P = pc + (n0 * cos(th) + bn * sin(th)) * (v * mix(${T(Ft)}, uWidth, smoothstep(0.0, 0.28, s)));
      k = 1.0;
    }
  }
  vRow = vec4(u, v, k, s);
  vP = P;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(P, 1.0);
}`
), Us = (
  /* glsl */
  `
uniform sampler2D map;
uniform vec3 uBg;
uniform float uOpacity;
uniform float uRim;
uniform float uProbe;
uniform vec4 uWell;
centroid varying vec3 vP;
varying vec2 vUv;
centroid varying vec4 vRow;
const vec3 RIM = vec3(0.918, 0.949, 1.0);
${N}
${tt}
void main() {
  if (windowSafe()) discard;
  if (windowDrop(vP)) discard;
  if (vRow.w >= 0.9995) discard;
  if (uProbe > 0.5) {
    // test: the material coordinate and the path fraction instead of the print
    gl_FragColor = vec4(vRow.x, vRow.w, vRow.z, 1.0);
    return;
  }
  vec4 c = texture2D(map, vUv);
  float k = vRow.z;
  // the ribbon's backing in the card background colour, and a hairline acrylic rim on its two edges
  float back = k * ${T(zs)};
  c += (1.0 - c.a) * vec4(uBg * back, back);
  float fw = max(fwidth(vRow.y), 1e-6);
  float rim = 0.85 * k * (1.0 - smoothstep(0.7, 1.7, (0.5 - abs(vRow.y)) / fw));
  c = c * (1.0 - rim) + vec4(RIM * rim, rim);
  // the anchored guest: the end at the glass is soft, so an error in tracking has nothing sharp to move
  float soft = mix(1.0, smoothstep(${T(k)}, ${T(k + 0.07)}, vRow.w), uWell.z);
  gl_FragColor = c * (uOpacity * soft * windowFade(vP));
}`
);
function Ds(a, t, e) {
  return new H({
    ...G,
    side: Bt,
    vertexShader: _s,
    fragmentShader: Us,
    uniforms: {
      uSafe: a.uSafe,
      uSide: a.uSide,
      uEye: a.uEye,
      uWin: a.uWin,
      uBehind: a.uBehind,
      uWell: t.uWell,
      // the ribbon path in the air: four control points after the glass point, card space (each layer has its own)
      uB1: { value: new A(0, 0, 1) },
      uB2: { value: new A(0, 0, 2) },
      uB3: { value: new A(0, 0, 3) },
      uB4: { value: new A(0, 0, 4) },
      map: { value: e },
      uBg: { value: new A() },
      uOpacity: { value: 1 },
      uRim: { value: 0 },
      uProbe: { value: 0 },
      uBox: { value: new B(0, 0, 1, 1) },
      uOff: { value: new U() },
      uLong: { value: new U(0, -1) },
      uShort: { value: new U(1, 0) },
      uLen: { value: new U(1, 1) },
      uHand: { value: 1 },
      uClock: { value: -1e3 },
      uFeed: { value: 1 },
      uDu: { value: 0.01 },
      uWidth: { value: 0.1 },
      uTwist: { value: new A(1, 0.1, 0) },
      uRef: { value: new A(1, 0, 0) }
    }
  });
}
function Hs(a, t) {
  const e = new Float32Array((a + 1) * (t + 1) * 3);
  let i = 0;
  for (let o = 0; o <= a; o++) for (let f = 0; f <= t; f++)
    e[i++] = o / a, e[i++] = f / t - 0.5, e[i++] = 0;
  const r = a * t * 6, h = r > 65535 || (a + 1) * (t + 1) > 65535 ? new Uint32Array(r) : new Uint16Array(r);
  i = 0;
  for (let o = a - 1; o >= 0; o--) for (let f = 0; f < t; f++) {
    const s = o * (t + 1) + f, n = s + 1, v = s + t + 1, l = v + 1;
    h[i++] = s, h[i++] = v, h[i++] = n, h[i++] = n, h[i++] = v, h[i++] = l;
  }
  const d = new mt();
  return d.setAttribute("position", new W(e, 3)), d.setIndex(new W(h, 1)), d;
}
const Gs = (
  /* glsl */
  `
uniform vec4 uRing;   // radius as a share of full, half width (material units), rotation (turns), opacity
centroid varying vec3 vP;
varying vec2 vR;
${Re}
void main() {
  float an = position.x * 6.2831853;
  // the band lies inside the ring's radius, on the flat floor of the well: one plane, so its centre is the sink
  vec3 P = well(vec2(cos(an), sin(an)) * ((${T(Me)} + (position.y - 1.0) * uRing.y) * uRing.x));
  vR = position.xy;
  vP = P;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(P, 1.0);
}`
), Qs = (
  /* glsl */
  `
uniform sampler2D map;
uniform vec4 uRing;
uniform float uProbe;
centroid varying vec3 vP;
varying vec2 vR;
${N}
${tt}
void main() {
  if (windowSafe()) discard;
  if (windowDrop(vP)) discard;
  float a = uRing.w * (1.0 - smoothstep(0.35, 1.0, abs(vR.y))) * windowFade(vP);
  if (uProbe > 0.5) { gl_FragColor = vec4(a, a, a, a); return; }
  // the card's own colours, brighter: the ring is the one place the card glows
  vec3 col = texture2D(map, vec2(fract(vR.x + uRing.z), 0.5)).rgb;
  col = min(vec3(1.0), col * 1.45 + 0.1);
  gl_FragColor = vec4(col * a, a);
}`
);
function $s(a, t, e) {
  return new H({
    ...G,
    side: Bt,
    vertexShader: Gs,
    fragmentShader: Qs,
    uniforms: {
      uSafe: a.uSafe,
      uSide: a.uSide,
      uEye: a.uEye,
      uWin: a.uWin,
      uBehind: a.uBehind,
      uWell: t.uWell,
      map: { value: e },
      uRing: { value: new B(1, 0.012, 0, 0) },
      uProbe: { value: 0 }
    }
  });
}
function Ns(a) {
  const t = new Float32Array((a + 1) * 2 * 3), e = new Uint16Array(a * 6);
  for (let r = 0; r <= a; r++)
    t[r * 6] = r / a, t[r * 6 + 1] = -1, t[r * 6 + 2] = 0, t[r * 6 + 3] = r / a, t[r * 6 + 4] = 1, t[r * 6 + 5] = 0;
  for (let r = 0; r < a; r++) {
    const h = r * 2;
    e.set([h, h + 1, h + 2, h + 2, h + 1, h + 3], r * 6);
  }
  const i = new mt();
  return i.setAttribute("position", new W(t, 3)), i.setIndex(new W(e, 1)), i;
}
function Vs(a, t, e, i, r) {
  const h = new Uint8Array(r * 4), d = i[0] * 255, o = i[1] * 255, f = i[2] * 255, s = 0.5 * Math.min(t, e * 2);
  for (let n = 0; n < r; n++) {
    const v = n / r * Math.PI * 2, l = Math.cos(v), u = -Math.sin(v);
    let m = -1, p = d, c = o, x = f;
    for (let g = 2; g < s; g++) {
      const M = Math.round(t / 2 + l * g), y = Math.round(e / 2 + u * g);
      if (M < 0 || y < 0 || M >= t || y >= e) break;
      const w = (y * t + M) * 4, b = Math.abs(a[w] - d) + Math.abs(a[w + 1] - o) + Math.abs(a[w + 2] - f);
      b > m && (m = b, p = a[w], c = a[w + 1], x = a[w + 2]);
    }
    h[n * 4] = p, h[n * 4 + 1] = c, h[n * 4 + 2] = x, h[n * 4 + 3] = 255;
  }
  return h;
}
function js() {
  return { A: new A(), G: new A(), B1: new A(), B2: new A(), B3: new A(), B4: new A() };
}
function Ys(a, t, e) {
  const i = Et * e;
  a.A.set(0, 0, -i), a.G.copy(t).sub(a.A).multiplyScalar(i / Math.max(t.z + i, 1e-3)).add(a.A);
}
function ie(a, t, e) {
  if (t <= k) return e.copy(a.A).lerp(a.G, t / k);
  const i = Math.min(1, (t - k) / (1 - k)), r = 1 - i, h = r * r * r * r, d = 4 * r * r * r * i, o = 6 * r * r * i * i, f = 4 * r * i * i * i, s = i * i * i * i;
  return e.set(
    h * a.G.x + d * a.B1.x + o * a.B2.x + f * a.B3.x + s * a.B4.x,
    h * a.G.y + d * a.B1.y + o * a.B2.y + f * a.B3.y + s * a.B4.y,
    h * a.G.z + d * a.B1.z + o * a.B2.z + f * a.B3.z + s * a.B4.z
  );
}
const Xs = "Pulled to guest", Ks = 0.38, Zs = 0.27, ae = 8 * Math.PI / 180, re = 10 * Math.PI / 180, Z = 6, oe = 25 * Math.PI / 180, ne = 300, he = 0.04, Js = 0.6, ti = 0.07, ei = 0.3, le = 1.3, si = 3.2, ii = 5, ai = 150, ri = 11, oi = 13, ue = 2.6, ni = 0.018, St = 5, hi = 220, li = 200, ui = 140, ce = (a) => a < li ? Math.min(ui, Math.max(6, 0.9 * a)) : 0, fe = {
  high: { dpr: 2, tex: 2048, taps: 5, aniso: 8, mem: 64, seg: 1, ripples: !0 },
  mid: { dpr: 1.5, tex: 1536, taps: 1, aniso: 4, mem: 40, seg: 0.7, ripples: !0 },
  low: { dpr: 1, tex: 1024, taps: 0, aniso: 2, mem: 24, seg: 0.5, ripples: !1 },
  test: { dpr: 1, tex: 2048, taps: 5, aniso: 8, mem: 64, seg: 1, ripples: !0 }
};
async function ci(a, t) {
  const e = new fi(a, t);
  try {
    await e.init();
  } catch (i) {
    throw e.dispose(), i;
  }
  return e.handle();
}
class fi {
  constructor(t, e) {
    this.canvas = t, this.opts = e, this.role = e.role, this.tier = fe[e.quality] ?? fe.mid, this.reduced = !!e.reduced, this.m = e.layers, this.P = Pe(this.m), this.cardH = this.m.card.h / this.m.card.w, this.tl = this.role === "host" ? "idle" : "explode", this.t0 = this.role === "host" ? performance.now() : 1 / 0;
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
  scene = new Ie();
  camera = new We();
  /** card space */
  frame = new It();
  /** guest: the landing, face-on in the screen (the level's layers live here) */
  land = new It();
  shared = Ye();
  ws = Is();
  lq = Xe();
  /** guest: its flat sheets are in the screen, not on the card, so the glass does not cut them */
  noGlass = { value: 2 };
  sheets = [];
  flying = [];
  labels = [];
  /** seconds since the previous frame, for the label history */
  chromeDt = 0;
  labelsHeld = !1;
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
  scratch = null;
  over = null;
  geos = [];
  usesFont = !1;
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
  // frames (guest)
  aPos = new A();
  aQuat = new K();
  vPos = new A(0, 0, -6);
  vQuat = new K();
  sPos = new A();
  sScaleY = 1;
  fPos = new A();
  fQuat = new K();
  fScl = new A(1, 1, 1);
  bgA = 0;
  // the well
  /** strength, swirl; the ring's radius (share of full) and opacity */
  wellA = 0;
  wellSw = 0;
  ringR = 0;
  ringA = 0;
  ring = null;
  ringMat = null;
  polar = null;
  /** host: the rim of light across each ribbon where the glass cuts it (no viewer) */
  cuts = null;
  cutMesh = null;
  /** the eye this frame is drawn for (card space); host: the viewer last given, and the blend between tilt eye (0) and viewer (1) */
  eye = new A(0, 0, Z);
  viewer = new A(0, 0, Z);
  hasViewer = !1;
  w = 0;
  wFrom = 0;
  wTo = 0;
  wT0 = -1e9;
  /** host: this frame is drawn through the eye (depart, rebuild) rather than flat */
  persp = !1;
  /** guest alone: the card of the virtual phone (a sheet in the card background) and the hairline around it; their opacity */
  backing = null;
  backMat = null;
  backTex = null;
  rim = null;
  phoneA = 0;
  // the level (guest)
  liquid = null;
  liquidMat = null;
  meniscus = null;
  meniscusMat = null;
  /** the level as a share of the canvas height, the wobble's amplitude in CSS px, the meniscus' opacity; the event's clock */
  lv = 0;
  amp = 0;
  lineA = 0;
  te = 0;
  /** guest: nothing is drawn before the first play */
  started = !1;
  /** test: probe colours, and what alone is drawn */
  probe = !1;
  only = null;
  euler = new _e();
  u = 1;
  // scratch
  v = new A();
  v2 = new A();
  v3 = new A();
  q = new K();
  qi = new K();
  mat = new yt();
  box = [0, 0, 0, 0];
  sh3 = [0, 0, 0];
  /** Guest: the layers in the order they queue under the surface (highest on the card first); built on first use. */
  floatOrder = [];
  onLost = (t) => {
    t.preventDefault(), cancelAnimationFrame(this.raf), this.raf = 0, this.opts.onLost?.("WebGL context lost");
  };
  loop = (t) => {
    this.disposed || (this.raf = requestAnimationFrame(this.loop), this.tick(t));
  };
  // ---------------------------------------------------------------- setup
  async init() {
    const e = this.role === "host";
    this.renderer = new Ue({
      canvas: this.canvas,
      alpha: !0,
      antialias: !0,
      premultipliedAlpha: !0,
      depth: !1,
      stencil: !1,
      preserveDrawingBuffer: !1,
      powerPreference: "high-performance"
    }), this.renderer.setPixelRatio(1), this.renderer.setClearColor(0, 0), this.canvas.addEventListener("webglcontextlost", this.onLost);
    const i = this.m.layers.map((p, c) => ({ spec: p, i: c })).sort((p, c) => p.spec.z - c.spec.z || p.i - c.i);
    this.usesFont = !0;
    const [r] = await Promise.all([
      Promise.all(i.map((p) => Ut(_t(this.opts.baseUrl, p.spec.src)))),
      Ne()
    ]);
    if (this.disposed) return;
    let h = 0;
    for (const p of i) p.spec.role !== "qr" && (h = Math.max(h, p.spec.z));
    const d = us(), o = Nt(), f = Nt(!0);
    this.geos.push(d, o, f);
    const s = this.P.n, n = this.m.card, v = vi(n.background);
    let l = 0;
    const u = [];
    i.forEach((p, c) => {
      const x = p.spec.role === "qr", g = new Wt(), M = $t(this.shared, g, x, this.lq, e ? void 0 : this.noGlass), y = new I(d, M), w = e ? this.tier.taps : 0, b = w > 0 ? ns(this.shared, g, w) : null, R = b ? new I(o, b) : null, L = it(4), P = st(this.shared, !1), V = new I(L.geometry, P);
      this.geos.push(L.geometry), de(L, 1.25, 0.9);
      for (const z of L.attrs) z.needsUpdate = !0;
      const q = p.spec.rect, j = x ? -1 : s - 1 - l, F = {
        i: p.i,
        spec: p.spec,
        qr: x,
        j: x ? -1 : l,
        k: j,
        zn: h > 0 ? Math.min(1, p.spec.z / h) : 0,
        dupe: 0,
        chip: -1,
        pill: -1,
        img: r[c],
        tex: g,
        next: null,
        mixT0: 0,
        grid: x ? Dt(r[c], this.canvas) : null,
        bx: 0,
        by: 0,
        bw: 1,
        bh: 1,
        rx: 0,
        ry: 0,
        rw: 1,
        rh: 1,
        mesh: y,
        mat: M,
        shadow: R,
        smat: b,
        strip: null,
        stripMat: null,
        path: js(),
        slot: 0,
        label: null,
        wid: Math.min(ei, Math.max(ti, Js * Math.min(q.w, q.h) / n.w)),
        lx: 0,
        ly: -1,
        sx: 1,
        sy: 0,
        vert: !0,
        lines: V,
        lmat: P,
        lset: L,
        on: !0,
        op: 1,
        ox: 0,
        oy: 0,
        sc: 1,
        rot: 0,
        rev: 1,
        sub: 0,
        qT: 0,
        qLift: 0,
        fm: 0,
        shA: 0,
        shx: 0,
        shy: 0,
        shBlur: 0,
        stripOn: !1,
        stripOp: 1,
        tau: -1e3,
        host: 1,
        air: 0,
        lvl: 0,
        rs: 0,
        rsA: 0,
        tag: 0,
        cut: 0
      };
      if (!x) {
        const z = Math.max(q.w, q.h) / n.w, Te = Math.min(q.w, q.h) / n.w, qt = this.tier.seg, Ot = Math.round(Math.min(144, Math.max(40, z / 0.016)) * qt), Fe = Math.round(Math.min(36, Math.max(4, Te / 0.03)) * qt), zt = Hs(Ot, Math.max(2, Fe));
        this.geos.push(zt), F.stripMat = Ds(this.shared, this.ws, g), F.stripMat.uniforms.uBg.value.set(v[0], v[1], v[2]), F.stripMat.uniforms.uDu.value = 0.5 / Ot, F.stripMat.uniforms.uTwist.value.set(1, 0.1, 0.37 * j), F.strip = new I(zt, F.stripMat);
        const Be = (0.5 + j * 0.381966) % 1;
        F.slot = Math.max(-0.9, Math.min(0.9, Be * 2 - 1));
        for (const Ee of this.flying) {
          const et = Ee.spec.rect;
          Math.abs(q.x - et.x) < 1 && Math.abs(q.y - et.y) < 1 && Math.abs(q.w - et.w) < 1 && Math.abs(q.h - et.h) < 1 && F.dupe++;
        }
        F.chip = u.length, u.push({ text: p.spec.label ?? p.spec.name, kind: "chip" }), p.spec.dims && (F.pill = u.length, u.push({ text: p.spec.dims, kind: "pill" })), e || (F.label = fs(j % 2 === 0 ? 1 : -1), this.labels.push(F.label)), this.flying.push(F), l++;
      }
      const Le = e ? this.frame : this.land;
      for (const z of [y, R])
        z && (z.matrixAutoUpdate = !1, z.frustumCulled = !1, Le.add(z));
      for (const z of [F.strip, V])
        z && (z.matrixAutoUpdate = !1, z.frustumCulled = !1, this.frame.add(z));
      this.sheets.push(F);
    }), e && (this.tagEntry = u.length, u.push({ text: Xs, kind: "tag" })), this.atlasItems = u, this.bgMat = ls(this.shared), this.bgMat.uniforms.uColor.value.set(v[0], v[1], v[2]), this.bg = new I(f, this.bgMat), this.bg.frustumCulled = !1, this.bg.renderOrder = 0, this.scene.add(this.bg), this.frame.matrixAutoUpdate = !1, this.land.matrixAutoUpdate = !1, this.scene.add(this.frame, this.land), this.polar = this.buildPolar(v);
    const m = Ns(96);
    if (this.geos.push(m), this.ringMat = $s(this.shared, this.ws, this.polar), this.ring = new I(m, this.ringMat), this.ring.matrixAutoUpdate = !1, this.ring.frustumCulled = !1, this.ring.renderOrder = 150, this.frame.add(this.ring), e)
      this.cuts = it(Math.max(1, s)), this.geos.push(this.cuts.geometry), this.cutMesh = new I(this.cuts.geometry, st(this.shared, !1)), this.cutMesh.matrixAutoUpdate = !1, this.cutMesh.frustumCulled = !1, this.cutMesh.renderOrder = 160, this.frame.add(this.cutMesh);
    else {
      const p = _(2, 2, this.canvas), c = D(p);
      c.fillStyle = n.background, c.fillRect(0, 0, 2, 2), this.backTex = new xt(p), this.backMat = $t(this.shared, this.backTex, !1, this.lq), this.backing = new I(o, this.backMat), this.backing.matrixAutoUpdate = !1, this.backing.frustumCulled = !1, this.backing.renderOrder = 1, this.backing.matrix.set(1, 0, 0, 0, 0, this.cardH, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1), this.backMat.uniforms.uLocal.value.copy(this.backing.matrix), this.backMat.uniforms.uBox.value.set(0, 0, 1, this.cardH), this.frame.add(this.backing);
      const x = it(4);
      this.geos.push(x.geometry), de(x, 1, 1, ve);
      for (const g of x.attrs) g.needsUpdate = !0;
      this.rim = new I(x.geometry, st(this.shared, !1)), this.rim.matrixAutoUpdate = !1, this.rim.frustumCulled = !1, this.rim.renderOrder = 2, this.rim.matrix.set(1, 0, 0, 0, 0, this.cardH, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1), this.rim.material.uniforms.uLocal.value.copy(this.rim.matrix), this.frame.add(this.rim), this.liquidMat = Vt(this.lq, this.shared.uPr, !1), this.liquidMat.uniforms.uColor.value.set(v[0], v[1], v[2]), this.liquid = new I(f, this.liquidMat), this.liquid.frustumCulled = !1, this.liquid.renderOrder = 800, this.meniscusMat = Vt(this.lq, this.shared.uPr, !0), this.meniscus = new I(f, this.meniscusMat), this.meniscus.frustumCulled = !1, this.meniscus.renderOrder = 890, this.scene.add(this.liquid, this.meniscus);
    }
    this.sprites = cs(Math.max(1, s * 2)), this.geos.push(this.sprites.geometry), this.atlasTex = new Wt(), this.spriteMat = hs(this.shared, this.atlasTex), this.spriteMesh = new I(this.sprites.geometry, this.spriteMat), this.spriteMesh.frustumCulled = !1, this.spriteMesh.renderOrder = e ? 500 : 901, this.scene.add(this.spriteMesh), e || (this.leaders = it(Math.max(1, s)), this.geos.push(this.leaders.geometry), this.leaderMesh = new I(this.leaders.geometry, st(this.shared, !0)), this.leaderMesh.frustumCulled = !1, this.leaderMesh.renderOrder = 900, this.scene.add(this.leaderMesh)), this.buildEvents(), this.measure(), typeof ResizeObserver < "u" && (this.ro = new ResizeObserver(() => {
      this.sizeDirty = !0, this.dirty = !0;
    }), this.ro.observe(this.canvas)), this.warmUp(), this.update(0), this.render(), this.raf = requestAnimationFrame(this.loop);
  }
  /** The ring's colours: 256 directions about the card's centre, read from a composite of the flying layers 96 px wide. */
  buildPolar(t) {
    const e = this.m.card, i = 96, r = Math.max(2, Math.round(96 * e.h / e.w)), h = i / e.w, d = _(i, r, this.canvas), o = D(d, !0);
    o.fillStyle = e.background, o.fillRect(0, 0, i, r), o.imageSmoothingEnabled = !0, o.imageSmoothingQuality = "high";
    for (const s of this.flying) o.drawImage(s.img, s.spec.rect.x * h, s.spec.rect.y * h, s.spec.rect.w * h, s.spec.rect.h * h);
    const f = new De(Vs(o.getImageData(0, 0, i, r).data, i, r, t, 256), 256, 1);
    return f.wrapS = He, f.minFilter = f.magFilter = wt, f.needsUpdate = !0, d.width = d.height = 1, f;
  }
  /**
   * Links every program and uploads every texture while mounting: one frame with everything visible,
   * clipped to a single pixel. Without it the first strip, outline or label would stall its frame.
   */
  warmUp() {
    const t = this.renderer;
    this.update(0), this.scene.traverse((e) => {
      e.visible = !0;
    }), this.sprites.geometry.instanceCount = 1, t.setScissor(0, 0, 1, 1), t.setScissorTest(!0), t.render(this.scene, this.camera), t.setScissorTest(!1);
  }
  buildEvents() {
    const t = this.P, e = this.events;
    for (const i of [...ee, ...se]) e[i] = [];
    for (const i of this.flying) {
      const r = (d) => ({ index: i.i, id: i.spec.id, phase: d }), h = t.start[i.k] + X + kt;
      e.depart.push({ t: h, e: r("leave") }), e.explode.push({ t: h, e: r("lift") }, { t: Math.min(C, t.start[i.k] + X + t.feed[i.k] + O), e: r("settle") }), e.assemble.push({ t: t.assembleLock[i.j], e: r("arrive") }), e.rebuild.push({ t: t.rebuildStart[i.j] + Lt, e: r("arrive") });
    }
    for (const i of this.sheets)
      i.qr && e.rebuild.push({ t: ct, e: { index: i.i, id: i.spec.id, phase: "arrive" } });
    for (const i in e) e[i].sort((r, h) => r.t - h.t);
  }
  /** Canvas metrics, the flat fit, the screen-resolution bake, the atlas and the static frames. */
  measure() {
    const t = this.canvas, e = this.m.card, i = this.role === "host";
    this.cw = Math.max(1, t.clientWidth || t.width), this.ch = Math.max(1, t.clientHeight || t.height);
    const r = !i && this.opts.assembleRect || { x: 0, y: 0, w: this.cw, h: this.ch }, h = Math.min(r.w / e.w, r.h / e.h), d = Math.max(e.w, e.h) * h, o = this.opts.quality === "test" ? 1 : self.devicePixelRatio || 1;
    let f = Math.min(o, this.tier.dpr, this.tier.tex / d);
    for (let l = 0; l < 8; l++) {
      this.bw = Math.max(1, Math.round(this.cw * f)), this.bh = Math.max(1, Math.round(this.ch * f)), this.sx = this.bw / this.cw, this.sy = this.bh / this.ch;
      const u = Math.min(r.w * this.sx / e.w, r.h * this.sy / e.h);
      this.fitW = e.w * u, this.fitH = e.h * u, this.fitX = r.x * this.sx + (r.w * this.sx - this.fitW) / 2, this.fitY = r.y * this.sy + (r.h * this.sy - this.fitH) / 2;
      let m = 0;
      for (const p of this.sheets) m += Math.ceil(p.spec.rect.w * u + 1) * Math.ceil(p.spec.rect.h * u + 1) * 4 * (4 / 3);
      if (m <= this.tier.mem * 1048576 * 0.9) break;
      f *= 0.85;
    }
    this.renderer.setSize(this.bw, this.bh, !1), this.shared.uRes.value.set(this.bw, this.bh), this.shared.uPr.value = this.sx, this.shared.uOrtho.value = i ? 1 : 0, this.texBytes = 256 * 4 + 16, this.scrX = Math.min(0, Math.floor(this.fitX)), this.scrY = Math.min(0, Math.floor(this.fitY)), this.scrW = Math.max(this.bw, Math.ceil(this.fitX + this.fitW)) - this.scrX, this.scrH = Math.max(this.bh, Math.ceil(this.fitY + this.fitH)) - this.scrY, this.scratch = _(this.bw, this.bh, this.canvas), this.over = this.scrW > this.bw || this.scrH > this.bh ? _(this.scrW, this.scrH, this.canvas) : null;
    for (const l of this.sheets) {
      const u = l.spec.rect;
      this.setTexture(l, l.img, !1), l.rx = (u.x + u.w / 2 - e.w / 2) / e.w, l.ry = (e.h / 2 - (u.y + u.h / 2)) / e.w, l.rw = u.w / e.w, l.rh = u.h / e.w, this.placeStrip(l);
    }
    this.scratch.width = this.scratch.height = 1, this.scratch = null, this.over && (this.over.width = this.over.height = 1), this.over = null;
    const s = Math.min(176, this.cw * 0.42);
    this.atlas = je(this.atlasItems, this.sx, s, this.canvas), this.labelsHeld = !1, this.atlasTex?.dispose();
    const n = new xt(this.atlas.canvas);
    n.flipY = !1, n.premultiplyAlpha = !0, n.generateMipmaps = !1, n.minFilter = n.magFilter = wt, this.atlasTex = n, this.spriteMat.uniforms.map.value = n, this.texBytes += this.atlas.bytes;
    for (const l of this.flying) {
      if (!l.label) continue;
      const u = this.atlas.entries;
      l.label.bw = Math.max(u[l.chip].w, l.pill >= 0 ? u[l.pill].w : 0), l.label.bh = lt + (l.pill >= 0 ? Ht + xe : 0);
    }
    const v = this.shared.uSafe.value;
    for (const l of v) l.set(0, 0, 0, 0);
    i && this.opts.safeRects && this.opts.safeRects.forEach((l, u) => {
      const m = Math.floor(l.x * this.sx), p = Math.ceil((l.x + l.w) * this.sx), c = this.bh - Math.ceil((l.y + l.h) * this.sy), x = this.bh - Math.floor(l.y * this.sy), g = v[Math.min(u, 3)];
      u < 4 ? g.set(m, c, p, x) : g.set(Math.min(g.x, m), Math.min(g.y, c), Math.max(g.z, p), Math.max(g.w, x));
    }), this.shared.uWin.value.set(0.5, this.cardH / 2), i ? this.hostFlat() : this.setCamera(), this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert(), this.sizeDirty = !1, this.dirty = !0;
  }
  /**
   * The strip's place on the card: the baked box, rows across its shorter side. The head is the end of
   * the longer side nearer the sink (the card's centre); a centred layer leads with its top or right end.
   */
  placeStrip(t) {
    if (!t.stripMat) return;
    const e = t.stripMat.uniforms;
    t.vert = t.bh >= t.bw, t.vert ? (t.lx = 0, t.ly = t.by <= 0 ? -1 : 1, t.sx = 1, t.sy = 0) : (t.lx = t.bx <= 0 ? -1 : 1, t.ly = 0, t.sx = 0, t.sy = 1), e.uBox.value.set(t.bx, t.by, t.bw, t.bh), e.uLong.value.set(t.lx, t.ly), e.uShort.value.set(t.sx, t.sy), e.uLen.value.set(t.vert ? t.bh : t.bw, t.vert ? t.bw : t.bh), e.uHand.value = -t.ly * t.sx + t.lx * t.sy >= 0 ? 1 : -1, e.uWidth.value = t.wid, e.uFeed.value = this.P.feed[t.k];
  }
  /** Host, flat (idle, connect, the last frames of rebuild): orthographic, the frame maps card units to device pixels. */
  hostFlat() {
    const t = this.fitX + this.fitW / 2, e = this.fitY + this.fitH / 2;
    this.camera.projectionMatrix.makeOrthographic(0, this.bw, this.bh, 0, -1e4, 1e4), this.frame.matrix.set(
      this.fitW,
      0,
      0,
      t,
      0,
      this.fitW,
      0,
      this.bh - e,
      0,
      0,
      this.fitW,
      0,
      0,
      0,
      0,
      1
    ), this.frame.matrixWorldNeedsUpdate = !0;
  }
  /**
   * Host, through the eye: an asymmetric frustum from the eye through the card's rect on the canvas
   * (the window), so the screen shows what a real well behind it would show that eye. The frame
   * becomes card space seen from the eye.
   */
  hostWindow() {
    const t = this.eye, e = this.cardH, i = t.z * 0.25, r = i / t.z, h = this.camera.projectionMatrix.makePerspective((-0.5 - t.x) * r, (0.5 - t.x) * r, (e / 2 - t.y) * r, (-e / 2 - t.y) * r, i, t.z + 4), d = this.fitW / this.bw, o = this.fitH / this.bh, f = (this.fitX + this.fitW / 2) / this.bw * 2 - 1, s = 1 - (this.fitY + this.fitH / 2) / this.bh * 2, n = h.elements;
    for (let v = 0; v < 4; v++)
      n[v * 4] = d * n[v * 4] + f * n[v * 4 + 3], n[v * 4 + 1] = o * n[v * 4 + 1] + s * n[v * 4 + 3];
    this.frame.matrix.makeTranslation(-t.x, -t.y, -t.z), this.frame.matrixWorldNeedsUpdate = !0;
  }
  /**
   * The host's eye: the viewer's position, or a virtual eye EYE_DIST in front of the centre swung by
   * tilt (frontal with `reduced`). A switch between the two is blended over VIEWER_BLEND of wall clock.
   */
  hostEye(t) {
    const e = !this.paused && t - this.wT0 < ne, i = this.w = e ? Y(this.wFrom, this.wTo, J((t - this.wT0) / ne)) : this.wTo;
    e && (this.dirty = !0);
    let r = this.reduced ? 0 : this.tiltX, h = this.reduced ? 0 : this.tiltY;
    const d = Math.hypot(r, h);
    d > 1 && (r /= d, h /= d);
    const o = oe * r, f = oe * h;
    this.eye.set(-Z * Math.sin(o) * Math.cos(f), Z * Math.sin(f), Z * Math.cos(o) * Math.cos(f)).lerp(this.viewer, i), this.eye.z < 1 && (this.eye.z = 1);
  }
  setTexture(t, e, i) {
    const r = this.m.card, h = t.spec.rect, d = this.fitW / r.w, o = this.scratch ?? _(this.bw, this.bh, this.canvas), f = this.over ?? (this.scrW > this.bw || this.scrH > this.bh ? _(this.scrW, this.scrH, this.canvas) : null), s = Qe(e, this.fitX + h.x * d, this.fitY + h.y * d, h.w * d, h.h * d, o, this.canvas, f, this.scrX, this.scrY), n = new xt(s.canvas);
    n.premultiplyAlpha = !0, n.generateMipmaps = !0, n.minFilter = Ge, n.magFilter = wt, n.anisotropy = Math.min(this.tier.aniso, this.renderer.capabilities.getMaxAnisotropy()), this.texBytes += s.w * s.h * 4 * (4 / 3);
    const v = t.mat.uniforms;
    if (i) {
      t.next?.dispose(), t.next = n, v.mapB.value = n;
      return;
    }
    t.tex.dispose(), t.tex = n, v.map.value = n, v.mapB.value = n, v.uMix.value = 0, t.smat && (t.smat.uniforms.map.value = n), t.stripMat && (t.stripMat.uniforms.map.value = n);
    const l = this.fitX + this.fitW / 2, u = this.fitY + this.fitH / 2;
    t.bx = (s.x0 + s.w / 2 - l) / this.fitW, t.by = (u - (s.y0 + s.h / 2)) / this.fitW, t.bw = s.w / this.fitW, t.bh = s.h / this.fitW, v.uTile.value.set(s.tu, s.tv, s.tw, s.th), t.grid && v.uQr.value.set(t.grid.ox, t.grid.oy, t.grid.nx, t.grid.ny);
  }
  // ---------------------------------------------------------------- guest frames
  setCamera() {
    const i = 0.05 * Math.tan(this.fov * Math.PI / 360), r = i * (this.aspect > 0 ? this.aspect : this.bw / this.bh);
    this.camera.projectionMatrix.makePerspective(-r, r, i, -i, 0.05, 200), this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert(), this.solveVirtual(), this.dirty = !0;
  }
  /**
   * Face-on frame in which the card plane has `zoom` times the size of the flat fit and its centre
   * sits at (cx, cy) device px. zoom 1 at the centre of the fit is the landing itself.
   */
  screenFrame(t, e, i) {
    const r = this.camera.projectionMatrix.elements, h = r[0], d = r[5], o = h * this.bw / (2 * this.fitW * t), f = e / this.bw * 2 - 1, s = 1 - i / this.bh * 2;
    this.sPos.set(f * o / h, s * o / d, -o), this.sScaleY = h * this.bw / (d * this.bh);
  }
  /** Projects a card-space point through `pos`/`quat` to CSS px; result in this.v (x, y; z > 0 when it is behind the camera). */
  project(t, e, i, r, h) {
    const d = this.v.set(t, e, i).applyQuaternion(h).add(r), o = d.z > -1e-3;
    return d.applyMatrix4(this.camera.projectionMatrix), d.x = (d.x * 0.5 + 0.5) * this.cw, d.y = (0.5 - d.y * 0.5) * this.ch, d.z = o ? 1 : -1, d;
  }
  /** The unanchored pose: the virtual host phone VIRTUAL_SHARE of the canvas tall, its centre VIRTUAL_TOP from the top. */
  solveVirtual() {
    if (this.role !== "guest") return;
    const t = this.camera.projectionMatrix.elements[5], e = this.cardH * t / (2 * Ks);
    this.vPos.set(0, (1 - 2 * Zs) * e / t, -e), this.vQuat.setFromEuler(this.euler.set(ae, this.reduced ? 0 : -re, 0, "XYZ")), this.everPose || (this.aPos.copy(this.vPos), this.aQuat.copy(this.vQuat));
  }
  // ---------------------------------------------------------------- per-frame state
  reset(t) {
    t.on = !0, t.op = 1, t.ox = 0, t.oy = 0, t.sc = 1, t.rot = 0, t.rev = 1, t.sub = 0, t.qT = 0, t.qLift = 0, t.shA = 0, t.shx = 0, t.shy = 0, t.shBlur = 0, t.stripOn = !1, t.stripOp = 1, t.tau = -1e3, t.host = 1, t.air = 0, t.lvl = 0, t.rs = 0, t.rsA = 0, t.tag = 0, t.cut = 0;
  }
  update(t) {
    this.role === "host" ? this.updateHost(this.tl, this.t, t) : this.updateGuest(this.tl, this.t, t), this.apply();
  }
  /** Where a flying layer's rows are for its clock `tau`: shares on the host, in the air, in the level. */
  place(t, e) {
    if (t.tau = e, this.reduced) {
      t.host = e < rt ? 1 : 0, t.lvl = e >= O ? 1 : 0, t.air = 1 - t.host - t.lvl;
      return;
    }
    Rs(e, this.P.feed[t.k], this.sh3), t.host = this.sh3[0], t.air = this.sh3[1], t.lvl = this.sh3[2];
  }
  updateHost(t, e, i) {
    const r = this.P, h = this.reduced, d = this.sx / this.fitW, o = this.shared, f = this.persp = t === "depart" || t === "rebuild" && e < Tt;
    f ? (this.hostEye(i), this.hostWindow(), o.uEye.value.copy(this.eye)) : this.hostFlat(), o.uOrtho.value = f ? 0 : 1, o.uSide.value = f ? -1 : 2, o.uBehind.value = 1, this.te = e;
    const s = this.wellA = t === "depart" ? Yt(e, h) : f ? Mt(e, h) : 0;
    this.wellSw = t === "depart" ? Xt(e, s, h) : h ? 0 : 0.6 * s, this.ringR = t === "depart" ? Kt(e) : f ? Mt(e) : 0, this.ringA = t === "depart" ? Zt(e) : f ? Mt(e) : 0;
    let n = t === "idle" || t === "connect" ? 1 : t === "depart" ? 1 - S(0, 0.3, e) : S(Tt, ct, e);
    h && (n = 0);
    let v = this.tiltX, l = this.tiltY;
    const u = Math.hypot(v, l);
    u > 1 && (v /= u, l /= u);
    let m = v * 10 * n, p = l * 10 * n;
    if (t === "idle" && !h) {
      const c = 1.5 * Math.sin(2 * Math.PI * e / xs) * (1 - S(0, 0.15, Math.min(1, u)));
      m += c * 0.8, p += c * 0.6;
    }
    this.bgA = 1;
    for (const c of this.sheets) {
      this.reset(c);
      const x = c.qr ? 0.4 * c.zn : c.zn;
      c.ox = m * x * d, c.oy = -p * x * d;
      const g = Math.hypot(m, p) * x / 10;
      if (c.shA = 0.35 * E(g * 1.5), c.shx = -c.ox * 0.6, c.shy = -c.oy * 0.6, c.shBlur = (0.6 + 2.2 * g) * d, c.qr) {
        t === "connect" ? (c.qT = E(e / ge), c.qLift = h ? 0 : 2.5) : t === "rebuild" ? (c.qT = 1 - E((e - te) / (ct - te)), c.qLift = h ? 0 : 2.5) : t === "depart" && (c.qT = 1), c.on = c.qT < 1, c.shA *= 1 - c.qT;
        continue;
      }
      if (!f) continue;
      c.on = !1;
      const M = r.feed[c.k];
      if (t === "depart")
        if (this.place(c, ft(r, c.k, e)), h) {
          const y = E(c.tau / rt);
          c.stripOn = y < 1, c.stripOp = 1 - y, c.rs = y, c.rsA = y > 0 ? 1 : 0, c.tag = y;
        } else {
          const y = 1 - c.host;
          c.stripOn = c.host > 0, c.rs = y, c.rsA = y > 0 ? 1 : 0, c.tag = E((y - 0.5) / 0.5), c.cut = S(0, 0.12, y) * (1 - S(0.88, 1, y));
        }
      else if (h) {
        const y = S(0, 1, (e - r.rebuildStart[c.j]) / Lt);
        c.stripOn = y > 0, c.stripOp = y, c.rs = 1, c.rsA = c.tag = 1 - y;
      } else {
        this.place(c, ks(r, c.j, e)), c.stripOn = c.host > 0;
        const y = 1 - E((c.tau + X) / M);
        c.rs = 1, c.rsA = c.tag = 1 - S(0.1, 1, y), c.cut = S(0, 0.12, 1 - c.host) * (1 - S(0.88, 1, 1 - c.host));
      }
    }
  }
  /** A layer floating in the level: off its place by a drift and a bob (both scaled by `calm`), and held under the surface while its place is above it. */
  float(t, e, i, r, h) {
    const d = 1.7 * t.j + 0.9, o = i * (ri * Math.sin(2.1 * d) + ue * Math.sin(0.9 * e + d)), f = i * (oi * (0.35 + 0.65 * Math.abs(Math.sin(1.3 * d))) + ue * Math.cos(1.1 * e + 1.3 * d));
    t.rot = i * ni * (Math.sin(1.3 * d) + 0.4 * Math.sin(0.8 * e + d));
    let s = f * this.sy;
    if (h) {
      const n = this.fitY + (this.cardH / 2 - (t.by + t.bh / 2)) * this.fitW + s;
      n < r + t.fm && (s += r + t.fm - n);
    }
    t.ox = o * this.sx / this.fitW, t.oy = -s / this.fitW;
  }
  /**
   * How far under the surface each layer rides while its place is still above it (Sheet.fm). The floating layers queue
   * in the card's own vertical order, the highest on the card nearest the surface, and a small layer (a line of text)
   * keeps the next one clear of itself, so lines of text never float through each other on the way to their places.
   * A layer's room opens in the 0.35 s before its first row lands, and no layer is held deeper than the level can show
   * it. `hold` lets the queue go during `fly` (1 -> 0), so nothing is still held when `assemble` starts.
   */
  buoyancy(t, e) {
    const i = this.floatOrder, r = this.P;
    if (i.length === 0) {
      for (const l of this.sheets) l.qr || i.push(l);
      i.sort((l, u) => u.ry + u.rh / 2 - (l.ry + l.rh / 2) || l.j - u.j);
    }
    const h = this.fitW / this.sy, d = i.length;
    let o = 0;
    for (let l = 0; l < d - 1; l++) o += ce(i[l].rh * h);
    const f = Math.min(hi, 0.28 * this.ch) - St, s = o > f ? f / o : 1, n = this.ch * this.lv;
    let v = St;
    for (let l = 0; l < d; l++) {
      const u = i[l], m = u.rh * h;
      u.fm = Math.min(v * e, Math.max(St * e, n - m - 6)) * this.sy, v += s * ce(m) * S(O - 0.4, O - 0.05, ft(r, u.k, t));
    }
  }
  updateGuest(t, e, i) {
    const r = this.P, h = this.reduced, d = this.shared, o = !this.paused && i - this.uT0 < 350, f = this.u = o ? Y(this.uFrom, this.uTo, J((i - this.uT0) / 350)) : this.uTo;
    o && (this.dirty = !0);
    const s = h ? 0 : -re * Math.cos(t === "explode" ? 2 * Math.PI * e / r.dur.explode : 0);
    if (this.vQuat.setFromEuler(this.euler.set(ae, s, 0, "XYZ")), this.hasPose && this.mat.fromArray(this.pose).decompose(this.aPos, this.aQuat, this.v2), this.fPos.copy(this.aPos).lerp(this.vPos, f), this.fQuat.copy(this.aQuat).slerp(this.vQuat, f), this.frame.matrix.compose(this.fPos, this.fQuat, this.fScl), this.frame.matrixWorldNeedsUpdate = !0, this.qi.copy(this.fQuat).invert(), this.v2.copy(this.fPos).negate().applyQuaternion(this.qi), this.eye.set(this.v2.x, this.v2.y, Math.max(0.05, this.v2.z)), d.uEye.value.copy(this.eye), d.uSnap.value = 0, d.uOrtho.value = 0, d.uBehind.value = f, d.uSide.value = f > 0 ? 0 : 1, this.bgA = 0, this.phoneA = this.wellA = this.wellSw = this.ringR = this.ringA = this.lv = this.amp = this.lineA = 0, !this.started) {
      this.te = 0;
      for (const u of this.sheets)
        this.reset(u), u.on = !1;
      return;
    }
    const n = this.te = t === "explode" ? e : t === "fly" ? C + e : C + dt + e;
    t === "explode" ? (this.wellA = Yt(e, h), this.wellSw = Xt(e, this.wellA, h), this.ringR = Kt(e), this.ringA = Zt(e), this.phoneA = 1) : t === "fly" && (this.phoneA = 1 - E(e / 0.3));
    const v = t !== "assemble";
    this.lv = qs(r, t, e), this.amp = h || !v ? 0 : si * S(0, 0.03, this.lv), this.lineA = v ? 0.9 * S(0, 0.012, this.lv) * (1 - S(0.99, 1.03, this.lv)) : 0, v || (this.bgA = 1, e >= be && (d.uSnap.value = 1)), this.screenFrame(1, this.fitX + this.fitW / 2, this.fitY + this.fitH / 2), this.land.matrix.compose(this.sPos, this.q.identity(), this.v3.set(1, this.sScaleY, 1)), this.land.matrixWorldNeedsUpdate = !0;
    const l = this.bh * (1 - this.lv);
    v && !h && this.buoyancy(n, t === "fly" ? 1 - S(0.3, 0.75, e / dt) : 1);
    for (const u of this.sheets) {
      if (this.reset(u), u.qr) {
        u.on = !1;
        continue;
      }
      if (this.place(u, ft(r, u.k, n)), !v)
        this.float(u, n, h ? 0 : 1 - J(e / r.assembleLock[u.j]), l, !1);
      else if (h) {
        const m = E((u.tau - O) / rt);
        u.on = m > 0, u.op = m, u.sub = 1;
        const p = E(u.tau / rt);
        u.rs = p, u.rsA = p > 0 ? this.phoneA : 0;
      } else {
        u.on = u.lvl > 0, u.rev = u.lvl, u.sub = 1, this.float(u, n, 1, l, !0), u.stripOn = u.lvl < 1 && (f > 0 || u.tau > 0);
        const m = 1 - u.host;
        u.rs = m, u.rsA = m > 0 ? this.phoneA : 0;
      }
    }
  }
  // ---------------------------------------------------------------- state -> GPU
  /** Test: whether a kind of thing (or a layer, by id) is drawn. Always true outside tests. */
  vis(t, e) {
    const i = this.only;
    return i === null || i === t ? !0 : e !== void 0 && (i === e || i === t + ":" + e);
  }
  /** Camera space -> card space for the guest's frame (this.qi holds the inverse of its rotation). */
  toCard(t, e, i, r) {
    t.set(e, i, r).sub(this.fPos).applyQuaternion(this.qi);
  }
  /**
   * A layer's ribbon path. The stub (sink -> glass, towards the eye) is the same on both devices. The
   * air belongs to the guest: it keeps going towards the camera, arcs, and comes down into the bottom
   * edge of the guest's screen at the layer's slot; the last two control points hang from the camera,
   * so that end does not move when the pose does.
   */
  setPath(t) {
    const e = t.path, i = t.stripMat.uniforms;
    if (Ys(e, this.eye, this.wellA), this.role === "host") {
      const r = this.v.copy(this.eye).sub(e.A).normalize();
      e.B1.copy(e.G).addScaledVector(r, 0.5), e.B2.copy(e.G).addScaledVector(r, 1), e.B3.copy(e.G).addScaledVector(r, 1.5), e.B4.copy(e.G).addScaledVector(r, 2), i.uRef.value.set(t.sx, t.sy, 0);
    } else {
      const r = this.camera.projectionMatrix.elements, h = r[0], d = r[5], o = this.v.copy(e.G).applyQuaternion(this.fQuat).add(this.fPos), f = o.x, s = o.y, n = o.z, v = Math.hypot(f, s, n), l = le * 1.9, u = le;
      this.toCard(e.B1, f * 0.82, s * 0.82, n * 0.82), this.toCard(e.B2, f * 0.5 + t.slot * 0.28, s * 0.5 - 0.3 * 0.5 * v / d, n * 0.5), this.toCard(e.B3, t.slot * 0.42 * l / h, -0.28 * l / d, -l), this.toCard(e.B4, t.slot * 0.6 * u / h, -1.14 * u / d, -u), this.v.set(-i.uHand.value, 0, 0).applyQuaternion(this.qi), i.uRef.value.copy(this.v);
    }
    i.uB1.value.copy(e.B1), i.uB2.value.copy(e.B2), i.uB3.value.copy(e.B3), i.uB4.value.copy(e.B4);
  }
  apply() {
    const t = this.role === "host", e = this.sx / this.fitW, i = this.probe ? 1 : 0, r = t ? 1 : this.u;
    this.bg.visible = this.bgA > 0 && this.vis("bg"), this.bgMat.uniforms.uAlpha.value = this.bgA, this.ws.uWell.value.set(this.wellA, this.wellSw, t || this.u > 0 ? 0 : 1, 0);
    const h = this.ring, d = this.ringMat.uniforms;
    if (h.visible = this.ringA > 0 && this.ringR > 0 && (t ? this.persp : r > 0) && this.vis("ring"), d.uRing.value.set(this.ringR, 0.014, this.reduced ? 0 : 0.03 * this.te, this.ringA * (t ? 1 : this.phoneA)), d.uProbe.value = i, this.backing && (this.backing.visible = r > 0 && this.phoneA > 0 && this.vis("phone"), this.backMat.uniforms.uOpacity.value = this.phoneA, this.rim.visible = this.backing.visible, this.rim.material.uniforms.uAlpha.value.x = 0.6 * this.phoneA), this.liquid) {
      const s = this.started && this.tl !== "assemble" && this.lv > 0;
      this.lq.uLq.value.set(s ? this.lv * this.bh : 1e9, this.amp * this.sy, this.te, 2 * Math.PI / (ai * this.sx)), this.liquid.visible = s && this.vis("level"), this.liquidMat.uniforms.uProbe.value = i, this.meniscus.visible = s && this.lineA > 0 && this.vis("level") && !this.probe, this.meniscusMat.uniforms.uLine.value = this.lineA;
      const n = this.lq.uLqR.value;
      let v = 0;
      if (s && this.amp > 0 && this.tier.ripples)
        for (const l of this.flying) {
          if (v >= vt) break;
          const u = (l.tau - O + 0.2) / (this.P.feed[l.k] + 0.4);
          u <= 0 || u >= 1 || n[v++].set((0.5 + 0.275 * l.slot) * this.bw, ii * this.sy * Math.sin(Math.PI * u), 9 * this.te, (16 + 90 * l.wid) * this.sx);
        }
      for (; v < vt; v++) n[v].set(0, 0, 0, 1);
    }
    let o = 0, f = 0;
    for (const s of this.sheets) {
      const n = 10 + o * 10, v = s.bw, l = s.bh, u = s.bx + s.ox, m = s.by + s.oy, p = s.mesh, c = s.mat.uniforms;
      if (p.visible = s.on && s.op > 0 && this.vis(t ? "sheets" : "level", s.spec.id), p.visible) {
        if (s.rot !== 0) {
          const w = Math.cos(s.rot), b = Math.sin(s.rot);
          p.matrix.set(v * w, -l * b, 0, u, v * b, l * w, 0, m, 0, 0, 1e-5, 0, 0, 0, 0, 1);
        } else
          p.matrix.set(v, 0, 0, u, 0, l, 0, m, 0, 0, 1e-5, 0, 0, 0, 0, 1);
        if (p.renderOrder = t ? n + 1 : 810 + o, c.uLocal.value.copy(p.matrix), c.uBox.value.set(u, m, v, l), c.uOpacity.value = s.op, c.uZoom.value = 1 / s.sc, c.uSub.value = s.sub, c.uRev.value.set(s.vert ? 1 : 0, (s.vert ? s.ly : s.lx) < 0 ? 1 : 0, s.rev), c.uProbe.value = t || s.qr ? 0 : i, s.qr && c.uQrT.value.set(s.qT, -0.8 * s.qLift * e / s.rw, -s.qLift * e / s.rh), s.next) {
          const w = E((performance.now() - s.mixT0) / 150);
          c.uMix.value = w, this.dirty = !0, w >= 1 && this.finishSwap(s);
        }
      }
      const x = s.shadow, g = s.smat?.uniforms;
      if (x && g && (x.visible = (s.on || s.stripOn) && s.shA > 4e-3 && this.vis("sheets", s.spec.id), x.visible)) {
        const w = s.shBlur * 2 + 2e-3, b = v + 2 * w, R = l + 2 * w, L = u + s.shx, P = m + s.shy;
        x.matrix.set(b, 0, 0, L, 0, R, 0, P, 0, 0, 1, 0, 0, 0, 0, 1), g.uLocal.value.copy(x.matrix), g.uBox.value.set(L, P, b, R), g.uGrow.value.set(b / v, R / l), g.uRad.value.set(s.shBlur / v, s.shBlur / l), g.uLod.value = Math.log2(Math.max(1, s.shBlur * this.fitW * 0.9)), g.uAlpha.value = s.shA * (s.on ? s.op : s.stripOp), g.uSlab.value = 0, g.uClip.value.set(-1e3, -1e3, 1e3, 1e3), x.renderOrder = n;
      }
      const M = s.strip, y = s.stripMat?.uniforms;
      if (M && y) {
        M.visible = s.stripOn && s.stripOp > 0 && this.vis("strips", s.spec.id), M.visible && (this.setPath(s), y.uClock.value = this.reduced ? -1e3 : s.tau, y.uOpacity.value = s.stripOp, t && y.uOff.value.set(s.ox, s.oy), y.uProbe.value = i, M.renderOrder = n + 1);
        const w = s.lines, b = s.lmat.uniforms;
        if (w.visible = s.rsA > 0 && (t ? this.persp : r > 0) && this.vis("outlines"), w.visible) {
          const R = (1 + 8 * s.dupe) * e;
          w.matrix.set(s.rw - R, 0, 0, s.rx, 0, s.rh - R, 0, s.ry, 0, 0, 1, 0, 0, 0, 0, 1), b.uLocal.value.copy(w.matrix), b.uDash.value = 6 * this.sx, b.uProg.value.set(s.rs, 0, 0, 0), b.uAlpha.value.set(s.rsA, 0, 0, 0), w.renderOrder = 140;
        }
        if (this.cuts && s.cut > 0 && this.w < 1 && M.visible) {
          const R = s.path, L = this.v.copy(this.eye).sub(R.A).normalize(), P = s.sx * L.x + s.sy * L.y, V = s.sx - L.x * P, q = s.sy - L.y * P, j = Math.hypot(V, q, L.z * P) || 1, F = (0.5 * Y(Ft, s.wid, S(0, 0.28, k)) + 3 * e) / j;
          $(this.cuts, f++, R.G.x - V * F, R.G.y - q * F, -1e-4, R.G.x + V * F, R.G.y + q * F, -1e-4, 1.5, 0, 0, 1, ve, s.cut * (1 - this.w));
        }
      } else
        s.lines.visible = !1;
      o++;
    }
    if (this.cuts && this.cutMesh && (this.cutMesh.visible = f > 0 && this.vis("cuts"), this.cuts.geometry.instanceCount = f, f > 0))
      for (const s of this.cuts.attrs) s.needsUpdate = !0;
    t ? this.writeTags() : this.writeLabels();
  }
  sprite(t, e, i, r, h, d, o, f, s, n) {
    const v = e * 4;
    t.rect[v] = i, t.rect[v + 1] = r, t.rect[v + 2] = h, t.rect[v + 3] = d, t.uv[v] = o.u0, t.uv[v + 1] = o.v0, t.uv[v + 2] = o.u1, t.uv[v + 3] = o.v1, t.fx[v] = f, t.fx[v + 1] = s, t.fx[v + 2] = n, t.fx[v + 3] = 0;
  }
  finishSprites(t) {
    if (this.spriteMesh.visible = t > 0, this.sprites.geometry.instanceCount = t, t > 0) for (const e of this.sprites.attrs) e.needsUpdate = !0;
  }
  /** Host: where a layer's tag sits (device px, y down): inside the outline's top-left corner, or above a low outline. */
  tagRect(t, e) {
    const i = this.atlas.entries[this.tagEntry], r = this.fitX + (t.rx - t.rw / 2 + 0.5) * this.fitW, h = this.fitY + (this.cardH / 2 - t.ry - t.rh / 2) * this.fitW, d = t.rh * this.fitW >= (ut + 10) * this.sy;
    return e[0] = r + (6 + 4 * t.dupe) * this.sx, e[1] = d ? h + (5 + (ut + 4) * t.dupe) * this.sy : h - (ut + 3) * this.sy, e[2] = i.w * this.sx, e[3] = i.h * this.sy, e;
  }
  /** Host: the tag at the top-left of every outline. */
  writeTags() {
    const t = this.sprites, e = this.atlas.entries[this.tagEntry], i = this.box;
    let r = 0;
    if (this.persp && this.vis("outlines"))
      for (const h of this.flying)
        h.tag <= 0 || (this.tagRect(h, i), this.sprite(t, r++, i[0], i[1], i[2], i[3], e, h.tag * 0.9, 1, 1));
    this.finishSprites(r);
  }
  /** Guest: each ribbon in the air carries its layer's block on a short leader; the blocks follow on a short history. */
  writeLabels() {
    const t = this.leaders, e = this.sprites, i = this.atlas.entries, r = this.ch * (1 - this.lv) - this.amp - 10;
    let h = !1;
    for (const s of this.flying) {
      const n = s.label;
      if (n.on = !1, !s.stripOn || this.tl === "assemble" || !s.strip.visible) continue;
      const v = this.P.feed[s.k], l = jt(s.tau / O), u = jt((s.tau - v) / O), m = S(0.55, 0.65, l) * (1 - S(0.86, 0.96, u));
      if (m <= 0) continue;
      let p = Y(0.6, 0.78, E((s.tau - 0.65 * O) / (v + 0.3 * O)));
      p = Math.min(0.94, Math.max(k + 0.01, Math.max(Math.min(p, l - 0.03), u + 0.03))), ie(s.path, p, this.v3);
      let c = this.project(this.v3.x, this.v3.y, this.v3.z, this.fPos, this.fQuat);
      for (let x = 0; x < 8 && c.y > r && p - 0.05 >= u + 0.03; x++)
        p -= 0.05, ie(s.path, p, this.v3), c = this.project(this.v3.x, this.v3.y, this.v3.z, this.fPos, this.fQuat);
      c.z > 0 || c.y > r || (n.on = !0, n.alpha = m, n.ax = c.x, n.ay = c.y, h = !0);
    }
    if (!h || !this.vis("labels")) {
      for (const s of this.labels) s.held = !1;
      this.finishSprites(0), this.leaderMesh.visible = !1, this.labelsHeld = !1;
      return;
    }
    const d = ps(this.labels, this.cw, this.ch, he * this.cw, he * this.ch, this.labelsHeld ? this.chromeDt : 0, this.reduced);
    this.labelsHeld = !0, d || (this.dirty = !0);
    let o = 0, f = 0;
    for (const s of this.flying) {
      const n = s.label;
      if (!n.on) {
        $(t, f++, 0, 0, 0, 0, 0, 0, 1, 3, 0, 1, Pt, 0);
        continue;
      }
      const v = i[s.chip], l = n.x >= n.lx;
      if ($(t, f++, n.lx, n.ly, 0, l ? n.x : n.x + n.bw, n.y + lt / 2, 0, 1, 3, 0, 1, Pt, n.alpha), this.sprite(e, o++, (l ? n.x : n.x + n.bw - v.w) * this.sx, n.y * this.sy, v.w * this.sx, v.h * this.sy, v, n.alpha, 1, 1), s.pill >= 0) {
        const u = i[s.pill];
        this.sprite(e, o++, (l ? n.x : n.x + n.bw - u.w) * this.sx, (n.y + lt + Ht) * this.sy, u.w * this.sx, u.h * this.sy, u, n.alpha, 1, 1);
      }
    }
    this.leaderMesh.visible = !0;
    for (const s of t.attrs) s.needsUpdate = !0;
    this.finishSprites(o);
  }
  // ---------------------------------------------------------------- loop
  tick(t) {
    if (this.paused) return;
    const e = this.P.dur[this.tl];
    let i = Math.max(0, (t - this.t0) / 1e3);
    i >= 0 || (i = 0);
    const r = this.tl === "idle";
    if (!r && i > e && (i = e), !(!(r ? !this.reduced : i !== this.t) && !this.dirty && !this.sizeDirty) && !(r && t - this.lastRender < 33 && !this.sizeDirty) && (this.t = i, this.chromeDt = Math.min(0.1, Math.max(0, (t - this.lastRender) / 1e3)), this.sizeDirty && this.measure(), this.emit(i), this.dirty = !1, this.update(t), this.render(), this.lastRender = t, !r && i >= e && !this.done)) {
      this.done = !0;
      const d = this.resolve;
      this.resolve = null, d?.(), this.opts.onDone?.({ timeline: this.tl });
    }
  }
  emit(t) {
    const e = this.events[this.tl];
    for (; this.evCursor < e.length && e[this.evCursor].t <= t; )
      e[this.evCursor].t > this.prevT && this.opts.onLayer?.(e[this.evCursor].e), this.evCursor++;
    this.prevT = t;
  }
  render() {
    this.renderer.render(this.scene, this.camera), this.frameCount++;
  }
  finishSwap(t) {
    if (!t.next) return;
    const e = t.mat.uniforms;
    t.tex.dispose(), t.tex = t.next, t.next = null, e.map.value = t.tex, e.mapB.value = t.tex, e.uMix.value = 0, t.smat && (t.smat.uniforms.map.value = t.tex), t.stripMat && (t.stripMat.uniforms.map.value = t.tex);
  }
  // ---------------------------------------------------------------- public handle
  handle() {
    return {
      play: (e, i) => this.play(e, i?.at),
      setTilt: (e, i) => {
        const r = Math.max(-1, Math.min(1, e || 0)), h = Math.max(-1, Math.min(1, i || 0));
        (r !== this.tiltX || h !== this.tiltY) && (this.tiltX = r, this.tiltY = h, this.dirty = !0);
      },
      setPose: (e) => {
        const i = this.hasPose;
        if (this.hasPose = !!e && e.length >= 16, e && this.hasPose) {
          for (let r = 0; r < 16; r++) this.pose[r] = e[r];
          this.everPose = !0;
        }
        i !== this.hasPose && (this.uFrom = this.u, this.uTo = this.hasPose ? 0 : 1, this.uT0 = performance.now()), this.dirty = !0;
      },
      setViewer: (e) => {
        if (this.role !== "host") return;
        const i = this.hasViewer;
        this.hasViewer = !!e && e.length >= 3 && isFinite(e[0]) && isFinite(e[1]) && e[2] > 0, e && this.hasViewer && this.viewer.set(e[0], e[1], e[2]), i !== this.hasViewer && (this.wFrom = this.w, this.wTo = this.hasViewer ? 1 : 0, this.wT0 = performance.now()), this.dirty = !0;
      },
      setProjection: (e, i) => {
        e > 1 && e < 179 && (this.fov = e, this.aspect = i > 0 ? i : 0, this.role === "guest" && this.setCamera());
      },
      replaceLayer: (e, i) => this.replaceLayer(e, i),
      where: () => ({ role: this.role, timeline: this.tl, t: this.t }),
      dispose: () => this.dispose()
    };
  }
  play(t, e) {
    if (!(this.role === "host" ? ee : se).includes(t)) return Promise.reject(new Error(`blackhole: timeline "${t}" does not belong to role "${this.role}"`));
    if (this.disposed) return Promise.reject(new Error("blackhole: disposed"));
    const r = this.resolve;
    return this.resolve = null, r?.(), this.tl = t, this.t0 = typeof e == "number" && isFinite(e) ? e : performance.now(), this.started = !0, this.t = 0, this.prevT = -1, this.evCursor = 0, this.done = !1, this.dirty = !0, t === "idle" ? new Promise(() => {
    }) : new Promise((h) => {
      this.resolve = h;
    });
  }
  async replaceLayer(t, e) {
    const i = this.sheets.find((h) => h.spec.id === t);
    if (!i) throw new Error(`blackhole: no layer "${t}"`);
    const r = await Ut(_t(this.opts.baseUrl, e));
    if (!this.disposed) {
      if (i.img = r, i.qr && (i.grid = Dt(r, this.canvas), i.mat.uniforms.uQr.value.set(i.grid.ox, i.grid.oy, i.grid.nx, i.grid.ny)), this.setTexture(i, r, !0), i.mixT0 = performance.now(), this.dirty = !0, this.paused) {
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
    for (const e of this.sheets)
      e.tex.dispose(), e.next?.dispose(), e.mat.dispose(), e.smat?.dispose(), e.lmat.dispose(), e.stripMat?.dispose();
    this.ringMat?.dispose(), this.polar?.dispose(), this.cutMesh?.material?.dispose(), this.backMat?.dispose(), this.backTex?.dispose(), this.rim?.material?.dispose(), this.liquidMat?.dispose(), this.meniscusMat?.dispose(), this.atlasTex?.dispose(), this.bgMat?.dispose(), this.spriteMat?.dispose(), this.leaderMesh?.material?.dispose();
    for (const e of this.geos) e.dispose();
    this.scene.clear(), this.sheets = [], this.flying = [], this.labels = [], this.renderer && (this.renderer.renderLists.dispose(), this.renderer.dispose()), this.usesFont && Ve(), this.usesFont = !1;
  }
}
const ve = [0.918, 0.949, 1];
function de(a, t, e, i = Pt) {
  $(a, 0, -0.5, 0.5, 0, 0.5, 0.5, 0, t, 0, 0, 0.25, i, e), $(a, 1, 0.5, 0.5, 0, 0.5, -0.5, 0, t, 0, 0.25, 0.5, i, e), $(a, 2, 0.5, -0.5, 0, -0.5, -0.5, 0, t, 0, 0.5, 0.75, i, e), $(a, 3, -0.5, -0.5, 0, -0.5, 0.5, 0, t, 0, 0.75, 1, i, e);
}
function vi(a) {
  const t = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(a.trim());
  if (!t) return [0, 0, 0];
  let e = t[1];
  e.length === 3 && (e = e[0] + e[0] + e[1] + e[1] + e[2] + e[2]);
  const i = parseInt(e, 16);
  return [(i >> 16 & 255) / 255, (i >> 8 & 255) / 255, (i & 255) / 255];
}
async function pi() {
  try {
    if (typeof FontFace > "u" || typeof requestAnimationFrame != "function") return !1;
    const t = (typeof OffscreenCanvas < "u" ? new OffscreenCanvas(1, 1) : document.createElement("canvas")).getContext("webgl2");
    return t ? (t.getExtension("WEBGL_lose_context")?.loseContext(), !0) : !1;
  } catch {
    return !1;
  }
}
function mi(a) {
  return { ...Pe(a).dur };
}
function yi(a, t) {
  return !t || t.role !== "host" && t.role !== "guest" ? Promise.reject(new Error("blackhole: opts.role must be host or guest")) : !t.layers || !Array.isArray(t.layers.layers) || t.layers.layers.length === 0 ? Promise.reject(new Error("blackhole: opts.layers is not a layer manifest")) : ci(a, t);
}
export {
  mi as durations,
  yi as mount,
  pi as supported
};
