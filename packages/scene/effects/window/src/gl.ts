// Shaders, geometries and material factories. Every material draws premultiplied colour with
// ONE / ONE_MINUS_SRC_ALPHA, no depth test (painter's order comes from renderOrder), and refuses
// to touch pixels inside the host `safeRects`.
import {
  AddEquation, BufferAttribute, BufferGeometry, CustomBlending, DoubleSide, DynamicDrawUsage, FrontSide, InstancedBufferAttribute,
  InstancedBufferGeometry, Matrix4, OneFactor, OneMinusSrcAlphaFactor, ShaderMaterial, Vector2, Vector3, Vector4,
  type IUniform, type Texture,
} from "three";

export interface Shared {
  uRes: IUniform<Vector2>;
  uPr: IUniform<number>;
  uSafe: IUniform<Vector4[]>;
  uOrtho: IUniform<number>;
  uSnap: IUniform<number>;
  /** which side of the glass this device draws: -1 behind (host), +1 in front (anchored guest), 0 both, 2 = no glass (flat frames, landing) */
  uSide: IUniform<number>;
  /** opacity of everything behind the glass (the guest blends between anchored, 0, and unanchored, 1) */
  uBehind: IUniform<number>;
  /** the eye in card space, and the half size of the window (the card's rect) in card units */
  uEye: IUniform<Vector3>;
  uWin: IUniform<Vector2>;
  /** host without a viewer: the rim of light along the line where the glass cuts a sheet, 0..1 */
  uRim: IUniform<number>;
}

export function makeShared(): Shared {
  return {
    uRes: { value: new Vector2(1, 1) },
    uPr: { value: 1 },
    uSafe: { value: [new Vector4(), new Vector4(), new Vector4(), new Vector4()] },
    uOrtho: { value: 1 },
    uSnap: { value: 0 },
    uSide: { value: 2 },
    uBehind: { value: 1 },
    uEye: { value: new Vector3(0, 0, 6) },
    uWin: { value: new Vector2(0.5, 0.5) },
    uRim: { value: 0 },
  };
}

/**
 * The glass. A fragment at card-space position p is dropped when it is on the side of the glass
 * this device does not draw, or when it is behind the glass and the line from the eye to it does
 * not pass through the window (the body of the phone hides it). Host and guest run the same test
 * on the same shared state, which is why a sheet that is crossing the glass is cut along one line.
 */
export const GLASS = /* glsl */ `
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
float windowFade(vec3 p) { return uSide < 1.5 && p.z < 0.0 ? uBehind : 1.0; }`;

export const SAFE = /* glsl */ `
uniform vec4 uSafe[4];
bool windowSafe() {
  vec2 f = gl_FragCoord.xy;
  for (int i = 0; i < 4; i++) {
    vec4 r = uSafe[i];
    if (f.x >= r.x && f.x < r.z && f.y >= r.y && f.y < r.w) return true;
  }
  return false;
}`;

const SHEET_VERT = /* glsl */ `
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
}`;

const SHEET_FRAG = /* glsl */ `
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
${SAFE}
${GLASS}
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
}`;

const SHADOW_VERT = /* glsl */ `
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
}`;

const SHADOW_FRAG = /* glsl */ `
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
${SAFE}
${GLASS}
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
}`;

// Screen-space lines of constant pixel width. Instance: endpoints iA/iB, iP = (width CSS px, group,
// path start, path end), iC = straight colour. Groups: 0 frame, 1 measure, 2 handle, 3 leader.
const LINE_VERT = /* glsl */ `
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
}`;

const LINE_FRAG = /* glsl */ `
uniform float uDash;
uniform float uScreen;
varying vec4 vC;
varying vec3 vL;
varying vec2 vS;
varying vec3 vP;
${SAFE}
${GLASS}
void main() {
  if (windowSafe()) discard;
  if (uScreen < 0.5 && windowDrop(vP)) discard;
  if (vL.z <= 0.0) discard;
  float s = mix(vS.x, vS.y, clamp(vL.x / max(vL.y, 1e-3), 0.0, 1.0));
  if (s > vL.z) discard;
  if (uDash > 0.0 && mod(vL.x + uDash * 0.5, uDash * 2.0) >= uDash) discard;
  gl_FragColor = vC * (uScreen < 0.5 ? windowFade(vP) : 1.0);
}`;

// Screen-space sprites from the label atlas, snapped to device pixels. iRect in device px (y down),
// iUv = atlas rect, iFx = (opacity, reveal 0..1, reveal direction, unused).
const SPRITE_VERT = /* glsl */ `
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
}`;

