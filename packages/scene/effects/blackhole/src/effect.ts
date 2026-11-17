// The effect: one renderer, one scene graph, two roles. Everything is placed in card space (card 1
// wide, +Z out of the host screen, the glass at z = 0, the well behind it). The host draws what is
// at or behind the glass through an off-axis frustum from an eye; the guest draws what is in front,
// in the pose it is given, or both sides when it has no pose, and the level in its own screen.
// `update*()` turns (timeline, t, inputs) into per-layer state; `apply()` pushes that state into
// matrices and uniforms. Nothing is allocated per frame.
import {
  Camera, CanvasTexture, DataTexture, Euler, Group, LinearFilter, LinearMipmapLinearFilter, Matrix4, Mesh, Quaternion, RepeatWrapping,
  Scene, Texture, Vector3, WebGLRenderer, type BufferGeometry, type ShaderMaterial,
} from "three";
import type {
  Handle, LayerEvent, LayerManifest, LayerSpec, MountOptions, Quality, Rect, Role, Timeline,
} from "../../../types";
import {
  acquireFont, bakeLayer, buildAtlas, ctx2d, detectQrGrid, loadImage, makeCanvas, releaseFont, resolveUrl,
  BLOCK_GAP, CHIP_H, PILL_H, TAG_H, TEXT_PX, type AnyCanvas, type Atlas, type AtlasItem, type QrGrid,
} from "./assets";
import {
  bgMaterial, lineMaterial, lineSet, makeLiquidShared, makeShared, planeGeometry, setLine, shadowMaterial, sheetMaterial,
  slabGeometry, spriteMaterial, spriteSet, BLUE, RIPPLES, type LineSet, type LiquidShared, type Shared, type SpriteSet,
} from "./gl";
import { layoutRibbonLabels, makeLabel, type RibbonLabel } from "./labels";
import { liquidMaterial } from "./liquid";
import {
  arrived, clamp01, clock, easeInOut, level, mix, pathS, plan, rebuildClock, rebuildStrength, ringAlpha, ringRadius, shares, smooth,
  strength, swirl, ASSEMBLE, BREATH, CONNECT, EVENT, FLY, GUEST_TIMELINES, HOST_TIMELINES, NECK, RB_FLAT, RB_QR,
  RB_UNSPOOL, REBUILD, REDUCED_FADE, RING_R, SINK_DEPTH, STUB, STUB_T, TRAVEL, type Plan,
} from "./schedule";
import {
  makePath, makeWellShared, pathPoint, polarColours, ringGeometry, ringMaterial, setStub, stripGeometry, stripMaterial, SINK_W,
  type RibbonPath, type WellShared,
} from "./strip";

/** Host: the words left beside every outline; they name where the layer went (16 characters at most). */
export const HOST_TAG = "Pulled to guest";
// the unanchored guest: a small virtual host phone near the top, seen a little from above, from an eye that
// swings DRIFT either way once over the event and is back at rest when the event ends
const VIRTUAL_SHARE = 0.38;
const VIRTUAL_TOP = 0.27;
const VIRTUAL_PITCH = (8 * Math.PI) / 180;
const DRIFT = (10 * Math.PI) / 180;
// the host's eye without a viewer: this far in front of the centre, swung by tilt up to EYE_TILT
const EYE_DIST = 6;
const EYE_TILT = (25 * Math.PI) / 180;
/** A switch between a viewer and none is blended over this many milliseconds. */
const VIEWER_BLEND = 300;
const MARGIN = 0.04;
/** Width of a ribbon in the air as a share of its layer's shorter side, and its limits (card widths). */
const RIBBON_SHARE = 0.6;
const RIBBON_MIN = 0.07;
const RIBBON_MAX = 0.3;
/** Where a ribbon ends: this far in front of the guest's camera (card widths), just below the bottom edge of its screen. */
const END_DIST = 1.3;
/** The surface: wobble and ripple amplitude and the wobble's wavelength, CSS px. */
const WOBBLE = 3.2;
const RIPPLE = 5;
const WAVE = 150;
/** A floating layer: how far off its place it drifts and how much it bobs (CSS px), and how far it turns (radians). */
const FLOAT_X = 11;
const FLOAT_Y = 13;
const BOB = 2.6;
const FLOAT_ROT = 0.018;
/** The queue of floating layers under the surface, CSS px: the first one's depth, the most the whole queue may take, the height under which a layer keeps the next one clear of itself, and the most room one layer keeps. */
const FLOAT_TOP = 5;
const FLOAT_ROOM = 220;
const FLOAT_SMALL = 200;
const FLOAT_GAP = 140;
/** The room a floating layer of this height (CSS px) keeps under itself: most of its own box for a small layer (a line or two of text), nothing for a large one (an image the lines may lie on). */
const floatGap = (h: number): number => (h < FLOAT_SMALL ? Math.min(FLOAT_GAP, Math.max(6, 0.9 * h)) : 0);

interface Tier { dpr: number; tex: number; taps: number; aniso: number; mem: number; seg: number; ripples: boolean }
const TIERS: Record<Quality, Tier> = {
  high: { dpr: 2, tex: 2048, taps: 5, aniso: 8, mem: 64, seg: 1, ripples: true },
  mid: { dpr: 1.5, tex: 1536, taps: 1, aniso: 4, mem: 40, seg: 0.7, ripples: true },
  low: { dpr: 1, tex: 1024, taps: 0, aniso: 2, mem: 24, seg: 0.5, ripples: false },
  test: { dpr: 1, tex: 2048, taps: 5, aniso: 8, mem: 64, seg: 1, ripples: true },
};

interface Sheet {
  i: number; spec: LayerSpec; qr: boolean;
  /** stack index among flying layers (0 = bottom), -1 for a QR layer */
  j: number;
  /** leave order (0 = top layer), -1 for a QR layer */
  k: number;
  zn: number; dupe: number; chip: number; pill: number;
  img: HTMLImageElement; tex: Texture; next: Texture | null; mixT0: number; grid: QrGrid | null;
  // card units: baked box and exact rect (centre, size)
  bx: number; by: number; bw: number; bh: number; rx: number; ry: number; rw: number; rh: number;
  // the flat sheet (host: the exact frames; guest: the layer floating in the level) and its parallax shadow
  mesh: Mesh; mat: ShaderMaterial; shadow: Mesh | null; smat: ShaderMaterial | null;
  // the strip: the layer from its place on the card through the sink to the guest's screen
  strip: Mesh | null; stripMat: ShaderMaterial | null; path: RibbonPath; wid: number; slot: number; label: RibbonLabel | null;
  /** unit vectors of the strip's longer side (head -> tail) and shorter side, and whether the longer side is the vertical one */
  lx: number; ly: number; sx: number; sy: number; vert: boolean;
  // the outline the layer leaves on the glass
  lines: Mesh; lmat: ShaderMaterial; lset: LineSet;
  // per-frame state
  on: boolean; op: number; ox: number; oy: number; sc: number; rot: number; rev: number; sub: number;
  qT: number; qLift: number;
  /** guest: how far under the surface this layer rides while its place is still above it, device px */
  fm: number;
  shA: number; shx: number; shy: number; shBlur: number;
  /** the strip: drawn, opacity, the layer's clock, and where its rows are (shares: host, air, level) */
  stripOn: boolean; stripOp: number; tau: number; host: number; air: number; lvl: number;
  /** outline: how much of it is traced and its opacity; the tag's opacity; the rim of light at the cut */
  rs: number; rsA: number; tag: number; cut: number;
}

