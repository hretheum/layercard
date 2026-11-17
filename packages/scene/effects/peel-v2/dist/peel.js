import { Vector4 as D, Vector2 as It, BufferGeometry as ve, BufferAttribute as _, ShaderMaterial as ot, Vector3 as B, FrontSide as De, OneMinusSrcAlphaFactor as He, OneFactor as _e, AddEquation as Oe, CustomBlending as Qe, DoubleSide as Ue, InstancedBufferGeometry as de, InstancedBufferAttribute as W, DynamicDrawUsage as me, Scene as We, Camera as qe, Group as je, Quaternion as J, Matrix4 as Ge, WebGLRenderer as Ne, Texture as jt, Mesh as N, CanvasTexture as Gt, LinearFilter as Nt, LinearMipmapLinearFilter as Xe, Euler as Ye } from "three";
function O(s, t, e) {
  const r = Math.max(1, Math.round(s)), i = Math.max(1, Math.round(t));
  if (typeof OffscreenCanvas < "u") return new OffscreenCanvas(r, i);
  const h = e.ownerDocument.createElement("canvas");
  return h.width = r, h.height = i, h;
}
function Y(s, t = !1) {
  const e = s.getContext("2d", t ? { willReadFrequently: !0 } : void 0);
  if (!e) throw new Error("peel: 2D canvas context unavailable");
  return e;
}
function Xt(s, t) {
  const e = new URL(s.endsWith("/") ? s : s + "/", self.location.href);
  return new URL(t, e).href;
}
async function Yt(s) {
  const t = new Image();
  t.crossOrigin = "anonymous", t.decoding = "async", t.src = s;
  try {
    await t.decode();
  } catch {
    throw new Error(`peel: cannot load layer image ${s}`);
  }
  return t;
}
function Ve(s, t, e, r, i, h, n, o = null, f = 0, l = 0) {
  const v = Math.floor(t + 1e-4), a = Math.floor(e + 1e-4), c = Math.ceil(t + r - 1e-4), p = Math.ceil(e + i - 1e-4), d = Math.max(1, c - v), m = Math.max(1, p - a), b = h.width, y = h.height, w = O(d, m, n), M = Y(w, !0);
  M.imageSmoothingEnabled = !1, M.globalCompositeOperation = "copy";
  const u = v >= 0 && a >= 0 && c <= b && p <= y;
  if (!u && o) {
    const P = Y(o, !0);
    P.setTransform(1, 0, 0, 1, 0, 0), P.globalCompositeOperation = "source-over", P.imageSmoothingEnabled = !0, P.imageSmoothingQuality = "high", P.clearRect(v - f - 1, a - l - 1, d + 2, m + 2), P.drawImage(s, t - f, e - l, r, i), M.drawImage(o, v - f, a - l, d, m, 0, 0, d, m), P.clearRect(v - f - 1, a - l - 1, d + 2, m + 2);
  }
  const x = Math.max(0, v), A = Math.max(0, a), S = Math.min(b, c), g = Math.min(y, p);
  if (S > x && g > A) {
    const P = Y(h, !0);
    P.setTransform(1, 0, 0, 1, 0, 0), P.globalCompositeOperation = "source-over", P.clearRect(x - 1, A - 1, S - x + 2, g - A + 2), P.imageSmoothingEnabled = !0, P.imageSmoothingQuality = "high", P.drawImage(s, t, e, r, i), u || (M.globalCompositeOperation = "source-over", M.clearRect(x - v, A - a, S - x, g - A)), M.drawImage(h, x, A, S - x, g - A, x - v, A - a, S - x, g - A), P.clearRect(x - 1, A - 1, S - x + 2, g - A + 2);
  }
  return { canvas: w, x0: v, y0: a, w: d, h: m, tu: (t - v) / d, tv: 1 - (e - a + i) / m, tw: r / d, th: i / m };
}
function Vt(s, t) {
  const e = { ox: 0, oy: 0, nx: 25, ny: 25 };
  try {
    const r = Math.min(512, s.naturalWidth || 256), i = Math.min(512, s.naturalHeight || 256), h = O(r, i, t), n = Y(h, !0);
    n.imageSmoothingEnabled = !1, n.drawImage(s, 0, 0, r, i);
    const o = n.getImageData(0, 0, r, i).data;
    let f = 255, l = 0;
    const v = new Uint8Array(r * i);
    for (let u = 0; u < r * i; u++) {
      const x = o[u * 4 + 3] / 255, A = Math.round((0.299 * o[u * 4] + 0.587 * o[u * 4 + 1] + 0.114 * o[u * 4 + 2]) * x + 255 * (1 - x));
      v[u] = A, A < f && (f = A), A > l && (l = A);
    }
    if (l - f < 60) return e;
    const a = (f + l) / 2;
    let c = r, p = i, d = -1, m = -1;
    for (let u = 0; u < i; u++) for (let x = 0; x < r; x++)
      v[u * r + x] < a && (x < c && (c = x), x > d && (d = x), u < p && (p = u), u > m && (m = u));
    if (d < 0) return e;
    let b = 0;
    for (; c + b < r && v[p * r + c + b] < a; ) b++;
    const y = b / 7, w = Math.round((d - c + 1) / y);
    if (y < 1.5 || w < 21 || w > 177 || (w - 21) % 4 !== 0) return e;
    const M = (d - c + 1) / w;
    return { ox: c % M / r, oy: p % M / i, nx: r / M, ny: i / M };
  } catch {
    return e;
  }
}
const xe = "PeelMono", Ze = `${xe}, ui-monospace, Menlo, Consolas, monospace`;
let dt = null, mt = null, xt = 0;
function $e() {
  if (xt++, !mt) {
    const s = new FontFace(xe, `url(${new URL("./peel-mono.woff2", import.meta.url).href})`, { weight: "500", style: "normal" });
    dt = s, mt = s.load().then(
      () => {
        document.fonts.add(s);
      },
      () => {
      }
    );
  }
  return mt;
}
function Ke() {
  xt--, xt <= 0 && (dt && document.fonts.delete(dt), dt = null, mt = null, xt = 0);
}
const K = 20, ye = 18, Zt = 2, $t = 12, Kt = 11, yt = 14;
function Je(s, t, e, r) {
  const i = Y(O(4, 4, r)), h = (p) => `500 ${p * t}px ${Ze}`, n = [];
  let o = 2, f = 2;
  for (const p of s) {
    const d = p.kind === "tag" ? Kt : $t, m = p.kind === "tag" ? 0 : 6;
    i.font = h(d);
    let b = p.text;
    const y = (u) => i.measureText(u).width / t + 2 * m <= e;
    if (!y(b)) {
      for (; b.length > 1 && !y(b + "…"); ) b = b.slice(0, -1);
      b += "…";
    }
    const w = Math.ceil(i.measureText(b).width / t + 2 * m), M = p.kind === "chip" ? K : p.kind === "pill" ? ye : yt;
    n.push({ w, h: M, text: b }), o = Math.max(o, Math.ceil(w * t) + 4), f += Math.ceil(M * t) + 4;
  }
  const l = O(o, f, r), v = Y(l), a = [];
  let c = 2;
  return s.forEach((p, d) => {
    const m = n[d], b = Math.ceil(m.w * t), y = Math.ceil(m.h * t), w = p.kind === "tag" ? Kt : $t;
    v.font = h(w), v.textBaseline = "alphabetic";
    const M = v.measureText("H").actualBoundingBoxAscent || w * t * 0.72;
    if (p.kind !== "tag") {
      const u = 3 * t;
      v.fillStyle = p.kind === "chip" ? "#2F80FF" : "#FF4D3D", v.beginPath(), v.moveTo(2 + u, c), v.arcTo(2 + b, c, 2 + b, c + y, u), v.arcTo(2 + b, c + y, 2, c + y, u), v.arcTo(2, c + y, 2, c, u), v.arcTo(2, c, 2 + b, c, u), v.closePath(), v.fill();
    }
    v.fillStyle = p.kind === "tag" ? "#2F80FF" : "#FFFFFF", v.fillText(m.text, 2 + (p.kind === "tag" ? 0 : 6 * t), Math.round(c + (y + M) / 2)), a.push({ w: b / t, h: y / t, u0: 2 / o, v0: c / f, u1: (2 + b) / o, v1: (c + y) / f }), c += y + 4;
  }), { canvas: l, entries: a, bytes: o * f * 4 };
}
function ts() {
  return {
    uRes: { value: new It(1, 1) },
    uPr: { value: 1 },
    uSafe: { value: [new D(), new D(), new D(), new D()] },
    uOrtho: { value: 1 },
    uSnap: { value: 0 }
  };
}
const nt = (
  /* glsl */
  `
uniform vec4 uSafe[4];
bool peelSafe() {
  vec2 f = gl_FragCoord.xy;
  for (int i = 0; i < 4; i++) {
    vec4 r = uSafe[i];
    if (f.x >= r.x && f.x < r.z && f.y >= r.y && f.y < r.w) return true;
  }
  return false;
}`
), es = (
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
void main() {
  // uZoom < 1 magnifies the print about its centre inside a quad that keeps its size (host lift)
  vUv = (uv - 0.5) * uZoom + 0.5;
  vFace = aFace;
  vNo = normal;
  vCard = uBox.xy + position.xy * uBox.zw;
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
), ss = (
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
${nt}
vec4 layerTex(vec2 uv) {
  vec4 a = texture2D(map, uv);
  if (uMix > 0.0) a = mix(a, texture2D(mapB, uv), uMix);
  return a;
}
#ifdef PEEL_QR
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
  if (peelSafe()) discard;
  if (vFace > 1.5) {
    float lit = 0.5 + 0.5 * dot(normalize(vNo.xy), vec2(-0.64, 0.77));
    float a = uAcr * uOpacity * 0.9;
    gl_FragColor = vec4(RIM * (0.45 + 0.55 * lit) * a, a);
    return;
  }
#ifdef PEEL_QR
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
  gl_FragColor = c * uOpacity;
}`
), is = (
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
), rs = (
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
${nt}
float tap(vec2 uv) { return textureLod(map, clamp(uv, 0.0, 1.0), uLod).a; }
void main() {
  if (peelSafe()) discard;
  vec2 cuv = (vUv - 0.5) * uGrow + 0.5;
  vec2 r = max(uRad, vec2(1e-4));
  vec2 m = smoothstep(-r, r, cuv) * smoothstep(-r, r, 1.0 - cuv);
  float a = tap(cuv);
#if PEEL_TAPS > 1
  a = (a * 2.0 + tap(cuv + r * vec2(0.7, 0.3)) + tap(cuv + r * vec2(-0.3, 0.7))
     + tap(cuv + r * vec2(-0.7, -0.3)) + tap(cuv + r * vec2(0.3, -0.7))) / 6.0;
#endif
  float sh = max(a, uSlab) * m.x * m.y * uAlpha;
  vec2 c0 = smoothstep(uClip.xy - 0.003, uClip.xy + 0.003, vCard);
  vec2 c1 = 1.0 - smoothstep(uClip.zw - 0.003, uClip.zw + 0.003, vCard);
  sh *= c0.x * c0.y * c1.x * c1.y;
  gl_FragColor = vec4(SHADOW * sh, sh);
}`
), as = (
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
  vC = vec4(iC.rgb * iC.a, iC.a) * al;
  gl_Position = vec4(p / uRes * 2.0 - 1.0, 0.0, 1.0);
}`
), os = (
  /* glsl */
  `
