// The effect: one renderer, one scene graph, two roles. `update*()` turns (timeline, t, inputs) into
// per-sheet state; `apply()` pushes that state into matrices and uniforms. Nothing is allocated per frame.
import {
  Camera, CanvasTexture, Euler, Group, LinearFilter, LinearMipmapLinearFilter, Matrix4, Mesh, Quaternion, Scene,
  Texture, Vector3, WebGLRenderer, type BufferGeometry, type ShaderMaterial,
} from "three";
import type {
  Handle, LayerEvent, LayerManifest, LayerSpec, MountOptions, Quality, Rect, Role, Timeline,
} from "../../../types";
import {
  acquireFont, bakeLayer, buildAtlas, detectQrGrid, loadImage, makeCanvas, releaseFont, resolveUrl,
  BLOCK_GAP, CHIP_H, PILL_H, TAG_H, TEXT_PX, type AnyCanvas, type Atlas, type AtlasItem, type QrGrid,
} from "./assets";
import {
  bgMaterial, lineMaterial, lineSet, makeShared, planeGeometry, setLine, shadowMaterial, sheetMaterial,
  slabGeometry, spriteMaterial, spriteSet, BLUE, RED, type LineSet, type Shared, type SpriteSet,
} from "./gl";
import { layoutLabels, makeSlot, reserveFor, rowsFor, LABEL_GAP, type LabelSlot } from "./layout";
import {
  backOut, bez, clamp01, easeInOut, easeOut, liftCurve, mix, plan, smooth,
  ASSEMBLE, BREATH, CHROME, CONNECT, DECK, DECK_ZOOM, FLY, GUEST_TIMELINES, HOST_TIMELINES, LIFT, LIFT_START,
  REBUILD, SETTLE, type Plan,
} from "./schedule";

export const THICK = 0.012;
export const Z0 = 0.08;
export const ZGAP = 0.11;
export const STAIR = 0.035;
const VIRTUAL_PITCH = (17 * Math.PI) / 180;
const VIRTUAL_YAW = (24 * Math.PI) / 180;
const MARGIN = 0.08;

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
  // card units: baked box and exact rect (centre, size), exit distance to the right canvas edge
  bx: number; by: number; bw: number; bh: number; rx: number; ry: number; rw: number; rh: number; exit: number;
  mesh: Mesh; mat: ShaderMaterial; shadow: Mesh | null; smat: ShaderMaterial | null;
  lines: Mesh; lmat: ShaderMaterial; lset: LineSet;
  // per-frame state
  on: boolean; op: number; ox: number; oy: number; z: number; sc: number; acr: number; sweep: number;
  qT: number; qLift: number; lifted: boolean;
  shA: number; shx: number; shy: number; shBlur: number; shZ: number; shSlab: number; shGlass: boolean;
  fr: number; frA: number; ms: number; hd: number; chA: number; lead: number; chipR: number; pillR: number; tag: number;
}

export interface TestHooks {
  seek(timeline: Timeline, t: number): void;
  setPaused(paused: boolean): void;
  frames(): number;
  /** Wait for the GPU after every frame so the recorded frame cost includes its work. */
  setFinish(on: boolean): void;
  state(): unknown;
  stats(): unknown;
  fakePose(yawDeg: number, pitchDeg: number, distance: number, rollDeg?: number, x?: number, y?: number): Float32Array;
}
export type PeelHandle = Handle & { test?: TestHooks };

