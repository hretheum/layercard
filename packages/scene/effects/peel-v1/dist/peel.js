import { Vector4 as O, Vector2 as xt, BufferGeometry as Nt, BufferAttribute as k, ShaderMaterial as tt, Vector3 as U, FrontSide as re, OneMinusSrcAlphaFactor as ae, OneFactor as oe, AddEquation as ne, CustomBlending as he, DoubleSide as ce, InstancedBufferGeometry as Vt, InstancedBufferAttribute as j, DynamicDrawUsage as Xt, Scene as le, Camera as ue, Group as fe, Quaternion as X, Matrix4 as pe, WebGLRenderer as ve, Texture as Mt, Mesh as H, CanvasTexture as At, LinearFilter as Pt, LinearMipmapLinearFilter as de, Euler as me } from "three";
function V(a, t, e) {
  const i = Math.max(1, Math.round(a)), s = Math.max(1, Math.round(t));
  if (typeof OffscreenCanvas < "u") return new OffscreenCanvas(i, s);
  const c = e.ownerDocument.createElement("canvas");
  return c.width = i, c.height = s, c;
}
function K(a, t = !1) {
  const e = a.getContext("2d", t ? { willReadFrequently: !0 } : void 0);
  if (!e) throw new Error("peel: 2D canvas context unavailable");
  return e;
}
function St(a, t) {
  const e = new URL(a.endsWith("/") ? a : a + "/", self.location.href);
  return new URL(t, e).href;
}
async function Tt(a) {
  const t = new Image();
  t.crossOrigin = "anonymous", t.decoding = "async", t.src = a;
  try {
    await t.decode();
  } catch {
    throw new Error(`peel: cannot load layer image ${a}`);
  }
  return t;
}
function xe(a, t, e, i, s, c, h) {
  const o = Math.floor(t + 1e-4), l = Math.floor(e + 1e-4), d = Math.ceil(t + i - 1e-4), f = Math.ceil(e + s - 1e-4), x = Math.max(1, d - o), n = Math.max(1, f - l), r = K(c);
  r.setTransform(1, 0, 0, 1, 0, 0), r.globalCompositeOperation = "source-over", r.clearRect(o - 1, l - 1, x + 2, n + 2), r.imageSmoothingEnabled = !0, r.imageSmoothingQuality = "high", r.drawImage(a, t, e, i, s);
  const u = V(x, n, h), p = K(u);
  return p.imageSmoothingEnabled = !1, p.globalCompositeOperation = "copy", p.drawImage(c, o, l, x, n, 0, 0, x, n), r.clearRect(o - 1, l - 1, x + 2, n + 2), { canvas: u, x0: o, y0: l, w: x, h: n, tu: (t - o) / x, tv: 1 - (e - l + s) / n, tw: i / x, th: s / n };
}
function Ft(a, t) {
  const e = { ox: 0, oy: 0, nx: 25, ny: 25 };
  try {
    const i = Math.min(512, a.naturalWidth || 256), s = Math.min(512, a.naturalHeight || 256), c = V(i, s, t), h = K(c, !0);
    h.imageSmoothingEnabled = !1, h.drawImage(a, 0, 0, i, s);
    const o = h.getImageData(0, 0, i, s).data;
    let l = 255, d = 0;
    const f = new Uint8Array(i * s);
    for (let w = 0; w < i * s; w++) {
      const S = o[w * 4 + 3] / 255, M = Math.round((0.299 * o[w * 4] + 0.587 * o[w * 4 + 1] + 0.114 * o[w * 4 + 2]) * S + 255 * (1 - S));
      f[w] = M, M < l && (l = M), M > d && (d = M);
    }
    if (d - l < 60) return e;
    const x = (l + d) / 2;
    let n = i, r = s, u = -1, p = -1;
    for (let w = 0; w < s; w++) for (let S = 0; S < i; S++)
      f[w * i + S] < x && (S < n && (n = S), S > u && (u = S), w < r && (r = w), w > p && (p = w));
    if (u < 0) return e;
    let m = 0;
    for (; n + m < i && f[r * i + n + m] < x; ) m++;
    const v = m / 7, g = Math.round((u - n + 1) / v);
    if (v < 1.5 || g < 21 || g > 177 || (g - 21) % 4 !== 0) return e;
    const y = (u - n + 1) / g;
    return { ox: n % y / i, oy: r % y / s, nx: i / y, ny: s / y };
  } catch {
    return e;
  }
}
const $t = "PeelMono", ye = `${$t}, ui-monospace, Menlo, Consolas, monospace`;
let nt = null, ht = null, ct = 0;
function we() {
  if (ct++, !ht) {
    const a = new FontFace($t, `url(${new URL("./peel-mono.woff2", import.meta.url).href})`, { weight: "500", style: "normal" });
    nt = a, ht = a.load().then(
      () => {
        document.fonts.add(a);
      },
      () => {
      }
    );
  }
  return ht;
}
function ge() {
  ct--, ct <= 0 && (nt && document.fonts.delete(nt), nt = null, ht = null, ct = 0);
}
const _ = 20, Yt = 18, Rt = 2, Ct = 12, Lt = 11, lt = 14;
function be(a, t, e, i) {
  const s = K(V(4, 4, i)), c = (r) => `500 ${r * t}px ${ye}`, h = [];
  let o = 2, l = 2;
  for (const r of a) {
    const u = r.kind === "tag" ? Lt : Ct, p = r.kind === "tag" ? 0 : 6;
    s.font = c(u);
    let m = r.text;
    const v = (w) => s.measureText(w).width / t + 2 * p <= e;
    if (!v(m)) {
      for (; m.length > 1 && !v(m + "…"); ) m = m.slice(0, -1);
      m += "…";
    }
    const g = Math.ceil(s.measureText(m).width / t + 2 * p), y = r.kind === "chip" ? _ : r.kind === "pill" ? Yt : lt;
    h.push({ w: g, h: y, text: m }), o = Math.max(o, Math.ceil(g * t) + 4), l += Math.ceil(y * t) + 4;
  }
  const d = V(o, l, i), f = K(d), x = [];
  let n = 2;
  return a.forEach((r, u) => {
    const p = h[u], m = Math.ceil(p.w * t), v = Math.ceil(p.h * t), g = r.kind === "tag" ? Lt : Ct;
    f.font = c(g), f.textBaseline = "alphabetic";
    const y = f.measureText("H").actualBoundingBoxAscent || g * t * 0.72;
    if (r.kind !== "tag") {
      const w = 3 * t;
      f.fillStyle = r.kind === "chip" ? "#2F80FF" : "#FF4D3D", f.beginPath(), f.moveTo(2 + w, n), f.arcTo(2 + m, n, 2 + m, n + v, w), f.arcTo(2 + m, n + v, 2, n + v, w), f.arcTo(2, n + v, 2, n, w), f.arcTo(2, n, 2 + m, n, w), f.closePath(), f.fill();
    }
    f.fillStyle = r.kind === "tag" ? "#2F80FF" : "#FFFFFF", f.fillText(p.text, 2 + (r.kind === "tag" ? 0 : 6 * t), Math.round(n + (v + y) / 2)), x.push({ w: m / t, h: v / t, u0: 2 / o, v0: n / l, u1: (2 + m) / o, v1: (n + v) / l }), n += v + 4;
  }), { canvas: d, entries: x, bytes: o * l * 4 };
}
function Me() {
  return {
    uRes: { value: new xt(1, 1) },
    uPr: { value: 1 },
    uSafe: { value: [new O(), new O(), new O(), new O()] },
    uOrtho: { value: 1 },
    uSnap: { value: 0 }
  };
}
const et = (
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
), Ae = (
  /* glsl */
  `
attribute float aFace;
uniform vec4 uBox;
uniform vec2 uRes;
uniform float uSnap;
uniform float uOrtho;
varying vec2 vUv;
varying float vFace;
varying vec3 vN;
varying vec3 vV;
varying vec2 vCard;
varying vec3 vNo;
void main() {
  vUv = uv;
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
), Pe = (
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
${et}
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
), Se = (
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
), Te = (
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
${et}
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
), Fe = (
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
), Re = (
  /* glsl */
  `
uniform float uDash;
varying vec4 vC;
varying vec3 vL;
varying vec2 vS;
${et}
void main() {
  if (peelSafe()) discard;
  if (vL.z <= 0.0) discard;
  float s = mix(vS.x, vS.y, clamp(vL.x / max(vL.y, 1e-3), 0.0, 1.0));
  if (s > vL.z) discard;
  if (uDash > 0.0 && mod(vL.x + uDash * 0.5, uDash * 2.0) >= uDash) discard;
  gl_FragColor = vC;
}`
), Ce = (
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
), Le = (
  /* glsl */
  `
uniform sampler2D map;
varying vec2 vUv;
varying vec2 vQ;
varying vec4 vFx;
${et}
void main() {
  if (peelSafe()) discard;
  float rv = vFx.z > 0.0 ? vQ.x : 1.0 - vQ.x;
  if (rv > vFx.y || vFx.x <= 0.0) discard;
  gl_FragColor = texture2D(map, vUv) * vFx.x;
}`
), Ee = (
  /* glsl */
  `
void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`
), ze = (
  /* glsl */
  `
uniform vec3 uColor;
uniform float uAlpha;
${et}
void main() {
  if (peelSafe()) discard;
  gl_FragColor = vec4(uColor * uAlpha, uAlpha);
}`
), st = {
  transparent: !0,
  side: ce,
  depthTest: !1,
  depthWrite: !1,
  blending: he,
  blendEquation: ne,
  blendSrc: oe,
  blendDst: ae
};
function qe(a, t, e) {
  return new tt({
    ...st,
    side: re,
    defines: e ? { PEEL_QR: 1 } : {},
    vertexShader: Ae,
    fragmentShader: Pe,
    uniforms: {
      uRes: a.uRes,
      uPr: a.uPr,
      uSafe: a.uSafe,
      uOrtho: a.uOrtho,
      uSnap: a.uSnap,
      map: { value: t },
      mapB: { value: t },
      uMix: { value: 0 },
      uBox: { value: new O(0, 0, 1, 1) },
      uOpacity: { value: 1 },
      uAcr: { value: 0 },
      uSweep: { value: 0 },
      uSweepAmt: { value: 0 },
      uInner: { value: new U(0, 0, -1) },
      uQr: { value: new O(0, 0, 25, 25) },
      uQrT: { value: new U() },
      uTile: { value: new O(0, 0, 1, 1) }
    }
  });
}
function Ie(a, t, e) {
  return new tt({
    ...st,
    defines: { PEEL_TAPS: e },
    vertexShader: Se,
    fragmentShader: Te,
    uniforms: {
      uSafe: a.uSafe,
      map: { value: t },
      uBox: { value: new O(0, 0, 1, 1) },
      uGrow: { value: new xt(1, 1) },
      uRad: { value: new xt(0.01, 0.01) },
      uLod: { value: 0 },
      uAlpha: { value: 0 },
      uSlab: { value: 0 },
      uClip: { value: new O(-1e3, -1e3, 1e3, 1e3) }
    }
  });
}
function Et(a, t) {
  return new tt({
    ...st,
    vertexShader: Fe,
    fragmentShader: Re,
    uniforms: {
      uRes: a.uRes,
      uPr: a.uPr,
      uSafe: a.uSafe,
      uSnap: { value: 0 },
      uScreen: { value: t ? 1 : 0 },
      uProg: { value: new O(1, 1, 1, 1) },
      uAlpha: { value: new O(1, 1, 1, 1) },
      uDash: { value: 0 }
    }
  });
}
function Be(a, t) {
  return new tt({
    ...st,
    vertexShader: Ce,
    fragmentShader: Le,
    uniforms: { uRes: a.uRes, uSafe: a.uSafe, map: { value: t } }
  });
}
function Qe(a) {
  return new tt({
    ...st,
    vertexShader: Ee,
    fragmentShader: ze,
    uniforms: { uSafe: a.uSafe, uColor: { value: new U() }, uAlpha: { value: 1 } }
  });
}
function Ue() {
  const a = [], t = [], e = [], i = [], s = [], c = (d, f, x, n) => {
    const r = a.length / 3;
    for (let u = 0; u < 4; u++)
      a.push(...d[u]), t.push(...f), e.push(...x[u]), i.push(n);
    s.push(r, r + 1, r + 2, r, r + 2, r + 3);
  }, h = [[0, 0], [1, 0], [1, 1], [0, 1]], o = 0.5;
  c([[-o, -o, 0], [o, -o, 0], [o, o, 0], [-o, o, 0]], [0, 0, 1], h, 0), c([[-o, o, -1], [o, o, -1], [o, -o, -1], [-o, -o, -1]], [0, 0, -1], [[0, 1], [1, 1], [1, 0], [0, 0]], 1), c([[o, -o, -1], [o, o, -1], [o, o, 0], [o, -o, 0]], [1, 0, 0], h, 2), c([[-o, o, -1], [-o, -o, -1], [-o, -o, 0], [-o, o, 0]], [-1, 0, 0], h, 2), c([[o, o, -1], [-o, o, -1], [-o, o, 0], [o, o, 0]], [0, 1, 0], h, 2), c([[-o, -o, -1], [o, -o, -1], [o, -o, 0], [-o, -o, 0]], [0, -1, 0], h, 2);
  const l = new Nt();
  return l.setAttribute("position", new k(new Float32Array(a), 3)), l.setAttribute("normal", new k(new Float32Array(t), 3)), l.setAttribute("uv", new k(new Float32Array(e), 2)), l.setAttribute("aFace", new k(new Float32Array(i), 1)), l.setIndex(s), l;
}
function zt(a = !1) {
  const t = a ? 1 : 0.5, e = new Nt();
  return e.setAttribute("position", new k(new Float32Array([-t, -t, 0, t, -t, 0, t, t, 0, -t, t, 0]), 3)), e.setAttribute("uv", new k(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2)), e.setIndex([0, 1, 2, 0, 2, 3]), e;
}
function qt(a) {
  const t = new Vt();
  t.setAttribute("position", new k(new Float32Array([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0]), 3)), t.setIndex([0, 1, 2, 0, 2, 3]);
  const e = new Float32Array(a * 3), i = new Float32Array(a * 3), s = new Float32Array(a * 4), c = new Float32Array(a * 4), h = [
    new j(e, 3),
    new j(i, 3),
    new j(s, 4),
    new j(c, 4)
  ];
  return ["iA", "iB", "iP", "iC"].forEach((o, l) => {
    h[l].setUsage(Xt), t.setAttribute(o, h[l]);
  }), t.instanceCount = a, { geometry: t, a: e, b: i, p: s, c, attrs: h };
}
function q(a, t, e, i, s, c, h, o, l, d, f, x, n, r = 1) {
  const u = t * 3, p = t * 4;
  a.a[u] = e, a.a[u + 1] = i, a.a[u + 2] = s, a.b[u] = c, a.b[u + 1] = h, a.b[u + 2] = o, a.p[p] = l, a.p[p + 1] = d, a.p[p + 2] = f, a.p[p + 3] = x, a.c[p] = n[0], a.c[p + 1] = n[1], a.c[p + 2] = n[2], a.c[p + 3] = r;
}
function De(a) {
  const t = new Vt();
  t.setAttribute("position", new k(new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]), 3)), t.setIndex([0, 2, 1, 0, 3, 2]);
  const e = new Float32Array(a * 4), i = new Float32Array(a * 4), s = new Float32Array(a * 4), c = [new j(e, 4), new j(i, 4), new j(s, 4)];
  return ["iRect", "iUv", "iFx"].forEach((h, o) => {
    c[o].setUsage(Xt), t.setAttribute(h, c[o]);
  }), t.instanceCount = a, { geometry: t, rect: e, uv: i, fx: s, attrs: c };
}
const B = [47 / 255, 128 / 255, 1], it = [1, 77 / 255, 61 / 255], Zt = 1.4, I = 14, $ = 8, ft = 7;
function Oe(a) {
  return {
    side: a,
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
    zone: 0,
    row: 0
  };
}
function rt(a, t, e, i, s, c) {
  return (e - a) * (c - t) - (i - t) * (s - a);
}
function It(a, t, e, i, s, c, h, o) {
  const l = rt(s, c, h, o, a, t), d = rt(s, c, h, o, e, i), f = rt(a, t, e, i, s, c), x = rt(a, t, e, i, h, o);
  return (l > 0 && d < 0 || l < 0 && d > 0) && (f > 0 && x < 0 || f < 0 && x > 0);
}
function Kt(a) {
  return Math.ceil(a / 2);
}
function We(a, t) {
  return a > 0 ? (a - 1) * Zt * t + t + I : 0;
}
const Bt = (a, t, e) => a >= t ? Math.floor((a - t) / e + 1e-6) + 1 : 0, Qt = (a, t, e) => a > 0 ? (a - 1) * e + t : 0;
function at(a, t, e, i, s = 0) {
  for (let c = s + 1; c < t; c++) {
    const h = a[c], o = i(e[h]);
    let l = c - 1;
    for (; l >= s && i(e[a[l]]) > o; )
      a[l + 1] = a[l], l--;
    a[l + 1] = h;
  }
}
const _e = (a) => a.ay, Ut = (a) => a.ax, Dt = (a) => -a.ax;
let yt = 0, wt = 0;
const Ot = (a) => a.tly - yt - (wt - a.bly) - 0.08 * (wt - yt);
function ke(a, t, e, i, s, c, h, o, l, d, f) {
  let x = 0;
  for (let r = 0; r < t; r++) a[r].bh > x && (x = a[r].bh);
  const n = Zt * x;
  yt = i, wt = c;
  for (let r = -1; r <= 1; r += 2) {
    let u = 0, p = 0;
    for (let A = 0; A < t; A++)
      a[A].side === r && (f[u++] = A, a[A].bw > p && (p = a[A].bw));
    if (u === 0) continue;
    const v = (r < 0 ? e - l - I : h - l - s - I) >= p, g = v ? r < 0 ? e - I : s + I : r < 0 ? l + p : h - l - p;
    let y = 0;
    if (v) {
      for (let T = 0; T < u; T++) {
        const R = a[f[T]];
        R.zone = 0, R.ax = r < 0 ? R.blx : R.brx, R.ay = r < 0 ? R.bly : R.bry;
      }
      at(f, u, a, _e);
      let A = -1e9;
      for (let T = 0; T < u; T++) {
        const R = a[f[T]];
        R.row = T, R.y = Math.max(R.ay - _ / 2, A + n), A = R.y;
      }
      const b = (u - 1) * n + x, C = c - i >= b ? Math.max(d, i) : d, L = c - i >= b ? Math.min(o - d, c) : o - d, z = a[f[u - 1]], F = z.y + z.bh - L;
      if (F > 0) for (let T = 0; T < u; T++) a[f[T]].y -= F;
      A = C - n;
      for (let T = 0; T < u; T++) {
        const R = a[f[T]];
        R.y < A + n && (R.y = A + n), A = R.y;
      }
    } else {
      const A = Kt(u), b = Bt(i - I - d, x, n), C = Bt(o - d - c - I, x, n), L = Math.min(b, Math.max(A, u - C)), z = Math.min(C, Math.max(A, u - b));
      at(f, u, a, Ot);
      for (let F = 0; F < u; F++) Ot(a[f[F]]) <= 0 && y++;
      y = Math.min(y, L), u - y > z && (y = Math.min(u, Math.max(y, u - z, L + z >= u ? 0 : Math.round(u * L / Math.max(1, L + z)))));
      for (let F = 0; F < u; F++) {
        const T = a[f[F]], R = F < y;
        T.zone = R ? -1 : 1, T.ax = r < 0 ? R ? T.tlx : T.blx : R ? T.trx : T.brx, T.ay = r < 0 ? R ? T.tly : T.bly : R ? T.try_ : T.bry;
      }
      at(f, y, a, r < 0 ? Ut : Dt), at(f, u, a, r < 0 ? Ut : Dt, y);
      for (let F = 0; F < u; F++) a[f[F]].row = F < y ? F : F - y;
    }
    const w = Math.max(i - I, d + Qt(y, x, n)), S = Math.min(c + I, o - d - Qt(u - y, x, n)), M = w + I * 0.55, E = S - I * 0.55;
    for (let A = 0; A < 8; A++) {
      let b = !1;
      for (let C = 0; C < u; C++) for (let L = C + 1; L < u; L++) {
        const z = a[f[C]], F = a[f[L]];
        if (z.zone !== F.zone) continue;
        let T;
        if (v) {
          const R = g - r * $;
          T = It(R, z.y + _ / 2, z.ax, z.ay, R, F.y + _ / 2, F.ax, F.ay);
        } else {
          const R = z.zone < 0 ? M : E;
          T = It(
            g - r * ($ + ft * z.row),
            R,
            z.ax,
            z.ay,
            g - r * ($ + ft * F.row),
            R,
            F.ax,
            F.ay
          );
        }
        if (T) {
          if (v) {
            const ie = z.y;
            z.y = F.y, F.y = ie;
          }
          const R = z.row;
          z.row = F.row, F.row = R, b = !0;
        }
      }
      if (!b) break;
    }
    for (let A = 0; A < u; A++) {
      const b = a[f[A]];
      b.ix = g, b.x = r < 0 ? g - b.bw : g, v ? (b.ex = g - r * $, b.ey = b.gy = b.y + _ / 2) : (b.y = b.zone < 0 ? w - b.bh - b.row * n : S + b.row * n, b.ex = g - r * ($ + ft * b.row), b.ey = b.y + _ / 2, b.gy = b.zone < 0 ? M : E);
    }
  }
}
const gt = 0.2, D = 0.9, J = 0.35, Jt = 0.45, je = 1.2, Wt = 0.06, te = 0.8, ut = 1.2, ee = 1, Z = 1.5, He = 5, _t = 0.28, kt = 1.12, P = (a) => a < 0 ? 0 : a > 1 ? 1 : a, Q = (a, t, e) => a + (t - a) * e, W = (a, t, e) => {
  const i = P((e - a) / (t - a));
  return i * i * (3 - 2 * i);
}, pt = (a) => (a = P(a), a < 0.5 ? 4 * a * a * a : 1 - Math.pow(-2 * a + 2, 3) / 2), Ge = (a) => 1 - Math.pow(1 - P(a), 3), Ne = (a, t = 0.9) => {
  const e = P(a) - 1;
  return 1 + (t + 1) * e * e * e + t * e * e;
}, G = 256, N = new Float64Array(G + 1);
(() => {
  const s = (h) => 3 * (1 - h) * (1 - h) * h * 0.16 + 3 * (1 - h) * h * h * 0.3 + h * h * h, c = (h) => 3 * (1 - h) * (1 - h) * h * 1 + 3 * (1 - h) * h * h * 1 + h * h * h;
  for (let h = 0; h <= G; h++) {
    const o = h / G;
    let l = 0, d = 1;
    for (let f = 0; f < 40; f++) {
      const x = (l + d) / 2;
      s(x) < o ? l = x : d = x;
    }
    N[h] = c((l + d) / 2);
  }
  N[0] = 0, N[G] = 1;
})();
function bt(a) {
  a = P(a);
  const t = a * G, e = Math.min(G - 1, Math.floor(t));
  return N[e] + (N[e + 1] - N[e]) * (t - e);
}
function Ve(a) {
  return a <= 0 ? 0 : a <= D ? (1 + Wt) * bt(a / D) : a < D + J ? 1 + Wt * 0.5 * (1 + Math.cos(Math.PI * (a - D) / J)) : 1;
}
function Xe(a) {
  let t = 0;
  for (const e of a.layers) e.role !== "qr" && t++;
  return t;
}
function se(a) {
  const t = Xe(a), e = t > 1 ? Math.min(0.75, Math.max(0.4, 3 / (t - 1))) : 0, i = gt + Math.max(0, t - 1) * e + D + J + Jt + je, s = new Float64Array(t), c = new Float64Array(t), h = new Float64Array(t), o = 0.5, l = 0.55;
  for (let d = 0; d < t; d++)
    s[d] = gt + d * e, c[d] = t > 1 ? d * (1 - o) / (t - 1) : 0, h[d] = t > 1 ? d * 0.35 / (t - 1) : 0;
  return {
    n: t,
    gap: e,
    start: s,
    rebuildStart: c,
    rebuildLand: o,
    assembleStart: h,
    assembleDrop: l,
    dur: { idle: 0, connect: te, depart: i, rebuild: Z, explode: i, fly: ut, assemble: ee }
  };
}
const jt = ["idle", "connect", "depart", "rebuild"], Ht = ["explode", "fly", "assemble"], Y = 0.012, vt = 0.08, dt = 0.11, mt = 0.035, $e = 17 * Math.PI / 180, Ye = 24 * Math.PI / 180, ot = 0.08, Gt = {
  high: { dpr: 2, tex: 2048, taps: 5, sweep: !0, aniso: 4, mem: 64 },
  mid: { dpr: 1.5, tex: 1536, taps: 1, sweep: !0, aniso: 2, mem: 40 },
  low: { dpr: 1, tex: 1024, taps: 0, sweep: !1, aniso: 1, mem: 24 },
  test: { dpr: 1, tex: 2048, taps: 5, sweep: !0, aniso: 4, mem: 64 }
};
async function Ze(a, t) {
  const e = new Ke(a, t);
  try {
    await e.init();
  } catch (i) {
    throw e.dispose(), i;
  }
  return e.handle();
}
class Ke {
  constructor(t, e) {
    this.canvas = t, this.opts = e, this.role = e.role, this.tier = Gt[e.quality] ?? Gt.mid, this.reduced = !!e.reduced, this.m = e.layers, this.P = se(this.m), this.cardH = this.m.card.h / this.m.card.w, this.tl = this.role === "host" ? "idle" : "explode", this.t0 = this.role === "host" ? performance.now() : 1 / 0;
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
  scene = new le();
  camera = new ue();
  frame = new fe();
  shared = Me();
  sheets = [];
  flying = [];
  slots = [];
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
  aPos = new U();
  aQuat = new X();
  vPos = new U(0, 0, -6);
  vQuat = new X();
  sPos = new U();
  sScaleY = 1;
  fPos = new U();
  fQuat = new X();
  fScl = new U(1, 1, 1);
  entry = new U();
  bgA = 0;
  glassW = 1;
  u = 1;
  spread = 1;
  // scratch
  v = new U();
  v2 = new U();
  q = new X();
  qi = new X();
  mat = new pe();
  box = [0, 0, 0, 0];
  onLost = (t) => {
    t.preventDefault(), cancelAnimationFrame(this.raf), this.raf = 0, this.opts.onLost?.("WebGL context lost");
  };
  loop = (t) => {
    this.disposed || (this.raf = requestAnimationFrame(this.loop), this.tick(t));
  };
  // ---------------------------------------------------------------- setup
  async init() {
    this.renderer = new ve({
      canvas: this.canvas,
      alpha: !0,
      antialias: !0,
      premultipliedAlpha: !0,
      depth: !1,
      stencil: !1,
      preserveDrawingBuffer: !1,
      powerPreference: "high-performance"
    }), this.renderer.setPixelRatio(1), this.renderer.setClearColor(0, 0), this.canvas.addEventListener("webglcontextlost", this.onLost);
    const e = this.m.layers.map((n, r) => ({ spec: n, i: r })).sort((n, r) => n.spec.z - r.spec.z || n.i - r.i);
    this.usesFont = !0;
    const [i] = await Promise.all([
      Promise.all(e.map((n) => Tt(St(this.opts.baseUrl, n.spec.src)))),
      we()
    ]);
    if (this.disposed) return;
    let s = 0;
    for (const n of e) n.spec.role !== "qr" && (s = Math.max(s, n.spec.z));
    const c = Ue(), h = zt(), o = zt(!0);
    this.geos.push(c, h, o);
    const l = this.P.n;
    let d = 0;
    const f = [];
    e.forEach((n, r) => {
      const u = n.spec.role === "qr", p = new Mt(), m = qe(this.shared, p, u), v = new H(c, m), g = this.tier.taps, y = g > 0 ? Ie(this.shared, p, g) : null, w = y ? new H(h, y) : null, S = qt(11), M = Et(this.shared, !1), E = new H(S.geometry, M);
      this.geos.push(S.geometry);
      const A = {
        i: n.i,
        spec: n.spec,
        qr: u,
        j: u ? -1 : d,
        k: u ? -1 : l - 1 - d,
        zn: s > 0 ? Math.min(1, n.spec.z / s) : 0,
        recv: -1,
        dupe: 0,
        slot: -1,
        chip: -1,
        pill: -1,
        img: i[r],
        tex: p,
        next: null,
        mixT0: 0,
        grid: u ? Ft(i[r], this.canvas) : null,
        bx: 0,
        by: 0,
        bw: 1,
        bh: 1,
        rx: 0,
        ry: 0,
        rw: 1,
        rh: 1,
        exit: 1,
        mesh: v,
        mat: m,
        shadow: w,
        smat: y,
        lines: E,
        lmat: M,
        lset: S,
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
      for (const b of [v, w, E])
        b && (b.matrixAutoUpdate = !1, b.frustumCulled = !1, this.frame.add(b));
      if (!u) {
        for (let b = this.flying.length - 1; b >= 0; b--) {
          const C = this.flying[b].spec.rect, L = n.spec.rect;
          if (L.x >= C.x - 1 && L.y >= C.y - 1 && L.x + L.w <= C.x + C.w + 1 && L.y + L.h <= C.y + C.h + 1) {
            A.recv = this.sheets.indexOf(this.flying[b]);
            break;
          }
        }
        for (const b of this.flying) {
          const C = b.spec.rect, L = n.spec.rect;
          Math.abs(L.x - C.x) < 1 && Math.abs(L.y - C.y) < 1 && Math.abs(L.w - C.w) < 1 && Math.abs(L.h - C.h) < 1 && A.dupe++;
        }
        A.slot = this.slots.length, this.slots.push(Oe(d % 2 === 0 ? -1 : 1)), A.chip = f.length, f.push({ text: n.spec.label ?? n.spec.name, kind: "chip" }), n.spec.dims && (A.pill = f.length, f.push({ text: n.spec.dims, kind: "pill" })), this.flying.push(A), d++;
      }
      this.sheets.push(A), this.buildLines(A);
    }), this.tagEntry = f.length, f.push({ text: "Layer moved →", kind: "tag" }), this.atlasItems = f, this.bgMat = Qe(this.shared);
    const x = Je(this.m.card.background);
    this.bgMat.uniforms.uColor.value.set(x[0], x[1], x[2]), this.bg = new H(o, this.bgMat), this.bg.frustumCulled = !1, this.bg.renderOrder = 0, this.scene.add(this.bg), this.frame.matrixAutoUpdate = !1, this.scene.add(this.frame), this.sprites = De(Math.max(1, l * 3)), this.geos.push(this.sprites.geometry), this.atlasTex = new Mt(), this.spriteMat = Be(this.shared, this.atlasTex), this.spriteMesh = new H(this.sprites.geometry, this.spriteMat), this.spriteMesh.frustumCulled = !1, this.spriteMesh.renderOrder = this.role === "host" ? 500 : 901, this.scene.add(this.spriteMesh), this.role === "guest" && (this.leaders = qt(Math.max(1, l * 3)), this.geos.push(this.leaders.geometry), this.leaderMesh = new H(this.leaders.geometry, Et(this.shared, !0)), this.leaderMesh.frustumCulled = !1, this.leaderMesh.renderOrder = 900, this.scene.add(this.leaderMesh)), this.buildEvents(), this.measure(), typeof ResizeObserver < "u" && (this.ro = new ResizeObserver(() => {
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
    const e = t.lset, i = this.role === "host", s = i ? 1 : 1.5, c = i ? 0.55 : 1, h = 0.5;
    q(e, 0, -h, h, 0, h, h, 0, s, 0, 0, 0.25, B, c), q(e, 1, h, h, 0, h, -h, 0, s, 0, 0.25, 0.5, B, c), q(e, 2, h, -h, 0, -h, -h, 0, s, 0, 0.5, 0.75, B, c), q(e, 3, -h, -h, 0, -h, h, 0, s, 0, 0.75, 1, B, c);
    for (let o = 4; o < 11; o++) q(e, o, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, it, 0);
    t.lmat.uniforms.uSnap.value = i ? 1 : 0, t.lmat.uniforms.uDash.value = 0;
  }
  /** Measurement geometry depends on the rect's aspect, so it is rewritten after every measure(). */
  placeMeasure(t) {
    if (this.role === "host" || t.qr) return;
    const e = t.lset, i = 0.5, s = Math.min(0.03, 0.3 * t.rh) / t.rh, c = Math.min(0.014, 0.14 * t.rh) / t.rh, h = -i - s;
    q(e, 4, -i, h, 0, i, h, 0, 1, 1, 0.1, 1, it), q(e, 5, -i, h - c, 0, -i, h + c, 0, 1, 1, 0, 0.1, it), q(e, 6, i, h - c, 0, i, h + c, 0, 1, 1, 0.9, 1, it), q(e, 7, -i, i, 0, -i, i, 0, 5, 2, 0, 0, B), q(e, 8, i, i, 0, i, i, 0, 5, 2, 0, 0, B), q(e, 9, i, -i, 0, i, -i, 0, 5, 2, 0, 0, B), q(e, 10, -i, -i, 0, -i, -i, 0, 5, 2, 0, 0, B);
    for (const o of e.attrs) o.needsUpdate = !0;
  }
  buildEvents() {
    const t = this.P, e = this.events;
    for (const i of [...jt, ...Ht]) e[i] = [];
    for (const i of this.flying) {
      const s = (c) => ({ index: i.i, id: i.spec.id, phase: c });
      e.depart.push({ t: t.start[i.k], e: s("leave") }), e.explode.push({ t: t.start[i.k], e: s("lift") }, { t: t.start[i.k] + D + J, e: s("settle") }), e.assemble.push({ t: t.assembleStart[i.j] + t.assembleDrop, e: s("arrive") }), e.rebuild.push({ t: t.rebuildStart[i.j] + t.rebuildLand, e: s("arrive") });
    }
    for (const i of this.sheets)
      i.qr && e.rebuild.push({ t: Z, e: { index: i.i, id: i.spec.id, phase: "arrive" } });
    for (const i in e) e[i].sort((s, c) => s.t - c.t);
  }
  /** Canvas metrics, the flat fit, the screen-resolution bake, the atlas and the static frames. */
  measure() {
    const t = this.canvas, e = this.m.card, i = this.role === "host";
    this.cw = Math.max(1, t.clientWidth || t.width), this.ch = Math.max(1, t.clientHeight || t.height);
    const s = !i && this.opts.assembleRect || { x: 0, y: 0, w: this.cw, h: this.ch }, c = Math.min(s.w / e.w, s.h / e.h), h = Math.max(e.w, e.h) * c, o = this.opts.quality === "test" ? 1 : self.devicePixelRatio || 1;
    let l = Math.min(o, this.tier.dpr, this.tier.tex / h);
    for (let r = 0; r < 8; r++) {
      this.bw = Math.max(1, Math.round(this.cw * l)), this.bh = Math.max(1, Math.round(this.ch * l)), this.sx = this.bw / this.cw, this.sy = this.bh / this.ch;
      const u = Math.min(s.w * this.sx / e.w, s.h * this.sy / e.h);
      this.fitW = e.w * u, this.fitH = e.h * u, this.fitX = s.x * this.sx + (s.w * this.sx - this.fitW) / 2, this.fitY = s.y * this.sy + (s.h * this.sy - this.fitH) / 2;
      let p = 0;
      for (const m of this.sheets) p += Math.ceil(m.spec.rect.w * u + 1) * Math.ceil(m.spec.rect.h * u + 1) * 4 * (4 / 3);
      if (p <= this.tier.mem * 1048576 * 0.9) break;
      l *= 0.85;
    }
    this.renderer.setSize(this.bw, this.bh, !1), this.shared.uRes.value.set(this.bw, this.bh), this.shared.uPr.value = this.sx, this.shared.uOrtho.value = i ? 1 : 0;
    const d = this.fitX + this.fitW / 2, f = this.fitY + this.fitH / 2;
    this.texBytes = 0, this.scratch = V(this.bw, this.bh, this.canvas);
    for (const r of this.sheets) {
      const u = r.spec.rect;
      this.setTexture(r, r.img, !1), r.rx = (u.x + u.w / 2 - e.w / 2) / e.w, r.ry = (e.h / 2 - (u.y + u.h / 2)) / e.w, r.rw = u.w / e.w, r.rh = u.h / e.w, r.exit = (this.bw - d) / this.fitW - (r.bx - r.bw / 2 * 1.05) + 0.06, this.placeMeasure(r);
    }
    this.scratch.width = this.scratch.height = 1, this.scratch = null, this.atlas = be(this.atlasItems, this.sx, Math.min(176, this.cw * 0.44), this.canvas), this.atlasTex?.dispose();
    const x = new At(this.atlas.canvas);
    x.flipY = !1, x.premultiplyAlpha = !0, x.generateMipmaps = !1, x.minFilter = x.magFilter = Pt, this.atlasTex = x, this.spriteMat.uniforms.map.value = x, this.texBytes += this.atlas.bytes;
    for (const r of this.flying) {
      const u = this.slots[r.slot], p = this.atlas.entries;
      u.bw = Math.max(p[r.chip].w, r.pill >= 0 ? p[r.pill].w : 0), u.bh = _ + (r.pill >= 0 ? Rt + Yt : 0);
    }
    const n = this.shared.uSafe.value;
    for (const r of n) r.set(0, 0, 0, 0);
    i && this.opts.safeRects && this.opts.safeRects.forEach((r, u) => {
      const p = Math.floor(r.x * this.sx), m = Math.ceil((r.x + r.w) * this.sx), v = this.bh - Math.ceil((r.y + r.h) * this.sy), g = this.bh - Math.floor(r.y * this.sy), y = n[Math.min(u, 3)];
      u < 4 ? y.set(p, v, m, g) : y.set(Math.min(y.x, p), Math.min(y.y, v), Math.max(y.z, m), Math.max(y.w, g));
    }), i ? (this.camera.projectionMatrix.makeOrthographic(0, this.bw, this.bh, 0, -1e4, 1e4), this.frame.matrix.set(
      this.fitW,
      0,
      0,
      d,
      0,
      this.fitW,
      0,
      this.bh - f,
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
  setTexture(t, e, i) {
    const s = this.m.card, c = t.spec.rect, h = this.fitW / s.w, o = this.scratch ?? V(this.bw, this.bh, this.canvas), l = xe(e, this.fitX + c.x * h, this.fitY + c.y * h, c.w * h, c.h * h, o, this.canvas), d = new At(l.canvas);
    d.premultiplyAlpha = !0, d.generateMipmaps = !0, d.minFilter = de, d.magFilter = Pt, d.anisotropy = Math.min(this.tier.aniso, this.renderer.capabilities.getMaxAnisotropy()), this.texBytes += l.w * l.h * 4 * (4 / 3);
    const f = t.mat.uniforms;
    if (i) {
      t.next?.dispose(), t.next = d, f.mapB.value = d;
      return;
    }
    t.tex.dispose(), t.tex = d, f.map.value = d, f.mapB.value = d, f.uMix.value = 0, t.smat && (t.smat.uniforms.map.value = d);
    const x = this.fitX + this.fitW / 2, n = this.fitY + this.fitH / 2;
    t.bx = (l.x0 + l.w / 2 - x) / this.fitW, t.by = (n - (l.y0 + l.h / 2)) / this.fitW, t.bw = l.w / this.fitW, t.bh = l.h / this.fitW, f.uTile.value.set(l.tu, l.tv, l.tw, l.th), t.grid && f.uQr.value.set(t.grid.ox, t.grid.oy, t.grid.nx, t.grid.ny);
  }
  // ---------------------------------------------------------------- guest frames
  setCamera() {
    const i = 0.05 * Math.tan(this.fov * Math.PI / 360), s = i * (this.aspect > 0 ? this.aspect : this.bw / this.bh);
    this.camera.projectionMatrix.makePerspective(-s, s, i, -i, 0.05, 200), this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert(), this.solveVirtual(), this.dirty = !0;
  }
  /** Face-on frame in which the card plane lands exactly on the flat fit, scaled by `zoom` about its centre. */
  screenFrame(t) {
    const e = this.camera.projectionMatrix.elements, i = e[0], s = e[5], c = i * this.bw / (2 * this.fitW * t), h = (this.fitX + this.fitW / 2) / this.bw * 2 - 1, o = 1 - (this.fitY + this.fitH / 2) / this.bh * 2;
    this.sPos.set(h * c / i, o * c / s, -c), this.sScaleY = i * this.bw / (s * this.bh);
  }
  /** Projects a card-space point through `pos`/`quat` to CSS px; result in this.v (x, y). */
  project(t, e, i, s, c, h) {
    const o = this.v.set(t, e * h, i).applyQuaternion(c).add(s).applyMatrix4(this.camera.projectionMatrix);
    return o.x = (o.x * 0.5 + 0.5) * this.cw, o.y = (0.5 - o.y * 0.5) * this.ch, o;
  }
  /** Screen bounding box of the settled exploded stack seen through `pos`/`quat`; result in this.box. */
  stackBox(t, e) {
    const i = this.box;
    i[0] = i[1] = 1e9, i[2] = i[3] = -1e9;
    for (const s of this.flying) {
      const c = s.by + mt * this.cardH * s.j, h = vt + dt * s.j + Y;
      for (let o = 0; o < 4; o++) {
        const l = this.project(s.bx + (o & 1 ? 0.5 : -0.5) * s.bw, c + (o & 2 ? 0.5 : -0.5) * s.bh, h, t, e, 1);
        l.x < i[0] && (i[0] = l.x), l.y < i[1] && (i[1] = l.y), l.x > i[2] && (i[2] = l.x), l.y > i[3] && (i[3] = l.y);
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
    this.vQuat.setFromEuler(new me($e, Ye, 0, "XYZ"));
    const t = ot * this.cw, e = ot * this.ch;
    let i = 0, s = 0, c = 0, h = 0;
    for (const p of this.slots)
      i = Math.max(i, p.bw), s = Math.max(s, p.bh), p.side < 0 ? c++ : h++;
    let o = t, l = this.cw - t, d = e, f = this.ch - e;
    if (l - o - 2 * (i + I) >= 0.4 * (l - o))
      o += i + I, l -= i + I;
    else {
      const p = We(Kt(Math.max(c, h)), s);
      d += p, f -= p;
    }
    const n = this.camera.projectionMatrix.elements, r = this.box;
    this.vPos.set(0, 0, -6);
    for (let p = 0; p < 14; p++) {
      this.stackBox(this.vPos, this.vQuat);
      const m = Math.min((l - o) / (r[2] - r[0]), (f - d) / (r[3] - r[1]));
      this.vPos.multiplyScalar(1 / m), this.stackBox(this.vPos, this.vQuat);
      const v = -this.vPos.z;
      this.vPos.x += ((o + l) / 2 - (r[0] + r[2]) / 2) / this.cw * 2 * (v / n[0]), this.vPos.y -= ((d + f) / 2 - (r[1] + r[3]) / 2) / this.ch * 2 * (v / n[5]);
    }
    this.stackBox(this.vPos, this.vQuat);
    const u = (r[3] + 0.04 * this.ch) / this.ch * 2 * (-this.vPos.z / n[5]);
    this.entry.set(0, u, 0).applyQuaternion(this.qi.copy(this.vQuat).invert()), this.everPose || (this.aPos.copy(this.vPos), this.aQuat.copy(this.vQuat));
  }
  // ---------------------------------------------------------------- per-frame state
  reset(t) {
    t.on = !0, t.op = 1, t.ox = 0, t.oy = 0, t.z = 0, t.sc = 1, t.acr = 0, t.sweep = 0, t.qT = 0, t.qLift = 0, t.lifted = !1, t.shA = 0, t.shx = 0, t.shy = 0, t.shBlur = 0, t.shZ = 0, t.shSlab = 0, t.shGlass = !1, t.fr = 0, t.frA = 0, t.ms = 0, t.hd = 0, t.chA = 0, t.lead = 0, t.chipR = 0, t.pillR = 0, t.tag = 0;
  }
  update(t) {
    this.role === "host" ? this.updateHost(this.tl, this.t) : this.updateGuest(this.tl, this.t, t), this.apply();
  }
  updateHost(t, e) {
    const i = this.P, s = this.reduced, c = this.sx / this.fitW;
    let h = t === "idle" || t === "connect" ? 1 : t === "depart" ? 1 - W(0, gt, e) : W(Z - 0.3, Z, e);
    s && (h = 0);
    let o = this.tiltX, l = this.tiltY;
    const d = Math.hypot(o, l);
    d > 1 && (o /= d, l /= d);
    let f = o * 10 * h, x = l * 10 * h;
    if (t === "idle" && !s) {
      const n = 1.5 * Math.sin(2 * Math.PI * e / He) * (1 - W(0, 0.15, Math.min(1, d)));
      f += n * 0.8, x += n * 0.6;
    }
    this.bgA = 1;
    for (const n of this.sheets) {
      this.reset(n);
      const r = n.qr ? 0.4 * n.zn : n.zn;
      n.ox = f * r * c, n.oy = -x * r * c;
      const u = Math.hypot(f, x) * r / 10;
      if (n.shA = 0.35 * P(u * 1.5), n.shx = -n.ox * 0.6, n.shy = -n.oy * 0.6, n.shBlur = (0.6 + 2.2 * u) * c, n.qr) {
        t === "connect" ? (n.qT = P(e / te), n.qLift = s ? 0 : 2.5) : t === "rebuild" ? (n.qT = 1 - P((e - 0.85) / (Z - 0.85)), n.qLift = s ? 0 : 2.5) : t === "depart" && (n.qT = 1), n.on = n.qT < 1, n.shA *= 1 - n.qT;
        continue;
      }
      if (t === "depart") {
        const p = e - i.start[n.k];
        if (p <= 0) continue;
        if (s) {
          n.op = 1 - P(p / 0.5), n.on = n.op > 0, n.fr = 1, n.frA = n.tag = P(p / 0.5);
          continue;
        }
        if (n.fr = P((p - 0.06) / 0.34), n.frA = 1, n.tag = P((p - 0.4) / 0.2), p >= D) {
          n.on = !1;
          continue;
        }
        const m = p / D, v = bt(m), g = W(0.12, 1, m);
        this.liftHost(n, v, g * g, P(p / 0.1), Q(-1.2, 1.2, m));
      } else if (t === "rebuild") {
        const p = e - i.rebuildStart[n.j], m = i.rebuildLand;
        if (s) {
          n.op = P(p / m), n.on = n.op > 0, n.fr = 1, n.frA = n.tag = 1 - n.op;
          continue;
        }
        if (n.fr = 1, n.frA = n.tag = 1 - P(p / 0.25), p <= 0) {
          n.on = !1;
          continue;
        }
        if (p >= m) continue;
        const v = Ge(p / m);
        this.liftHost(n, 1 - v, 1 - v, 1 - W(0.55, 1, p / m), Q(1.2, -1.2, p / m));
      }
    }
  }
  /** A sheet off the glass on the host: acrylic, 5 % bigger, shadow below, `slide` of the way out. */
  liftHost(t, e, i, s, c) {
    const h = this.sx / this.fitW;
    t.lifted = !0, t.acr = s, t.sc = 1 + 0.05 * e, t.ox += i * t.exit, t.oy += 0.03 * Math.sin(Math.PI * Math.min(1, i * 1.2)), t.shA = 0.35 * Math.sqrt(e) * s, t.shx = 0.014 * e, t.shy = -0.02 * e, t.shBlur = (1 + 5 * e) * h, t.shSlab = 0.3, t.sweep = c + 0.3 * this.tiltX;
  }
  updateGuest(t, e, i) {
    const s = this.P, c = this.reduced, h = !this.paused && i - this.uT0 < 350, o = this.u = h ? Q(this.uFrom, this.uTo, pt((i - this.uT0) / 350)) : this.uTo;
    this.hasPose && this.mat.fromArray(this.pose).decompose(this.aPos, this.aQuat, this.v2), this.fPos.copy(this.aPos).lerp(this.vPos, o), this.fQuat.copy(this.aQuat).slerp(this.vQuat, o), this.fScl.set(1, 1, 1);
    let l = 1, d = 1, f = 0;
    this.spread = 1, this.bgA = 0, this.glassW = 1 - o, this.shared.uSnap.value = 0, t === "fly" ? (f = c ? 0 : pt(e / ut), this.screenFrame(kt), this.fPos.lerp(this.sPos, f), this.fPos.y += 0.3 * Math.sin(Math.PI * f), this.fQuat.slerp(this.q.identity(), f), this.fScl.y = Q(1, this.sScaleY, f), l = this.spread = Q(1, _t, f), d = 1 - P(e / 0.3), this.bgA = c ? P(e / ut) : W(0.3, 1, e / ut), this.glassW *= 1 - f) : t === "assemble" && (this.screenFrame(c ? 1 : Q(kt, 1, pt(e / 0.75))), this.fPos.copy(this.sPos), this.fQuat.identity(), this.fScl.y = this.sScaleY, d = 0, this.bgA = 1, this.glassW = 0, e >= ee && (this.shared.uSnap.value = 1)), this.frame.matrix.compose(this.fPos, this.fQuat, this.fScl), this.frame.matrixWorldNeedsUpdate = !0, this.v2.copy(this.fPos).negate().applyQuaternion(this.qi.copy(this.fQuat).invert()).normalize();
    const x = 1.2 * (this.v2.x * 0.8 - this.v2.y * 0.6), n = mt * this.cardH;
    for (const r of this.sheets) {
      if (this.reset(r), r.qr) {
        r.on = !1;
        continue;
      }
      const u = vt + dt * r.j + Y;
      let p = l, m = 0;
      if (r.acr = 1, t === "explode") {
        const w = e - s.start[r.k];
        if (w <= 0) {
          r.on = !1;
          continue;
        }
        const S = P((w - D - J) / Jt);
        if (c)
          r.op = P(w / 0.5), r.chA = S, r.fr = r.ms = r.hd = r.lead = r.chipR = r.pillR = S > 0 ? 1 : 0;
        else {
          const M = Ve(w);
          p = Q(M, Math.max(M, 1), o), m = o * (1 - bt(w / D)), r.op = P(w / 0.08), r.sweep = -1.2 + 1.5 * Math.min(1, M) + 0.08 * r.j + x + 0.05 * Math.max(0, w - D), this.chrome(r, S);
        }
      } else if (t === "fly")
        c && (r.op = 1 - P(e / 0.7), r.on = r.op > 0), r.sweep = 0.3 + 0.08 * r.j + x + 0.9 * f, r.chA = d, r.fr = r.ms = r.hd = r.lead = r.chipR = r.pillR = d > 0 ? 1 : 0;
      else {
        const w = e - s.assembleStart[r.j];
        c ? (p = 0, r.acr = 0, r.op = P(w / 0.4), r.on = r.op > 0) : (p = _t * (1 - Ne(w / s.assembleDrop)), r.acr = 1 - W(0.5, 0.95, e), r.sweep = 1.2 + 0.08 * r.j + x + 0.6 * e);
      }
      r.ox = this.entry.x * m, r.oy = n * r.j * p + this.entry.y * m, r.z = u * p + this.entry.z * m;
      const v = r.recv >= 0 ? this.sheets[r.recv] : null, g = v && v.on ? v.z : 0, y = Math.max(0, r.z - Y * r.acr - g);
      r.shGlass = !(v && v.on), r.shZ = g, r.shx = 0.1 * y, r.shy = -0.14 * y, r.shBlur = 4e-3 + 0.05 * y, r.shSlab = 0.3, r.shA = 0.35 * r.op * r.acr * W(0, 0.02, y) * (1 - 0.45 * P(y / 0.8)) * (r.shGlass ? this.glassW : 1) * (1 - m);
    }
  }
  /** Chrome draw-in over CHROME seconds: frame trace, handles, measurement, leader, chip, pill. */
  chrome(t, e) {
    t.chA = e > 0 ? 1 : 0, t.fr = P(e / 0.556), t.hd = P((e - 0.45) / 0.2), t.ms = P((e - 0.5) / 0.35), t.lead = P((e - 0.55) / 0.3), t.chipR = P((e - 0.75) / 0.25), t.pillR = P((e - 0.85) / 0.15);
  }
  // ---------------------------------------------------------------- state -> GPU
  apply() {
    const t = this.role === "host", e = this.sx / this.fitW;
    this.bg.visible = this.bgA > 0, this.bgMat.uniforms.uAlpha.value = this.bgA;
    let i = 0;
    for (const s of this.sheets) {
      const c = t ? (s.lifted ? 600 : 10) + i * 3 : 10 + i * 10, h = s.acr, o = s.bw * s.sc, l = s.bh * s.sc, d = s.bx + s.ox, f = s.by + s.oy, x = s.mesh, n = s.mat.uniforms;
      if (x.visible = s.on && s.op > 0, x.visible && (x.matrix.set(o, 0, 0, d, 0, l, 0, f, 0, 0, Math.max(1e-5, Y * h), s.z, 0, 0, 0, 1), x.renderOrder = c + 1, n.uBox.value.set(d, f, o, l), n.uOpacity.value = s.op, n.uAcr.value = h, n.uSweep.value = s.sweep, n.uSweepAmt.value = this.tier.sweep && !this.reduced ? 1 : 0, n.uInner.value.set(-4e-3 / o, 6e-3 / l, this.tier.sweep ? 1 : -1), s.qr && n.uQrT.value.set(s.qT, -0.8 * s.qLift * e / s.rw, -s.qLift * e / s.rh), s.next)) {
        const v = P((performance.now() - s.mixT0) / 150);
        n.uMix.value = v, this.dirty = !0, v >= 1 && this.finishSwap(s);
      }
      const r = s.shadow, u = s.smat?.uniforms;
      if (r && u && (r.visible = x.visible && s.shA > 4e-3, r.visible)) {
        const v = s.shBlur * 2 + 2e-3, g = o + 2 * v, y = l + 2 * v, w = d + s.shx, S = f + s.shy;
        r.matrix.set(g, 0, 0, w, 0, y, 0, S, 0, 0, 1, s.shZ, 0, 0, 0, 1), u.uBox.value.set(w, S, g, y), u.uGrow.value.set(g / o, y / l), u.uRad.value.set(s.shBlur / o, s.shBlur / l), u.uLod.value = Math.log2(Math.max(1, s.shBlur * this.fitW * 0.9)), u.uAlpha.value = s.shA, u.uSlab.value = s.shSlab * h;
        const M = !t && s.recv >= 0 && !s.shGlass ? this.sheets[s.recv] : null;
        M ? u.uClip.value.set(M.bx + M.ox - M.bw / 2, M.by + M.oy - M.bh / 2, M.bx + M.ox + M.bw / 2, M.by + M.oy + M.bh / 2) : u.uClip.value.set(-1e3, -1e3, 1e3, 1e3), r.renderOrder = t ? c : M ? 10 + s.recv * 10 + 2 : 5;
      }
      const p = s.lines, m = s.lmat.uniforms;
      if (p.visible = !s.qr && (t ? s.frA > 0 : s.chA > 0 && x.visible), p.visible)
        if (t) {
          const v = (1 + 8 * s.dupe) * e;
          p.matrix.set(s.rw - v, 0, 0, s.rx, 0, s.rh - v, 0, s.ry, 0, 0, 1, 0, 0, 0, 0, 1), m.uDash.value = 6 * this.sx, m.uProg.value.set(s.fr, 0, 0, 0), m.uAlpha.value.set(s.frA, 0, 0, 0), p.renderOrder = 400 + i;
        } else
          p.matrix.set(s.rw, 0, 0, s.rx + s.ox, 0, s.rh, 0, s.ry + s.oy, 0, 0, 1, s.z, 0, 0, 0, 1), m.uProg.value.set(s.fr, s.ms, s.hd, 0), m.uAlpha.value.set(s.chA, s.chA, s.chA, 0), p.renderOrder = c + 3;
      i++;
    }
    t ? this.writeTags() : this.writeLabels();
  }
  /** Host: "Layer moved →" at the top-left of every outline. */
  writeTags() {
    const t = this.sprites, e = this.atlas.entries[this.tagEntry];
    let i = 0;
    for (const s of this.flying) {
      if (s.tag <= 0) continue;
      const c = this.fitX + (s.rx - s.rw / 2 + 0.5) * this.fitW, h = this.fitY + (this.cardH / 2 - s.ry - s.rh / 2) * this.fitW, l = s.rh * this.fitW >= (lt + 10) * this.sy, d = c + (6 + 4 * s.dupe) * this.sx, f = l ? h + (5 + (lt + 4) * s.dupe) * this.sy : h - (lt + 3) * this.sy;
      this.sprite(t, i++, d, f, e.w * this.sx, e.h * this.sy, e, s.tag * 0.9, 1, 1);
    }
    this.finishSprites(i);
  }
  sprite(t, e, i, s, c, h, o, l, d, f) {
    const x = e * 4;
    t.rect[x] = i, t.rect[x + 1] = s, t.rect[x + 2] = c, t.rect[x + 3] = h, t.uv[x] = o.u0, t.uv[x + 1] = o.v0, t.uv[x + 2] = o.u1, t.uv[x + 3] = o.v1, t.fx[x] = l, t.fx[x + 1] = d, t.fx[x + 2] = f, t.fx[x + 3] = 0;
  }
  finishSprites(t) {
    if (this.spriteMesh.visible = t > 0, this.sprites.geometry.instanceCount = t, t > 0) for (const e of this.sprites.attrs) e.needsUpdate = !0;
  }
  /** Guest: project the sheet corners, lay the label blocks out, write leaders and sprites. */
  writeLabels() {
    const t = this.leaders, e = this.sprites, i = this.atlas.entries;
    let s = !1;
    for (const m of this.flying) m.chA > 0 && m.on && (s = !0);
    if (!s) {
      this.finishSprites(0), this.leaderMesh.visible = !1;
      return;
    }
    const c = this.fScl.y, h = this.box;
    this.stackBox(this.fPos, this.fQuat);
    const o = h[0], l = h[1], d = h[2], f = h[3];
    let x = 0;
    for (const m of this.flying) {
      const v = this.slots[m.slot], g = m.rx, y = m.rw / 2, w = m.rh / 2, S = m.ry + mt * this.cardH * m.j * this.spread, M = (vt + dt * m.j + Y) * this.spread;
      let E = this.project(g - y, S + w, M, this.fPos, this.fQuat, c);
      v.tlx = E.x, v.tly = E.y, E = this.project(g + y, S + w, M, this.fPos, this.fQuat, c), v.trx = E.x, v.try_ = E.y, E = this.project(g - y, S - w, M, this.fPos, this.fQuat, c), v.blx = E.x, v.bly = E.y, E = this.project(g + y, S - w, M, this.fPos, this.fQuat, c), v.brx = E.x, v.bry = E.y, x++;
    }
    const n = ot * this.cw, r = ot * this.ch;
    ke(this.slots, x, o, l, d, f, this.cw, this.ch, n, r, this.order);
    let u = 0, p = 0;
    for (const m of this.flying) {
      const v = this.slots[m.slot], g = m.on ? m.chA : 0, y = P(m.lead / 0.5), w = P((m.lead - 0.5) / 0.25), S = P((m.lead - 0.75) / 0.25);
      if (q(t, p++, v.ax, v.ay, 0, Q(v.ax, v.ex, y), Q(v.ay, v.gy, y), 0, 1, 3, 0, 1, B, g * (m.lead > 0 ? 1 : 0)), q(t, p++, v.ex, v.gy, 0, v.ex, Q(v.gy, v.ey, w), 0, 1, 3, 0, 1, B, g * (w > 0 ? 1 : 0)), q(t, p++, v.ex, v.ey, 0, Q(v.ex, v.ix, S), v.ey, 0, 1, 3, 0, 1, B, g * (S > 0 ? 1 : 0)), g <= 0) continue;
      const M = i[m.chip], E = -v.side, A = v.side < 0 ? v.ix - M.w : v.ix;
      if (m.chipR > 0 && this.sprite(e, u++, A * this.sx, v.y * this.sy, M.w * this.sx, M.h * this.sy, M, g, m.chipR, E), m.pill >= 0 && m.pillR > 0) {
        const b = i[m.pill], C = v.side < 0 ? v.ix - b.w : v.ix;
        this.sprite(e, u++, C * this.sx, (v.y + _ + Rt) * this.sy, b.w * this.sx, b.h * this.sy, b, g, m.pillR, E);
      }
    }
    this.leaderMesh.visible = !0;
    for (const m of t.attrs) m.needsUpdate = !0;
    this.finishSprites(u);
  }
  // ---------------------------------------------------------------- loop
  tick(t) {
    if (this.paused) return;
    const e = this.P.dur[this.tl];
    let i = Math.max(0, (t - this.t0) / 1e3);
    i >= 0 || (i = 0);
    const s = this.tl === "idle";
    if (!s && i > e && (i = e), !(!(s ? !this.reduced : i !== this.t) && !this.dirty && !this.sizeDirty) && !(s && t - this.lastRender < 33 && !this.sizeDirty) && (this.t = i, this.sizeDirty && this.measure(), this.emit(i), this.dirty = !1, this.update(t), this.render(), this.lastRender = t, !s && i >= e && !this.done)) {
      this.done = !0;
      const h = this.resolve;
      this.resolve = null, h?.(), this.opts.onDone?.({ timeline: this.tl });
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
        const s = Math.max(-1, Math.min(1, e || 0)), c = Math.max(-1, Math.min(1, i || 0));
        (s !== this.tiltX || c !== this.tiltY) && (this.tiltX = s, this.tiltY = c, this.dirty = !0);
      },
      setPose: (e) => {
        const i = this.hasPose;
        if (this.hasPose = !!e && e.length >= 16, e && this.hasPose) {
          for (let s = 0; s < 16; s++) this.pose[s] = e[s];
          this.everPose = !0;
        }
        i !== this.hasPose && (this.uFrom = this.u, this.uTo = this.hasPose ? 0 : 1, this.uT0 = performance.now()), this.dirty = !0;
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
    if (!(this.role === "host" ? jt : Ht).includes(t)) return Promise.reject(new Error(`peel: timeline "${t}" does not belong to role "${this.role}"`));
    if (this.disposed) return Promise.reject(new Error("peel: disposed"));
    const s = this.resolve;
    return this.resolve = null, s?.(), this.tl = t, this.t0 = typeof e == "number" && isFinite(e) ? e : performance.now(), this.t = 0, this.prevT = -1, this.evCursor = 0, this.done = !1, this.dirty = !0, t === "idle" ? new Promise(() => {
    }) : new Promise((c) => {
      this.resolve = c;
    });
  }
  async replaceLayer(t, e) {
    const i = this.sheets.find((c) => c.spec.id === t);
    if (!i) throw new Error(`peel: no layer "${t}"`);
    const s = await Tt(St(this.opts.baseUrl, e));
    if (!this.disposed) {
      if (i.img = s, i.qr && (i.grid = Ft(s, this.canvas), i.mat.uniforms.uQr.value.set(i.grid.ox, i.grid.oy, i.grid.nx, i.grid.ny)), this.setTexture(i, s, !0), i.mixT0 = performance.now(), this.dirty = !0, this.paused) {
        this.finishSwap(i);
        return;
      }
      await new Promise((c) => setTimeout(c, 170)), this.disposed || this.finishSwap(i);
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
    this.scene.clear(), this.sheets = [], this.flying = [], this.renderer && (this.renderer.renderLists.dispose(), this.renderer.dispose()), this.usesFont && ge(), this.usesFont = !1;
  }
}
function Je(a) {
  const t = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(a.trim());
  if (!t) return [0, 0, 0];
  let e = t[1];
  e.length === 3 && (e = e[0] + e[0] + e[1] + e[1] + e[2] + e[2]);
  const i = parseInt(e, 16);
  return [(i >> 16 & 255) / 255, (i >> 8 & 255) / 255, (i & 255) / 255];
}
async function es() {
  try {
    if (typeof FontFace > "u" || typeof requestAnimationFrame != "function") return !1;
    const t = (typeof OffscreenCanvas < "u" ? new OffscreenCanvas(1, 1) : document.createElement("canvas")).getContext("webgl2");
    return t ? (t.getExtension("WEBGL_lose_context")?.loseContext(), !0) : !1;
  } catch {
    return !1;
  }
}
function ss(a) {
  return { ...se(a).dur };
}
function is(a, t) {
  return !t || t.role !== "host" && t.role !== "guest" ? Promise.reject(new Error("peel: opts.role must be host or guest")) : !t.layers || !Array.isArray(t.layers.layers) || t.layers.layers.length === 0 ? Promise.reject(new Error("peel: opts.layers is not a layer manifest")) : Ze(a, t);
}
export {
  ss as durations,
  is as mount,
  es as supported
};
