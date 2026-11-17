// The strip: one mesh per flying layer, rows across its shorter side ordered along its longer side
// from the head (the end nearer the sink) to the tail. A vertex shader places every row from the
// layer's clock: at rest on the card (moved only by the well), sliding down the well in the neck,
// in the stub from the sink to the glass, in the ribbon through the air, or collapsed at the end of
// the path once it has arrived in the guest's level. Also the lensing ring, and the same path in
// TypeScript for what the CPU has to know (labels, the rim of light at the cut).
import {
  BufferAttribute, BufferGeometry, DoubleSide, ShaderMaterial, Vector2, Vector3, Vector4, type IUniform, type Texture,
} from "three";
import { BLEND, GLASS, SAFE, type Shared } from "./gl";
import { NECK, PULL, RING_G, RING_RHO, SINK_DEPTH, STUB, TRAVEL, TRAVEL_POW, WELL_R } from "./schedule";

/** Width of a strip where it passes through the sink, in card widths: the layer falls into a point. */
export const SINK_W = 0.012;
/** How far a row's centre turns about the axis while it slides down the well, in radians. */
export const SPIN = 1.35;
/** Opacity of the ribbon's backing (the card background colour under the layer's own pixels). */
export const BACKING = 0.94;

export interface WellShared {
  /** x: strength of the well 0..1, y: swirl at the axis in radians, z: 1 = the anchored guest (the ribbon's host end is soft) */
  uWell: IUniform<Vector4>;
}

export function makeWellShared(): WellShared {
  return { uWell: { value: new Vector4(0, 0, 0, 0) } };
}

const f = (x: number): string => x.toFixed(7);

/** The well: where a point of the card at q (card units, about the axis) is, for strength uWell.x and swirl uWell.y. */
export const WELL = /* glsl */ `
uniform vec4 uWell;
float wellG(vec2 q) { return 1.0 / (1.0 + dot(q, q) / ${f(WELL_R * WELL_R)}); }
vec3 well(vec2 q) {
  float g = wellG(q);
  float k = 1.0 - ${f(PULL)} * uWell.x * g;
  float an = uWell.y * g, c = cos(an), s = sin(an);
  return vec3((c * q.x - s * q.y) * k, (s * q.x + c * q.y) * k, -${f(SINK_DEPTH)} * uWell.x * min(1.0, g / ${f(RING_G)}));
}`;

/** The ribbon path: the stub from the sink straight towards the eye up to the glass (the first STUB of it), then a quartic curve through the air. */
const PATH = /* glsl */ `
uniform vec3 uB1;
uniform vec3 uB2;
uniform vec3 uB3;
uniform vec3 uB4;
void pathAt(float s, out vec3 p, out vec3 t) {
  float d = ${f(SINK_DEPTH)} * uWell.x;
  vec3 A = vec3(0.0, 0.0, -d);
  vec3 toEye = uEye - A;
  vec3 G = A + toEye * (d / max(uEye.z + d, 1e-3));
  if (s <= ${f(STUB)}) {
    p = mix(A, G, s / ${f(STUB)});
    t = normalize(toEye);
  } else {
    float x = (s - ${f(STUB)}) / ${f(1 - STUB)}, y = 1.0 - x;
    p = y * y * y * y * G + 4.0 * y * y * y * x * uB1 + 6.0 * y * y * x * x * uB2 + 4.0 * y * x * x * x * uB3 + x * x * x * x * uB4;
    vec3 dp = y * y * y * (uB1 - G) + 3.0 * y * y * x * (uB2 - uB1) + 3.0 * y * x * x * (uB3 - uB2) + x * x * x * (uB4 - uB3);
    t = dot(dp, dp) > 1e-12 ? normalize(dp) : normalize(toEye);
  }
}`;

