# Scene module contract (v1.2)

Every effect in `packages/scene/effects/<name>/` implements this contract. The shell (`apps/card`) owns
everything outside the canvas: camera, tracking, network rooms, sensors, DOM UI, sharing, contact.
An effect only draws. If you change this file, bump the version and say why in the build log.

**v1.2 (2026-11-15)** — one optional host input: `setViewer`, the anchored guest camera's position in
card space, relayed by the shell from the guest's pose (for effects that render the host screen for the
guest's eye). Effects without it are unchanged; the shell calls it only when the effect has it.

**v1.1 (2026-11-15)** — clarifications from the peel v1 report, no breaking change; an effect written
for v1 still satisfies v1.1. New: the pose camera convention, the exact flat reference, at most four
`safeRects`, `assembleRect` may extend past the canvas, the `setProjection` aspect, the `onLayer`
phases, and an effect may keep short history for its selection chrome (labels), never for sheets.

## Exports

```ts
export function supported(): Promise<boolean>;
// Cheap capability check: WebGL2 context creatable, required extensions present.
// No scene, no heavy assets, no textures.

export function durations(layers: LayerManifest): Record<Timeline, number>;
// Seconds per timeline for this manifest. Pure and deterministic; `idle` is reported as 0 (it loops).
// The shell uses it to schedule the next timeline and to keep host and guest aligned.

export function mount(canvas: HTMLCanvasElement, opts: MountOptions): Promise<Handle>;
// Rejects when the required API is missing. No fallback renderer.
```

## Roles and timelines

| Role | Timeline | What it shows | Ends in |
|---|---|---|---|
| host | `idle` | The card, flat and whole, gently breathing with tilt. Loops. | — |
| host | `connect` | The QR layer (role `qr`) dissolves; the card is otherwise still. | card without QR |
| host | `depart` | Layers leave the screen one by one; each leaves its outline behind. | outlines only |
| host | `rebuild` | Layers return and re-form the card. | frame equal to `idle` frame zero |
| guest | `explode` | Same event as host `depart`, seen from the guest camera: layers lift off the host screen into a hovering exploded stack (anchored to the pose, or unanchored when pose is null). | full stack hovering, chrome drawn |
| guest | `fly` | The stack leaves the air and comes into the guest screen; the canvas becomes opaque by the end. | layers in screen space |
| guest | `assemble` | Layers re-form the card flat, face-on, exactly inside `assembleRect`. | frame equal to the flat composite in `assembleRect` |

Layers with role `qr` take part only in `idle`, `connect` and `rebuild`; they never fly.

Host `depart` and guest `explode` share one per-layer schedule: layer *i* leaves the host screen at the
same moment it lifts in the guest view, when both are started with the same `at`. Host and guest always
run the same effect build; the shell guarantees it.

## MountOptions

```ts
interface MountOptions {
  role: "host" | "guest";
  layers: LayerManifest;            // see below
  baseUrl: string;                  // resolves layer src paths
  quality: "high" | "mid" | "low" | "test";
  reduced: boolean;                 // prefers-reduced-motion: calm fades, no camera moves, no tilt parallax
  safeRects?: Rect[];               // host: at most 4 canvas CSS-px rects the scene must never draw over (tracking marker)
  assembleRect?: Rect;              // guest: canvas CSS-px rect where the card lands at the end of `assemble`;
                                    // may extend past the canvas (the page shows the card full-bleed, so on
                                    // screens shorter than the card the rect runs below the bottom edge)
  test?: boolean;                   // test hooks exist only when true
  onLayer?(e: { index: number; id: string; phase: "lift" | "leave" | "arrive" | "settle" }): void;
  onDone?(e: { timeline: Timeline }): void;
  onLost?(message: string): void;   // context lost or fatal error
}
interface Rect { x: number; y: number; w: number; h: number }
```

`onLayer` phases: host `depart` → `leave` when a layer starts leaving; guest `explode` → `lift` when it
starts lifting and `settle` when it comes to rest in the stack; guest `assemble` and host `rebuild` →
`arrive` when it reaches its flat place.

## Handle

