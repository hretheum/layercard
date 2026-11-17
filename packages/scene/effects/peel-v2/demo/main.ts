// Demo with test-only controls: host and guest side by side, every timeline, "play all", tilt,
// a draggable fake pose, pose jitter, pose-null, quality and reduced switches. Also the stage the artifact
// script drives (window.demo).
import type { LayerManifest, Rect, Timeline } from "../../../types";
import { durations, mount } from "../src/index";
import type { PeelHandle } from "../src/effect";
import { FakeCamera } from "./camera";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
// the card: the shared example, or another folder the dev server serves (see PEEL_CONTENT_DIR in vite.config.ts)
const base = new URLSearchParams(location.search).get("base") ?? "/examples/jane-maker/";
const FOV = 62;
const INSET: Rect = { x: 35, y: 70, w: 320, h: 692 };
const SAFE: Rect[] = [{ x: 97.5, y: 640, w: 195, h: 195 }];

const q = new URLSearchParams(location.search);
const st = {
  quality: (q.get("quality") ?? "high") as "high" | "mid" | "low" | "test",
  reduced: q.get("reduced") === "1",
  poseOn: q.get("pose") !== "null",
  // v2: the landing is the page (full-bleed assembleRect); inset=1 gives v1's centred smaller rect
  inset: q.get("inset") === "1",
  safe: q.get("safe") === "1",
  yaw: -14, pitch: 9, dist: 5.6, roll: 0,
  // a hand-held phone: the fake pose shakes by 1.5 CSS px on the guest screen, 30 times a second
  jitter: q.get("jitter") === "1",
};

let manifest: LayerManifest;
let host: PeelHandle, guest: PeelHandle, cam: FakeCamera;
let D: Record<Timeline, number>;
let raf = 0;
const log = (s: string) => { const el = $("log"); el.textContent = (s + "\n" + el.textContent).split("\n").slice(0, 8).join("\n"); };

let jitterSeed = 12345, jitterX = 0, jitterY = 0, jitterTimer = 0;
function pose(): Float32Array | null {
  return st.poseOn ? guest.test!.fakePose(st.yaw, st.pitch, st.dist, st.roll, jitterX, jitterY) : null;
}

/** Starts or stops the jitter: every 1/30 s a new direction (fixed sequence), 1.5 CSS px on the guest screen. */
function setJitter(on: boolean): void {
  st.jitter = on;
  clearInterval(jitterTimer);
  jitterX = jitterY = 0;
  if (on) {
    jitterTimer = window.setInterval(() => {
      jitterSeed = (jitterSeed * 1664525 + 1013904223) >>> 0;
      const a = (jitterSeed / 4294967296) * Math.PI * 2;
      const gc = $<HTMLCanvasElement>("guest");
      const unitsPerPx = (2 * st.dist * Math.tan((FOV * Math.PI) / 360)) / gc.clientHeight;
      jitterX = Math.cos(a) * 1.5 * unitsPerPx;
      jitterY = Math.sin(a) * 1.5 * unitsPerPx;
      applyPose();
    }, 1000 / 30);
  }
  applyPose();
}

function applyPose(): void {
  const p = pose();
  guest.setPose(p);
  cam.setPose(p);
}

function freshCanvas(id: string): HTMLCanvasElement {
  const old = $<HTMLCanvasElement>(id), c = document.createElement("canvas");
  c.id = id;
  old.replaceWith(c);
  return c;
}

async function remount(): Promise<void> {
  cancelAnimationFrame(raf);
  host?.dispose();
  guest?.dispose();
  cam?.dispose();
  const hc = freshCanvas("host"), cc = freshCanvas("cam"), gc = freshCanvas("guest");
  const common = { layers: manifest, baseUrl: base, quality: st.quality, reduced: st.reduced, test: true } as const;
  [host, guest] = (await Promise.all([
    mount(hc, { ...common, role: "host", safeRects: st.safe ? SAFE : undefined, onLayer: (e) => log(`host ${e.phase} ${e.id}`), onDone: (e) => log(`host done ${e.timeline}`) }),
    mount(gc, { ...common, role: "guest", assembleRect: st.inset ? INSET : undefined, onLayer: (e) => log(`guest ${e.phase} ${e.id}`), onDone: (e) => log(`guest done ${e.timeline}`) }),
  ])) as [PeelHandle, PeelHandle];
  cam = new FakeCamera(cc, hc, manifest.card.h / manifest.card.w);
  const aspect = gc.clientWidth / gc.clientHeight;
  guest.setProjection(FOV, aspect);
  cam.setProjection(FOV, aspect);
  applyPose();
  D = durations(manifest);
  const loop = () => { raf = requestAnimationFrame(loop); cam.render(); };
  loop();
}

async function playAll(): Promise<void> {
  await host.play("connect");
  const at = performance.now() + 80;
  await Promise.all([host.play("depart", { at }), guest.play("explode", { at })]);
  await guest.play("fly");
  await guest.play("assemble");
  await host.play("rebuild");
  void host.play("idle");
}