const SPRITE_FRAG = /* glsl */ `
uniform sampler2D map;
varying vec2 vUv;
varying vec2 vQ;
varying vec4 vFx;
${SAFE}
void main() {
  if (windowSafe()) discard;
  float rv = vFx.z > 0.0 ? vQ.x : 1.0 - vQ.x;
  if (rv > vFx.y || vFx.x <= 0.0) discard;
  gl_FragColor = texture2D(map, vUv) * vFx.x;
}`;

const BG_VERT = /* glsl */ `
void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const BG_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uAlpha;
${SAFE}
void main() {
  if (windowSafe()) discard;
  gl_FragColor = vec4(uColor * uAlpha, uAlpha);
}`;

export const BLEND = {
  transparent: true,
  side: DoubleSide,
  depthTest: false,
  depthWrite: false,
  blending: CustomBlending,
  blendEquation: AddEquation,
  blendSrc: OneFactor,
  blendDst: OneMinusSrcAlphaFactor,
} as const;

export function sheetMaterial(sh: Shared, map: Texture, qr: boolean): ShaderMaterial {
  return new ShaderMaterial({
    ...BLEND,
    side: FrontSide,
    defines: qr ? { WINDOW_QR: 1 } : {},
    vertexShader: SHEET_VERT,
    fragmentShader: SHEET_FRAG,
    uniforms: {
      uRes: sh.uRes, uPr: sh.uPr, uSafe: sh.uSafe, uOrtho: sh.uOrtho, uSnap: sh.uSnap,
      uSide: sh.uSide, uEye: sh.uEye, uWin: sh.uWin, uBehind: sh.uBehind, uRim: sh.uRim, uLocal: { value: new Matrix4() },
      uGain: { value: 1 },
      map: { value: map }, mapB: { value: map }, uMix: { value: 0 },
      uBox: { value: new Vector4(0, 0, 1, 1) },
      uOpacity: { value: 1 }, uAcr: { value: 0 }, uSweep: { value: 0 }, uSweepAmt: { value: 0 }, uZoom: { value: 1 },
      uInner: { value: new Vector3(0, 0, -1) },
      uQr: { value: new Vector4(0, 0, 25, 25) }, uQrT: { value: new Vector3() }, uTile: { value: new Vector4(0, 0, 1, 1) },
    },
  });
}

export function shadowMaterial(sh: Shared, map: Texture, taps: number): ShaderMaterial {
  return new ShaderMaterial({
    ...BLEND,
    defines: { WINDOW_TAPS: taps },
    vertexShader: SHADOW_VERT,
    fragmentShader: SHADOW_FRAG,
    uniforms: {
      uSafe: sh.uSafe, uSide: sh.uSide, uEye: sh.uEye, uWin: sh.uWin, uBehind: sh.uBehind, uLocal: { value: new Matrix4() },
      map: { value: map },
      uBox: { value: new Vector4(0, 0, 1, 1) },
      uGrow: { value: new Vector2(1, 1) }, uRad: { value: new Vector2(0.01, 0.01) },
      uLod: { value: 0 }, uAlpha: { value: 0 }, uSlab: { value: 0 },
      uClip: { value: new Vector4(-1e3, -1e3, 1e3, 1e3) },
    },
  });
}

export function lineMaterial(sh: Shared, screen: boolean): ShaderMaterial {
  return new ShaderMaterial({
    ...BLEND,
    vertexShader: LINE_VERT,
    fragmentShader: LINE_FRAG,
    uniforms: {
      uRes: sh.uRes, uPr: sh.uPr, uSafe: sh.uSafe, uSnap: { value: 0 },
      uSide: sh.uSide, uEye: sh.uEye, uWin: sh.uWin, uBehind: sh.uBehind, uLocal: { value: new Matrix4() },
      uScreen: { value: screen ? 1 : 0 },
      uProg: { value: new Vector4(1, 1, 1, 1) }, uAlpha: { value: new Vector4(1, 1, 1, 1) },
      uDash: { value: 0 },
    },
  });
}

export function spriteMaterial(sh: Shared, atlas: Texture): ShaderMaterial {
  return new ShaderMaterial({
    ...BLEND,
    vertexShader: SPRITE_VERT,
    fragmentShader: SPRITE_FRAG,
    uniforms: { uRes: sh.uRes, uSafe: sh.uSafe, map: { value: atlas } },
  });
}

export function bgMaterial(sh: Shared): ShaderMaterial {
  return new ShaderMaterial({
    ...BLEND,
    vertexShader: BG_VERT,
    fragmentShader: BG_FRAG,
    uniforms: { uSafe: sh.uSafe, uColor: { value: new Vector3() }, uAlpha: { value: 1 } },
  });
}

