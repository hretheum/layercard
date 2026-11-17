# spill — scene brief for Claude Fable 5.2 (v4)

Create a maximum-ambition Three.js scene module in which a phone business card SPILLS into the room: the moment a guest points their camera at the host's phone, the card's design file pours out of the screen — its layers lift off the glass and grow into sheets as big as a table, rulers and guides shoot out across the air between the two people, a red measurement line spans the real distance between the two phones, the card's grid unrolls behind the host like a wall — then the whole file is sucked back into the guest's phone, where it becomes their whole screen.

Do not build a confetti burst, a hologram cliché with scanlines and glow, a cloud of random rectangles or a stack that merely hovers above the phone (that is peel). Build the design file at room scale: the same layers, rulers and measurements a designer sees on a canvas, suddenly the size of the space you are standing in.

Core idea: the file was always bigger than the screen — for six seconds you get to stand inside it.

The goal is the impression of a canvas that has no edges: sheets that pass beside the guest's camera, guides that run past the borders of the screen, a grid that continues behind the host's shoulders, and a measurement that is true — it says how far apart the two phones really are. Achieve this with a camera-anchored scene at room scale, sheet-sized acrylic built like peel's, screen-space chrome that stays legible at any distance, and motion designed so tracking error hides in it — not with bloom, particles, a skybox or a video loop.

This is an iterative project in a real repository. You work in `packages/scene/effects/spill/` of the `layercard` repo — a new effect, yours — in worktree `layercard-scene-v4`, branch `scene/spill-v4`, which starts from `scene/peel-v2`. Same stack as peel: Vite and TypeScript, three pinned as a peer dependency, `WebGLRenderer` on WebGL2. The module implements `packages/scene/CONTRACT.md` v1.1 (Appendix A, binding; this effect needs nothing from v1.2). The example card is `examples/jane-maker/`. You may copy any code from `packages/scene/effects/peel/` into your folder and adapt it — it is peel v2, every check green in WebKit and Chromium: the exact flat bake (including its GPU fix), the in-place lift-off on the host, the label layout with history, `fly` and `assemble` with the full-bleed landing, the stand-in camera of the demo and the check harness. The peel folder is read-only for you. Realism here means a design tool's canvas made physical at room scale, judged through a phone camera held by a person who moves.

#### ANOTHER RUN IS WORKING NEXT TO YOU

A second Fable session (the effect `window`, worktree `layercard-scene-v3`, branch `scene/window-v3`, demo on port 5275) runs on the same Mac at the same time. Neither of you may get in the other's way:
- Work only in `layercard-scene-v4`. Never open, build, test, commit or install in another worktree, never check out another branch, never run `git gc`, `git prune` or anything that rewrites shared history or refs. The worktrees share one object database: your commits go only to `scene/spill-v4`.
- Your demo dev server runs on port 5276, your Playwright output and scratch files stay in `artifacts/tmp/` of your folder, your renders outside the repo go to `~/dev/prv/products/layercard-runs/spill-v4-eryk/`. Ports 5273–5275 belong to others: never stop a process you did not start.
- Your notes for the article go only into your own diary file and your own materials folder (below). Other diaries in the vault you may read, never edit.
- GPU-heavy work (the `perf` check, video renders) takes the lock `~/dev/prv/products/layercard-runs/locks/gpu.lock` (create it with `mkdir`, remove it when done; if it exists, wait up to 10 minutes, then go on and say so). Note in `perf` evidence whether a process was listening on port 5275 during the measurement.

#### FIRST FRAME - STILL JUST A CARD

- Host `idle` frame zero is the flat card exactly (contract flat reference, largest difference ≤ 1/255 in both browsers); the QR scans throughout `idle`; idle breathing as in peel v2.
- Never draw over `safeRects` from `idle` to the end of `depart`: the tracking marker lives there and the guest camera needs it the whole time.

#### THE SPILL - THE HERO

