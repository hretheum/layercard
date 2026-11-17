# window — scene brief for Claude Fable 5.2 (v3)

Create a maximum-ambition Three.js scene module for a phone business card that turns its owner's phone into a WINDOW: the moment a guest points their camera at the host's phone, the host's screen stops being a surface and becomes an opening into a deep, lit room hidden inside a phone eight millimetres thick; the card's layers hang inside it at different depths, the walls run away into the distance and swing as the guest moves, then the layers float forward one by one, pass through the glass into the air between the two phones, and fly into the guest's phone, where they become its whole screen.

Do not build a 3D card spinning above the phone, a glowing portal swirl, a particle tunnel, or an overlay that paints a fake hole over the camera image. Build an impossible object out of honest pixels: the depth is drawn on the host's real screen, for the guest camera's eye, so through the camera it cannot be told from a real hole in the phone.

Core idea: the phone is hollow — your card lives deep inside it and walks out through the glass to you.

The goal is the impression of a cavity many times deeper than the phone: walls that converge correctly from every angle the guest takes, layers that slide against each other with true parallax, soft shadows on the walls, a lit back panel — and when a sheet crosses the glass it carries on in the air without a seam. Achieve this with head-coupled (off-axis) perspective rendered on the host screen from the guest camera's position and a strict hand-off at the glass between the two devices — not with an overlay drawn on the camera image, a static fake-3D picture, bloom or blur.

Two phones, one world. The host draws everything behind the glass (z < 0) through an asymmetric frustum whose apex is the guest camera, given by the new optional `setViewer` of contract v1.2; the guest draws only what is in front of the glass (z > 0) over its camera image, anchored by its pose. A layer crossing the glass is split by that plane between the two devices.

This is an iterative project in a real repository. You work in `packages/scene/effects/window/` of the `layercard` repo — a new effect, yours — in worktree `layercard-scene-v3`, branch `scene/window-v3`, which starts from `scene/peel-v2`. Same stack as peel: Vite and TypeScript, three pinned as a peer dependency, `WebGLRenderer` on WebGL2. The module implements `packages/scene/CONTRACT.md` **v1.2** (Appendix A, binding). The example card is `examples/jane-maker/`. You may copy any code from `packages/scene/effects/peel/` into your folder and adapt it — it is peel v2, every check green in WebKit and Chromium: the exact flat bake (including its GPU fix), the schedule, the label layout with history, `fly` and `assemble` with the full-bleed landing, the demo's stand-in camera that shows the live host canvas on a phone screen, and the check harness. The peel folder itself is read-only for you. Realism here means physically correct perspective of an impossible cavity, judged through a phone camera while the guest moves; the style is peel's — a design tool's world made physical.

#### FIRST FRAME - STILL JUST A CARD