const STRIP_VERT = /* glsl */ `
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
${WELL}
${PATH}
vec2 rowRest(float u) { return uBox.xy + uOff + uLong * ((u - 0.5) * uLen.x); }
// the row with material coordinate u: its centre, its progress through the neck (0 at rest, 1 at the sink), its path fraction
void rowAt(float u, out vec3 c, out float w, out float s) {
  float tau = uClock - u * uFeed;
  w = clamp(1.0 + tau / ${f(NECK)}, 0.0, 1.0);
  s = pow(clamp(tau / ${f(TRAVEL)}, 0.0, 1.0), ${f(TRAVEL_POW)});
  if (tau <= 0.0) {
    float e = w * w * (3.0 - 2.0 * w);
    float an = ${f(SPIN)} * e, cs = cos(an), sn = sin(an);
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
      vec3 pn = c + vec3(across, 0.0) * (v * mix(uLen.y, ${f(SINK_W)}, e));
      P = mix(P, pn, smoothstep(0.0, 0.35, w));
      k = smoothstep(0.3, 0.95, w);
    } else {
      vec3 pc, t;
      pathAt(s, pc, t);
      float x = clamp((s - ${f(STUB)}) / ${f(1 - STUB)}, 0.0, 1.0);
      vec3 ref = mix(vec3(uShort, 0.0), uRef, smoothstep(0.1, 0.8, x));
      vec3 n0 = ref - t * dot(ref, t);
      n0 = dot(n0, n0) > 1e-8 ? normalize(n0) : normalize(cross(t, vec3(0.3, 0.5, 0.8)));
      vec3 bn = cross(t, n0);
      float th = 6.2831853 * (uTwist.x * smoothstep(0.0, 1.0, x) + uTwist.y * sin(3.1415927 * x) * sin(6.2831853 * (0.8 * u + uTwist.z)));
      P = pc + (n0 * cos(th) + bn * sin(th)) * (v * mix(${f(SINK_W)}, uWidth, smoothstep(0.0, 0.28, s)));
      k = 1.0;
    }
  }
  vRow = vec4(u, v, k, s);
  vP = P;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(P, 1.0);
}`;

const STRIP_FRAG = /* glsl */ `
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
${SAFE}
${GLASS}
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
  float back = k * ${f(BACKING)};
  c += (1.0 - c.a) * vec4(uBg * back, back);
  float fw = max(fwidth(vRow.y), 1e-6);
  float rim = 0.85 * k * (1.0 - smoothstep(0.7, 1.7, (0.5 - abs(vRow.y)) / fw));
  c = c * (1.0 - rim) + vec4(RIM * rim, rim);
  // the anchored guest: the end at the glass is soft, so an error in tracking has nothing sharp to move
  float soft = mix(1.0, smoothstep(${f(STUB)}, ${f(STUB + 0.07)}, vRow.w), uWell.z);
  gl_FragColor = c * (uOpacity * soft * windowFade(vP));
}`;

export function stripMaterial(sh: Shared, ws: WellShared, map: Texture): ShaderMaterial {
  return new ShaderMaterial({
    ...BLEND,
    side: DoubleSide,
    vertexShader: STRIP_VERT,
    fragmentShader: STRIP_FRAG,
    uniforms: {
      uSafe: sh.uSafe, uSide: sh.uSide, uEye: sh.uEye, uWin: sh.uWin, uBehind: sh.uBehind,
      uWell: ws.uWell,
      // the ribbon path in the air: four control points after the glass point, card space (each layer has its own)
      uB1: { value: new Vector3(0, 0, 1) }, uB2: { value: new Vector3(0, 0, 2) }, uB3: { value: new Vector3(0, 0, 3) }, uB4: { value: new Vector3(0, 0, 4) },
      map: { value: map }, uBg: { value: new Vector3() }, uOpacity: { value: 1 }, uRim: { value: 0 }, uProbe: { value: 0 },
      uBox: { value: new Vector4(0, 0, 1, 1) }, uOff: { value: new Vector2() },
      uLong: { value: new Vector2(0, -1) }, uShort: { value: new Vector2(1, 0) }, uLen: { value: new Vector2(1, 1) },
      uHand: { value: 1 }, uClock: { value: -1e3 }, uFeed: { value: 1 }, uDu: { value: 0.01 },
      uWidth: { value: 0.1 }, uTwist: { value: new Vector3(1, 0.1, 0) }, uRef: { value: new Vector3(1, 0, 0) },
    },
  });
}