/** Unit slab: x, y in [-0.5, 0.5], top face at z = 0, bottom at z = -1. aFace: 0 top, 1 bottom, 2 side. */
export function slabGeometry(): BufferGeometry {
  const P: number[] = [], N: number[] = [], U: number[] = [], F: number[] = [], I: number[] = [];
  const quad = (v: number[][], n: number[], uv: number[][], face: number) => {
    const base = P.length / 3;
    for (let i = 0; i < 4; i++) { P.push(...v[i]); N.push(...n); U.push(...uv[i]); F.push(face); }
    I.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  const uv = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const h = 0.5;
  quad([[-h, -h, 0], [h, -h, 0], [h, h, 0], [-h, h, 0]], [0, 0, 1], uv, 0);
  quad([[-h, h, -1], [h, h, -1], [h, -h, -1], [-h, -h, -1]], [0, 0, -1], [[0, 1], [1, 1], [1, 0], [0, 0]], 1);
  quad([[h, -h, -1], [h, h, -1], [h, h, 0], [h, -h, 0]], [1, 0, 0], uv, 2);
  quad([[-h, h, -1], [-h, -h, -1], [-h, -h, 0], [-h, h, 0]], [-1, 0, 0], uv, 2);
  quad([[h, h, -1], [-h, h, -1], [-h, h, 0], [h, h, 0]], [0, 1, 0], uv, 2);
  quad([[-h, -h, -1], [h, -h, -1], [h, -h, 0], [-h, -h, 0]], [0, -1, 0], uv, 2);
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(P), 3));
  g.setAttribute("normal", new BufferAttribute(new Float32Array(N), 3));
  g.setAttribute("uv", new BufferAttribute(new Float32Array(U), 2));
  g.setAttribute("aFace", new BufferAttribute(new Float32Array(F), 1));
  g.setIndex(I);
  return g;
}

/** Quad with x, y in [-0.5, 0.5] (or [-1, 1] when `full`), uv 0..1. */
export function planeGeometry(full = false): BufferGeometry {
  const h = full ? 1 : 0.5;
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array([-h, -h, 0, h, -h, 0, h, h, 0, -h, h, 0]), 3));
  g.setAttribute("uv", new BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  return g;
}

export interface LineSet {
  geometry: InstancedBufferGeometry;
  a: Float32Array;
  b: Float32Array;
  p: Float32Array;
  c: Float32Array;
  attrs: InstancedBufferAttribute[];
}

/** Instanced line quads: position.x = 0 start / 1 end, position.y = -1 / +1 across the width. */
export function lineSet(count: number): LineSet {
  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0]), 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  const a = new Float32Array(count * 3), b = new Float32Array(count * 3);
  const p = new Float32Array(count * 4), c = new Float32Array(count * 4);
  const attrs = [
    new InstancedBufferAttribute(a, 3), new InstancedBufferAttribute(b, 3),
    new InstancedBufferAttribute(p, 4), new InstancedBufferAttribute(c, 4),
  ];
  ["iA", "iB", "iP", "iC"].forEach((name, i) => {
    attrs[i].setUsage(DynamicDrawUsage);
    geometry.setAttribute(name, attrs[i]);
  });
  geometry.instanceCount = count;
  return { geometry, a, b, p, c, attrs };
}

export function setLine(
  s: LineSet, i: number, ax: number, ay: number, az: number, bx: number, by: number, bz: number,
  width: number, group: number, s0: number, s1: number, color: readonly number[], alpha = 1,
): void {
  const i3 = i * 3, i4 = i * 4;
  s.a[i3] = ax; s.a[i3 + 1] = ay; s.a[i3 + 2] = az;
  s.b[i3] = bx; s.b[i3 + 1] = by; s.b[i3 + 2] = bz;
  s.p[i4] = width; s.p[i4 + 1] = group; s.p[i4 + 2] = s0; s.p[i4 + 3] = s1;
  s.c[i4] = color[0]; s.c[i4 + 1] = color[1]; s.c[i4 + 2] = color[2]; s.c[i4 + 3] = alpha;
}

export interface SpriteSet {
  geometry: InstancedBufferGeometry;
  rect: Float32Array;
  uv: Float32Array;
  fx: Float32Array;
  attrs: InstancedBufferAttribute[];
}

export function spriteSet(count: number): SpriteSet {
  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]), 3));
  geometry.setIndex([0, 2, 1, 0, 3, 2]);
  const rect = new Float32Array(count * 4), uv = new Float32Array(count * 4), fx = new Float32Array(count * 4);
  const attrs = [new InstancedBufferAttribute(rect, 4), new InstancedBufferAttribute(uv, 4), new InstancedBufferAttribute(fx, 4)];
  ["iRect", "iUv", "iFx"].forEach((name, i) => {
    attrs[i].setUsage(DynamicDrawUsage);
    geometry.setAttribute(name, attrs[i]);
  });
  geometry.instanceCount = count;
  return { geometry, rect, uv, fx, attrs };
}

export const BLUE = [0x2f / 255, 0x80 / 255, 1] as const;
export const RED = [1, 0x4d / 255, 0x3d / 255] as const;
