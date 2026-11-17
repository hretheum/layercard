// The effect: one renderer, one scene graph, two roles. `update*()` turns (timeline, t, inputs) into
// per-sheet state; `apply()` pushes that state into matrices and uniforms. Nothing is allocated per frame.
//
// Host: the card on a canvas that zooms out; sheets live in the card frame (`frame`, scaled by the zoom).
// Guest: every sheet has its own transform in camera space — its room pose seen through the pose
// (or through the virtual eye), blended into peel's deck during `fly`, the deck itself in `assemble`.
import {
  Camera, CanvasTexture, Euler, Group, LinearFilter, LinearMipmapLinearFilter, Matrix4, Mesh, Quaternion, Scene,
  Texture, Vector3, WebGLRenderer, type BufferGeometry, type ShaderMaterial,
} from "three";
import type {
  Handle, LayerEvent, LayerManifest, LayerSpec, MountOptions, Quality, Rect, Role, Timeline,
} from "../../../types";
import {
  acquireFont, bakeLayer, buildAtlas, detectColumns, detectQrGrid, loadImage, makeCanvas, releaseFont, resolveUrl,
  BLOCK_GAP, CHIP_H, PILL_H, TAG_H, TEXT_PX, type AnyCanvas, type Atlas, type AtlasItem, type Columns, type QrGrid,
} from "./assets";
import {
  bgMaterial, colsMaterial, flatMaterial, guideMaterial, lineMaterial, lineSet, makeShared, planeGeometry, setLine,
  shadowMaterial, sheetMaterial, slabGeometry, spriteMaterial, spriteSet, BLUE, RED, type LineSet, type Shared, type SpriteSet,
} from "./gl";
import {
  clipNear, clipRect, easeLabels, makeLabel, placeLabels, polyArea, LABEL_MAX, LABEL_STILL, POLY_MAX, type RoomLabel,
} from "./layout";
import { layoutRoom, CARD_WIDTH_CM, KIND_BACK, KIND_WALL, type RoomSheet } from "./room";
import {
  backOut, clamp01, easeInOut, easeOut, eyeYaw, heavy, liftCurve, mix, plan, smooth, zoomAt, zoomBack,
  ASSEMBLE, BREATH, CHROME, CONNECT, DECK, DECK_ZOOM, FLY, GUEST_TIMELINES, GUIDE, GUIDE_LEAD, HOP, HOST_TIMELINES,
  LIFT_START, MEASURE_T0, MEASURE_T1, PEEL, REBUILD, REBUILD_QR_T0, REBUILD_ZOOM_T0, REBUILD_ZOOM_T1, SHADOW_HANDOVER, SWELL, TRAVEL,
  TRAVEL_DELAY, ZOOM, ZOOM_T1, type Plan,
} from "./schedule";

export const THICK = 0.012;
// the deck (peel v2): spacing of the fanned stack the sheets form at the end of `fly`
export const Z0 = 0.08;
export const ZGAP = 0.11;
export const STAIR = 0.035;
/** Free canvas on every side of the deck at the end of `fly`, as a share of the canvas width / height. */
const DECK_MARGIN = 0.04;
/** Labels keep this many CSS px from the canvas edges. */
const LABEL_MARGIN = 10;
/** Host: the words above the artboard once the first layer has left (16 characters at most). */
export const HOST_TAG = "Spilled to guest";
/** Unanchored guest: the virtual phone stands this far from the virtual eye (6.7 units = 47 cm), seen from slightly above. */
const VIRTUAL_DIST = 6.7;
const VIRTUAL_PITCH = (5 * Math.PI) / 180;
/** A fragment closer to the camera than NEAR1 units fades; at NEAR0 it is gone (a sheet beside the camera never fills the frame). */
const NEAR0 = 0.7;
const NEAR1 = 1.9;
/** Print density of a sheet behind the phone: the wall is tinted glass, not a blackout. */
const WALL_INK = 0.5;
/** Guides run this far past a sheet's corners (card units); softness is full this far from the phone. */
const GUIDE_EXT = 7;
const FAR = 9;
/** The host phone's body is taken to be this much larger than the card on every side (the hole behind it, the virtual phone). */
const PHONE_PAD = 0.035;
/**
 * Light pose interpolation (contract: "the effect gets a smoothed pose and may add only light
 * interpolation"): a low-pass whose cutoff rises with the speed of the pose, so a resting hand's
 * shake is damped and a real move is followed. Hz, Hz, Hz per unit/s, Hz per rad/s.
 */
const FC_MIN = 1.0;
const FC_SPEED = 1.0;
const BETA_T = 3.0;
const BETA_R = 14;
const Y_AXIS = new Vector3(0, 1, 0);
/** The red line is a tape: a tick every 10 cm from the host phone, at most this many. */
const MEASURE_TICKS = 12;

interface Tier { dpr: number; tex: number; taps: number; sweep: boolean; aniso: number; mem: number; far: boolean; guides: number; rim: number }
const TIERS: Record<Quality, Tier> = {
  high: { dpr: 2, tex: 2048, taps: 5, sweep: true, aniso: 4, mem: 64, far: true, guides: 4, rim: 1 },
  mid: { dpr: 1.5, tex: 1536, taps: 1, sweep: true, aniso: 2, mem: 40, far: true, guides: 2, rim: 1 },
  low: { dpr: 1, tex: 1024, taps: 0, sweep: false, aniso: 1, mem: 24, far: false, guides: 2, rim: 0.45 },
  test: { dpr: 1, tex: 2048, taps: 5, sweep: true, aniso: 4, mem: 64, far: true, guides: 4, rim: 1 },
};

interface Sheet {
  i: number; spec: LayerSpec; qr: boolean;
  /** stack index among flying layers (0 = bottom), -1 for a QR layer */
  j: number;
  /** leave order, -1 for a QR layer */
  k: number;
  zn: number; recv: number; dupe: number; slot: number; chip: number; pill: number;
  img: HTMLImageElement; tex: Texture; next: Texture | null; mixT0: number; grid: QrGrid | null;
  // card units: baked box and exact rect (centre, size)
  bx: number; by: number; bw: number; bh: number; rx: number; ry: number; rw: number; rh: number;
  mesh: Mesh; mat: ShaderMaterial; shadow: Mesh | null; smat: ShaderMaterial | null;
  lines: Mesh; lmat: ShaderMaterial; lset: LineSet;
  /** guest: where the layer stands in the room */
  room: RoomSheet;
  // per-frame state
  on: boolean; op: number; ox: number; oy: number; z: number; sc: number; acr: number; sweep: number;
  qT: number; qLift: number; lifted: boolean;
  shA: number; shx: number; shy: number; shBlur: number; shZ: number; shSlab: number; shGlass: boolean;
  fr: number; frA: number; ms: number; hd: number; chA: number; lead: number; chipR: number; pillR: number;
  // guest: transform of the rect centre in camera space, scale of the sheet along its own x and y
  wx: number; wy: number; wz: number; q: Quaternion; kx: number; ky: number; thick: number;
  /** guest: depth in the card frame (negative: behind the phone), travel 0..1, share of the deck 0..1 */
  cz: number; g: number; w: number;
  behind: number; reveal: number; ink: number; near: number; flat: boolean; guide: number; base: number;
  /** guest shadow: 0 none, 1 on the glass (card frame), 2 in the deck (screen frame); its centre and size there */
  shMode: number; shCx: number; shCy: number; shW: number; shH: number;
}

export interface TestHooks {
  seek(timeline: Timeline, t: number): void;
  /** Like seek, but `dt` seconds after the previous frame, with the chrome history and the pose filter kept. */
  step(timeline: Timeline, t: number, dt: number): void;
  setPaused(paused: boolean): void;
  frames(): number;
  /** Wait for the GPU after every frame so the recorded frame cost includes its work. */
  setFinish(on: boolean): void;
  state(): unknown;
  stats(): unknown;
  fakePose(yawDeg: number, pitchDeg: number, distance: number, rollDeg?: number, x?: number, y?: number): Float32Array;
}
export type SpillHandle = Handle & { test?: TestHooks };

