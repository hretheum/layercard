// The effect: one renderer, one scene graph, two roles. Everything is placed in card space (card 1
// wide, +Z out of the host screen, the glass at z = 0, the cavity behind it). The host draws what is
// behind the glass through an off-axis frustum from an eye; the guest draws what is in front, in
// the pose it is given, or both sides when it has no pose. `update*()` turns (timeline, t, inputs)
// into per-sheet state; `apply()` pushes that state into matrices and uniforms. Nothing is
// allocated per frame.
import {
  Camera, CanvasTexture, Euler, Group, LinearFilter, LinearMipmapLinearFilter, Matrix4, Mesh, Quaternion, Scene,
  Texture, Vector3, WebGLRenderer, type BufferGeometry, type ShaderMaterial,
} from "three";
import type {
  Handle, LayerEvent, LayerManifest, LayerSpec, MountOptions, Quality, Rect, Role, Timeline,
} from "../../../types";
import {
  acquireFont, bakeLayer, buildAtlas, detectQrGrid, loadImage, makeCanvas, releaseFont, resolveUrl,
  BLOCK_GAP, CHIP_H, FONT_FAMILY, PILL_H, TEXT_PX, type AnyCanvas, type Atlas, type AtlasItem, type QrGrid,
} from "./assets";
import {
  bgMaterial, lineMaterial, lineSet, makeShared, planeGeometry, setLine, shadowMaterial, sheetMaterial,
  slabGeometry, spriteMaterial, spriteSet, BLUE, RED, type LineSet, type Shared, type SpriteSet,
} from "./gl";
import {
  channelFor, forceOneEnd, layoutLabelsHeld, makeHistory, makeSlot, reserveFor, rowsFor, type LabelHistory, type LabelSlot,
} from "./layout";
import {
  backOut, clamp01, crossHalf, easeInOut, exitDepth, exitTilt, hangDepth, insideDepth, mix, plan, rebuildDepth, rebuildTilt, smooth,
  APPROACH, ASSEMBLE, BREATH, CAVITY_DEPTH, CHROME, CONNECT, CROSS, DECK, DECK_ZOOM, EXIT, FLY, GUEST_TIMELINES, HOST_TIMELINES,
  LAND, OPEN, RB_CROSS, RB_FLAT, RB_FORWARD, RB_GATHER, RB_QR, RB_SLIDE, REBUILD, SETTLE, type Plan,
} from "./schedule";
import { Cavity, MAX_SHADOWS, type CavityLayer } from "./cavity";

export const THICK = 0.012;
export const Z0 = 0.08;
export const ZGAP = 0.11;
export const STAIR = 0.035;
// the unanchored guest: looking a little down on the window, swinging DRIFT either way. One sweep takes half
// of the event (3.875 s), so the swing ends where it began, at rest, exactly when the event ends
const VIRTUAL_PITCH = (10 * Math.PI) / 180;
const DRIFT = (12 * Math.PI) / 180;
// the host's eye without a viewer: this far in front of the centre, swung by tilt up to EYE_TILT
const EYE_DIST = 6;
const EYE_TILT = (25 * Math.PI) / 180;
/** A switch between a viewer and none is blended over this many milliseconds. */
const VIEWER_BLEND = 300;
/** A sheet this close behind the glass (or in front of it) is drawn after everything deeper in the room. */
const NEAR = 0.11;
/** How much brighter than its print a sheet is deep in the lit room (dark cards only). */
const LIGHT = 0.45;
const MARGIN = 0.08;
/** Free canvas on every side of the deck at the end of `fly`, as a share of the canvas width / height. */
const DECK_MARGIN = 0.04;
/** Host: the words left beside every outline; they name where the layer went (16 characters at most). */

interface Tier { dpr: number; tex: number; taps: number; sweep: boolean; aniso: number; mem: number }
const TIERS: Record<Quality, Tier> = {
  high: { dpr: 2, tex: 2048, taps: 5, sweep: true, aniso: 4, mem: 64 },
  mid: { dpr: 1.5, tex: 1536, taps: 1, sweep: true, aniso: 2, mem: 40 },
  low: { dpr: 1, tex: 1024, taps: 0, sweep: false, aniso: 1, mem: 24 },
  test: { dpr: 1, tex: 2048, taps: 5, sweep: true, aniso: 4, mem: 64 },
};

interface Sheet {
  i: number; spec: LayerSpec; qr: boolean;
  /** stack index among flying layers (0 = bottom), -1 for a QR layer */
  j: number;
  /** leave order (0 = top layer), -1 for a QR layer */
  k: number;
  zn: number; recv: number; dupe: number; slot: number; chip: number; pill: number;
  img: HTMLImageElement; tex: Texture; next: Texture | null; mixT0: number; grid: QrGrid | null;
  // card units: baked box and exact rect (centre, size)
  bx: number; by: number; bw: number; bh: number; rx: number; ry: number; rw: number; rh: number;
  /** crossing tilt: half of the longer side (the lever) and the axis it turns about (0 = X, top edge leads; 1 = Y) */
  lever: number; axis: number;
  /** guest: the outline this layer leaves on the back wall (the host draws it with `lines`) */
  res: Mesh | null; resMat: ShaderMaterial | null;
  /** light of the room on this sheet (1 = as printed); trace 0..1 and opacity of its outline on the back wall */
  gain: number; rs: number; rsA: number;
  mesh: Mesh; mat: ShaderMaterial; shadow: Mesh | null; smat: ShaderMaterial | null;
  lines: Mesh; lmat: ShaderMaterial; lset: LineSet;
  // per-frame state
  on: boolean; op: number; ox: number; oy: number; z: number; sc: number; acr: number; sweep: number; tilt: number;
  qT: number; qLift: number;
  shA: number; shx: number; shy: number; shBlur: number; shZ: number; shSlab: number; shGlass: boolean;
  fr: number; frA: number; ms: number; hd: number; chA: number; lead: number; chipR: number; pillR: number; tag: number;
}

export interface TestHooks {
  seek(timeline: Timeline, t: number): void;
  /** Labels: skip the two-end arrangement and put every block at one end (to check that arrangement in any pose). */
  forceOneEnd(on: boolean): void;
  /** Like seek, but `dt` seconds after the previous frame and with the chrome history kept (label easing and holding). */
  step(timeline: Timeline, t: number, dt: number): void;
  setPaused(paused: boolean): void;
  /** Guest: draw only what is behind the glass, directly in 3D in the pose given (the render `window-truth` compares the host screen against). */
  setDirect(on: boolean): void;
  frames(): number;
  /** Wait for the GPU after every frame so the recorded frame cost includes its work. */
  setFinish(on: boolean): void;
  state(): unknown;
  stats(): unknown;
  fakePose(yawDeg: number, pitchDeg: number, distance: number, rollDeg?: number, x?: number, y?: number): Float32Array;
}
export type WindowHandle = Handle & { test?: TestHooks };

export async function mountEffect(canvas: HTMLCanvasElement, opts: MountOptions): Promise<WindowHandle> {
  const fx = new Effect(canvas, opts);
  try {
    await fx.init();
  } catch (e) {
    fx.dispose();
    throw e;
  }
  return fx.handle();
}

class Effect {
  private readonly role: Role;
  private readonly tier: Tier;
  private readonly reduced: boolean;
  private readonly m: LayerManifest;
  private readonly P: Plan;
  private readonly cardH: number;
  private renderer!: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new Camera();
  private readonly frame = new Group();
  private readonly shared: Shared = makeShared();
  private sheets: Sheet[] = [];
  private flying: Sheet[] = [];
  private slots: LabelSlot[] = [];
  /** the only state that outlives a frame: where the label blocks were (contract v1.1) */
  private readonly labelHistory: LabelHistory = makeHistory();
  /** seconds since the previous frame, for that history */
  private chromeDt = 0;
  private order = new Int32Array(16);
  private bg!: Mesh;
  private bgMat!: ShaderMaterial;
  private sprites!: SpriteSet;
  private spriteMesh!: Mesh;
  private spriteMat!: ShaderMaterial;
  private leaders: LineSet | null = null;
  private leaderMesh: Mesh | null = null;
  private atlas: Atlas | null = null;
  private atlasTex: Texture | null = null;
  private scratch: AnyCanvas | null = null;
  private over: AnyCanvas | null = null;
  private geos: BufferGeometry[] = [];
  private usesFont = false;

  // canvas metrics
  private cw = 1; private ch = 1; private bw = 1; private bh = 1; private sx = 1; private sy = 1;
  private fitX = 0; private fitY = 0; private fitW = 1; private fitH = 1;
  private scrX = 0; private scrY = 0; private scrW = 1; private scrH = 1;
  // guest: the deck at the end of `fly` (size relative to the final fit, centre of the card plane in device px)
  private deckZoom = 1; private deckX = 0; private deckY = 0;
  private texBytes = 0;
  private sizeDirty = false;
  private ro: ResizeObserver | null = null;

  // timeline
  private tl: Timeline;
  private t0: number;
  private t = 0;
  private prevT = -1;
  private done = false;
  private resolve: (() => void) | null = null;
  private events: Record<string, { t: number; e: LayerEvent }[]> = {};
  private evCursor = 0;
  private raf = 0;
  private disposed = false;
  private paused = false;
  private dirty = true;
  private lastRender = -1e9;
  private frameCount = 0;
  private cpuMs: Float32Array | null = null;
  private finish = false;

  // inputs
  private tiltX = 0; private tiltY = 0;
  private readonly pose = new Float32Array(16);
  private hasPose = false;
  private everPose = false;
  private uFrom = 1; private uTo = 1; private uT0 = -1e9;
  private fov = 60; private aspect = 0;

  // frames (guest)
  private readonly aPos = new Vector3(); private readonly aQuat = new Quaternion();
  private readonly vPos = new Vector3(0, 0, -6); private readonly vQuat = new Quaternion();
  private readonly sPos = new Vector3(); private sScaleY = 1;
  private readonly fPos = new Vector3(); private readonly fQuat = new Quaternion(); private readonly fScl = new Vector3(1, 1, 1);
  private bgA = 0;

