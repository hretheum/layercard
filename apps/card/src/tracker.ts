// Guest-side tracking of the host screen: rear camera, ArUco detection in a worker, region-of-interest
// refinement at native resolution once the marker is found, One Euro smoothing, planar pose.
import { homography, OneEuro, poseFromHomography } from "./pose";

export interface TrackInfo { locked: boolean; sidePx: number; detectMs: number }

const BASE = import.meta.env.BASE_URL;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export class Tracker {
  private stream: MediaStream | null = null;
  private worker: Worker | null = null;
  private busy = false;
  private seq = 0;
  private raf = 0;
  private stopped = false;
  private grab = document.createElement("canvas");
  private gctx = this.grab.getContext("2d", { willReadFrequently: true })!;
  private filters = new Map<string, OneEuro>();
  private box: { x0: number; y0: number; x1: number; y1: number } | null = null;
  private lastSeen = -1e9;
  vw = 0; vh = 0; f = 1;

  constructor(
    private video: HTMLVideoElement,
    private cardCorners: [number, number][],
    private markerId: number,
    private onPose: (m: Float32Array | null, info: TrackInfo) => void,
    private longSideFov = 70,
  ) {}

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
    });
    const v = this.video;
    v.muted = true; v.playsInline = true;
    v.srcObject = this.stream;
    await v.play();
    this.vw = v.videoWidth; this.vh = v.videoHeight;
    this.f = Math.max(this.vw, this.vh) / 2 / Math.tan((this.longSideFov * Math.PI) / 360);
    this.worker = new Worker(`${BASE}tracker-worker.js`);
    this.worker.onmessage = (e) => this.onResult(e.data);
    this.raf = requestAnimationFrame(this.step);
  }

  /** Projection for a canvas of W×H CSS px that shows the video with object-fit: cover. */
  projection(W: number, H: number) {
    const s = Math.max(W / this.vw, H / this.vh);
    const visibleH = H / s;
    return { fovY: (2 * Math.atan(visibleH / 2 / this.f) * 180) / Math.PI, aspect: W / H };
  }

  private step = () => {
    if (this.stopped) return;
    this.raf = requestAnimationFrame(this.step);
    if (this.busy || !this.worker || this.video.readyState < 2) return;
    const { vw, vh } = this;
    let sx = 0, sy = 0, sw = vw, sh = vh, target = 720;
    if (this.box && performance.now() - this.lastSeen < 600) {
      const cx = (this.box.x0 + this.box.x1) / 2, cy = (this.box.y0 + this.box.y1) / 2;
      const half = Math.max(1.3 * Math.max(this.box.x1 - this.box.x0, this.box.y1 - this.box.y0), 160);
      sx = clamp(Math.round(cx - half), 0, vw - 1); sy = clamp(Math.round(cy - half), 0, vh - 1);
      sw = clamp(Math.round(2 * half), 1, vw - sx); sh = clamp(Math.round(2 * half), 1, vh - sy);
      target = 640;
    }
    const scale = Math.max(1, Math.max(sw, sh) / target);
    const dw = Math.max(1, Math.round(sw / scale)), dh = Math.max(1, Math.round(sh / scale));
    if (this.grab.width !== dw || this.grab.height !== dh) { this.grab.width = dw; this.grab.height = dh; }
    this.gctx.drawImage(this.video, sx, sy, sw, sh, 0, 0, dw, dh);
    const img = this.gctx.getImageData(0, 0, dw, dh);
    this.busy = true;
    this.worker.postMessage({ seq: ++this.seq, width: dw, height: dh, buffer: img.data.buffer, ox: sx, oy: sy, scale }, [img.data.buffer]);
  };

  private filt(key: string, v: number, t: number) {
    let f = this.filters.get(key);
    if (!f) { f = new OneEuro(1.0, 0.015, 1.0); this.filters.set(key, f); }
    return f.filter(v, t);
  }

  private onResult(d: { markers: { id: number; corners: [number, number][] }[]; ms: number }) {
    this.busy = false;
    if (this.stopped) return;
    const now = performance.now();
    const m = d.markers.find((x) => x.id === this.markerId);
    if (m) {
      const dst = m.corners.map(([x, y], k) => [this.filt(`${k}x`, x, now), this.filt(`${k}y`, y, now)] as [number, number]);
      const xs = m.corners.map((c) => c[0]), ys = m.corners.map((c) => c[1]);
      this.box = { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
      this.lastSeen = now;
      const side = (Math.hypot(xs[1] - xs[0], ys[1] - ys[0]) + Math.hypot(xs[2] - xs[1], ys[2] - ys[1])) / 2;
      const H = homography(this.cardCorners, dst);
      const pose = H && poseFromHomography(H, this.f, this.vw / 2, this.vh / 2);
      this.onPose(pose ?? null, { locked: !!pose, sidePx: side, detectMs: d.ms });
    } else if (now - this.lastSeen > 400) {
      this.box = null;
      this.filters.clear();
      this.onPose(null, { locked: false, sidePx: 0, detectMs: d.ms });
    }
  }

  stop() {
    this.stopped = true;
    cancelAnimationFrame(this.raf);
    this.worker?.terminate();
    this.stream?.getTracks().forEach((t) => t.stop());
  }
}