export async function mountEffect(canvas: HTMLCanvasElement, opts: MountOptions): Promise<SpillHandle> {
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
  private labels: RoomLabel[] = [];
  /** chrome history: which of two competing label blocks was below the other */
  private readonly labelPref = new Int8Array(LABEL_MAX * LABEL_MAX);
  /** seconds since the previous frame, for the chrome history and the pose filter */
  private chromeDt = 0;
  /** the pose handed in has changed since the last frame; seconds it has held still */
  private poseMoved = true;
  private poseStill = 0;
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
  private atlasItems: AtlasItem[] = [];
  private tagEntry = -1;
  private segEntry = -1;
  private scratch: AnyCanvas | null = null;
  private over: AnyCanvas | null = null;
  private geos: BufferGeometry[] = [];
  private mats: ShaderMaterial[] = [];
  private usesFont = false;
  // the card's column grid (card units) and the plane that continues it
  private cols: Columns = { x0: -0.5, pitch: 1, width: 1 };
  private colsFound = false;
  private colsMesh!: Mesh;
  private colsMat!: ShaderMaterial;
  private colsA = 0;
  private colsGrow = 0;
  /** guest: the sheet the plane of columns hangs on (the grid, else the wall) */
  private carrier: Sheet | null = null;
  // guest: guides, the measurement, the virtual phone
  private guides: LineSet | null = null;
  private guideMesh: Mesh | null = null;
  private guideCount = 0;
  private measure: LineSet | null = null;
  private measureMesh: Mesh | null = null;
  private measureMat: ShaderMaterial | null = null;
  private ghost: LineSet | null = null;
  private ghostMesh: Mesh | null = null;
  private ghostMat: ShaderMaterial | null = null;
  private phoneBody: Mesh | null = null;
  private phoneScreen: Mesh | null = null;
  private phoneA = 0;
  private measureP = 0;
  private measureA = 0;
  private cmShown = -1;
  private cmRaw = 0;
  private readonly distRect = new Float64Array(4);
  private readonly distLine = new Float64Array(4);
  private tagA = 0;
  private zoom = 1;

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

  // frames (guest): anchored (filtered pose), virtual, screen, and the one in use
  private readonly aPos = new Vector3(); private readonly aQuat = new Quaternion();
  private readonly vPos = new Vector3(0, 0, -VIRTUAL_DIST); private readonly vQuat = new Quaternion();
  private readonly sPos = new Vector3(); private sScaleY = 1;
  private readonly fPos = new Vector3(); private readonly fQuat = new Quaternion();
  private bgA = 0;
  private u = 1;
  // pose filter
  private readonly rawPos = new Vector3(); private readonly rawQuat = new Quaternion();
  private readonly prevPos = new Vector3(); private readonly prevQuat = new Quaternion();
  private readonly vel = new Vector3(); private readonly ang = new Vector3();
  private filterOn = false;

  // scratch
  private readonly v = new Vector3(); private readonly v2 = new Vector3(); private readonly v3 = new Vector3();
  private readonly ex = new Vector3(); private readonly ey = new Vector3();
  private readonly q = new Quaternion(); private readonly qi = new Quaternion();
  private readonly euler = new Euler();
  private readonly mat = new Matrix4();
  private readonly box = [0, 0, 0, 0];
  private readonly pts = new Float64Array(12);
  private readonly pts2 = new Float64Array(18);
  private readonly polyTmp = new Float64Array(POLY_MAX * 2);

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
    const test = __SPILL_TEST__ && this.opts.test === true;
    const host = this.role === "host";
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
    const n = this.P.n, room = layoutRoom(this.m), card = this.m.card;
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
        i: l.i, spec: l.spec, qr, j: qr ? -1 : j, k: qr ? -1 : this.P.order[j],
        zn: zTop > 0 ? Math.min(1, l.spec.z / zTop) : 0, recv: -1, dupe: 0, slot: -1, chip: -1, pill: -1,
        img: imgs[idx], tex, next: null, mixT0: 0, grid: qr ? detectQrGrid(imgs[idx], this.canvas) : null,
        bx: 0, by: 0, bw: 1, bh: 1, rx: 0, ry: 0, rw: 1, rh: 1,
        mesh, mat, shadow, smat, lines, lmat, lset, room: qr ? room[0] : room[j],
        on: true, op: 1, ox: 0, oy: 0, z: 0, sc: 1, acr: 0, sweep: 0, qT: 0, qLift: 0, lifted: false,
        shA: 0, shx: 0, shy: 0, shBlur: 0, shZ: 0, shSlab: 0, shGlass: false,
        fr: 0, frA: 0, ms: 0, hd: 0, chA: 0, lead: 0, chipR: 0, pillR: 0,
        wx: 0, wy: 0, wz: -1, q: new Quaternion(), kx: 1, ky: 1, thick: 0, cz: 0, g: 0, w: 0,
        behind: 0, reveal: 1, ink: 1, near: 0, flat: false, guide: 0, base: 0,
        shMode: 0, shCx: 0, shCy: 0, shW: 1, shH: 1,
      };
      for (const o of [mesh, shadow, lines]) {
        if (!o) continue;
        o.matrixAutoUpdate = false;
        o.frustumCulled = false;
        this.frame.add(o);
      }
      if (!qr) {
        // receiver of the contact shadow in the deck: nearest lower sheet whose rect contains this one, else none
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
        s.slot = this.labels.length;
        const label = makeLabel();
        // labels of sheets on the right hang on the right end of their top edge; the wall's on the left, the grid's on the right
        label.side = s.room.kind === KIND_WALL ? -1 : s.room.kind === KIND_BACK ? 1 : s.room.side < 0 ? -1 : 1;
        this.labels.push(label);
        s.chip = items.length;
        items.push({ text: l.spec.label ?? l.spec.name, kind: "chip" });
        if (l.spec.dims) {
          s.pill = items.length;
          items.push({ text: l.spec.dims, kind: "pill" });
        }
        // the card's column grid: read from the first full-bleed layer that holds regular columns
        if (!this.colsFound && l.spec.rect.w >= 0.9 * card.w && l.spec.rect.h >= 0.9 * card.h) {
          const c = detectColumns(imgs[idx], this.canvas);
          if (c) {
            const rw = l.spec.rect.w / card.w, left = (l.spec.rect.x - card.w / 2) / card.w;
            this.cols = { x0: left + c.x0 * rw, pitch: c.pitch * rw, width: c.width * rw };
            this.colsFound = true;
          }
        }
        if (!this.carrier || (this.carrier.room.kind === KIND_WALL && s.room.kind === KIND_BACK)) {
          if (s.room.kind === KIND_WALL || s.room.kind === KIND_BACK) this.carrier = s;
        }
        this.flying.push(s);
        j++;
      }
      this.sheets.push(s);
      this.buildLines(s);
    });
    this.tagEntry = items.length;
    items.push({ text: HOST_TAG, kind: "tag" });
    // the distance label: left end, ten digit cells, " cm" with the right end
    this.segEntry = items.length;
    items.push({ text: "", kind: "segL" });
    for (let d = 0; d < 10; d++) items.push({ text: String(d), kind: "seg" });
    items.push({ text: " cm", kind: "segR" });
    this.atlasItems = items;

    this.bgMat = bgMaterial(this.shared);
    const bgc = parseColor(card.background);
    this.bgMat.uniforms.uColor.value.set(bgc[0], bgc[1], bgc[2]);
    this.bg = new Mesh(full, this.bgMat);
    this.bg.frustumCulled = false;
    this.bg.renderOrder = 0;
    this.scene.add(this.bg);

    this.frame.matrixAutoUpdate = false;
    this.scene.add(this.frame);

    const still = (o: Mesh, order: number, parent: Group | Scene = this.scene): Mesh => {
      o.matrixAutoUpdate = false;
      o.frustumCulled = false;
      o.renderOrder = order;
      parent.add(o);
      return o;
    };
    this.colsMat = colsMaterial(this.shared);
    this.mats.push(this.colsMat);
    this.colsMat.uniforms.uCols.value.set(this.cols.x0, this.cols.pitch, this.cols.width);
    this.colsMesh = still(new Mesh(plane, this.colsMat), 5, host ? this.frame : this.scene);

    this.sprites = spriteSet(Math.max(1, n * 2 + 8));
    this.geos.push(this.sprites.geometry);
    this.atlasTex = new Texture();
    this.spriteMat = spriteMaterial(this.shared, this.atlasTex);
    this.spriteMesh = still(new Mesh(this.sprites.geometry, this.spriteMat), host ? 500 : 910);

    if (!host) {
      this.leaders = lineSet(Math.max(1, n));
      this.geos.push(this.leaders.geometry);
      const lm = lineMaterial(this.shared, true);
      this.mats.push(lm);
      this.leaderMesh = still(new Mesh(this.leaders.geometry, lm), 900);

      this.guides = lineSet(Math.max(1, n * 4));
      this.geos.push(this.guides.geometry);
      const gm = guideMaterial(this.shared);
      this.mats.push(gm);
      this.guideMesh = still(new Mesh(this.guides.geometry, gm), 880);

      this.measure = lineSet(3 + MEASURE_TICKS);
      this.geos.push(this.measure.geometry);
      this.measureMat = lineMaterial(this.shared, true);
      this.mats.push(this.measureMat);
      this.measureMesh = still(new Mesh(this.measure.geometry, this.measureMat), 905);

      // the virtual phone of the unanchored guest: body, screen, and the dashed outlines the host would show
      const body = flatMaterial(), screen = flatMaterial();
      this.mats.push(body, screen);
      body.uniforms.uColor.value.set(0x15 / 255, 0x17 / 255, 0x1b / 255);
      body.uniforms.uRound.value.set(0.1 / (1 + 2 * PHONE_PAD), 0.1 / (this.cardH + 2 * PHONE_PAD));
      screen.uniforms.uColor.value.set(bgc[0], bgc[1], bgc[2]);
      screen.uniforms.uRound.value.set(0.07, 0.07 / this.cardH);
      this.phoneBody = still(new Mesh(plane, body), 300);
      this.phoneScreen = still(new Mesh(plane, screen), 301);
      this.ghost = lineSet(4 * (n + 1));
      this.geos.push(this.ghost.geometry);
      this.ghostMat = lineMaterial(this.shared, false);
      this.mats.push(this.ghostMat);
      this.ghostMesh = still(new Mesh(this.ghost.geometry, this.ghostMat), 330);
    }

    this.buildEvents();
    this.measureCanvas();
    if (typeof ResizeObserver !== "undefined") {
      this.ro = new ResizeObserver(() => { this.sizeDirty = true; this.dirty = true; });
      this.ro.observe(this.canvas);
    }
    this.warmUp();
    this.update(0);
    this.render();
    this.raf = requestAnimationFrame(this.loop);
  }

  /**
   * Links every program and uploads every texture while mounting: one frame with everything visible,
   * clipped to a single pixel. Without it the first shadow, outline or label would stall its frame.
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
    const w = host ? 1 : 1.5, a = host ? 0.55 : 1, h = 0.5;
    setLine(L, 0, -h, h, 0, h, h, 0, w, 0, 0, 0.25, BLUE, a);
    setLine(L, 1, h, h, 0, h, -h, 0, w, 0, 0.25, 0.5, BLUE, a);
    setLine(L, 2, h, -h, 0, -h, -h, 0, w, 0, 0.5, 0.75, BLUE, a);
    setLine(L, 3, -h, -h, 0, -h, h, 0, w, 0, 0.75, 1, BLUE, a);
    for (let i = 4; i < 11; i++) setLine(L, i, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, RED, 0);
    s.lmat.uniforms.uSnap.value = host ? 1 : 0;
    s.lmat.uniforms.uDash.value = 0;
  }

  /** Measurement geometry depends on the rect's aspect, so it is rewritten after every measureCanvas(). */
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
      ev.depart.push({ t: P.start[s.k], e: e("leave") });
      ev.explode.push({ t: P.start[s.k], e: e("lift") }, { t: P.start[s.k] + TRAVEL_DELAY + TRAVEL, e: e("settle") });
      ev.assemble.push({ t: P.assembleStart[s.j] + P.assembleDrop, e: e("arrive") });
      ev.rebuild.push({ t: P.rebuildStart[s.j] + P.rebuildLand, e: e("arrive") });
    }
    for (const s of this.sheets) {
      if (s.qr) ev.rebuild.push({ t: REBUILD, e: { index: s.i, id: s.spec.id, phase: "arrive" } });
    }
    for (const k in ev) ev[k].sort((a, b) => a.t - b.t);
  }

  /** Canvas metrics, the flat fit, the screen-resolution bake, the atlas and the static frames. */
  private measureCanvas(): void {
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

    this.texBytes = 0;
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
      this.placeMeasure(s);
    }
    this.scratch.width = this.scratch.height = 1;
    this.scratch = null;
    if (this.over) this.over.width = this.over.height = 1;
    this.over = null;

    this.atlas = buildAtlas(this.atlasItems, this.sx, Math.min(176, this.cw - 2 * LABEL_MARGIN), this.canvas);
    for (const o of this.labels) o.held = false;
    this.cmShown = -1;
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
      const o = this.labels[s.slot], e = this.atlas.entries;
      o.bw = Math.max(e[s.chip].w, s.pill >= 0 ? e[s.pill].w : 0);
      o.bh = CHIP_H + (s.pill >= 0 ? BLOCK_GAP + PILL_H : 0);
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

    const cu = this.colsMat.uniforms;
    if (host) {
      this.camera.projectionMatrix.makeOrthographic(0, this.bw, this.bh, 0, -1e4, 1e4);
      // the canvas around the artboard: the whole drawing buffer at the smallest zoom, in card units
      cu.uPlane.value.set(0, 0, this.bw / (this.fitW * ZOOM) + 1, this.bh / (this.fitW * ZOOM) + 1);
      cu.uMask.value.set(0, 0, 1, this.cardH);
      cu.uFade.value.set(1e9, 1e9, 1e9, 1e9);
      cu.uGrow.value = 1.1;
    } else {
      this.frame.matrix.identity();
      this.frame.matrixWorldNeedsUpdate = true;
      this.setCamera();
    }
    this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
    this.sizeDirty = false;
    this.dirty = true;
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

  /** Projects a point of the screen frame (card units, face-on at this.sPos) to CSS px; result in this.v (x, y). */
  private projectDeck(x: number, y: number, z: number): Vector3 {
    const v = this.v.set(x + this.sPos.x, y * this.sScaleY + this.sPos.y, z + this.sPos.z).applyMatrix4(this.camera.projectionMatrix);
    v.x = (v.x * 0.5 + 0.5) * this.cw;
    v.y = (0.5 - v.y * 0.5) * this.ch;
    return v;
  }

  /** Device-px bounding box of the deck (the stack at DECK spacing, face-on) for the current this.sPos; result in this.box. */
  private deckBox(): void {
    const b = this.box, kx = this.bw / this.cw, ky = this.bh / this.ch;
    b[0] = b[1] = 1e9;
    b[2] = b[3] = -1e9;
    for (const s of this.flying) {
      const y = s.by + STAIR * this.cardH * s.j * DECK, z = (Z0 + ZGAP * s.j + THICK) * DECK;
      for (let c = 0; c < 4; c++) {
        const p = this.projectDeck(s.bx + (c & 1 ? 0.5 : -0.5) * s.bw, y + (c & 2 ? 0.5 : -0.5) * s.bh, z);
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

  /** Projects a point given in camera space to CSS px; result in this.v (x, y; z keeps the camera-space depth, negative in front). */
  private toScreen(x: number, y: number, z: number): Vector3 {
    const e = this.camera.projectionMatrix.elements, v = this.v;
    const d = -z > 1e-4 ? -z : 1e-4;
    v.set((((x * e[0]) / d) * 0.5 + 0.5) * this.cw, (0.5 - ((y * e[5]) / d) * 0.5) * this.ch, z);
    return v;
  }

  /** A point of the card frame (the anchored or virtual frame in use) in camera space; result in this.v2. */
  private fromCard(x: number, y: number, z: number): Vector3 {
    return this.v2.set(x, y, z).applyQuaternion(this.fQuat).add(this.fPos);
  }

  /** The tracked pose through the light low-pass; result in aPos / aQuat. `dt` <= 0 (a seek, the first pose) passes it unchanged. */
  private filterPose(dt: number): void {
    const p = this.rawPos, q = this.rawQuat;
    if (!this.filterOn || dt <= 0 || dt > 0.25) {
      this.aPos.copy(p);
      this.aQuat.copy(q);
      this.vel.set(0, 0, 0);
      this.ang.set(0, 0, 0);
      this.filterOn = true;
    } else {
      const ad = 1 - Math.exp(-2 * Math.PI * FC_SPEED * dt);
      this.vel.lerp(this.v.copy(p).sub(this.prevPos).multiplyScalar(1 / dt), ad);
      this.aPos.lerp(p, 1 - Math.exp(-2 * Math.PI * (FC_MIN + BETA_T * this.vel.length()) * dt));
      // angular velocity from the change of the raw pose (small-angle vector part of prev^-1 * q)
      this.qi.copy(this.prevQuat).invert().multiply(q);
      const k = (this.qi.w < 0 ? -2 : 2) / dt;
      this.ang.lerp(this.v.set(this.qi.x * k, this.qi.y * k, this.qi.z * k), ad);
      this.aQuat.slerp(q, 1 - Math.exp(-2 * Math.PI * (FC_MIN + BETA_R * this.ang.length()) * dt));
      // not there yet: keep drawing after the last pose has been handed in
      if (this.aPos.distanceToSquared(p) > 1e-12 || 1 - Math.abs(this.aQuat.dot(q)) > 1e-12) this.dirty = true;
    }
    this.prevPos.copy(p);
    this.prevQuat.copy(q);
  }

  // ---------------------------------------------------------------- per-frame state

  private reset(s: Sheet): void {
    s.on = true; s.op = 1; s.ox = 0; s.oy = 0; s.z = 0; s.sc = 1; s.acr = 0; s.sweep = 0; s.qT = 0; s.qLift = 0;
    s.lifted = false; s.shA = 0; s.shx = 0; s.shy = 0; s.shBlur = 0; s.shZ = 0; s.shSlab = 0; s.shGlass = false;
    s.fr = 0; s.frA = 0; s.ms = 0; s.hd = 0; s.chA = 0; s.lead = 0; s.chipR = 0; s.pillR = 0;
    s.g = 0; s.w = 0; s.behind = 0; s.reveal = 1; s.ink = 1; s.near = 0; s.flat = false; s.guide = 0; s.thick = 0; s.shMode = 0;
  }

  private update(now: number): void {
    if (this.role === "host") this.updateHost(this.tl, this.t);
    else this.updateGuest(this.tl, this.t, now);
    this.apply();
  }

  private updateHost(tl: Timeline, t: number): void {
    const P = this.P, red = this.reduced, pxc = this.sx / this.fitW;
    // The canvas zoom. With reduced motion the card is never seen moving: it fades out at one size
    // and fades in at the other.
    let zoom = 1, fade = 1;
    if (tl === "depart") {
      zoom = red ? (t < 0.5 ? 1 : ZOOM) : zoomAt(t);
      if (red) fade = t < 0.5 ? 1 - smooth(0.1, 0.5, t) : smooth(0.5, 0.9, t);
    } else if (tl === "rebuild") {
      const mid = (REBUILD_ZOOM_T0 + REBUILD_ZOOM_T1) / 2;
      zoom = red ? (t < mid ? ZOOM : 1) : zoomBack(t);
      if (red) fade = t < mid ? 1 - smooth(mid - 0.4, mid, t) : smooth(mid, mid + 0.4, t);
    }
    this.zoom = zoom;
    this.colsA = clamp01((1 - zoom) / (1 - ZOOM)) * fade;
    this.tagA = fade * (tl === "depart" ? clamp01((t - LIFT_START - 0.15) / 0.15)
      : tl === "rebuild" ? 1 - smooth(REBUILD_ZOOM_T0, REBUILD_ZOOM_T0 + 0.3, t) : 0);
    let pw = tl === "idle" || tl === "connect" ? 1 : tl === "depart" ? 1 - smooth(0, ZOOM_T1, t) : smooth(REBUILD - 0.3, REBUILD, t);
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
      if (s.qr) {
        if (tl === "connect") {
          s.qT = clamp01(t / CONNECT);
          s.qLift = red ? 0 : 2.5;
        } else if (tl === "rebuild") {
          s.qT = 1 - clamp01((t - REBUILD_QR_T0) / (REBUILD - REBUILD_QR_T0));
          s.qLift = red ? 0 : 2.5;
        } else if (tl === "depart") {
          s.qT = 1;
        }
        s.on = s.qT < 1;
        s.shA *= 1 - s.qT;
        continue;
      }
      if (tl === "depart") {
        const tau = t - P.start[s.k];
        if (tau <= 0) { s.op = fade; continue; }
        if (red) {
          s.op = 1 - clamp01(tau / 0.5);
          s.on = s.op > 0;
          s.fr = 1;
          s.frA = clamp01(tau / 0.5);
          continue;
        }
        this.liftHost(s, tau);
      } else if (tl === "rebuild") {
        const tau = t - P.rebuildStart[s.j], land = P.rebuildLand;
        if (red) {
          s.op = clamp01(tau / land) * fade;
          s.on = s.op > 0;
          s.fr = 1;
          s.frA = (1 - clamp01(tau / land)) * fade;
          continue;
        }
        // the lift run backwards: the layer descends into its place and its outline clears as it lands
        this.liftHost(s, (PEEL + SHADOW_HANDOVER) * (1 - clamp01(tau / land)));
      }
    }
  }

  /**
   * Host: one layer `tau` seconds into its lift. It never leaves its place: the print swells inside
   * its own box and fades out during the peel, the dashed outline is complete when the print is
   * gone, and a contact shadow, cast from the height the guest's sheet has at this moment, drifts
   * away below it and is handed over to the guest's view of the glass. `rebuild` runs `tau` backwards.
   */
  private liftHost(s: Sheet, tau: number): void {
    if (tau <= 0) return;
    const a = smooth(0, PEEL, tau);
    s.lifted = true;
    s.fr = clamp01((tau - 0.03) / (PEEL - 0.03));
    s.frA = 1;
    s.op = 1 - smooth(0.08, PEEL, tau);
    s.on = tau < PEEL + SHADOW_HANDOVER;
    s.acr = a;
    s.sc = 1 + SWELL * a;
    s.sweep = mix(-1.2, 0.6, tau / PEEL) + 0.3 * this.tiltX;
    const h = HOP * liftCurve(tau);
    s.shA = 0.35 * smooth(0, 0.02, h) * (1 - 0.45 * clamp01(h / 0.8)) * (1 - smooth(PEEL, PEEL + SHADOW_HANDOVER, tau));
    s.shx = 0.1 * h;
    s.shy = -0.14 * h;
    s.shBlur = 0.004 + 0.05 * h;
    s.shSlab = 0.3;
  }

  /** Guest: puts a sheet's top face centre at (x, y, z) of the card frame, turned by `yaw` about its vertical, magnified `S` times. */
  private place(s: Sheet, x: number, y: number, z: number, yaw: number, S: number): void {
    const v = this.fromCard(x, y, z);
    s.wx = v.x; s.wy = v.y; s.wz = v.z;
    s.q.copy(this.fQuat);
    if (yaw !== 0) s.q.multiply(this.q.setFromAxisAngle(Y_AXIS, yaw));
    s.kx = s.ky = S;
    s.cz = z;
    s.shCx = x;
    s.shCy = y;
  }

  /** Guest: the sheet's place in the deck (peel v2's fanned stack, face-on in the screen frame) at spacing `e`; result in this.v. */
  private deckPos(s: Sheet, e: number): Vector3 {
    s.oy = STAIR * this.cardH * s.j * e;
    return this.v.set(this.sPos.x + s.rx, this.sPos.y + (s.ry + s.oy) * this.sScaleY, this.sPos.z + (Z0 + ZGAP * s.j + THICK) * e);
  }

  private setDeck(s: Sheet, e: number): void {
    const v = this.deckPos(s, e);
    s.wx = v.x; s.wy = v.y; s.wz = v.z;
    s.q.identity();
    s.kx = 1;
    s.ky = this.sScaleY;
    s.w = 1;
    s.cz = 0;
  }

  /** Guest: moves a sheet placed in the room the share `w` of the way into the deck. */
  private toDeck(s: Sheet, w: number, e: number): void {
    const v = this.deckPos(s, e);
    s.wx = mix(s.wx, v.x, w); s.wy = mix(s.wy, v.y, w); s.wz = mix(s.wz, v.z, w);
    s.q.slerp(this.q.identity(), w);
    s.kx = mix(s.kx, 1, w);
    s.ky = mix(s.ky, this.sScaleY, w);
    s.w = w;
  }

  /** Guest: contact shadow of a sheet in the deck on the sheet below it (peel v2), weighted by `k`. */
  private deckShadow(s: Sheet, e: number, k: number): void {
    const r = s.recv >= 0 ? this.sheets[s.recv] : null;
    if (!r || !r.on || k <= 0) return;
    const zr = (Z0 + ZGAP * r.j + THICK) * e, h = Math.max(0, (Z0 + ZGAP * s.j + THICK) * e - THICK * s.acr - zr);
    s.shMode = 2;
    s.shZ = zr;
    s.shCx = s.bx + 0.1 * h;
    s.shCy = s.by + s.oy - 0.14 * h;
    s.shW = s.bw;
    s.shH = s.bh;
    s.shBlur = 0.004 + 0.05 * h;
    s.shSlab = 0.3;
    s.shA = 0.35 * s.op * s.acr * smooth(0, 0.02, h) * (1 - 0.45 * clamp01(h / 0.8)) * k;
  }

  private updateGuest(tl: Timeline, t: number, now: number): void {
    const P = this.P, red = this.reduced, dt = this.chromeDt, n = this.flying.length;
    const live = !this.paused && now - this.uT0 < 350;
    const u = (this.u = live ? mix(this.uFrom, this.uTo, easeInOut((now - this.uT0) / 350)) : this.uTo);
    this.poseStill = this.poseMoved ? 0 : this.poseStill + dt;
    this.poseMoved = false;
    // the anchored frame: the tracked pose through the light filter
    if (this.hasPose) {
      this.mat.fromArray(this.pose).decompose(this.rawPos, this.rawQuat, this.v3);
      this.filterPose(dt);
    }
    // the virtual frame: a phone 47 cm away, seen by an eye that drifts from side to side
    const te = tl === "explode" ? t : tl === "fly" ? P.dur.explode + t : P.dur.explode + FLY;
    this.vQuat.setFromEuler(this.euler.set(VIRTUAL_PITCH, red ? 0 : (eyeYaw(te) * Math.PI) / 180, 0, "XYZ"));
    if (!this.everPose) {
      this.aPos.copy(this.vPos);
      this.aQuat.copy(this.vQuat);
    }
    this.fPos.copy(this.aPos).lerp(this.vPos, u);
    this.fQuat.copy(this.aQuat).slerp(this.vQuat, u);

    const zoom = (this.zoom = tl === "explode" ? (red ? (t < 0.5 ? 1 : ZOOM) : zoomAt(t)) : ZOOM);
    this.bgA = 0;
    this.shared.uSnap.value = 0;
    // flyW: how far the whole scene is into the deck; chromeK: chrome opacity; retract: how far guides, columns and the measurement have withdrawn
    let flyW = 0, chromeK = 1, retract = 0;
    if (tl === "fly") {
      this.screenFrame(this.deckZoom, this.deckX, this.deckY);
      flyW = red ? 0 : easeInOut(t / FLY);
      chromeK = 1 - clamp01(t / 0.3);
      retract = red ? clamp01(t / 0.5) : easeOut(t / 0.45);
      this.bgA = red ? clamp01(t / FLY) : smooth(0.3, 1, t / FLY);
    } else if (tl === "assemble") {
      // the deck grows (or, for a small landing rect, shrinks) and moves into the landing rect
      const g = red ? 1 : easeInOut(t / 0.75), fx = this.fitX + this.fitW / 2, fy = this.fitY + this.fitH / 2;
      this.screenFrame(mix(this.deckZoom, 1, g), mix(this.deckX, fx, g), mix(this.deckY, fy, g));
      flyW = 1;
      chromeK = 0;
      retract = 1;
      this.bgA = 1;
      if (t >= ASSEMBLE) this.shared.uSnap.value = 1;
    }

    for (const s of this.sheets) {
      this.reset(s);
      if (s.qr) { s.on = false; continue; }
      const R = s.room, back = R.z < 0, tau = tl === "explode" ? t - P.start[s.k] : 1e3;
      if (tl === "explode") {
        if (tau <= 0) {
          // still a print on the glass: the real phone shows it, the virtual phone needs it drawn
          if (u <= 0) { s.on = false; continue; }
          s.flat = true;
          s.op = u;
          this.place(s, zoom * s.rx, zoom * s.ry, 0.002, 0, zoom);
          s.base = 310 + s.j * 3;
          continue;
        }
        const c = clamp01((tau - TRAVEL_DELAY - TRAVEL) / CHROME);
        if (red) {
          // reduced motion: no travel — the print fades out on the glass, then the sheet fades in at its room pose
          if (tau < 0.25) {
            if (u <= 0) { s.on = false; continue; }
            s.flat = true;
            s.op = u * (1 - tau / 0.25);
            this.place(s, zoom * s.rx, zoom * s.ry, 0.002, 0, zoom);
            s.base = 310 + s.j * 3;
            continue;
          }
          s.g = 1;
          s.acr = 1;
          s.op = clamp01((tau - 0.25) / 0.5);
          this.place(s, R.x, R.y, R.z, R.yaw, R.scale);
          s.chA = c;
          s.fr = s.ms = s.hd = s.lead = s.chipR = s.pillR = c > 0 ? 1 : 0;
          s.guide = c > 0 ? 1 : 0;
        } else {
          // lift (the shared curve, a hop off the glass) and travel (one heavy curve; depth leads, the turn follows)
          const x = (tau - TRAVEL_DELAY) / TRAVEL, g = heavy(x), gz = heavy(Math.pow(clamp01(x), 0.8));
          const acr = smooth(0, PEEL, tau), hop = (back ? -1 : 1) * HOP * liftCurve(tau) * (1 - g);
          s.g = g;
          s.acr = acr;
          s.op = mix(clamp01(tau / 0.08), 1, u);
          this.place(s, mix(zoom * s.rx, R.x, g), mix(zoom * s.ry, R.y, g), mix(0, R.z, gz) + hop + THICK * acr,
            R.yaw * heavy((tau - TRAVEL_DELAY - 0.3) / (TRAVEL - 0.3)), mix(zoom, R.scale, g));
          // a sheet that goes behind the phone unrolls there: a band at the phone's height that opens up and down
          if (back) s.reveal = mix(1 - 0.8 * smooth(0.35, 0.8, tau), 1, heavy((tau - 0.9) / (TRAVEL_DELAY + TRAVEL - 0.9)));
          this.chrome(s, c);
          s.guide = clamp01((tau - TRAVEL_DELAY - TRAVEL + GUIDE_LEAD) / GUIDE);
          if (!back) {
            // the contact shadow on the glass while the sheet hops off it, handed over from the host's screen
            const h = Math.max(0, s.cz - THICK * acr), hand = mix(smooth(PEEL, PEEL + SHADOW_HANDOVER, tau), 1, u);
            s.shMode = 1;
            s.shCx += 0.1 * h;
            s.shCy -= 0.14 * h;
            s.shW = s.bw * s.kx;
            s.shH = s.bh * s.ky;
            s.shBlur = 0.004 + 0.05 * h;
            s.shSlab = 0.3;
            s.shA = 0.35 * s.op * acr * smooth(0, 0.02, h) * (1 - 0.45 * clamp01(h / 0.8)) * hand * (1 - smooth(0.04, 0.3, g));
          }
        }
      } else if (tl === "fly") {
        // from the room, as `explode` left it, into the deck; the sheets that left last go first
        s.g = 1;
        s.acr = 1;
        this.place(s, R.x, R.y, R.z, R.yaw, R.scale);
        const d = n > 1 ? (0.25 * (n - 1 - s.k)) / (n - 1) : 0;
        const w = red ? 0 : easeInOut(clamp01((t - d) / (FLY - 0.25)));
        this.toDeck(s, w, DECK);
        s.guide = 1 - retract;
        s.chA = chromeK;
        s.fr = s.ms = s.hd = s.lead = s.chipR = s.pillR = chromeK > 0 ? 1 : 0;
        if (red) {
          s.op = 1 - clamp01(t / 0.7);
          s.on = s.op > 0;
        }
        this.deckShadow(s, DECK, smooth(0.85, 1, w));
      } else {
        const ta = t - P.assembleStart[s.j];
        let e = 0;
        s.g = 1;
        if (red) {
          s.op = clamp01(ta / 0.4);
          s.on = s.op > 0;
        } else {
          e = DECK * (1 - backOut(ta / P.assembleDrop));
          s.acr = 1 - smooth(0.5, 0.95, t);
        }
        this.setDeck(s, e);
        this.deckShadow(s, e, 1);
      }
      const inRoom = s.g * (1 - s.w);
      s.behind = clamp01(-s.cz / 0.3) * (1 - s.w);
      s.ink = mix(1, WALL_INK, s.behind);
      s.near = 1 - s.w;
      s.thick = THICK * s.acr * mix(1, 2.2, inRoom) * this.tier.rim;
      // where the camera sits, seen from the sheet: drives the specular sweep as the sheet turns and the guest moves
      this.v.set(-s.wx, -s.wy, -s.wz).applyQuaternion(this.qi.copy(s.q).invert()).normalize();
      const view = 1.2 * (this.v.x * 0.8 - this.v.y * 0.6);
      s.sweep = 0.08 * s.j + view + (tl === "explode" ? -1.2 + 1.9 * s.g + 0.05 * Math.max(0, tau - TRAVEL_DELAY - TRAVEL)
        : tl === "fly" ? 0.7 + 0.9 * flyW : 1.2 + 0.6 * t);
    }

    // painter's order: far to near in camera space, the stack order breaking ties; in `assemble` the
    // stack order alone (a sheet that overshoots its landing dips below its neighbour for a moment)
    const ord = this.order, byStack = tl === "assemble" ? 1e3 : 1e-5;
    for (let i = 0; i < n; i++) {
      const s = this.flying[i], key = s.wz + s.j * byStack;
      let p = i - 1;
      while (p >= 0 && this.flying[ord[p]].wz + this.flying[ord[p]].j * byStack > key) { ord[p + 1] = ord[p]; p--; }
      ord[p + 1] = i;
    }
    for (let i = 0; i < n; i++) {
      const s = this.flying[ord[i]];
      if (!s.flat) s.base = (s.behind > 0.5 ? 10 : 400) + i * 10;
    }

    this.phoneA = tl === "assemble" ? 0 : u * (1 - flyW) * (red && tl === "fly" ? 1 - clamp01(t / 0.7) : 1);
    this.shared.uHoleOn.value = tl === "assemble" ? 0 : (1 - u) * (1 - flyW);
    const c = this.carrier;
    if (c && tl !== "assemble") {
      const tc = tl === "explode" ? t - P.start[c.k] : 1e3;
      this.colsGrow = 1.1 * (1 - retract) * (red ? (tc >= TRAVEL_DELAY + TRAVEL ? 1 : 0) : heavy((tc - TRAVEL_DELAY - 0.45 * TRAVEL) / (0.7 * TRAVEL)));
      this.colsA = c.op * (1 - retract) * (red ? clamp01((tc - TRAVEL_DELAY - TRAVEL) / 0.4) : 1);
    } else {
      this.colsGrow = 0;
      this.colsA = 0;
    }
    // the measurement: drawn out from the host phone early in the event, withdrawn in `fly`
    this.measureP = tl === "explode" ? (red ? (t >= MEASURE_T1 ? 1 : 0) : easeInOut((t - MEASURE_T0) / (MEASURE_T1 - MEASURE_T0))) : 1 - retract;
    this.measureA = tl === "explode" ? clamp01((t - MEASURE_T1) / 0.25) : tl === "fly" ? chromeK : 0;
    // The distance between the phones, read from the pose: the length of its translation, in card
    // widths, times CARD_WIDTH_CM. The shown number keeps a dead band so a shaking hand does not flicker it.
    this.cmRaw = this.fPos.length() * CARD_WIDTH_CM;
    if (this.cmShown < 0 || dt <= 0 || Math.abs(this.cmRaw - this.cmShown) > 0.8) this.cmShown = Math.round(this.cmRaw);
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
    if (host) {
      // the card frame: the flat fit, scaled about its own centre by the canvas zoom
      const z = this.fitW * this.zoom, cxp = this.fitX + this.fitW / 2, cyp = this.fitY + this.fitH / 2;
      this.frame.matrix.set(z, 0, 0, cxp, 0, z, 0, this.bh - cyp, 0, 0, z, 0, 0, 0, 0, 1);
      this.colsMesh.visible = this.colsA > 0.003;
      this.colsMat.uniforms.uAlpha.value = this.colsA;
      this.colsMat.uniforms.uLook.value.set(0.3, 0.06, 1);
    }
    let idx = 0;
    for (const s of this.sheets) {
      const acr = s.acr, mesh = s.mesh, u = s.mat.uniforms;
      const sh = s.shadow, su = s.smat?.uniforms, ln = s.lines, lu = s.lmat.uniforms;
      mesh.visible = s.on && s.op > 0;
      if (mesh.visible) {
        u.uOpacity.value = s.op;
        u.uAcr.value = acr;
        u.uSweep.value = s.sweep;
        u.uSweepAmt.value = this.tier.sweep && !this.reduced ? 1 : 0;
        u.uInner.value.set(-0.004 / s.bw, 0.006 / s.bh, this.tier.sweep ? 1 : -1);
        u.uBehind.value = s.behind;
        u.uReveal.value = s.reveal;
        u.uInk.value = s.ink;
        u.uNear.value.set(NEAR0 * s.near, NEAR1 * s.near);
        if (s.next) {
          const m = clamp01((performance.now() - s.mixT0) / 150);
          u.uMix.value = m;
          this.dirty = true;
          if (m >= 1) this.finishSwap(s);
        }
      }
      if (host) {
        // prints keep their stack order while they lift: the layers that go behind the phone leave first,
        // from under the others, and in `rebuild` they land last
        const base = 10 + idx * 3;
        const w = s.bw, h = s.bh, x = s.bx + s.ox, y = s.by + s.oy;
        if (mesh.visible) {
          mesh.matrix.set(w, 0, 0, x, 0, h, 0, y, 0, 0, Math.max(1e-5, THICK * acr), s.z, 0, 0, 0, 1);
          mesh.renderOrder = base + 1;
          u.uBox.value.set(x, y, w, h);
          u.uZoom.value = 1 / s.sc;
          if (s.qr) u.uQrT.value.set(s.qT, (-0.8 * s.qLift * pxc) / s.rw, (-s.qLift * pxc) / s.rh);
        }
        if (sh && su) {
          sh.visible = s.on && s.shA > 0.004;
          if (sh.visible) {
            // the shadow is cast by the sheet at its swollen size
            const sw = s.bw * s.sc, shh = s.bh * s.sc;
            const pad = s.shBlur * 2 + 0.002, gw = sw + 2 * pad, gh = shh + 2 * pad;
            const cx = x + s.shx, cy = y + s.shy;
            sh.matrix.set(gw, 0, 0, cx, 0, gh, 0, cy, 0, 0, 1, s.shZ, 0, 0, 0, 1);
            su.uBox.value.set(cx, cy, gw, gh);
            su.uGrow.value.set(gw / sw, gh / shh);
            su.uRad.value.set(s.shBlur / sw, s.shBlur / shh);
            su.uLod.value = Math.log2(Math.max(1, s.shBlur * this.fitW * 0.9));
            su.uAlpha.value = s.shA;
            su.uSlab.value = s.shSlab * acr;
            // a lifting layer's shadow stays inside the layer's own box (the clip edge is 0.003 soft)
            if (s.lifted) su.uClip.value.set(s.bx - s.bw / 2 + 0.003, s.by - s.bh / 2 + 0.003, s.bx + s.bw / 2 - 0.003, s.by + s.bh / 2 - 0.003);
            else su.uClip.value.set(-1e3, -1e3, 1e3, 1e3);
            sh.renderOrder = base;
          }
        }
        ln.visible = !s.qr && s.frA > 0;
        if (ln.visible) {
          // the outline keeps its width in pixels whatever the zoom
          const inset = ((1 + 8 * s.dupe) * pxc) / this.zoom;
          ln.matrix.set(s.rw - inset, 0, 0, s.rx, 0, s.rh - inset, 0, s.ry, 0, 0, 1, 0, 0, 0, 0, 1);
          lu.uDash.value = 6 * this.sx;
          lu.uProg.value.set(s.fr, 0, 0, 0);
          lu.uAlpha.value.set(s.frA, 0, 0, 0);
          ln.renderOrder = 400 + idx;
        }
      } else {
        if (mesh.visible) {
          // (wx, wy, wz) is the centre of the layer's rect on the top face; the baked box is offset from it
          const p = this.v.set((s.bx - s.rx) * s.kx, (s.by - s.ry) * s.ky, 0).applyQuaternion(s.q);
          mesh.matrix.compose(this.v2.set(s.wx + p.x, s.wy + p.y, s.wz + p.z), s.q, this.v3.set(s.bw * s.kx, s.bh * s.ky, Math.max(1e-5, s.thick)));
          mesh.renderOrder = s.base + 1;
          u.uBox.value.set(s.bx, s.by, s.bw, s.bh);
          u.uZoom.value = 1;
        }
        if (sh && su) {
          sh.visible = s.on && s.shMode > 0 && s.shA > 0.004;
          if (sh.visible) {
            const pad = s.shBlur * 2 + 0.002, gw = s.shW + 2 * pad, gh = s.shH + 2 * pad;
            if (s.shMode === 1) {
              // on the glass of the host phone (card frame)
              sh.matrix.compose(this.v3.copy(this.fromCard(s.shCx, s.shCy, 0.001)), this.fQuat, this.v.set(gw, gh, 1));
              su.uClip.value.set(-0.5, -this.cardH / 2, 0.5, this.cardH / 2);
              sh.renderOrder = 305;
            } else {
              // in the deck, on the sheet below (screen frame)
              const r = this.sheets[s.recv];
              sh.matrix.compose(this.v3.set(this.sPos.x + s.shCx, this.sPos.y + s.shCy * this.sScaleY, this.sPos.z + s.shZ), this.q.identity(), this.v.set(gw, gh * this.sScaleY, 1));
              su.uClip.value.set(r.bx - r.bw / 2, r.by + r.oy - r.bh / 2, r.bx + r.bw / 2, r.by + r.oy + r.bh / 2);
              sh.renderOrder = r.base + 2;
            }
            su.uBox.value.set(s.shCx, s.shCy, gw, gh);
            su.uGrow.value.set(gw / s.shW, gh / s.shH);
            su.uRad.value.set(s.shBlur / s.shW, s.shBlur / s.shH);
            su.uLod.value = Math.log2(Math.max(1, ((s.shBlur * s.bw) / s.shW) * this.fitW * 0.9));
            su.uAlpha.value = s.shA;
            su.uSlab.value = s.shSlab * acr;
          }
        }
        ln.visible = !s.qr && !s.flat && s.chA > 0 && mesh.visible;
        if (ln.visible) {
          const a = s.chA * s.op * this.nearAlpha(s);
          ln.matrix.compose(this.v2.set(s.wx, s.wy, s.wz), s.q, this.v3.set(s.rw * s.kx, s.rh * s.ky, 1));
          lu.uProg.value.set(s.fr, s.ms, s.hd, 0);
          lu.uAlpha.value.set(a, a, a, 0);
          ln.renderOrder = s.base + 3;
        }
      }
      idx++;
    }
    if (host) this.writeTag();
    else this.writeRoom();
  }

  /** Guest: how much of a sheet's chrome is left when the sheet is close to the camera (1 away from it, and in the deck). */
  private nearAlpha(s: Sheet): number {
    return mix(clamp01((-s.wz - NEAR0) / (NEAR1 - NEAR0)), 1, s.w);
  }

  /** Host: where the artboard's tag sits (device px, y down): above the artboard's top-left corner. */
  private tagRect(out: number[]): number[] {
    const e = this.atlas!.entries[this.tagEntry], cx = this.fitX + this.fitW / 2, cy = this.fitY + this.fitH / 2;
    out[0] = cx - (this.fitW * this.zoom) / 2;
    out[1] = cy - (this.fitH * this.zoom) / 2 - (TAG_H + 4) * this.sy;
    out[2] = e.w * this.sx;
    out[3] = e.h * this.sy;
    return out;
  }

  /** Host: one tag above the artboard once layers have begun to leave it. */
  private writeTag(): void {
    if (this.tagA <= 0) { this.finishSprites(0); return; }
    const r = this.tagRect(this.box);
    this.sprite(this.sprites, 0, r[0], r[1], r[2], r[3], this.atlas!.entries[this.tagEntry], this.tagA * 0.9, 1, 1);
    this.finishSprites(1);
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

  /** One dashed rectangle of the virtual phone's screen (card frame); returns the next free line index. */
  private ghostRect(G: LineSet, i: number, cx: number, cy: number, w: number, h: number, a: number): number {
    const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
    setLine(G, i, x0, y1, 0, x1, y1, 0, 1, 0, 0, 1, BLUE, a);
    setLine(G, i + 1, x1, y1, 0, x1, y0, 0, 1, 0, 0, 1, BLUE, a);
    setLine(G, i + 2, x1, y0, 0, x0, y0, 0, 1, 0, 0, 1, BLUE, a);
    setLine(G, i + 3, x0, y0, 0, x0, y1, 0, 1, 0, 0, 1, BLUE, a);
    return i + 4;
  }

  /** One guide: from the point (lx, ly) of the sheet's plane, `E` units along (dx, dy) of that plane; returns the next free index. */
  private guide(G: LineSet, i: number, s: Sheet, lx: number, ly: number, dx: number, dy: number, E: number, a: number): number {
    const ex = this.ex, ey = this.ey;
    const ax = s.wx + ex.x * lx + ey.x * ly, ay = s.wy + ex.y * lx + ey.y * ly, az = s.wz + ex.z * lx + ey.z * ly;
    const bx = ax + (ex.x * dx + ey.x * dy) * E, by = ay + (ex.y * dx + ey.y * dy) * E, bz = az + (ex.z * dx + ey.z * dy) * E;
    // softness grows with the distance from the host phone (the origin of the frame in use)
    const f = this.fPos;
    const sa = clamp01((0.6 * Math.hypot(ax - f.x, ay - f.y, az - f.z)) / FAR), sb = clamp01(Math.hypot(bx - f.x, by - f.y, bz - f.z) / FAR);
    setLine(G, i, ax, ay, az, bx, by, bz, 1, 0, sa, sb, BLUE, a);
    return i + 1;
  }

  /** Guest: everything of the room that is not a sheet — hole, plane of columns, virtual phone, guides, measurement, labels. */
  private writeRoom(): void {
    const tl = this.tl, cw = this.cw, ch = this.ch;
    // the host phone's quad on the guest's screen (device px, y up): the hole of the sheets behind it
    const hole = this.shared.uHole.value, hw = 0.5 + PHONE_PAD, hh = this.cardH / 2 + PHONE_PAD;
    let holeOk = this.shared.uHoleOn.value > 0;
    for (let c = 0; c < 4 && holeOk; c++) {
      const p = this.fromCard(c === 0 || c === 3 ? -hw : hw, c < 2 ? hh : -hh, 0);
      if (p.z > -0.1) { holeOk = false; break; }
      const sp = this.toScreen(p.x, p.y, p.z), X = sp.x * this.sx, Y = this.bh - sp.y * this.sy, v = hole[c >> 1];
      if (c & 1) { v.z = X; v.w = Y; } else { v.x = X; v.y = Y; }
    }
    if (!holeOk) this.shared.uHoleOn.value = 0;

    // the plane of columns: the card's column grid continued floor-to-head on the plane of the grid sheet
    const c = this.carrier, cm = this.colsMesh;
    cm.visible = !!c && this.tier.far && c.on && !c.flat && this.colsA > 0.003 && this.colsGrow > 0.003;
    if (cm.visible && c) {
      const k = c.kx, cu = this.colsMat.uniforms;
      const o = this.v.set(-c.rx * c.kx, -c.ry * c.ky, 0.002).applyQuaternion(c.q);
      cm.matrix.compose(this.v2.set(c.wx + o.x, c.wy + o.y, c.wz + o.z), c.q, this.v3.set(c.kx, c.ky, 1));
      cu.uPlane.value.set(0, -5 / k, 18 / k, 24 / k);
      cu.uFade.value.set(9 / k, 7 / k, 17 / k, FAR / k);
      cu.uMask.value.set(c.rx, c.ry, c.rw, c.rh);
      cu.uLook.value.set(0.34, 0.03, 0);
      cu.uAlpha.value = this.colsA;
      cu.uGrow.value = this.colsGrow;
      cu.uBehind.value = c.behind;
      cu.uNear.value.set(NEAR0, NEAR1);
      cm.renderOrder = c.base + 4;
    }

    // the virtual phone (unanchored): body, screen, and the dashed outlines the host screen would show
    const pa = this.phoneA, pb = this.phoneBody!, ps = this.phoneScreen!, gm = this.ghostMesh!, G = this.ghost!;
    pb.visible = ps.visible = gm.visible = pa > 0.003;
    if (pb.visible) {
      pb.matrix.compose(this.v3.copy(this.fromCard(0, 0, -0.012)), this.fQuat, this.v.set(1 + 2 * PHONE_PAD, this.cardH + 2 * PHONE_PAD, 1));
      ps.matrix.compose(this.fPos, this.fQuat, this.v.set(1, this.cardH, 1));
      (pb.material as ShaderMaterial).uniforms.uAlpha.value = pa;
      (ps.material as ShaderMaterial).uniforms.uAlpha.value = pa;
      const z = this.zoom;
      let gi = this.ghostRect(G, 0, 0, 0, z, z * this.cardH, 0.8 * clamp01((1 - z) / (1 - ZOOM)));
      for (const s of this.flying) gi = this.ghostRect(G, gi, z * s.rx, z * s.ry, z * s.rw, z * s.rh, s.flat || !s.on ? 0 : 0.55 * s.acr);
      gm.matrix.compose(this.v3.copy(this.fromCard(0, 0, 0.004)), this.fQuat, this.v.set(1, 1, 1));
      const gu = this.ghostMat!.uniforms;
      gu.uDash.value = 4 * this.sx;
      gu.uAlpha.value.set(pa, 0, 0, 0);
      for (const at of G.attrs) at.needsUpdate = true;
    }

    // guides: along the top edge of every settled sheet, and up and down from its inner edge
    const Gd = this.guides!, per = this.tier.guides;
    let gn = 0;
    for (const s of this.flying) {
      const a = (this.reduced ? clamp01(s.chA * 1.5) : clamp01(s.guide * 4)) * s.op * (1 - s.w) * this.nearAlpha(s) * 0.85;
      if (!s.on || s.flat || s.guide <= 0 || a <= 0.003) continue;
      const w2 = (s.rw * s.kx) / 2, h2 = (s.rh * s.ky) / 2, E = GUIDE_EXT * s.guide, inner = s.room.side < 0 ? 1 : -1;
      this.ex.set(1, 0, 0).applyQuaternion(s.q);
      this.ey.set(0, 1, 0).applyQuaternion(s.q);
      gn = this.guide(Gd, gn, s, -w2, h2, -1, 0, E, a);
      gn = this.guide(Gd, gn, s, w2, h2, 1, 0, E, a);
      if (per >= 4) {
        gn = this.guide(Gd, gn, s, inner * w2, h2, 0, 1, E, a * 0.6);
        gn = this.guide(Gd, gn, s, inner * w2, -h2, 0, -1, E, a * 0.6);
      }
    }
    this.guideCount = gn;
    Gd.geometry.instanceCount = gn;
    this.guideMesh!.visible = this.guideCount > 0;
    if (gn > 0) for (const at of Gd.attrs) at.needsUpdate = true;

    // the measurement: a red line from the bottom of the host phone to the bottom centre of the guest's frame
    const M = this.measure!, E = this.atlas!.entries, D = this.distRect, DL = this.distLine;
    const pA = this.fromCard(0, -(this.cardH / 2 + PHONE_PAD), 0), p0x = pA.x, p0y = pA.y, p0z = pA.z;
    let mOn = this.measureP > 0 && p0z < -0.2 && tl !== "assemble";
    D[2] = 0;
    if (mOn) {
      const a = this.toScreen(p0x, p0y, p0z), ax = a.x, ay = a.y, bx = cw / 2, by = ch - 12;
      if (ay > by - 30) mOn = false;
      else {
        const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
        setLine(M, 0, ax, ay, 0, bx, by, 0, 1.5, 3, 0, 1, RED, 1);
        setLine(M, 1, ax - nx * 6, ay - ny * 6, 0, ax + nx * 6, ay + ny * 6, 0, 1.5, 3, 0, 0, RED, 1);
        setLine(M, 2, bx - nx * 6, by - ny * 6, 0, bx + nx * 6, by + ny * 6, 0, 1.5, 3, 1, 1, RED, 1);
        // The tape's ticks: every 10 cm along the line in space, from the phone's foot to the point
        // 0.6 units in front of the camera that is seen at (bx, by) — so they spread towards the guest.
        const pe = this.camera.projectionMatrix.elements, zc = 0.6;
        const cxs = (((bx / cw) * 2 - 1) * zc) / pe[0] - p0x, cys = ((1 - (by / ch) * 2) * zc) / pe[5] - p0y, czs = -zc - p0z;
        const len3 = Math.hypot(cxs, cys, czs), every = 10 / CARD_WIDTH_CM;
        let mi = 3;
        for (let d = every, i = 1; d < len3 - 0.4 && mi < 3 + MEASURE_TICKS; d += every, i++) {
          const k = d / len3, tp = this.toScreen(p0x + cxs * k, p0y + cys * k, p0z + czs * k);
          const at = Math.hypot(tp.x - ax, tp.y - ay) / len, half = i % 5 === 0 ? 5 : 3;
          setLine(M, mi++, tp.x - nx * half, tp.y - ny * half, 0, tp.x + nx * half, tp.y + ny * half, 0, 1, 3, at, at, RED, 1);
        }
        M.geometry.instanceCount = mi;
        for (const at of M.attrs) at.needsUpdate = true;
        const mu = this.measureMat!.uniforms;
        mu.uProg.value.set(0, 0, 0, this.measureP);
        mu.uAlpha.value.set(0, 0, 0, this.reduced ? this.measureA : 1);
        DL[0] = ax; DL[1] = ay; DL[2] = bx; DL[3] = by;
        if (this.measureA > 0) {
          // the label is pinned on the line's start, across the phone's foot — the one place on the
          // line that no sheet stands behind — on whole device pixels, inside the canvas
          const cm = Math.min(999, Math.max(0, this.cmShown)), nd = cm >= 100 ? 3 : cm >= 10 ? 2 : 1;
          const W = E[this.segEntry].w + nd * E[this.segEntry + 1].w + E[this.segEntry + 11].w;
          D[0] = Math.round(Math.min(Math.max(ax - W / 2, LABEL_MARGIN), cw - LABEL_MARGIN - W) * this.sx) / this.sx;
          D[1] = Math.round(Math.min(Math.max(ay - PILL_H / 2, LABEL_MARGIN), ch - LABEL_MARGIN - PILL_H) * this.sy) / this.sy;
          D[2] = W;
          D[3] = PILL_H;
        }
      }
    }
    this.measureMesh!.visible = mOn;

    // labels: the visible outline of every sheet, the layout, the easing, then leaders and sprites
    const L = this.labels, S = this.sprites, LD = this.leaders!, pts = this.pts, pts2 = this.pts2;
    let any = false;
    for (const s of this.flying) {
      const o = L[s.slot];
      o.on = s.on && !s.flat && s.chA > 0 && s.op > 0;
      o.n = 0;
      o.area = 0;
      if (!o.on) continue;
      any = true;
      const w2 = (s.rw * s.kx) / 2, h2 = (s.rh * s.ky) / 2;
      this.ex.set(1, 0, 0).applyQuaternion(s.q);
      this.ey.set(0, 1, 0).applyQuaternion(s.q);
      for (let k = 0; k < 4; k++) {
        const lx = k === 0 || k === 3 ? -w2 : w2, ly = k < 2 ? h2 : -h2;
        pts[k * 3] = s.wx + this.ex.x * lx + this.ey.x * ly;
        pts[k * 3 + 1] = s.wy + this.ex.y * lx + this.ey.y * ly;
        pts[k * 3 + 2] = s.wz + this.ex.z * lx + this.ey.z * ly;
      }
      const n3 = clipNear(pts, 4, 0.12, pts2);
      for (let k = 0; k < n3; k++) {
        const p = this.toScreen(pts2[k * 3], pts2[k * 3 + 1], pts2[k * 3 + 2]);
        o.poly[k * 2] = p.x;
        o.poly[k * 2 + 1] = p.y;
      }
      o.n = clipRect(o.poly, n3, LABEL_MARGIN, LABEL_MARGIN, cw - LABEL_MARGIN, ch - LABEL_MARGIN, this.polyTmp);
      o.area = polyArea(o.poly, o.n);
    }
    let ns = 0, li = 0;
    if (any) {
      // the pose rests when it has not changed for LABEL_STILL seconds (the unanchored eye rests only with reduced motion)
      const rest = this.hasPose ? this.poseStill >= LABEL_STILL : this.reduced;
      placeLabels(L, this.flying.length, cw, ch, LABEL_MARGIN, LABEL_MARGIN, D, this.labelPref, this.chromeDt <= 0 || rest);
      // blocks still on their way (or a pose that has only just come to rest): keep drawing
      if (!easeLabels(L, this.flying.length, this.chromeDt, this.reduced, rest, D) || (this.hasPose && !rest)) this.dirty = true;
      for (const s of this.flying) {
        const o = L[s.slot];
        if (!o.shown) continue;
        const a = s.chA * s.op * this.nearAlpha(s) * o.fade, chip = E[s.chip];
        // leader: from the anchor on the sheet's outline to the nearest point of the block, when they are apart
        const nx = Math.min(Math.max(o.ax, o.x), o.x + o.bw), ny = Math.min(Math.max(o.ay, o.y), o.y + o.bh);
        const far = Math.hypot(nx - o.ax, ny - o.ay) > LABEL_MARGIN ? 1 : 0;
        setLine(LD, li++, o.ax, o.ay, 0, nx, ny, 0, 1, 3, 0, 1, BLUE, a * far * (s.lead > 0 ? 1 : 0));
        if (s.chipR > 0) this.sprite(S, ns++, o.x * this.sx, o.y * this.sy, chip.w * this.sx, chip.h * this.sy, chip, a, s.chipR, 1);
        if (s.pill >= 0 && s.pillR > 0) {
          const pill = E[s.pill];
          this.sprite(S, ns++, o.x * this.sx, (o.y + CHIP_H + BLOCK_GAP) * this.sy, pill.w * this.sx, pill.h * this.sy, pill, a, s.pillR, 1);
        }
      }
    } else {
      for (const o of L) o.held = false;
    }
    LD.geometry.instanceCount = li;
    this.leaderMesh!.visible = li > 0;
    if (li > 0) {
      const lu = (this.leaderMesh!.material as ShaderMaterial).uniforms;
      lu.uProg.value.set(1, 1, 1, 1);
      lu.uAlpha.value.set(1, 1, 1, 1);
      for (const at of LD.attrs) at.needsUpdate = true;
    }
    // the distance label: left end, digits, " cm" with the right end, side by side on whole pixels
    if (mOn && D[2] > 0) {
      const cm = Math.min(999, Math.max(0, this.cmShown)), a = this.measureA, y = D[1] * this.sy, h = PILL_H * this.sy;
      let x = D[0] * this.sx, e = E[this.segEntry];
      this.sprite(S, ns++, x, y, e.w * this.sx, h, e, a, 1, 1);
      x += e.w * this.sx;
      for (let div = cm >= 100 ? 100 : cm >= 10 ? 10 : 1; div >= 1; div = div / 10) {
        e = E[this.segEntry + 1 + (Math.floor(cm / div) % 10)];
        this.sprite(S, ns++, x, y, e.w * this.sx, h, e, a, 1, 1);
        x += e.w * this.sx;
      }
      e = E[this.segEntry + 11];
      this.sprite(S, ns++, x, y, e.w * this.sx, h, e, a, 1, 1);
    }
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
    const t0 = __SPILL_TEST__ ? performance.now() : 0;
    if (this.sizeDirty) this.measureCanvas();
    this.emit(t);
    this.dirty = false;
    this.update(now);
    this.render();
    this.lastRender = now;
    if (__SPILL_TEST__) {
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

  handle(): SpillHandle {
    const h: SpillHandle = {
      play: (timeline, o) => this.play(timeline, o?.at),
      setTilt: (x, y) => {
        const cx = Math.max(-1, Math.min(1, x || 0)), cy = Math.max(-1, Math.min(1, y || 0));
        if (cx !== this.tiltX || cy !== this.tiltY) { this.tiltX = cx; this.tiltY = cy; this.dirty = true; }
      },
      setPose: (m) => {
        const had = this.hasPose;
        this.hasPose = !!m && m.length >= 16;
        if (m && this.hasPose) {
          for (let i = 0; i < 16; i++) {
            if (this.pose[i] !== m[i]) this.poseMoved = true;
            this.pose[i] = m[i];
          }
          this.everPose = true;
        }
        if (had !== this.hasPose) {
          this.uFrom = this.u;
          this.uTo = this.hasPose ? 0 : 1;
          this.uT0 = performance.now();
          // a pose that has just appeared is taken as it is
          this.filterOn = false;
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
    if (__SPILL_TEST__ && this.opts.test === true) h.test = makeHooks(this);
    return h;
  }

  private play(tl: Timeline, at?: number): Promise<void> {
    const ok = (this.role === "host" ? HOST_TIMELINES : GUEST_TIMELINES).includes(tl);
    if (!ok) return Promise.reject(new Error(`spill: timeline "${tl}" does not belong to role "${this.role}"`));
    if (this.disposed) return Promise.reject(new Error("spill: disposed"));
    const prev = this.resolve;
    this.resolve = null;
    prev?.();
    this.tl = tl;
    this.t0 = typeof at === "number" && isFinite(at) ? at : performance.now();
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
    if (!s) throw new Error(`spill: no layer "${id}"`);
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
    }
    this.atlasTex?.dispose();
    this.bgMat?.dispose();
    this.spriteMat?.dispose();
    for (const m of this.mats) m.dispose();
    for (const g of this.geos) g.dispose();
    this.scene.clear();
    this.sheets = [];
    this.flying = [];
    this.labels = [];
    this.carrier = null;
    if (this.renderer) {
      this.renderer.renderLists.dispose();
      this.renderer.dispose();
    }
    if (this.usesFont) releaseFont();
    this.usesFont = false;
  }
}

// ---------------------------------------------------------------- test hooks
// Only reachable from a branch guarded by the build-time constant __SPILL_TEST__, so the whole
// function is dropped from dist/spill.js.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeHooks(x: any): TestHooks {
  const show = (timeline: Timeline, t: number, dt: number): void => {
    x.tl = timeline;
    x.t = timeline === "idle" ? Math.max(0, t) : Math.max(0, Math.min(x.P.dur[timeline], t));
    x.prevT = x.t;
    x.done = true;
    if (x.sizeDirty) x.measureCanvas();
    x.dirty = false;
    x.chromeDt = dt;
    x.update(performance.now());
    x.render();
  };
  return {
    seek: (timeline, t) => {
      x.t0 = performance.now() - t * 1000;
      // a seek starts from nothing: chrome history, the shown distance and the pose filter are cleared,
      // so the same seek gives the same pixels
      for (const o of x.labels) o.held = false;
      x.cmShown = -1;
      x.filterOn = false;
      show(timeline, t, 0);
    },
    step: (timeline, t, dt) => show(timeline, t, dt),
    setPaused: (p) => { x.paused = p; x.uT0 = -1e9; },
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
    state: () => {
      const ex = new Vector3(), ey = new Vector3();
      return {
        role: x.role, timeline: x.tl, t: x.t, u: x.u, bgA: x.bgA, textPx: TEXT_PX, sweepOn: x.tier.sweep && !x.reduced,
        start: Array.from(x.P.start), order: Array.from(x.P.order), rebuildStart: Array.from(x.P.rebuildStart), rebuildLand: x.P.rebuildLand,
        settled: x.P.settled, tagText: HOST_TAG, zoom: x.zoom, cardH: x.cardH,
        cols: { ...x.cols, found: x.colsFound, alpha: x.colsA, grow: x.colsGrow, visible: x.colsMesh.visible },
        tag: x.role === "host" ? { alpha: x.tagA, rect: x.tagRect([0, 0, 0, 0]) } : null,
        deck: { zoom: x.deckZoom, x: x.deckX / x.sx, y: x.deckY / x.sy }, projection: Array.from(x.camera.projectionMatrix.elements),
        frame: { pos: x.fPos.toArray(), quat: x.fQuat.toArray() },
        phone: { alpha: x.phoneA, holeOn: x.shared.uHoleOn.value },
        distance: { cm: x.cmShown, raw: x.cmRaw, rect: Array.from(x.distRect), line: Array.from(x.distLine), progress: x.measureP, alpha: x.measureA, visible: !!x.measureMesh?.visible },
        guides: x.guides ? Array.from({ length: x.guideCount }, (_, i) => [
          x.guides.a[i * 3], x.guides.a[i * 3 + 1], x.guides.a[i * 3 + 2], x.guides.b[i * 3], x.guides.b[i * 3 + 1], x.guides.b[i * 3 + 2], x.guides.c[i * 4 + 3],
        ]) : [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sheets: x.sheets.map((s: any) => {
          // corners of the layer's rect in camera space: top-left, top-right, bottom-right, bottom-left
          const corners: number[] = [];
          if (x.role === "guest" && !s.qr) {
            ex.set(1, 0, 0).applyQuaternion(s.q);
            ey.set(0, 1, 0).applyQuaternion(s.q);
            for (let k = 0; k < 4; k++) {
              const lx = ((k === 0 || k === 3 ? -1 : 1) * s.rw * s.kx) / 2, ly = ((k < 2 ? 1 : -1) * s.rh * s.ky) / 2;
              corners.push(s.wx + ex.x * lx + ey.x * ly, s.wy + ex.y * lx + ey.y * ly, s.wz + ex.z * lx + ey.z * ly);
            }
          }
          return {
            id: s.spec.id, qr: s.qr, j: s.j, k: s.k, on: s.on, op: s.op, x: s.bx + s.ox, y: s.by + s.oy, z: s.z, ox: s.ox, oy: s.oy,
            sc: s.sc, acr: s.acr, w: s.bw, h: s.bh, qT: s.qT, shA: s.shA, fr: s.fr, frA: s.frA, chA: s.chA,
            chipR: s.chipR, pillR: s.pillR, lead: s.lead, rect: [s.rx, s.ry, s.rw, s.rh],
            room: s.qr ? null : { kind: s.room.kind, x: s.room.x, y: s.room.y, z: s.room.z, yaw: s.room.yaw, scale: s.room.scale, side: s.room.side },
            g: s.g, deck: s.w, cz: s.cz, behind: s.behind, reveal: s.reveal, ink: s.ink, flat: s.flat, guide: s.guide, sweep: s.sweep,
            scale: [s.kx, s.ky], centre: [s.wx, s.wy, s.wz], quat: s.q.toArray(), corners, order: s.base,
          };
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        labels: x.flying.map((s: any) => {
          const o = x.labels[s.slot];
          return { id: s.spec.id, shown: o.shown && o.on, alpha: o.fade, x: o.x, y: o.y, w: o.bw, h: o.bh, tx: o.tx, ty: o.ty, ax: o.ax, ay: o.ay, area: o.area, points: o.n };
        }),
      };
    },
  };
}

function parseColor(css: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(css.trim());
  if (!m) return [0, 0, 0];
  let h = m[1];
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const v = parseInt(h, 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}