  // the window
  private cavity: Cavity | null = null;
  /** a sheet in the card background behind the bottom layer, so the stack is opaque until that layer leaves */
  private backing: Mesh | null = null;
  private backMat: ShaderMaterial | null = null;
  private backTex: Texture | null = null;
  /** host: the eye this frame is drawn for (card space), the viewer last given, and the blend between tilt eye (0) and viewer (1) */
  private readonly eye = new Vector3(0, 0, EYE_DIST);
  private readonly viewer = new Vector3(0, 0, EYE_DIST);
  private hasViewer = false;
  private w = 0; private wFrom = 0; private wTo = 0; private wT0 = -1e9;
  /** host: this frame is drawn through the eye (depart, rebuild) rather than flat */
  private persp = false;
  /** how much of the cavity shows, how much of its back panel is uncovered, opacity of the backing */
  private cavA = 0; private lit = 0; private backA = 0; private backZ = 0; private backGain = 1;
  /** guest: the hairline around the opening, drawn when the guest is alone */
  private rim: Mesh | null = null;
  /** guest: nothing is drawn before the first play */
  private started = false;
  /** test: the guest draws what is behind the glass, as the host does, but directly in 3D in the pose it is given (the reference of `window-truth`) */
  private direct = false;
  private readonly euler = new Euler();
  private u = 1;
  private spread = 1;

  // scratch
  private readonly v = new Vector3(); private readonly v2 = new Vector3();
  private readonly q = new Quaternion(); private readonly qi = new Quaternion();
  private readonly mat = new Matrix4();
  private readonly box = [0, 0, 0, 0];

