// The cavity: the lit room behind the glass. Four walls, a luminous back panel and ruler numerals,
// all in card space (card 1 wide and H tall, glass at z = 0, back wall at z = -depth). The host
// draws it through the eye's off-axis frustum; the unanchored guest draws it through its own camera.
// Both drop every fragment the window's frame would hide (GLASS in gl.ts).
import {
  BufferAttribute, BufferGeometry, CanvasTexture, ClampToEdgeWrapping, Group, LinearFilter, Mesh, ShaderMaterial, Vector3, Vector4,
  type Texture,
} from "three";
import { ctx2d, makeCanvas, type AnyCanvas } from "./assets";
import { BLEND, GLASS, SAFE, type Shared } from "./gl";

/** Sheets whose shadow the walls can show at once (the contract allows 8 layers, one of them the QR). */
export const MAX_SHADOWS = 8;

const WALL_VERT = /* glsl */ `
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
}`;

// vSide: 0 floor, 1 ceiling, 2 left wall, 3 right wall, 4 back panel. vW = (place along the opening edge 0..1, unused).
const WALL_FRAG = /* glsl */ `
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
uniform vec4 uSheet[${MAX_SHADOWS}];
uniform float uSheetZ[${MAX_SHADOWS}];
uniform float uSheetA[${MAX_SHADOWS}];
uniform float uInk;
varying vec3 vP;
varying vec2 vW;
varying float vSide;
const vec3 RIM = vec3(0.918, 0.949, 1.0);
${SAFE}
${GLASS}
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
    for (int i = 0; i < ${MAX_SHADOWS}; i++) {
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
}`;