Host `depart` and guest `explode` are one event with one schedule, 7–8 s; `durations()` reports exact values, identical on both roles.
- **Host.** The canvas zooms out on the host's screen: the card shrinks to a small artboard in a wide canvas grid, and its layers lift off in place one by one (peel v2's lift-off, one layer in one place). End: the small, empty artboard with dashed outlines, the grid around it.
- **Guest, anchored.** Each layer rises off the glass exactly where the host showed it (as in peel v2), then grows and travels out into the room: the background unrolls into a wall-sized sheet behind the host phone, the grid becomes a floor-to-head plane of columns, the mark and text sheets swing out to the sides and towards the guest, the largest about 6 card widths across (about 40 cm for a phone-sized card), some passing beside the guest's camera and out of the frame. Guides (thin selection-blue lines) shoot out from the sheet edges across the space; one red measurement line runs from the host phone towards the guest's camera with a label giving the real distance between the phones in centimetres, read from the pose (card width taken as 7 cm, an assumption you state in the label's code, not on screen). The host phone and the three nearest sheets stay in the frame at the end of `explode`; each sheet keeps a label chip and its dims (peel v2's chrome, screen-space, at least 12 CSS px).
- **Guest, unanchored.** No phone in view: the guest's screen becomes the room — a virtual phone small in the middle, the file spilling around it from a slowly drifting virtual eye (about ±12°, one sweep in about 4 s), the same schedule; everything named above shows.
- **Design for an unsteady hand.** The pose shakes by 1–2 CSS px of the card at 50 cm and errors grow with distance from the phone: big sheets move on slow, heavy curves; far elements are soft-edged guides and grids rather than hard thin lines; chrome uses the history contract v1.1 allows. Freeze any frame and nothing looks broken; move the camera and the room stays put.
- **Design for the camera.** In a lit room, through a phone camera: sheets are clear acrylic with readable prints and visible rims, never murky; at least one sheet always crosses the frame edge, so the file reads as bigger than the screen.
- Thesis shot: the guest steps back half a step; through the camera the host phone sits small in the middle of a grid wall, two sheets the size of a laptop hang either side at head height, a guide runs past the edge of the frame, and the red line says "47 cm".

#### THE SUCK-BACK - FLY AND ASSEMBLE

- Guest `fly` (about 1.4 s): everything rushes back — sheets shrink and converge on the guest's own screen, guides retract, the grid rolls up; the canvas becomes opaque card background by the end; the deck stays inside the canvas width (peel v2).
- Guest `assemble`: as peel v2 — full-bleed landing, the end frame equals the flat reference in `assembleRect`, including rects that run past the canvas.
- Host `rebuild` (about 1.8 s): the canvas zooms back in, layers drop back into place in reverse order, the QR re-forms last; the end frame equals `idle` frame zero exactly.

#### MOTION

Independent systems, deterministic in time and inputs: (1) host canvas zoom-out and zoom-in, (2) per-layer lift-off (peel v2), (3) per-sheet growth and travel on heavy curves, (4) guides shooting out and retracting, (5) the grid unrolling and rolling up, (6) the live measurement of the distance between phones, (7) contact light and rims on the sheets as they turn, (8) the QR dissolve, (9) label easing. Watch it twice and the second time you look past the phone into the corners of the room. With `reduced`: sheets fade in at their room positions without travel, guides appear without shooting, `fly` cross-fades; the end frames stay exact.

#### STYLE LAW AND PALETTE

A design tool's canvas at room scale. Sheets are peel's clear acrylic printed with exactly their pixels; the grid is the card's own column grid; guides and selection in selection blue `#2F80FF`, measurement in red `#FF4D3D` with white text, acrylic rim `#EAF2FF`; card colours come only from the layers and the manifest. Nothing glows, nothing blurs except soft-edged far guides. Bright and readable in a lit room: every sheet distinct at a glance, every label legible on inspection.

#### PERFORMANCE

- Scene ≤ 6 ms per frame at `high` on an integrated laptop GPU; `mid` holds 60 fps on an iPhone 12-class phone while the shell runs camera and tracker.
- Room-scale sheets reuse the layer textures (no new full-size textures per sheet); texture memory within peel's budgets.
- Lower tiers give up resolution, rims and far guides first; frame-zero fidelity, QR scannability, the exact end frames, identical timings across tiers, label legibility and one layer, one place are never traded away. Precompute the schedule; no allocations per frame; `dispose()` frees everything.

