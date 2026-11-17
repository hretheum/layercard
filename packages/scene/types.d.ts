// Scene module contract v1.2 — see CONTRACT.md.

export type Role = "host" | "guest";
export type Timeline = "idle" | "connect" | "depart" | "rebuild" | "explode" | "fly" | "assemble";
export type Quality = "high" | "mid" | "low" | "test";

export interface Rect { x: number; y: number; w: number; h: number }

export interface LayerSpec {
  id: string;
  name: string;
  role?: "qr";
  src: string;
  z: number;
  rect: Rect;
  label?: string;
  dims?: string;
}

export interface LayerManifest {
  card: { w: number; h: number; unit: "px"; background: string };
  layers: LayerSpec[];
}

export interface LayerEvent { index: number; id: string; phase: "lift" | "leave" | "arrive" | "settle" }

export interface MountOptions {
  role: Role;
  layers: LayerManifest;
  baseUrl: string;
  quality: Quality;
  reduced: boolean;
  safeRects?: Rect[];
  assembleRect?: Rect;
  test?: boolean;
  onLayer?(e: LayerEvent): void;
  onDone?(e: { timeline: Timeline }): void;
  onLost?(message: string): void;
}

export interface Handle {
  play(timeline: Timeline, o?: { at?: number }): Promise<void>;
  setTilt(x: number, y: number): void;
  setPose(m: Float32Array | null): void;
  /** v1.2, host, optional: the anchored guest camera's position in card space, or null. */
  setViewer?(eye: Float32Array | null): void;
  setProjection(fovY: number, aspect: number): void;
  replaceLayer(id: string, src: string): Promise<void>;
  where(): { role: Role; timeline: Timeline; t: number };
  dispose(): void;
}

export interface SceneModule {
  supported(): Promise<boolean>;
  durations(layers: LayerManifest): Record<Timeline, number>;
  mount(canvas: HTMLCanvasElement, opts: MountOptions): Promise<Handle>;
}
