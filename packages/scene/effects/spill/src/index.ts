// @layercard/effect-spill — scene module contract v1.1 (packages/scene/CONTRACT.md).
import type { Handle, LayerManifest, MountOptions, Timeline } from "../../../types";
import { mountEffect } from "./effect";
import { plan } from "./schedule";

/** Cheap capability check: a WebGL2 context can be created and the font / frame APIs exist. */
export async function supported(): Promise<boolean> {
  try {
    if (typeof FontFace === "undefined" || typeof requestAnimationFrame !== "function") return false;
    const c: HTMLCanvasElement | OffscreenCanvas =
      typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(1, 1) : document.createElement("canvas");
    const gl = c.getContext("webgl2") as WebGL2RenderingContext | null;
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/** Seconds per timeline for this manifest. Pure; `idle` is 0 because it loops. */
export function durations(layers: LayerManifest): Record<Timeline, number> {
  return { ...plan(layers).dur };
}

/** Mounts the effect on the given canvas. Rejects when WebGL2 is missing or a layer image cannot load. */
export function mount(canvas: HTMLCanvasElement, opts: MountOptions): Promise<Handle> {
  if (!opts || (opts.role !== "host" && opts.role !== "guest")) return Promise.reject(new Error("spill: opts.role must be host or guest"));
  if (!opts.layers || !Array.isArray(opts.layers.layers) || opts.layers.layers.length === 0) {
    return Promise.reject(new Error("spill: opts.layers is not a layer manifest"));
  }
  return mountEffect(canvas, opts);
}