export interface TestHooks {
  seek(timeline: Timeline, t: number): void;
  /** Like seek, but `dt` seconds after the previous frame and with the label history kept (label easing). */
  step(timeline: Timeline, t: number, dt: number): void;
  setPaused(paused: boolean): void;
  /** Strips and the ring draw the material coordinate (red), the path fraction (green) and the ribbon-ness (blue) instead of the print. */
  setProbe(on: boolean): void;
  /** Draw only one layer (by id), one kind of thing ("ring", "strips", "level", "labels", "outlines", "phone"), or one kind of one layer ("strips:name", "level:name"); null draws everything. */
  setOnly(what: string | null): void;
  frames(): number;
  /** Wait for the GPU after every frame so the recorded frame cost includes its work. */
  setFinish(on: boolean): void;
  state(): unknown;
  stats(): unknown;
  fakePose(yawDeg: number, pitchDeg: number, distance: number, rollDeg?: number, x?: number, y?: number): Float32Array;
}
export type BlackholeHandle = Handle & { test?: TestHooks };

export async function mountEffect(canvas: HTMLCanvasElement, opts: MountOptions): Promise<BlackholeHandle> {
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
  /** card space */
  private readonly frame = new Group();
  /** guest: the landing, face-on in the screen (the level's layers live here) */
  private readonly land = new Group();
  private readonly shared: Shared = makeShared();
  private readonly ws: WellShared = makeWellShared();
  private readonly lq: LiquidShared = makeLiquidShared();
  /** guest: its flat sheets are in the screen, not on the card, so the glass does not cut them */
  private readonly noGlass = { value: 2 };
  private sheets: Sheet[] = [];
  private flying: Sheet[] = [];
  private labels: RibbonLabel[] = [];
  /** seconds since the previous frame, for the label history */
  private chromeDt = 0;
  private labelsHeld = false;
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
  private scratch: AnyCanvas | null = null;
  private over: AnyCanvas | null = null;
  private geos: BufferGeometry[] = [];
  private usesFont = false;

  // canvas metrics
  private cw = 1; private ch = 1; private bw = 1; private bh = 1; private sx = 1; private sy = 1;
  private fitX = 0; private fitY = 0; private fitW = 1; private fitH = 1;
  private scrX = 0; private scrY = 0; private scrW = 1; private scrH = 1;
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

  // the well
  /** strength, swirl; the ring's radius (share of full) and opacity */
  private wellA = 0; private wellSw = 0; private ringR = 0; private ringA = 0;
  private ring: Mesh | null = null;
  private ringMat: ShaderMaterial | null = null;
  private polar: DataTexture | null = null;
  /** host: the rim of light across each ribbon where the glass cuts it (no viewer) */
  private cuts: LineSet | null = null;
  private cutMesh: Mesh | null = null;
  /** the eye this frame is drawn for (card space); host: the viewer last given, and the blend between tilt eye (0) and viewer (1) */
  private readonly eye = new Vector3(0, 0, EYE_DIST);
  private readonly viewer = new Vector3(0, 0, EYE_DIST);
  private hasViewer = false;
  private w = 0; private wFrom = 0; private wTo = 0; private wT0 = -1e9;
  /** host: this frame is drawn through the eye (depart, rebuild) rather than flat */
  private persp = false;
  /** guest alone: the card of the virtual phone (a sheet in the card background) and the hairline around it; their opacity */
  private backing: Mesh | null = null;
  private backMat: ShaderMaterial | null = null;
  private backTex: Texture | null = null;
  private rim: Mesh | null = null;
  private phoneA = 0;
  // the level (guest)
  private liquid: Mesh | null = null;
  private liquidMat: ShaderMaterial | null = null;
  private meniscus: Mesh | null = null;
  private meniscusMat: ShaderMaterial | null = null;
  /** the level as a share of the canvas height, the wobble's amplitude in CSS px, the meniscus' opacity; the event's clock */
  private lv = 0; private amp = 0; private lineA = 0; private te = 0;
  /** guest: nothing is drawn before the first play */
  private started = false;
  /** test: probe colours, and what alone is drawn */
  private probe = false;
  private only: string | null = null;
  private readonly euler = new Euler();
  private u = 1;

  // scratch
  private readonly v = new Vector3(); private readonly v2 = new Vector3(); private readonly v3 = new Vector3();
  private readonly q = new Quaternion(); private readonly qi = new Quaternion();
  private readonly mat = new Matrix4();
  private readonly box = [0, 0, 0, 0];
  private readonly sh3 = [0, 0, 0];
  /** Guest: the layers in the order they queue under the surface (highest on the card first); built on first use. */
  private readonly floatOrder: Sheet[] = [];

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
    const test = __BLACKHOLE_TEST__ && this.opts.test === true;
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
    const n = this.P.n, card = this.m.card, bgc = parseColor(card.background);
    let j = 0;
    const items: AtlasItem[] = [];
    sorted.forEach((l, idx) => {
      const qr = l.spec.role === "qr";
      const tex = new Texture();
      const mat = sheetMaterial(this.shared, tex, qr, this.lq, host ? undefined : this.noGlass);
      const mesh = new Mesh(slab, mat);
      const taps = host ? this.tier.taps : 0;
      const smat = taps > 0 ? shadowMaterial(this.shared, tex, taps) : null;
      const shadow = smat ? new Mesh(plane, smat) : null;
      const lset = lineSet(4);
      const lmat = lineMaterial(this.shared, false);
      const lines = new Mesh(lset.geometry, lmat);
      this.geos.push(lset.geometry);
      outline(lset, 1.25, 0.9);
      for (const at of lset.attrs) at.needsUpdate = true;
      const r = l.spec.rect, k = qr ? -1 : n - 1 - j;
      const s: Sheet = {
        i: l.i, spec: l.spec, qr, j: qr ? -1 : j, k,
        zn: zTop > 0 ? Math.min(1, l.spec.z / zTop) : 0, dupe: 0, chip: -1, pill: -1,
        img: imgs[idx], tex, next: null, mixT0: 0, grid: qr ? detectQrGrid(imgs[idx], this.canvas) : null,
        bx: 0, by: 0, bw: 1, bh: 1, rx: 0, ry: 0, rw: 1, rh: 1,
        mesh, mat, shadow, smat,
        strip: null, stripMat: null, path: makePath(), slot: 0, label: null,
        wid: Math.min(RIBBON_MAX, Math.max(RIBBON_MIN, (RIBBON_SHARE * Math.min(r.w, r.h)) / card.w)),
        lx: 0, ly: -1, sx: 1, sy: 0, vert: true,
        lines, lmat, lset,
        on: true, op: 1, ox: 0, oy: 0, sc: 1, rot: 0, rev: 1, sub: 0, qT: 0, qLift: 0, fm: 0,
        shA: 0, shx: 0, shy: 0, shBlur: 0,
        stripOn: false, stripOp: 1, tau: -1e3, host: 1, air: 0, lvl: 0,
        rs: 0, rsA: 0, tag: 0, cut: 0,
      };
      if (!qr) {
        // rows across the shorter side, about 0.016 card widths apart along the longer side; fewer on lower tiers
        const long = Math.max(r.w, r.h) / card.w, short = Math.min(r.w, r.h) / card.w, seg = this.tier.seg;
        const rows = Math.round(Math.min(144, Math.max(40, long / 0.016)) * seg), cols = Math.round(Math.min(36, Math.max(4, short / 0.03)) * seg);
        const sg = stripGeometry(rows, Math.max(2, cols));
        this.geos.push(sg);
        s.stripMat = stripMaterial(this.shared, this.ws, tex);
        s.stripMat.uniforms.uBg.value.set(bgc[0], bgc[1], bgc[2]);
        s.stripMat.uniforms.uDu.value = 0.5 / rows;
        s.stripMat.uniforms.uTwist.value.set(1, 0.1, 0.37 * k);
        s.strip = new Mesh(sg, s.stripMat);
        // ribbons enter the guest's screen side by side: slots spread by the golden ratio, the top layer in the middle
        const g = (0.5 + k * 0.381966) % 1;
        s.slot = Math.max(-0.9, Math.min(0.9, g * 2 - 1));
        for (const f of this.flying) {
          const q = f.spec.rect;
          if (Math.abs(r.x - q.x) < 1 && Math.abs(r.y - q.y) < 1 && Math.abs(r.w - q.w) < 1 && Math.abs(r.h - q.h) < 1) s.dupe++;
        }
        s.chip = items.length;
        items.push({ text: l.spec.label ?? l.spec.name, kind: "chip" });
        if (l.spec.dims) {
          s.pill = items.length;
          items.push({ text: l.spec.dims, kind: "pill" });
        }
        if (!host) {
          s.label = makeLabel(k % 2 === 0 ? 1 : -1);
          this.labels.push(s.label);
        }
        this.flying.push(s);
        j++;
      }
      // the guest's flat sheets are in the landing; everything else is in card space
      const flatTo = host ? this.frame : this.land;
      for (const o of [mesh, shadow]) {
        if (!o) continue;
        o.matrixAutoUpdate = false;
        o.frustumCulled = false;
        flatTo.add(o);
      }
      for (const o of [s.strip, lines]) {
        if (!o) continue;
        o.matrixAutoUpdate = false;
        o.frustumCulled = false;
        this.frame.add(o);
      }
      this.sheets.push(s);
    });
    if (host) {
      this.tagEntry = items.length;
      items.push({ text: HOST_TAG, kind: "tag" });
    }
    this.atlasItems = items;

    this.bgMat = bgMaterial(this.shared);
    this.bgMat.uniforms.uColor.value.set(bgc[0], bgc[1], bgc[2]);
    this.bg = new Mesh(full, this.bgMat);
    this.bg.frustumCulled = false;
    this.bg.renderOrder = 0;
    this.scene.add(this.bg);

    this.frame.matrixAutoUpdate = false;
    this.land.matrixAutoUpdate = false;
    this.scene.add(this.frame, this.land);

    // the lensing ring: the card's own colours, read once from a small composite of the layers
    this.polar = this.buildPolar(bgc);
    const rg = ringGeometry(96);
    this.geos.push(rg);
    this.ringMat = ringMaterial(this.shared, this.ws, this.polar);
    this.ring = new Mesh(rg, this.ringMat);
    this.ring.matrixAutoUpdate = false;
    this.ring.frustumCulled = false;
    this.ring.renderOrder = 150;
    this.frame.add(this.ring);

    if (host) {
      this.cuts = lineSet(Math.max(1, n));
      this.geos.push(this.cuts.geometry);
      this.cutMesh = new Mesh(this.cuts.geometry, lineMaterial(this.shared, false));
      this.cutMesh.matrixAutoUpdate = false;
      this.cutMesh.frustumCulled = false;
      this.cutMesh.renderOrder = 160;
      this.frame.add(this.cutMesh);
    } else {
      // the guest alone draws the host phone itself: its card (a sheet in the card background) and a hairline around it
      const bc = makeCanvas(2, 2, this.canvas), bx = ctx2d(bc);
      bx.fillStyle = card.background;
      bx.fillRect(0, 0, 2, 2);
      this.backTex = new CanvasTexture(bc as HTMLCanvasElement);
      this.backMat = sheetMaterial(this.shared, this.backTex, false, this.lq);
      this.backing = new Mesh(plane, this.backMat);
      this.backing.matrixAutoUpdate = false;
      this.backing.frustumCulled = false;
      this.backing.renderOrder = 1;
      this.backing.matrix.set(1, 0, 0, 0, 0, this.cardH, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
      this.backMat.uniforms.uLocal.value.copy(this.backing.matrix);
      this.backMat.uniforms.uBox.value.set(0, 0, 1, this.cardH);
      this.frame.add(this.backing);
      const rs = lineSet(4);
      this.geos.push(rs.geometry);
      outline(rs, 1, 1, RIM_WHITE);
      for (const at of rs.attrs) at.needsUpdate = true;
      this.rim = new Mesh(rs.geometry, lineMaterial(this.shared, false));
      this.rim.matrixAutoUpdate = false;
      this.rim.frustumCulled = false;
      this.rim.renderOrder = 2;
      this.rim.matrix.set(1, 0, 0, 0, 0, this.cardH, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
      (this.rim.material as ShaderMaterial).uniforms.uLocal.value.copy(this.rim.matrix);
      this.frame.add(this.rim);
      // the level: its body under the floating layers, its meniscus over them
      this.liquidMat = liquidMaterial(this.lq, this.shared.uPr, false);
      this.liquidMat.uniforms.uColor.value.set(bgc[0], bgc[1], bgc[2]);
      this.liquid = new Mesh(full, this.liquidMat);
      this.liquid.frustumCulled = false;
      this.liquid.renderOrder = 800;
      this.meniscusMat = liquidMaterial(this.lq, this.shared.uPr, true);
      this.meniscus = new Mesh(full, this.meniscusMat);
      this.meniscus.frustumCulled = false;
      this.meniscus.renderOrder = 890;
      this.scene.add(this.liquid, this.meniscus);
    }

    this.sprites = spriteSet(Math.max(1, n * 2));
    this.geos.push(this.sprites.geometry);
    this.atlasTex = new Texture();
    this.spriteMat = spriteMaterial(this.shared, this.atlasTex);
    this.spriteMesh = new Mesh(this.sprites.geometry, this.spriteMat);
    this.spriteMesh.frustumCulled = false;
    this.spriteMesh.renderOrder = host ? 500 : 901;
    this.scene.add(this.spriteMesh);

    if (!host) {
      this.leaders = lineSet(Math.max(1, n));
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

  /** The ring's colours: 256 directions about the card's centre, read from a composite of the flying layers 96 px wide. */
  private buildPolar(bg: readonly number[]): DataTexture {
    const card = this.m.card, w = 96, h = Math.max(2, Math.round((96 * card.h) / card.w)), k = w / card.w;
    const c = makeCanvas(w, h, this.canvas), x = ctx2d(c, true);
    x.fillStyle = card.background;
    x.fillRect(0, 0, w, h);
    x.imageSmoothingEnabled = true;
    x.imageSmoothingQuality = "high";
    for (const s of this.flying) x.drawImage(s.img, s.spec.rect.x * k, s.spec.rect.y * k, s.spec.rect.w * k, s.spec.rect.h * k);
    const t = new DataTexture(polarColours(x.getImageData(0, 0, w, h).data, w, h, bg, 256), 256, 1);
    t.wrapS = RepeatWrapping;
    t.minFilter = t.magFilter = LinearFilter;
    t.needsUpdate = true;
    c.width = c.height = 1;
    return t;
  }

  /**
   * Links every program and uploads every texture while mounting: one frame with everything visible,
   * clipped to a single pixel. Without it the first strip, outline or label would stall its frame.
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

  private buildEvents(): void {
    const P = this.P, ev = this.events;
    for (const tl of [...HOST_TIMELINES, ...GUEST_TIMELINES]) ev[tl] = [];
    for (const s of this.flying) {
      const e = (phase: LayerEvent["phase"]): LayerEvent => ({ index: s.i, id: s.spec.id, phase });
      // a layer leaves the host and lifts on the guest when its first row crosses the glass;
      // it settles when its last row is in the level (the last layer's rows are still arriving when the event ends)
      const cross = P.start[s.k] + NECK + STUB_T;
      ev.depart.push({ t: cross, e: e("leave") });
      ev.explode.push({ t: cross, e: e("lift") }, { t: Math.min(EVENT, P.start[s.k] + NECK + P.feed[s.k] + TRAVEL), e: e("settle") });
      ev.assemble.push({ t: P.assembleLock[s.j], e: e("arrive") });
      ev.rebuild.push({ t: P.rebuildStart[s.j] + RB_UNSPOOL, e: e("arrive") });
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

    // the ring's colour strip and the guest's 2 x 2 card sheet
    this.texBytes = 256 * 4 + 16;
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
      this.placeStrip(s);
    }
    this.scratch.width = this.scratch.height = 1;
    this.scratch = null;
    if (this.over) this.over.width = this.over.height = 1;
    this.over = null;

    const blockMax = Math.min(176, this.cw * 0.42);
    this.atlas = buildAtlas(this.atlasItems, this.sx, blockMax, this.canvas);
    this.labelsHeld = false;
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
      if (!s.label) continue;
      const e = this.atlas.entries;
      s.label.bw = Math.max(e[s.chip].w, s.pill >= 0 ? e[s.pill].w : 0);
      s.label.bh = CHIP_H + (s.pill >= 0 ? BLOCK_GAP + PILL_H : 0);
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

  /**
   * The strip's place on the card: the baked box, rows across its shorter side. The head is the end of
   * the longer side nearer the sink (the card's centre); a centred layer leads with its top or right end.
   */
  private placeStrip(s: Sheet): void {
    if (!s.stripMat) return;
    const u = s.stripMat.uniforms;
    s.vert = s.bh >= s.bw;
    if (s.vert) { s.lx = 0; s.ly = s.by <= 0 ? -1 : 1; s.sx = 1; s.sy = 0; }
    else { s.lx = s.bx <= 0 ? -1 : 1; s.ly = 0; s.sx = 0; s.sy = 1; }
    u.uBox.value.set(s.bx, s.by, s.bw, s.bh);
    u.uLong.value.set(s.lx, s.ly);
    u.uShort.value.set(s.sx, s.sy);
    u.uLen.value.set(s.vert ? s.bh : s.bw, s.vert ? s.bw : s.bh);
    u.uHand.value = -s.ly * s.sx + s.lx * s.sy >= 0 ? 1 : -1;
    u.uWidth.value = s.wid;
    u.uFeed.value = this.P.feed[s.k];
  }

  /** Host, flat (idle, connect, the last frames of rebuild): orthographic, the frame maps card units to device pixels. */
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
   * (the window), so the screen shows what a real well behind it would show that eye. The frame
   * becomes card space seen from the eye.
   */
  private hostWindow(): void {
    const E = this.eye, H = this.cardH, n = E.z * 0.25, k = n / E.z;
    const m = this.camera.projectionMatrix.makePerspective((-0.5 - E.x) * k, (0.5 - E.x) * k, (H / 2 - E.y) * k, (-H / 2 - E.y) * k, n, E.z + 4);
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
    if (s.stripMat) s.stripMat.uniforms.map.value = tex;
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

  /** Projects a card-space point through `pos`/`quat` to CSS px; result in this.v (x, y; z > 0 when it is behind the camera). */
  private project(x: number, y: number, z: number, pos: Vector3, quat: Quaternion): Vector3 {
    const v = this.v.set(x, y, z).applyQuaternion(quat).add(pos);
    const behind = v.z > -1e-3;
    v.applyMatrix4(this.camera.projectionMatrix);
    v.x = (v.x * 0.5 + 0.5) * this.cw;
    v.y = (0.5 - v.y * 0.5) * this.ch;
    v.z = behind ? 1 : -1;
    return v;
  }

  /** The unanchored pose: the virtual host phone VIRTUAL_SHARE of the canvas tall, its centre VIRTUAL_TOP from the top. */
  private solveVirtual(): void {
    if (this.role !== "guest") return;
    const p11 = this.camera.projectionMatrix.elements[5];
    const d = (this.cardH * p11) / (2 * VIRTUAL_SHARE);
    this.vPos.set(0, ((1 - 2 * VIRTUAL_TOP) * d) / p11, -d);
    this.vQuat.setFromEuler(this.euler.set(VIRTUAL_PITCH, this.reduced ? 0 : -DRIFT, 0, "XYZ"));
    if (!this.everPose) {
      this.aPos.copy(this.vPos);
      this.aQuat.copy(this.vQuat);
    }
  }

  // ---------------------------------------------------------------- per-frame state

  private reset(s: Sheet): void {
    s.on = true; s.op = 1; s.ox = 0; s.oy = 0; s.sc = 1; s.rot = 0; s.rev = 1; s.sub = 0; s.qT = 0; s.qLift = 0;
    s.shA = 0; s.shx = 0; s.shy = 0; s.shBlur = 0;
    s.stripOn = false; s.stripOp = 1; s.tau = -1e3; s.host = 1; s.air = 0; s.lvl = 0;
    s.rs = 0; s.rsA = 0; s.tag = 0; s.cut = 0;
  }

  private update(now: number): void {
    if (this.role === "host") this.updateHost(this.tl, this.t, now);
    else this.updateGuest(this.tl, this.t, now);
    this.apply();
  }

  /** Where a flying layer's rows are for its clock `tau`: shares on the host, in the air, in the level. */
  private place(s: Sheet, tau: number): void {
    s.tau = tau;
    if (this.reduced) {
      // no travel: the layer fades from the host, is nowhere for a moment, and fades in under the level
      s.host = tau < REDUCED_FADE ? 1 : 0;
      s.lvl = tau >= TRAVEL ? 1 : 0;
      s.air = 1 - s.host - s.lvl;
      return;
    }
    shares(tau, this.P.feed[s.k], this.sh3);
    s.host = this.sh3[0]; s.air = this.sh3[1]; s.lvl = this.sh3[2];
  }

  private updateHost(tl: Timeline, t: number, now: number): void {
    const P = this.P, red = this.reduced, pxc = this.sx / this.fitW, sh = this.shared;
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
    this.te = t;
    // the well: it opens with the pull and collapses when everything has left; in rebuild it opens and relaxes again
    const a = (this.wellA = tl === "depart" ? strength(t, red) : persp ? rebuildStrength(t, red) : 0);
    this.wellSw = tl === "depart" ? swirl(t, a, red) : red ? 0 : 0.6 * a;
    this.ringR = tl === "depart" ? ringRadius(t) : persp ? rebuildStrength(t) : 0;
    this.ringA = tl === "depart" ? ringAlpha(t) : persp ? rebuildStrength(t) : 0;
    // idle's tilt parallax fades out as the pull starts (the eye takes over) and returns once the card is flat again
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
          s.qT = 1 - clamp01((t - RB_QR) / (REBUILD - RB_QR));
          s.qLift = red ? 0 : 2.5;
        } else if (tl === "depart") {
          s.qT = 1;
        }
        s.on = s.qT < 1;
        s.shA *= 1 - s.qT;
        continue;
      }
      if (!persp) continue;
      // through the eye a layer is its strip
      s.on = false;
      const f = P.feed[s.k];
      if (tl === "depart") {
        this.place(s, clock(P, s.k, t));
        if (red) {
          const x = clamp01(s.tau / REDUCED_FADE);
          s.stripOn = x < 1;
          s.stripOp = 1 - x;
          s.rs = x;
          s.rsA = x > 0 ? 1 : 0;
          s.tag = x;
        } else {
          const gone = 1 - s.host;
          s.stripOn = s.host > 0;
          s.rs = gone;
          s.rsA = gone > 0 ? 1 : 0;
          s.tag = clamp01((gone - 0.5) / 0.5);
          // the rim of light where the glass cuts the ribbon, while rows are crossing
          s.cut = smooth(0, 0.12, gone) * (1 - smooth(0.88, 1, gone));
        }
      } else {
        // rebuild: the strip's clock runs backwards, bottom layer first; the outline goes as the rows come to rest
        if (red) {
          const x = smooth(0, 1, (t - P.rebuildStart[s.j]) / RB_UNSPOOL);
          s.stripOn = x > 0;
          s.stripOp = x;
          s.rs = 1;
          s.rsA = s.tag = 1 - x;
        } else {
          this.place(s, rebuildClock(P, s.j, t));
          s.stripOn = s.host > 0;
          const rest = 1 - clamp01((s.tau + NECK) / f);
          s.rs = 1;
          s.rsA = s.tag = 1 - smooth(0.1, 1, rest);
          s.cut = smooth(0, 0.12, 1 - s.host) * (1 - smooth(0.88, 1, 1 - s.host));
        }
      }
    }
  }

  /** A layer floating in the level: off its place by a drift and a bob (both scaled by `calm`), and held under the surface while its place is above it. */
  private float(s: Sheet, te: number, calm: number, surf: number, buoy: boolean): void {
    const ph = 1.7 * s.j + 0.9;
    const dx = calm * (FLOAT_X * Math.sin(2.1 * ph) + BOB * Math.sin(0.9 * te + ph));
    const dy = calm * (FLOAT_Y * (0.35 + 0.65 * Math.abs(Math.sin(1.3 * ph))) + BOB * Math.cos(1.1 * te + 1.3 * ph));
    s.rot = calm * FLOAT_ROT * (Math.sin(1.3 * ph) + 0.4 * Math.sin(0.8 * te + ph));
    let down = dy * this.sy;
    if (buoy) {
      const top = this.fitY + (this.cardH / 2 - (s.by + s.bh / 2)) * this.fitW + down;
      if (top < surf + s.fm) down += surf + s.fm - top;
    }
    s.ox = (dx * this.sx) / this.fitW;
    s.oy = -down / this.fitW;
  }

  /**
   * How far under the surface each layer rides while its place is still above it (Sheet.fm). The floating layers queue
   * in the card's own vertical order, the highest on the card nearest the surface, and a small layer (a line of text)
   * keeps the next one clear of itself, so lines of text never float through each other on the way to their places.
   * A layer's room opens in the 0.35 s before its first row lands, and no layer is held deeper than the level can show
   * it. `hold` lets the queue go during `fly` (1 -> 0), so nothing is still held when `assemble` starts.
   */
  private buoyancy(te: number, hold: number): void {
    const order = this.floatOrder, P = this.P;
    if (order.length === 0) {
      for (const s of this.sheets) if (!s.qr) order.push(s);
      order.sort((a, b) => b.ry + b.rh / 2 - (a.ry + a.rh / 2) || a.j - b.j);
    }
    const px = this.fitW / this.sy, n = order.length;
    let total = 0;
    for (let i = 0; i < n - 1; i++) total += floatGap(order[i].rh * px);
    const room = Math.min(FLOAT_ROOM, 0.28 * this.ch) - FLOAT_TOP;
    const k = total > room ? room / total : 1, depth = this.ch * this.lv;
    let acc = FLOAT_TOP;
    for (let i = 0; i < n; i++) {
      const s = order[i], h = s.rh * px;
      s.fm = Math.min(acc * hold, Math.max(FLOAT_TOP * hold, depth - h - 6)) * this.sy;
      acc += k * floatGap(h) * smooth(TRAVEL - 0.4, TRAVEL - 0.05, clock(P, s.k, te));
    }
  }

  private updateGuest(tl: Timeline, t: number, now: number): void {
    const P = this.P, red = this.reduced, sh = this.shared;
    const live = !this.paused && now - this.uT0 < 350;
    const u = (this.u = live ? mix(this.uFrom, this.uTo, easeInOut((now - this.uT0) / 350)) : this.uTo);
    if (live) this.dirty = true;
    // the unanchored eye swings about the solved pose: one sweep there and back over the event. A function of
    // the event's own time only and at rest when it ends, so `fly` always starts from the same pose
    const yaw = red ? 0 : -DRIFT * Math.cos(tl === "explode" ? (2 * Math.PI * t) / P.dur.explode : 0);
    this.vQuat.setFromEuler(this.euler.set(VIRTUAL_PITCH, yaw, 0, "XYZ"));
    // card space as this device sees it: the tracked pose blended with the virtual one
    if (this.hasPose) this.mat.fromArray(this.pose).decompose(this.aPos, this.aQuat, this.v2);
    this.fPos.copy(this.aPos).lerp(this.vPos, u);
    this.fQuat.copy(this.aQuat).slerp(this.vQuat, u);
    this.frame.matrix.compose(this.fPos, this.fQuat, this.fScl);
    this.frame.matrixWorldNeedsUpdate = true;
    // where the camera sits, seen from the card: the eye the stub points at and the glass test uses
    this.qi.copy(this.fQuat).invert();
    this.v2.copy(this.fPos).negate().applyQuaternion(this.qi);
    this.eye.set(this.v2.x, this.v2.y, Math.max(0.05, this.v2.z));
    sh.uEye.value.copy(this.eye);
    sh.uSnap.value = 0;
    sh.uOrtho.value = 0;
    // how much of what is at or behind the glass this device draws: nothing when anchored, all of it when alone
    sh.uBehind.value = u;
    sh.uSide.value = u > 0 ? 0 : 1;
    this.bgA = 0;
    this.phoneA = this.wellA = this.wellSw = this.ringR = this.ringA = this.lv = this.amp = this.lineA = 0;
    if (!this.started) {
      this.te = 0;
      for (const s of this.sheets) { this.reset(s); s.on = false; }
      return;
    }
    // the event's clock runs on through fly: the last rows are still in the air when explode ends
    const te = (this.te = tl === "explode" ? t : tl === "fly" ? EVENT + t : EVENT + FLY + t);
    if (tl === "explode") {
      this.wellA = strength(t, red);
      this.wellSw = swirl(t, this.wellA, red);
      this.ringR = ringRadius(t);
      this.ringA = ringAlpha(t);
      this.phoneA = 1;
    } else if (tl === "fly") {
      this.phoneA = 1 - clamp01(t / 0.3);
    }
    const fill = tl !== "assemble";
    this.lv = level(P, tl, t);
    this.amp = red || !fill ? 0 : WOBBLE * smooth(0, 0.03, this.lv);
    this.lineA = fill ? 0.9 * smooth(0, 0.012, this.lv) * (1 - smooth(0.99, 1.03, this.lv)) : 0;
    if (!fill) {
      // the level is past the top: the canvas is the card background, and at the very end the sheets snap to pixels
      this.bgA = 1;
      if (t >= ASSEMBLE) sh.uSnap.value = 1;
    }
    // the landing: face-on, the flat fit
    this.screenFrame(1, this.fitX + this.fitW / 2, this.fitY + this.fitH / 2);
    this.land.matrix.compose(this.sPos, this.q.identity(), this.v3.set(1, this.sScaleY, 1));
    this.land.matrixWorldNeedsUpdate = true;
    // the surface, device px from the top
    const surf = this.bh * (1 - this.lv);
    if (fill && !red) this.buoyancy(te, tl === "fly" ? 1 - smooth(0.3, 0.75, t / FLY) : 1);
    for (const s of this.sheets) {
      this.reset(s);
      if (s.qr) { s.on = false; continue; }
      this.place(s, clock(P, s.k, te));
      if (!fill) {
        // assemble: bobbing dies out, the layer comes to its place and locks
        this.float(s, te, red ? 0 : 1 - easeInOut(t / P.assembleLock[s.j]), surf, false);
      } else if (red) {
        const x = clamp01((s.tau - TRAVEL) / REDUCED_FADE);
        s.on = x > 0;
        s.op = x;
        s.sub = 1;
        const gone = clamp01(s.tau / REDUCED_FADE);
        s.rs = gone;
        s.rsA = gone > 0 ? this.phoneA : 0;
      } else {
        s.on = s.lvl > 0;
        s.rev = s.lvl;
        s.sub = 1;
        this.float(s, te, 1, surf, true);
        // the ribbon: anchored, only once a row is past the sink; alone, the whole strip from its place on the card
        s.stripOn = s.lvl < 1 && (u > 0 || s.tau > 0);
        const gone = 1 - s.host;
        s.rs = gone;
        s.rsA = gone > 0 ? this.phoneA : 0;
      }
    }
  }

  // ---------------------------------------------------------------- state -> GPU

  /** Test: whether a kind of thing (or a layer, by id) is drawn. Always true outside tests. */
  private vis(kind: string, id?: string): boolean {
    const o = this.only;
    if (o === null || o === kind) return true;
    return id !== undefined && (o === id || o === kind + ":" + id);
  }

  /** Camera space -> card space for the guest's frame (this.qi holds the inverse of its rotation). */
  private toCard(out: Vector3, x: number, y: number, z: number): void {
    out.set(x, y, z).sub(this.fPos).applyQuaternion(this.qi);
  }

  /**
   * A layer's ribbon path. The stub (sink -> glass, towards the eye) is the same on both devices. The
   * air belongs to the guest: it keeps going towards the camera, arcs, and comes down into the bottom
   * edge of the guest's screen at the layer's slot; the last two control points hang from the camera,
   * so that end does not move when the pose does.
   */
  private setPath(s: Sheet): void {
    const p = s.path, u = s.stripMat!.uniforms;
    setStub(p, this.eye, this.wellA);
    if (this.role === "host") {
      // nothing of the air is drawn here: the path just keeps going towards the eye
      const d = this.v.copy(this.eye).sub(p.A).normalize();
      p.B1.copy(p.G).addScaledVector(d, 0.5);
      p.B2.copy(p.G).addScaledVector(d, 1);
      p.B3.copy(p.G).addScaledVector(d, 1.5);
      p.B4.copy(p.G).addScaledVector(d, 2);
      u.uRef.value.set(s.sx, s.sy, 0);
    } else {
      const e = this.camera.projectionMatrix.elements, p00 = e[0], p11 = e[5];
      const g = this.v.copy(p.G).applyQuaternion(this.fQuat).add(this.fPos);
      const gx = g.x, gy = g.y, gz = g.z, dist = Math.hypot(gx, gy, gz);
      const z3 = END_DIST * 1.9, z4 = END_DIST;
      // towards the camera first (the same line of sight as the sink), then off it: down and to the layer's slot
      this.toCard(p.B1, gx * 0.82, gy * 0.82, gz * 0.82);
      this.toCard(p.B2, gx * 0.5 + s.slot * 0.28, gy * 0.5 - (0.3 * 0.5 * dist) / p11, gz * 0.5);
      this.toCard(p.B3, (s.slot * 0.42 * z3) / p00, (-0.28 * z3) / p11, -z3);
      this.toCard(p.B4, (s.slot * 0.6 * z4) / p00, (-1.14 * z4) / p11, -z4);
      // the ribbon enters the screen flat and the right way round: its across-direction is the camera's X
      // (mirrored when the strip's own axes are left-handed)
      this.v.set(-u.uHand.value, 0, 0).applyQuaternion(this.qi);
      u.uRef.value.copy(this.v);
    }
    u.uB1.value.copy(p.B1);
    u.uB2.value.copy(p.B2);
    u.uB3.value.copy(p.B3);
    u.uB4.value.copy(p.B4);
  }

  private apply(): void {
    const host = this.role === "host", pxc = this.sx / this.fitW, probe = this.probe ? 1 : 0;
    const behind = host ? 1 : this.u;
    this.bg.visible = this.bgA > 0 && this.vis("bg");
    this.bgMat.uniforms.uAlpha.value = this.bgA;
    // the well; the anchored guest's ribbons are soft where they leave the glass
    this.ws.uWell.value.set(this.wellA, this.wellSw, host || this.u > 0 ? 0 : 1, 0);
    const ring = this.ring!, ru = this.ringMat!.uniforms;
    ring.visible = this.ringA > 0 && this.ringR > 0 && (host ? this.persp : behind > 0) && this.vis("ring");
    ru.uRing.value.set(this.ringR, 0.014, this.reduced ? 0 : 0.03 * this.te, this.ringA * (host ? 1 : this.phoneA));
    ru.uProbe.value = probe;
    if (this.backing) {
      // the guest alone: the virtual phone's card and its hairline
      this.backing.visible = behind > 0 && this.phoneA > 0 && this.vis("phone");
      this.backMat!.uniforms.uOpacity.value = this.phoneA;
      this.rim!.visible = this.backing.visible;
      (this.rim!.material as ShaderMaterial).uniforms.uAlpha.value.x = 0.6 * this.phoneA;
    }
    if (this.liquid) {
      // the level, its wobble and its ripples where ribbons pour in
      const on = this.started && this.tl !== "assemble" && this.lv > 0;
      this.lq.uLq.value.set(on ? this.lv * this.bh : 1e9, this.amp * this.sy, this.te, (2 * Math.PI) / (WAVE * this.sx));
      this.liquid.visible = on && this.vis("level");
      this.liquidMat!.uniforms.uProbe.value = probe;
      this.meniscus!.visible = on && this.lineA > 0 && this.vis("level") && !this.probe;
      this.meniscusMat!.uniforms.uLine.value = this.lineA;
      const R = this.lq.uLqR.value;
      let nr = 0;
      if (on && this.amp > 0 && this.tier.ripples) {
        for (const s of this.flying) {
          if (nr >= RIPPLES) break;
          const x = (s.tau - TRAVEL + 0.2) / (this.P.feed[s.k] + 0.4);
          if (x <= 0 || x >= 1) continue;
          R[nr++].set((0.5 + 0.275 * s.slot) * this.bw, RIPPLE * this.sy * Math.sin(Math.PI * x), 9 * this.te, (16 + 90 * s.wid) * this.sx);
        }
      }
      for (; nr < RIPPLES; nr++) R[nr].set(0, 0, 0, 1);
    }
    let idx = 0, nCut = 0;
    for (const s of this.sheets) {
      const base = 10 + idx * 10;
      const w = s.bw, h = s.bh, x = s.bx + s.ox, y = s.by + s.oy;
      const mesh = s.mesh, u = s.mat.uniforms;
      mesh.visible = s.on && s.op > 0 && this.vis(host ? "sheets" : "level", s.spec.id);
      if (mesh.visible) {
        if (s.rot !== 0) {
          const c = Math.cos(s.rot), sn = Math.sin(s.rot);
          mesh.matrix.set(w * c, -h * sn, 0, x, w * sn, h * c, 0, y, 0, 0, 1e-5, 0, 0, 0, 0, 1);
        } else {
          mesh.matrix.set(w, 0, 0, x, 0, h, 0, y, 0, 0, 1e-5, 0, 0, 0, 0, 1);
        }
        mesh.renderOrder = host ? base + 1 : 810 + idx;
        u.uLocal.value.copy(mesh.matrix);
        u.uBox.value.set(x, y, w, h);
        u.uOpacity.value = s.op;
        u.uZoom.value = 1 / s.sc;
        u.uSub.value = s.sub;
        // which end of the sheet is the strip's head, for showing only the rows that have arrived
        u.uRev.value.set(s.vert ? 1 : 0, (s.vert ? s.ly : s.lx) < 0 ? 1 : 0, s.rev);
        u.uProbe.value = host || s.qr ? 0 : probe;
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
        // idle's parallax shadow: under the sheet, or under the strip while the pull starts
        sh.visible = (s.on || s.stripOn) && s.shA > 0.004 && this.vis("sheets", s.spec.id);
        if (sh.visible) {
          const pad = s.shBlur * 2 + 0.002, gw = w + 2 * pad, gh = h + 2 * pad;
          const cx = x + s.shx, cy = y + s.shy;
          sh.matrix.set(gw, 0, 0, cx, 0, gh, 0, cy, 0, 0, 1, 0, 0, 0, 0, 1);
          su.uLocal.value.copy(sh.matrix);
          su.uBox.value.set(cx, cy, gw, gh);
          su.uGrow.value.set(gw / w, gh / h);
          su.uRad.value.set(s.shBlur / w, s.shBlur / h);
          su.uLod.value = Math.log2(Math.max(1, s.shBlur * this.fitW * 0.9));
          su.uAlpha.value = s.shA * (s.on ? s.op : s.stripOp);
          su.uSlab.value = 0;
          su.uClip.value.set(-1e3, -1e3, 1e3, 1e3);
          sh.renderOrder = base;
        }
      }
      const st = s.strip, tu = s.stripMat?.uniforms;
      if (st && tu) {
        st.visible = s.stripOn && s.stripOp > 0 && this.vis("strips", s.spec.id);
        if (st.visible) {
          this.setPath(s);
          tu.uClock.value = this.reduced ? -1e3 : s.tau;
          tu.uOpacity.value = s.stripOp;
          if (host) tu.uOff.value.set(s.ox, s.oy);
          tu.uProbe.value = probe;
          st.renderOrder = base + 1;
        }
        // the outline the layer leaves on the glass, over the layers that are still there
        const rl = s.lines, lu = s.lmat.uniforms;
        rl.visible = s.rsA > 0 && (host ? this.persp : behind > 0) && this.vis("outlines");
        if (rl.visible) {
          const inset = (1 + 8 * s.dupe) * pxc;
          rl.matrix.set(s.rw - inset, 0, 0, s.rx, 0, s.rh - inset, 0, s.ry, 0, 0, 1, 0, 0, 0, 0, 1);
          lu.uLocal.value.copy(rl.matrix);
          lu.uDash.value = 6 * this.sx;
          lu.uProg.value.set(s.rs, 0, 0, 0);
          lu.uAlpha.value.set(s.rsA, 0, 0, 0);
          rl.renderOrder = 140;
        }
        if (this.cuts && s.cut > 0 && this.w < 1 && st.visible) {
          // host without a viewer: a thin rim of light across the ribbon where the glass cuts it
          const p = s.path, t = this.v.copy(this.eye).sub(p.A).normalize();
          const d = s.sx * t.x + s.sy * t.y;
          const nx = s.sx - t.x * d, ny = s.sy - t.y * d, nl = Math.hypot(nx, ny, t.z * d) || 1;
          const half = (0.5 * mix(SINK_W, s.wid, smooth(0, 0.28, STUB)) + 3 * pxc) / nl;
          setLine(this.cuts, nCut++, p.G.x - nx * half, p.G.y - ny * half, -1e-4, p.G.x + nx * half, p.G.y + ny * half, -1e-4, 1.5, 0, 0, 1, RIM_WHITE, s.cut * (1 - this.w));
        }
      } else {
        s.lines.visible = false;
      }
      idx++;
    }
    if (this.cuts && this.cutMesh) {
      this.cutMesh.visible = nCut > 0 && this.vis("cuts");
      this.cuts.geometry.instanceCount = nCut;
      if (nCut > 0) for (const a of this.cuts.attrs) a.needsUpdate = true;
    }
    if (host) this.writeTags();
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

  /** Host: where a layer's tag sits (device px, y down): inside the outline's top-left corner, or above a low outline. */
  private tagRect(s: Sheet, out: number[]): number[] {
    const e = this.atlas!.entries[this.tagEntry];
    const left = this.fitX + (s.rx - s.rw / 2 + 0.5) * this.fitW, top = this.fitY + (this.cardH / 2 - s.ry - s.rh / 2) * this.fitW;
    const inside = s.rh * this.fitW >= (TAG_H + 10) * this.sy;
    out[0] = left + (6 + 4 * s.dupe) * this.sx;
    out[1] = inside ? top + (5 + (TAG_H + 4) * s.dupe) * this.sy : top - (TAG_H + 3) * this.sy;
    out[2] = e.w * this.sx;
    out[3] = e.h * this.sy;
    return out;
  }

  /** Host: the tag at the top-left of every outline. */
  private writeTags(): void {
    const S = this.sprites, e = this.atlas!.entries[this.tagEntry], r = this.box;
    let n = 0;
    if (this.persp && this.vis("outlines")) {
      for (const s of this.flying) {
        if (s.tag <= 0) continue;
        this.tagRect(s, r);
        this.sprite(S, n++, r[0], r[1], r[2], r[3], e, s.tag * 0.9, 1, 1);
      }
    }
    this.finishSprites(n);
  }

  /** Guest: each ribbon in the air carries its layer's block on a short leader; the blocks follow on a short history. */
  private writeLabels(): void {
    const L = this.leaders!, S = this.sprites, E = this.atlas!.entries;
    // the surface in CSS px from the top, less the wobble and a little air
    const surface = this.ch * (1 - this.lv) - this.amp - 10;
    let any = false;
    for (const s of this.flying) {
      const l = s.label!;
      l.on = false;
      if (!s.stripOn || this.tl === "assemble" || !s.strip!.visible) continue;
      const f = this.P.feed[s.k], head = pathS(s.tau / TRAVEL), tail = pathS((s.tau - f) / TRAVEL);
      // not while the ribbon is still in front of the host's screen: that screen is the thing to look at
      const a = smooth(0.55, 0.65, head) * (1 - smooth(0.86, 0.96, tail));
      if (a <= 0) continue;
      // the block rides a point that moves slowly down the path, always on the part of it the ribbon covers
      let at = mix(0.6, 0.78, clamp01((s.tau - 0.65 * TRAVEL) / (f + 0.3 * TRAVEL)));
      at = Math.min(0.94, Math.max(STUB + 0.01, Math.max(Math.min(at, head - 0.03), tail + 0.03)));
      pathPoint(s.path, at, this.v3);
      let p = this.project(this.v3.x, this.v3.y, this.v3.z, this.fPos, this.fQuat);
      // never under the level: the block rides a part of the ribbon that is still above the surface
      for (let i = 0; i < 8 && p.y > surface && at - 0.05 >= tail + 0.03; i++) {
        at -= 0.05;
        pathPoint(s.path, at, this.v3);
        p = this.project(this.v3.x, this.v3.y, this.v3.z, this.fPos, this.fQuat);
      }
      if (p.z > 0 || p.y > surface) continue;
      l.on = true;
      l.alpha = a;
      l.ax = p.x;
      l.ay = p.y;
      any = true;
    }
    if (!any || !this.vis("labels")) {
      for (const l of this.labels) l.held = false;
      this.finishSprites(0);
      this.leaderMesh!.visible = false;
      this.labelsHeld = false;
      return;
    }
    const settled = layoutRibbonLabels(this.labels, this.cw, this.ch, MARGIN * this.cw, MARGIN * this.ch, this.labelsHeld ? this.chromeDt : 0, this.reduced);
    this.labelsHeld = true;
    // blocks still on their way: keep drawing
    if (!settled) this.dirty = true;
    let ns = 0, li = 0;
    for (const s of this.flying) {
      const l = s.label!;
      if (!l.on) {
        setLine(L, li++, 0, 0, 0, 0, 0, 0, 1, 3, 0, 1, BLUE, 0);
        continue;
      }
      const chip = E[s.chip], right = l.x >= l.lx;
      setLine(L, li++, l.lx, l.ly, 0, right ? l.x : l.x + l.bw, l.y + CHIP_H / 2, 0, 1, 3, 0, 1, BLUE, l.alpha);
      this.sprite(S, ns++, (right ? l.x : l.x + l.bw - chip.w) * this.sx, l.y * this.sy, chip.w * this.sx, chip.h * this.sy, chip, l.alpha, 1, 1);
      if (s.pill >= 0) {
        const pill = E[s.pill];
        this.sprite(S, ns++, (right ? l.x : l.x + l.bw - pill.w) * this.sx, (l.y + CHIP_H + BLOCK_GAP) * this.sy, pill.w * this.sx, pill.h * this.sy, pill, l.alpha, 1, 1);
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
    const t0 = __BLACKHOLE_TEST__ ? performance.now() : 0;
    if (this.sizeDirty) this.measure();
    this.emit(t);
    this.dirty = false;
    this.update(now);
    this.render();
    this.lastRender = now;
    if (__BLACKHOLE_TEST__) {
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
    if (s.stripMat) s.stripMat.uniforms.map.value = s.tex;
  }

  // ---------------------------------------------------------------- public handle

  handle(): BlackholeHandle {
    const h: BlackholeHandle = {
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
    if (__BLACKHOLE_TEST__ && this.opts.test === true) h.test = makeHooks(this);
    return h;
  }

  private play(tl: Timeline, at?: number): Promise<void> {
    const ok = (this.role === "host" ? HOST_TIMELINES : GUEST_TIMELINES).includes(tl);
    if (!ok) return Promise.reject(new Error(`blackhole: timeline "${tl}" does not belong to role "${this.role}"`));
    if (this.disposed) return Promise.reject(new Error("blackhole: disposed"));
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
    if (!s) throw new Error(`blackhole: no layer "${id}"`);
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
      s.stripMat?.dispose();
    }
    this.ringMat?.dispose();
    this.polar?.dispose();
    (this.cutMesh?.material as ShaderMaterial | undefined)?.dispose();
    this.backMat?.dispose();
    this.backTex?.dispose();
    (this.rim?.material as ShaderMaterial | undefined)?.dispose();
    this.liquidMat?.dispose();
    this.meniscusMat?.dispose();
    this.atlasTex?.dispose();
    this.bgMat?.dispose();
    this.spriteMat?.dispose();
    (this.leaderMesh?.material as ShaderMaterial | undefined)?.dispose();
    for (const g of this.geos) g.dispose();
    this.scene.clear();
    this.sheets = [];
    this.flying = [];
    this.labels = [];
    if (this.renderer) {
      this.renderer.renderLists.dispose();
      this.renderer.dispose();
    }
    if (this.usesFont) releaseFont();
    this.usesFont = false;
  }
}

// ---------------------------------------------------------------- test hooks
// Only reachable from a branch guarded by the build-time constant __BLACKHOLE_TEST__, so the whole
// function is dropped from dist/blackhole.js.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeHooks(x: any): TestHooks {
  const draw = (): void => {
    x.dirty = false;
    x.update(performance.now());
    x.render();
  };
  return {
    seek: (timeline, t) => {
      x.tl = timeline;
      x.t0 = performance.now() - t * 1000;
      x.started = true;
      x.t = timeline === "idle" ? Math.max(0, t) : Math.max(0, Math.min(x.P.dur[timeline], t));
      x.prevT = x.t;
      x.done = true;
      if (x.sizeDirty) x.measure();
      // a seek starts from nothing: the label history is cleared, so the same seek gives the same pixels
      x.labelsHeld = false;
      x.chromeDt = 0;
      draw();
    },
    step: (timeline, t, dt) => {
      x.tl = timeline;
      x.started = true;
      x.t = timeline === "idle" ? Math.max(0, t) : Math.max(0, Math.min(x.P.dur[timeline], t));
      x.prevT = x.t;
      x.done = true;
      x.chromeDt = dt;
      draw();
    },
    setPaused: (p) => { x.paused = p; x.uT0 = -1e9; },
    setProbe: (on) => { x.probe = on; draw(); },
    setOnly: (what) => { x.only = what; draw(); },
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
      // where the sink shows on the host's canvas: the line from the eye to the sink, cut by the glass
      const d = SINK_DEPTH * x.wellA, E = x.eye, k = d / Math.max(E.z + d, 1e-3), gx = E.x * k, gy = E.y * k;
      return {
        role: x.role, timeline: x.tl, t: x.t, te: x.te, u: x.u, bgA: x.bgA, reduced: x.reduced, textPx: TEXT_PX, tagText: HOST_TAG,
        start: Array.from(x.P.start), feed: Array.from(x.P.feed), rebuildStart: Array.from(x.P.rebuildStart), assembleLock: Array.from(x.P.assembleLock),
        eye: x.eye.toArray(), viewerBlend: x.w, persp: x.persp, side: x.shared.uSide.value, behind: x.shared.uBehind.value,
        cardH: x.cardH, phoneA: x.phoneA,
        well: { a: x.wellA, swirl: x.wellSw, ringRadius: x.ringR * RING_R, ringAlpha: x.ringA },
        sink: {
          depth: d, glass: [gx, gy],
          css: [(x.fitX + (0.5 + gx) * x.fitW) / x.sx, (x.fitY + (x.cardH / 2 - gy) * x.fitW) / x.sy],
        },
        level: { share: x.lv, css: x.lv * x.ch, wobble: x.amp, line: x.lineA, arrived: arrived(x.P, x.te) },
        projection: Array.from(x.camera.projectionMatrix.elements),
        frame: { pos: x.fPos.toArray(), quat: x.fQuat.toArray() },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sheets: x.sheets.map((s: any) => ({
          id: s.spec.id, qr: s.qr, j: s.j, k: s.k, on: s.on, op: s.op, x: s.bx + s.ox, y: s.by + s.oy, ox: s.ox, oy: s.oy, rot: s.rot,
          rev: s.rev, sub: s.sub, sc: s.sc, w: s.bw, h: s.bh, qT: s.qT, shA: s.shA, rect: [s.rx, s.ry, s.rw, s.rh],
          strip: s.stripOn, stripOp: s.stripOp, tau: s.tau, host: s.host, air: s.air, level: s.lvl,
          rs: s.rs, rsA: s.rsA, tag: s.tag, cut: s.cut, wid: s.wid, slot: s.slot, vert: s.vert, long: [s.lx, s.ly],
          tagRect: x.role === "host" && !s.qr ? x.tagRect(s, [0, 0, 0, 0]) : null,
          path: s.qr ? null : { A: s.path.A.toArray(), G: s.path.G.toArray(), B1: s.path.B1.toArray(), B2: s.path.B2.toArray(), B3: s.path.B3.toArray(), B4: s.path.B4.toArray() },
        })),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        labels: x.flying.filter((s: any) => s.label).map((s: any) => {
          const l = s.label;
          return { id: s.spec.id, on: l.on, alpha: l.alpha, x: l.x, y: l.y, w: l.bw, h: l.bh, ax: l.ax, ay: l.ay, lx: l.lx, ly: l.ly, tx: l.tx, ty: l.ty };
        }),
      };
    },
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