uniform float uDash;
varying vec4 vC;
varying vec3 vL;
varying vec2 vS;
${nt}
void main() {
  if (peelSafe()) discard;
  if (vL.z <= 0.0) discard;
  float s = mix(vS.x, vS.y, clamp(vL.x / max(vL.y, 1e-3), 0.0, 1.0));
  if (s > vL.z) discard;
  if (uDash > 0.0 && mod(vL.x + uDash * 0.5, uDash * 2.0) >= uDash) discard;
  gl_FragColor = vC;
}`
), ns = (
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
), hs = (
  /* glsl */
  `
uniform sampler2D map;
varying vec2 vUv;
varying vec2 vQ;
varying vec4 vFx;
${nt}
void main() {
  if (peelSafe()) discard;
  float rv = vFx.z > 0.0 ? vQ.x : 1.0 - vQ.x;
  if (rv > vFx.y || vFx.x <= 0.0) discard;
  gl_FragColor = texture2D(map, vUv) * vFx.x;
}`
), cs = (
  /* glsl */
  `
void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`
), ls = (
  /* glsl */
  `
uniform vec3 uColor;
uniform float uAlpha;
${nt}
void main() {
  if (peelSafe()) discard;
  gl_FragColor = vec4(uColor * uAlpha, uAlpha);
}`
), ht = {
  transparent: !0,
  side: Ue,
  depthTest: !1,
  depthWrite: !1,
  blending: Qe,
  blendEquation: Oe,
  blendSrc: _e,
  blendDst: He
};
function us(s, t, e) {
  return new ot({
    ...ht,
    side: De,
    defines: e ? { PEEL_QR: 1 } : {},
    vertexShader: es,
    fragmentShader: ss,
    uniforms: {
      uRes: s.uRes,
      uPr: s.uPr,
      uSafe: s.uSafe,
      uOrtho: s.uOrtho,
      uSnap: s.uSnap,
      map: { value: t },
      mapB: { value: t },
      uMix: { value: 0 },
      uBox: { value: new D(0, 0, 1, 1) },
      uOpacity: { value: 1 },
      uAcr: { value: 0 },
      uSweep: { value: 0 },
      uSweepAmt: { value: 0 },
      uZoom: { value: 1 },
      uInner: { value: new B(0, 0, -1) },
      uQr: { value: new D(0, 0, 25, 25) },
      uQrT: { value: new B() },
      uTile: { value: new D(0, 0, 1, 1) }
    }
  });
}
function fs(s, t, e) {
  return new ot({
    ...ht,
    defines: { PEEL_TAPS: e },
    vertexShader: is,
    fragmentShader: rs,
    uniforms: {
      uSafe: s.uSafe,
      map: { value: t },
      uBox: { value: new D(0, 0, 1, 1) },
      uGrow: { value: new It(1, 1) },
      uRad: { value: new It(0.01, 0.01) },
      uLod: { value: 0 },
      uAlpha: { value: 0 },
      uSlab: { value: 0 },
      uClip: { value: new D(-1e3, -1e3, 1e3, 1e3) }
    }
  });
}
function Jt(s, t) {
  return new ot({
    ...ht,
    vertexShader: as,
    fragmentShader: os,
    uniforms: {
      uRes: s.uRes,
      uPr: s.uPr,
      uSafe: s.uSafe,
      uSnap: { value: 0 },
      uScreen: { value: t ? 1 : 0 },
      uProg: { value: new D(1, 1, 1, 1) },
      uAlpha: { value: new D(1, 1, 1, 1) },
      uDash: { value: 0 }
    }
  });
}
function ps(s, t) {
  return new ot({
    ...ht,
    vertexShader: ns,
    fragmentShader: hs,
    uniforms: { uRes: s.uRes, uSafe: s.uSafe, map: { value: t } }
  });
}
function vs(s) {
  return new ot({
    ...ht,
    vertexShader: cs,
    fragmentShader: ls,
    uniforms: { uSafe: s.uSafe, uColor: { value: new B() }, uAlpha: { value: 1 } }
  });
}
function ds() {
  const s = [], t = [], e = [], r = [], i = [], h = (l, v, a, c) => {
    const p = s.length / 3;
    for (let d = 0; d < 4; d++)
      s.push(...l[d]), t.push(...v), e.push(...a[d]), r.push(c);
    i.push(p, p + 1, p + 2, p, p + 2, p + 3);
  }, n = [[0, 0], [1, 0], [1, 1], [0, 1]], o = 0.5;
  h([[-o, -o, 0], [o, -o, 0], [o, o, 0], [-o, o, 0]], [0, 0, 1], n, 0), h([[-o, o, -1], [o, o, -1], [o, -o, -1], [-o, -o, -1]], [0, 0, -1], [[0, 1], [1, 1], [1, 0], [0, 0]], 1), h([[o, -o, -1], [o, o, -1], [o, o, 0], [o, -o, 0]], [1, 0, 0], n, 2), h([[-o, o, -1], [-o, -o, -1], [-o, -o, 0], [-o, o, 0]], [-1, 0, 0], n, 2), h([[o, o, -1], [-o, o, -1], [-o, o, 0], [o, o, 0]], [0, 1, 0], n, 2), h([[-o, -o, -1], [o, -o, -1], [o, -o, 0], [-o, -o, 0]], [0, -1, 0], n, 2);
  const f = new ve();
  return f.setAttribute("position", new _(new Float32Array(s), 3)), f.setAttribute("normal", new _(new Float32Array(t), 3)), f.setAttribute("uv", new _(new Float32Array(e), 2)), f.setAttribute("aFace", new _(new Float32Array(r), 1)), f.setIndex(i), f;
}
function te(s = !1) {
  const t = s ? 1 : 0.5, e = new ve();
  return e.setAttribute("position", new _(new Float32Array([-t, -t, 0, t, -t, 0, t, t, 0, -t, t, 0]), 3)), e.setAttribute("uv", new _(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2)), e.setIndex([0, 1, 2, 0, 2, 3]), e;
}
function ee(s) {
  const t = new de();
  t.setAttribute("position", new _(new Float32Array([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0]), 3)), t.setIndex([0, 1, 2, 0, 2, 3]);
  const e = new Float32Array(s * 3), r = new Float32Array(s * 3), i = new Float32Array(s * 4), h = new Float32Array(s * 4), n = [
    new W(e, 3),
    new W(r, 3),
    new W(i, 4),
    new W(h, 4)
  ];
  return ["iA", "iB", "iP", "iC"].forEach((o, f) => {
    n[f].setUsage(me), t.setAttribute(o, n[f]);
  }), t.instanceCount = s, { geometry: t, a: e, b: r, p: i, c: h, attrs: n };
}
function E(s, t, e, r, i, h, n, o, f, l, v, a, c, p = 1) {
  const d = t * 3, m = t * 4;
  s.a[d] = e, s.a[d + 1] = r, s.a[d + 2] = i, s.b[d] = h, s.b[d + 1] = n, s.b[d + 2] = o, s.p[m] = f, s.p[m + 1] = l, s.p[m + 2] = v, s.p[m + 3] = a, s.c[m] = c[0], s.c[m + 1] = c[1], s.c[m + 2] = c[2], s.c[m + 3] = p;
}
function ms(s) {
  const t = new de();
  t.setAttribute("position", new _(new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]), 3)), t.setIndex([0, 2, 1, 0, 3, 2]);
  const e = new Float32Array(s * 4), r = new Float32Array(s * 4), i = new Float32Array(s * 4), h = [new W(e, 4), new W(r, 4), new W(i, 4)];
  return ["iRect", "iUv", "iFx"].forEach((n, o) => {
    h[o].setUsage(me), t.setAttribute(n, h[o]);
  }), t.instanceCount = s, { geometry: t, rect: e, uv: r, fx: i, attrs: h };
}
const k = [47 / 255, 128 / 255, 1], ct = [1, 77 / 255, 61 / 255], we = 1.4, q = 14, qt = 8, Mt = 7, be = 2.5, ge = 4, xs = 64, se = 0.5, Ft = 0.05, lt = 2, Lt = 34;
function ys(s) {
  return {
    corner: s,
    side: s,
    bw: 0,
    bh: 0,
    tlx: 0,
    tly: 0,
    trx: 0,
    try_: 0,
    blx: 0,
    bly: 0,
    brx: 0,
    bry: 0,
    x: 0,
    y: 0,
    ix: 0,
    ex: 0,
    ey: 0,
    gy: 0,
    ax: 0,
    ay: 0,
    zone: -1,
    row: 0
  };
}
function ut(s, t, e, r, i, h) {
  return (e - s) * (h - t) - (r - t) * (i - s);
}
function ws(s, t, e, r, i, h, n, o) {
  const f = ut(i, h, n, o, s, t), l = ut(i, h, n, o, e, r), v = ut(s, t, e, r, i, h), a = ut(s, t, e, r, n, o);
  return (f > 0 && l < 0 || f < 0 && l > 0) && (v > 0 && a < 0 || v < 0 && a > 0);
}
function Me(s) {
  return Math.ceil(s / 2);
}
function bs(s, t) {
  return s > 0 ? (s - 1) * we * t + t + q : 0;
}
function Ae(s) {
  return 2 * qt + ge + 2 * be * Math.max(0, Math.ceil(s / 2) - 1);
}
const ie = (s, t, e) => s >= t ? Math.floor((s - t) / e + 1e-6) + 1 : 0, re = (s, t, e) => s > 0 ? (s - 1) * e + t : 0;
function wt(s, t, e, r, i = 0) {
  for (let h = i + 1; h < t; h++) {
    const n = s[h], o = r(e[n]);
    let f = h - 1;
    for (; f >= i && r(e[s[f]]) > o; )
      s[f + 1] = s[f], f--;
    s[f + 1] = n;
  }
}
let Se = 0, kt = 0, At = 0, St = 0, Bt = 0, j = 0, Pe = 0, Te = 0, X = 0, rt = 0, at = 0, Q = 0, U = 0, Dt = 0, Ht = 0, _t = 0, Ot = 0, Fe = Mt, Le = Mt;
const V = (s) => s.zone < 0 ? s.corner < 0 ? s.tlx : s.trx : s.corner < 0 ? s.blx : s.brx, Qt = (s) => -V(s), ae = (s) => s.tly - At - (St - s.bly) - 0.08 * (St - At);
function gs(s, t, e, r, i, h, n, o, f, l) {
  let v = 0, a = 0;
  for (let m = 0; m < t; m++)
    s[m].bh > v && (v = s[m].bh), s[m].bw > a && (a = s[m].bw);
  Se = o, kt = l, At = r, St = h, Bt = v, j = we * v, X = Math.min(xs, Math.max(Ae(t), n - 2 * f - 2 * a));
  const c = f + a + X / 2, p = n - f - a - X / 2, d = c <= p ? Math.min(p, Math.max(c, (e + i) / 2)) : n / 2;
  Pe = d - X / 2, Te = d + X / 2, rt = ie(r - q - l, v, j), at = ie(o - l - h - q, v, j);
}
const oe = (s) => s > 1 ? Math.min(Mt, Math.max(be, (X - 2 * qt - ge) / (2 * (s - 1)))) : Mt;
function Ut(s) {
  const t = s.side < 0 ? Pe : Te, e = s.zone < 0;
  s.ix = t, s.x = s.side < 0 ? t - s.bw : t, s.y = e ? Dt - s.bh - s.row * j : Ht + s.row * j, s.ex = t - s.side * (qt + (e ? Fe : Le) * s.row), s.ey = s.y + K / 2, s.gy = e ? _t : Ot;
  const r = s.corner < 0 ? s.tlx : s.trx, i = s.corner < 0 ? s.tly : s.try_, h = s.corner < 0 ? s.blx : s.brx, n = s.corner < 0 ? s.bly : s.bry;
  if (e) {
    const o = i < _t + 1 && n > i;
    s.ax = o ? h : r, s.ay = o ? n : i;
  } else {
    const o = n > Ot - 1 && i < n;
    s.ax = o ? r : h, s.ay = o ? i : n;
  }
}
function Pt(s, t) {
  Q = U = 0;
  for (let e = 0; e < t; e++) {
    const r = s[e];
    r.zone < 0 ? r.row + 1 > Q && (Q = r.row + 1) : r.row + 1 > U && (U = r.row + 1);
  }
  Dt = Math.max(At - q, kt + re(Q, Bt, j)), Ht = Math.min(St + q, Se - kt - re(U, Bt, j)), _t = Dt + q * 0.55, Ot = Ht - q * 0.55, Fe = oe(Q), Le = oe(U);
  for (let e = 0; e < t; e++) Ut(s[e]);
}
function Re(s, t) {
  for (let e = 0; e < 3; e++) {
    const r = e === 0 ? s.ax : s.ex, i = e === 0 ? s.ay : e === 1 ? s.gy : s.ey, h = e === 2 ? s.ix : s.ex, n = e === 0 ? s.gy : s.ey;
    for (let o = 0; o < 3; o++) {
      const f = o === 0 ? t.ax : t.ex, l = o === 0 ? t.ay : o === 1 ? t.gy : t.ey, v = o === 2 ? t.ix : t.ex, a = o === 0 ? t.gy : t.ey;
      if (ws(r, i, h, n, f, l, v, a)) return !0;
    }
  }
  return !1;
}
function Ee(s, t) {
  let e = 0;
  for (let r = 0; r < t; r++) for (let i = r + 1; i < t; i++) Re(s[r], s[i]) && e++;
  return e;
}
function ne(s, t, e) {
  for (let r = 0; r < e; r++) {
    let i = !1;
    for (let h = 0; h < t; h++) for (let n = h + 1; n < t; n++) {
      const o = s[h], f = s[n];
      if (!Re(o, f)) continue;
      const l = o.zone, v = o.side, a = o.row;
      o.zone = f.zone, o.side = f.side, o.row = f.row, f.zone = l, f.side = v, f.row = a, Ut(o), Ut(f), i = !0;
    }
    if (!i) return 0;
  }
  return Ee(s, t);
}
function Ms(s, t, e) {
  return As(s, t, e), Pt(s, t), ne(s, t, 16) === 0 ? 0 : (Ss(s, t, e), Pt(s, t), ne(s, t, 48) === 0 ? 1 : 2);
}
function As(s, t, e) {
  for (let r = -1; r <= 1; r += 2) {
    let i = 0;
    for (let l = 0; l < t; l++) s[l].corner === r && (e[i++] = l);
    if (i === 0) continue;
    const h = Me(i), n = Math.min(rt, Math.max(h, i - at)), o = Math.min(at, Math.max(h, i - rt));
    wt(e, i, s, ae);
    let f = 0;
    for (let l = 0; l < i; l++) ae(s[e[l]]) <= 0 && f++;
    f = Math.min(f, n), i - f > o && (f = Math.min(i, Math.max(f, i - o, n + o >= i ? 0 : Math.round(i * n / Math.max(1, n + o)))));
    for (let l = 0; l < i; l++) {
      const v = s[e[l]];
      v.zone = l < f ? -1 : 1, v.side = r;
    }
    wt(e, f, s, r < 0 ? V : Qt), wt(e, i, s, r < 0 ? V : Qt, f);
    for (let l = 0; l < i; l++) s[e[l]].row = l < f ? l : l - f;
  }
}
function Ss(s, t, e) {
  const r = at > rt ? 1 : -1;
  let i = 0, h = 0;
  for (let n = 0; n < t; n++)
    s[n].zone = r, s[n].side = s[n].corner, s[n].corner < 0 ? i++ : h++;
  for (; Math.abs(i - h) > 1; ) {
    const n = i > h ? -1 : 1;
    let o = -1, f = -1e9;
    for (let l = 0; l < t; l++) {
      if (s[l].side !== n) continue;
      const v = n < 0 ? V(s[l]) : -V(s[l]);
      v > f && (f = v, o = l);
    }
    s[o].side = -n, n < 0 ? (i--, h++) : (h--, i++);
  }
  for (let n = -1; n <= 1; n += 2) {
    let o = 0;
    for (let f = 0; f < t; f++) s[f].side === n && (e[o++] = f);
    wt(e, o, s, n < 0 ? V : Qt);
    for (let f = 0; f < o; f++) s[e[f]].row = f;
  }
}
function Ps(s = 8) {
  const t = () => new Float32Array(s);
  return {
    valid: !1,
    n: 0,
    zone: new Int8Array(s),
    side: new Int8Array(s),
    row: new Int8Array(s),
    tz: new Int8Array(s),
    ts: new Int8Array(s),
    tr: new Int8Array(s),
    hx: t(),
    hy: t(),
    hr: t(),
    px: t(),
    py: t(),
    pr: t(),
    vx: t(),
    vy: t(),
    vr: t(),
    box: new Float32Array(4),
    sinceSwap: 0,
    still: 0,
    swaps: 0,
    level: 0
  };
}
let bt = 0;
function Rt(s, t, e, r) {
  const i = s - e, h = (t + Lt * i) * r, n = Math.exp(-Lt * r);
  return bt = (t - Lt * h) * n, e + (i + h) * n;
}
const Et = (s, t) => t - s > lt ? t - lt : s - t > lt ? t + lt : s;
function Ts(s, t, e, r, i, h, n, o, f, l, v, a, c, p) {
  gs(s, t, e, r, i, h, n, o, f, l);
  const d = Ms(s, t, v), m = a.box;
  if (!a.valid || a.n !== t) {
    for (let u = 0; u < t; u++) {
      const x = s[u];
      a.zone[u] = x.zone, a.side[u] = x.side, a.row[u] = x.row, a.hx[u] = a.px[u] = x.x, a.hy[u] = a.py[u] = x.y, a.hr[u] = a.pr[u] = x.ex, a.vx[u] = a.vy[u] = a.vr[u] = 0;
    }
    return m[0] = e, m[1] = r, m[2] = i, m[3] = h, a.valid = !0, a.n = t, a.sinceSwap = se, a.still = Ft, a.swaps = 0, a.level = d, !0;
  }
  const b = Math.abs(e - m[0]) + Math.abs(r - m[1]) + Math.abs(i - m[2]) + Math.abs(h - m[3]) > 0.01;
  a.still = b ? 0 : a.still + c, a.sinceSwap += c, m[0] = e, m[1] = r, m[2] = i, m[3] = h;
  let y = !0;
  for (let u = 0; u < t; u++) (s[u].zone !== a.zone[u] || s[u].side !== a.side[u] || s[u].row !== a.row[u]) && (y = !1);
  if (y)
    a.level = d;
  else {
    let u = a.sinceSwap < se && a.still < Ft;
    if (u) {
      const x = Q, A = U;
      for (let S = 0; S < t; S++) {
        const g = s[S];
        a.tz[S] = g.zone, a.ts[S] = g.side, a.tr[S] = g.row, g.zone = a.zone[S], g.side = a.side[S], g.row = a.row[S];
      }
      if (Pt(s, t), u = Ee(s, t) === 0 && Q <= Math.max(rt, x) && U <= Math.max(at, A), !u) {
        for (let S = 0; S < t; S++)
          s[S].zone = a.tz[S], s[S].side = a.ts[S], s[S].row = a.tr[S];
        Pt(s, t);
      }
    }
    if (!u) {
      for (let x = 0; x < t; x++)
        a.zone[x] = s[x].zone, a.side[x] = s[x].side, a.row[x] = s[x].row;
      a.swaps++, a.sinceSwap = 0, a.level = d;
    }
  }
  const w = a.still >= Ft;
  let M = w;
  for (let u = 0; u < t; u++) {
    const x = s[u];
    a.hx[u] = w ? x.x : Et(a.hx[u], x.x), a.hy[u] = w ? x.y : Et(a.hy[u], x.y), a.hr[u] = w ? x.ex : Et(a.hr[u], x.ex), p ? (a.px[u] = a.hx[u], a.py[u] = a.hy[u], a.pr[u] = a.hr[u], a.vx[u] = a.vy[u] = a.vr[u] = 0) : (a.px[u] = Rt(a.px[u], a.vx[u], a.hx[u], c), a.vx[u] = bt, a.py[u] = Rt(a.py[u], a.vy[u], a.hy[u], c), a.vy[u] = bt, a.pr[u] = Rt(a.pr[u], a.vr[u], a.hr[u], c), a.vr[u] = bt), x.ix += a.px[u] - x.x, x.x = a.px[u], x.y = a.py[u], x.ey = x.y + K / 2, x.ex = a.pr[u], Math.abs(a.px[u] - a.hx[u]) + Math.abs(a.py[u] - a.hy[u]) + Math.abs(a.pr[u] - a.hr[u]) > 0.02 ? M = !1 : w && (x.ix += a.hx[u] - x.x, x.x = a.px[u] = a.hx[u], x.y = a.py[u] = a.hy[u], x.ex = a.pr[u] = a.hr[u], x.ey = x.y + K / 2, a.vx[u] = a.vy[u] = a.vr[u] = 0);
  }
  return M;
}
const Wt = 0.2, C = 0.9, G = 0.35, Ce = 0.45, Fs = 1.2, Tt = 0.06, ze = 0.8, gt = 1.2, Ie = 1, it = 1.5, Ls = 5, ft = 0.28, he = 1.12, T = (s) => s < 0 ? 0 : s > 1 ? 1 : s, R = (s, t, e) => s + (t - s) * e, I = (s, t, e) => {
  const r = T((e - s) / (t - s));
  return r * r * (3 - 2 * r);
}, Ct = (s) => (s = T(s), s < 0.5 ? 4 * s * s * s : 1 - Math.pow(-2 * s + 2, 3) / 2), Rs = (s, t = 0.9) => {
  const e = T(s) - 1;
  return 1 + (t + 1) * e * e * e + t * e * e;
}, Z = 256, $ = new Float64Array(Z + 1);
(() => {
  const i = (n) => 3 * (1 - n) * (1 - n) * n * 0.16 + 3 * (1 - n) * n * n * 0.3 + n * n * n, h = (n) => 3 * (1 - n) * (1 - n) * n * 1 + 3 * (1 - n) * n * n * 1 + n * n * n;
  for (let n = 0; n <= Z; n++) {
    const o = n / Z;
    let f = 0, l = 1;
    for (let v = 0; v < 40; v++) {
      const a = (f + l) / 2;
      i(a) < o ? f = a : l = a;
    }
    $[n] = h((f + l) / 2);
  }
  $[0] = 0, $[Z] = 1;
})();
function ke(s) {
  s = T(s);
  const t = s * Z, e = Math.min(Z - 1, Math.floor(t));
  return $[e] + ($[e + 1] - $[e]) * (t - e);
}
const L = 0.25, zt = 0.115, Es = 0.035, pt = 0.2;
function ce(s) {
  if (s <= 0) return 0;
  if (s <= L) return zt * (s / L) * (s / L);
  if (s <= C) {
    const t = (s - L) / (C - L), e = t * t, r = e * t, i = 2 * zt / L * (C - L);
    return (2 * r - 3 * e + 1) * zt + (r - 2 * e + t) * i + (-2 * r + 3 * e) * (1 + Tt);
  }
  return s < C + G ? 1 + Tt * 0.5 * (1 + Math.cos(Math.PI * (s - C) / G)) : 1;
}
function Cs(s) {
  return s <= 0 ? 0 : s <= C ? (1 + Tt) * ke(s / C) : s < C + G ? 1 + Tt * 0.5 * (1 + Math.cos(Math.PI * (s - C) / G)) : 1;
}
function zs(s) {
  let t = 0;
  for (const e of s.layers) e.role !== "qr" && t++;
  return t;
}
function Be(s) {
  const t = zs(s), e = t > 1 ? Math.min(0.75, Math.max(0.4, 3 / (t - 1))) : 0, r = Wt + Math.max(0, t - 1) * e + C + G + Ce + Fs, i = new Float64Array(t), h = new Float64Array(t), n = new Float64Array(t), o = 0.5, f = 0.55;
  for (let l = 0; l < t; l++)
    i[l] = Wt + l * e, h[l] = t > 1 ? l * (1 - o) / (t - 1) : 0, n[l] = t > 1 ? l * 0.35 / (t - 1) : 0;
  return {
    n: t,
    gap: e,
    start: i,
    rebuildStart: h,
    rebuildLand: o,
    assembleStart: n,
    assembleDrop: f,
    dur: { idle: 0, connect: ze, depart: r, rebuild: it, explode: r, fly: gt, assemble: Ie }
  };
}
const le = ["idle", "connect", "depart", "rebuild"], ue = ["explode", "fly", "assemble"], H = 0.012, tt = 0.08, et = 0.11, vt = 0.035, Is = 17 * Math.PI / 180, ks = 24 * Math.PI / 180, st = 0.08, fe = 0.04, Bs = "Lifted to guest", pe = {
  high: { dpr: 2, tex: 2048, taps: 5, sweep: !0, aniso: 4, mem: 64 },
  mid: { dpr: 1.5, tex: 1536, taps: 1, sweep: !0, aniso: 2, mem: 40 },
  low: { dpr: 1, tex: 1024, taps: 0, sweep: !1, aniso: 1, mem: 24 },
  test: { dpr: 1, tex: 2048, taps: 5, sweep: !0, aniso: 4, mem: 64 }
};
async function Ds(s, t) {
  const e = new Hs(s, t);
  try {
    await e.init();
  } catch (r) {
    throw e.dispose(), r;
  }
  return e.handle();
}
class Hs {
  constructor(t, e) {
    this.canvas = t, this.opts = e, this.role = e.role, this.tier = pe[e.quality] ?? pe.mid, this.reduced = !!e.reduced, this.m = e.layers, this.P = Be(this.m), this.cardH = this.m.card.h / this.m.card.w, this.tl = this.role === "host" ? "idle" : "explode", this.t0 = this.role === "host" ? performance.now() : 1 / 0;
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
  scene = new We();
  camera = new qe();
  frame = new je();
  shared = ts();
  sheets = [];
  flying = [];
  slots = [];
  /** the only state that outlives a frame: where the label blocks were (contract v1.1) */
  labelHistory = Ps();
  /** seconds since the previous frame, for that history */
  chromeDt = 0;
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
  // frames (guest)
  aPos = new B();
  aQuat = new J();
  vPos = new B(0, 0, -6);
  vQuat = new J();
  sPos = new B();
  sScaleY = 1;
  fPos = new B();
  fQuat = new J();
  fScl = new B(1, 1, 1);
  entry = new B();
  bgA = 0;
  glassW = 1;
  u = 1;
  spread = 1;
  // scratch
  v = new B();
  v2 = new B();
  q = new J();
  qi = new J();
  mat = new Ge();
  box = [0, 0, 0, 0];
  onLost = (t) => {
    t.preventDefault(), cancelAnimationFrame(this.raf), this.raf = 0, this.opts.onLost?.("WebGL context lost");
  };
  loop = (t) => {
    this.disposed || (this.raf = requestAnimationFrame(this.loop), this.tick(t));
  };
  // ---------------------------------------------------------------- setup
  async init() {
    this.renderer = new Ne({
      canvas: this.canvas,
      alpha: !0,
      antialias: !0,
      premultipliedAlpha: !0,
      depth: !1,
      stencil: !1,
      preserveDrawingBuffer: !1,
      powerPreference: "high-performance"
    }), this.renderer.setPixelRatio(1), this.renderer.setClearColor(0, 0), this.canvas.addEventListener("webglcontextlost", this.onLost);
    const e = this.m.layers.map((c, p) => ({ spec: c, i: p })).sort((c, p) => c.spec.z - p.spec.z || c.i - p.i);
    this.usesFont = !0;
    const [r] = await Promise.all([
      Promise.all(e.map((c) => Yt(Xt(this.opts.baseUrl, c.spec.src)))),
      $e()
    ]);
    if (this.disposed) return;
    let i = 0;
    for (const c of e) c.spec.role !== "qr" && (i = Math.max(i, c.spec.z));
    const h = ds(), n = te(), o = te(!0);
    this.geos.push(h, n, o);
    const f = this.P.n;
    let l = 0;
    const v = [];
    e.forEach((c, p) => {
      const d = c.spec.role === "qr", m = new jt(), b = us(this.shared, m, d), y = new N(h, b), w = this.tier.taps, M = w > 0 ? fs(this.shared, m, w) : null, u = M ? new N(n, M) : null, x = ee(11), A = Jt(this.shared, !1), S = new N(x.geometry, A);
      this.geos.push(x.geometry);
      const g = {
        i: c.i,
        spec: c.spec,
        qr: d,
        j: d ? -1 : l,
        k: d ? -1 : f - 1 - l,
        zn: i > 0 ? Math.min(1, c.spec.z / i) : 0,
        recv: -1,
        dupe: 0,
        slot: -1,
        chip: -1,
        pill: -1,
        img: r[p],
        tex: m,
        next: null,
        mixT0: 0,
        grid: d ? Vt(r[p], this.canvas) : null,
        bx: 0,
        by: 0,
        bw: 1,
        bh: 1,
        rx: 0,
        ry: 0,
        rw: 1,
        rh: 1,
        mesh: y,
        mat: b,
        shadow: u,
        smat: M,
        lines: S,
        lmat: A,
        lset: x,
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
        tag: 0
      };
      for (const P of [y, u, S])
        P && (P.matrixAutoUpdate = !1, P.frustumCulled = !1, this.frame.add(P));
      if (!d) {
        for (let P = this.flying.length - 1; P >= 0; P--) {
          const F = this.flying[P].spec.rect, z = c.spec.rect;
          if (z.x >= F.x - 1 && z.y >= F.y - 1 && z.x + z.w <= F.x + F.w + 1 && z.y + z.h <= F.y + F.h + 1) {
            g.recv = this.sheets.indexOf(this.flying[P]);
            break;
          }
        }
        for (const P of this.flying) {
          const F = P.spec.rect, z = c.spec.rect;
          Math.abs(z.x - F.x) < 1 && Math.abs(z.y - F.y) < 1 && Math.abs(z.w - F.w) < 1 && Math.abs(z.h - F.h) < 1 && g.dupe++;
        }
        g.slot = this.slots.length, this.slots.push(ys(l % 2 === 0 ? -1 : 1)), g.chip = v.length, v.push({ text: c.spec.label ?? c.spec.name, kind: "chip" }), c.spec.dims && (g.pill = v.length, v.push({ text: c.spec.dims, kind: "pill" })), this.flying.push(g), l++;
      }
      this.sheets.push(g), this.buildLines(g);
    }), this.tagEntry = v.length, v.push({ text: Bs, kind: "tag" }), this.atlasItems = v, this.bgMat = vs(this.shared);
    const a = _s(this.m.card.background);
    this.bgMat.uniforms.uColor.value.set(a[0], a[1], a[2]), this.bg = new N(o, this.bgMat), this.bg.frustumCulled = !1, this.bg.renderOrder = 0, this.scene.add(this.bg), this.frame.matrixAutoUpdate = !1, this.scene.add(this.frame), this.sprites = ms(Math.max(1, f * 3)), this.geos.push(this.sprites.geometry), this.atlasTex = new jt(), this.spriteMat = ps(this.shared, this.atlasTex), this.spriteMesh = new N(this.sprites.geometry, this.spriteMat), this.spriteMesh.frustumCulled = !1, this.spriteMesh.renderOrder = this.role === "host" ? 500 : 901, this.scene.add(this.spriteMesh), this.role === "guest" && (this.leaders = ee(Math.max(1, f * 3)), this.geos.push(this.leaders.geometry), this.leaderMesh = new N(this.leaders.geometry, Jt(this.shared, !0)), this.leaderMesh.frustumCulled = !1, this.leaderMesh.renderOrder = 900, this.scene.add(this.leaderMesh)), this.buildEvents(), this.measure(), typeof ResizeObserver < "u" && (this.ro = new ResizeObserver(() => {
      this.sizeDirty = !0, this.dirty = !0;
    }), this.ro.observe(this.canvas)), this.warmUp(), this.update(0), this.render(), this.raf = requestAnimationFrame(this.loop);
  }
  atlasItems = [];
  /**
   * Links every program and uploads every texture while mounting: one frame with everything visible,
   * clipped to a single pixel. Without it the first shadow, outline or label would stall its frame
   * (measured: 526 ms on the first tilted idle frame at `high`).
   */
  warmUp() {
    const t = this.renderer;
    this.update(0), this.scene.traverse((e) => {
      e.visible = !0;
    }), this.sprites.geometry.instanceCount = 1, t.setScissor(0, 0, 1, 1), t.setScissorTest(!0), t.render(this.scene, this.camera), t.setScissorTest(!1);
  }
  /** Frame (4), measurement line + ticks (3) and handles (4) in the sheet's unit space. */
  buildLines(t) {
    const e = t.lset, r = this.role === "host", i = r ? 1 : 1.5, h = r ? 0.55 : 1, n = 0.5;
    E(e, 0, -n, n, 0, n, n, 0, i, 0, 0, 0.25, k, h), E(e, 1, n, n, 0, n, -n, 0, i, 0, 0.25, 0.5, k, h), E(e, 2, n, -n, 0, -n, -n, 0, i, 0, 0.5, 0.75, k, h), E(e, 3, -n, -n, 0, -n, n, 0, i, 0, 0.75, 1, k, h);
    for (let o = 4; o < 11; o++) E(e, o, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, ct, 0);
    t.lmat.uniforms.uSnap.value = r ? 1 : 0, t.lmat.uniforms.uDash.value = 0;
  }
  /** Measurement geometry depends on the rect's aspect, so it is rewritten after every measure(). */
  placeMeasure(t) {
    if (this.role === "host" || t.qr) return;
    const e = t.lset, r = 0.5, i = Math.min(0.03, 0.3 * t.rh) / t.rh, h = Math.min(0.014, 0.14 * t.rh) / t.rh, n = -r - i;
    E(e, 4, -r, n, 0, r, n, 0, 1, 1, 0.1, 1, ct), E(e, 5, -r, n - h, 0, -r, n + h, 0, 1, 1, 0, 0.1, ct), E(e, 6, r, n - h, 0, r, n + h, 0, 1, 1, 0.9, 1, ct), E(e, 7, -r, r, 0, -r, r, 0, 5, 2, 0, 0, k), E(e, 8, r, r, 0, r, r, 0, 5, 2, 0, 0, k), E(e, 9, r, -r, 0, r, -r, 0, 5, 2, 0, 0, k), E(e, 10, -r, -r, 0, -r, -r, 0, 5, 2, 0, 0, k);
    for (const o of e.attrs) o.needsUpdate = !0;
  }
  buildEvents() {
    const t = this.P, e = this.events;
    for (const r of [...le, ...ue]) e[r] = [];
    for (const r of this.flying) {
      const i = (h) => ({ index: r.i, id: r.spec.id, phase: h });
      e.depart.push({ t: t.start[r.k], e: i("leave") }), e.explode.push({ t: t.start[r.k], e: i("lift") }, { t: t.start[r.k] + C + G, e: i("settle") }), e.assemble.push({ t: t.assembleStart[r.j] + t.assembleDrop, e: i("arrive") }), e.rebuild.push({ t: t.rebuildStart[r.j] + t.rebuildLand, e: i("arrive") });
    }
    for (const r of this.sheets)
      r.qr && e.rebuild.push({ t: it, e: { index: r.i, id: r.spec.id, phase: "arrive" } });
    for (const r in e) e[r].sort((i, h) => i.t - h.t);
  }
  /** Canvas metrics, the flat fit, the screen-resolution bake, the atlas and the static frames. */
  measure() {
    const t = this.canvas, e = this.m.card, r = this.role === "host";
    this.cw = Math.max(1, t.clientWidth || t.width), this.ch = Math.max(1, t.clientHeight || t.height);
    const i = !r && this.opts.assembleRect || { x: 0, y: 0, w: this.cw, h: this.ch }, h = Math.min(i.w / e.w, i.h / e.h), n = Math.max(e.w, e.h) * h, o = this.opts.quality === "test" ? 1 : self.devicePixelRatio || 1;
    let f = Math.min(o, this.tier.dpr, this.tier.tex / n);
    for (let d = 0; d < 8; d++) {
      this.bw = Math.max(1, Math.round(this.cw * f)), this.bh = Math.max(1, Math.round(this.ch * f)), this.sx = this.bw / this.cw, this.sy = this.bh / this.ch;
      const m = Math.min(i.w * this.sx / e.w, i.h * this.sy / e.h);
      this.fitW = e.w * m, this.fitH = e.h * m, this.fitX = i.x * this.sx + (i.w * this.sx - this.fitW) / 2, this.fitY = i.y * this.sy + (i.h * this.sy - this.fitH) / 2;
      let b = 0;
      for (const y of this.sheets) b += Math.ceil(y.spec.rect.w * m + 1) * Math.ceil(y.spec.rect.h * m + 1) * 4 * (4 / 3);
      if (b <= this.tier.mem * 1048576 * 0.9) break;
      f *= 0.85;
    }
    this.renderer.setSize(this.bw, this.bh, !1), this.shared.uRes.value.set(this.bw, this.bh), this.shared.uPr.value = this.sx, this.shared.uOrtho.value = r ? 1 : 0;
    const l = this.fitX + this.fitW / 2, v = this.fitY + this.fitH / 2;
    this.texBytes = 0, this.scrX = Math.min(0, Math.floor(this.fitX)), this.scrY = Math.min(0, Math.floor(this.fitY)), this.scrW = Math.max(this.bw, Math.ceil(this.fitX + this.fitW)) - this.scrX, this.scrH = Math.max(this.bh, Math.ceil(this.fitY + this.fitH)) - this.scrY, this.scratch = O(this.bw, this.bh, this.canvas), this.over = this.scrW > this.bw || this.scrH > this.bh ? O(this.scrW, this.scrH, this.canvas) : null;
    for (const d of this.sheets) {
      const m = d.spec.rect;
      this.setTexture(d, d.img, !1), d.rx = (m.x + m.w / 2 - e.w / 2) / e.w, d.ry = (e.h / 2 - (m.y + m.h / 2)) / e.w, d.rw = m.w / e.w, d.rh = m.h / e.w, this.placeMeasure(d);
    }
    this.scratch.width = this.scratch.height = 1, this.scratch = null, this.over && (this.over.width = this.over.height = 1), this.over = null;
    const a = Math.min(176, (this.cw * (1 - 2 * st) - Ae(this.flying.length)) / 2);
    this.atlas = Je(this.atlasItems, this.sx, a, this.canvas), this.labelHistory.valid = !1, this.atlasTex?.dispose();
    const c = new Gt(this.atlas.canvas);
    c.flipY = !1, c.premultiplyAlpha = !0, c.generateMipmaps = !1, c.minFilter = c.magFilter = Nt, this.atlasTex = c, this.spriteMat.uniforms.map.value = c, this.texBytes += this.atlas.bytes;
    for (const d of this.flying) {
      const m = this.slots[d.slot], b = this.atlas.entries;
      m.bw = Math.max(b[d.chip].w, d.pill >= 0 ? b[d.pill].w : 0), m.bh = K + (d.pill >= 0 ? Zt + ye : 0);
    }
    const p = this.shared.uSafe.value;
    for (const d of p) d.set(0, 0, 0, 0);
    r && this.opts.safeRects && this.opts.safeRects.forEach((d, m) => {
      const b = Math.floor(d.x * this.sx), y = Math.ceil((d.x + d.w) * this.sx), w = this.bh - Math.ceil((d.y + d.h) * this.sy), M = this.bh - Math.floor(d.y * this.sy), u = p[Math.min(m, 3)];
      m < 4 ? u.set(b, w, y, M) : u.set(Math.min(u.x, b), Math.min(u.y, w), Math.max(u.z, y), Math.max(u.w, M));
    }), r ? (this.camera.projectionMatrix.makeOrthographic(0, this.bw, this.bh, 0, -1e4, 1e4), this.frame.matrix.set(
      this.fitW,
      0,
      0,
      l,
      0,
      this.fitW,
      0,
      this.bh - v,
      0,
      0,
      this.fitW,
      0,
      0,
      0,
      0,
      1
    ), this.frame.matrixWorldNeedsUpdate = !0) : this.setCamera(), this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert(), this.sizeDirty = !1, this.dirty = !0;
  }
  setTexture(t, e, r) {
    const i = this.m.card, h = t.spec.rect, n = this.fitW / i.w, o = this.scratch ?? O(this.bw, this.bh, this.canvas), f = this.over ?? (this.scrW > this.bw || this.scrH > this.bh ? O(this.scrW, this.scrH, this.canvas) : null), l = Ve(e, this.fitX + h.x * n, this.fitY + h.y * n, h.w * n, h.h * n, o, this.canvas, f, this.scrX, this.scrY), v = new Gt(l.canvas);
    v.premultiplyAlpha = !0, v.generateMipmaps = !0, v.minFilter = Xe, v.magFilter = Nt, v.anisotropy = Math.min(this.tier.aniso, this.renderer.capabilities.getMaxAnisotropy()), this.texBytes += l.w * l.h * 4 * (4 / 3);
    const a = t.mat.uniforms;
    if (r) {
      t.next?.dispose(), t.next = v, a.mapB.value = v;
      return;
    }
    t.tex.dispose(), t.tex = v, a.map.value = v, a.mapB.value = v, a.uMix.value = 0, t.smat && (t.smat.uniforms.map.value = v);
    const c = this.fitX + this.fitW / 2, p = this.fitY + this.fitH / 2;
    t.bx = (l.x0 + l.w / 2 - c) / this.fitW, t.by = (p - (l.y0 + l.h / 2)) / this.fitW, t.bw = l.w / this.fitW, t.bh = l.h / this.fitW, a.uTile.value.set(l.tu, l.tv, l.tw, l.th), t.grid && a.uQr.value.set(t.grid.ox, t.grid.oy, t.grid.nx, t.grid.ny);
  }
  // ---------------------------------------------------------------- guest frames
  setCamera() {
    const r = 0.05 * Math.tan(this.fov * Math.PI / 360), i = r * (this.aspect > 0 ? this.aspect : this.bw / this.bh);
    this.camera.projectionMatrix.makePerspective(-i, i, r, -r, 0.05, 200), this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert(), this.solveVirtual(), this.solveDeck(), this.dirty = !0;
  }
  /**
   * Face-on frame in which the card plane has `zoom` times the size of the flat fit and its centre
   * sits at (cx, cy) device px. zoom 1 at the centre of the fit is the landing itself.
   */
  screenFrame(t, e, r) {
    const i = this.camera.projectionMatrix.elements, h = i[0], n = i[5], o = h * this.bw / (2 * this.fitW * t), f = e / this.bw * 2 - 1, l = 1 - r / this.bh * 2;
    this.sPos.set(f * o / h, l * o / n, -o), this.sScaleY = h * this.bw / (n * this.bh);
  }
  /** Device-px bounding box of the deck (the stack at DECK spacing, face-on) for the current this.sPos; result in this.box. */
  deckBox() {
    const t = this.box, e = this.q.identity(), r = this.bw / this.cw, i = this.bh / this.ch;
    t[0] = t[1] = 1e9, t[2] = t[3] = -1e9;
    for (const h of this.flying) {
      const n = h.by + vt * this.cardH * h.j * ft, o = (tt + et * h.j + H) * ft;
      for (let f = 0; f < 4; f++) {
        const l = this.project(h.bx + (f & 1 ? 0.5 : -0.5) * h.bw, n + (f & 2 ? 0.5 : -0.5) * h.bh, o, this.sPos, e, this.sScaleY);
        l.x * r < t[0] && (t[0] = l.x * r), l.y * i < t[1] && (t[1] = l.y * i), l.x * r > t[2] && (t[2] = l.x * r), l.y * i > t[3] && (t[3] = l.y * i);
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
    const t = fe * this.bw, e = fe * this.bh;
    let r = Math.max(0, this.fitX), i = Math.max(0, this.fitY), h = Math.min(this.bw, this.fitX + this.fitW), n = Math.min(this.bh, this.fitY + this.fitH);
    (h - r < 2 || n - i < 2) && (r = 0, i = 0, h = this.bw, n = this.bh);
    const o = (r + h) / 2, f = (i + n) / 2, l = this.box;
    let v = he, a = o, c = f;
    for (let p = 0; p < 12; p++) {
      this.screenFrame(v, a, c), this.deckBox();
      let d = o - (l[0] + l[2]) / 2, m = f - (l[1] + l[3]) / 2;
      const b = l[2] - l[0], y = l[3] - l[1], w = this.bw - 2 * t, M = this.bh - 2 * e;
      b <= w && (d = Math.min(Math.max(d, t - l[0]), this.bw - t - l[2])), y <= M && (m = Math.min(Math.max(m, e - l[1]), this.bh - e - l[3])), a += d, c += m, v = Math.min(he, v * Math.min(w / b, M / y));
    }
    this.deckZoom = v, this.deckX = a, this.deckY = c;
  }
  /** Projects a card-space point through `pos`/`quat` to CSS px; result in this.v (x, y). */
  project(t, e, r, i, h, n) {
    const o = this.v.set(t, e * n, r).applyQuaternion(h).add(i).applyMatrix4(this.camera.projectionMatrix);
    return o.x = (o.x * 0.5 + 0.5) * this.cw, o.y = (0.5 - o.y * 0.5) * this.ch, o;
  }
  /** Screen bounding box of the settled exploded stack seen through `pos`/`quat`; result in this.box. */
  stackBox(t, e) {
    const r = this.box;
    r[0] = r[1] = 1e9, r[2] = r[3] = -1e9;
    for (const i of this.flying) {
      const h = i.by + vt * this.cardH * i.j, n = tt + et * i.j + H;
      for (let o = 0; o < 4; o++) {
        const f = this.project(i.bx + (o & 1 ? 0.5 : -0.5) * i.bw, h + (o & 2 ? 0.5 : -0.5) * i.bh, n, t, e, 1);
        f.x < r[0] && (r[0] = f.x), f.y < r[1] && (r[1] = f.y), f.x > r[2] && (r[2] = f.x), f.y > r[3] && (r[3] = f.y);
      }
    }
  }
  /**
   * The unanchored pose: fixed rotation, distance and offset solved so the whole stack plus its label
   * blocks stay inside the 8 % margins. Also the entry vector (card space) that puts a sheet above
   * the top edge of the screen.
   */
  solveVirtual() {
    if (this.role !== "guest" || this.flying.length === 0) return;
    this.vQuat.setFromEuler(new Ye(Is, ks, 0, "XYZ"));
    const t = st * this.cw, e = st * this.ch;
    let r = 0, i = 0, h = 0;
    for (const d of this.slots)
      r = Math.max(r, d.bh), d.corner < 0 ? i++ : h++;
    const n = bs(Me(Math.max(i, h)), r), o = t, f = this.cw - t, l = e + n, v = this.ch - e - n, a = this.camera.projectionMatrix.elements, c = this.box;
    this.vPos.set(0, 0, -6);
    for (let d = 0; d < 14; d++) {
      this.stackBox(this.vPos, this.vQuat);
      const m = Math.min((f - o) / (c[2] - c[0]), (v - l) / (c[3] - c[1]));
      this.vPos.multiplyScalar(1 / m), this.stackBox(this.vPos, this.vQuat);
      const b = -this.vPos.z;
      this.vPos.x += ((o + f) / 2 - (c[0] + c[2]) / 2) / this.cw * 2 * (b / a[0]), this.vPos.y -= ((l + v) / 2 - (c[1] + c[3]) / 2) / this.ch * 2 * (b / a[5]);
    }
    this.stackBox(this.vPos, this.vQuat);
    const p = (c[3] + 0.04 * this.ch) / this.ch * 2 * (-this.vPos.z / a[5]);
    this.entry.set(0, p, 0).applyQuaternion(this.qi.copy(this.vQuat).invert()), this.everPose || (this.aPos.copy(this.vPos), this.aQuat.copy(this.vQuat));
  }
  // ---------------------------------------------------------------- per-frame state
  reset(t) {
    t.on = !0, t.op = 1, t.ox = 0, t.oy = 0, t.z = 0, t.sc = 1, t.acr = 0, t.sweep = 0, t.qT = 0, t.qLift = 0, t.lifted = !1, t.shA = 0, t.shx = 0, t.shy = 0, t.shBlur = 0, t.shZ = 0, t.shSlab = 0, t.shGlass = !1, t.fr = 0, t.frA = 0, t.ms = 0, t.hd = 0, t.chA = 0, t.lead = 0, t.chipR = 0, t.pillR = 0, t.tag = 0;
  }
  update(t) {
    this.role === "host" ? this.updateHost(this.tl, this.t) : this.updateGuest(this.tl, this.t, t), this.apply();
  }
  updateHost(t, e) {
    const r = this.P, i = this.reduced, h = this.sx / this.fitW;
    let n = t === "idle" || t === "connect" ? 1 : t === "depart" ? 1 - I(0, Wt, e) : I(it - 0.3, it, e);
    i && (n = 0);
    let o = this.tiltX, f = this.tiltY;
    const l = Math.hypot(o, f);
    l > 1 && (o /= l, f /= l);
    let v = o * 10 * n, a = f * 10 * n;
    if (t === "idle" && !i) {
      const c = 1.5 * Math.sin(2 * Math.PI * e / Ls) * (1 - I(0, 0.15, Math.min(1, l)));
      v += c * 0.8, a += c * 0.6;
    }
    this.bgA = 1;
    for (const c of this.sheets) {
      this.reset(c);
      const p = c.qr ? 0.4 * c.zn : c.zn;
      c.ox = v * p * h, c.oy = -a * p * h;
      const d = Math.hypot(v, a) * p / 10;
      if (c.shA = 0.35 * T(d * 1.5), c.shx = -c.ox * 0.6, c.shy = -c.oy * 0.6, c.shBlur = (0.6 + 2.2 * d) * h, c.qr) {
        t === "connect" ? (c.qT = T(e / ze), c.qLift = i ? 0 : 2.5) : t === "rebuild" ? (c.qT = 1 - T((e - 0.85) / (it - 0.85)), c.qLift = i ? 0 : 2.5) : t === "depart" && (c.qT = 1), c.on = c.qT < 1, c.shA *= 1 - c.qT;
        continue;
      }
      if (t === "depart") {
        const m = e - r.start[c.k];
        if (m <= 0) continue;
        if (i) {
          c.op = 1 - T(m / 0.5), c.on = c.op > 0, c.fr = 1, c.frA = c.tag = T(m / 0.5);
          continue;
        }
        this.liftHost(c, m);
      } else if (t === "rebuild") {
        const m = e - r.rebuildStart[c.j], b = r.rebuildLand;
        if (i) {
          c.op = T(m / b), c.on = c.op > 0, c.fr = 1, c.frA = c.tag = 1 - c.op;
          continue;
        }
        this.liftHost(c, (L + pt) * (1 - T(m / b)));
      }
    }
  }
  /**
   * Host: one layer `tau` seconds into its lift. It never leaves its place: the print swells inside
   * its own box and fades out during the peel, the dashed outline is complete when the print is
   * gone, and a contact shadow, cast from the height the guest's sheet has at this moment, drifts
   * away below it and is handed over to the guest's view of the glass. `rebuild` runs `tau` backwards.
   */
  liftHost(t, e) {
    if (e <= 0) return;
    const r = I(0, L, e);
    t.lifted = !0, t.fr = T((e - 0.03) / (L - 0.03)), t.frA = 1, t.tag = T((e - 0.15) / 0.15), t.op = 1 - I(0.08, L, e), t.on = e < L + pt, t.acr = r, t.sc = 1 + Es * r, t.sweep = R(-1.2, 0.6, e / L) + 0.3 * this.tiltX;
    const i = (tt + et * t.j) * ce(e);
    t.shA = 0.35 * I(0, 0.02, i) * (1 - 0.45 * T(i / 0.8)) * (1 - I(L, L + pt, e)), t.shx = 0.1 * i, t.shy = -0.14 * i, t.shBlur = 4e-3 + 0.05 * i, t.shSlab = 0.3;
  }
  updateGuest(t, e, r) {
    const i = this.P, h = this.reduced, n = !this.paused && r - this.uT0 < 350, o = this.u = n ? R(this.uFrom, this.uTo, Ct((r - this.uT0) / 350)) : this.uTo;
    this.hasPose && this.mat.fromArray(this.pose).decompose(this.aPos, this.aQuat, this.v2), this.fPos.copy(this.aPos).lerp(this.vPos, o), this.fQuat.copy(this.aQuat).slerp(this.vQuat, o), this.fScl.set(1, 1, 1);
    let f = 1, l = 1, v = 0;
    if (this.spread = 1, this.bgA = 0, this.glassW = 1 - o, this.shared.uSnap.value = 0, t === "fly")
      v = h ? 0 : Ct(e / gt), this.screenFrame(this.deckZoom, this.deckX, this.deckY), this.fPos.lerp(this.sPos, v), this.fPos.y += 0.3 * Math.sin(Math.PI * v), this.fQuat.slerp(this.q.identity(), v), this.fScl.y = R(1, this.sScaleY, v), f = this.spread = R(1, ft, v), l = 1 - T(e / 0.3), this.bgA = h ? T(e / gt) : I(0.3, 1, e / gt), this.glassW *= 1 - v;
    else if (t === "assemble") {
      const p = h ? 1 : Ct(e / 0.75), d = this.fitX + this.fitW / 2, m = this.fitY + this.fitH / 2;
      this.screenFrame(R(this.deckZoom, 1, p), R(this.deckX, d, p), R(this.deckY, m, p)), this.fPos.copy(this.sPos), this.fQuat.identity(), this.fScl.y = this.sScaleY, l = 0, this.bgA = 1, this.glassW = 0, e >= Ie && (this.shared.uSnap.value = 1);
    }
    this.frame.matrix.compose(this.fPos, this.fQuat, this.fScl), this.frame.matrixWorldNeedsUpdate = !0, this.v2.copy(this.fPos).negate().applyQuaternion(this.qi.copy(this.fQuat).invert()).normalize();
    const a = 1.2 * (this.v2.x * 0.8 - this.v2.y * 0.6), c = vt * this.cardH;
    for (const p of this.sheets) {
      if (this.reset(p), p.qr) {
        p.on = !1;
        continue;
      }
      const d = tt + et * p.j + H;
      let m = f, b = 0, y = -1, w = 1;
      if (p.acr = 1, t === "explode") {
        const A = e - i.start[p.k];
        if (A <= 0) {
          p.on = !1;
          continue;
        }
        const S = T((A - C - G) / Ce);
        if (h)
          p.op = T(A / 0.5), p.chA = S, p.fr = p.ms = p.hd = p.lead = p.chipR = p.pillR = S > 0 ? 1 : 0;
        else {
          const g = ce(A), P = Cs(A), F = Math.max(P, 1);
          m = R(g, F, o), b = o * (1 - ke(A / C)), p.acr = R(I(0, L, A), 1, o), y = R((d - H) * g + H * p.acr, d * F, o), w = R(I(L, L + pt, A), 1, o), p.op = T(A / 0.08), p.sweep = -1.2 + 1.5 * Math.min(1, R(g, P, o)) + 0.08 * p.j + a + 0.05 * Math.max(0, A - C), this.chrome(p, S);
        }
      } else if (t === "fly")
        h && (p.op = 1 - T(e / 0.7), p.on = p.op > 0), p.sweep = 0.3 + 0.08 * p.j + a + 0.9 * v, p.chA = l, p.fr = p.ms = p.hd = p.lead = p.chipR = p.pillR = l > 0 ? 1 : 0;
      else {
        const A = e - i.assembleStart[p.j];
        h ? (m = 0, p.acr = 0, p.op = T(A / 0.4), p.on = p.op > 0) : (m = ft * (1 - Rs(A / i.assembleDrop)), p.acr = 1 - I(0.5, 0.95, e), p.sweep = 1.2 + 0.08 * p.j + a + 0.6 * e);
      }
      p.ox = this.entry.x * b, p.oy = c * p.j * m + this.entry.y * b, p.z = (y >= 0 ? y : d * m) + this.entry.z * b;
      const M = p.recv >= 0 ? this.sheets[p.recv] : null, u = M && M.on ? M.z : 0, x = Math.max(0, p.z - H * p.acr - u);
      p.shGlass = !(M && M.on), p.shZ = u, p.shx = 0.1 * x, p.shy = -0.14 * x, p.shBlur = 4e-3 + 0.05 * x, p.shSlab = 0.3, p.shA = 0.35 * p.op * p.acr * I(0, 0.02, x) * (1 - 0.45 * T(x / 0.8)) * (p.shGlass ? this.glassW : 1) * (1 - b) * w;
    }
  }
  /** Chrome draw-in over CHROME seconds: frame trace, handles, measurement, leader, chip, pill. */
  chrome(t, e) {
    t.chA = e > 0 ? 1 : 0, t.fr = T(e / 0.556), t.hd = T((e - 0.45) / 0.2), t.ms = T((e - 0.5) / 0.35), t.lead = T((e - 0.55) / 0.3), t.chipR = T((e - 0.75) / 0.25), t.pillR = T((e - 0.85) / 0.15);
  }
  // ---------------------------------------------------------------- state -> GPU
  apply() {
    const t = this.role === "host", e = this.sx / this.fitW;
    this.bg.visible = this.bgA > 0, this.bgMat.uniforms.uAlpha.value = this.bgA;
    let r = 0;
    for (const i of this.sheets) {
      const h = t ? (i.lifted ? 600 : 10) + r * 3 : 10 + r * 10, n = i.acr, o = i.bw, f = i.bh, l = i.bx + i.ox, v = i.by + i.oy, a = i.mesh, c = i.mat.uniforms;
      if (a.visible = i.on && i.op > 0, a.visible && (a.matrix.set(o, 0, 0, l, 0, f, 0, v, 0, 0, Math.max(1e-5, H * n), i.z, 0, 0, 0, 1), a.renderOrder = h + 1, c.uBox.value.set(l, v, o, f), c.uOpacity.value = i.op, c.uZoom.value = 1 / i.sc, c.uAcr.value = n, c.uSweep.value = i.sweep, c.uSweepAmt.value = this.tier.sweep && !this.reduced ? 1 : 0, c.uInner.value.set(-4e-3 / o, 6e-3 / f, this.tier.sweep ? 1 : -1), i.qr && c.uQrT.value.set(i.qT, -0.8 * i.qLift * e / i.rw, -i.qLift * e / i.rh), i.next)) {
        const y = T((performance.now() - i.mixT0) / 150);
        c.uMix.value = y, this.dirty = !0, y >= 1 && this.finishSwap(i);
      }
      const p = i.shadow, d = i.smat?.uniforms;
      if (p && d && (p.visible = i.on && i.shA > 4e-3, p.visible)) {
        const y = i.bw * i.sc, w = i.bh * i.sc, M = i.shBlur * 2 + 2e-3, u = y + 2 * M, x = w + 2 * M, A = l + i.shx, S = v + i.shy;
        p.matrix.set(u, 0, 0, A, 0, x, 0, S, 0, 0, 1, i.shZ, 0, 0, 0, 1), d.uBox.value.set(A, S, u, x), d.uGrow.value.set(u / y, x / w), d.uRad.value.set(i.shBlur / y, i.shBlur / w), d.uLod.value = Math.log2(Math.max(1, i.shBlur * this.fitW * 0.9)), d.uAlpha.value = i.shA, d.uSlab.value = i.shSlab * n;
        const g = !t && i.recv >= 0 && !i.shGlass ? this.sheets[i.recv] : null;
        g ? d.uClip.value.set(g.bx + g.ox - g.bw / 2, g.by + g.oy - g.bh / 2, g.bx + g.ox + g.bw / 2, g.by + g.oy + g.bh / 2) : t && i.lifted ? d.uClip.value.set(i.bx - i.bw / 2 + 3e-3, i.by - i.bh / 2 + 3e-3, i.bx + i.bw / 2 - 3e-3, i.by + i.bh / 2 - 3e-3) : d.uClip.value.set(-1e3, -1e3, 1e3, 1e3), p.renderOrder = t ? h : g ? 10 + i.recv * 10 + 2 : 5;
      }
      const m = i.lines, b = i.lmat.uniforms;
      if (m.visible = !i.qr && (t ? i.frA > 0 : i.chA > 0 && a.visible), m.visible)
        if (t) {
          const y = (1 + 8 * i.dupe) * e;
          m.matrix.set(i.rw - y, 0, 0, i.rx, 0, i.rh - y, 0, i.ry, 0, 0, 1, 0, 0, 0, 0, 1), b.uDash.value = 6 * this.sx, b.uProg.value.set(i.fr, 0, 0, 0), b.uAlpha.value.set(i.frA, 0, 0, 0), m.renderOrder = 400 + r;
        } else
          m.matrix.set(i.rw, 0, 0, i.rx + i.ox, 0, i.rh, 0, i.ry + i.oy, 0, 0, 1, i.z, 0, 0, 0, 1), b.uProg.value.set(i.fr, i.ms, i.hd, 0), b.uAlpha.value.set(i.chA, i.chA, i.chA, 0), m.renderOrder = h + 3;
      r++;
    }
    t ? this.writeTags() : this.writeLabels();
  }
  /** Host: where a layer's tag sits (device px, y down): inside the outline's top-left corner, or above a low outline. */
  tagRect(t, e) {
    const r = this.atlas.entries[this.tagEntry], i = this.fitX + (t.rx - t.rw / 2 + 0.5) * this.fitW, h = this.fitY + (this.cardH / 2 - t.ry - t.rh / 2) * this.fitW, n = t.rh * this.fitW >= (yt + 10) * this.sy;
    return e[0] = i + (6 + 4 * t.dupe) * this.sx, e[1] = n ? h + (5 + (yt + 4) * t.dupe) * this.sy : h - (yt + 3) * this.sy, e[2] = r.w * this.sx, e[3] = r.h * this.sy, e;
  }
  /** Host: the tag at the top-left of every outline. */
  writeTags() {
    const t = this.sprites, e = this.atlas.entries[this.tagEntry], r = this.box;
    let i = 0;
    for (const h of this.flying)
      h.tag <= 0 || (this.tagRect(h, r), this.sprite(t, i++, r[0], r[1], r[2], r[3], e, h.tag * 0.9, 1, 1));
    this.finishSprites(i);
  }
  sprite(t, e, r, i, h, n, o, f, l, v) {
    const a = e * 4;
    t.rect[a] = r, t.rect[a + 1] = i, t.rect[a + 2] = h, t.rect[a + 3] = n, t.uv[a] = o.u0, t.uv[a + 1] = o.v0, t.uv[a + 2] = o.u1, t.uv[a + 3] = o.v1, t.fx[a] = f, t.fx[a + 1] = l, t.fx[a + 2] = v, t.fx[a + 3] = 0;
  }
  finishSprites(t) {
    if (this.spriteMesh.visible = t > 0, this.sprites.geometry.instanceCount = t, t > 0) for (const e of this.sprites.attrs) e.needsUpdate = !0;
  }
  /** Guest: project the sheet corners, lay the label blocks out, write leaders and sprites. */
  writeLabels() {
    const t = this.leaders, e = this.sprites, r = this.atlas.entries;
    let i = !1;
    for (const y of this.flying) y.chA > 0 && y.on && (i = !0);
    if (!i) {
      this.finishSprites(0), this.leaderMesh.visible = !1, this.labelHistory.valid = !1;
      return;
    }
    const h = this.fScl.y, n = this.box;
    this.stackBox(this.fPos, this.fQuat);
    const o = n[0], f = n[1], l = n[2], v = n[3];
    let a = 0;
    for (const y of this.flying) {
      const w = this.slots[y.slot], M = y.rx, u = y.rw / 2, x = y.rh / 2, A = y.ry + vt * this.cardH * y.j * this.spread, S = (tt + et * y.j + H) * this.spread;
      let g = this.project(M - u, A + x, S, this.fPos, this.fQuat, h);
      w.tlx = g.x, w.tly = g.y, g = this.project(M + u, A + x, S, this.fPos, this.fQuat, h), w.trx = g.x, w.try_ = g.y, g = this.project(M - u, A - x, S, this.fPos, this.fQuat, h), w.blx = g.x, w.bly = g.y, g = this.project(M + u, A - x, S, this.fPos, this.fQuat, h), w.brx = g.x, w.bry = g.y, a++;
    }
    const c = st * this.cw, p = st * this.ch;
    Ts(this.slots, a, o, f, l, v, this.cw, this.ch, c, p, this.order, this.labelHistory, this.chromeDt, this.reduced) || (this.dirty = !0);
    let m = 0, b = 0;
    for (const y of this.flying) {
      const w = this.slots[y.slot], M = y.on ? y.chA : 0, u = T(y.lead / 0.5), x = T((y.lead - 0.5) / 0.25), A = T((y.lead - 0.75) / 0.25);
      if (E(t, b++, w.ax, w.ay, 0, R(w.ax, w.ex, u), R(w.ay, w.gy, u), 0, 1, 3, 0, 1, k, M * (y.lead > 0 ? 1 : 0)), E(t, b++, w.ex, w.gy, 0, w.ex, R(w.gy, w.ey, x), 0, 1, 3, 0, 1, k, M * (x > 0 ? 1 : 0)), E(t, b++, w.ex, w.ey, 0, R(w.ex, w.ix, A), w.ey, 0, 1, 3, 0, 1, k, M * (A > 0 ? 1 : 0)), M <= 0) continue;
      const S = r[y.chip], g = -w.side, P = w.side < 0 ? w.ix - S.w : w.ix;
      if (y.chipR > 0 && this.sprite(e, m++, P * this.sx, w.y * this.sy, S.w * this.sx, S.h * this.sy, S, M, y.chipR, g), y.pill >= 0 && y.pillR > 0) {
        const F = r[y.pill], z = w.side < 0 ? w.ix - F.w : w.ix;
        this.sprite(e, m++, z * this.sx, (w.y + K + Zt) * this.sy, F.w * this.sx, F.h * this.sy, F, M, y.pillR, g);
      }
    }
    this.leaderMesh.visible = !0;
    for (const y of t.attrs) y.needsUpdate = !0;
    this.finishSprites(m);
  }
  // ---------------------------------------------------------------- loop
  tick(t) {
    if (this.paused) return;
    const e = this.P.dur[this.tl];
    let r = Math.max(0, (t - this.t0) / 1e3);
    r >= 0 || (r = 0);
    const i = this.tl === "idle";
    if (!i && r > e && (r = e), !(!(i ? !this.reduced : r !== this.t) && !this.dirty && !this.sizeDirty) && !(i && t - this.lastRender < 33 && !this.sizeDirty) && (this.t = r, this.chromeDt = Math.min(0.1, Math.max(0, (t - this.lastRender) / 1e3)), this.sizeDirty && this.measure(), this.emit(r), this.dirty = !1, this.update(t), this.render(), this.lastRender = t, !i && r >= e && !this.done)) {
      this.done = !0;
      const n = this.resolve;
      this.resolve = null, n?.(), this.opts.onDone?.({ timeline: this.tl });
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
    t.tex.dispose(), t.tex = t.next, t.next = null, e.map.value = t.tex, e.mapB.value = t.tex, e.uMix.value = 0, t.smat && (t.smat.uniforms.map.value = t.tex);
  }
  // ---------------------------------------------------------------- public handle
  handle() {
    return {
      play: (e, r) => this.play(e, r?.at),
      setTilt: (e, r) => {
        const i = Math.max(-1, Math.min(1, e || 0)), h = Math.max(-1, Math.min(1, r || 0));
        (i !== this.tiltX || h !== this.tiltY) && (this.tiltX = i, this.tiltY = h, this.dirty = !0);
      },
      setPose: (e) => {
        const r = this.hasPose;
        if (this.hasPose = !!e && e.length >= 16, e && this.hasPose) {
          for (let i = 0; i < 16; i++) this.pose[i] = e[i];
          this.everPose = !0;
        }
        r !== this.hasPose && (this.uFrom = this.u, this.uTo = this.hasPose ? 0 : 1, this.uT0 = performance.now()), this.dirty = !0;
      },
      setProjection: (e, r) => {
        e > 1 && e < 179 && (this.fov = e, this.aspect = r > 0 ? r : 0, this.role === "guest" && this.setCamera());
      },
      replaceLayer: (e, r) => this.replaceLayer(e, r),
      where: () => ({ role: this.role, timeline: this.tl, t: this.t }),
      dispose: () => this.dispose()
    };
  }
  play(t, e) {
    if (!(this.role === "host" ? le : ue).includes(t)) return Promise.reject(new Error(`peel: timeline "${t}" does not belong to role "${this.role}"`));
    if (this.disposed) return Promise.reject(new Error("peel: disposed"));
    const i = this.resolve;
    return this.resolve = null, i?.(), this.tl = t, this.t0 = typeof e == "number" && isFinite(e) ? e : performance.now(), this.t = 0, this.prevT = -1, this.evCursor = 0, this.done = !1, this.dirty = !0, t === "idle" ? new Promise(() => {
    }) : new Promise((h) => {
      this.resolve = h;
    });
  }
  async replaceLayer(t, e) {
    const r = this.sheets.find((h) => h.spec.id === t);
    if (!r) throw new Error(`peel: no layer "${t}"`);
    const i = await Yt(Xt(this.opts.baseUrl, e));
    if (!this.disposed) {
      if (r.img = i, r.qr && (r.grid = Vt(i, this.canvas), r.mat.uniforms.uQr.value.set(r.grid.ox, r.grid.oy, r.grid.nx, r.grid.ny)), this.setTexture(r, i, !0), r.mixT0 = performance.now(), this.dirty = !0, this.paused) {
        this.finishSwap(r);
        return;
      }
      await new Promise((h) => setTimeout(h, 170)), this.disposed || this.finishSwap(r);
    }
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = !0, cancelAnimationFrame(this.raf), this.raf = 0, this.ro?.disconnect(), this.ro = null, this.canvas.removeEventListener("webglcontextlost", this.onLost);
    const t = this.resolve;
    this.resolve = null, t?.();
    for (const e of this.sheets)
      e.tex.dispose(), e.next?.dispose(), e.mat.dispose(), e.smat?.dispose(), e.lmat.dispose();
    this.atlasTex?.dispose(), this.bgMat?.dispose(), this.spriteMat?.dispose(), this.leaderMesh?.material?.dispose();
    for (const e of this.geos) e.dispose();
    this.scene.clear(), this.sheets = [], this.flying = [], this.renderer && (this.renderer.renderLists.dispose(), this.renderer.dispose()), this.usesFont && Ke(), this.usesFont = !1;
  }
}
function _s(s) {
  const t = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(s.trim());
  if (!t) return [0, 0, 0];
  let e = t[1];
  e.length === 3 && (e = e[0] + e[0] + e[1] + e[1] + e[2] + e[2]);
  const r = parseInt(e, 16);
  return [(r >> 16 & 255) / 255, (r >> 8 & 255) / 255, (r & 255) / 255];
}
async function Qs() {
  try {
    if (typeof FontFace > "u" || typeof requestAnimationFrame != "function") return !1;
    const t = (typeof OffscreenCanvas < "u" ? new OffscreenCanvas(1, 1) : document.createElement("canvas")).getContext("webgl2");
    return t ? (t.getExtension("WEBGL_lose_context")?.loseContext(), !0) : !1;
  } catch {
    return !1;
  }
}
function Us(s) {
  return { ...Be(s).dur };
}
function Ws(s, t) {
  return !t || t.role !== "host" && t.role !== "guest" ? Promise.reject(new Error("peel: opts.role must be host or guest")) : !t.layers || !Array.isArray(t.layers.layers) || t.layers.layers.length === 0 ? Promise.reject(new Error("peel: opts.layers is not a layer manifest")) : Ds(s, t);
}
export {
  Us as durations,
  Ws as mount,
  Qs as supported
};