```ts
interface Handle {
  play(timeline: Timeline, o?: { at?: number }): Promise<void>;
  // `at` is a time in this device's performance.now() domain (the shell converts room time).
  // Default: now. Resolves when the timeline ends (never for `idle`).
  setTilt(x: number, y: number): void;          // host: device tilt, each in [-1, 1]; 0,0 when unknown
  setPose(m: Float32Array | null): void;        // guest: 4x4 column-major pose of the card plane in camera space
  setViewer?(eye: Float32Array | null): void;   // host, optional (v1.2): the anchored guest camera's position
                                                 // in card space, [x, y, z] in card units (+Z out of the
                                                 // screen towards the viewer); null when no guest is anchored
  setProjection(fovY: number, aspect: number): void; // guest: vertical field of view in degrees and the
                                                 // aspect (width / height) of the canvas, for the
                                                 // camera image as it is shown behind the canvas
  replaceLayer(id: string, src: string): Promise<void>; // swap one layer image (e.g. a fresh QR for the next guest)
                                                 // without a visible jump; a 150 ms crossfade is allowed
  where(): { role: Role; timeline: Timeline; t: number };
  dispose(): void;                               // idempotent; frees GPU resources, rAF, listeners; remount allowed
}
```

Viewer (v1.2): the shell inverts the anchored guest's smoothed pose, sends the camera position to the
host through the room about 30 times a second, and predicts it forward by the measured delay, so the
eye the host receives is the shell's best estimate of where the guest camera is now. Typical range:
z 4–9 card units (30–60 cm for a 7 cm wide card), up to about 35° off the normal. When updates stop
for 300 ms or the guest loses tracking the shell sends null. The effect may ease the eye lightly
(at most 0.1 s) and must ease any switch between a viewer and none.

Pose units: the card plane has width 1.0 (card units), origin at the card centre, +X right, +Y up,
+Z out of the host screen towards the viewer. Camera space follows the OpenGL / Three.js convention:
camera at the origin looking down −Z, +Y up. Smoothing of the pose happens in the shell; the effect gets
a smoothed pose and may add only light interpolation.

## Flat reference

"Pixel-identical to the flat card" means: the card fitted *contain*, centred, without rounding, into the
canvas (host) or into `assembleRect` (guest); each layer drawn in z order with 2D-canvas `drawImage`,
`imageSmoothingQuality = "high"`, at its absolute position; the card `background` colour under all
layers. On the guest page the shell shows the same layers as `<img>` elements at the same positions, so
the scene can disappear without a jump.

## Layer manifest

```ts
interface LayerManifest {
  card: { w: number; h: number; unit: "px"; background: string }; // design size and card background colour
  layers: Array<{
    id: string;
    name: string;
    role?: "qr";                     // the QR layer dissolves in `connect`
    src: string;                     // PNG, WebP or SVG, cropped to rect (only full-bleed layers are card-sized)
    z: number;                       // stacking order, 0 = bottom
    rect: Rect;                      // position on the card in design px
    label?: string;                  // free text shown in the selection chrome (e.g. a token name)
    dims?: string;                   // free text shown as the measurement (e.g. "900 × 900")
  }>;
}
```

4 to 8 layers. Labels and dims are arbitrary text; the effect has no concept of design tokens.

## Rules

- No network requests other than the layer files from the manifest and the effect's own bundled assets
  (for example a font file shipped inside the effect folder).
- No DOM access beyond the given canvas. No sensors; tilt and pose come from the shell.
- Guest canvas is transparent during `explode` (camera video sits behind it).
- Deterministic: the same timeline, the same elapsed time and the same inputs (tilt, pose, viewer) give
  the same frame on any device. No unseeded randomness.
- One exception to frame-by-frame determinism: the selection chrome (label blocks, leaders, their
  side and row) may keep a short history to ease and hold its layout while the pose moves. Sheets,
  outlines, timings and every end frame stay purely a function of time and inputs. The chrome settles
  to its stateless layout within 0.3 s once the pose holds still, and in test mode `seek` clears the
  history, so the same seek gives the same pixels.
- At most 3 flashes per second.
- Test hooks (`seek`, `setPaused`, `frames`, fake pose and tilt) only when `opts.test === true`, never in
  the production build.
- `dispose()` frees everything and leaves no running rAF.
- `three` is a peer dependency imported as `three`; the effect is built as an ES module into its own
  `dist/` and that `dist/` is committed.