/**
 * Strip geometry: position = (u, v, 0), u in 0..1 from head to tail in `rows` steps, v in -0.5..0.5 in
 * `cols` steps. Triangles run from the tail to the head, so (with no depth buffer) the neck and the
 * ribbon are drawn over the part of the layer that is still at rest.
 */
export function stripGeometry(rows: number, cols: number): BufferGeometry {
  const P = new Float32Array((rows + 1) * (cols + 1) * 3);
  let o = 0;
  for (let i = 0; i <= rows; i++) for (let j = 0; j <= cols; j++) {
    P[o++] = i / rows;
    P[o++] = j / cols - 0.5;
    P[o++] = 0;
  }
  const n = rows * cols * 6, I = n > 65535 || (rows + 1) * (cols + 1) > 65535 ? new Uint32Array(n) : new Uint16Array(n);
  o = 0;
  for (let i = rows - 1; i >= 0; i--) for (let j = 0; j < cols; j++) {
    const a = i * (cols + 1) + j, b = a + 1, c = a + cols + 1, d = c + 1;
    I[o++] = a; I[o++] = c; I[o++] = b; I[o++] = b; I[o++] = c; I[o++] = d;
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(P, 3));
  g.setIndex(new BufferAttribute(I, 1));
  return g;
}

// ---------------------------------------------------------------- the lensing ring

const RING_VERT = /* glsl */ `
uniform vec4 uRing;   // radius as a share of full, half width (material units), rotation (turns), opacity
centroid varying vec3 vP;
varying vec2 vR;
${WELL}
void main() {
  float an = position.x * 6.2831853;
  // the band lies inside the ring's radius, on the flat floor of the well: one plane, so its centre is the sink
  vec3 P = well(vec2(cos(an), sin(an)) * ((${f(RING_RHO)} + (position.y - 1.0) * uRing.y) * uRing.x));
  vR = position.xy;
  vP = P;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(P, 1.0);
}`;

const RING_FRAG = /* glsl */ `
uniform sampler2D map;
uniform vec4 uRing;
uniform float uProbe;
centroid varying vec3 vP;
varying vec2 vR;
${SAFE}
${GLASS}
void main() {
  if (windowSafe()) discard;
  if (windowDrop(vP)) discard;
  float a = uRing.w * (1.0 - smoothstep(0.35, 1.0, abs(vR.y))) * windowFade(vP);
  if (uProbe > 0.5) { gl_FragColor = vec4(a, a, a, a); return; }
  // the card's own colours, brighter: the ring is the one place the card glows
  vec3 col = texture2D(map, vec2(fract(vR.x + uRing.z), 0.5)).rgb;
  col = min(vec3(1.0), col * 1.45 + 0.1);
  gl_FragColor = vec4(col * a, a);
}`;

export function ringMaterial(sh: Shared, ws: WellShared, polar: Texture): ShaderMaterial {
  return new ShaderMaterial({
    ...BLEND,
    side: DoubleSide,
    vertexShader: RING_VERT,
    fragmentShader: RING_FRAG,
    uniforms: {
      uSafe: sh.uSafe, uSide: sh.uSide, uEye: sh.uEye, uWin: sh.uWin, uBehind: sh.uBehind, uWell: ws.uWell,
      map: { value: polar }, uRing: { value: new Vector4(1, 0.012, 0, 0) }, uProbe: { value: 0 },
    },
  });
}