/** Whole sequence as one clock, for contact sheets and the video (needs paused effects). */
const SEQ: { name: string; len: () => number; h: [Timeline, number]; g: [Timeline, number] | null }[] = [
  { name: "idle", len: () => 1.2, h: ["idle", 0], g: null },
  { name: "connect", len: () => D.connect, h: ["connect", 0], g: null },
  { name: "depart / explode", len: () => D.depart, h: ["depart", 0], g: ["explode", 0] },
  { name: "fly", len: () => D.fly, h: ["depart", 1e3], g: ["fly", 0] },
  { name: "assemble", len: () => D.assemble, h: ["depart", 1e3], g: ["assemble", 0] },
  { name: "rebuild", len: () => D.rebuild, h: ["rebuild", 0], g: ["assemble", 1e3] },
  { name: "idle", len: () => 1.0, h: ["idle", 0], g: ["assemble", 1e3] },
];

const demo = {
  ready: null as Promise<void> | null,
  st,
  get host() { return host; },
  get guest() { return guest; },
  get total() { return SEQ.reduce((a, s) => a + s.len(), 0); },
  durations: () => D,
  pause(p: boolean) { host.test!.setPaused(p); guest.test!.setPaused(p); },
  setPose(yaw: number | null, pitch = 0, dist = 5.6, roll = 0) {
    st.poseOn = yaw !== null;
    if (yaw !== null) { st.yaw = yaw; st.pitch = pitch; st.dist = dist; st.roll = roll; }
    applyPose();
  },
  setTilt(x: number, y: number) { host.setTilt(x, y); },
  setJitter,
  /** Seek both roles; `g` null leaves the guest blank (explode at 0). Renders the fake camera too. */
  seek(h: [Timeline, number], g: [Timeline, number] | null) {
    host.test!.seek(h[0], h[1]);
    guest.test!.seek(g ? g[0] : "explode", g ? g[1] : 0);
    cam.render();
  },
  /** Seek the whole sequence to time T (seconds). Returns the segment name. */
  seq(T: number): string {
    let t = Math.max(0, T);
    for (const s of SEQ) {
      const len = s.len();
      if (t <= len || s === SEQ[SEQ.length - 1]) {
        demo.seek([s.h[0], s.h[1] + t], s.g ? [s.g[0], s.g[1] + t] : null);
        return s.name;
      }
      t -= len;
    }
    return "";
  },
  remount,
};
(window as unknown as { demo: typeof demo }).demo = demo;

function bind(): void {
  $("playAll").onclick = () => void playAll();
  $("reset").onclick = () => void remount();
  document.querySelectorAll<HTMLButtonElement>("button[data-h]").forEach((b) => (b.onclick = () => void host.play(b.dataset.h as Timeline)));
  document.querySelectorAll<HTMLButtonElement>("button[data-g]").forEach((b) => (b.onclick = () => void guest.play(b.dataset.g as Timeline)));
  const tilt = () => host.setTilt(+$<HTMLInputElement>("tiltX").value, +$<HTMLInputElement>("tiltY").value);
  $("tiltX").oninput = tilt;
  $("tiltY").oninput = tilt;
  const chk = (id: string, key: "reduced" | "inset" | "safe", re = true) => {
    const el = $<HTMLInputElement>(id);
    el.checked = st[key];
    el.onchange = () => { st[key] = el.checked; if (re) void remount(); };
  };
  chk("reduced", "reduced");
  chk("inset", "inset");
  chk("safe", "safe");
  const jt = $<HTMLInputElement>("jitter");
  jt.checked = st.jitter;
  jt.onchange = () => setJitter(jt.checked);
  const pn = $<HTMLInputElement>("poseNull");
  pn.checked = !st.poseOn;
  pn.onchange = () => { st.poseOn = !pn.checked; applyPose(); };
  const ql = $<HTMLSelectElement>("quality");
  ql.value = st.quality;
  ql.onchange = () => { st.quality = ql.value as typeof st.quality; void remount(); };
  const gp = $("guestPhone");
  let drag: { x: number; y: number; yaw: number; pitch: number } | null = null;
  gp.onpointerdown = (e) => { drag = { x: e.clientX, y: e.clientY, yaw: st.yaw, pitch: st.pitch }; gp.setPointerCapture(e.pointerId); };
  gp.onpointermove = (e) => {
    if (!drag) return;
    st.yaw = Math.max(-60, Math.min(60, drag.yaw + (e.clientX - drag.x) * 0.25));
    st.pitch = Math.max(-60, Math.min(60, drag.pitch + (e.clientY - drag.y) * 0.25));
    applyPose();
  };
  gp.onpointerup = () => { drag = null; };
  gp.onwheel = (e) => { e.preventDefault(); st.dist = Math.max(2.5, Math.min(12, st.dist + e.deltaY * 0.004)); applyPose(); };
}

demo.ready = (async () => {
  manifest = (await (await fetch(base + "layers.json")).json()) as LayerManifest;
  bind();
  await remount();
  if (st.jitter) setJitter(true);
})();