const TEXT_VERT = /* glsl */ `
varying vec3 vP;
varying vec2 vUv;
void main() {
  vP = position;
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const TEXT_FRAG = /* glsl */ `
uniform sampler2D map;
uniform float uAlpha;
uniform float uInk;
uniform float uReach;
varying vec3 vP;
varying vec2 vUv;
const vec3 RIM = vec3(0.918, 0.949, 1.0);
${SAFE}
${GLASS}
void main() {
  if (windowSafe()) discard;
  if (windowDrop(vP)) discard;
  // a flag behind the bottom sheet is hidden by it
  if (-vP.z > uReach) discard;
  float a = texture2D(map, vUv).a * uAlpha;
  gl_FragColor = vec4((uInk > 0.0 ? RIM : vec3(0.12, 0.14, 0.17)) * a, a);
}`;

export interface CavityLayer { img: CanvasImageSource; x: number; y: number; w: number; h: number }

export interface CavityOptions {
  shared: Shared;
  /** card height in card units, cavity depth, ruler step (100 design px) in card units */
  cardH: number; depth: number; ruler: number;
  /** design size and background of the card, and its non-QR layers bottom to top, for the edge texture */
  cardW: number; cardHpx: number; background: string; bg: [number, number, number]; layers: CavityLayer[];
  /** 1 = rulers and numerals, 0.6 = rulers only, 0 = bare walls; wall shadows on or off */
  detail: number; shadows: boolean;
  font: string;
  ref: HTMLCanvasElement;
}

/** Luminance (linear, Rec. 709) of an sRGB colour given as 0..1 components. */
export function luminance(c: readonly number[]): number {
  const f = (v: number): number => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
}

/** The panel colour: the card background half-way to the rim white. */
export function panelColor(bg: readonly number[]): [number, number, number] {
  return [bg[0] + (0.918 - bg[0]) * 0.5, bg[1] + (0.949 - bg[1]) * 0.5, bg[2] + (1 - bg[2]) * 0.5];
}

export class Cavity {
  readonly group = new Group();
  private readonly geos: BufferGeometry[] = [];
  private readonly wallMat: ShaderMaterial;
  private readonly textMat: ShaderMaterial | null = null;
  private readonly edge: Texture;
  private readonly glyphs: Texture | null = null;
  private readonly walls: Mesh;
  private readonly text: Mesh | null = null;
  /** uniform arrays, written in place every frame */
  readonly sheet: Vector4[] = [];
  readonly sheetZ = new Float32Array(MAX_SHADOWS);
  readonly sheetA = new Float32Array(MAX_SHADOWS);
  /** true on a dark card: the room is lit and nothing in it is darker than the card background */
  readonly lit: boolean;
  readonly bytes: number;

  constructor(o: CavityOptions) {
    const H = o.cardH, D = o.depth, hw = 0.5, hh = H / 2;
    // edge texture: the flat composite at a small size; the walls read its outermost rows and columns
    const ew = 256, eh = Math.max(2, Math.round(ew * H));
    const ec = makeCanvas(ew, eh, o.ref), ex = ctx2d(ec, true);
    ex.fillStyle = o.background;
    ex.fillRect(0, 0, ew, eh);
    ex.imageSmoothingEnabled = true;
    ex.imageSmoothingQuality = "high";
    const k = ew / o.cardW;
    for (const l of o.layers) ex.drawImage(l.img, l.x * k, l.y * k, l.w * k, l.h * k);
    this.edge = canvasTexture(ec);
    let bytes = ew * eh * 4;

    // walls and back panel: five quads, positions in card space
    const pos: number[] = [], wall: number[] = [], side: number[] = [], idx: number[] = [];
    const quad = (s: number, p: number[][], w: number[][]): void => {
      const b = pos.length / 3;
      for (let i = 0; i < 4; i++) { pos.push(p[i][0], p[i][1], p[i][2]); wall.push(w[i][0], w[i][1]); side.push(s); }
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    };
    const W = [[0, 0], [1, 0], [1, 1], [0, 1]];
    quad(0, [[-hw, -hh, 0], [hw, -hh, 0], [hw, -hh, -D], [-hw, -hh, -D]], W);
    quad(1, [[-hw, hh, 0], [hw, hh, 0], [hw, hh, -D], [-hw, hh, -D]], W);
    quad(2, [[-hw, -hh, 0], [-hw, hh, 0], [-hw, hh, -D], [-hw, -hh, -D]], W);
    quad(3, [[hw, -hh, 0], [hw, hh, 0], [hw, hh, -D], [hw, -hh, -D]], W);
    quad(4, [[-hw, -hh, -D], [hw, -hh, -D], [hw, hh, -D], [-hw, hh, -D]], W);
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
    g.setAttribute("aWall", new BufferAttribute(new Float32Array(wall), 2));
    g.setAttribute("aSide", new BufferAttribute(new Float32Array(side), 1));
    g.setIndex(idx);
    this.geos.push(g);
    for (let i = 0; i < MAX_SHADOWS; i++) this.sheet.push(new Vector4());
    this.lit = luminance(o.bg) < 0.35;
    const sh = o.shared, panel = this.lit ? panelColor(o.bg) : ([o.bg[0], o.bg[1], o.bg[2]] as [number, number, number]);
    this.wallMat = new ShaderMaterial({
      ...BLEND,
      vertexShader: WALL_VERT,
      fragmentShader: WALL_FRAG,
      uniforms: {
        uSafe: sh.uSafe, uSide: sh.uSide, uEye: sh.uEye, uWin: sh.uWin, uBehind: sh.uBehind,
        uEdge: { value: this.edge }, uBg: { value: new Vector3(o.bg[0], o.bg[1], o.bg[2]) },
        uPanel: { value: new Vector3(panel[0], panel[1], panel[2]) },
        uDepth: { value: D }, uH: { value: H }, uRuler: { value: o.ruler }, uDetail: { value: o.detail },
        uLit: { value: 0 }, uAlpha: { value: 1 }, uShadow: { value: o.shadows ? 0.85 : 0 },
        uSheets: { value: 0 }, uSheet: { value: this.sheet }, uSheetZ: { value: this.sheetZ }, uSheetA: { value: this.sheetA },
        uInk: { value: this.lit ? 1 : -1 },
      },
    });
    this.walls = new Mesh(g, this.wallMat);
    this.walls.frustumCulled = false;
    this.walls.matrixAutoUpdate = false;
    this.walls.renderOrder = 1;
    this.group.add(this.walls);

    // ruler numerals at every 500 design px of depth: small upright flags in both lower corners, facing the
    // opening. Text lying on a wall would be foreshortened to a pixel or two from most eyes; a flag keeps its
    // shape and only shrinks with depth. From an eye to one side, the flags of the far side are the ones in view.
    const n = o.detail >= 1 ? Math.floor(D / (5 * o.ruler) + 1e-6) : 0;
    if (n > 0) {
      const cell = 96, rowH = 32;
      const tc = makeCanvas(cell, rowH * n, o.ref), tx = ctx2d(tc);
      tx.clearRect(0, 0, cell, rowH * n);
      tx.fillStyle = "#fff";
      tx.font = `500 22px ${o.font}`;
      tx.textBaseline = "middle";
      const widths: number[] = [];
      for (let i = 0; i < n; i++) {
        const str = String((i + 1) * 500);
        widths.push(Math.min(cell, Math.ceil(tx.measureText(str).width) + 4));
        tx.fillText(str, 2, rowH * i + rowH / 2 + 1);
      }
      this.glyphs = canvasTexture(tc);
      bytes += cell * rowH * n * 4;
      const tp: number[] = [], tu: number[] = [], ti: number[] = [];
      const th = 0.042, inset = 0.022;
      const flag = (i: number, x0: number, w: number, z: number): void => {
        const b = tp.length / 3, v0 = 1 - (i + 1) / n, v1 = 1 - i / n, y0 = -hh + inset;
        tp.push(x0, y0, z, x0 + w, y0, z, x0 + w, y0 + th, z, x0, y0 + th, z);
        tu.push(0, v0, widths[i] / cell, v0, widths[i] / cell, v1, 0, v1);
        ti.push(b, b + 1, b + 2, b, b + 2, b + 3);
      };
      for (let i = 0; i < n; i++) {
        const z = -(i + 1) * 5 * o.ruler, w = (th * widths[i]) / rowH;
        flag(i, -hw + inset, w, z);
        flag(i, hw - inset - w, w, z);
      }
      const tg = new BufferGeometry();
      tg.setAttribute("position", new BufferAttribute(new Float32Array(tp), 3));
      tg.setAttribute("uv", new BufferAttribute(new Float32Array(tu), 2));
      tg.setIndex(ti);
      this.geos.push(tg);
      this.textMat = new ShaderMaterial({
        ...BLEND,
        vertexShader: TEXT_VERT,
        fragmentShader: TEXT_FRAG,
        uniforms: {
          uSafe: sh.uSafe, uSide: sh.uSide, uEye: sh.uEye, uWin: sh.uWin, uBehind: sh.uBehind,
          map: { value: this.glyphs }, uAlpha: { value: 0.7 }, uInk: { value: this.lit ? 1 : -1 }, uReach: { value: 1e3 },
        },
      });
      this.text = new Mesh(tg, this.textMat);
      this.text.frustumCulled = false;
      this.text.matrixAutoUpdate = false;
      // after the sheets inside the room, before those at or in front of the glass (see apply() in effect.ts)
      this.text.renderOrder = 100;
      this.group.add(this.text);
    }
    this.group.matrixAutoUpdate = false;
    this.bytes = bytes;
  }

  /**
   * alpha: how much of the cavity shows; lit: how much of the back panel is uncovered; sheets: how many
   * shadow entries are filled; reach: how deep the room can be seen (the depth of the bottom sheet while it is inside).
   */
  set(alpha: number, lit: number, sheets: number, reach: number): void {
    const u = this.wallMat.uniforms;
    this.group.visible = alpha > 0;
    u.uAlpha.value = alpha;
    u.uLit.value = lit;
    u.uSheets.value = sheets;
    if (this.textMat) {
      this.textMat.uniforms.uAlpha.value = 0.7 * alpha;
      this.textMat.uniforms.uReach.value = reach;
    }
  }

  dispose(): void {
    for (const g of this.geos) g.dispose();
    this.wallMat.dispose();
    this.textMat?.dispose();
    this.edge.dispose();
    this.glyphs?.dispose();
  }
}

function canvasTexture(c: AnyCanvas): Texture {
  const t = new CanvasTexture(c as HTMLCanvasElement);
  t.premultiplyAlpha = true;
  t.generateMipmaps = false;
  t.minFilter = t.magFilter = LinearFilter;
  t.wrapS = t.wrapT = ClampToEdgeWrapping;
  return t;
}