export async function mountEffect(canvas: HTMLCanvasElement, opts: MountOptions): Promise<PeelHandle> {
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
  private tagEntry = -1;
  private scratch: AnyCanvas | null = null;
  private geos: BufferGeometry[] = [];
  private usesFont = false;

  // canvas metrics
  private cw = 1; private ch = 1; private bw = 1; private bh = 1; private sx = 1; private sy = 1;
  private fitX = 0; private fitY = 0; private fitW = 1; private fitH = 1;
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
  private readonly entry = new Vector3();
  private bgA = 0;
  private glassW = 1;
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
    const test = __PEEL_TEST__ && this.opts.test === true;
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
        bx: 0, by: 0, bw: 1, bh: 1, rx: 0, ry: 0, rw: 1, rh: 1, exit: 1,
        mesh, mat, shadow, smat, lines, lmat, lset,
        on: true, op: 1, ox: 0, oy: 0, z: 0, sc: 1, acr: 0, sweep: 0, qT: 0, qLift: 0, lifted: false,
        shA: 0, shx: 0, shy: 0, shBlur: 0, shZ: 0, shSlab: 0, shGlass: false,
        fr: 0, frA: 0, ms: 0, hd: 0, chA: 0, lead: 0, chipR: 0, pillR: 0, tag: 0,
      };
      for (const o of [mesh, shadow, lines]) {
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
    this.tagEntry = items.length;
    items.push({ text: "Layer moved →", kind: "tag" });
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
    const w = host ? 1 : 1.5, a = host ? 0.55 : 1, h = 0.5;
    setLine(L, 0, -h, h, 0, h, h, 0, w, 0, 0, 0.25, BLUE, a);
    setLine(L, 1, h, h, 0, h, -h, 0, w, 0, 0.25, 0.5, BLUE, a);
    setLine(L, 2, h, -h, 0, -h, -h, 0, w, 0, 0.5, 0.75, BLUE, a);
    setLine(L, 3, -h, -h, 0, -h, h, 0, w, 0, 0.75, 1, BLUE, a);
    for (let i = 4; i < 11; i++) setLine(L, i, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, RED, 0);
    s.lmat.uniforms.uSnap.value = host ? 1 : 0;
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
      ev.depart.push({ t: P.start[s.k], e: e("leave") });
      ev.explode.push({ t: P.start[s.k], e: e("lift") }, { t: P.start[s.k] + LIFT + SETTLE, e: e("settle") });
      ev.assemble.push({ t: P.assembleStart[s.j] + P.assembleDrop, e: e("arrive") });
      ev.rebuild.push({ t: P.rebuildStart[s.j] + P.rebuildLand, e: e("arrive") });
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

    const cxp = this.fitX + this.fitW / 2, cyp = this.fitY + this.fitH / 2;
    this.texBytes = 0;
    this.scratch = makeCanvas(this.bw, this.bh, this.canvas);
    for (const s of this.sheets) {
      const r = s.spec.rect;
      this.setTexture(s, s.img, false);
      s.rx = (r.x + r.w / 2 - card.w / 2) / card.w;
      s.ry = (card.h / 2 - (r.y + r.h / 2)) / card.w;
      s.rw = r.w / card.w;
      s.rh = r.h / card.w;
      s.exit = (this.bw - cxp) / this.fitW - (s.bx - (s.bw / 2) * 1.05) + 0.06;
      this.placeMeasure(s);
    }
    this.scratch.width = this.scratch.height = 1;
    this.scratch = null;

    this.atlas = buildAtlas(this.atlasItems, this.sx, Math.min(176, this.cw * 0.44), this.canvas);
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

    if (host) {
      this.camera.projectionMatrix.makeOrthographic(0, this.bw, this.bh, 0, -1e4, 1e4);
      this.frame.matrix.set(
        this.fitW, 0, 0, cxp,
        0, this.fitW, 0, this.bh - cyp,
        0, 0, this.fitW, 0,
        0, 0, 0, 1,
      );
      this.frame.matrixWorldNeedsUpdate = true;
    } else {
      this.setCamera();
    }
    this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
    this.sizeDirty = false;
    this.dirty = true;
  }

  private setTexture(s: Sheet, img: HTMLImageElement, asNext: boolean): void {
    const card = this.m.card, r = s.spec.rect, ds = this.fitW / card.w;
    const scratch = this.scratch ?? makeCanvas(this.bw, this.bh, this.canvas);
    const b = bakeLayer(img, this.fitX + r.x * ds, this.fitY + r.y * ds, r.w * ds, r.h * ds, scratch, this.canvas);
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
    this.dirty = true;
  }

  /** Face-on frame in which the card plane lands exactly on the flat fit, scaled by `zoom` about its centre. */
  private screenFrame(zoom: number): void {
    const e = this.camera.projectionMatrix.elements, p00 = e[0], p11 = e[5];
    const d = (p00 * this.bw) / (2 * this.fitW * zoom);
    const nx = ((this.fitX + this.fitW / 2) / this.bw) * 2 - 1;
    const ny = 1 - ((this.fitY + this.fitH / 2) / this.bh) * 2;
    this.sPos.set((nx * d) / p00, (ny * d) / p11, -d);
    this.sScaleY = (p00 * this.bw) / (p11 * this.bh);
  }

  /** Projects a card-space point through `pos`/`quat` to CSS px; result in this.v (x, y). */
  private project(x: number, y: number, z: number, pos: Vector3, quat: Quaternion, sy: number): Vector3 {
    const v = this.v.set(x, y * sy, z).applyQuaternion(quat).add(pos).applyMatrix4(this.camera.projectionMatrix);
    v.x = (v.x * 0.5 + 0.5) * this.cw;
    v.y = (0.5 - v.y * 0.5) * this.ch;
    return v;
  }

  /** Screen bounding box of the settled exploded stack seen through `pos`/`quat`; result in this.box. */
  private stackBox(pos: Vector3, quat: Quaternion): void {
    const b = this.box;
    b[0] = b[1] = 1e9;
    b[2] = b[3] = -1e9;
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
    this.vQuat.setFromEuler(new Euler(VIRTUAL_PITCH, VIRTUAL_YAW, 0, "XYZ"));
    const mx = MARGIN * this.cw, my = MARGIN * this.ch;
    let maxW = 0, bh = 0, nl = 0, nr = 0;
    for (const sl of this.slots) {
      maxW = Math.max(maxW, sl.bw);
      bh = Math.max(bh, sl.bh);
      if (sl.side < 0) nl++; else nr++;
    }
    let x0 = mx, x1 = this.cw - mx, y0 = my, y1 = this.ch - my;
    const besideW = x1 - x0 - 2 * (maxW + LABEL_GAP);
    if (besideW >= 0.4 * (x1 - x0)) {
      x0 += maxW + LABEL_GAP;
      x1 -= maxW + LABEL_GAP;
    } else {
      const reserve = reserveFor(rowsFor(Math.max(nl, nr)), bh);
      y0 += reserve;
      y1 -= reserve;
    }
    const e = this.camera.projectionMatrix.elements, b = this.box;
    this.vPos.set(0, 0, -6);
    for (let it = 0; it < 14; it++) {
      this.stackBox(this.vPos, this.vQuat);
      const f = Math.min((x1 - x0) / (b[2] - b[0]), (y1 - y0) / (b[3] - b[1]));
      this.vPos.multiplyScalar(1 / f);
      this.stackBox(this.vPos, this.vQuat);
      const d = -this.vPos.z;
      this.vPos.x += (((x0 + x1) / 2 - (b[0] + b[2]) / 2) / this.cw) * 2 * (d / e[0]);
      this.vPos.y -= (((y0 + y1) / 2 - (b[1] + b[3]) / 2) / this.ch) * 2 * (d / e[5]);
    }
    this.stackBox(this.vPos, this.vQuat);
    const up = ((b[3] + 0.04 * this.ch) / this.ch) * 2 * (-this.vPos.z / e[5]);
    this.entry.set(0, up, 0).applyQuaternion(this.qi.copy(this.vQuat).invert());
    if (!this.everPose) {
      this.aPos.copy(this.vPos);
      this.aQuat.copy(this.vQuat);
    }
  }

  // ---------------------------------------------------------------- per-frame state

  private reset(s: Sheet): void {
    s.on = true; s.op = 1; s.ox = 0; s.oy = 0; s.z = 0; s.sc = 1; s.acr = 0; s.sweep = 0; s.qT = 0; s.qLift = 0;
    s.lifted = false; s.shA = 0; s.shx = 0; s.shy = 0; s.shBlur = 0; s.shZ = 0; s.shSlab = 0; s.shGlass = false;
    s.fr = 0; s.frA = 0; s.ms = 0; s.hd = 0; s.chA = 0; s.lead = 0; s.chipR = 0; s.pillR = 0; s.tag = 0;
  }

  private update(now: number): void {
    if (this.role === "host") this.updateHost(this.tl, this.t);
    else this.updateGuest(this.tl, this.t, now);
    this.apply();
  }

  private updateHost(tl: Timeline, t: number): void {
    const P = this.P, red = this.reduced, pxc = this.sx / this.fitW;
    let pw = tl === "idle" || tl === "connect" ? 1 : tl === "depart" ? 1 - smooth(0, LIFT_START, t) : smooth(REBUILD - 0.3, REBUILD, t);
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
          s.qT = 1 - clamp01((t - 0.85) / (REBUILD - 0.85));
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
        if (tau <= 0) continue;
        if (red) {
          s.op = 1 - clamp01(tau / 0.5);
          s.on = s.op > 0;
          s.fr = 1;
          s.frA = s.tag = clamp01(tau / 0.5);
          continue;
        }
        s.fr = clamp01((tau - 0.06) / 0.34);
        s.frA = 1;
        s.tag = clamp01((tau - 0.4) / 0.2);
        if (tau >= LIFT) { s.on = false; continue; }
        const u = tau / LIFT, L = bez(u), q = smooth(0.12, 1, u);
        this.liftHost(s, L, q * q, clamp01(tau / 0.1), mix(-1.2, 1.2, u));
      } else if (tl === "rebuild") {
        const tau = t - P.rebuildStart[s.j], land = P.rebuildLand;
        if (red) {
          s.op = clamp01(tau / land);
          s.on = s.op > 0;
          s.fr = 1;
          s.frA = s.tag = 1 - s.op;
          continue;
        }
        s.fr = 1;
        s.frA = s.tag = 1 - clamp01(tau / 0.25);
        if (tau <= 0) { s.on = false; continue; }
        if (tau >= land) continue;
        const q = easeOut(tau / land);
        this.liftHost(s, 1 - q, 1 - q, 1 - smooth(0.55, 1, tau / land), mix(1.2, -1.2, tau / land));
      }
    }
  }

  /** A sheet off the glass on the host: acrylic, 5 % bigger, shadow below, `slide` of the way out. */
  private liftHost(s: Sheet, L: number, slide: number, acr: number, sweep: number): void {
    const pxc = this.sx / this.fitW;
    s.lifted = true;
    s.acr = acr;
    s.sc = 1 + 0.05 * L;
    s.ox += slide * s.exit;
    s.oy += 0.03 * Math.sin(Math.PI * Math.min(1, slide * 1.2));
    s.shA = 0.35 * Math.sqrt(L) * acr;
    s.shx = 0.014 * L;
    s.shy = -0.02 * L;
    s.shBlur = (1 + 5 * L) * pxc;
    s.shSlab = 0.3;
    s.sweep = sweep + 0.3 * this.tiltX;
  }

  private updateGuest(tl: Timeline, t: number, now: number): void {
    const P = this.P, red = this.reduced;
    const live = !this.paused && now - this.uT0 < 350;
    const u = (this.u = live ? mix(this.uFrom, this.uTo, easeInOut((now - this.uT0) / 350)) : this.uTo);
    // anchor frame: tracked pose blended with the virtual pose
    if (this.hasPose) this.mat.fromArray(this.pose).decompose(this.aPos, this.aQuat, this.v2);
    this.fPos.copy(this.aPos).lerp(this.vPos, u);
    this.fQuat.copy(this.aQuat).slerp(this.vQuat, u);
    this.fScl.set(1, 1, 1);
    let spread = 1, chromeA = 1, w = 0;
    this.spread = 1;
    this.bgA = 0;
    this.glassW = 1 - u;
    this.shared.uSnap.value = 0;
    if (tl === "fly") {
      w = red ? 0 : easeInOut(t / FLY);
      this.screenFrame(DECK_ZOOM);
      this.fPos.lerp(this.sPos, w);
      this.fPos.y += 0.3 * Math.sin(Math.PI * w);
      this.fQuat.slerp(this.q.identity(), w);
      this.fScl.y = mix(1, this.sScaleY, w);
      spread = this.spread = mix(1, DECK, w);
      chromeA = 1 - clamp01(t / 0.3);
      this.bgA = red ? clamp01(t / FLY) : smooth(0.3, 1, t / FLY);
      this.glassW *= 1 - w;
    } else if (tl === "assemble") {
      this.screenFrame(red ? 1 : mix(DECK_ZOOM, 1, easeInOut(t / 0.75)));
      this.fPos.copy(this.sPos);
      this.fQuat.identity();
      this.fScl.y = this.sScaleY;
      chromeA = 0;
      this.bgA = 1;
      this.glassW = 0;
      if (t >= ASSEMBLE) this.shared.uSnap.value = 1;
    }
    this.frame.matrix.compose(this.fPos, this.fQuat, this.fScl);
    this.frame.matrixWorldNeedsUpdate = true;
    // where the camera sits, seen from the card: drives the specular sweep
    this.v2.copy(this.fPos).negate().applyQuaternion(this.qi.copy(this.fQuat).invert()).normalize();
    const view = 1.2 * (this.v2.x * 0.8 - this.v2.y * 0.6);
    const stair = STAIR * this.cardH;

    for (const s of this.sheets) {
      this.reset(s);
      if (s.qr) { s.on = false; continue; }
      const zTop = Z0 + ZGAP * s.j + THICK;
      let e = spread, ent = 0;
      s.acr = 1;
      if (tl === "explode") {
        const tau = t - P.start[s.k];
        if (tau <= 0) { s.on = false; continue; }
        const c = clamp01((tau - LIFT - SETTLE) / CHROME);
        if (red) {
          s.op = clamp01(tau / 0.5);
          s.chA = c;
          s.fr = s.ms = s.hd = s.lead = s.chipR = s.pillR = c > 0 ? 1 : 0;
        } else {
          const p = liftCurve(tau);
          e = mix(p, Math.max(p, 1), u);
          ent = u * (1 - bez(tau / LIFT));
          s.op = clamp01(tau / 0.08);
          s.sweep = -1.2 + 1.5 * Math.min(1, p) + 0.08 * s.j + view + 0.05 * Math.max(0, tau - LIFT);
          this.chrome(s, c);
        }
      } else if (tl === "fly") {
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
      s.ox = this.entry.x * ent;
      s.oy = stair * s.j * e + this.entry.y * ent;
      s.z = zTop * e + this.entry.z * ent;
      // contact shadow on the receiver below
      const r = s.recv >= 0 ? this.sheets[s.recv] : null;
      const zr = r && r.on ? r.z : 0;
      const h = Math.max(0, s.z - THICK * s.acr - zr);
      s.shGlass = !(r && r.on);
      s.shZ = zr;
      s.shx = 0.1 * h;
      s.shy = -0.14 * h;
      s.shBlur = 0.004 + 0.05 * h;
      s.shSlab = 0.3;
      s.shA = 0.35 * s.op * s.acr * smooth(0, 0.02, h) * (1 - 0.45 * clamp01(h / 0.8)) * (s.shGlass ? this.glassW : 1) * (1 - ent);
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
    let idx = 0;
    for (const s of this.sheets) {
      const base = host ? (s.lifted ? 600 : 10) + idx * 3 : 10 + idx * 10;
      const acr = s.acr, w = s.bw * s.sc, h = s.bh * s.sc, x = s.bx + s.ox, y = s.by + s.oy;
      const mesh = s.mesh, u = s.mat.uniforms;
      mesh.visible = s.on && s.op > 0;
      if (mesh.visible) {
        mesh.matrix.set(w, 0, 0, x, 0, h, 0, y, 0, 0, Math.max(1e-5, THICK * acr), s.z, 0, 0, 0, 1);
        mesh.renderOrder = base + 1;
        u.uBox.value.set(x, y, w, h);
        u.uOpacity.value = s.op;
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
        sh.visible = mesh.visible && s.shA > 0.004;
        if (sh.visible) {
          const pad = s.shBlur * 2 + 0.002, gw = w + 2 * pad, gh = h + 2 * pad;
          const cx = x + s.shx, cy = y + s.shy;
          sh.matrix.set(gw, 0, 0, cx, 0, gh, 0, cy, 0, 0, 1, s.shZ, 0, 0, 0, 1);
          su.uBox.value.set(cx, cy, gw, gh);
          su.uGrow.value.set(gw / w, gh / h);
          su.uRad.value.set(s.shBlur / w, s.shBlur / h);
          su.uLod.value = Math.log2(Math.max(1, s.shBlur * this.fitW * 0.9));
          su.uAlpha.value = s.shA;
          su.uSlab.value = s.shSlab * acr;
          const r = !host && s.recv >= 0 && !s.shGlass ? this.sheets[s.recv] : null;
          if (r) su.uClip.value.set(r.bx + r.ox - r.bw / 2, r.by + r.oy - r.bh / 2, r.bx + r.ox + r.bw / 2, r.by + r.oy + r.bh / 2);
          else su.uClip.value.set(-1e3, -1e3, 1e3, 1e3);
          sh.renderOrder = host ? base : r ? 10 + s.recv * 10 + 2 : 5;
        }
      }
      const ln = s.lines, lu = s.lmat.uniforms;
      ln.visible = !s.qr && (host ? s.frA > 0 : s.chA > 0 && mesh.visible);
      if (ln.visible) {
        if (host) {
          const inset = (1 + 8 * s.dupe) * pxc;
          ln.matrix.set(s.rw - inset, 0, 0, s.rx, 0, s.rh - inset, 0, s.ry, 0, 0, 1, 0, 0, 0, 0, 1);
          lu.uDash.value = 6 * this.sx;
          lu.uProg.value.set(s.fr, 0, 0, 0);
          lu.uAlpha.value.set(s.frA, 0, 0, 0);
          ln.renderOrder = 400 + idx;
        } else {
          ln.matrix.set(s.rw, 0, 0, s.rx + s.ox, 0, s.rh, 0, s.ry + s.oy, 0, 0, 1, s.z, 0, 0, 0, 1);
          lu.uProg.value.set(s.fr, s.ms, s.hd, 0);
          lu.uAlpha.value.set(s.chA, s.chA, s.chA, 0);
          ln.renderOrder = base + 3;
        }
      }
      idx++;
    }
    if (host) this.writeTags();
    else this.writeLabels();
  }

  /** Host: "Layer moved →" at the top-left of every outline. */
  private writeTags(): void {
    const S = this.sprites, e = this.atlas!.entries[this.tagEntry];
    let n = 0;
    for (const s of this.flying) {
      if (s.tag <= 0) continue;
      const left = this.fitX + (s.rx - s.rw / 2 + 0.5) * this.fitW, top = this.fitY + (this.cardH / 2 - s.ry - s.rh / 2) * this.fitW;
      const hPx = s.rh * this.fitW;
      const inside = hPx >= (TAG_H + 10) * this.sy;
      const x = left + (6 + 4 * s.dupe) * this.sx;
      const y = inside ? top + (5 + (TAG_H + 4) * s.dupe) * this.sy : top - (TAG_H + 3) * this.sy;
      this.sprite(S, n++, x, y, e.w * this.sx, e.h * this.sy, e, s.tag * 0.9, 1, 1);
    }
    this.finishSprites(n);
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
    layoutLabels(this.slots, nl, minX, minY, maxX, maxY, this.cw, this.ch, mx, my, this.order);
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
    const t0 = __PEEL_TEST__ ? performance.now() : 0;
    if (this.sizeDirty) this.measure();
    this.emit(t);
    this.dirty = false;
    this.update(now);
    this.render();
    this.lastRender = now;
    if (__PEEL_TEST__) {
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

  handle(): PeelHandle {
    const h: PeelHandle = {
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
    if (__PEEL_TEST__ && this.opts.test === true) h.test = makeHooks(this);
    return h;
  }

  private play(tl: Timeline, at?: number): Promise<void> {
    const ok = (this.role === "host" ? HOST_TIMELINES : GUEST_TIMELINES).includes(tl);
    if (!ok) return Promise.reject(new Error(`peel: timeline "${tl}" does not belong to role "${this.role}"`));
    if (this.disposed) return Promise.reject(new Error("peel: disposed"));
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
    if (!s) throw new Error(`peel: no layer "${id}"`);
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
// Only reachable from a branch guarded by the build-time constant __PEEL_TEST__, so the whole
// function is dropped from dist/peel.js.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeHooks(x: any): TestHooks {
  return {
    seek: (timeline, t) => {
      x.tl = timeline;
      x.t0 = performance.now() - t * 1000;
      x.t = timeline === "idle" ? Math.max(0, t) : Math.max(0, Math.min(x.P.dur[timeline], t));
      x.prevT = x.t;
      x.done = true;
      if (x.sizeDirty) x.measure();
      x.dirty = false;
      x.update(performance.now());
      x.render();
    },
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
    state: () => ({
      role: x.role, timeline: x.tl, t: x.t, u: x.u, bgA: x.bgA, textPx: TEXT_PX, sweepOn: x.tier.sweep && !x.reduced,
      frame: { pos: x.fPos.toArray(), quat: x.fQuat.toArray(), scale: x.fScl.toArray() },
      offNormalDeg: (Math.acos(clamp01(new Vector3(0, 0, 1).applyQuaternion(x.fQuat).dot(new Vector3().copy(x.fPos).negate().normalize()))) * 180) / Math.PI,
      box: Array.from(x.box),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sheets: x.sheets.map((s: any) => ({
        id: s.spec.id, qr: s.qr, j: s.j, on: s.on, op: s.op, x: s.bx + s.ox, y: s.by + s.oy, z: s.z, ox: s.ox, oy: s.oy,
        sc: s.sc, acr: s.acr, w: s.bw, h: s.bh, qT: s.qT, shA: s.shA, fr: s.fr, frA: s.frA, chA: s.chA, tag: s.tag,
        chipR: s.chipR, pillR: s.pillR, lead: s.lead,
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      labels: x.flying.map((s: any) => {
        const o = x.slots[s.slot];
        return { id: s.spec.id, side: o.side, zone: o.zone, row: o.row, x: o.x, y: o.y, w: o.bw, h: o.bh, ax: o.ax, ay: o.ay, ex: o.ex, ey: o.ey, gy: o.gy, ix: o.ix };
      }),
    }),
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