- Host `idle` frame zero is the flat card exactly (the contract's flat reference, largest difference ≤ 1/255 in both browsers); the QR scans throughout `idle`; idle breathing and tilt parallax as in peel v2. No title, hint or loading theatre: the card is simply there.
- Never draw over `safeRects` from `idle` to the end of `depart`: the shell's tracking marker sits there, a sticker on the glass the guest camera must see the whole time.

#### THE WINDOW - THE HERO

- `connect` (0.8 s): the QR dissolves as in peel; nothing else moves.
- Host `depart` and guest `explode` are one event with one schedule, 7.5–8.5 s in total; `durations()` reports exact values, identical on both roles.
  1. **The glass opens** (about 0–1.2 s): the whole card recedes as one stack into the phone, about 0.6 card widths deep, while the cavity appears at the edges of the screen — four walls in the card's background colour, carrying the card's own column grid running away into depth, rulers every 100 design px of depth with mono numerals, and a back wall about 3 card widths deep that is a soft luminous panel.
  2. **Exploded inside** (about 1.2–2.4 s): the layers fan out in depth inside the cavity — the background moves to the back wall, each upper layer hangs nearer the glass, spaced so every layer is distinct from 35° off-axis — each casting a soft shadow on the walls and floor.
  3. **Out through the glass** (about 2.4 s to the end): top layer first, each layer floats forward, crosses the glass in about 0.25 s and comes to rest in front of the host phone in peel's stack geometry (bottom sheet 0.08 card units above the glass, 0.11 apart, 0.035 stair), where the guest draws peel v2's labels and measurements around it.
  End: the host shows the empty lit cavity with the layers' dashed outlines on its back wall (the residue that counts what has left); the guest shows the full stack hovering in front of the glass, chrome drawn.
- **Host rendering.** The window is the card's rect on the canvas (fitted *contain*). With a viewer, render through the asymmetric frustum from the eye through that rect, so the screen shows exactly what a real cavity would show that eye. With no viewer, use a virtual eye 6 card units in front of the centre, moved by tilt up to ±25°. Switching between a viewer and none eases over 0.3 s and never jumps.
- **Guest, anchored.** Draw only what lies at z ≥ 0, clipped by the glass plane, and nothing over the host screen inside the window: the real host screen IS the window.
- **Guest, unanchored** (no camera, no tracking): the guest draws everything itself — the window as a card-sized opening floating in its screen, the cavity behind it, seen from a virtual eye that drifts slowly (about ±12°, one sweep in about 4 s) so the depth reads; layers come out towards the viewer on the same schedule; the whole stack and chrome fit inside 8% margins.
- **Design for the camera.** In the guest's camera image the host screen is only 90–150 px wide (30–60 cm away). The cavity must read at that size: big converging lines, light-and-dark contrast between walls and back panel, layers separated by depth and shadow. Fine detail (ruler numerals) is for the host screen up close and for photos. Phone cameras expose for the room, so the cavity must never crush to black: no region of it darker than the card background, the back panel at least 3× its luminance.
- Thesis shot: the guest 35° to the side; through the camera the host phone holds a deep box with walls converging, three layers hanging inside at depth, one sheet halfway through the glass and two hanging in front, labelled.

#### THE GLASS IS A SEAM NOBODY SEES

- Host and guest split every layer by the plane z = 0 from one shared schedule state: host pixels only behind it, guest pixels only in front of it; in the stand-in camera the two halves of a crossing sheet meet within 1 CSS px.
- One layer, one place (peel v2's rule) still holds: no layer is ever drawn whole on both devices; the glass is the only line where a layer is split.
- On a host without a viewer, a layer leaving through the glass is cut by the plane, with a thin rim of light along the cut for the 0.25 s of the crossing.

#### LANDING AND REBUILD

- Guest `fly` and `assemble`: as peel v2 — the deck stays inside the canvas width, the landing is full-bleed, the end frame equals the flat reference in `assembleRect` (including rects that run past the canvas).
- Host `rebuild` (about 1.8 s): in reverse order the layers come back in through the glass and slide to their depths, the stack gathers, moves forward to the glass and flattens, the walls close, the QR re-forms last; the end frame equals `idle` frame zero exactly.

#### MOTION

Independent systems, all deterministic in time and inputs: (1) the cavity opening and closing, (2) per-layer depth fan and exit springs, (3) head-coupled perspective from the viewer or the tilt eye, (4) wall and floor shadows following the layers, (5) the rim of light at the glass crossing, (6) the residue outlines drawn on the back wall, (7) the QR dissolve, (8) the guest's chrome draw-on and label easing (peel v2). Freeze any frame and it reads as a precise cutaway of a hollow phone; watch it twice and the second time you look into the corners. With `reduced`: the opening and the exits become fades at fixed offsets, the tilt eye is fixed frontal; perspective from a real viewer stays, because it follows the guest's own hand, not an animation.

#### STYLE LAW AND PALETTE

Style law: the inside of the phone is the design tool's canvas made into a room. Walls in the manifest's card background, a little lighter towards the opening; the card's column grid continuing along the walls into depth; depth rulers every 100 design px with mono numerals; the back panel a soft glow of the card colour, never white glare. One soft light from the opening plus the panel; contact shadows of the sheets on walls and floor; nothing else glows, nothing blurs but shadows. Chrome as in peel: selection blue `#2F80FF`, measure red `#FF4D3D`, chip text `#FFFFFF`, acrylic rim `#EAF2FF`. Card colours come only from the layers and the manifest. Bright and readable in a lit room: through the camera the cavity reads as deep at one glance; up close every outline and ruler is crisp.

#### PERFORMANCE

- The host now renders a lit cavity every frame from a moving eye (the host runs no camera): scene ≤ 6 ms per frame at `high` on an integrated laptop GPU; `mid` holds 60 fps on an iPhone 12-class phone. A new eye is used in the next frame; no smoothing beyond the 0.1 s the contract allows.
- Tiers as in peel. Lower tiers give up resolution, shadow softness and ruler detail first; frame-zero fidelity, QR scannability, the exact end frames, identical timings across tiers, correct perspective (the cavity is never drawn for a wrong eye) and one layer, one place are never traded away.
- Precompute the schedule at mount; no allocations per frame; `idle` at most 30 fps; `dispose()` frees everything.

#### WHAT YOU DELIVER

In `packages/scene/effects/window/`:
- `package.json` (`@layercard/effect-window`), `src/`, `dist/window.js` (ES module, committed), font and licence (peel's subset may be reused).
- `demo/`: host and guest side by side; the stand-in camera with the live host canvas on the phone's screen, using the field of view given by `setProjection`; one fake pose you orbit by dragging drives both the guest's `setPose` and the host's `setViewer` (the eye derived exactly as the shell will: the inverse of the pose); a viewer on/off switch; tilt sliders; quality and reduced switches; every timeline and "play all".
- `checks/` (Playwright), every one in WebKit and Chromium: peel v2's checks adapted (frame-zero, assemble-end with overflowing rects, rebuild-end, determinism including the viewer input, dispose, reduced, flash, perf, qr, safe-rects, contract, and the label checks for the stack in front of the glass), plus:
  - `window-truth`: at least 12 eyes (frontal, ±20° and ±35° on both axes, at 30, 45 and 60 cm, i.e. z 4–9 card units): seen in the stand-in camera, the back-wall corners and wall edges drawn on the host screen land within 1 CSS px of where a real box of the same size projects (computed analytically), and one image per eye compared with a direct 3D render of that box;
  - `glass-seam`: for a sheet crossing the glass, host pixels only behind, guest pixels only in front, the halves meet within 1 CSS px in the stand-in camera, and no frame shows a layer whole on both;
  - `viewer-switch`: null ↔ eye eases within 0.3 s with a bounded change per frame;
  - `exposure`: on the host canvas during the hold, no cavity region darker than the card background and the back panel at least 3× its luminance.
- `artifacts/`: contact sheets for every role × timeline (guest anchored frontal, 20° and 35°, and unanchored); a stand-in camera orbit video, the camera sweeping from 35° left to 35° right during the exploded-inside hold — the proof that the window is real; one side-by-side video of the whole sequence.
- The owner's real card, for looking only: render its sheets and the orbit video from `~/dev/prv/products/layercard-content/eryk/` into `~/dev/prv/products/layercard-runs/window-v3-eryk/`, outside the repo. Never copy its files, names or text into the repo, commits, artifacts or report — the repo will be public; call it "the owner's card" and give the outside path.
- `SPEC.md`, `RUNLOG.md`, `process/` (one captioned image per milestone), `CLAUDE.md` with a Contract section (v1.2: what is met, what was not verified), `REPORT.md`.

#### HOW YOU WORK

- The `window` folder is yours: its structure and tidiness are your call. Without asking: installs from the repo root, builds and checks, edits and commits inside your folder on `scene/window-v3`, writing into `~/dev/prv/products/layercard-runs/window-v3-eryk/`. Ask before: pushing, merging or rebasing, creating or moving tags, touching the peel effect or its branches, tags and worktrees (`scene/peel-v1`, `scene/peel-v2`, `peel-v1.0`, `layercard-scene`, `layercard-scene-v2`), editing `packages/scene/CONTRACT.md`, `packages/scene/types.d.ts` or `examples/`, deleting files outside your folder. Nobody is watching this run: if one of those seems needed, take the reversible option and put it in the report. If the contract blocks you, implement against it as written and propose the change in the report.
- The shell starts relaying the viewer tomorrow; until then your stand-in camera is the only place the hero can be seen, so make it faithful: the host canvas mapped exactly onto the screen rect of the phone model, the camera's field of view from `setProjection`.
- Start the demo dev server on port 5275 (peel's may be running on 5273 and 5274).
- Before code, write `SPEC.md`: what you build and a list of acceptance items, each checkable by a test, a build, a screenshot or a number. After every milestone, check yourself against it. If an approach turns out wrong, throw it away and rebuild rather than patch.
- Milestones, each ending in a commit with a contact sheet: W1 the skeleton — peel v2 copied and renamed, its checks green in both browsers under the new name; W2 the window — the cavity on the host with head-coupled perspective from a viewer and from tilt, `window-truth` and `exposure` green, judged through the stand-in camera; W3 the event — opening, exploded inside, exits through the glass, `glass-seam` green; W4 the unanchored guest, `rebuild`, the landing; W5 the owner's card, artifacts, perf, report. W2 is the foundation: if the window does not read as a hole through the stand-in camera, nothing after it matters — get it right first. If you have to stop before the end, stop at a milestone boundary with every check green.
- Look at your own output early — a first screenshot no later than about your tenth step — and after every change that alters the image; describe what you see against `SPEC.md`. Taste is judged by the card's owner in the morning; record your creative decisions instead of approving them.
- Before you start, say in one sentence what you are doing; give a one-line update every few steps; after each milestone add one line to `RUNLOG.md` and one captioned image to `process/`.
- Ordinary obstacles (failing builds, flaky checks, timeouts, a missing browser) you diagnose and work around. If something looks impossible, try it before setting it aside, and record the attempt.
- Give subagents only work whose mistakes are easy to catch (running checks, reading logs), on a cheaper model; decisions and code edits stay with you.
- Nothing larger than 1 MB goes into git except `dist/`, the font and the artifacts named above; downloads and scratch files go to `artifacts/tmp/`, which is gitignored.
- If rules conflict: the contract and cross-device determinism win, then the exact flat frames in both browsers with QR scannability, then correct perspective and one layer, one place, then the budgets, then polish, then process rules. Name every such choice in the report.
- Finish with `REPORT.md` for a smart reader who saw none of your work: the most important things first, plain words, how the window looks through the stand-in camera (with the evidence files), what works and what does not, what waits for the owner and for the shell, what you would do next, every creative decision you made, and proposed lines for `docs/build-log.md`.

Acceptance bar: the job is not done if the window looks like a picture of a box that does not change as the camera moves, if anything of the cavity is drawn over the camera image, if a layer is ever whole on both phones, if the walls swim while the eye moves smoothly, if the cavity goes black through a camera, or if a check passes only in Chromium. Done means: at every eye in the grid the host screen shows a cavity that projects like a real box within 1 CSS px; the orbit video sweeps the walls with true parallax; layers leave through the glass with no seam; the unanchored path reads as deep on its own; host frame zero, the rebuild end and the assemble end are exact in both browsers and the QR scans in `idle`; at least five motion systems run independently; the budgets hold with numbers; the owner's card renders exist outside the repo; and nothing named here is missing from the screen — if something cannot be shown, cut it and say so instead of faking it.

In one sentence: a phone eight millimetres thick with a lit room inside it, and a business card that walks out through the glass into your hand.

---

## Appendix A — `packages/scene/CONTRACT.md` v1.2 (binding, verbatim)

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