#### WHAT YOU DELIVER

In `packages/scene/effects/spill/`:
- `package.json` (`@layercard/effect-spill`), `src/`, `dist/spill.js` (ES module, committed), font and licence (peel's may be reused).
- `demo/`: host and guest side by side, the stand-in camera with the live host canvas on the phone screen and room-scale space around it (a floor and walls so scale reads), a fake pose you orbit and dolly by dragging, jitter switch, quality and reduced switches, every timeline and "play all".
- `checks/` (Playwright), every one in WebKit and Chromium: peel v2's checks adapted (frame-zero, assemble-end with overflowing rects, rebuild-end, determinism, dispose, reduced, flash, perf, qr, safe-rects, contract, lift-handoff, label checks), plus:
  - `room-scale`: at the end of `explode` for at least 12 poses (30–60 cm, up to ±35°): the host phone and three sheets in frame, at least one sheet crossing a frame edge, largest sheet 5–7 card widths, labels legible and non-overlapping;
  - `distance-label`: the measured distance equals the pose distance under the 7 cm assumption within 1 cm for at least 6 poses;
  - `steady-room`: with 1.5 px / 30 Hz jitter, far sheet corners move at most 2 CSS px per frame at p95.
- `artifacts/`: contact sheets for every role × timeline (anchored frontal, 20°, 35°; unanchored), a stand-in camera dolly video (the camera stepping back from 30 to 60 cm during the hold), and the full sequence side by side.
- The owner's card, for looking only: renders from `~/dev/prv/products/layercard-content/eryk/` into `~/dev/prv/products/layercard-runs/spill-v4-eryk/`; never copy its files, names or text into the repo, commits, artifacts or report.
- `SPEC.md`, `RUNLOG.md`, `process/`, `CLAUDE.md` (Contract section), `REPORT.md`.

#### THE DIARY, THE MATERIALS AND THE PROGRESS — KEPT LIVE

The owner is writing an article about this project and follows your run from his notes. Keep three things up to date during the run, not at the end:
- **Your diary file:** `<owner's private notes>/Dziennik do artykułu — scena spill.md`. Create it at the start with frontmatter like the sibling diary `Dziennik do artykułu — scena peel.md` (title, `provenance: ai_authored`, agent, date, session context, `status: zbierane na bieżąco`). Write in Polish, plainly, for the article: after every milestone and after every surprise, wrong assumption, measurement or decision worth telling, add an entry headed with the time from `date` and a short title, two to five bullets, the numbers with their source, and an embedded image. Facts only: no feelings or opinions attributed to the owner.
- **Your materials:** `<owner's private notes>/spill-v4/` — screenshots, contact sheets and short videos referenced by the diary, named `YYYY-MM-DD spill <what it shows>.png`. Renders of the owner's card may go here too: the vault is private, unlike the repo.
- **Progress:** the top of the diary file holds a `## Progress` section — one checklist line per milestone (S1–S5, see below) with status (`[ ]` waiting, `[~]` in progress since HH:MM, `[x]` done at HH:MM with the commit hash) and a one-line "now:" line saying what you are doing. Update it when a milestone starts, when it ends, and whenever "now" changes meaningfully — the owner reads it to know where you are without asking.
These three writes are outside the repo and allowed without asking; nothing else outside your folder is.

#### HOW YOU WORK

- The `spill` folder is yours: its structure and tidiness are your call. Without asking: installs from the root of your worktree, builds and checks, edits and commits inside your folder on `scene/spill-v4`, writing the renders, the diary and the materials named above. Ask before: pushing, merging or rebasing, creating or moving tags, touching any other worktree, branch or effect (`peel`, `window`), editing `packages/scene/CONTRACT.md`, `packages/scene/types.d.ts` or `examples/`, deleting files outside your folder. Nobody is watching this run: if one of those seems needed, take the reversible option and put it in the report.
- Before code, write `SPEC.md`: what you build and a list of acceptance items, each checkable by a test, a build, a screenshot or a number. After every milestone, check yourself against it. If an approach turns out wrong, throw it away and rebuild rather than patch.
- Milestones, each ending in a commit with a contact sheet, a diary entry and a Progress update: S1 skeleton — peel v2 copied and renamed, its checks green in both browsers; S2 the room — the stand-in camera with room-scale space, the spill of the background, grid and one sheet anchored, `room-scale` and `steady-room` green; S3 the whole event — all sheets, guides, the distance line, the host zoom-out; S4 the unanchored guest, the suck-back, `rebuild`; S5 the owner's card, artifacts, perf, report. S2 is the foundation: if the room does not stay put through the stand-in camera while it moves, nothing after it matters. If you have to stop before the end, stop at a milestone boundary with every check green.
- Look at your own output early — a first screenshot no later than about your tenth step — and after every change that alters the image; describe what you see against `SPEC.md`. Taste is judged by the card's owner; record your creative decisions instead of approving them.
- Before you start, say in one sentence what you are doing; give a one-line update every few steps.
- Ordinary obstacles you diagnose and work around; if something looks impossible, try it before setting it aside and record the attempt. Subagents only for work whose mistakes are easy to catch, on a cheaper model; decisions and code edits stay with you.
- Nothing larger than 1 MB goes into git except `dist/`, the font and the artifacts named above; scratch goes to `artifacts/tmp/` (gitignored).
- If rules conflict: the contract and cross-device determinism win, then not getting in the other run's way, then the exact flat frames in both browsers with QR scannability, then a room that stays put and legible labels, then the budgets, then polish, then process rules. Name every such choice in the report.
- Finish with `REPORT.md` for a smart reader who saw none of your work: the most important things first, plain words, how the spill looks through the stand-in camera (with the evidence files), what works and what does not, what waits for the owner, what you would do next, every creative decision you made, and proposed lines for `docs/build-log.md`. Close the diary with a final entry and set every Progress line.

Acceptance bar: the job is not done if the file merely hovers above the phone, if the room swims when the camera moves, if a sheet is ever in two places, if the distance label is wrong, if labels collide or vanish, if a check passes only in Chromium, if the diary and Progress were written only at the end, or if anything of the other run was touched. Done means: through the stand-in camera the file pours out to room scale and stays put while the camera orbits and steps back; the measurement tells the true distance; everything returns into the guest's phone and lands exactly; the unanchored path reads as a room on its own; host frame zero, the rebuild end and the assemble end are exact in both browsers and the QR scans in `idle`; at least five motion systems run independently; the budgets hold with numbers; the diary, materials and Progress tell the run as it happened; and nothing named here is missing from the screen — if something cannot be shown, cut it and say so instead of faking it.

In one sentence: a business card that turns out to be a whole design file, poured out into the room for six seconds and poured back into someone's phone.

---

## Appendix A — `packages/scene/CONTRACT.md` v1.1 (binding, verbatim)

# Scene module contract (v1.1)

Every effect in `packages/scene/effects/<name>/` implements this contract. The shell (`apps/card`) owns
everything outside the canvas: camera, tracking, network rooms, sensors, DOM UI, sharing, contact.
An effect only draws. If you change this file, bump the version and say why in the build log.

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
  setProjection(fovY: number, aspect: number): void; // guest: vertical field of view in degrees and the
                                                 // aspect (width / height) of the canvas, for the
                                                 // camera image as it is shown behind the canvas
  replaceLayer(id: string, src: string): Promise<void>; // swap one layer image (e.g. a fresh QR for the next guest)
                                                 // without a visible jump; a 150 ms crossfade is allowed
  where(): { role: Role; timeline: Timeline; t: number };
  dispose(): void;                               // idempotent; frees GPU resources, rAF, listeners; remount allowed
}
```

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
- Deterministic: the same timeline, the same elapsed time and the same inputs give the same frame on any
  device. No unseeded randomness.
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