/** A band around the circle: position.x = share of the turn 0..1, position.y = -1 (inner edge) .. 1 (outer edge). */
export function ringGeometry(segments: number): BufferGeometry {
  const P = new Float32Array((segments + 1) * 2 * 3), I = new Uint16Array(segments * 6);
  for (let i = 0; i <= segments; i++) {
    P[i * 6] = i / segments; P[i * 6 + 1] = -1; P[i * 6 + 2] = 0;
    P[i * 6 + 3] = i / segments; P[i * 6 + 4] = 1; P[i * 6 + 5] = 0;
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    I.set([a, a + 1, a + 2, a + 2, a + 1, a + 3], i * 6);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(P, 3));
  g.setIndex(new BufferAttribute(I, 1));
  return g;
}

/**
 * The ring's colours: for each of `n` directions about the card's centre, the colour along that
 * direction that differs most from the card background, read from a small composite of the card.
 * `data` is that composite (RGBA, w x h); returns n RGBA texels.
 */
export function polarColours(data: Uint8ClampedArray, w: number, h: number, bg: readonly number[], n: number): Uint8Array {
  const out = new Uint8Array(n * 4), br = bg[0] * 255, bgc = bg[1] * 255, bb = bg[2] * 255;
  const reach = 0.5 * Math.min(w, h * 2);
  for (let i = 0; i < n; i++) {
    const an = (i / n) * Math.PI * 2, dx = Math.cos(an), dy = -Math.sin(an);
    let best = -1, r = br, g = bgc, b = bb;
    for (let s = 2; s < reach; s++) {
      const x = Math.round(w / 2 + dx * s), y = Math.round(h / 2 + dy * s);
      if (x < 0 || y < 0 || x >= w || y >= h) break;
      const o = (y * w + x) * 4;
      const d = Math.abs(data[o] - br) + Math.abs(data[o + 1] - bgc) + Math.abs(data[o + 2] - bb);
      if (d > best) { best = d; r = data[o]; g = data[o + 1]; b = data[o + 2]; }
    }
    out[i * 4] = r; out[i * 4 + 1] = g; out[i * 4 + 2] = b; out[i * 4 + 3] = 255;
  }
  return out;
}

// ---------------------------------------------------------------- the path on the CPU

/** The ribbon path of one layer in card space: the sink, the glass point, and the air's control points. */
export interface RibbonPath { A: Vector3; G: Vector3; B1: Vector3; B2: Vector3; B3: Vector3; B4: Vector3 }

export function makePath(): RibbonPath {
  return { A: new Vector3(), G: new Vector3(), B1: new Vector3(), B2: new Vector3(), B3: new Vector3(), B4: new Vector3() };
}

/** The sink and the glass point for an eye and a strength: the stub runs from A to G. */
export function setStub(p: RibbonPath, eye: Vector3, a: number): void {
  const d = SINK_DEPTH * a;
  p.A.set(0, 0, -d);
  p.G.copy(eye).sub(p.A).multiplyScalar(d / Math.max(eye.z + d, 1e-3)).add(p.A);
}

/** Point of the path at fraction s (the same function as the shader's pathAt). */
export function pathPoint(p: RibbonPath, s: number, out: Vector3): Vector3 {
  if (s <= STUB) return out.copy(p.A).lerp(p.G, s / STUB);
  const x = Math.min(1, (s - STUB) / (1 - STUB)), y = 1 - x;
  const a = y * y * y * y, b = 4 * y * y * y * x, c = 6 * y * y * x * x, d = 4 * y * x * x * x, e = x * x * x * x;
  return out.set(
    a * p.G.x + b * p.B1.x + c * p.B2.x + d * p.B3.x + e * p.B4.x,
    a * p.G.y + b * p.B1.y + c * p.B2.y + d * p.B3.y + e * p.B4.y,
    a * p.G.z + b * p.B1.z + c * p.B2.z + d * p.B3.z + e * p.B4.z,
  );
}