  private readonly onLost = (ev: Event): void => {
    ev.preventDefault();
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.opts.onLost?.("WebGL context lost");
  };
  private readonly loop = (now: number): void => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    this.tick(now);
  };

  constructor(private readonly canvas: HTMLCanvasElement, private readonly opts: MountOptions) {
    this.role = opts.role;
    this.tier = TIERS[opts.quality] ?? TIERS.mid;
    this.reduced = !!opts.reduced;
    this.m = opts.layers;
    this.P = plan(this.m);
    this.cardH = this.m.card.h / this.m.card.w;
    this.tl = this.role === "host" ? "idle" : "explode";
    this.t0 = this.role === "host" ? performance.now() : Infinity;
  }

  // ---------------------------------------------------------------- setup

  async init(): Promise<void> {
    const test = __WINDOW_TEST__ && this.opts.test === true;
    this.renderer = new WebGLRenderer({
      canvas: this.canvas, alpha: true, antialias: true, premultipliedAlpha: true, depth: false, stencil: false,
      preserveDrawingBuffer: test, powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(1);
    this.renderer.setClearColor(0x000000, 0);
    this.canvas.addEventListener("webglcontextlost", this.onLost);

    const sorted = this.m.layers.map((spec, i) => ({ spec, i })).sort((a, b) => a.spec.z - b.spec.z || a.i - b.i);
    this.usesFont = true;
    const [imgs] = await Promise.all([
      Promise.all(sorted.map((l) => loadImage(resolveUrl(this.opts.baseUrl, l.spec.src)))),
      acquireFont(),
    ]);
    if (this.disposed) return;

    let zTop = 0;
    for (const l of sorted) if (l.spec.role !== "qr") zTop = Math.max(zTop, l.spec.z);
    const slab = slabGeometry(), plane = planeGeometry(), full = planeGeometry(true);
    this.geos.push(slab, plane, full);
    const n = this.P.n;
    let j = 0;
    const items: AtlasItem[] = [];
    sorted.forEach((l, idx) => {
      const qr = l.spec.role === "qr";
      const tex = new Texture();
      const mat = sheetMaterial(this.shared, tex, qr);
      const mesh = new Mesh(slab, mat);
      const taps = this.tier.taps;
      const smat = taps > 0 ? shadowMaterial(this.shared, tex, taps) : null;
      const shadow = smat ? new Mesh(plane, smat) : null;
      const lset = lineSet(11);
      const lmat = lineMaterial(this.shared, false);
      const lines = new Mesh(lset.geometry, lmat);
      this.geos.push(lset.geometry);
      const s: Sheet = {
        i: l.i, spec: l.spec, qr, j: qr ? -1 : j, k: qr ? -1 : n - 1 - j,
        zn: zTop > 0 ? Math.min(1, l.spec.z / zTop) : 0, recv: -1, dupe: 0, slot: -1, chip: -1, pill: -1,
        img: imgs[idx], tex, next: null, mixT0: 0, grid: qr ? detectQrGrid(imgs[idx], this.canvas) : null,
        bx: 0, by: 0, bw: 1, bh: 1, rx: 0, ry: 0, rw: 1, rh: 1, lever: 0.5, axis: 0,
        res: null, resMat: null, gain: 1, rs: 0, rsA: 0,
        mesh, mat, shadow, smat, lines, lmat, lset,
        on: true, op: 1, ox: 0, oy: 0, z: 0, sc: 1, acr: 0, sweep: 0, tilt: 0, qT: 0, qLift: 0,
        shA: 0, shx: 0, shy: 0, shBlur: 0, shZ: 0, shSlab: 0, shGlass: false,
        fr: 0, frA: 0, ms: 0, hd: 0, chA: 0, lead: 0, chipR: 0, pillR: 0, tag: 0,
      };
      if (!qr && this.role === "guest") {
        const rset = lineSet(4);
        this.geos.push(rset.geometry);
        outline(rset, 1.25, 0.9);
        for (const at of rset.attrs) at.needsUpdate = true;
        s.resMat = lineMaterial(this.shared, false);
        s.res = new Mesh(rset.geometry, s.resMat);
      }
      for (const o of [mesh, shadow, lines, s.res]) {
        if (!o) continue;
        o.matrixAutoUpdate = false;
        o.frustumCulled = false;
        this.frame.add(o);
      }
      if (!qr) {
        // receiver of the contact shadow: nearest lower sheet whose rect contains this one, else the glass
        for (let b = this.flying.length - 1; b >= 0; b--) {
          const r = this.flying[b].spec.rect, a = l.spec.rect;
          if (a.x >= r.x - 1 && a.y >= r.y - 1 && a.x + a.w <= r.x + r.w + 1 && a.y + a.h <= r.y + r.h + 1) {
            s.recv = this.sheets.indexOf(this.flying[b]);
            break;
          }
        }
        for (const f of this.flying) {
          const r = f.spec.rect, a = l.spec.rect;
          if (Math.abs(a.x - r.x) < 1 && Math.abs(a.y - r.y) < 1 && Math.abs(a.w - r.w) < 1 && Math.abs(a.h - r.h) < 1) s.dupe++;
        }
        s.slot = this.slots.length;
        this.slots.push(makeSlot(j % 2 === 0 ? -1 : 1));
        s.chip = items.length;
        items.push({ text: l.spec.label ?? l.spec.name, kind: "chip" });
        if (l.spec.dims) {
          s.pill = items.length;
          items.push({ text: l.spec.dims, kind: "pill" });
        }
        this.flying.push(s);
        j++;
      }
      this.sheets.push(s);
      this.buildLines(s);
    });
    this.atlasItems = items;

    this.bgMat = bgMaterial(this.shared);
    const bgc = parseColor(this.m.card.background);
    this.bgMat.uniforms.uColor.value.set(bgc[0], bgc[1], bgc[2]);
    this.bg = new Mesh(full, this.bgMat);
    this.bg.frustumCulled = false;
    this.bg.renderOrder = 0;
    this.scene.add(this.bg);

    this.frame.matrixAutoUpdate = false;
    this.scene.add(this.frame);

    // the cavity behind the glass, and the backing of the stack
    const card = this.m.card, cl: CavityLayer[] = [];
    for (const f of this.flying) cl.push({ img: f.img, x: f.spec.rect.x, y: f.spec.rect.y, w: f.spec.rect.w, h: f.spec.rect.h });
    const q = this.opts.quality;
    this.cavity = new Cavity({
      shared: this.shared, cardH: this.cardH, depth: CAVITY_DEPTH, ruler: 100 / card.w,
      cardW: card.w, cardHpx: card.h, background: card.background, bg: bgc, layers: cl,
      detail: q === "low" ? 0 : q === "mid" ? 0.6 : 1, shadows: q !== "low", font: FONT_FAMILY, ref: this.canvas,
    });
    this.frame.add(this.cavity.group);
    const bc = makeCanvas(2, 2, this.canvas), bx = bc.getContext("2d") as CanvasRenderingContext2D;
    bx.fillStyle = card.background;
    bx.fillRect(0, 0, 2, 2);
    this.backTex = new CanvasTexture(bc as HTMLCanvasElement);
    this.backMat = sheetMaterial(this.shared, this.backTex, false);
    this.backing = new Mesh(plane, this.backMat);
    this.backing.matrixAutoUpdate = false;
    this.backing.frustumCulled = false;
    this.backing.renderOrder = 9;
    this.frame.add(this.backing);
    if (this.role === "guest") {
      // the edge of the opening, for the guest that draws the window itself
      const rs = lineSet(4);
      this.geos.push(rs.geometry);
      outline(rs, 1, 1, RIM_WHITE);
      for (const at of rs.attrs) at.needsUpdate = true;
      this.rim = new Mesh(rs.geometry, lineMaterial(this.shared, false));
      this.rim.matrixAutoUpdate = false;
      this.rim.frustumCulled = false;
      this.rim.renderOrder = 8;
      this.rim.matrix.set(1, 0, 0, 0, 0, this.cardH, 0, 0, 0, 0, 1, 0.0005, 0, 0, 0, 1);
      (this.rim.material as ShaderMaterial).uniforms.uLocal.value.copy(this.rim.matrix);
      this.frame.add(this.rim);
    }

    this.sprites = spriteSet(Math.max(1, n * 3));
    this.geos.push(this.sprites.geometry);
    this.atlasTex = new Texture();
    this.spriteMat = spriteMaterial(this.shared, this.atlasTex);
    this.spriteMesh = new Mesh(this.sprites.geometry, this.spriteMat);
    this.spriteMesh.frustumCulled = false;
    this.spriteMesh.renderOrder = this.role === "host" ? 500 : 901;
    this.scene.add(this.spriteMesh);

    if (this.role === "guest") {
      this.leaders = lineSet(Math.max(1, n * 3));
      this.geos.push(this.leaders.geometry);
      this.leaderMesh = new Mesh(this.leaders.geometry, lineMaterial(this.shared, true));
      this.leaderMesh.frustumCulled = false;
      this.leaderMesh.renderOrder = 900;
      this.scene.add(this.leaderMesh);
    }

    this.buildEvents();
    this.measure();
    if (typeof ResizeObserver !== "undefined") {
      this.ro = new ResizeObserver(() => { this.sizeDirty = true; this.dirty = true; });
      this.ro.observe(this.canvas);
    }
    this.warmUp();
    this.update(0);
    this.render();
    this.raf = requestAnimationFrame(this.loop);
  }

  private atlasItems: AtlasItem[] = [];

  /**
   * Links every program and uploads every texture while mounting: one frame with everything visible,
   * clipped to a single pixel. Without it the first shadow, outline or label would stall its frame
   * (measured: 526 ms on the first tilted idle frame at `high`).
   */
  private warmUp(): void {
    const r = this.renderer;
    this.update(0);
    this.scene.traverse((o) => { o.visible = true; });
    this.sprites.geometry.instanceCount = 1;
    r.setScissor(0, 0, 1, 1);
    r.setScissorTest(true);
    r.render(this.scene, this.camera);
    r.setScissorTest(false);
  }

  /** Frame (4), measurement line + ticks (3) and handles (4) in the sheet's unit space. */
  private buildLines(s: Sheet): void {
    const L = s.lset, host = this.role === "host";
    outline(L, host ? 1.25 : 1.5, host ? 0.9 : 1);
    for (let i = 4; i < 11; i++) setLine(L, i, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, RED, 0);
    s.lmat.uniforms.uSnap.value = 0;
    s.lmat.uniforms.uDash.value = 0;
  }

  /** Measurement geometry depends on the rect's aspect, so it is rewritten after every measure(). */
  private placeMeasure(s: Sheet): void {
    if (this.role === "host" || s.qr) return;
    const L = s.lset, h = 0.5;
    const off = Math.min(0.03, 0.3 * s.rh) / s.rh, tk = Math.min(0.014, 0.14 * s.rh) / s.rh, y = -h - off;
    setLine(L, 4, -h, y, 0, h, y, 0, 1, 1, 0.1, 1, RED);
    setLine(L, 5, -h, y - tk, 0, -h, y + tk, 0, 1, 1, 0, 0.1, RED);
    setLine(L, 6, h, y - tk, 0, h, y + tk, 0, 1, 1, 0.9, 1, RED);
    setLine(L, 7, -h, h, 0, -h, h, 0, 5, 2, 0, 0, BLUE);
    setLine(L, 8, h, h, 0, h, h, 0, 5, 2, 0, 0, BLUE);
    setLine(L, 9, h, -h, 0, h, -h, 0, 5, 2, 0, 0, BLUE);
    setLine(L, 10, -h, -h, 0, -h, -h, 0, 5, 2, 0, 0, BLUE);
    for (const at of L.attrs) at.needsUpdate = true;
  }

  private buildEvents(): void {
    const P = this.P, ev = this.events;
    for (const tl of [...HOST_TIMELINES, ...GUEST_TIMELINES]) ev[tl] = [];
    for (const s of this.flying) {
      const e = (phase: LayerEvent["phase"]): LayerEvent => ({ index: s.i, id: s.spec.id, phase });
      // a layer leaves the host and lifts on the guest when it starts to cross the glass
      ev.depart.push({ t: P.start[s.k] + APPROACH, e: e("leave") });
      ev.explode.push({ t: P.start[s.k] + APPROACH, e: e("lift") }, { t: P.start[s.k] + EXIT, e: e("settle") });
      ev.assemble.push({ t: P.assembleStart[s.j] + P.assembleDrop, e: e("arrive") });
      ev.rebuild.push({ t: RB_FLAT, e: e("arrive") });
    }
    for (const s of this.sheets) {
      if (s.qr) ev.rebuild.push({ t: REBUILD, e: { index: s.i, id: s.spec.id, phase: "arrive" } });
    }
    for (const k in ev) ev[k].sort((a, b) => a.t - b.t);
  }

  /** Canvas metrics, the flat fit, the screen-resolution bake, the atlas and the static frames. */
  private measure(): void {
    const c = this.canvas, card = this.m.card, host = this.role === "host";
    this.cw = Math.max(1, c.clientWidth || c.width);
    this.ch = Math.max(1, c.clientHeight || c.height);
    const area: Rect = (!host && this.opts.assembleRect) || { x: 0, y: 0, w: this.cw, h: this.ch };
    const cssScale = Math.min(area.w / card.w, area.h / card.h);
    const fitMax = Math.max(card.w, card.h) * cssScale;
    const dpr = this.opts.quality === "test" ? 1 : self.devicePixelRatio || 1;
    let pr = Math.min(dpr, this.tier.dpr, this.tier.tex / fitMax);
    for (let guard = 0; guard < 8; guard++) {
      this.bw = Math.max(1, Math.round(this.cw * pr));
      this.bh = Math.max(1, Math.round(this.ch * pr));
      this.sx = this.bw / this.cw;
      this.sy = this.bh / this.ch;
      const ds = Math.min((area.w * this.sx) / card.w, (area.h * this.sy) / card.h);
      this.fitW = card.w * ds;
      this.fitH = card.h * ds;
      this.fitX = area.x * this.sx + (area.w * this.sx - this.fitW) / 2;
      this.fitY = area.y * this.sy + (area.h * this.sy - this.fitH) / 2;
      // estimated texture memory (RGBA8 + mip chain) against the tier budget
      let bytes = 0;
      for (const s of this.sheets) bytes += Math.ceil(s.spec.rect.w * ds + 1) * Math.ceil(s.spec.rect.h * ds + 1) * 4 * (4 / 3);
      if (bytes <= this.tier.mem * 1048576 * 0.9) break;
      pr *= 0.85;
    }
    this.renderer.setSize(this.bw, this.bh, false);
    this.shared.uRes.value.set(this.bw, this.bh);
    this.shared.uPr.value = this.sx;
    this.shared.uOrtho.value = host ? 1 : 0;

    this.texBytes = this.cavity ? this.cavity.bytes : 0;
    // scratch canvases for the bake: one the size of the drawing buffer and, when the fit runs past
    // the canvas, one that spans the whole fit
    this.scrX = Math.min(0, Math.floor(this.fitX));
    this.scrY = Math.min(0, Math.floor(this.fitY));
    this.scrW = Math.max(this.bw, Math.ceil(this.fitX + this.fitW)) - this.scrX;
    this.scrH = Math.max(this.bh, Math.ceil(this.fitY + this.fitH)) - this.scrY;
    this.scratch = makeCanvas(this.bw, this.bh, this.canvas);
    this.over = this.scrW > this.bw || this.scrH > this.bh ? makeCanvas(this.scrW, this.scrH, this.canvas) : null;
    for (const s of this.sheets) {
      const r = s.spec.rect;
      this.setTexture(s, s.img, false);
      s.rx = (r.x + r.w / 2 - card.w / 2) / card.w;
      s.ry = (card.h / 2 - (r.y + r.h / 2)) / card.w;
      s.rw = r.w / card.w;
      s.rh = r.h / card.w;
      s.axis = s.rh >= s.rw ? 0 : 1;
      s.lever = Math.max(s.rw, s.rh) / 2;
      this.placeMeasure(s);
    }
    this.scratch.width = this.scratch.height = 1;
    this.scratch = null;
    if (this.over) this.over.width = this.over.height = 1;
    this.over = null;

    // two columns of blocks and the channel between them fit inside the 8 % margins
    const blockMax = Math.min(176, (this.cw * (1 - 2 * MARGIN) - channelFor(this.flying.length)) / 2);
    this.atlas = buildAtlas(this.atlasItems, this.sx, blockMax, this.canvas);
    this.labelHistory.valid = false;
    this.atlasTex?.dispose();
    const at = new CanvasTexture(this.atlas.canvas as HTMLCanvasElement);
    at.flipY = false;
    at.premultiplyAlpha = true;
    at.generateMipmaps = false;
    at.minFilter = at.magFilter = LinearFilter;
    this.atlasTex = at;
    this.spriteMat.uniforms.map.value = at;
    this.texBytes += this.atlas.bytes;
    for (const s of this.flying) {
      const slot = this.slots[s.slot], e = this.atlas.entries;
      slot.bw = Math.max(e[s.chip].w, s.pill >= 0 ? e[s.pill].w : 0);
      slot.bh = CHIP_H + (s.pill >= 0 ? BLOCK_GAP + PILL_H : 0);
    }

    const safe = this.shared.uSafe.value;
    for (const v of safe) v.set(0, 0, 0, 0);
    if (host && this.opts.safeRects) {
      this.opts.safeRects.forEach((r, i) => {
        const x0 = Math.floor(r.x * this.sx), x1 = Math.ceil((r.x + r.w) * this.sx);
        const y0 = this.bh - Math.ceil((r.y + r.h) * this.sy), y1 = this.bh - Math.floor(r.y * this.sy);
        const v = safe[Math.min(i, 3)];
        if (i < 4) v.set(x0, y0, x1, y1);
        else v.set(Math.min(v.x, x0), Math.min(v.y, y0), Math.max(v.z, x1), Math.max(v.w, y1));
      });
    }

    this.shared.uWin.value.set(0.5, this.cardH / 2);
    if (host) this.hostFlat();
    else this.setCamera();
    this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
    this.sizeDirty = false;
    this.dirty = true;
  }

  /** Host, flat (idle, connect, the last frame of rebuild): orthographic, the frame maps card units to device pixels. */
  private hostFlat(): void {
    const cxp = this.fitX + this.fitW / 2, cyp = this.fitY + this.fitH / 2;
    this.camera.projectionMatrix.makeOrthographic(0, this.bw, this.bh, 0, -1e4, 1e4);
    this.frame.matrix.set(
      this.fitW, 0, 0, cxp,
      0, this.fitW, 0, this.bh - cyp,
      0, 0, this.fitW, 0,
      0, 0, 0, 1,
    );
    this.frame.matrixWorldNeedsUpdate = true;
  }

  /**
   * Host, through the eye: an asymmetric frustum from the eye through the card's rect on the canvas
   * (the window), so the screen shows what a real cavity behind it would show that eye. The frame
   * becomes card space seen from the eye.
   */
  private hostWindow(): void {
    const E = this.eye, H = this.cardH, n = E.z * 0.25, k = n / E.z;
    const m = this.camera.projectionMatrix.makePerspective((-0.5 - E.x) * k, (0.5 - E.x) * k, (H / 2 - E.y) * k, (-H / 2 - E.y) * k, n, E.z + CAVITY_DEPTH + 2);
    // the window's NDC square -> the fit rect on the canvas
    const sx = this.fitW / this.bw, sy = this.fitH / this.bh;
    const ox = ((this.fitX + this.fitW / 2) / this.bw) * 2 - 1, oy = 1 - ((this.fitY + this.fitH / 2) / this.bh) * 2;
    const e = m.elements;
    for (let c = 0; c < 4; c++) {
      e[c * 4] = sx * e[c * 4] + ox * e[c * 4 + 3];
      e[c * 4 + 1] = sy * e[c * 4 + 1] + oy * e[c * 4 + 3];
    }
    this.frame.matrix.makeTranslation(-E.x, -E.y, -E.z);
    this.frame.matrixWorldNeedsUpdate = true;
  }

  /**
   * The host's eye: the viewer's position, or a virtual eye EYE_DIST in front of the centre swung by
   * tilt (frontal with `reduced`). A switch between the two is blended over VIEWER_BLEND of wall clock.
   */
  private hostEye(now: number): void {
    const live = !this.paused && now - this.wT0 < VIEWER_BLEND;
    const w = (this.w = live ? mix(this.wFrom, this.wTo, easeInOut((now - this.wT0) / VIEWER_BLEND)) : this.wTo);
    if (live) this.dirty = true;
    let tx = this.reduced ? 0 : this.tiltX, ty = this.reduced ? 0 : this.tiltY;
    const len = Math.hypot(tx, ty);
    if (len > 1) { tx /= len; ty /= len; }
    const ax = EYE_TILT * tx, ay = EYE_TILT * ty;
    // tilt x > 0 puts the eye on the -x side: near layers shift right, as in idle's parallax
    this.eye.set(-EYE_DIST * Math.sin(ax) * Math.cos(ay), EYE_DIST * Math.sin(ay), EYE_DIST * Math.cos(ax) * Math.cos(ay)).lerp(this.viewer, w);
    if (this.eye.z < 1) this.eye.z = 1;
  }

  private setTexture(s: Sheet, img: HTMLImageElement, asNext: boolean): void {
    const card = this.m.card, r = s.spec.rect, ds = this.fitW / card.w;
    const scratch = this.scratch ?? makeCanvas(this.bw, this.bh, this.canvas);
    const over = this.over ?? (this.scrW > this.bw || this.scrH > this.bh ? makeCanvas(this.scrW, this.scrH, this.canvas) : null);
    const b = bakeLayer(img, this.fitX + r.x * ds, this.fitY + r.y * ds, r.w * ds, r.h * ds, scratch, this.canvas, over, this.scrX, this.scrY);
    const tex = new CanvasTexture(b.canvas as HTMLCanvasElement);
    tex.premultiplyAlpha = true;
    tex.generateMipmaps = true;
    tex.minFilter = LinearMipmapLinearFilter;
    tex.magFilter = LinearFilter;
    tex.anisotropy = Math.min(this.tier.aniso, this.renderer.capabilities.getMaxAnisotropy());
    this.texBytes += b.w * b.h * 4 * (4 / 3);
    const u = s.mat.uniforms;
    if (asNext) {
      s.next?.dispose();
      s.next = tex;
      u.mapB.value = tex;
      return;
    }
    s.tex.dispose();
    s.tex = tex;
    u.map.value = tex;
    u.mapB.value = tex;
    u.uMix.value = 0;
    if (s.smat) s.smat.uniforms.map.value = tex;
    const cxp = this.fitX + this.fitW / 2, cyp = this.fitY + this.fitH / 2;
    s.bx = (b.x0 + b.w / 2 - cxp) / this.fitW;
    s.by = (cyp - (b.y0 + b.h / 2)) / this.fitW;
    s.bw = b.w / this.fitW;
    s.bh = b.h / this.fitW;
    u.uTile.value.set(b.tu, b.tv, b.tw, b.th);
    if (s.grid) u.uQr.value.set(s.grid.ox, s.grid.oy, s.grid.nx, s.grid.ny);
  }

  // ---------------------------------------------------------------- guest frames

  private setCamera(): void {
    const near = 0.05, far = 200;
    const top = near * Math.tan((this.fov * Math.PI) / 360);
    const right = top * (this.aspect > 0 ? this.aspect : this.bw / this.bh);
    this.camera.projectionMatrix.makePerspective(-right, right, top, -top, near, far);
    this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
    this.solveVirtual();
    this.solveDeck();
    this.dirty = true;
  }

  /**
   * Face-on frame in which the card plane has `zoom` times the size of the flat fit and its centre
   * sits at (cx, cy) device px. zoom 1 at the centre of the fit is the landing itself.
   */
  private screenFrame(zoom: number, cx: number, cy: number): void {
    const e = this.camera.projectionMatrix.elements, p00 = e[0], p11 = e[5];
    const d = (p00 * this.bw) / (2 * this.fitW * zoom);
    const nx = (cx / this.bw) * 2 - 1;
    const ny = 1 - (cy / this.bh) * 2;
    this.sPos.set((nx * d) / p00, (ny * d) / p11, -d);
    this.sScaleY = (p00 * this.bw) / (p11 * this.bh);
  }

  /** Device-px bounding box of the deck (the stack at DECK spacing, face-on) for the current this.sPos; result in this.box. */
  private deckBox(): void {
    const b = this.box, q = this.q.identity(), kx = this.bw / this.cw, ky = this.bh / this.ch;
    b[0] = b[1] = 1e9;
    b[2] = b[3] = -1e9;
    for (const s of this.flying) {
      const y = s.by + STAIR * this.cardH * s.j * DECK, z = (Z0 + ZGAP * s.j + THICK) * DECK;
      for (let c = 0; c < 4; c++) {
        const p = this.project(s.bx + (c & 1 ? 0.5 : -0.5) * s.bw, y + (c & 2 ? 0.5 : -0.5) * s.bh, z, this.sPos, q, this.sScaleY);
        if (p.x * kx < b[0]) b[0] = p.x * kx;
        if (p.y * ky < b[1]) b[1] = p.y * ky;
        if (p.x * kx > b[2]) b[2] = p.x * kx;
        if (p.y * ky > b[3]) b[3] = p.y * ky;
      }
    }
  }

  /**
   * The deck at the end of `fly`: as large as fits the canvas with DECK_MARGIN free on every side,
   * at most DECK_ZOOM times the final size, its box centred on the visible part of the landing
   * rect. A full-bleed landing therefore gets a deck smaller than the page, and `assemble` grows it.
   */
  private solveDeck(): void {
    if (this.role !== "guest" || this.flying.length === 0) return;
    const mx = DECK_MARGIN * this.bw, my = DECK_MARGIN * this.bh;
    // visible part of the fit; an invisible fit falls back to the whole canvas
    let vx0 = Math.max(0, this.fitX), vy0 = Math.max(0, this.fitY);
    let vx1 = Math.min(this.bw, this.fitX + this.fitW), vy1 = Math.min(this.bh, this.fitY + this.fitH);
    if (vx1 - vx0 < 2 || vy1 - vy0 < 2) { vx0 = 0; vy0 = 0; vx1 = this.bw; vy1 = this.bh; }
    const tx = (vx0 + vx1) / 2, ty = (vy0 + vy1) / 2, b = this.box;
    let zoom = DECK_ZOOM, cx = tx, cy = ty;
    for (let it = 0; it < 12; it++) {
      this.screenFrame(zoom, cx, cy);
      this.deckBox();
      // centre the box on the target, then keep it inside the canvas margins
      let sx = tx - (b[0] + b[2]) / 2, sy = ty - (b[1] + b[3]) / 2;
      const w = b[2] - b[0], h = b[3] - b[1];
      const availW = this.bw - 2 * mx, availH = this.bh - 2 * my;
      if (w <= availW) sx = Math.min(Math.max(sx, mx - b[0]), this.bw - mx - b[2]);
      if (h <= availH) sy = Math.min(Math.max(sy, my - b[1]), this.bh - my - b[3]);
      cx += sx;
      cy += sy;
      zoom = Math.min(DECK_ZOOM, zoom * Math.min(availW / w, availH / h));
    }
    this.deckZoom = zoom;
    this.deckX = cx;
    this.deckY = cy;
  }

  /** Projects a card-space point through `pos`/`quat` to CSS px; result in this.v (x, y). */
  private project(x: number, y: number, z: number, pos: Vector3, quat: Quaternion, sy: number): Vector3 {
    const v = this.v.set(x, y * sy, z).applyQuaternion(quat).add(pos).applyMatrix4(this.camera.projectionMatrix);
    v.x = (v.x * 0.5 + 0.5) * this.cw;
    v.y = (0.5 - v.y * 0.5) * this.ch;
    return v;
  }

  /** Screen bounding box of the settled exploded stack seen through `pos`/`quat`; result in this.box. */
  private stackBox(pos: Vector3, quat: Quaternion, keep = false): void {
    const b = this.box;
    if (!keep) {
      b[0] = b[1] = 1e9;
      b[2] = b[3] = -1e9;
    }
    for (const s of this.flying) {
      const y = s.by + STAIR * this.cardH * s.j, z = Z0 + ZGAP * s.j + THICK;
      for (let c = 0; c < 4; c++) {
        const p = this.project(s.bx + (c & 1 ? 0.5 : -0.5) * s.bw, y + (c & 2 ? 0.5 : -0.5) * s.bh, z, pos, quat, 1);
        if (p.x < b[0]) b[0] = p.x;
        if (p.y < b[1]) b[1] = p.y;
        if (p.x > b[2]) b[2] = p.x;
        if (p.y > b[3]) b[3] = p.y;
      }
    }
  }

  /**
   * The unanchored pose: fixed rotation, distance and offset solved so the whole stack plus its label
   * blocks stay inside the 8 % margins. Also the entry vector (card space) that puts a sheet above
   * the top edge of the screen.
   */
  private solveVirtual(): void {
    if (this.role !== "guest" || this.flying.length === 0) return;
    const swing = this.reduced ? 0 : DRIFT;
    const mx = MARGIN * this.cw, my = MARGIN * this.ch;
    let bh = 0, nl = 0, nr = 0;
    for (const sl of this.slots) {
      bh = Math.max(bh, sl.bh);
      if (sl.corner < 0) nl++; else nr++;
    }
    // room for the rows of label blocks above and below the stack
    const reserve = reserveFor(rowsFor(Math.max(nl, nr)), bh);
    const x0 = mx, x1 = this.cw - mx, y0 = my + reserve, y1 = this.ch - my - reserve;
    const e = this.camera.projectionMatrix.elements, b = this.box;
    this.vPos.set(0, 0, -6);
    // the box of the settled stack over the whole swing: both ends and the middle
    const swept = (): void => {
      for (let i = -1; i <= 1; i++) this.stackBox(this.vPos, this.vQuat.setFromEuler(this.euler.set(VIRTUAL_PITCH, i * swing, 0, "XYZ")), i > -1);
    };
    for (let it = 0; it < 14; it++) {
      swept();
      const f = Math.min((x1 - x0) / (b[2] - b[0]), (y1 - y0) / (b[3] - b[1]));
      this.vPos.multiplyScalar(1 / f);
      swept();
      const d = -this.vPos.z;
      this.vPos.x += (((x0 + x1) / 2 - (b[0] + b[2]) / 2) / this.cw) * 2 * (d / e[0]);
      this.vPos.y -= (((y0 + y1) / 2 - (b[1] + b[3]) / 2) / this.ch) * 2 * (d / e[5]);
    }
    this.vQuat.setFromEuler(this.euler.set(VIRTUAL_PITCH, -swing, 0, "XYZ"));
    if (!this.everPose) {
      this.aPos.copy(this.vPos);
      this.aQuat.copy(this.vQuat);
    }
  }

  // ---------------------------------------------------------------- per-frame state

  private reset(s: Sheet): void {
    s.on = true; s.op = 1; s.ox = 0; s.oy = 0; s.z = 0; s.sc = 1; s.acr = 0; s.sweep = 0; s.tilt = 0; s.qT = 0; s.qLift = 0;
    s.shA = 0; s.shx = 0; s.shy = 0; s.shBlur = 0; s.shZ = 0; s.shSlab = 0; s.shGlass = false;
    s.fr = 0; s.frA = 0; s.ms = 0; s.hd = 0; s.chA = 0; s.lead = 0; s.chipR = 0; s.pillR = 0; s.tag = 0;
    s.gain = 1; s.rs = 0; s.rsA = 0;
  }

  private update(now: number): void {
    if (this.role === "host") this.updateHost(this.tl, this.t, now);
    else this.updateGuest(this.tl, this.t, now);
    this.apply();
  }

  /** Light of the room: a print behind the glass is this much brighter than printed (1 at the glass; 1 on a light card). */
  private gain(z: number, open: number): number {
    if (z >= 0 || !this.cavity!.lit) return 1;
    return 1 + LIGHT * open * smooth(0, 0.3, -z) * Math.exp(z / 4);
  }

  /**
   * A flying sheet in the event (host `depart` = guest `explode`): its depth, crossing tilt, stair
   * offset, thickness and light, and the trace of the outline it leaves on the back wall.
   * `front` is the anchored guest, which shows a sheet only in front of the glass. Returns the
   * sheet's exit clock.
   */
  private eventSheet(s: Sheet, t: number, open: number, front: boolean): number {
    const P = this.P, tau = t - P.start[s.k], rest = Z0 + ZGAP * s.j + THICK, half = crossHalf(rest);
    const stair = STAIR * this.cardH * s.j;
    if (this.reduced) {
      // no travel: the flat card fades to the fanned-out state, then every sheet fades out inside and in at its place in front
      const x = clamp01((tau - APPROACH) / CROSS), out = this.role === "host" ? false : front ? true : x >= 0.5;
      if (out) {
        s.z = rest;
        s.oy += stair;
        s.op = front ? x : clamp01(2 * x - 1);
        s.acr = 1;
      } else if (t < 0.6) {
        s.op = 1 - t / 0.6;
        s.acr = 0;
      } else {
        s.z = hangDepth(s.j, P.n);
        s.op = clamp01((t - 0.6) / 0.6) * (1 - (this.role === "host" ? x : clamp01(2 * x)));
        s.acr = 0;
      }
    } else if (tau <= 0) {
      s.z = insideDepth(s.j, P.n, t);
      s.acr = smooth(OPEN, OPEN + 0.5, t);
    } else {
      s.z = exitDepth(tau, hangDepth(s.j, P.n), rest, half);
      s.tilt = exitTilt(tau) * Math.asin(Math.min(1, half / s.lever));
      s.oy += stair * easeInOut((tau - APPROACH - CROSS) / LAND);
      s.acr = 1;
    }
    s.gain = this.gain(s.z, open);
    // no specular sweep inside the room: it belongs to the stack in front
    s.sweep = -3;
    s.rs = clamp01((tau - APPROACH) / CROSS);
    s.rsA = s.rs > 0 ? 1 : 0;
    return tau;
  }

  /** The cavity during the event: the backing behind the bottom layer goes and the back panel is uncovered when that layer leaves. */
  private eventCavity(t: number, open: number): void {
    const P = this.P, n = P.n;
    if (n === 0) { this.backA = 0; this.lit = 1; return; }
    const last = P.start[n - 1], tb = t - last;
    if (this.reduced) {
      const x = clamp01((tb - APPROACH) / CROSS);
      this.backA = 1 - x;
      this.lit = x;
      this.backZ = hangDepth(0, n) - 0.002;
    } else {
      this.backA = 1 - smooth(0, APPROACH, tb);
      this.lit = smooth(0, APPROACH + CROSS, tb);
      this.backZ = insideDepth(0, n, Math.min(t, last)) - THICK * smooth(OPEN, OPEN + 0.5, t) - 0.002;
    }
    this.backGain = this.gain(this.backZ, open);
  }

  /** The soft shadow a sheet behind the glass casts on the sheet behind it; it goes as the sheet nears the glass. */
  private insideShadow(s: Sheet): void {
    const r = s.recv >= 0 ? this.sheets[s.recv] : null;
    s.shA = 0;
    s.shGlass = false;
    if (!r || !r.on || s.z >= 0 || r.z >= 0) return;
    const h = Math.max(0, s.z - THICK * s.acr - r.z);
    s.shZ = r.z;
    s.shx = 0;
    s.shy = -0.03 * h;
    s.shBlur = 0.004 + 0.05 * h;
    s.shSlab = 0.3;
    // never more than the light the room adds to the receiver: a shadow is the absence of that light
    const most = this.cavity!.lit ? Math.min(0.35, 1 - 1 / r.gain) : 0.22;
    s.shA = most * s.op * smooth(0, 0.02, h) * (1 - smooth(0.25, 1, h)) * (1 - smooth(-0.3, -0.05, s.z));
  }

  private updateHost(tl: Timeline, t: number, now: number): void {
    const P = this.P, n = P.n, red = this.reduced, pxc = this.sx / this.fitW, sh = this.shared;
    // depart and rebuild are drawn through the eye; idle, connect and the closed end of rebuild are the flat card
    const persp = (this.persp = tl === "depart" || (tl === "rebuild" && t < RB_FLAT));
    if (persp) {
      this.hostEye(now);
      this.hostWindow();
      sh.uEye.value.copy(this.eye);
    } else {
      this.hostFlat();
    }
    sh.uOrtho.value = persp ? 0 : 1;
    sh.uSide.value = persp ? -1 : 2;
    sh.uBehind.value = 1;
    sh.uRim.value = persp && !red ? 1 - this.w : 0;
    // idle's tilt parallax fades out as the glass opens (the eye takes over) and returns once it has closed
    let pw = tl === "idle" || tl === "connect" ? 1 : tl === "depart" ? 1 - smooth(0, 0.3, t) : smooth(RB_FLAT, REBUILD, t);
    if (red) pw = 0;
    let tx = this.tiltX, ty = this.tiltY;
    const len = Math.hypot(tx, ty);
    if (len > 1) { tx /= len; ty /= len; }
    let px = tx * 10 * pw, py = ty * 10 * pw;
    if (tl === "idle" && !red) {
      const b = 1.5 * Math.sin((2 * Math.PI * t) / BREATH) * (1 - smooth(0, 0.15, Math.min(1, len)));
      px += b * 0.8;
      py += b * 0.6;
    }
    this.bgA = 1;
    // the light of the room comes on as the glass opens and goes out as it closes
    const open = tl === "depart" ? (red ? 1 : smooth(0, OPEN, t)) : tl === "rebuild" ? (red ? 1 : 1 - smooth(RB_FORWARD, RB_FLAT, t)) : 0;
    this.cavA = persp ? 1 : 0;
    this.lit = this.backA = 0;
    this.backZ = 0;
    this.backGain = 1;
    if (tl === "depart") this.eventCavity(t, open);
    for (const s of this.sheets) {
      this.reset(s);
      const k = s.qr ? 0.4 * s.zn : s.zn;
      s.ox = px * k * pxc;
      s.oy = -py * k * pxc;
      const om = (Math.hypot(px, py) * k) / 10;
      s.shA = 0.35 * clamp01(om * 1.5);
      s.shx = -s.ox * 0.6;
      s.shy = -s.oy * 0.6;
      s.shBlur = (0.6 + 2.2 * om) * pxc;
      s.shGlass = true;
      if (s.qr) {
        if (tl === "connect") {
          s.qT = clamp01(t / CONNECT);
          s.qLift = red ? 0 : 2.5;
        } else if (tl === "rebuild") {
          s.qT = 1 - clamp01((t - RB_QR) / (REBUILD - RB_QR));
          s.qLift = red ? 0 : 2.5;
          // the code re-forms on the stack while it is still coming forward
          if (persp && !red) s.z = rebuildDepth(0, Math.max(1, n), t, 0, 0.05);
        } else if (tl === "depart") {
          s.qT = 1;
        }
        s.on = s.qT < 1;
        s.shA *= 1 - s.qT;
        s.shZ = s.z;
        s.gain = this.gain(s.z, open);
        continue;
      }
      if (tl === "depart") {
        const tau = this.eventSheet(s, t, open, false);
        // the host draws what is behind the glass: nothing of a sheet once it has crossed
        if (tau >= APPROACH + CROSS + 0.06) s.on = false;
        if (pw > 0) s.shZ = s.z;
        else this.insideShadow(s);
      } else if (persp) {
        // rebuild: back in through the glass, bottom layer first
        const st = P.rebuildStart[s.j], tau = t - st, half = crossHalf(Z0 + ZGAP * s.j + THICK);
        if (red) {
          s.op = smooth(0.2, RB_FLAT - 0.1, t);
        } else {
          s.z = rebuildDepth(s.j, n, t, st, half);
          s.tilt = rebuildTilt(tau) * Math.asin(Math.min(1, half / s.lever));
          s.on = tau > 0;
          s.acr = 1 - smooth(RB_GATHER, RB_FORWARD, t);
        }
        s.gain = this.gain(s.z, open);
        s.sweep = -3;
        s.rs = 1;
        s.rsA = red ? 1 - s.op : 1 - smooth(0, RB_CROSS + RB_SLIDE, tau);
        this.insideShadow(s);
        if (s.j === 0) {
          // the backing returns behind the bottom layer and covers the panel again
          this.backA = red ? s.op : smooth(0, RB_CROSS + RB_SLIDE, tau);
          this.lit = 1 - this.backA;
          this.backZ = s.z - THICK * s.acr - 0.002;
          this.backGain = this.gain(this.backZ, open);
        }
      }
    }
    if (tl === "rebuild" && persp && n === 0) this.lit = 1;
  }

  private updateGuest(tl: Timeline, t: number, now: number): void {
    const P = this.P, red = this.reduced, sh = this.shared;
    const live = !this.paused && now - this.uT0 < 350;
    const u = (this.u = this.direct ? 0 : live ? mix(this.uFrom, this.uTo, easeInOut((now - this.uT0) / 350)) : this.uTo);
    if (live) this.dirty = true;
    // the unanchored pose swings about the solved one: two sweeps during the event, from one end and back to it.
    // A function of the event's own time only, so `fly` always starts from the same pose
    const yaw = red ? 0 : -DRIFT * Math.cos(tl === "explode" ? (2 * Math.PI * t) / P.dur.explode : 0);
    this.vQuat.setFromEuler(this.euler.set(VIRTUAL_PITCH, yaw, 0, "XYZ"));
    // anchor frame: tracked pose blended with the virtual pose
    if (this.hasPose) this.mat.fromArray(this.pose).decompose(this.aPos, this.aQuat, this.v2);
    this.fPos.copy(this.aPos).lerp(this.vPos, u);
    this.fQuat.copy(this.aQuat).slerp(this.vQuat, u);
    this.fScl.set(1, 1, 1);
    // how much of what is behind the glass this device draws: nothing when anchored, all of it when alone
    const behind = this.direct ? 1 : u;
    let spread = 1, chromeA = 1, w = 0;
    this.spread = 1;
    this.bgA = 0;
    this.cavA = this.lit = this.backA = 0;
    this.backZ = 0;
    this.backGain = 1;
    sh.uSnap.value = 0;
    sh.uOrtho.value = 0;
    sh.uRim.value = 0;
    sh.uBehind.value = behind;
    let side = behind > 0 ? 0 : 1;
    const open = red ? 1 : smooth(0, OPEN, t);
    if (!this.started) {
      for (const s of this.sheets) { this.reset(s); s.on = false; }
      return;
    }
    if (tl === "explode") {
      this.cavA = 1;
      this.eventCavity(t, open);
    } else if (tl === "fly") {
      w = red ? 0 : easeInOut(t / FLY);
      this.screenFrame(this.deckZoom, this.deckX, this.deckY);
      this.fPos.lerp(this.sPos, w);
      this.fPos.y += 0.3 * Math.sin(Math.PI * w);
      this.fQuat.slerp(this.q.identity(), w);
      this.fScl.y = mix(1, this.sScaleY, w);
      spread = this.spread = mix(1, DECK, w);
      chromeA = 1 - clamp01(t / 0.3);
      this.bgA = red ? clamp01(t / FLY) : smooth(0.3, 1, t / FLY);
      // the window and its empty cavity go with the chrome
      this.cavA = chromeA;
      this.lit = 1;
      if (this.cavA * behind <= 0) side = 2;
    } else {
      // the deck grows (or, for a small landing rect, shrinks) and moves into the landing rect
      const g = red ? 1 : easeInOut(t / 0.75), fx = this.fitX + this.fitW / 2, fy = this.fitY + this.fitH / 2;
      this.screenFrame(mix(this.deckZoom, 1, g), mix(this.deckX, fx, g), mix(this.deckY, fy, g));
      this.fPos.copy(this.sPos);
      this.fQuat.identity();
      this.fScl.y = this.sScaleY;
      chromeA = 0;
      this.bgA = 1;
      side = 2;
      if (t >= ASSEMBLE) sh.uSnap.value = 1;
    }
    sh.uSide.value = this.direct ? -1 : side;
    this.frame.matrix.compose(this.fPos, this.fQuat, this.fScl);
    this.frame.matrixWorldNeedsUpdate = true;
    // where the camera sits, seen from the card: the eye of the window test, and the drive of the specular sweep
    this.v2.copy(this.fPos).negate().applyQuaternion(this.qi.copy(this.fQuat).invert());
    sh.uEye.value.set(this.v2.x, this.v2.y, Math.max(0.05, this.v2.z));
    this.v2.normalize();
    const view = 1.2 * (this.v2.x * 0.8 - this.v2.y * 0.6);
    const stair = STAIR * this.cardH;

    for (const s of this.sheets) {
      this.reset(s);
      if (s.qr) { s.on = false; continue; }
      const zTop = Z0 + ZGAP * s.j + THICK;
      s.acr = 1;
      if (tl === "explode") {
        const tau = this.eventSheet(s, t, open, behind <= 0);
        // anchored: nothing of a sheet is in front of the glass before its crossing
        if (behind <= 0 && tau < APPROACH - 0.02) { s.on = false; continue; }
        const c = clamp01((tau - EXIT - SETTLE) / CHROME);
        if (red) {
          s.chA = c;
          s.fr = s.ms = s.hd = s.lead = s.chipR = s.pillR = c > 0 ? 1 : 0;
        } else {
          // the specular sweep belongs to the stack in front: it runs onto a sheet as the sheet comes through the glass
          s.sweep = mix(-3, -1.2 + 1.5 * smooth(APPROACH, EXIT, tau) + 0.08 * s.j + view + 0.05 * Math.max(0, tau - EXIT), smooth(APPROACH, APPROACH + CROSS, tau));
          this.chrome(s, c);
        }
      } else {
        let e = spread;
        if (tl === "fly") {
          if (red) {
            s.op = 1 - clamp01(t / 0.7);
            s.on = s.op > 0;
          }
          s.sweep = 0.3 + 0.08 * s.j + view + 0.9 * w;
          s.chA = chromeA;
          s.fr = s.ms = s.hd = s.lead = s.chipR = s.pillR = chromeA > 0 ? 1 : 0;
        } else {
          const tau = t - P.assembleStart[s.j];
          if (red) {
            e = 0;
            s.acr = 0;
            s.op = clamp01(tau / 0.4);
            s.on = s.op > 0;
          } else {
            e = DECK * (1 - backOut(tau / P.assembleDrop));
            s.acr = 1 - smooth(0.5, 0.95, t);
            s.sweep = 1.2 + 0.08 * s.j + view + 0.6 * t;
          }
        }
        s.oy = stair * s.j * e;
        s.z = zTop * e;
      }
      // contact shadow on the sheet below once both are in front of the glass; no shadow is drawn on the glass
      const r = s.recv >= 0 ? this.sheets[s.recv] : null;
      if (r && r.on && s.z > 0 && (r.z > 0 || tl !== "explode")) {
        const h = Math.max(0, s.z - THICK * s.acr - r.z);
        s.shZ = r.z;
        s.shx = 0.1 * h;
        s.shy = -0.14 * h;
        s.shBlur = 0.004 + 0.05 * h;
        s.shSlab = 0.3;
        s.shA = 0.35 * s.op * s.acr * smooth(0, 0.02, h) * (1 - 0.45 * clamp01(h / 0.8)) * (tl === "explode" ? smooth(0, 0.05, r.z) : 1);
      } else if (tl === "explode" && behind > 0) {
        this.insideShadow(s);
      }
      if (this.direct) s.chA = 0;
    }
  }

  /** Chrome draw-in over CHROME seconds: frame trace, handles, measurement, leader, chip, pill. */
  private chrome(s: Sheet, c: number): void {
    s.chA = c > 0 ? 1 : 0;
    s.fr = clamp01(c / 0.556);
    s.hd = clamp01((c - 0.45) / 0.2);
    s.ms = clamp01((c - 0.5) / 0.35);
    s.lead = clamp01((c - 0.55) / 0.3);
    s.chipR = clamp01((c - 0.75) / 0.25);
    s.pillR = clamp01((c - 0.85) / 0.15);
  }

  // ---------------------------------------------------------------- state -> GPU

  private apply(): void {
    const host = this.role === "host", pxc = this.sx / this.fitW;
    this.bg.visible = this.bgA > 0;
    this.bgMat.uniforms.uAlpha.value = this.bgA;
    // the cavity: drawn by the host through the eye, and by the guest when it is alone
    const cav = this.cavity!, cavA = host ? (this.persp ? this.cavA : 0) : this.cavA * this.shared.uBehind.value;
    let ns = 0;
    if (cavA > 0) {
      for (const s of this.flying) {
        if (ns >= MAX_SHADOWS) break;
        if (!s.on || s.op <= 0 || s.z >= -0.02) continue;
        cav.sheet[ns].set(s.rx - s.rw / 2, s.ry + s.oy - s.rh / 2, s.rx + s.rw / 2, s.ry + s.oy + s.rh / 2);
        cav.sheetZ[ns] = s.z;
        cav.sheetA[ns] = (1 - smooth(-0.35, -0.05, s.z)) * s.op;
        ns++;
      }
    }
    // the room is seen as far as the bottom sheet while that sheet is inside it
    const bottom = this.flying.length > 0 ? this.flying[0] : null;
    cav.set(cavA, this.lit, ns, bottom && bottom.on && bottom.op > 0.5 && bottom.z < -NEAR ? -bottom.z - 0.01 : 1e3);
    const back = this.backing!, bu = this.backMat!.uniforms;
    back.visible = cavA > 0 && this.backA > 0;
    if (back.visible) {
      back.matrix.set(1, 0, 0, 0, 0, this.cardH, 0, 0, 0, 0, 1, this.backZ, 0, 0, 0, 1);
      bu.uLocal.value.copy(back.matrix);
      bu.uBox.value.set(0, 0, 1, this.cardH);
      bu.uOpacity.value = this.backA * this.cavA;
      bu.uGain.value = this.backGain;
    }
    if (this.rim) {
      this.rim.visible = cavA > 0;
      if (this.rim.visible) (this.rim.material as ShaderMaterial).uniforms.uAlpha.value.x = 0.5 * cavA;
    }
    let idx = 0;
    for (const s of this.sheets) {
      // painter's order: sheets inside the room, then the ruler flags (100), then sheets at or in front of the glass
      const base = 10 + idx * 10 + (s.z > -NEAR ? 200 : 0);
      const acr = s.acr, w = s.bw, h = s.bh, x = s.bx + s.ox, y = s.by + s.oy;
      const mesh = s.mesh, u = s.mat.uniforms;
      mesh.visible = s.on && s.op > 0;
      if (mesh.visible) {
        const zt = Math.max(1e-5, THICK * acr);
        if (s.tilt !== 0) {
          // the crossing tilt, about the sheet's centre: the top (or right) edge leads through the glass
          const c = Math.cos(s.tilt), sn = Math.sin(s.tilt);
          if (s.axis === 0) mesh.matrix.set(w, 0, 0, x, 0, h * c, -zt * sn, y, 0, h * sn, zt * c, s.z, 0, 0, 0, 1);
          else mesh.matrix.set(w * c, 0, -zt * sn, x, 0, h, 0, y, w * sn, 0, zt * c, s.z, 0, 0, 0, 1);
        } else {
          mesh.matrix.set(w, 0, 0, x, 0, h, 0, y, 0, 0, zt, s.z, 0, 0, 0, 1);
        }
        mesh.renderOrder = base + 1;
        u.uLocal.value.copy(mesh.matrix);
        u.uGain.value = s.gain;
        u.uBox.value.set(x, y, w, h);
        u.uOpacity.value = s.op;
        u.uZoom.value = 1 / s.sc;
        u.uAcr.value = acr;
        u.uSweep.value = s.sweep;
        u.uSweepAmt.value = this.tier.sweep && !this.reduced ? 1 : 0;
        u.uInner.value.set(-0.004 / w, 0.006 / h, this.tier.sweep ? 1 : -1);
        if (s.qr) u.uQrT.value.set(s.qT, (-0.8 * s.qLift * pxc) / s.rw, (-s.qLift * pxc) / s.rh);
        if (s.next) {
          const m = clamp01((performance.now() - s.mixT0) / 150);
          u.uMix.value = m;
          this.dirty = true;
          if (m >= 1) this.finishSwap(s);
        }
      }
      const sh = s.shadow, su = s.smat?.uniforms;
      if (sh && su) {
        sh.visible = s.on && s.shA > 0.004;
        if (sh.visible) {
          const pad = s.shBlur * 2 + 0.002, gw = w + 2 * pad, gh = h + 2 * pad;
          const cx = x + s.shx, cy = y + s.shy;
          sh.matrix.set(gw, 0, 0, cx, 0, gh, 0, cy, 0, 0, 1, s.shZ, 0, 0, 0, 1);
          su.uLocal.value.copy(sh.matrix);
          su.uBox.value.set(cx, cy, gw, gh);
          su.uGrow.value.set(gw / w, gh / h);
          su.uRad.value.set(s.shBlur / w, s.shBlur / h);
          su.uLod.value = Math.log2(Math.max(1, s.shBlur * this.fitW * 0.9));
          su.uAlpha.value = s.shA;
          su.uSlab.value = s.shSlab * acr;
          // on the receiver the shadow is clipped to it; the flat card's parallax shadow lies under its own sheet
          const r = !s.shGlass && s.recv >= 0 ? this.sheets[s.recv] : null;
          if (r) su.uClip.value.set(r.bx + r.ox - r.bw / 2, r.by + r.oy - r.bh / 2, r.bx + r.ox + r.bw / 2, r.by + r.oy + r.bh / 2);
          else su.uClip.value.set(-1e3, -1e3, 1e3, 1e3);
          sh.renderOrder = r ? 10 + s.recv * 10 + (r.z > -NEAR ? 200 : 0) + 2 : base;
        }
      }
      if (!s.qr) {
        // the outline the layer leaves on the back wall
        const rl = host ? s.lines : s.res, ru = (host ? s.lmat : s.resMat)?.uniforms;
        if (rl && ru) {
          rl.visible = cavA > 0 && s.rsA > 0;
          if (rl.visible) {
            const inset = (1 + 8 * s.dupe) * pxc;
            rl.matrix.set(s.rw - inset, 0, 0, s.rx, 0, s.rh - inset, 0, s.ry, 0, 0, 1, 0.001 - CAVITY_DEPTH, 0, 0, 0, 1);
            ru.uLocal.value.copy(rl.matrix);
            ru.uDash.value = 6 * this.sx;
            ru.uProg.value.set(s.rs, 0, 0, 0);
            ru.uAlpha.value.set(s.rsA * cavA, 0, 0, 0);
            rl.renderOrder = 3;
          }
        }
        if (!host) {
          const ln = s.lines, lu = s.lmat.uniforms;
          ln.visible = s.chA > 0 && mesh.visible;
          if (ln.visible) {
            ln.matrix.set(s.rw, 0, 0, s.rx + s.ox, 0, s.rh, 0, s.ry + s.oy, 0, 0, 1, s.z, 0, 0, 0, 1);
            lu.uLocal.value.copy(ln.matrix);
            lu.uProg.value.set(s.fr, s.ms, s.hd, 0);
            lu.uAlpha.value.set(s.chA, s.chA, s.chA, 0);
            ln.renderOrder = base + 3;
          }
        }
      } else {
        s.lines.visible = false;
      }
      idx++;
    }
    if (host) this.finishSprites(0);
    else this.writeLabels();
  }

  private sprite(
    S: SpriteSet, i: number, x: number, y: number, w: number, h: number,
    e: { u0: number; v0: number; u1: number; v1: number }, alpha: number, reveal: number, dir: number,
  ): void {
    const o = i * 4;
    S.rect[o] = x; S.rect[o + 1] = y; S.rect[o + 2] = w; S.rect[o + 3] = h;
    S.uv[o] = e.u0; S.uv[o + 1] = e.v0; S.uv[o + 2] = e.u1; S.uv[o + 3] = e.v1;
    S.fx[o] = alpha; S.fx[o + 1] = reveal; S.fx[o + 2] = dir; S.fx[o + 3] = 0;
  }

  private finishSprites(n: number): void {
    this.spriteMesh.visible = n > 0;
    this.sprites.geometry.instanceCount = n;
    if (n > 0) for (const a of this.sprites.attrs) a.needsUpdate = true;
  }

  /** Guest: project the sheet corners, lay the label blocks out, write leaders and sprites. */
  private writeLabels(): void {
    const L = this.leaders!, S = this.sprites, E = this.atlas!.entries;
    let any = false;
    for (const s of this.flying) if (s.chA > 0 && s.on) any = true;
    if (!any) {
      this.finishSprites(0);
      this.leaderMesh!.visible = false;
      this.labelHistory.valid = false;
      return;
    }
    const sy = this.fScl.y, b = this.box;
    this.stackBox(this.fPos, this.fQuat);
    const minX = b[0], minY = b[1], maxX = b[2], maxY = b[3];
    let nl = 0;
    for (const s of this.flying) {
      const o = this.slots[s.slot], x = s.rx, hw = s.rw / 2, hh = s.rh / 2;
      const y = s.ry + STAIR * this.cardH * s.j * this.spread, z = (Z0 + ZGAP * s.j + THICK) * this.spread;
      let p = this.project(x - hw, y + hh, z, this.fPos, this.fQuat, sy);
      o.tlx = p.x; o.tly = p.y;
      p = this.project(x + hw, y + hh, z, this.fPos, this.fQuat, sy);
      o.trx = p.x; o.try_ = p.y;
      p = this.project(x - hw, y - hh, z, this.fPos, this.fQuat, sy);
      o.blx = p.x; o.bly = p.y;
      p = this.project(x + hw, y - hh, z, this.fPos, this.fQuat, sy);
      o.brx = p.x; o.bry = p.y;
      nl++;
    }
    // label blocks keep the 8 % margins in both modes (anchored too: a stack near an edge pushes its rows inwards)
    const mx = MARGIN * this.cw, my = MARGIN * this.ch;
    const settled = layoutLabelsHeld(this.slots, nl, minX, minY, maxX, maxY, this.cw, this.ch, mx, my, this.order, this.labelHistory, this.chromeDt, this.reduced);
    // blocks still on their way (or a pose that has only just come to rest): keep drawing
    if (!settled) this.dirty = true;
    let ns = 0, li = 0;
    for (const s of this.flying) {
      const o = this.slots[s.slot], a = s.on ? s.chA : 0;
      // leader, drawn from the sheet outwards: corner -> gate, gate -> rail at the block's row, rail -> block
      const d = clamp01(s.lead / 0.5), dr = clamp01((s.lead - 0.5) / 0.25), st = clamp01((s.lead - 0.75) / 0.25);
      setLine(L, li++, o.ax, o.ay, 0, mix(o.ax, o.ex, d), mix(o.ay, o.gy, d), 0, 1, 3, 0, 1, BLUE, a * (s.lead > 0 ? 1 : 0));
      setLine(L, li++, o.ex, o.gy, 0, o.ex, mix(o.gy, o.ey, dr), 0, 1, 3, 0, 1, BLUE, a * (dr > 0 ? 1 : 0));
      setLine(L, li++, o.ex, o.ey, 0, mix(o.ex, o.ix, st), o.ey, 0, 1, 3, 0, 1, BLUE, a * (st > 0 ? 1 : 0));
      if (a <= 0) continue;
      const chip = E[s.chip], dir = -o.side;
      const cx = o.side < 0 ? o.ix - chip.w : o.ix;
      if (s.chipR > 0) this.sprite(S, ns++, cx * this.sx, o.y * this.sy, chip.w * this.sx, chip.h * this.sy, chip, a, s.chipR, dir);
      if (s.pill >= 0 && s.pillR > 0) {
        const pill = E[s.pill], pxx = o.side < 0 ? o.ix - pill.w : o.ix;
        this.sprite(S, ns++, pxx * this.sx, (o.y + CHIP_H + BLOCK_GAP) * this.sy, pill.w * this.sx, pill.h * this.sy, pill, a, s.pillR, dir);
      }
    }
    this.leaderMesh!.visible = true;
    for (const at of L.attrs) at.needsUpdate = true;
    this.finishSprites(ns);
  }

  // ---------------------------------------------------------------- loop

  private tick(now: number): void {
    if (this.paused) return;
    const dur = this.P.dur[this.tl];
    let t = Math.max(0, (now - this.t0) / 1000);
    if (!(t >= 0)) t = 0;
    const idle = this.tl === "idle";
    if (!idle && t > dur) t = dur;
    const moving = idle ? !this.reduced : t !== this.t;
    if (!moving && !this.dirty && !this.sizeDirty) return;
    if (idle && now - this.lastRender < 33 && !this.sizeDirty) return;
    this.t = t;
    this.chromeDt = Math.min(0.1, Math.max(0, (now - this.lastRender) / 1000));
    const t0 = __WINDOW_TEST__ ? performance.now() : 0;
    if (this.sizeDirty) this.measure();
    this.emit(t);
    this.dirty = false;
    this.update(now);
    this.render();
    this.lastRender = now;
    if (__WINDOW_TEST__) {
      if (this.finish) this.renderer.getContext().finish();
      (this.cpuMs ??= new Float32Array(240))[this.frameCount % 240] = performance.now() - t0;
    }
    if (!idle && t >= dur && !this.done) {
      this.done = true;
      const r = this.resolve;
      this.resolve = null;
      r?.();
      this.opts.onDone?.({ timeline: this.tl });
    }
  }

  private emit(t: number): void {
    const ev = this.events[this.tl];
    while (this.evCursor < ev.length && ev[this.evCursor].t <= t) {
      if (ev[this.evCursor].t > this.prevT) this.opts.onLayer?.(ev[this.evCursor].e);
      this.evCursor++;
    }
    this.prevT = t;
  }

  private render(): void {
    this.renderer.render(this.scene, this.camera);
    this.frameCount++;
  }

  private finishSwap(s: Sheet): void {
    if (!s.next) return;
    const u = s.mat.uniforms;
    s.tex.dispose();
    s.tex = s.next;
    s.next = null;
    u.map.value = s.tex;
    u.mapB.value = s.tex;
    u.uMix.value = 0;
    if (s.smat) s.smat.uniforms.map.value = s.tex;
  }

  // ---------------------------------------------------------------- public handle

  handle(): WindowHandle {
    const h: WindowHandle = {
      play: (timeline, o) => this.play(timeline, o?.at),
      setTilt: (x, y) => {
        const cx = Math.max(-1, Math.min(1, x || 0)), cy = Math.max(-1, Math.min(1, y || 0));
        if (cx !== this.tiltX || cy !== this.tiltY) { this.tiltX = cx; this.tiltY = cy; this.dirty = true; }
      },
      setPose: (m) => {
        const had = this.hasPose;
        this.hasPose = !!m && m.length >= 16;
        if (m && this.hasPose) {
          for (let i = 0; i < 16; i++) this.pose[i] = m[i];
          this.everPose = true;
        }
        if (had !== this.hasPose) {
          this.uFrom = this.u;
          this.uTo = this.hasPose ? 0 : 1;
          this.uT0 = performance.now();
        }
        this.dirty = true;
      },
      setViewer: (eye) => {
        if (this.role !== "host") return;
        const had = this.hasViewer;
        this.hasViewer = !!eye && eye.length >= 3 && isFinite(eye[0]) && isFinite(eye[1]) && eye[2] > 0;
        if (eye && this.hasViewer) this.viewer.set(eye[0], eye[1], eye[2]);
        if (had !== this.hasViewer) {
          this.wFrom = this.w;
          this.wTo = this.hasViewer ? 1 : 0;
          this.wT0 = performance.now();
        }
        this.dirty = true;
      },
      setProjection: (fovY, aspect) => {
        if (!(fovY > 1 && fovY < 179)) return;
        this.fov = fovY;
        this.aspect = aspect > 0 ? aspect : 0;
        if (this.role === "guest") this.setCamera();
      },
      replaceLayer: (id, src) => this.replaceLayer(id, src),
      where: () => ({ role: this.role, timeline: this.tl, t: this.t }),
      dispose: () => this.dispose(),
    };
    if (__WINDOW_TEST__ && this.opts.test === true) h.test = makeHooks(this);
    return h;
  }

  private play(tl: Timeline, at?: number): Promise<void> {
    const ok = (this.role === "host" ? HOST_TIMELINES : GUEST_TIMELINES).includes(tl);
    if (!ok) return Promise.reject(new Error(`window: timeline "${tl}" does not belong to role "${this.role}"`));
    if (this.disposed) return Promise.reject(new Error("window: disposed"));
    const prev = this.resolve;
    this.resolve = null;
    prev?.();
    this.tl = tl;
    this.t0 = typeof at === "number" && isFinite(at) ? at : performance.now();
    this.started = true;
    this.t = 0;
    this.prevT = -1;
    this.evCursor = 0;
    this.done = false;
    this.dirty = true;
    if (tl === "idle") return new Promise<void>(() => {});
    return new Promise<void>((res) => { this.resolve = res; });
  }

  private async replaceLayer(id: string, src: string): Promise<void> {
    const s = this.sheets.find((x) => x.spec.id === id);
    if (!s) throw new Error(`window: no layer "${id}"`);
    const img = await loadImage(resolveUrl(this.opts.baseUrl, src));
    if (this.disposed) return;
    s.img = img;
    if (s.qr) {
      s.grid = detectQrGrid(img, this.canvas);
      s.mat.uniforms.uQr.value.set(s.grid.ox, s.grid.oy, s.grid.nx, s.grid.ny);
    }
    this.setTexture(s, img, true);
    s.mixT0 = performance.now();
    this.dirty = true;
    if (this.paused) { this.finishSwap(s); return; }
    await new Promise<void>((res) => setTimeout(res, 170));
    if (!this.disposed) this.finishSwap(s);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.ro?.disconnect();
    this.ro = null;
    this.canvas.removeEventListener("webglcontextlost", this.onLost);
    const r = this.resolve;
    this.resolve = null;
    r?.();
    for (const s of this.sheets) {
      s.tex.dispose();
      s.next?.dispose();
      s.mat.dispose();
      s.smat?.dispose();
      s.lmat.dispose();
      s.resMat?.dispose();
    }
    this.cavity?.dispose();
    this.cavity = null;
    this.backMat?.dispose();
    this.backTex?.dispose();
    (this.rim?.material as ShaderMaterial | undefined)?.dispose();
    this.atlasTex?.dispose();
    this.bgMat?.dispose();
    this.spriteMat?.dispose();
    (this.leaderMesh?.material as ShaderMaterial | undefined)?.dispose();
    for (const g of this.geos) g.dispose();
    this.scene.clear();
    this.sheets = [];
    this.flying = [];
    if (this.renderer) {
      this.renderer.renderLists.dispose();
      this.renderer.dispose();
    }
    if (this.usesFont) releaseFont();
    this.usesFont = false;
  }
}

// ---------------------------------------------------------------- test hooks
// Only reachable from a branch guarded by the build-time constant __WINDOW_TEST__, so the whole
// function is dropped from dist/window.js.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeHooks(x: any): TestHooks {
  return {
    seek: (timeline, t) => {
      x.tl = timeline;
      x.t0 = performance.now() - t * 1000;
      x.started = true;
      x.t = timeline === "idle" ? Math.max(0, t) : Math.max(0, Math.min(x.P.dur[timeline], t));
      x.prevT = x.t;
      x.done = true;
      if (x.sizeDirty) x.measure();
      x.dirty = false;
      // a seek starts from nothing: the chrome history is cleared, so the same seek gives the same pixels
      x.labelHistory.valid = false;
      x.chromeDt = 0;
      x.update(performance.now());
      x.render();
    },
    step: (timeline, t, dt) => {
      x.tl = timeline;
      x.started = true;
      x.t = timeline === "idle" ? Math.max(0, t) : Math.max(0, Math.min(x.P.dur[timeline], t));
      x.prevT = x.t;
      x.done = true;
      x.dirty = false;
      x.chromeDt = dt;
      x.update(performance.now());
      x.render();
    },
    setPaused: (p) => { x.paused = p; x.uT0 = -1e9; },
    setDirect: (on: boolean) => { x.direct = on; x.dirty = true; },
    forceOneEnd,
    frames: () => x.frameCount,
    setFinish: (on) => { x.finish = on; },
    fakePose: (yaw, pitch, dist, roll = 0, px = 0, py = 0) => {
      const d = Math.PI / 180;
      const q = new Quaternion().setFromEuler(new Euler(pitch * d, yaw * d, roll * d, "XYZ"));
      return new Float32Array(new Matrix4().compose(new Vector3(px, py, -dist), q, new Vector3(1, 1, 1)).elements);
    },
    stats: () => {
      const info = x.renderer.info, gl = x.renderer.getContext();
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      const cpu = x.cpuMs ? Array.from(x.cpuMs.subarray(0, Math.min(x.frameCount, 240))) : [];
      return {
        raf: x.raf !== 0, disposed: x.disposed, frames: x.frameCount,
        textures: info.memory.textures, geometries: info.memory.geometries, programs: info.programs?.length ?? 0,
        calls: info.render.calls, triangles: info.render.triangles,
        texBytes: Math.round(x.texBytes), pr: x.sx, buffer: [x.bw, x.bh], css: [x.cw, x.ch],
        fit: [x.fitX, x.fitY, x.fitW, x.fitH], cpuMs: cpu, budgetBytes: x.tier.mem * 1048576,
        gpu: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      };
    },
    state: () => ({
      role: x.role, timeline: x.tl, t: x.t, u: x.u, bgA: x.bgA, textPx: TEXT_PX, sweepOn: x.tier.sweep && !x.reduced,
      start: Array.from(x.P.start), rebuildStart: Array.from(x.P.rebuildStart),
      eye: x.eye.toArray(), viewerBlend: x.w, persp: x.persp, cavA: x.cavA, lit: x.lit, backA: x.backA, backZ: x.backZ,
      side: x.shared.uSide.value, behind: x.shared.uBehind.value, rimLight: x.shared.uRim.value,
      cardH: x.cardH, cavityLit: x.cavity ? x.cavity.lit : false,
      deck: { zoom: x.deckZoom, x: x.deckX / x.sx, y: x.deckY / x.sy }, projection: Array.from(x.camera.projectionMatrix.elements),
      labelSwaps: x.labelHistory.swaps, arrangement: x.labelHistory.level,
      frame: { pos: x.fPos.toArray(), quat: x.fQuat.toArray(), scale: x.fScl.toArray() },
      offNormalDeg: (Math.acos(clamp01(new Vector3(0, 0, 1).applyQuaternion(x.fQuat).dot(new Vector3().copy(x.fPos).negate().normalize()))) * 180) / Math.PI,
      box: Array.from(x.box),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sheets: x.sheets.map((s: any) => ({
        id: s.spec.id, qr: s.qr, j: s.j, on: s.on, op: s.op, x: s.bx + s.ox, y: s.by + s.oy, z: s.z, ox: s.ox, oy: s.oy,
        sc: s.sc, acr: s.acr, w: s.bw, h: s.bh, qT: s.qT, shA: s.shA, fr: s.fr, frA: s.frA, chA: s.chA,
        chipR: s.chipR, pillR: s.pillR, lead: s.lead, k: s.k, rect: [s.rx, s.ry, s.rw, s.rh],
        tilt: s.tilt, axis: s.axis, lever: s.lever, gain: s.gain, rs: s.rs, rsA: s.rsA,
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      labels: x.flying.map((s: any) => {
        const o = x.slots[s.slot];
        return { id: s.spec.id, corner: o.corner, side: o.side, zone: o.zone, row: o.row, x: o.x, y: o.y, w: o.bw, h: o.bh, ax: o.ax, ay: o.ay, ex: o.ex, ey: o.ey, gy: o.gy, ix: o.ix,
          corners: [o.tlx, o.tly, o.trx, o.try_, o.blx, o.bly, o.brx, o.bry] };
      }),
    }),
  };
}

const RIM_WHITE = [0.918, 0.949, 1] as const;

/** The four sides of the unit rect as one path (frame group), clockwise from the top-left corner. */
function outline(L: LineSet, width: number, alpha: number, color: readonly number[] = BLUE): void {
  const h = 0.5;
  setLine(L, 0, -h, h, 0, h, h, 0, width, 0, 0, 0.25, color, alpha);
  setLine(L, 1, h, h, 0, h, -h, 0, width, 0, 0.25, 0.5, color, alpha);
  setLine(L, 2, h, -h, 0, -h, -h, 0, width, 0, 0.5, 0.75, color, alpha);
  setLine(L, 3, -h, -h, 0, -h, h, 0, width, 0, 0.75, 1, color, alpha);
}

function parseColor(css: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(css.trim());
  if (!m) return [0, 0, 0];
  let h = m[1];
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const v = parseInt(h, 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}
