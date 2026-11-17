import { Vector2 as jt, Vector3 as D, Vector4 as O, BufferGeometry as Nt, BufferAttribute as _, ShaderMaterial as at, Matrix4 as Jt, FrontSide as gs, OneMinusSrcAlphaFactor as bs, OneFactor as Ms, AddEquation as As, CustomBlending as Ss, DoubleSide as Ps, InstancedBufferGeometry as Je, InstancedBufferAttribute as st, DynamicDrawUsage as ts, Group as es, Mesh as q, CanvasTexture as Bt, LinearFilter as he, ClampToEdgeWrapping as Ts, Scene as zs, Camera as Rs, Quaternion as wt, Euler as Fs, WebGLRenderer as ks, Texture as Me, LinearMipmapLinearFilter as Es } from "three";
function G(s, t, e) {
  const i = Math.max(1, Math.round(s)), r = Math.max(1, Math.round(t));
  if (typeof OffscreenCanvas < "u") return new OffscreenCanvas(i, r);
  const o = e.ownerDocument.createElement("canvas");
  return o.width = i, o.height = r, o;
}
function K(s, t = !1) {
  const e = s.getContext("2d", t ? { willReadFrequently: !0 } : void 0);
  if (!e) throw new Error("window: 2D canvas context unavailable");
  return e;
}
function Ae(s, t) {
  const e = new URL(s.endsWith("/") ? s : s + "/", self.location.href);
  return new URL(t, e).href;
}
async function Se(s) {
  const t = new Image();
  t.crossOrigin = "anonymous", t.decoding = "async", t.src = s;
  try {
    await t.decode();
  } catch {
    throw new Error(`window: cannot load layer image ${s}`);
  }
  return t;
}
function Ls(s, t, e, i, r, o, n, h = null, v = 0, d = 0) {
  const a = Math.floor(t + 1e-4), c = Math.floor(e + 1e-4), m = Math.ceil(t + i - 1e-4), x = Math.ceil(e + r - 1e-4), w = Math.max(1, m - a), y = Math.max(1, x - c), M = o.width, l = o.height, u = G(w, y, n), b = K(u, !0);
  b.imageSmoothingEnabled = !1, b.globalCompositeOperation = "copy";
  const f = a >= 0 && c >= 0 && m <= M && x <= l;
  if (!f && h) {
    const P = K(h, !0);
    P.setTransform(1, 0, 0, 1, 0, 0), P.globalCompositeOperation = "source-over", P.imageSmoothingEnabled = !0, P.imageSmoothingQuality = "high", P.clearRect(a - v - 1, c - d - 1, w + 2, y + 2), P.drawImage(s, t - v, e - d, i, r), b.drawImage(h, a - v, c - d, w, y, 0, 0, w, y), P.clearRect(a - v - 1, c - d - 1, w + 2, y + 2);
  }
  const p = Math.max(0, a), g = Math.max(0, c), A = Math.min(M, m), S = Math.min(l, x);
  if (A > p && S > g) {
    const P = K(o, !0);
    P.setTransform(1, 0, 0, 1, 0, 0), P.globalCompositeOperation = "source-over", P.clearRect(p - 1, g - 1, A - p + 2, S - g + 2), P.imageSmoothingEnabled = !0, P.imageSmoothingQuality = "high", P.drawImage(s, t, e, i, r), f || (b.globalCompositeOperation = "source-over", b.clearRect(p - a, g - c, A - p, S - g)), b.drawImage(o, p, g, A - p, S - g, p - a, g - c, A - p, S - g), P.clearRect(p - 1, g - 1, A - p + 2, S - g + 2);
  }
  return { canvas: u, x0: a, y0: c, w, h: y, tu: (t - a) / w, tv: 1 - (e - c + r) / y, tw: i / w, th: r / y };
}
function Pe(s, t) {
  const e = { ox: 0, oy: 0, nx: 25, ny: 25 };
  try {
    const i = Math.min(512, s.naturalWidth || 256), r = Math.min(512, s.naturalHeight || 256), o = G(i, r, t), n = K(o, !0);
    n.imageSmoothingEnabled = !1, n.drawImage(s, 0, 0, i, r);
    const h = n.getImageData(0, 0, i, r).data;
    let v = 255, d = 0;
    const a = new Uint8Array(i * r);
    for (let f = 0; f < i * r; f++) {
      const p = h[f * 4 + 3] / 255, g = Math.round((0.299 * h[f * 4] + 0.587 * h[f * 4 + 1] + 0.114 * h[f * 4 + 2]) * p + 255 * (1 - p));
      a[f] = g, g < v && (v = g), g > d && (d = g);
    }
    if (d - v < 60) return e;
    const c = (v + d) / 2;
    let m = i, x = r, w = -1, y = -1;
    for (let f = 0; f < r; f++) for (let p = 0; p < i; p++)
      a[f * i + p] < c && (p < m && (m = p), p > w && (w = p), f < x && (x = f), f > y && (y = f));
    if (w < 0) return e;
    let M = 0;
    for (; m + M < i && a[x * i + m + M] < c; ) M++;
    const l = M / 7, u = Math.round((w - m + 1) / l);
    if (l < 1.5 || u < 21 || u > 177 || (u - 21) % 4 !== 0) return e;
    const b = (w - m + 1) / u;
    return { ox: m % b / i, oy: x % b / r, nx: i / b, ny: r / b };
  } catch {
    return e;
  }
}
const ye = "WindowMono", Is = `${ye}, ui-monospace, Menlo, Consolas, monospace`;
let Dt = null, Wt = null, Ht = 0;
function Cs() {
  if (Ht++, !Wt) {
    const s = new FontFace(ye, `url(${new URL("./window-mono.woff2", import.meta.url).href})`, { weight: "500", style: "normal" });
    Dt = s, Wt = s.load().then(
      () => {
        document.fonts.add(s);
      },
      () => {
      }
    );
  }
  return Wt;
}
function Bs() {
  Ht--, Ht <= 0 && (Dt && document.fonts.delete(Dt), Dt = null, Wt = null, Ht = 0);
}
const mt = 20, ss = 18, Te = 2, ze = 12, Re = 11, Ds = 14;
function Ws(s, t, e, i) {
  const r = K(G(4, 4, i)), o = (x) => `500 ${x * t}px ${Is}`, n = [];
  let h = 2, v = 2;
  for (const x of s) {
    const w = x.kind === "tag" ? Re : ze, y = x.kind === "tag" ? 0 : 6;
    r.font = o(w);
    let M = x.text;
    const l = (f) => r.measureText(f).width / t + 2 * y <= e;
    if (!l(M)) {
      for (; M.length > 1 && !l(M + "…"); ) M = M.slice(0, -1);
      M += "…";
    }
    const u = Math.ceil(r.measureText(M).width / t + 2 * y), b = x.kind === "chip" ? mt : x.kind === "pill" ? ss : Ds;
    n.push({ w: u, h: b, text: M }), h = Math.max(h, Math.ceil(u * t) + 4), v += Math.ceil(b * t) + 4;
  }
  const d = G(h, v, i), a = K(d), c = [];
  let m = 2;
  return s.forEach((x, w) => {
    const y = n[w], M = Math.ceil(y.w * t), l = Math.ceil(y.h * t), u = x.kind === "tag" ? Re : ze;
    a.font = o(u), a.textBaseline = "alphabetic";
    const b = a.measureText("H").actualBoundingBoxAscent || u * t * 0.72;
    if (x.kind !== "tag") {
      const f = 3 * t;
      a.fillStyle = x.kind === "chip" ? "#2F80FF" : "#FF4D3D", a.beginPath(), a.moveTo(2 + f, m), a.arcTo(2 + M, m, 2 + M, m + l, f), a.arcTo(2 + M, m + l, 2, m + l, f), a.arcTo(2, m + l, 2, m, f), a.arcTo(2, m, 2 + M, m, f), a.closePath(), a.fill();
    }
    a.fillStyle = x.kind === "tag" ? "#2F80FF" : "#FFFFFF", a.fillText(y.text, 2 + (x.kind === "tag" ? 0 : 6 * t), Math.round(m + (l + b) / 2)), c.push({ w: M / t, h: l / t, u0: 2 / h, v0: m / v, u1: (2 + M) / h, v1: (m + l) / v }), m += l + 4;
  }), { canvas: d, entries: c, bytes: h * v * 4 };
}
function Hs() {
  return {
    uRes: { value: new jt(1, 1) },
    uPr: { value: 1 },
    uSafe: { value: [new O(), new O(), new O(), new O()] },
    uOrtho: { value: 1 },
    uSnap: { value: 0 },
    uSide: { value: 2 },
    uBehind: { value: 1 },
    uEye: { value: new D(0, 0, 6) },
    uWin: { value: new jt(0.5, 0.5) },
    uRim: { value: 0 }
  };
}
const Tt = (
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
float windowFade(vec3 p) { return uSide < 1.5 && p.z < 0.0 ? uBehind : 1.0; }`
), nt = (
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
), _s = (
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
), Os = (
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
const vec3 RIM = vec3(0.918, 0.949, 1.0);
const vec3 TINT = vec3(0.624, 0.722, 0.851);
${nt}
${Tt}
vec4 layerTex(vec2 uv) {
  vec4 a = texture2D(map, uv);
  if (uMix > 0.0) a = mix(a, texture2D(mapB, uv), uMix);
  return a;
}
#ifdef WINDOW_QR
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
  if (vFace > 1.5) {
    float lit = 0.5 + 0.5 * dot(normalize(vNo.xy), vec2(-0.64, 0.77));
    float a = uAcr * uOpacity * 0.9;
    gl_FragColor = vec4(RIM * (0.45 + 0.55 * lit) * a, a);
    return;
  }
#ifdef WINDOW_QR
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
  gl_FragColor = c * (uOpacity * windowFade(vP));
}`
), Us = (
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
), qs = (
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
${nt}
${Tt}
float tap(vec2 uv) { return textureLod(map, clamp(uv, 0.0, 1.0), uLod).a; }
void main() {
  if (windowSafe()) discard;
  if (windowDrop(vP)) discard;
  vec2 cuv = (vUv - 0.5) * uGrow + 0.5;
  vec2 r = max(uRad, vec2(1e-4));
  vec2 m = smoothstep(-r, r, cuv) * smoothstep(-r, r, 1.0 - cuv);
  float a = tap(cuv);
#if WINDOW_TAPS > 1
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
), Gs = (
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
), Qs = (
  /* glsl */
  `
uniform float uDash;
uniform float uScreen;
varying vec4 vC;
varying vec3 vL;
varying vec2 vS;
varying vec3 vP;
${nt}
${Tt}
void main() {
  if (windowSafe()) discard;
  if (uScreen < 0.5 && windowDrop(vP)) discard;
  if (vL.z <= 0.0) discard;
  float s = mix(vS.x, vS.y, clamp(vL.x / max(vL.y, 1e-3), 0.0, 1.0));
  if (s > vL.z) discard;
  if (uDash > 0.0 && mod(vL.x + uDash * 0.5, uDash * 2.0) >= uDash) discard;
  gl_FragColor = vC * (uScreen < 0.5 ? windowFade(vP) : 1.0);
}`
), js = (
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
), Ns = (
  /* glsl */
  `
uniform sampler2D map;
varying vec2 vUv;
varying vec2 vQ;
varying vec4 vFx;
${nt}
void main() {
  if (windowSafe()) discard;
  float rv = vFx.z > 0.0 ? vQ.x : 1.0 - vQ.x;
  if (rv > vFx.y || vFx.x <= 0.0) discard;
  gl_FragColor = texture2D(map, vUv) * vFx.x;
}`
), Zs = (
  /* glsl */
  `
void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`
), Xs = (
  /* glsl */
  `
uniform vec3 uColor;
uniform float uAlpha;
${nt}
void main() {
  if (windowSafe()) discard;
  gl_FragColor = vec4(uColor * uAlpha, uAlpha);
}`
), ot = {
  transparent: !0,
  side: Ps,
  depthTest: !1,
  depthWrite: !1,
  blending: Ss,
  blendEquation: As,
  blendSrc: Ms,
  blendDst: bs
};
function Fe(s, t, e) {
  return new at({
    ...ot,
    side: gs,
    defines: e ? { WINDOW_QR: 1 } : {},
    vertexShader: _s,
    fragmentShader: Os,
    uniforms: {
      uRes: s.uRes,
      uPr: s.uPr,
      uSafe: s.uSafe,
      uOrtho: s.uOrtho,
      uSnap: s.uSnap,
      uSide: s.uSide,
      uEye: s.uEye,
      uWin: s.uWin,
      uBehind: s.uBehind,
      uRim: s.uRim,
      uLocal: { value: new Jt() },
      uGain: { value: 1 },
      map: { value: t },
      mapB: { value: t },
      uMix: { value: 0 },
      uBox: { value: new O(0, 0, 1, 1) },
      uOpacity: { value: 1 },
      uAcr: { value: 0 },
      uSweep: { value: 0 },
      uSweepAmt: { value: 0 },
      uZoom: { value: 1 },
      uInner: { value: new D(0, 0, -1) },
      uQr: { value: new O(0, 0, 25, 25) },
      uQrT: { value: new D() },
      uTile: { value: new O(0, 0, 1, 1) }
    }
  });
}
function Vs(s, t, e) {
  return new at({
    ...ot,
    defines: { WINDOW_TAPS: e },
    vertexShader: Us,
    fragmentShader: qs,
    uniforms: {
      uSafe: s.uSafe,
      uSide: s.uSide,
      uEye: s.uEye,
      uWin: s.uWin,
      uBehind: s.uBehind,
      uLocal: { value: new Jt() },
      map: { value: t },
      uBox: { value: new O(0, 0, 1, 1) },
      uGrow: { value: new jt(1, 1) },
      uRad: { value: new jt(0.01, 0.01) },
      uLod: { value: 0 },
      uAlpha: { value: 0 },
      uSlab: { value: 0 },
      uClip: { value: new O(-1e3, -1e3, 1e3, 1e3) }
    }
  });
}
function Ft(s, t) {
  return new at({
    ...ot,
    vertexShader: Gs,
    fragmentShader: Qs,
    uniforms: {
      uRes: s.uRes,
      uPr: s.uPr,
      uSafe: s.uSafe,
      uSnap: { value: 0 },
      uSide: s.uSide,
      uEye: s.uEye,
      uWin: s.uWin,
      uBehind: s.uBehind,
      uLocal: { value: new Jt() },
      uScreen: { value: t ? 1 : 0 },
      uProg: { value: new O(1, 1, 1, 1) },
      uAlpha: { value: new O(1, 1, 1, 1) },
      uDash: { value: 0 }
    }
  });
}
function Ys(s, t) {
  return new at({
    ...ot,
    vertexShader: js,
    fragmentShader: Ns,
    uniforms: { uRes: s.uRes, uSafe: s.uSafe, map: { value: t } }
  });
}
function $s(s) {
  return new at({
    ...ot,
    vertexShader: Zs,
    fragmentShader: Xs,
    uniforms: { uSafe: s.uSafe, uColor: { value: new D() }, uAlpha: { value: 1 } }
  });
}
function Ks() {
  const s = [], t = [], e = [], i = [], r = [], o = (d, a, c, m) => {
    const x = s.length / 3;
    for (let w = 0; w < 4; w++)
      s.push(...d[w]), t.push(...a), e.push(...c[w]), i.push(m);
    r.push(x, x + 1, x + 2, x, x + 2, x + 3);
  }, n = [[0, 0], [1, 0], [1, 1], [0, 1]], h = 0.5;
  o([[-h, -h, 0], [h, -h, 0], [h, h, 0], [-h, h, 0]], [0, 0, 1], n, 0), o([[-h, h, -1], [h, h, -1], [h, -h, -1], [-h, -h, -1]], [0, 0, -1], [[0, 1], [1, 1], [1, 0], [0, 0]], 1), o([[h, -h, -1], [h, h, -1], [h, h, 0], [h, -h, 0]], [1, 0, 0], n, 2), o([[-h, h, -1], [-h, -h, -1], [-h, -h, 0], [-h, h, 0]], [-1, 0, 0], n, 2), o([[h, h, -1], [-h, h, -1], [-h, h, 0], [h, h, 0]], [0, 1, 0], n, 2), o([[-h, -h, -1], [h, -h, -1], [h, -h, 0], [-h, -h, 0]], [0, -1, 0], n, 2);
  const v = new Nt();
  return v.setAttribute("position", new _(new Float32Array(s), 3)), v.setAttribute("normal", new _(new Float32Array(t), 3)), v.setAttribute("uv", new _(new Float32Array(e), 2)), v.setAttribute("aFace", new _(new Float32Array(i), 1)), v.setIndex(r), v;
}
function ke(s = !1) {
  const t = s ? 1 : 0.5, e = new Nt();
  return e.setAttribute("position", new _(new Float32Array([-t, -t, 0, t, -t, 0, t, t, 0, -t, t, 0]), 3)), e.setAttribute("uv", new _(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2)), e.setIndex([0, 1, 2, 0, 2, 3]), e;
}
function kt(s) {
  const t = new Je();
  t.setAttribute("position", new _(new Float32Array([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0]), 3)), t.setIndex([0, 1, 2, 0, 2, 3]);
  const e = new Float32Array(s * 3), i = new Float32Array(s * 3), r = new Float32Array(s * 4), o = new Float32Array(s * 4), n = [
    new st(e, 3),
    new st(i, 3),
    new st(r, 4),
    new st(o, 4)
  ];
  return ["iA", "iB", "iP", "iC"].forEach((h, v) => {
    n[v].setUsage(ts), t.setAttribute(h, n[v]);
  }), t.instanceCount = s, { geometry: t, a: e, b: i, p: r, c: o, attrs: n };
}
function B(s, t, e, i, r, o, n, h, v, d, a, c, m, x = 1) {
  const w = t * 3, y = t * 4;
  s.a[w] = e, s.a[w + 1] = i, s.a[w + 2] = r, s.b[w] = o, s.b[w + 1] = n, s.b[w + 2] = h, s.p[y] = v, s.p[y + 1] = d, s.p[y + 2] = a, s.p[y + 3] = c, s.c[y] = m[0], s.c[y + 1] = m[1], s.c[y + 2] = m[2], s.c[y + 3] = x;
}
function Js(s) {
  const t = new Je();
  t.setAttribute("position", new _(new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]), 3)), t.setIndex([0, 2, 1, 0, 3, 2]);
  const e = new Float32Array(s * 4), i = new Float32Array(s * 4), r = new Float32Array(s * 4), o = [new st(e, 4), new st(i, 4), new st(r, 4)];
  return ["iRect", "iUv", "iFx"].forEach((n, h) => {
    o[h].setUsage(ts), t.setAttribute(n, o[h]);
  }), t.instanceCount = s, { geometry: t, rect: e, uv: i, fx: r, attrs: o };
}
const V = [47 / 255, 128 / 255, 1], Et = [1, 77 / 255, 61 / 255], is = 1.4, it = 14, we = 8, Zt = 7, rs = 2.5, as = 4, ti = 64, Ee = 0.5, te = 0.05, Lt = 2, ee = 34;
function ei(s) {
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
function It(s, t, e, i, r, o) {
  return (e - s) * (o - t) - (i - t) * (r - s);
}
function si(s, t, e, i, r, o, n, h) {
  const v = It(r, o, n, h, s, t), d = It(r, o, n, h, e, i), a = It(s, t, e, i, r, o), c = It(s, t, e, i, n, h);
  return (v > 0 && d < 0 || v < 0 && d > 0) && (a > 0 && c < 0 || a < 0 && c > 0);
}
function os(s) {
  return Math.ceil(s / 2);
}
function ii(s, t) {
  return s > 0 ? (s - 1) * is * t + t + it : 0;
}
function ns(s) {
  return 2 * we + as + 2 * rs * Math.max(0, Math.ceil(s / 2) - 1);
}
const Le = (s, t, e) => s >= t ? Math.floor((s - t) / e + 1e-6) + 1 : 0, Ie = (s, t, e) => s > 0 ? (s - 1) * e + t : 0;
function _t(s, t, e, i, r = 0) {
  for (let o = r + 1; o < t; o++) {
    const n = s[o], h = i(e[n]);
    let v = o - 1;
    for (; v >= r && i(e[s[v]]) > h; )
      s[v + 1] = s[v], v--;
    s[v + 1] = n;
  }
}
let hs = 0, ce = 0, Xt = 0, Vt = 0, le = 0, rt = 0, cs = 0, ls = 0, ft = 0, St = 0, Pt = 0, J = 0, tt = 0, ue = 0, fe = 0, de = 0, ve = 0, us = Zt, fs = Zt;
const vt = (s) => s.zone < 0 ? s.corner < 0 ? s.tlx : s.trx : s.corner < 0 ? s.blx : s.brx, pe = (s) => -vt(s), Ce = (s) => s.tly - Xt - (Vt - s.bly) - 0.08 * (Vt - Xt);
function ri(s, t, e, i, r, o, n, h, v, d) {
  let a = 0, c = 0;
  for (let y = 0; y < t; y++)
    s[y].bh > a && (a = s[y].bh), s[y].bw > c && (c = s[y].bw);
  hs = h, ce = d, Xt = i, Vt = o, le = a, rt = is * a, ft = Math.min(ti, Math.max(ns(t), n - 2 * v - 2 * c));
  const m = v + c + ft / 2, x = n - v - c - ft / 2, w = m <= x ? Math.min(x, Math.max(m, (e + r) / 2)) : n / 2;
  cs = w - ft / 2, ls = w + ft / 2, St = Le(i - it - d, a, rt), Pt = Le(h - d - o - it, a, rt);
}
const Be = (s) => s > 1 ? Math.min(Zt, Math.max(rs, (ft - 2 * we - as) / (2 * (s - 1)))) : Zt;
function me(s) {
  const t = s.side < 0 ? cs : ls, e = s.zone < 0;
  s.ix = t, s.x = s.side < 0 ? t - s.bw : t, s.y = e ? ue - s.bh - s.row * rt : fe + s.row * rt, s.ex = t - s.side * (we + (e ? us : fs) * s.row), s.ey = s.y + mt / 2, s.gy = e ? de : ve;
  const i = s.corner < 0 ? s.tlx : s.trx, r = s.corner < 0 ? s.tly : s.try_, o = s.corner < 0 ? s.blx : s.brx, n = s.corner < 0 ? s.bly : s.bry;
  if (e) {
    const h = r < de + 1 && n > r;
    s.ax = h ? o : i, s.ay = h ? n : r;
  } else {
    const h = n > ve - 1 && r < n;
    s.ax = h ? i : o, s.ay = h ? r : n;
  }
}
function Yt(s, t) {
  J = tt = 0;
  for (let e = 0; e < t; e++) {
    const i = s[e];
    i.zone < 0 ? i.row + 1 > J && (J = i.row + 1) : i.row + 1 > tt && (tt = i.row + 1);
  }
  ue = Math.max(Xt - it, ce + Ie(J, le, rt)), fe = Math.min(Vt + it, hs - ce - Ie(tt, le, rt)), de = ue + it * 0.55, ve = fe - it * 0.55, us = Be(J), fs = Be(tt);
  for (let e = 0; e < t; e++) me(s[e]);
}
function ds(s, t) {
  for (let e = 0; e < 3; e++) {
    const i = e === 0 ? s.ax : s.ex, r = e === 0 ? s.ay : e === 1 ? s.gy : s.ey, o = e === 2 ? s.ix : s.ex, n = e === 0 ? s.gy : s.ey;
    for (let h = 0; h < 3; h++) {
      const v = h === 0 ? t.ax : t.ex, d = h === 0 ? t.ay : h === 1 ? t.gy : t.ey, a = h === 2 ? t.ix : t.ex, c = h === 0 ? t.gy : t.ey;
      if (si(i, r, o, n, v, d, a, c)) return !0;
    }
  }
  return !1;
}
function vs(s, t) {
  let e = 0;
  for (let i = 0; i < t; i++) for (let r = i + 1; r < t; r++) ds(s[i], s[r]) && e++;
  return e;
}
function De(s, t, e) {
  for (let i = 0; i < e; i++) {
    let r = !1;
    for (let o = 0; o < t; o++) for (let n = o + 1; n < t; n++) {
      const h = s[o], v = s[n];
      if (!ds(h, v)) continue;
      const d = h.zone, a = h.side, c = h.row;
      h.zone = v.zone, h.side = v.side, h.row = v.row, v.zone = d, v.side = a, v.row = c, me(h), me(v), r = !0;
    }
    if (!r) return 0;
  }
  return vs(s, t);
}
function ai(s, t, e) {
  return oi(s, t, e), Yt(s, t), De(s, t, 16) === 0 ? 0 : (ni(s, t, e), Yt(s, t), De(s, t, 48) === 0 ? 1 : 2);
}
function oi(s, t, e) {
  for (let i = -1; i <= 1; i += 2) {
    let r = 0;
    for (let d = 0; d < t; d++) s[d].corner === i && (e[r++] = d);
    if (r === 0) continue;
    const o = os(r), n = Math.min(St, Math.max(o, r - Pt)), h = Math.min(Pt, Math.max(o, r - St));
    _t(e, r, s, Ce);
    let v = 0;
    for (let d = 0; d < r; d++) Ce(s[e[d]]) <= 0 && v++;
    v = Math.min(v, n), r - v > h && (v = Math.min(r, Math.max(v, r - h, n + h >= r ? 0 : Math.round(r * n / Math.max(1, n + h)))));
    for (let d = 0; d < r; d++) {
      const a = s[e[d]];
      a.zone = d < v ? -1 : 1, a.side = i;
    }
    _t(e, v, s, i < 0 ? vt : pe), _t(e, r, s, i < 0 ? vt : pe, v);
    for (let d = 0; d < r; d++) s[e[d]].row = d < v ? d : d - v;
  }
}
function ni(s, t, e) {
  const i = Pt > St ? 1 : -1;
  let r = 0, o = 0;
  for (let n = 0; n < t; n++)
    s[n].zone = i, s[n].side = s[n].corner, s[n].corner < 0 ? r++ : o++;
  for (; Math.abs(r - o) > 1; ) {
    const n = r > o ? -1 : 1;
    let h = -1, v = -1e9;
    for (let d = 0; d < t; d++) {
      if (s[d].side !== n) continue;
      const a = n < 0 ? vt(s[d]) : -vt(s[d]);
      a > v && (v = a, h = d);
    }
    s[h].side = -n, n < 0 ? (r--, o++) : (o--, r++);
  }
  for (let n = -1; n <= 1; n += 2) {
    let h = 0;
    for (let v = 0; v < t; v++) s[v].side === n && (e[h++] = v);
    _t(e, h, s, n < 0 ? vt : pe);
    for (let v = 0; v < h; v++) s[e[v]].row = v;
  }
}
function hi(s = 8) {
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
let Ot = 0;
function se(s, t, e, i) {
  const r = s - e, o = (t + ee * r) * i, n = Math.exp(-ee * i);
  return Ot = (t - ee * o) * n, e + (r + o) * n;
}
const ie = (s, t) => t - s > Lt ? t - Lt : s - t > Lt ? t + Lt : s;
function ci(s, t, e, i, r, o, n, h, v, d, a, c, m, x) {
  ri(s, t, e, i, r, o, n, h, v, d);
  const w = ai(s, t, a), y = c.box;
  if (!c.valid || c.n !== t) {
    for (let f = 0; f < t; f++) {
      const p = s[f];
      c.zone[f] = p.zone, c.side[f] = p.side, c.row[f] = p.row, c.hx[f] = c.px[f] = p.x, c.hy[f] = c.py[f] = p.y, c.hr[f] = c.pr[f] = p.ex, c.vx[f] = c.vy[f] = c.vr[f] = 0;
    }
    return y[0] = e, y[1] = i, y[2] = r, y[3] = o, c.valid = !0, c.n = t, c.sinceSwap = Ee, c.still = te, c.swaps = 0, c.level = w, !0;
  }
  const M = Math.abs(e - y[0]) + Math.abs(i - y[1]) + Math.abs(r - y[2]) + Math.abs(o - y[3]) > 0.01;
  c.still = M ? 0 : c.still + m, c.sinceSwap += m, y[0] = e, y[1] = i, y[2] = r, y[3] = o;
  let l = !0;
  for (let f = 0; f < t; f++) (s[f].zone !== c.zone[f] || s[f].side !== c.side[f] || s[f].row !== c.row[f]) && (l = !1);
  if (l)
    c.level = w;
  else {
    let f = c.sinceSwap < Ee && c.still < te;
    if (f) {
      const p = J, g = tt;
      for (let A = 0; A < t; A++) {
        const S = s[A];
        c.tz[A] = S.zone, c.ts[A] = S.side, c.tr[A] = S.row, S.zone = c.zone[A], S.side = c.side[A], S.row = c.row[A];
      }
      if (Yt(s, t), f = vs(s, t) === 0 && J <= Math.max(St, p) && tt <= Math.max(Pt, g), !f) {
        for (let A = 0; A < t; A++)
          s[A].zone = c.tz[A], s[A].side = c.ts[A], s[A].row = c.tr[A];
        Yt(s, t);
      }
    }
    if (!f) {
      for (let p = 0; p < t; p++)
        c.zone[p] = s[p].zone, c.side[p] = s[p].side, c.row[p] = s[p].row;
      c.swaps++, c.sinceSwap = 0, c.level = w;
    }
  }
  const u = c.still >= te;
  let b = u;
  for (let f = 0; f < t; f++) {
    const p = s[f];
    c.hx[f] = u ? p.x : ie(c.hx[f], p.x), c.hy[f] = u ? p.y : ie(c.hy[f], p.y), c.hr[f] = u ? p.ex : ie(c.hr[f], p.ex), x ? (c.px[f] = c.hx[f], c.py[f] = c.hy[f], c.pr[f] = c.hr[f], c.vx[f] = c.vy[f] = c.vr[f] = 0) : (c.px[f] = se(c.px[f], c.vx[f], c.hx[f], m), c.vx[f] = Ot, c.py[f] = se(c.py[f], c.vy[f], c.hy[f], m), c.vy[f] = Ot, c.pr[f] = se(c.pr[f], c.vr[f], c.hr[f], m), c.vr[f] = Ot), p.ix += c.px[f] - p.x, p.x = c.px[f], p.y = c.py[f], p.ey = p.y + mt / 2, p.ex = c.pr[f], Math.abs(c.px[f] - c.hx[f]) + Math.abs(c.py[f] - c.hy[f]) + Math.abs(c.pr[f] - c.hr[f]) > 0.02 ? b = !1 : u && (p.ix += c.hx[f] - p.x, p.x = c.px[f] = c.hx[f], p.y = c.py[f] = c.hy[f], p.ex = c.pr[f] = c.hr[f], p.ey = p.y + mt / 2, c.vx[f] = c.vy[f] = c.vr[f] = 0);
  }
  return b;
}
const ps = 0.45, li = 1.2, ms = 0.8, Ut = 1.2, xs = 1, ui = 5, Ct = 0.28, We = 1.12, z = (s) => s < 0 ? 0 : s > 1 ? 1 : s, C = (s, t, e) => s + (t - s) * e, R = (s, t, e) => {
  const i = z((e - s) / (t - s));
  return i * i * (3 - 2 * i);
}, Z = (s) => (s = z(s), s < 0.5 ? 4 * s * s * s : 1 - Math.pow(-2 * s + 2, 3) / 2), fi = (s, t = 0.9) => {
  const e = z(s) - 1;
  return 1 + (t + 1) * e * e * e + t * e * e;
}, qt = 256, re = new Float64Array(qt + 1);
(() => {
  const r = (n) => 3 * (1 - n) * (1 - n) * n * 0.16 + 3 * (1 - n) * n * n * 0.3 + n * n * n, o = (n) => 3 * (1 - n) * (1 - n) * n * 1 + 3 * (1 - n) * n * n * 1 + n * n * n;
  for (let n = 0; n <= qt; n++) {
    const h = n / qt;
    let v = 0, d = 1;
    for (let a = 0; a < 40; a++) {
      const c = (v + d) / 2;
      r(c) < h ? v = c : d = c;
    }
    re[n] = o((v + d) / 2);
  }
  re[0] = 0, re[qt] = 1;
})();
const ae = 3, j = 1.2, ys = 1.2, He = 0.25, di = 0.2, vi = 1.4, _e = j + ys, Oe = 2.5, F = 0.5, H = 0.25, $t = 0.35, Y = F + H + $t, Kt = 0.1, pi = 0.06, mi = 0.77, xi = 0.1;
function At(s, t) {
  if (s <= 0 || t <= 1) return -2.98;
  const e = Math.min(di, (vi - He) / Math.max(1, t - 2));
  return -(He + (t - 1 - s) * e);
}
function Ue(s, t, e) {
  if (e <= j) return -0.6 * Z(e / j);
  const i = t > 1 ? 0.3 * (s / (t - 1)) : 0;
  return C(-0.6, At(s, t), Z((e - j - i) / (ys - 0.3)));
}
function qe(s) {
  return Math.min(xi, 0.5 * s);
}
const xe = (s, t, e, i, r) => {
  const o = s * s, n = o * s;
  return (2 * n - 3 * o + 1) * t + (n - 2 * o + s) * e + (-2 * n + 3 * o) * i + (n - o) * r;
};
function yi(s, t, e, i) {
  if (s <= 0) return t;
  const r = 2 * i / H;
  if (s < F) return xe(s / F, t, 0, -i, r * F);
  if (s < F + H) return -i + r * (s - F);
  const o = pi * (e - i), n = $t * mi, h = s - F - H;
  return h < n ? xe(h / n, i, r * n, e + o, 0) : s < Y + Kt ? e + o * (0.5 + 0.5 * Math.cos(Math.PI * (h - n) / ($t - n + Kt))) : e;
}
function wi(s) {
  return s <= F - 0.25 || s >= Y ? 0 : s < F ? R(F - 0.25, F, s) : s <= F + H ? 1 : 1 - R(F + H, Y, s);
}
const Gt = 1.8, gi = 0.42, N = 0.2, pt = 0.3, Qt = 0.92, dt = 1.2, et = 1.5, Ge = 1.3;
function Qe(s, t, e, i, r) {
  const o = e - i, n = 0.4 * At(s, t);
  let h;
  return o < N ? h = r - 2 * r / N * o : o < N + pt ? h = xe((o - N) / pt, -r, -(2 * r / N) * pt, n, 0) : h = n, e > Qt && (h = C(h, -0.6, Z((e - Qt) / (dt - Qt)))), e > dt && (h = C(-0.6, 0, Z((e - dt) / (et - dt)))), e >= et ? 0 : h;
}
function bi(s) {
  return s <= 0 || s < N ? 1 : 1 - R(N, N + pt, s);
}
function Mi(s) {
  let t = 0;
  for (const e of s.layers) e.role !== "qr" && t++;
  return t;
}
function ws(s) {
  const t = Mi(s), e = _e + Oe + Y + Kt + ps + li, i = new Float64Array(t), r = new Float64Array(t), o = new Float64Array(t), n = 0.55;
  for (let h = 0; h < t; h++)
    i[h] = _e + (t > 1 ? h * Oe / (t - 1) : 0), r[h] = t > 1 ? h * gi / (t - 1) : 0, o[h] = t > 1 ? h * 0.35 / (t - 1) : 0;
  return {
    n: t,
    start: i,
    rebuildStart: r,
    assembleStart: o,
    assembleDrop: n,
    dur: { idle: 0, connect: ms, depart: e, rebuild: Gt, explode: e, fly: Ut, assemble: xs }
  };
}
const je = ["idle", "connect", "depart", "rebuild"], Ne = ["explode", "fly", "assemble"], $ = 8, Ai = (
  /* glsl */
  `
attribute vec2 aWall;
attribute float aSide;
varying vec3 vP;
varying vec2 vW;
varying float vSide;
void main() {
  vP = position;
  vW = aWall;
  vSide = aSide;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`
), Si = (
  /* glsl */
  `
uniform sampler2D uEdge;
uniform vec3 uBg;
uniform vec3 uPanel;
uniform float uDepth;
uniform float uH;
uniform float uRuler;
uniform float uDetail;
uniform float uLit;
uniform float uAlpha;
uniform float uShadow;
uniform int uSheets;
uniform vec4 uSheet[${$}];
uniform float uSheetZ[${$}];
uniform float uSheetA[${$}];
uniform float uInk;
varying vec3 vP;
varying vec2 vW;
varying float vSide;
const vec3 RIM = vec3(0.918, 0.949, 1.0);
${nt}
${Tt}
void main() {
  if (windowSafe()) discard;
  if (windowDrop(vP)) discard;
  vec3 col;
  if (vSide > 3.5) {
    // the back panel: a soft glow of the card colour, dimmer towards its corners; unlit it is a wall
    vec2 q = (vW - 0.5) * vec2(1.0, uH);
    float glow = 1.0 - 0.3 * smoothstep(0.15, 0.5 * length(vec2(1.0, uH)), length(q));
    col = mix(uInk > 0.0 ? uBg * 1.12 : uBg * 0.8, uPanel * glow, uLit);
  } else {
    // the card's own edge, extruded into depth; never darker than the card background
    float m = 0.012;
    vec2 e = vSide < 0.5 ? vec2(vW.x, m) : vSide < 1.5 ? vec2(vW.x, 1.0 - m) : vSide < 2.5 ? vec2(m, vW.x) : vec2(1.0 - m, vW.x);
    vec3 edge = max(texture2D(uEdge, e).rgb, uBg);
    float d = -vP.z;
    // one soft light from the opening, and the panel's light at the far end once it is uncovered
    float front = exp(-d / 0.55);
    float back = uLit * exp(-(uDepth - d) / 0.7);
    // a dark card is lit (never darker than its background); a light card can only be shaded with depth
    col = uInk > 0.0 ? edge * (1.12 + 0.95 * front) + uPanel * (0.07 * front + 0.3 * back) : edge * (0.72 + 0.26 * front + 0.14 * back);
    // rulers every 100 design px of depth, stronger every 500; they thin out where they would alias
    float r = d / uRuler;
    float fw = max(fwidth(r), 1e-5);
    float minor = (1.0 - smoothstep(0.5, 1.5, abs(fract(r + 0.5) - 0.5) / fw)) * (1.0 - smoothstep(0.2, 0.45, fw));
    float r5 = r / 5.0;
    float fw5 = max(fwidth(r5), 1e-5);
    float major = (1.0 - smoothstep(0.6, 1.8, abs(fract(r5 + 0.5) - 0.5) / fw5)) * (1.0 - smoothstep(0.25, 0.5, fw5));
    float tick = step(0.5, r) * uDetail * max(0.07 * minor, 0.2 * major);
    col = uInk > 0.0 ? col + RIM * tick : mix(col, vec3(0.12, 0.14, 0.17), tick * 1.6);
    // a soft band of shadow where a sheet hangs near this wall: full at the sheet, trailing away behind it
    float sh = 0.0;
    for (int i = 0; i < ${$}; i++) {
      if (i >= uSheets) break;
      vec4 s = uSheet[i];
      float gap = vSide < 0.5 ? s.y + 0.5 * uH : vSide < 1.5 ? 0.5 * uH - s.w : vSide < 2.5 ? s.x + 0.5 : 0.5 - s.z;
      float along = vSide < 1.5 ? vP.x : vP.y;
      vec2 span = vSide < 1.5 ? s.xz : s.yw;
      float cover = smoothstep(span.x - 0.03, span.x + 0.03, along) * (1.0 - smoothstep(span.y - 0.03, span.y + 0.03, along));
      float dz = vP.z - uSheetZ[i];
      float fall = dz < 0.0 ? exp(dz / (0.12 + 0.8 * gap)) : exp(-dz / 0.015);
      sh = 1.0 - (1.0 - sh) * (1.0 - 0.95 * exp(-gap / 0.22) * cover * fall * uSheetA[i]);
    }
    col = mix(col, uInk > 0.0 ? uBg : col * 0.72, uShadow * sh);
  }
  gl_FragColor = vec4(col * uAlpha, uAlpha);
}`
), Pi = (
  /* glsl */
  `
varying vec3 vP;
varying vec2 vUv;
void main() {
  vP = position;
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`
), Ti = (
  /* glsl */
  `
uniform sampler2D map;
uniform float uAlpha;
uniform float uInk;
uniform float uReach;
varying vec3 vP;
varying vec2 vUv;
const vec3 RIM = vec3(0.918, 0.949, 1.0);
${nt}
${Tt}
void main() {
  if (windowSafe()) discard;
  if (windowDrop(vP)) discard;
  // a flag behind the bottom sheet is hidden by it
  if (-vP.z > uReach) discard;
  float a = texture2D(map, vUv).a * uAlpha;
  gl_FragColor = vec4((uInk > 0.0 ? RIM : vec3(0.12, 0.14, 0.17)) * a, a);
}`
);
function zi(s) {
  const t = (e) => e <= 0.04045 ? e / 12.92 : Math.pow((e + 0.055) / 1.055, 2.4);
  return 0.2126 * t(s[0]) + 0.7152 * t(s[1]) + 0.0722 * t(s[2]);
}
function Ri(s) {
  return [s[0] + (0.918 - s[0]) * 0.5, s[1] + (0.949 - s[1]) * 0.5, s[2] + (1 - s[2]) * 0.5];
}
class Fi {
  group = new es();
  geos = [];
  wallMat;
  textMat = null;
  edge;
  glyphs = null;
  walls;
  text = null;
  /** uniform arrays, written in place every frame */
  sheet = [];
  sheetZ = new Float32Array($);
  sheetA = new Float32Array($);
  /** true on a dark card: the room is lit and nothing in it is darker than the card background */
  lit;
  bytes;
  constructor(t) {
    const e = t.cardH, i = t.depth, r = 0.5, o = e / 2, n = 256, h = Math.max(2, Math.round(n * e)), v = G(n, h, t.ref), d = K(v, !0);
    d.fillStyle = t.background, d.fillRect(0, 0, n, h), d.imageSmoothingEnabled = !0, d.imageSmoothingQuality = "high";
    const a = n / t.cardW;
    for (const g of t.layers) d.drawImage(g.img, g.x * a, g.y * a, g.w * a, g.h * a);
    this.edge = Ze(v);
    let c = n * h * 4;
    const m = [], x = [], w = [], y = [], M = (g, A, S) => {
      const P = m.length / 3;
      for (let T = 0; T < 4; T++)
        m.push(A[T][0], A[T][1], A[T][2]), x.push(S[T][0], S[T][1]), w.push(g);
      y.push(P, P + 1, P + 2, P, P + 2, P + 3);
    }, l = [[0, 0], [1, 0], [1, 1], [0, 1]];
    M(0, [[-r, -o, 0], [r, -o, 0], [r, -o, -i], [-r, -o, -i]], l), M(1, [[-r, o, 0], [r, o, 0], [r, o, -i], [-r, o, -i]], l), M(2, [[-r, -o, 0], [-r, o, 0], [-r, o, -i], [-r, -o, -i]], l), M(3, [[r, -o, 0], [r, o, 0], [r, o, -i], [r, -o, -i]], l), M(4, [[-r, -o, -i], [r, -o, -i], [r, o, -i], [-r, o, -i]], l);
    const u = new Nt();
    u.setAttribute("position", new _(new Float32Array(m), 3)), u.setAttribute("aWall", new _(new Float32Array(x), 2)), u.setAttribute("aSide", new _(new Float32Array(w), 1)), u.setIndex(y), this.geos.push(u);
    for (let g = 0; g < $; g++) this.sheet.push(new O());
    this.lit = zi(t.bg) < 0.35;
    const b = t.shared, f = this.lit ? Ri(t.bg) : [t.bg[0], t.bg[1], t.bg[2]];
    this.wallMat = new at({
      ...ot,
      vertexShader: Ai,
      fragmentShader: Si,
      uniforms: {
        uSafe: b.uSafe,
        uSide: b.uSide,
        uEye: b.uEye,
        uWin: b.uWin,
        uBehind: b.uBehind,
        uEdge: { value: this.edge },
        uBg: { value: new D(t.bg[0], t.bg[1], t.bg[2]) },
        uPanel: { value: new D(f[0], f[1], f[2]) },
        uDepth: { value: i },
        uH: { value: e },
        uRuler: { value: t.ruler },
        uDetail: { value: t.detail },
        uLit: { value: 0 },
        uAlpha: { value: 1 },
        uShadow: { value: t.shadows ? 0.85 : 0 },
        uSheets: { value: 0 },
        uSheet: { value: this.sheet },
        uSheetZ: { value: this.sheetZ },
        uSheetA: { value: this.sheetA },
        uInk: { value: this.lit ? 1 : -1 }
      }
    }), this.walls = new q(u, this.wallMat), this.walls.frustumCulled = !1, this.walls.matrixAutoUpdate = !1, this.walls.renderOrder = 1, this.group.add(this.walls);
    const p = t.detail >= 1 ? Math.floor(i / (5 * t.ruler) + 1e-6) : 0;
    if (p > 0) {
      const S = G(96, 32 * p, t.ref), P = K(S);
      P.clearRect(0, 0, 96, 32 * p), P.fillStyle = "#fff", P.font = `500 22px ${t.font}`, P.textBaseline = "middle";
      const T = [];
      for (let L = 0; L < p; L++) {
        const Q = String((L + 1) * 500);
        T.push(Math.min(96, Math.ceil(P.measureText(Q).width) + 4)), P.fillText(Q, 2, 32 * L + 32 / 2 + 1);
      }
      this.glyphs = Ze(S), c += 3072 * p * 4;
      const X = [], xt = [], I = [], k = 0.042, E = 0.022, W = (L, Q, ht, zt) => {
        const ct = X.length / 3, ge = 1 - (L + 1) / p, be = 1 - L / p, Rt = -o + E;
        X.push(Q, Rt, zt, Q + ht, Rt, zt, Q + ht, Rt + k, zt, Q, Rt + k, zt), xt.push(0, ge, T[L] / 96, ge, T[L] / 96, be, 0, be), I.push(ct, ct + 1, ct + 2, ct, ct + 2, ct + 3);
      };
      for (let L = 0; L < p; L++) {
        const Q = -(L + 1) * 5 * t.ruler, ht = k * T[L] / 32;
        W(L, -r + E, ht, Q), W(L, r - E - ht, ht, Q);
      }
      const yt = new Nt();
      yt.setAttribute("position", new _(new Float32Array(X), 3)), yt.setAttribute("uv", new _(new Float32Array(xt), 2)), yt.setIndex(I), this.geos.push(yt), this.textMat = new at({
        ...ot,
        vertexShader: Pi,
        fragmentShader: Ti,
        uniforms: {
          uSafe: b.uSafe,
          uSide: b.uSide,
          uEye: b.uEye,
          uWin: b.uWin,
          uBehind: b.uBehind,
          map: { value: this.glyphs },
          uAlpha: { value: 0.7 },
          uInk: { value: this.lit ? 1 : -1 },
          uReach: { value: 1e3 }
        }
      }), this.text = new q(yt, this.textMat), this.text.frustumCulled = !1, this.text.matrixAutoUpdate = !1, this.text.renderOrder = 100, this.group.add(this.text);
    }
    this.group.matrixAutoUpdate = !1, this.bytes = c;
  }
  /**
   * alpha: how much of the cavity shows; lit: how much of the back panel is uncovered; sheets: how many
   * shadow entries are filled; reach: how deep the room can be seen (the depth of the bottom sheet while it is inside).
   */
  set(t, e, i, r) {
    const o = this.wallMat.uniforms;
    this.group.visible = t > 0, o.uAlpha.value = t, o.uLit.value = e, o.uSheets.value = i, this.textMat && (this.textMat.uniforms.uAlpha.value = 0.7 * t, this.textMat.uniforms.uReach.value = r);
  }
  dispose() {
    for (const t of this.geos) t.dispose();
    this.wallMat.dispose(), this.textMat?.dispose(), this.edge.dispose(), this.glyphs?.dispose();
  }
}
function Ze(s) {
  const t = new Bt(s);
  return t.premultiplyAlpha = !0, t.generateMipmaps = !1, t.minFilter = t.magFilter = he, t.wrapS = t.wrapT = Ts, t;
}
const U = 0.012, lt = 0.08, ut = 0.11, gt = 0.035, oe = 10 * Math.PI / 180, Xe = 12 * Math.PI / 180, bt = 6, Ve = 25 * Math.PI / 180, Ye = 300, ki = 0.45, Mt = 0.08, $e = 0.04, Ke = {
  high: { dpr: 2, tex: 2048, taps: 5, sweep: !0, aniso: 4, mem: 64 },
  mid: { dpr: 1.5, tex: 1536, taps: 1, sweep: !0, aniso: 2, mem: 40 },
  low: { dpr: 1, tex: 1024, taps: 0, sweep: !1, aniso: 1, mem: 24 },
  test: { dpr: 1, tex: 2048, taps: 5, sweep: !0, aniso: 4, mem: 64 }
};
async function Ei(s, t) {
  const e = new Li(s, t);
  try {
    await e.init();
  } catch (i) {
    throw e.dispose(), i;
  }
  return e.handle();
}
class Li {
  constructor(t, e) {
    this.canvas = t, this.opts = e, this.role = e.role, this.tier = Ke[e.quality] ?? Ke.mid, this.reduced = !!e.reduced, this.m = e.layers, this.P = ws(this.m), this.cardH = this.m.card.h / this.m.card.w, this.tl = this.role === "host" ? "idle" : "explode", this.t0 = this.role === "host" ? performance.now() : 1 / 0;
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
  scene = new zs();
  camera = new Rs();
  frame = new es();
  shared = Hs();
  sheets = [];
  flying = [];
  slots = [];
  /** the only state that outlives a frame: where the label blocks were (contract v1.1) */
  labelHistory = hi();
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
  aPos = new D();
  aQuat = new wt();
  vPos = new D(0, 0, -6);
  vQuat = new wt();
  sPos = new D();
  sScaleY = 1;
  fPos = new D();
  fQuat = new wt();
  fScl = new D(1, 1, 1);
  bgA = 0;
  // the window
  cavity = null;
  /** a sheet in the card background behind the bottom layer, so the stack is opaque until that layer leaves */
  backing = null;
  backMat = null;
  backTex = null;
  /** host: the eye this frame is drawn for (card space), the viewer last given, and the blend between tilt eye (0) and viewer (1) */
  eye = new D(0, 0, bt);
  viewer = new D(0, 0, bt);
  hasViewer = !1;
  w = 0;
  wFrom = 0;
  wTo = 0;
  wT0 = -1e9;
  /** host: this frame is drawn through the eye (depart, rebuild) rather than flat */
  persp = !1;
  /** how much of the cavity shows, how much of its back panel is uncovered, opacity of the backing */
  cavA = 0;
  lit = 0;
  backA = 0;
  backZ = 0;
  backGain = 1;
  /** guest: the hairline around the opening, drawn when the guest is alone */
  rim = null;
  /** guest: nothing is drawn before the first play */
  started = !1;
  /** test: the guest draws what is behind the glass, as the host does, but directly in 3D in the pose it is given (the reference of `window-truth`) */
  direct = !1;
  euler = new Fs();
  u = 1;
  spread = 1;
  // scratch
  v = new D();
  v2 = new D();
  q = new wt();
  qi = new wt();
  mat = new Jt();
  box = [0, 0, 0, 0];
  onLost = (t) => {
    t.preventDefault(), cancelAnimationFrame(this.raf), this.raf = 0, this.opts.onLost?.("WebGL context lost");
  };
  loop = (t) => {
    this.disposed || (this.raf = requestAnimationFrame(this.loop), this.tick(t));
  };
  // ---------------------------------------------------------------- setup
  async init() {
    this.renderer = new ks({
      canvas: this.canvas,
      alpha: !0,
      antialias: !0,
      premultipliedAlpha: !0,
      depth: !1,
      stencil: !1,
      preserveDrawingBuffer: !1,
      powerPreference: "high-performance"
    }), this.renderer.setPixelRatio(1), this.renderer.setClearColor(0, 0), this.canvas.addEventListener("webglcontextlost", this.onLost);
    const e = this.m.layers.map((l, u) => ({ spec: l, i: u })).sort((l, u) => l.spec.z - u.spec.z || l.i - u.i);
    this.usesFont = !0;
    const [i] = await Promise.all([
      Promise.all(e.map((l) => Se(Ae(this.opts.baseUrl, l.spec.src)))),
      Cs()
    ]);
    if (this.disposed) return;
    let r = 0;
    for (const l of e) l.spec.role !== "qr" && (r = Math.max(r, l.spec.z));
    const o = Ks(), n = ke(), h = ke(!0);
    this.geos.push(o, n, h);
    const v = this.P.n;
    let d = 0;
    const a = [];
    e.forEach((l, u) => {
      const b = l.spec.role === "qr", f = new Me(), p = Fe(this.shared, f, b), g = new q(o, p), A = this.tier.taps, S = A > 0 ? Vs(this.shared, f, A) : null, P = S ? new q(n, S) : null, T = kt(11), X = Ft(this.shared, !1), xt = new q(T.geometry, X);
      this.geos.push(T.geometry);
      const I = {
        i: l.i,
        spec: l.spec,
        qr: b,
        j: b ? -1 : d,
        k: b ? -1 : v - 1 - d,
        zn: r > 0 ? Math.min(1, l.spec.z / r) : 0,
        recv: -1,
        dupe: 0,
        slot: -1,
        chip: -1,
        pill: -1,
        img: i[u],
        tex: f,
        next: null,
        mixT0: 0,
        grid: b ? Pe(i[u], this.canvas) : null,
        bx: 0,
        by: 0,
        bw: 1,
        bh: 1,
        rx: 0,
        ry: 0,
        rw: 1,
        rh: 1,
        lever: 0.5,
        axis: 0,
        res: null,
        resMat: null,
        gain: 1,
        rs: 0,
        rsA: 0,
        mesh: g,
        mat: p,
        shadow: P,
        smat: S,
        lines: xt,
        lmat: X,
        lset: T,
        on: !0,
        op: 1,
        ox: 0,
        oy: 0,
        z: 0,
        sc: 1,
        acr: 0,
        sweep: 0,
        tilt: 0,
        qT: 0,
        qLift: 0,
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
      if (!b && this.role === "guest") {
        const k = kt(4);
        this.geos.push(k.geometry), ne(k, 1.25, 0.9);
        for (const E of k.attrs) E.needsUpdate = !0;
        I.resMat = Ft(this.shared, !1), I.res = new q(k.geometry, I.resMat);
      }
      for (const k of [g, P, xt, I.res])
        k && (k.matrixAutoUpdate = !1, k.frustumCulled = !1, this.frame.add(k));
      if (!b) {
        for (let k = this.flying.length - 1; k >= 0; k--) {
          const E = this.flying[k].spec.rect, W = l.spec.rect;
          if (W.x >= E.x - 1 && W.y >= E.y - 1 && W.x + W.w <= E.x + E.w + 1 && W.y + W.h <= E.y + E.h + 1) {
            I.recv = this.sheets.indexOf(this.flying[k]);
            break;
          }
        }
        for (const k of this.flying) {
          const E = k.spec.rect, W = l.spec.rect;
          Math.abs(W.x - E.x) < 1 && Math.abs(W.y - E.y) < 1 && Math.abs(W.w - E.w) < 1 && Math.abs(W.h - E.h) < 1 && I.dupe++;
        }
        I.slot = this.slots.length, this.slots.push(ei(d % 2 === 0 ? -1 : 1)), I.chip = a.length, a.push({ text: l.spec.label ?? l.spec.name, kind: "chip" }), l.spec.dims && (I.pill = a.length, a.push({ text: l.spec.dims, kind: "pill" })), this.flying.push(I), d++;
      }
      this.sheets.push(I), this.buildLines(I);
    }), this.atlasItems = a, this.bgMat = $s(this.shared);
    const c = Ci(this.m.card.background);
    this.bgMat.uniforms.uColor.value.set(c[0], c[1], c[2]), this.bg = new q(h, this.bgMat), this.bg.frustumCulled = !1, this.bg.renderOrder = 0, this.scene.add(this.bg), this.frame.matrixAutoUpdate = !1, this.scene.add(this.frame);
    const m = this.m.card, x = [];
    for (const l of this.flying) x.push({ img: l.img, x: l.spec.rect.x, y: l.spec.rect.y, w: l.spec.rect.w, h: l.spec.rect.h });
    const w = this.opts.quality;
    this.cavity = new Fi({
      shared: this.shared,
      cardH: this.cardH,
      depth: ae,
      ruler: 100 / m.w,
      cardW: m.w,
      cardHpx: m.h,
      background: m.background,
      bg: c,
      layers: x,
      detail: w === "low" ? 0 : w === "mid" ? 0.6 : 1,
      shadows: w !== "low",
      font: ye,
      ref: this.canvas
    }), this.frame.add(this.cavity.group);
    const y = G(2, 2, this.canvas), M = y.getContext("2d");
    if (M.fillStyle = m.background, M.fillRect(0, 0, 2, 2), this.backTex = new Bt(y), this.backMat = Fe(this.shared, this.backTex, !1), this.backing = new q(n, this.backMat), this.backing.matrixAutoUpdate = !1, this.backing.frustumCulled = !1, this.backing.renderOrder = 9, this.frame.add(this.backing), this.role === "guest") {
      const l = kt(4);
      this.geos.push(l.geometry), ne(l, 1, 1, Ii);
      for (const u of l.attrs) u.needsUpdate = !0;
      this.rim = new q(l.geometry, Ft(this.shared, !1)), this.rim.matrixAutoUpdate = !1, this.rim.frustumCulled = !1, this.rim.renderOrder = 8, this.rim.matrix.set(1, 0, 0, 0, 0, this.cardH, 0, 0, 0, 0, 1, 5e-4, 0, 0, 0, 1), this.rim.material.uniforms.uLocal.value.copy(this.rim.matrix), this.frame.add(this.rim);
    }
    this.sprites = Js(Math.max(1, v * 3)), this.geos.push(this.sprites.geometry), this.atlasTex = new Me(), this.spriteMat = Ys(this.shared, this.atlasTex), this.spriteMesh = new q(this.sprites.geometry, this.spriteMat), this.spriteMesh.frustumCulled = !1, this.spriteMesh.renderOrder = this.role === "host" ? 500 : 901, this.scene.add(this.spriteMesh), this.role === "guest" && (this.leaders = kt(Math.max(1, v * 3)), this.geos.push(this.leaders.geometry), this.leaderMesh = new q(this.leaders.geometry, Ft(this.shared, !0)), this.leaderMesh.frustumCulled = !1, this.leaderMesh.renderOrder = 900, this.scene.add(this.leaderMesh)), this.buildEvents(), this.measure(), typeof ResizeObserver < "u" && (this.ro = new ResizeObserver(() => {
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
    const e = t.lset, i = this.role === "host";
    ne(e, i ? 1.25 : 1.5, i ? 0.9 : 1);
    for (let r = 4; r < 11; r++) B(e, r, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, Et, 0);
    t.lmat.uniforms.uSnap.value = 0, t.lmat.uniforms.uDash.value = 0;
  }
  /** Measurement geometry depends on the rect's aspect, so it is rewritten after every measure(). */
  placeMeasure(t) {
    if (this.role === "host" || t.qr) return;
    const e = t.lset, i = 0.5, r = Math.min(0.03, 0.3 * t.rh) / t.rh, o = Math.min(0.014, 0.14 * t.rh) / t.rh, n = -i - r;
    B(e, 4, -i, n, 0, i, n, 0, 1, 1, 0.1, 1, Et), B(e, 5, -i, n - o, 0, -i, n + o, 0, 1, 1, 0, 0.1, Et), B(e, 6, i, n - o, 0, i, n + o, 0, 1, 1, 0.9, 1, Et), B(e, 7, -i, i, 0, -i, i, 0, 5, 2, 0, 0, V), B(e, 8, i, i, 0, i, i, 0, 5, 2, 0, 0, V), B(e, 9, i, -i, 0, i, -i, 0, 5, 2, 0, 0, V), B(e, 10, -i, -i, 0, -i, -i, 0, 5, 2, 0, 0, V);
    for (const h of e.attrs) h.needsUpdate = !0;
  }
  buildEvents() {
    const t = this.P, e = this.events;
    for (const i of [...je, ...Ne]) e[i] = [];
    for (const i of this.flying) {
      const r = (o) => ({ index: i.i, id: i.spec.id, phase: o });
      e.depart.push({ t: t.start[i.k] + F, e: r("leave") }), e.explode.push({ t: t.start[i.k] + F, e: r("lift") }, { t: t.start[i.k] + Y, e: r("settle") }), e.assemble.push({ t: t.assembleStart[i.j] + t.assembleDrop, e: r("arrive") }), e.rebuild.push({ t: et, e: r("arrive") });
    }
    for (const i of this.sheets)
      i.qr && e.rebuild.push({ t: Gt, e: { index: i.i, id: i.spec.id, phase: "arrive" } });
    for (const i in e) e[i].sort((r, o) => r.t - o.t);
  }
  /** Canvas metrics, the flat fit, the screen-resolution bake, the atlas and the static frames. */
  measure() {
    const t = this.canvas, e = this.m.card, i = this.role === "host";
    this.cw = Math.max(1, t.clientWidth || t.width), this.ch = Math.max(1, t.clientHeight || t.height);
    const r = !i && this.opts.assembleRect || { x: 0, y: 0, w: this.cw, h: this.ch }, o = Math.min(r.w / e.w, r.h / e.h), n = Math.max(e.w, e.h) * o, h = this.opts.quality === "test" ? 1 : self.devicePixelRatio || 1;
    let v = Math.min(h, this.tier.dpr, this.tier.tex / n);
    for (let m = 0; m < 8; m++) {
      this.bw = Math.max(1, Math.round(this.cw * v)), this.bh = Math.max(1, Math.round(this.ch * v)), this.sx = this.bw / this.cw, this.sy = this.bh / this.ch;
      const x = Math.min(r.w * this.sx / e.w, r.h * this.sy / e.h);
      this.fitW = e.w * x, this.fitH = e.h * x, this.fitX = r.x * this.sx + (r.w * this.sx - this.fitW) / 2, this.fitY = r.y * this.sy + (r.h * this.sy - this.fitH) / 2;
      let w = 0;
      for (const y of this.sheets) w += Math.ceil(y.spec.rect.w * x + 1) * Math.ceil(y.spec.rect.h * x + 1) * 4 * (4 / 3);
      if (w <= this.tier.mem * 1048576 * 0.9) break;
      v *= 0.85;
    }
    this.renderer.setSize(this.bw, this.bh, !1), this.shared.uRes.value.set(this.bw, this.bh), this.shared.uPr.value = this.sx, this.shared.uOrtho.value = i ? 1 : 0, this.texBytes = this.cavity ? this.cavity.bytes : 0, this.scrX = Math.min(0, Math.floor(this.fitX)), this.scrY = Math.min(0, Math.floor(this.fitY)), this.scrW = Math.max(this.bw, Math.ceil(this.fitX + this.fitW)) - this.scrX, this.scrH = Math.max(this.bh, Math.ceil(this.fitY + this.fitH)) - this.scrY, this.scratch = G(this.bw, this.bh, this.canvas), this.over = this.scrW > this.bw || this.scrH > this.bh ? G(this.scrW, this.scrH, this.canvas) : null;
    for (const m of this.sheets) {
      const x = m.spec.rect;
      this.setTexture(m, m.img, !1), m.rx = (x.x + x.w / 2 - e.w / 2) / e.w, m.ry = (e.h / 2 - (x.y + x.h / 2)) / e.w, m.rw = x.w / e.w, m.rh = x.h / e.w, m.axis = m.rh >= m.rw ? 0 : 1, m.lever = Math.max(m.rw, m.rh) / 2, this.placeMeasure(m);
    }
    this.scratch.width = this.scratch.height = 1, this.scratch = null, this.over && (this.over.width = this.over.height = 1), this.over = null;
    const d = Math.min(176, (this.cw * (1 - 2 * Mt) - ns(this.flying.length)) / 2);
    this.atlas = Ws(this.atlasItems, this.sx, d, this.canvas), this.labelHistory.valid = !1, this.atlasTex?.dispose();
    const a = new Bt(this.atlas.canvas);
    a.flipY = !1, a.premultiplyAlpha = !0, a.generateMipmaps = !1, a.minFilter = a.magFilter = he, this.atlasTex = a, this.spriteMat.uniforms.map.value = a, this.texBytes += this.atlas.bytes;
    for (const m of this.flying) {
      const x = this.slots[m.slot], w = this.atlas.entries;
      x.bw = Math.max(w[m.chip].w, m.pill >= 0 ? w[m.pill].w : 0), x.bh = mt + (m.pill >= 0 ? Te + ss : 0);
    }
    const c = this.shared.uSafe.value;
    for (const m of c) m.set(0, 0, 0, 0);
    i && this.opts.safeRects && this.opts.safeRects.forEach((m, x) => {
      const w = Math.floor(m.x * this.sx), y = Math.ceil((m.x + m.w) * this.sx), M = this.bh - Math.ceil((m.y + m.h) * this.sy), l = this.bh - Math.floor(m.y * this.sy), u = c[Math.min(x, 3)];
      x < 4 ? u.set(w, M, y, l) : u.set(Math.min(u.x, w), Math.min(u.y, M), Math.max(u.z, y), Math.max(u.w, l));
    }), this.shared.uWin.value.set(0.5, this.cardH / 2), i ? this.hostFlat() : this.setCamera(), this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert(), this.sizeDirty = !1, this.dirty = !0;
  }
  /** Host, flat (idle, connect, the last frame of rebuild): orthographic, the frame maps card units to device pixels. */
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
   * (the window), so the screen shows what a real cavity behind it would show that eye. The frame
   * becomes card space seen from the eye.
   */
  hostWindow() {
    const t = this.eye, e = this.cardH, i = t.z * 0.25, r = i / t.z, o = this.camera.projectionMatrix.makePerspective((-0.5 - t.x) * r, (0.5 - t.x) * r, (e / 2 - t.y) * r, (-e / 2 - t.y) * r, i, t.z + ae + 2), n = this.fitW / this.bw, h = this.fitH / this.bh, v = (this.fitX + this.fitW / 2) / this.bw * 2 - 1, d = 1 - (this.fitY + this.fitH / 2) / this.bh * 2, a = o.elements;
    for (let c = 0; c < 4; c++)
      a[c * 4] = n * a[c * 4] + v * a[c * 4 + 3], a[c * 4 + 1] = h * a[c * 4 + 1] + d * a[c * 4 + 3];
    this.frame.matrix.makeTranslation(-t.x, -t.y, -t.z), this.frame.matrixWorldNeedsUpdate = !0;
  }
  /**
   * The host's eye: the viewer's position, or a virtual eye EYE_DIST in front of the centre swung by
   * tilt (frontal with `reduced`). A switch between the two is blended over VIEWER_BLEND of wall clock.
   */
  hostEye(t) {
    const e = !this.paused && t - this.wT0 < Ye, i = this.w = e ? C(this.wFrom, this.wTo, Z((t - this.wT0) / Ye)) : this.wTo;
    e && (this.dirty = !0);
    let r = this.reduced ? 0 : this.tiltX, o = this.reduced ? 0 : this.tiltY;
    const n = Math.hypot(r, o);
    n > 1 && (r /= n, o /= n);
    const h = Ve * r, v = Ve * o;
    this.eye.set(-bt * Math.sin(h) * Math.cos(v), bt * Math.sin(v), bt * Math.cos(h) * Math.cos(v)).lerp(this.viewer, i), this.eye.z < 1 && (this.eye.z = 1);
  }
  setTexture(t, e, i) {
    const r = this.m.card, o = t.spec.rect, n = this.fitW / r.w, h = this.scratch ?? G(this.bw, this.bh, this.canvas), v = this.over ?? (this.scrW > this.bw || this.scrH > this.bh ? G(this.scrW, this.scrH, this.canvas) : null), d = Ls(e, this.fitX + o.x * n, this.fitY + o.y * n, o.w * n, o.h * n, h, this.canvas, v, this.scrX, this.scrY), a = new Bt(d.canvas);
    a.premultiplyAlpha = !0, a.generateMipmaps = !0, a.minFilter = Es, a.magFilter = he, a.anisotropy = Math.min(this.tier.aniso, this.renderer.capabilities.getMaxAnisotropy()), this.texBytes += d.w * d.h * 4 * (4 / 3);
    const c = t.mat.uniforms;
    if (i) {
      t.next?.dispose(), t.next = a, c.mapB.value = a;
      return;
    }
    t.tex.dispose(), t.tex = a, c.map.value = a, c.mapB.value = a, c.uMix.value = 0, t.smat && (t.smat.uniforms.map.value = a);
    const m = this.fitX + this.fitW / 2, x = this.fitY + this.fitH / 2;
    t.bx = (d.x0 + d.w / 2 - m) / this.fitW, t.by = (x - (d.y0 + d.h / 2)) / this.fitW, t.bw = d.w / this.fitW, t.bh = d.h / this.fitW, c.uTile.value.set(d.tu, d.tv, d.tw, d.th), t.grid && c.uQr.value.set(t.grid.ox, t.grid.oy, t.grid.nx, t.grid.ny);
  }
  // ---------------------------------------------------------------- guest frames
  setCamera() {
    const i = 0.05 * Math.tan(this.fov * Math.PI / 360), r = i * (this.aspect > 0 ? this.aspect : this.bw / this.bh);
    this.camera.projectionMatrix.makePerspective(-r, r, i, -i, 0.05, 200), this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert(), this.solveVirtual(), this.solveDeck(), this.dirty = !0;
  }
  /**
   * Face-on frame in which the card plane has `zoom` times the size of the flat fit and its centre
   * sits at (cx, cy) device px. zoom 1 at the centre of the fit is the landing itself.
   */
  screenFrame(t, e, i) {
    const r = this.camera.projectionMatrix.elements, o = r[0], n = r[5], h = o * this.bw / (2 * this.fitW * t), v = e / this.bw * 2 - 1, d = 1 - i / this.bh * 2;
    this.sPos.set(v * h / o, d * h / n, -h), this.sScaleY = o * this.bw / (n * this.bh);
  }
  /** Device-px bounding box of the deck (the stack at DECK spacing, face-on) for the current this.sPos; result in this.box. */
  deckBox() {
    const t = this.box, e = this.q.identity(), i = this.bw / this.cw, r = this.bh / this.ch;
    t[0] = t[1] = 1e9, t[2] = t[3] = -1e9;
    for (const o of this.flying) {
      const n = o.by + gt * this.cardH * o.j * Ct, h = (lt + ut * o.j + U) * Ct;
      for (let v = 0; v < 4; v++) {
        const d = this.project(o.bx + (v & 1 ? 0.5 : -0.5) * o.bw, n + (v & 2 ? 0.5 : -0.5) * o.bh, h, this.sPos, e, this.sScaleY);
        d.x * i < t[0] && (t[0] = d.x * i), d.y * r < t[1] && (t[1] = d.y * r), d.x * i > t[2] && (t[2] = d.x * i), d.y * r > t[3] && (t[3] = d.y * r);
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
    const t = $e * this.bw, e = $e * this.bh;
    let i = Math.max(0, this.fitX), r = Math.max(0, this.fitY), o = Math.min(this.bw, this.fitX + this.fitW), n = Math.min(this.bh, this.fitY + this.fitH);
    (o - i < 2 || n - r < 2) && (i = 0, r = 0, o = this.bw, n = this.bh);
    const h = (i + o) / 2, v = (r + n) / 2, d = this.box;
    let a = We, c = h, m = v;
    for (let x = 0; x < 12; x++) {
      this.screenFrame(a, c, m), this.deckBox();
      let w = h - (d[0] + d[2]) / 2, y = v - (d[1] + d[3]) / 2;
      const M = d[2] - d[0], l = d[3] - d[1], u = this.bw - 2 * t, b = this.bh - 2 * e;
      M <= u && (w = Math.min(Math.max(w, t - d[0]), this.bw - t - d[2])), l <= b && (y = Math.min(Math.max(y, e - d[1]), this.bh - e - d[3])), c += w, m += y, a = Math.min(We, a * Math.min(u / M, b / l));
    }
    this.deckZoom = a, this.deckX = c, this.deckY = m;
  }
  /** Projects a card-space point through `pos`/`quat` to CSS px; result in this.v (x, y). */
  project(t, e, i, r, o, n) {
    const h = this.v.set(t, e * n, i).applyQuaternion(o).add(r).applyMatrix4(this.camera.projectionMatrix);
    return h.x = (h.x * 0.5 + 0.5) * this.cw, h.y = (0.5 - h.y * 0.5) * this.ch, h;
  }
  /** Screen bounding box of the settled exploded stack seen through `pos`/`quat`; result in this.box. */
  stackBox(t, e, i = !1) {
    const r = this.box;
    i || (r[0] = r[1] = 1e9, r[2] = r[3] = -1e9);
    for (const o of this.flying) {
      const n = o.by + gt * this.cardH * o.j, h = lt + ut * o.j + U;
      for (let v = 0; v < 4; v++) {
        const d = this.project(o.bx + (v & 1 ? 0.5 : -0.5) * o.bw, n + (v & 2 ? 0.5 : -0.5) * o.bh, h, t, e, 1);
        d.x < r[0] && (r[0] = d.x), d.y < r[1] && (r[1] = d.y), d.x > r[2] && (r[2] = d.x), d.y > r[3] && (r[3] = d.y);
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
    const t = this.reduced ? 0 : Xe, e = Mt * this.cw, i = Mt * this.ch;
    let r = 0, o = 0, n = 0;
    for (const y of this.slots)
      r = Math.max(r, y.bh), y.corner < 0 ? o++ : n++;
    const h = ii(os(Math.max(o, n)), r), v = e, d = this.cw - e, a = i + h, c = this.ch - i - h, m = this.camera.projectionMatrix.elements, x = this.box;
    this.vPos.set(0, 0, -6);
    const w = () => {
      for (let y = -1; y <= 1; y++) this.stackBox(this.vPos, this.vQuat.setFromEuler(this.euler.set(oe, y * t, 0, "XYZ")), y > -1);
    };
    for (let y = 0; y < 14; y++) {
      w();
      const M = Math.min((d - v) / (x[2] - x[0]), (c - a) / (x[3] - x[1]));
      this.vPos.multiplyScalar(1 / M), w();
      const l = -this.vPos.z;
      this.vPos.x += ((v + d) / 2 - (x[0] + x[2]) / 2) / this.cw * 2 * (l / m[0]), this.vPos.y -= ((a + c) / 2 - (x[1] + x[3]) / 2) / this.ch * 2 * (l / m[5]);
    }
    this.vQuat.setFromEuler(this.euler.set(oe, -t, 0, "XYZ")), this.everPose || (this.aPos.copy(this.vPos), this.aQuat.copy(this.vQuat));
  }
  // ---------------------------------------------------------------- per-frame state
  reset(t) {
    t.on = !0, t.op = 1, t.ox = 0, t.oy = 0, t.z = 0, t.sc = 1, t.acr = 0, t.sweep = 0, t.tilt = 0, t.qT = 0, t.qLift = 0, t.shA = 0, t.shx = 0, t.shy = 0, t.shBlur = 0, t.shZ = 0, t.shSlab = 0, t.shGlass = !1, t.fr = 0, t.frA = 0, t.ms = 0, t.hd = 0, t.chA = 0, t.lead = 0, t.chipR = 0, t.pillR = 0, t.tag = 0, t.gain = 1, t.rs = 0, t.rsA = 0;
  }
  update(t) {
    this.role === "host" ? this.updateHost(this.tl, this.t, t) : this.updateGuest(this.tl, this.t, t), this.apply();
  }
  /** Light of the room: a print behind the glass is this much brighter than printed (1 at the glass; 1 on a light card). */
  gain(t, e) {
    return t >= 0 || !this.cavity.lit ? 1 : 1 + ki * e * R(0, 0.3, -t) * Math.exp(t / 4);
  }
  /**
   * A flying sheet in the event (host `depart` = guest `explode`): its depth, crossing tilt, stair
   * offset, thickness and light, and the trace of the outline it leaves on the back wall.
   * `front` is the anchored guest, which shows a sheet only in front of the glass. Returns the
   * sheet's exit clock.
   */
  eventSheet(t, e, i, r) {
    const o = this.P, n = e - o.start[t.k], h = lt + ut * t.j + U, v = qe(h), d = gt * this.cardH * t.j;
    if (this.reduced) {
      const a = z((n - F) / H);
      (this.role === "host" ? !1 : r ? !0 : a >= 0.5) ? (t.z = h, t.oy += d, t.op = r ? a : z(2 * a - 1), t.acr = 1) : e < 0.6 ? (t.op = 1 - e / 0.6, t.acr = 0) : (t.z = At(t.j, o.n), t.op = z((e - 0.6) / 0.6) * (1 - (this.role === "host" ? a : z(2 * a))), t.acr = 0);
    } else n <= 0 ? (t.z = Ue(t.j, o.n, e), t.acr = R(j, j + 0.5, e)) : (t.z = yi(n, At(t.j, o.n), h, v), t.tilt = wi(n) * Math.asin(Math.min(1, v / t.lever)), t.oy += d * Z((n - F - H) / $t), t.acr = 1);
    return t.gain = this.gain(t.z, i), t.sweep = -3, t.rs = z((n - F) / H), t.rsA = t.rs > 0 ? 1 : 0, n;
  }
  /** The cavity during the event: the backing behind the bottom layer goes and the back panel is uncovered when that layer leaves. */
  eventCavity(t, e) {
    const i = this.P, r = i.n;
    if (r === 0) {
      this.backA = 0, this.lit = 1;
      return;
    }
    const o = i.start[r - 1], n = t - o;
    if (this.reduced) {
      const h = z((n - F) / H);
      this.backA = 1 - h, this.lit = h, this.backZ = At(0, r) - 2e-3;
    } else
      this.backA = 1 - R(0, F, n), this.lit = R(0, F + H, n), this.backZ = Ue(0, r, Math.min(t, o)) - U * R(j, j + 0.5, t) - 2e-3;
    this.backGain = this.gain(this.backZ, e);
  }
  /** The soft shadow a sheet behind the glass casts on the sheet behind it; it goes as the sheet nears the glass. */
  insideShadow(t) {
    const e = t.recv >= 0 ? this.sheets[t.recv] : null;
    if (t.shA = 0, t.shGlass = !1, !e || !e.on || t.z >= 0 || e.z >= 0) return;
    const i = Math.max(0, t.z - U * t.acr - e.z);
    t.shZ = e.z, t.shx = 0, t.shy = -0.03 * i, t.shBlur = 4e-3 + 0.05 * i, t.shSlab = 0.3;
    const r = this.cavity.lit ? Math.min(0.35, 1 - 1 / e.gain) : 0.22;
    t.shA = r * t.op * R(0, 0.02, i) * (1 - R(0.25, 1, i)) * (1 - R(-0.3, -0.05, t.z));
  }
  updateHost(t, e, i) {
    const r = this.P, o = r.n, n = this.reduced, h = this.sx / this.fitW, v = this.shared, d = this.persp = t === "depart" || t === "rebuild" && e < et;
    d ? (this.hostEye(i), this.hostWindow(), v.uEye.value.copy(this.eye)) : this.hostFlat(), v.uOrtho.value = d ? 0 : 1, v.uSide.value = d ? -1 : 2, v.uBehind.value = 1, v.uRim.value = d && !n ? 1 - this.w : 0;
    let a = t === "idle" || t === "connect" ? 1 : t === "depart" ? 1 - R(0, 0.3, e) : R(et, Gt, e);
    n && (a = 0);
    let c = this.tiltX, m = this.tiltY;
    const x = Math.hypot(c, m);
    x > 1 && (c /= x, m /= x);
    let w = c * 10 * a, y = m * 10 * a;
    if (t === "idle" && !n) {
      const l = 1.5 * Math.sin(2 * Math.PI * e / ui) * (1 - R(0, 0.15, Math.min(1, x)));
      w += l * 0.8, y += l * 0.6;
    }
    this.bgA = 1;
    const M = t === "depart" ? n ? 1 : R(0, j, e) : t === "rebuild" ? n ? 1 : 1 - R(dt, et, e) : 0;
    this.cavA = d ? 1 : 0, this.lit = this.backA = 0, this.backZ = 0, this.backGain = 1, t === "depart" && this.eventCavity(e, M);
    for (const l of this.sheets) {
      this.reset(l);
      const u = l.qr ? 0.4 * l.zn : l.zn;
      l.ox = w * u * h, l.oy = -y * u * h;
      const b = Math.hypot(w, y) * u / 10;
      if (l.shA = 0.35 * z(b * 1.5), l.shx = -l.ox * 0.6, l.shy = -l.oy * 0.6, l.shBlur = (0.6 + 2.2 * b) * h, l.shGlass = !0, l.qr) {
        t === "connect" ? (l.qT = z(e / ms), l.qLift = n ? 0 : 2.5) : t === "rebuild" ? (l.qT = 1 - z((e - Ge) / (Gt - Ge)), l.qLift = n ? 0 : 2.5, d && !n && (l.z = Qe(0, Math.max(1, o), e, 0, 0.05))) : t === "depart" && (l.qT = 1), l.on = l.qT < 1, l.shA *= 1 - l.qT, l.shZ = l.z, l.gain = this.gain(l.z, M);
        continue;
      }
      if (t === "depart")
        this.eventSheet(l, e, M, !1) >= F + H + 0.06 && (l.on = !1), a > 0 ? l.shZ = l.z : this.insideShadow(l);
      else if (d) {
        const f = r.rebuildStart[l.j], p = e - f, g = qe(lt + ut * l.j + U);
        n ? l.op = R(0.2, et - 0.1, e) : (l.z = Qe(l.j, o, e, f, g), l.tilt = bi(p) * Math.asin(Math.min(1, g / l.lever)), l.on = p > 0, l.acr = 1 - R(Qt, dt, e)), l.gain = this.gain(l.z, M), l.sweep = -3, l.rs = 1, l.rsA = n ? 1 - l.op : 1 - R(0, N + pt, p), this.insideShadow(l), l.j === 0 && (this.backA = n ? l.op : R(0, N + pt, p), this.lit = 1 - this.backA, this.backZ = l.z - U * l.acr - 2e-3, this.backGain = this.gain(this.backZ, M));
      }
    }
    t === "rebuild" && d && o === 0 && (this.lit = 1);
  }
  updateGuest(t, e, i) {
    const r = this.P, o = this.reduced, n = this.shared, h = !this.paused && i - this.uT0 < 350, v = this.u = this.direct ? 0 : h ? C(this.uFrom, this.uTo, Z((i - this.uT0) / 350)) : this.uTo;
    h && (this.dirty = !0);
    const d = o ? 0 : -Xe * Math.cos(t === "explode" ? 2 * Math.PI * e / r.dur.explode : 0);
    this.vQuat.setFromEuler(this.euler.set(oe, d, 0, "XYZ")), this.hasPose && this.mat.fromArray(this.pose).decompose(this.aPos, this.aQuat, this.v2), this.fPos.copy(this.aPos).lerp(this.vPos, v), this.fQuat.copy(this.aQuat).slerp(this.vQuat, v), this.fScl.set(1, 1, 1);
    const a = this.direct ? 1 : v;
    let c = 1, m = 1, x = 0;
    this.spread = 1, this.bgA = 0, this.cavA = this.lit = this.backA = 0, this.backZ = 0, this.backGain = 1, n.uSnap.value = 0, n.uOrtho.value = 0, n.uRim.value = 0, n.uBehind.value = a;
    let w = a > 0 ? 0 : 1;
    const y = o ? 1 : R(0, j, e);
    if (!this.started) {
      for (const u of this.sheets)
        this.reset(u), u.on = !1;
      return;
    }
    if (t === "explode")
      this.cavA = 1, this.eventCavity(e, y);
    else if (t === "fly")
      x = o ? 0 : Z(e / Ut), this.screenFrame(this.deckZoom, this.deckX, this.deckY), this.fPos.lerp(this.sPos, x), this.fPos.y += 0.3 * Math.sin(Math.PI * x), this.fQuat.slerp(this.q.identity(), x), this.fScl.y = C(1, this.sScaleY, x), c = this.spread = C(1, Ct, x), m = 1 - z(e / 0.3), this.bgA = o ? z(e / Ut) : R(0.3, 1, e / Ut), this.cavA = m, this.lit = 1, this.cavA * a <= 0 && (w = 2);
    else {
      const u = o ? 1 : Z(e / 0.75), b = this.fitX + this.fitW / 2, f = this.fitY + this.fitH / 2;
      this.screenFrame(C(this.deckZoom, 1, u), C(this.deckX, b, u), C(this.deckY, f, u)), this.fPos.copy(this.sPos), this.fQuat.identity(), this.fScl.y = this.sScaleY, m = 0, this.bgA = 1, w = 2, e >= xs && (n.uSnap.value = 1);
    }
    n.uSide.value = this.direct ? -1 : w, this.frame.matrix.compose(this.fPos, this.fQuat, this.fScl), this.frame.matrixWorldNeedsUpdate = !0, this.v2.copy(this.fPos).negate().applyQuaternion(this.qi.copy(this.fQuat).invert()), n.uEye.value.set(this.v2.x, this.v2.y, Math.max(0.05, this.v2.z)), this.v2.normalize();
    const M = 1.2 * (this.v2.x * 0.8 - this.v2.y * 0.6), l = gt * this.cardH;
    for (const u of this.sheets) {
      if (this.reset(u), u.qr) {
        u.on = !1;
        continue;
      }
      const b = lt + ut * u.j + U;
      if (u.acr = 1, t === "explode") {
        const p = this.eventSheet(u, e, y, a <= 0);
        if (a <= 0 && p < F - 0.02) {
          u.on = !1;
          continue;
        }
        const g = z((p - Y - Kt) / ps);
        o ? (u.chA = g, u.fr = u.ms = u.hd = u.lead = u.chipR = u.pillR = g > 0 ? 1 : 0) : (u.sweep = C(-3, -1.2 + 1.5 * R(F, Y, p) + 0.08 * u.j + M + 0.05 * Math.max(0, p - Y), R(F, F + H, p)), this.chrome(u, g));
      } else {
        let p = c;
        if (t === "fly")
          o && (u.op = 1 - z(e / 0.7), u.on = u.op > 0), u.sweep = 0.3 + 0.08 * u.j + M + 0.9 * x, u.chA = m, u.fr = u.ms = u.hd = u.lead = u.chipR = u.pillR = m > 0 ? 1 : 0;
        else {
          const g = e - r.assembleStart[u.j];
          o ? (p = 0, u.acr = 0, u.op = z(g / 0.4), u.on = u.op > 0) : (p = Ct * (1 - fi(g / r.assembleDrop)), u.acr = 1 - R(0.5, 0.95, e), u.sweep = 1.2 + 0.08 * u.j + M + 0.6 * e);
        }
        u.oy = l * u.j * p, u.z = b * p;
      }
      const f = u.recv >= 0 ? this.sheets[u.recv] : null;
      if (f && f.on && u.z > 0 && (f.z > 0 || t !== "explode")) {
        const p = Math.max(0, u.z - U * u.acr - f.z);
        u.shZ = f.z, u.shx = 0.1 * p, u.shy = -0.14 * p, u.shBlur = 4e-3 + 0.05 * p, u.shSlab = 0.3, u.shA = 0.35 * u.op * u.acr * R(0, 0.02, p) * (1 - 0.45 * z(p / 0.8)) * (t === "explode" ? R(0, 0.05, f.z) : 1);
      } else t === "explode" && a > 0 && this.insideShadow(u);
      this.direct && (u.chA = 0);
    }
  }
  /** Chrome draw-in over CHROME seconds: frame trace, handles, measurement, leader, chip, pill. */
  chrome(t, e) {
    t.chA = e > 0 ? 1 : 0, t.fr = z(e / 0.556), t.hd = z((e - 0.45) / 0.2), t.ms = z((e - 0.5) / 0.35), t.lead = z((e - 0.55) / 0.3), t.chipR = z((e - 0.75) / 0.25), t.pillR = z((e - 0.85) / 0.15);
  }
  // ---------------------------------------------------------------- state -> GPU
  apply() {
    const t = this.role === "host", e = this.sx / this.fitW;
    this.bg.visible = this.bgA > 0, this.bgMat.uniforms.uAlpha.value = this.bgA;
    const i = this.cavity, r = t ? this.persp ? this.cavA : 0 : this.cavA * this.shared.uBehind.value;
    let o = 0;
    if (r > 0)
      for (const a of this.flying) {
        if (o >= $) break;
        !a.on || a.op <= 0 || a.z >= -0.02 || (i.sheet[o].set(a.rx - a.rw / 2, a.ry + a.oy - a.rh / 2, a.rx + a.rw / 2, a.ry + a.oy + a.rh / 2), i.sheetZ[o] = a.z, i.sheetA[o] = (1 - R(-0.35, -0.05, a.z)) * a.op, o++);
      }
    const n = this.flying.length > 0 ? this.flying[0] : null;
    i.set(r, this.lit, o, n && n.on && n.op > 0.5 && n.z < -0.11 ? -n.z - 0.01 : 1e3);
    const h = this.backing, v = this.backMat.uniforms;
    h.visible = r > 0 && this.backA > 0, h.visible && (h.matrix.set(1, 0, 0, 0, 0, this.cardH, 0, 0, 0, 0, 1, this.backZ, 0, 0, 0, 1), v.uLocal.value.copy(h.matrix), v.uBox.value.set(0, 0, 1, this.cardH), v.uOpacity.value = this.backA * this.cavA, v.uGain.value = this.backGain), this.rim && (this.rim.visible = r > 0, this.rim.visible && (this.rim.material.uniforms.uAlpha.value.x = 0.5 * r));
    let d = 0;
    for (const a of this.sheets) {
      const c = 10 + d * 10 + (a.z > -0.11 ? 200 : 0), m = a.acr, x = a.bw, w = a.bh, y = a.bx + a.ox, M = a.by + a.oy, l = a.mesh, u = a.mat.uniforms;
      if (l.visible = a.on && a.op > 0, l.visible) {
        const p = Math.max(1e-5, U * m);
        if (a.tilt !== 0) {
          const g = Math.cos(a.tilt), A = Math.sin(a.tilt);
          a.axis === 0 ? l.matrix.set(x, 0, 0, y, 0, w * g, -p * A, M, 0, w * A, p * g, a.z, 0, 0, 0, 1) : l.matrix.set(x * g, 0, -p * A, y, 0, w, 0, M, x * A, 0, p * g, a.z, 0, 0, 0, 1);
        } else
          l.matrix.set(x, 0, 0, y, 0, w, 0, M, 0, 0, p, a.z, 0, 0, 0, 1);
        if (l.renderOrder = c + 1, u.uLocal.value.copy(l.matrix), u.uGain.value = a.gain, u.uBox.value.set(y, M, x, w), u.uOpacity.value = a.op, u.uZoom.value = 1 / a.sc, u.uAcr.value = m, u.uSweep.value = a.sweep, u.uSweepAmt.value = this.tier.sweep && !this.reduced ? 1 : 0, u.uInner.value.set(-4e-3 / x, 6e-3 / w, this.tier.sweep ? 1 : -1), a.qr && u.uQrT.value.set(a.qT, -0.8 * a.qLift * e / a.rw, -a.qLift * e / a.rh), a.next) {
          const g = z((performance.now() - a.mixT0) / 150);
          u.uMix.value = g, this.dirty = !0, g >= 1 && this.finishSwap(a);
        }
      }
      const b = a.shadow, f = a.smat?.uniforms;
      if (b && f && (b.visible = a.on && a.shA > 4e-3, b.visible)) {
        const p = a.shBlur * 2 + 2e-3, g = x + 2 * p, A = w + 2 * p, S = y + a.shx, P = M + a.shy;
        b.matrix.set(g, 0, 0, S, 0, A, 0, P, 0, 0, 1, a.shZ, 0, 0, 0, 1), f.uLocal.value.copy(b.matrix), f.uBox.value.set(S, P, g, A), f.uGrow.value.set(g / x, A / w), f.uRad.value.set(a.shBlur / x, a.shBlur / w), f.uLod.value = Math.log2(Math.max(1, a.shBlur * this.fitW * 0.9)), f.uAlpha.value = a.shA, f.uSlab.value = a.shSlab * m;
        const T = !a.shGlass && a.recv >= 0 ? this.sheets[a.recv] : null;
        T ? f.uClip.value.set(T.bx + T.ox - T.bw / 2, T.by + T.oy - T.bh / 2, T.bx + T.ox + T.bw / 2, T.by + T.oy + T.bh / 2) : f.uClip.value.set(-1e3, -1e3, 1e3, 1e3), b.renderOrder = T ? 10 + a.recv * 10 + (T.z > -0.11 ? 200 : 0) + 2 : c;
      }
      if (a.qr)
        a.lines.visible = !1;
      else {
        const p = t ? a.lines : a.res, g = (t ? a.lmat : a.resMat)?.uniforms;
        if (p && g && (p.visible = r > 0 && a.rsA > 0, p.visible)) {
          const A = (1 + 8 * a.dupe) * e;
          p.matrix.set(a.rw - A, 0, 0, a.rx, 0, a.rh - A, 0, a.ry, 0, 0, 1, 1e-3 - ae, 0, 0, 0, 1), g.uLocal.value.copy(p.matrix), g.uDash.value = 6 * this.sx, g.uProg.value.set(a.rs, 0, 0, 0), g.uAlpha.value.set(a.rsA * r, 0, 0, 0), p.renderOrder = 3;
        }
        if (!t) {
          const A = a.lines, S = a.lmat.uniforms;
          A.visible = a.chA > 0 && l.visible, A.visible && (A.matrix.set(a.rw, 0, 0, a.rx + a.ox, 0, a.rh, 0, a.ry + a.oy, 0, 0, 1, a.z, 0, 0, 0, 1), S.uLocal.value.copy(A.matrix), S.uProg.value.set(a.fr, a.ms, a.hd, 0), S.uAlpha.value.set(a.chA, a.chA, a.chA, 0), A.renderOrder = c + 3);
        }
      }
      d++;
    }
    t ? this.finishSprites(0) : this.writeLabels();
  }
  sprite(t, e, i, r, o, n, h, v, d, a) {
    const c = e * 4;
    t.rect[c] = i, t.rect[c + 1] = r, t.rect[c + 2] = o, t.rect[c + 3] = n, t.uv[c] = h.u0, t.uv[c + 1] = h.v0, t.uv[c + 2] = h.u1, t.uv[c + 3] = h.v1, t.fx[c] = v, t.fx[c + 1] = d, t.fx[c + 2] = a, t.fx[c + 3] = 0;
  }
  finishSprites(t) {
    if (this.spriteMesh.visible = t > 0, this.sprites.geometry.instanceCount = t, t > 0) for (const e of this.sprites.attrs) e.needsUpdate = !0;
  }
  /** Guest: project the sheet corners, lay the label blocks out, write leaders and sprites. */
  writeLabels() {
    const t = this.leaders, e = this.sprites, i = this.atlas.entries;
    let r = !1;
    for (const l of this.flying) l.chA > 0 && l.on && (r = !0);
    if (!r) {
      this.finishSprites(0), this.leaderMesh.visible = !1, this.labelHistory.valid = !1;
      return;
    }
    const o = this.fScl.y, n = this.box;
    this.stackBox(this.fPos, this.fQuat);
    const h = n[0], v = n[1], d = n[2], a = n[3];
    let c = 0;
    for (const l of this.flying) {
      const u = this.slots[l.slot], b = l.rx, f = l.rw / 2, p = l.rh / 2, g = l.ry + gt * this.cardH * l.j * this.spread, A = (lt + ut * l.j + U) * this.spread;
      let S = this.project(b - f, g + p, A, this.fPos, this.fQuat, o);
      u.tlx = S.x, u.tly = S.y, S = this.project(b + f, g + p, A, this.fPos, this.fQuat, o), u.trx = S.x, u.try_ = S.y, S = this.project(b - f, g - p, A, this.fPos, this.fQuat, o), u.blx = S.x, u.bly = S.y, S = this.project(b + f, g - p, A, this.fPos, this.fQuat, o), u.brx = S.x, u.bry = S.y, c++;
    }
    const m = Mt * this.cw, x = Mt * this.ch;
    ci(this.slots, c, h, v, d, a, this.cw, this.ch, m, x, this.order, this.labelHistory, this.chromeDt, this.reduced) || (this.dirty = !0);
    let y = 0, M = 0;
    for (const l of this.flying) {
      const u = this.slots[l.slot], b = l.on ? l.chA : 0, f = z(l.lead / 0.5), p = z((l.lead - 0.5) / 0.25), g = z((l.lead - 0.75) / 0.25);
      if (B(t, M++, u.ax, u.ay, 0, C(u.ax, u.ex, f), C(u.ay, u.gy, f), 0, 1, 3, 0, 1, V, b * (l.lead > 0 ? 1 : 0)), B(t, M++, u.ex, u.gy, 0, u.ex, C(u.gy, u.ey, p), 0, 1, 3, 0, 1, V, b * (p > 0 ? 1 : 0)), B(t, M++, u.ex, u.ey, 0, C(u.ex, u.ix, g), u.ey, 0, 1, 3, 0, 1, V, b * (g > 0 ? 1 : 0)), b <= 0) continue;
      const A = i[l.chip], S = -u.side, P = u.side < 0 ? u.ix - A.w : u.ix;
      if (l.chipR > 0 && this.sprite(e, y++, P * this.sx, u.y * this.sy, A.w * this.sx, A.h * this.sy, A, b, l.chipR, S), l.pill >= 0 && l.pillR > 0) {
        const T = i[l.pill], X = u.side < 0 ? u.ix - T.w : u.ix;
        this.sprite(e, y++, X * this.sx, (u.y + mt + Te) * this.sy, T.w * this.sx, T.h * this.sy, T, b, l.pillR, S);
      }
    }
    this.leaderMesh.visible = !0;
    for (const l of t.attrs) l.needsUpdate = !0;
    this.finishSprites(y);
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
      play: (e, i) => this.play(e, i?.at),
      setTilt: (e, i) => {
        const r = Math.max(-1, Math.min(1, e || 0)), o = Math.max(-1, Math.min(1, i || 0));
        (r !== this.tiltX || o !== this.tiltY) && (this.tiltX = r, this.tiltY = o, this.dirty = !0);
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
    if (!(this.role === "host" ? je : Ne).includes(t)) return Promise.reject(new Error(`window: timeline "${t}" does not belong to role "${this.role}"`));
    if (this.disposed) return Promise.reject(new Error("window: disposed"));
    const r = this.resolve;
    return this.resolve = null, r?.(), this.tl = t, this.t0 = typeof e == "number" && isFinite(e) ? e : performance.now(), this.started = !0, this.t = 0, this.prevT = -1, this.evCursor = 0, this.done = !1, this.dirty = !0, t === "idle" ? new Promise(() => {
    }) : new Promise((o) => {
      this.resolve = o;
    });
  }
  async replaceLayer(t, e) {
    const i = this.sheets.find((o) => o.spec.id === t);
    if (!i) throw new Error(`window: no layer "${t}"`);
    const r = await Se(Ae(this.opts.baseUrl, e));
    if (!this.disposed) {
      if (i.img = r, i.qr && (i.grid = Pe(r, this.canvas), i.mat.uniforms.uQr.value.set(i.grid.ox, i.grid.oy, i.grid.nx, i.grid.ny)), this.setTexture(i, r, !0), i.mixT0 = performance.now(), this.dirty = !0, this.paused) {
        this.finishSwap(i);
        return;
      }
      await new Promise((o) => setTimeout(o, 170)), this.disposed || this.finishSwap(i);
    }
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = !0, cancelAnimationFrame(this.raf), this.raf = 0, this.ro?.disconnect(), this.ro = null, this.canvas.removeEventListener("webglcontextlost", this.onLost);
    const t = this.resolve;
    this.resolve = null, t?.();
    for (const e of this.sheets)
      e.tex.dispose(), e.next?.dispose(), e.mat.dispose(), e.smat?.dispose(), e.lmat.dispose(), e.resMat?.dispose();
    this.cavity?.dispose(), this.cavity = null, this.backMat?.dispose(), this.backTex?.dispose(), this.rim?.material?.dispose(), this.atlasTex?.dispose(), this.bgMat?.dispose(), this.spriteMat?.dispose(), this.leaderMesh?.material?.dispose();
    for (const e of this.geos) e.dispose();
    this.scene.clear(), this.sheets = [], this.flying = [], this.renderer && (this.renderer.renderLists.dispose(), this.renderer.dispose()), this.usesFont && Bs(), this.usesFont = !1;
  }
}
const Ii = [0.918, 0.949, 1];
function ne(s, t, e, i = V) {
  B(s, 0, -0.5, 0.5, 0, 0.5, 0.5, 0, t, 0, 0, 0.25, i, e), B(s, 1, 0.5, 0.5, 0, 0.5, -0.5, 0, t, 0, 0.25, 0.5, i, e), B(s, 2, 0.5, -0.5, 0, -0.5, -0.5, 0, t, 0, 0.5, 0.75, i, e), B(s, 3, -0.5, -0.5, 0, -0.5, 0.5, 0, t, 0, 0.75, 1, i, e);
}
function Ci(s) {
  const t = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(s.trim());
  if (!t) return [0, 0, 0];
  let e = t[1];
  e.length === 3 && (e = e[0] + e[0] + e[1] + e[1] + e[2] + e[2]);
  const i = parseInt(e, 16);
  return [(i >> 16 & 255) / 255, (i >> 8 & 255) / 255, (i & 255) / 255];
}
async function Di() {
  try {
    if (typeof FontFace > "u" || typeof requestAnimationFrame != "function") return !1;
    const t = (typeof OffscreenCanvas < "u" ? new OffscreenCanvas(1, 1) : document.createElement("canvas")).getContext("webgl2");
    return t ? (t.getExtension("WEBGL_lose_context")?.loseContext(), !0) : !1;
  } catch {
    return !1;
  }
}
function Wi(s) {
  return { ...ws(s).dur };
}
function Hi(s, t) {
  return !t || t.role !== "host" && t.role !== "guest" ? Promise.reject(new Error("window: opts.role must be host or guest")) : !t.layers || !Array.isArray(t.layers.layers) || t.layers.layers.length === 0 ? Promise.reject(new Error("window: opts.layers is not a layer manifest")) : Ei(s, t);
}
export {
  Wi as durations,
  Hi as mount,
  Di as supported
};
