// Viewer relay (contract v1.2): the anchored guest sends its camera position in card space to the
// host through the room; the host predicts it forward to "now" and feeds it to the effect's setViewer.
import type { RoomClient } from "./room";
import type { Handle } from "../../../packages/scene/types";

/** Camera position in card space from the card's pose in camera space (4x4 column-major): -Rᵀt. */
export function eyeFromPose(m: Float32Array): [number, number, number] {
  const [tx, ty, tz] = [m[12], m[13], m[14]];
  return [-(m[0] * tx + m[1] * ty + m[2] * tz), -(m[4] * tx + m[5] * ty + m[6] * tz), -(m[8] * tx + m[9] * ty + m[10] * tz)];
}

/** Guest side: throttled sender (about 30 per second). */
export function viewerSender(room: RoomClient, id: string) {
  let last = 0;
  return {
    pose(m: Float32Array) {
      const now = performance.now();
      if (now - last < 33) return;
      last = now;
      const e = eyeFromPose(m);
      room.send({ type: "viewer", id, eye: e.map((v) => Math.round(v * 1e4) / 1e4), at: room.serverNow() });
    },
    stop() { room.send({ type: "viewer", id, eye: null, at: room.serverNow() }); },
  };
}

type Sample = { e: [number, number, number]; t: number };
const MAX_AHEAD = 120; // ms of prediction at most
const STALE = 300; // ms without a sample → no viewer

/** Host side: keeps the last two samples and drives setViewer every frame while samples are fresh. */
export function viewerReceiver(room: RoomClient, scene: Handle, isGuest: (id: string) => boolean) {
  const set = scene.setViewer?.bind(scene);
  if (!set) return { reset() {} };
  let a: Sample | null = null, b: Sample | null = null, raf = 0;
  const out = new Float32Array(3);
  const stats = { samples: 0, frames: 0, last: [0, 0, 0] as number[] };
  (window as any).__viewer = stats; // read by checks/e2e.mjs
  const clear = () => { a = b = null; cancelAnimationFrame(raf); raf = 0; set(null); };
  const tick = () => {
    if (!b) return clear();
    const now = performance.now();
    if (now - b.t > STALE) return clear();
    let ahead = Math.min(now - b.t, MAX_AHEAD);
    const dt = a ? b.t - a.t : 0;
    for (let i = 0; i < 3; i++) out[i] = b.e[i] + (a && dt > 10 && dt < 200 ? ((b.e[i] - a.e[i]) / dt) * ahead : 0);
    set(out);
    stats.frames++; stats.last = Array.from(out, (v) => Math.round(v * 100) / 100);
    raf = requestAnimationFrame(tick);
  };
  room.on("viewer", (m) => {
    if (!isGuest(m.id)) return;
    if (!m.eye) return clear();
    stats.samples++;
    a = b;
    b = { e: m.eye, t: room.toLocal(m.at) };
    if (!raf) raf = requestAnimationFrame(tick);
  });
  return { reset: clear };
}
