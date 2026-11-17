// v1 beside v2: two production bundles (v1's dist/peel.js extracted from the tag peel-v1.0 into
// artifacts/tmp/v1/, and this folder's dist/peel.js), each mounted as host and as guest over the
// stand-in camera. Only the public contract is used; scripts/compare.mjs drives the page with a
// fake clock and `play(timeline, { at })`.
import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import type { Handle, LayerManifest, MountOptions, Timeline } from "../../../types";
import { FakeCamera } from "./camera";

type Module = { mount(canvas: HTMLCanvasElement, opts: MountOptions): Promise<Handle> };
const FOV = 62;
const q = new URLSearchParams(location.search);
const base = q.get("base") ?? "/examples/jane-maker/";

// A production bundle does not keep its drawing buffer, so its canvas cannot be photographed (by the
// stand-in camera or by a screenshot) once the frame has been presented. This stage asks every WebGL
// context for a preserved buffer; nothing else about the bundles is touched.
const getContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, attrs?: Record<string, unknown>) {
  return getContext.call(this, type, type === "webgl2" || type === "webgl" ? { ...attrs, preserveDrawingBuffer: true } : attrs);
} as typeof HTMLCanvasElement.prototype.getContext;

interface Side { host: Handle; guest: Handle; cam: FakeCamera }
const sides: Record<string, Side> = {};

async function side(name: string, url: string, manifest: LayerManifest): Promise<void> {
  const mod = (await import(/* @vite-ignore */ url)) as Module;
  const hc = document.querySelector<HTMLCanvasElement>(`#${name}host canvas`)!;
  const cc = document.querySelector<HTMLCanvasElement>(`#${name}guest canvas.cam`)!;
  const gc = document.querySelector<HTMLCanvasElement>(`#${name}guest canvas.fx`)!;
  const common = { layers: manifest, baseUrl: base, quality: "high", reduced: false } as const;
  const [host, guest] = await Promise.all([mod.mount(hc, { ...common, role: "host" }), mod.mount(gc, { ...common, role: "guest" })]);
  const cam = new FakeCamera(cc, hc, manifest.card.h / manifest.card.w);
  const aspect = gc.clientWidth / gc.clientHeight;
  guest.setProjection(FOV, aspect);
  cam.setProjection(FOV, aspect);
  sides[name] = { host, guest, cam };
}

const compare = {
  ready: null as Promise<void> | null,
  /** Pose of the card for both guests (degrees, card widths), or null for the unanchored view. */
  setPose(yaw: number | null, pitch = 0, dist = 5.6): void {
    const m = yaw === null ? null : new Float32Array(new Matrix4().compose(
      new Vector3(0, 0, -dist), new Quaternion().setFromEuler(new Euler((pitch * Math.PI) / 180, (yaw * Math.PI) / 180, 0, "XYZ")), new Vector3(1, 1, 1),
    ).elements);
    for (const s of Object.values(sides)) { s.guest.setPose(m); s.cam.setPose(m); }
  },
  /** Starts both roles of both versions so that the next frame, at `frameAt`, shows timeline time t. */
  seek(h: [Timeline, number], g: [Timeline, number], frameAt: number): void {
    for (const s of Object.values(sides)) {
      void s.host.play(h[0], { at: frameAt - h[1] * 1000 });
      void s.guest.play(g[0], { at: frameAt - g[1] * 1000 });
    }
  },
};
(window as unknown as { compare: typeof compare }).compare = compare;

compare.ready = (async () => {
  const manifest = (await (await fetch(base + "layers.json")).json()) as LayerManifest;
  await side("v1", q.get("v1") ?? "/artifacts/tmp/v1/peel.js", manifest);
  await side("v2", q.get("v2") ?? "/dist/peel.js", manifest);
  compare.setPose(0, 0, 4.2);
  // The stand-in cameras photograph the host canvases every frame. This loop is registered after
  // the effects' own loops and therefore runs after them.
  const loop = (ts: number): void => {
    (window as unknown as { rafSkew: number }).rafSkew = ts - performance.now();
    requestAnimationFrame(loop);
    for (const s of Object.values(sides)) s.cam.render();
  };
  requestAnimationFrame(loop);
})();
