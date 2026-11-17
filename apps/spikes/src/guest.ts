// Tracking spike, guest side: rear camera, ArUco detection, homography pose, test stack overlay, stats.
import * as THREE from "three";
import { CARD_ASPECT, markerCornersCardUnits, params, slotsFor } from "./layout";
import { homography, OneEuro, poseFromHomography } from "./pose";

declare const AR: any;

const p = params();
const $ = (id: string) => document.getElementById(id)!;
const stage = $("stage") as HTMLDivElement;
const video = $("v") as HTMLVideoElement;
const gl = $("gl") as HTMLCanvasElement;
const dbg = $("dbg") as HTMLCanvasElement;
const stats = $("stats");
const dctx = dbg.getContext("2d")!;

const slots = slotsFor(p);
const cardPts = new Map(slots.map((s) => [s.id, markerCornersCardUnits(s)]));
const detector = new AR.Detector({ dictionaryName: "ARUCO_4X4_1000" });
const filters = new Map<string, OneEuro>();
const filt = (key: string, v: number, t: number) => {
  let f = filters.get(key);
  if (!f) { f = new OneEuro(1.2, 0.02, 1.0); filters.set(key, f); }
  return f.filter(v, t);
};

// three.js overlay
const renderer = new THREE.WebGLRenderer({ canvas: gl, alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(p.fov, 9 / 16, 0.01, 100);
const group = new THREE.Group();
group.matrixAutoUpdate = false;
group.visible = false;
scene.add(group);
const outline = new THREE.LineLoop(
  new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.5, CARD_ASPECT / 2, 0), new THREE.Vector3(0.5, CARD_ASPECT / 2, 0),
    new THREE.Vector3(0.5, -CARD_ASPECT / 2, 0), new THREE.Vector3(-0.5, -CARD_ASPECT / 2, 0),
  ]),
  new THREE.LineBasicMaterial({ color: 0x2f80ff }),
);
group.add(outline);
const colors = [0x1b2230, 0x5b8cff, 0xff6a3d, 0xf4f6f8, 0xa9b1bc, 0x7fe3c2];
for (let i = 0; i < 6; i++) {
  const w = 0.92, h = CARD_ASPECT * 0.92;
  const slab = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ color: colors[i], transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }),
  );
  slab.position.set(0, i * 0.035 * CARD_ASPECT, 0.08 + i * 0.11);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(slab.geometry), new THREE.LineBasicMaterial({ color: 0x2f80ff }));
  slab.add(edges);
  group.add(slab);
}

// state and metrics
let vw = 0, vh = 0, f = 1, pw = 0, ph = 0, procScale = 1;
const proc = document.createElement("canvas");
const pctx = proc.getContext("2d", { willReadFrequently: true })!;
let camStart = 0, lockAt = 0, lastSeen = 0;
const detectMs: number[] = [];
const tracked: boolean[] = [];
const tbuf: number[][] = [];
let frames = 0, fps = 0, fpsT = performance.now(), lastStats = 0, markersSeen = 0, distMm = 0;

function layout() {
  if (!vw) return;
  const W = window.innerWidth, H = window.innerHeight;
  const s = Math.max(W / vw, H / vh);
  const w = vw * s, h = vh * s;
  Object.assign(stage.style, { width: `${w}px`, height: `${h}px`, left: `${(W - w) / 2}px`, top: `${(H - h) / 2}px` });
  renderer.setSize(w, h, false);
  dbg.width = Math.round(w); dbg.height = Math.round(h);
  camera.aspect = vw / vh;
  camera.fov = p.fov;
  camera.updateProjectionMatrix();
  f = (vh / 2) / Math.tan((p.fov * Math.PI) / 360);
}

async function start() {
  $("start").style.display = "none";
  const big = p.res >= 1080;
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: { ideal: "environment" }, width: { ideal: big ? 1920 : 1280 }, height: { ideal: big ? 1080 : 720 } },
  });
  video.srcObject = stream;
  await video.play();
  vw = video.videoWidth; vh = video.videoHeight;
  procScale = Math.min(1, p.proc / Math.max(vw, vh));
  pw = Math.round(vw * procScale); ph = Math.round(vh * procScale);
  proc.width = pw; proc.height = ph;
  camStart = performance.now();
  layout();
  requestAnimationFrame(loop);
}

