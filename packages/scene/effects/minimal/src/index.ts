// Minimal reference effect for the layercard scene contract (v1).
// Deliberately plain: flat textured sheets, dashed outlines, label chips. It proves the contract,
// serves as the shell's stand-in while richer effects are built, and is a starting point for new ones.
import * as THREE from "three";
import type { Handle, LayerManifest, LayerSpec, MountOptions, Rect, Role, Timeline } from "../../../types";

const T = { connect: 0.8, lead: 0.2, gap: 0.6, lift: 0.9, settle: 0.35, chrome: 0.45, hold: 1.2, fly: 1.2, assemble: 1.0, rebuild: 1.5 };
const BASE_Z = 0.08, GAP_Z = 0.11, STAIR = 0.035; // card units; STAIR is a fraction of card height
const BLUE = 0x2f80ff;

const flying = (m: LayerManifest) => m.layers.filter((l) => l.role !== "qr").sort((a, b) => b.z - a.z); // top first

export async function supported(): Promise<boolean> {
  try { return !!document.createElement("canvas").getContext("webgl2"); } catch { return false; }
}

export function durations(m: LayerManifest): Record<Timeline, number> {
  const n = flying(m).length;
  const depart = T.lead + Math.max(0, n - 1) * T.gap + T.lift + T.settle + T.chrome + T.hold;
  return { idle: 0, connect: T.connect, depart, rebuild: T.rebuild, explode: depart, fly: T.fly, assemble: T.assemble };
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
const easeInOut = (x: number) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const backOut = (x: number, s = 1.1) => { x = clamp01(x); return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };

function labelTexture(text: string): { tex: THREE.CanvasTexture; aspect: number } {
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d")!;
  const font = "600 44px ui-monospace, Menlo, monospace";
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width) + 40, h = 72;
  c.width = w; c.height = h;
  ctx.font = font;
  ctx.fillStyle = "#2F80FF";
  ctx.beginPath(); ctx.roundRect(0, 0, w, h, 12); ctx.fill();
  ctx.fillStyle = "#FFFFFF"; ctx.textBaseline = "middle"; ctx.fillText(text, 20, h / 2 + 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { tex, aspect: w / h };
}

interface Sheet {
  spec: LayerSpec; mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; edge: THREE.LineSegments; edgeMat: THREE.LineDashedMaterial;
  label: THREE.Sprite; labelMat: THREE.SpriteMaterial; labelAspect: number; home: THREE.Vector3; rank: number; order: number;
}

export async function mount(canvas: HTMLCanvasElement, opts: MountOptions): Promise<Handle> {
  if (!(await supported())) throw new Error("WebGL2 is not available");
  const m = opts.layers;
  const aspect = m.card.h / m.card.w;
  const role: Role = opts.role;
  const dur = durations(m);
  const dprCap = ({ high: 2, mid: 1.5, low: 1, test: 1 } as const)[opts.quality] ?? 1.5;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: opts.quality !== "low", preserveDrawingBuffer: !!opts.test });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const bg = new THREE.Color(m.card.background);
  const scene = new THREE.Scene();
  const card = new THREE.Group();
  card.matrixAutoUpdate = false;
  scene.add(card);

  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
  const persp = new THREE.PerspectiveCamera(70, 1, 0.01, 100);

  const loader = new THREE.TextureLoader();
  const maxTex = ({ high: 2048, mid: 1536, low: 1024, test: 1024 } as const)[opts.quality] ?? 1536;
  const load = (src: string) => new Promise<THREE.Texture>((resolve, reject) => {
    loader.load(new URL(src, opts.baseUrl).href, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      const img = t.image as HTMLImageElement;
      if (img && Math.max(img.width, img.height) > maxTex) t.generateMipmaps = true;
      resolve(t);
    }, undefined, reject);
  });

  const fly = flying(m);
  const byRank = [...m.layers].filter((l) => l.role !== "qr").sort((a, b) => a.z - b.z);
  const sheets: Sheet[] = [];
  for (const spec of [...m.layers].sort((a, b) => a.z - b.z)) {
    const tex = await load(spec.src);
    const w = spec.rect.w / m.card.w, h = spec.rect.h / m.card.w;
    const geo = new THREE.PlaneGeometry(w, h);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat);
    const home = new THREE.Vector3((spec.rect.x + spec.rect.w / 2) / m.card.w - 0.5, aspect / 2 - (spec.rect.y + spec.rect.h / 2) / m.card.w, 0);
    mesh.position.copy(home);
    mesh.renderOrder = spec.z;
    const edgeMat = new THREE.LineDashedMaterial({ color: BLUE, dashSize: 0.012, gapSize: 0.012, transparent: true, opacity: 0, depthTest: false });
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat);
    edge.computeLineDistances();
    edge.renderOrder = 100 + spec.z;
    mesh.add(edge);
    const lt = labelTexture([spec.label ?? spec.name, spec.dims].filter(Boolean).join("  ·  "));
    const labelMat = new THREE.SpriteMaterial({ map: lt.tex, transparent: true, opacity: 0, depthTest: false, sizeAttenuation: false });
    const label = new THREE.Sprite(labelMat);
    label.renderOrder = 200 + spec.z;
    label.center.set(0, 0);
    mesh.add(label);
    label.position.set(-w / 2, h / 2, 0.001);
    card.add(mesh);
    sheets.push({ spec, mesh, mat, edge, edgeMat, label, labelMat, labelAspect: lt.aspect, home, rank: byRank.indexOf(spec), order: fly.indexOf(spec) });
  }
  const qrSheets = sheets.filter((s) => s.spec.role === "qr");
  const zMax = Math.max(1, ...m.layers.map((l) => l.z));

  // state
  let timeline: Timeline = role === "host" ? "idle" : "explode";
  let at = role === "host" ? performance.now() : Infinity;
  let pending: { resolve: () => void; end: number } | null = null;
  let tilt = { x: 0, y: 0 };
  let pose: THREE.Matrix4 | null = null;
  let disposed = false, raf = 0, paused = false, seekT: number | null = null;
  let size = { w: 0, h: 0 };
  const emitted = new Set<string>();
  const anchorM = new THREE.Matrix4(), targetM = new THREE.Matrix4(), tmpM = new THREE.Matrix4();
  const p0 = new THREE.Vector3(), p1 = new THREE.Vector3(), q0 = new THREE.Quaternion(), q1 = new THREE.Quaternion(), s0 = new THREE.Vector3(), s1 = new THREE.Vector3();

  function resize() {
    const w = canvas.clientWidth || canvas.width, h = canvas.clientHeight || canvas.height;
    if (w === size.w && h === size.h) return;
    size = { w, h };
    renderer.setSize(w, h, false);
    const s = Math.min(w / 1, h / aspect); // px per card unit (contain)
    ortho.left = -w / 2 / s; ortho.right = w / 2 / s; ortho.top = h / 2 / s; ortho.bottom = -h / 2 / s;
    ortho.updateProjectionMatrix();
    persp.aspect = w / h;
    persp.updateProjectionMatrix();
  }

  function pxPerUnitHost() { return Math.min(size.w, size.h / aspect); }

  function virtualAnchor(t: number): THREE.Matrix4 {
    const fov = THREE.MathUtils.degToRad(persp.fov);
    const d = (aspect * 1.25) / (0.84 * 2 * Math.tan(fov / 2));
    const enter = 1 - easeOut(t / 0.8);
    const pos = new THREE.Vector3(0, -0.12 * aspect + enter * aspect * 1.6, -d);
    const rot = new THREE.Quaternion().setFromEuler(new THREE.Euler(THREE.MathUtils.degToRad(-30), THREE.MathUtils.degToRad(10), 0));
    return new THREE.Matrix4().compose(pos, rot, new THREE.Vector3(1, 1, 1));
  }

  function assembleTarget(): THREE.Matrix4 {
    const r: Rect = opts.assembleRect ?? { x: size.w * 0.25, y: size.h * 0.1, w: size.w * 0.5, h: size.w * 0.5 * aspect };
    const fov = THREE.MathUtils.degToRad(persp.fov);
    const d = size.h / (2 * Math.tan(fov / 2) * r.w);
    const ppu = r.w;
    const x = (r.x + r.w / 2 - size.w / 2) / ppu, y = -(r.y + r.h / 2 - size.h / 2) / ppu;
    return new THREE.Matrix4().makeTranslation(x, y, -d);
  }

  function emit(i: number, phase: "lift" | "leave" | "arrive" | "settle") {
    const key = `${timeline}:${i}:${phase}`;
    if (emitted.has(key)) return;
    emitted.add(key);
    const s = fly[i];
    opts.onLayer?.({ index: i, id: s.id, phase });
  }

  function labelScale(sh: Sheet, opacity: number) {
    sh.labelMat.opacity = opacity;
    const px = 22; // label height in CSS px
    const k = (px * 2 * Math.tan(THREE.MathUtils.degToRad(persp.fov) / 2)) / Math.max(1, size.h);
    sh.label.scale.set(k * sh.labelAspect, k, 1);
  }

  function frameHost(t: number) {
    renderer.setClearColor(bg, 1);
    card.matrix.identity();
    const ppu = pxPerUnitHost();
    const breath = tilt.x === 0 && tilt.y === 0 && !opts.reduced ? Math.sin((2 * Math.PI * t) / 5) : 0;
    for (const sh of sheets) {
      const zf = sh.spec.z / zMax;
      const cap = sh.spec.role === "qr" ? 4 : 10;
      const px = opts.reduced ? 0 : Math.max(-cap, Math.min(cap, (tilt.x * 10 + breath * 1.5) * zf));
      const py = opts.reduced ? 0 : Math.max(-cap, Math.min(cap, (tilt.y * 10 + breath * 1.5) * zf));
      sh.mesh.position.set(sh.home.x + px / ppu, sh.home.y - py / ppu, 0);
      sh.mesh.scale.setScalar(1);
      sh.mat.opacity = 1;
      sh.edgeMat.opacity = 0;
      sh.labelMat.opacity = 0;
    }
    if (timeline === "connect" || timeline === "depart") {
      const k = timeline === "connect" ? 1 - clamp01(t / T.connect) : 0;
      for (const q of qrSheets) q.mat.opacity = k;
    }
    if (timeline === "depart") {
      for (const sh of sheets) {
        if (sh.order < 0) continue;
        const start = T.lead + sh.order * T.gap;
        const p = clamp01((t - start) / T.lift);
        if (p > 0) emit(sh.order, "lift");
        if (p >= 1) emit(sh.order, "leave");
        sh.mesh.position.copy(sh.home);
        sh.mat.opacity = opts.reduced ? 1 - p : 1 - easeOut(p);
        sh.mesh.scale.setScalar(opts.reduced ? 1 : 1 + 0.06 * easeOut(p));
        sh.edgeMat.opacity = 0.55 * clamp01(p * 2);
      }
    }
    if (timeline === "rebuild") {
      const n = fly.length;
      const span = T.rebuild - 0.3 - 0.5;
      for (const sh of sheets) {
        if (sh.order < 0) { sh.mat.opacity = clamp01((t - (T.rebuild - 0.3)) / 0.3); continue; }
        const j = n - 1 - sh.order; // bottom layer returns first
        const start = n > 1 ? (j * span) / (n - 1) : 0;
        const p = clamp01((t - start) / 0.5);
        sh.mesh.position.copy(sh.home);
        sh.mat.opacity = easeOut(p);
        sh.mesh.scale.setScalar(opts.reduced ? 1 : 1 + 0.06 * (1 - easeOut(p)));
        sh.edgeMat.opacity = 0.55 * (1 - clamp01(p * 2));
      }
    }
    renderer.render(scene, ortho);
  }

  function stackOffset(sh: Sheet, k: number) {
    return { z: (BASE_Z + sh.rank * GAP_Z) * k, y: sh.rank * STAIR * aspect * k };
  }

  function frameGuest(t: number) {
    if (!isFinite(at) || t < 0) { renderer.setClearColor(bg, 0); renderer.clear(); return; }
    if (timeline === "explode") {
      renderer.setClearColor(bg, 0);
      card.matrix.copy(pose ?? virtualAnchor(opts.reduced ? 1 : t));
      for (const sh of sheets) {
        if (sh.order < 0) { sh.mat.opacity = 0; sh.labelMat.opacity = 0; sh.edgeMat.opacity = 0; continue; }
        const start = T.lead + sh.order * T.gap;
        const p = clamp01((t - start) / T.lift);
        const k = opts.reduced ? (p > 0 ? 1 : 0) : backOut(p);
        const o = stackOffset(sh, k);
        sh.mesh.position.set(sh.home.x, sh.home.y + o.y, o.z);
        sh.mat.opacity = opts.reduced ? p : clamp01(p * 3);
        const c = clamp01((t - (start + T.lift + T.settle)) / T.chrome);
        if (p > 0) emit(sh.order, "lift");
        if (c > 0) emit(sh.order, "settle");
        sh.edgeMat.opacity = c;
        sh.edgeMat.dashSize = 1; sh.edgeMat.gapSize = 0;
        labelScale(sh, c);
      }
      anchorM.copy(card.matrix);
    } else if (timeline === "fly" || timeline === "assemble") {
      targetM.copy(assembleTarget());
      const pf = timeline === "fly" ? easeInOut(t / T.fly) : 1;
      anchorM.decompose(p0, q0, s0);
      targetM.decompose(p1, q1, s1);
      p0.lerp(p1, pf); q0.slerp(q1, pf); s0.lerp(s1, pf);
      card.matrix.compose(p0, q0, s0);
      renderer.setClearColor(bg, timeline === "fly" ? clamp01(t / T.fly) : 1);
      const kz = timeline === "fly" ? 1 - 0.6 * pf : 0.4 * (1 - easeOut(t / T.assemble));
      for (const sh of sheets) {
        if (sh.order < 0) { sh.mat.opacity = 0; continue; }
        const o = stackOffset(sh, kz);
        sh.mesh.position.set(sh.home.x, sh.home.y + o.y, o.z);
        sh.mat.opacity = 1;
        sh.edgeMat.opacity = timeline === "fly" ? 1 - clamp01(t / 0.4) : 0;
        labelScale(sh, timeline === "fly" ? 1 - clamp01(t / 0.4) : 0);
        if (timeline === "fly" && t > 0) emit(sh.order, "arrive");
      }
    }
    renderer.render(scene, persp);
  }

  function tick(nowMs: number) {
    if (disposed) return;
    raf = requestAnimationFrame(tick);
    resize();
    const now = seekT !== null ? seekT : nowMs;
    if (paused && seekT === null) return;
    const t = (now - at) / 1000;
    if (pending && t >= pending.end) { const r = pending; pending = null; opts.onDone?.({ timeline }); r.resolve(); }
    if (role === "host") frameHost(Math.max(0, t)); else frameGuest(t);
  }
  raf = requestAnimationFrame(tick);

  const handle: Handle & { __test?: unknown } = {
    play(next, o) {
      if (disposed) return Promise.reject(new Error("disposed"));
      if (pending) { pending.resolve(); pending = null; }
      timeline = next;
      at = o?.at ?? performance.now();
      emitted.clear();
      if (next === "idle") return new Promise<void>(() => {});
      return new Promise<void>((resolve) => { pending = { resolve, end: dur[next] }; });
    },
    setTilt(x, y) { tilt = { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) }; },
    setPose(mat) { pose = mat ? new THREE.Matrix4().fromArray(mat) : null; },
    setProjection(fovY, a) { persp.fov = fovY; persp.aspect = a; persp.updateProjectionMatrix(); },
    async replaceLayer(id, src) {
      const sh = sheets.find((s) => s.spec.id === id);
      if (!sh) return;
      const tex = await load(src);
      const old = sh.mat.map;
      sh.mat.map = tex; sh.mat.needsUpdate = true;
      old?.dispose();
    },
    where() { return { role, timeline, t: isFinite(at) ? (performance.now() - at) / 1000 : 0 }; },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      for (const sh of sheets) {
        sh.mesh.geometry.dispose(); sh.mat.map?.dispose(); sh.mat.dispose();
        sh.edge.geometry.dispose(); sh.edgeMat.dispose();
        sh.labelMat.map?.dispose(); sh.labelMat.dispose();
      }
      renderer.dispose();
    },
  };
  if (opts.test) {
    handle.__test = {
      seek(msFromAt: number) { seekT = at + msFromAt; },
      setPaused(p: boolean) { paused = p; if (!p) seekT = null; },
      info: () => renderer.info,
    };
  }
  return handle;
}