function loop(now: number) {
  requestAnimationFrame(loop);
  const t0 = performance.now();
  pctx.drawImage(video, 0, 0, pw, ph);
  const markers = detector.detect(pctx.getImageData(0, 0, pw, ph));
  detectMs.push(performance.now() - t0);
  if (detectMs.length > 120) detectMs.shift();

  const src: [number, number][] = [], dst: [number, number][] = [];
  dctx.clearRect(0, 0, dbg.width, dbg.height);
  const kx = dbg.width / vw, ky = dbg.height / vh;
  markersSeen = 0;
  const seen = new Set<number>();
  for (const m of markers) {
    const pts = cardPts.get(m.id);
    if (!pts || seen.has(m.id)) continue;
    seen.add(m.id);
    markersSeen++;
    dctx.strokeStyle = "#3DDC97"; dctx.lineWidth = 2; dctx.beginPath();
    m.corners.forEach((c: any, k: number) => {
      const x = filt(`${m.id}:${k}:x`, c.x / procScale, now), y = filt(`${m.id}:${k}:y`, c.y / procScale, now);
      src.push(pts[k]); dst.push([x, y]);
      if (k === 0) dctx.moveTo(x * kx, y * ky); else dctx.lineTo(x * kx, y * ky);
    });
    dctx.closePath(); dctx.stroke();
  }

  let ok = false;
  if (dst.length >= 4) {
    const H = homography(src, dst);
    const pose = H && poseFromHomography(H, f, vw / 2, vh / 2);
    if (pose) {
      group.matrix.fromArray(pose);
      group.matrixWorldNeedsUpdate = true;
      group.visible = true;
      ok = true;
      lastSeen = now;
      if (!lockAt) lockAt = now - camStart;
      tbuf.push([pose[12], pose[13], pose[14]]);
      if (tbuf.length > 30) tbuf.shift();
      distMm = Math.hypot(pose[12], pose[13], pose[14]) * 70;
    }
  }
  if (!ok && now - lastSeen > 300) { group.visible = false; filters.clear(); tbuf.length = 0; }
  tracked.push(ok);
  if (tracked.length > 300) tracked.shift();
  renderer.render(scene, camera);

  frames++;
  if (now - fpsT >= 1000) { fps = (frames * 1000) / (now - fpsT); frames = 0; fpsT = now; }
  if (now - lastStats > 250) { lastStats = now; stats.textContent = report(true); }
}

function pct(a: number[], q: number) { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : 0; }
function jitterMm() {
  if (tbuf.length < 10) return 0;
  const m = [0, 1, 2].map((i) => tbuf.reduce((a, v) => a + v[i], 0) / tbuf.length);
  const v = tbuf.reduce((a, t) => a + (t[0] - m[0]) ** 2 + (t[1] - m[1]) ** 2 + (t[2] - m[2]) ** 2, 0) / tbuf.length;
  return Math.sqrt(v) * 70;
}
function summary() {
  return {
    ua: navigator.userAgent, video: `${vw}x${vh}`, proc: `${pw}x${ph}`, size: p.size, fov: p.fov,
    lockMs: Math.round(lockAt), detectP50: +pct(detectMs, 0.5).toFixed(1), detectP95: +pct(detectMs, 0.95).toFixed(1),
    fps: +fps.toFixed(1), trackedPct: Math.round((100 * tracked.filter(Boolean).length) / Math.max(1, tracked.length)),
    markersSeen, distanceMm: Math.round(distMm), jitterMm: +jitterMm().toFixed(1),
  };
}
function report(short: boolean) {
  const s = summary();
  if (short) return `lock ${s.lockMs || "…"} ms · detect ${s.detectP50}/${s.detectP95} ms · ${s.fps} fps\n` +
    `tracked ${s.trackedPct}% · markers ${s.markersSeen}/4 · ≈${s.distanceMm} mm · jitter ${s.jitterMm} mm\n` +
    `video ${s.video} · proc ${s.proc} · size ${s.size}`;
  return JSON.stringify(s);
}

$("start").addEventListener("click", () => { start().catch((e) => { stats.textContent = `camera error: ${e?.message ?? e}`; }); });
$("copy").addEventListener("click", async () => {
  const text = report(false);
  try { await navigator.clipboard.writeText(text); $("copy").textContent = "copied"; } catch { prompt("Copy results", text); }
});
$("reset").addEventListener("click", () => { lockAt = 0; camStart = performance.now(); detectMs.length = 0; tracked.length = 0; });
window.addEventListener("resize", layout);
