# peel — scene brief for Claude Fable 5.2 (v1)

Create a maximum-ambition Three.js scene module for a phone business card that comes apart: a card sits flat on the host's phone screen, its QR code dissolves the instant a guest connects, its layers PEEL off the glass one by one as thin acrylic sheets, hover above the host's phone in the guest's camera view as an exploded stack with every sheet labelled and measured like a selected layer in a design tool, then fly into the guest's phone and lock back together into the card. One choreography, two cameras: the host phone sees the layers leave, the guest phone sees them arrive.

Do not build a confetti burst, a spinning 3D card in a showroom, a glassmorphism blur panel or a random tumble of flying rectangles. Build the most precise exploded view a phone has ever shown of itself.

Core idea: your card is a design file you can hold — its layers lift off the glass and land in your hand.

The goal is the impression of a real design file made physical and exact: every sheet printed with exactly its own pixels; every sheet a slab of clear acrylic whose edge catches a cool rim of light; each selection frame a hairline at device resolution; each label and measurement crisp enough to read at arm's length. Achieve this with a fresnel rim and a moving specular sweep in a custom shader, contact shadows that soften with height, and labels baked into textures from a bundled font — not with physical transmission or refraction materials, not with post-processing bloom, not with CSS 3D.

This is an iterative project in a real repository, not a one-shot file. You work in `packages/scene/effects/peel/` of the `layercard` repo (worktree `layercard-scene`, branch `scene/peel-v1`). Use Vite and TypeScript, three pinned to one release as a peer dependency, `WebGLRenderer` on WebGL2 (no WebGPU: the guest phone is a stranger's phone). The module implements `packages/scene/CONTRACT.md` (Appendix A, binding). The example card to build against is `examples/jane-maker/` (manifest `layers.json`, images in `layers/`). The only external files are the layer images from the manifest and assets bundled inside your folder. Realism here means stylistic fidelity to a design tool's layer view made physical: the viewer must believe these are real sheets of acrylic carrying the real layers of this card, with the tool's own chrome floating beside them.

#### FIRST FRAME - THE CARD IS THE PAGE

- Host `idle`, frame zero: the card is fitted (contain) and centred in the canvas on the manifest `card.background` colour, and it is pixel-identical to a flat composite of the layers in z order. No rim, no shadow, no chrome, no seam. Anyone looking at the host phone sees a business card, not a 3D scene.
- The card breathes its layers apart with the host's tilt (`setTilt`): upper layers translate by parallax proportional to z, at most 10 CSS px for the top layer at full tilt, with a contact shadow under each upper layer that grows with the offset. With tilt at 0, a slow autonomous breath (5 s period, at most 1.5 px) keeps it alive; at t = 0 it is exactly flat.
- The QR layer translates with parallax at most 4 px and never scales, rotates or skews — it must scan at any moment of `idle`.
- No title, no hint text, no loading theatre. The card is simply there.
- In every host timeline, never draw over `safeRects`: the shell's tracking marker lives there and the guest camera needs it visible from `idle` to the end of `depart`.

#### THE PEEL - THE HERO MECHANIC

Host `depart` and guest `explode` are one event with one schedule, played from the same `at` on two devices.
- `connect` (0.8 s): the QR layer dissolves along its own module grid in a diagonal sweep, modules lifting 2–3 px and fading; nothing else moves.
- Order: top layer first, down to the background (QR layers never fly). Layer *i* starts at about 0.2 s + i × 0.6 s; each lift takes about 0.9 s on `cubic-bezier(.16,1,.3,1)` with one visible overshoot of about 6% and a 0.35 s settle; its chrome draws in over the following 0.45 s; then a 1.2 s inspection hold with the whole stack labelled. Total 6.0–6.5 s; `durations()` reports your exact values.
- On the host: as a layer lifts, its pixels leave the screen and its outline stays behind as a 1 px dashed frame (6/6 CSS px dashes) in selection blue at 55% with a small mono tag "Layer moved →". After the last layer, the host screen shows only outlines on the card background. The empty outlines ARE the counter of what has left — no other progress UI.
- In the guest view, anchored to the pose: the stack rises along the card's +Z axis from the host screen — axis-aligned like an engineering exploded view, no rotations — the bottom sheet hovering 0.08 card widths above the glass, 0.11 card widths between sheets, plus a constant stair offset of 0.035 card heights per step along +Y so the stack still reads as stacked when seen almost head-on. Sheets are 0.012 card widths thick.
- Expect the common geometry: the host holds the phone upright facing the guest at chest height, the guest camera 30–60 cm away and within ±35° of the screen normal, so the exploded axis points roughly at the viewer. Design the stack to read at exactly that view.
- Unanchored (pose `null`): the same schedule, but the stack forms in a fixed virtual pose seen 25–35° off the normal, entering from the top edge of the guest screen as if it came from a phone held above; the whole stack and its chrome fit inside the screen with 8% margins.

#### SELECTION CHROME - THE FILE TALKS

- Each settled sheet gets a selection frame (1.5 CSS px, constant screen-space width) traced clockwise in 0.25 s, four square handles, a filled label chip with the layer `label`, and red measurement lines with end ticks carrying the `dims` text.
- Labels are screen-space sprites anchored to sheet corners by leader lines: always facing the camera, at least 12 CSS px text on the guest screen, alternating sides by index, at least 1.4 label heights apart, leader lines never crossing. Bake them from a bundled OFL monospace font subset (woff2 at most 40 KB, licence file next to it), loaded via `FontFace` from your own folder.

#### THE LANDING - FLY, ASSEMBLE, REBUILD

- Guest `fly` (1.2 s): the stack leaves its anchor and arcs toward the guest's camera, collapsing into screen space; the canvas ramps from transparent to opaque `card.background` by the end.
- Guest `assemble` (1.0 s): sheets slide into `assembleRect` and lock flat, face-on, with a single soft settle. Final frame: the flat composite inside `assembleRect`, pixel-identical to the reference, with no chrome or rim, so the shell can swap in a static image without a jump.
- Host `rebuild` (1.5 s): sheets return from the edges they left by, in reverse order, and the QR re-forms last; final frame equals `idle` frame zero. `replaceLayer()` may swap the QR image for the next guest before `rebuild` or during `idle`.
- Continuity anchors: the mark and the name keep their identity through every timeline — the guest must recognise in the air what was on the host's screen a second ago.

#### MOTION

Independent systems, all deterministic in time: (1) per-sheet lift and settle springs, (2) a specular sweep across the acrylic driven by tilt and pose, (3) chrome draw-on (frames, chips, measurements), (4) host outline residue and tags, (5) idle breathing parallax, (6) contact shadows tightening and loosening with height, (7) the QR module dissolve. Freeze any frame and it reads as a precise exploded diagram; watch it twice and the second time you follow every sheet. With `reduced`, keep the schedule but replace lifts with fades at fixed offsets: no overshoot, no parallax, no sweep.

#### STYLE LAW AND PALETTE

Style law: a design file made physical. Each layer is a sheet of thin clear acrylic printed with exactly its pixels; one soft key light from above-left with a cool rim; everything else is the tool's own hairline chrome. Nothing glows, nothing blurs, nothing decorates.
- Selection blue `#2F80FF` (frames, handles, chip fill); chip text `#FFFFFF`; measure red `#FF4D3D` (measurement lines and dims); acrylic rim `#EAF2FF`; acrylic body tint `#9FB8D9` at 6%; contact shadow `#05070A` at 35%. Card content colours come only from the layers.
- Bright and readable in a lit room: every sheet distinguishable at one glance, every label legible on inspection.

#### PERFORMANCE

- Quality tiers: `high` — DPR ≤ 2, textures up to 2048 px, rim + sweep + soft contact shadows; `mid` — DPR ≤ 1.5, textures ≤ 1536 px, simplified shadows; `low` — DPR 1, textures ≤ 1024 px, rim only, no shadows; `test` — DPR 1, deterministic. Lower tiers give up resolution and shadows first; frame-zero fidelity, QR scannability, label legibility, the exact assemble end frame and the schedule timings (identical across tiers so two devices stay in sync) are never traded away.
- Budgets: scene ≤ 6 ms per frame at `high` on an integrated laptop GPU; `mid` holds 60 fps on an iPhone 12-class phone while the shell runs the camera and tracker; estimated texture memory ≤ 64 MB `high`, ≤ 40 MB `mid`, ≤ 24 MB `low` (downscale full-bleed layers first); bundle ≤ 120 KB gzip excluding three and the font.
- Hygiene: precompute the whole schedule at mount; no allocations per frame; in `idle` render at most 30 fps; `dispose()` frees everything.

#### WHAT YOU DELIVER

In `packages/scene/effects/peel/`:
- `package.json` (`@layercard/effect-peel`), `src/`, `dist/peel.js` (ES module, committed), font and licence.
- `demo/`: host and guest canvases side by side with test-only controls — every timeline, "play all" (connect → depart/explode → fly/assemble → rebuild), tilt sliders, a fake pose you orbit by dragging, a pose-null toggle, quality and reduced switches.
- `checks/` (Playwright): `frame-zero` (host idle vs a 2D-canvas composite, mean absolute difference ≤ 1/255), `assemble-end` (same test inside `assembleRect`), `rebuild-end` (equals idle frame zero), `determinism` (same timeline and time twice gives identical pixels, both roles), `dispose` (no running rAF, renderer memory counters back to zero, remount works), `reduced` (no overshoot, no parallax, only fades and fixed offsets), `flash` (at most 3 luminance flashes per second), `perf` (frame times written to JSON).
- `artifacts/`: contact sheets of 12 frames for every role × timeline (guest both anchored and unanchored) and one side-by-side video of the whole sequence.
- `SPEC.md`, `RUNLOG.md`, `process/` (captioned screenshots per milestone), `CLAUDE.md` with a "Contract" section (what is met, what was not verified), `REPORT.md`.

#### HOW YOU WORK

- Before writing code, write `SPEC.md`: what you build and a list of acceptance items, each checkable by a test, a build, a screenshot or a number. After every milestone, check yourself against it. If an approach turns out wrong, throw it away and rebuild rather than patch.
- Milestones in this order, each ending in a local commit with a contact sheet: M1 host `idle` with frame-zero fidelity; M2 host `connect`, `depart`, `rebuild`; M3 guest unanchored `explode`, `fly`, `assemble`; M4 guest anchored with the fake pose; M5 chrome polish, quality tiers, performance; M6 all checks green, report. The host and the unanchored guest must be excellent before the anchored guest gets polish: they are the paths every guest is guaranteed to see.
- Look at your own output early — a first screenshot no later than about your tenth step — and again after every change that alters the image. Describe what you see against `SPEC.md`. Taste is judged by Eryk in the morning; record your creative decisions instead of approving them yourself.
- After each milestone add one captioned image to `process/` (what it shows and what it means for the next step) and one line to `RUNLOG.md`. Nobody is watching tonight; these files are how your work is followed.
- This folder is yours: its structure and tidiness are your call. Everything outside it is not yours. You may run installs from the repo root (root lockfile changes caused by your dependencies are fine — list them in the report). Do not push, merge, delete files outside your folder or edit `packages/scene/CONTRACT.md`, `packages/scene/types.d.ts` or `examples/` — the shell is being built in parallel against them tonight. If the contract blocks you, implement against it as written and put the change you need as a proposal in `REPORT.md`.
- Ordinary obstacles (failing builds, flaky checks, missing browsers, timeouts) you diagnose and work around. If a decision truly needs a human, take the reversible option, write down why, and keep going. If something looks impossible, try it before you set it aside, and record the attempt.
- Give subagents only work whose mistakes are easy to catch (running checks, reading logs), on a cheaper model; decisions and code edits stay with you.
- Additions beyond this brief: only inside your folder and only if they serve the core idea; list them in the report. No sound, no extra UI in production, no logos of any tool.
- If rules conflict: the contract and cross-device determinism win, then frame-zero and assemble-end fidelity with QR and label legibility, then the performance budgets, then polish, then process rules. Name every such choice in the report.
- Finish with `REPORT.md` written for a smart reader who saw none of your work: the most important things first, plain words, what works (with the evidence file), what does not, what waits for Eryk, what you would do next, and every creative decision you made on his behalf.

Acceptance bar: the job is not done if the result is a card that slides around, a sparse stack of grey rectangles, a demo that only looks right from one angle or a clever trick that falls apart in the guest's real view. Done means: host frame zero is indistinguishable from the flat card; the QR scans throughout `idle`; the peel reads as an exact exploded view from a near-frontal phone camera and from 35° off-axis; every sheet is labelled and measured legibly; at least five motion systems run independently and deterministically; the unanchored path is as convincing as the anchored one; the assemble and rebuild end frames pass their pixel checks; every Playwright check passes with its evidence in `checks/` and `artifacts/`; the budgets hold with numbers in the perf JSON; and nothing named here is missing from the screen — if something cannot be shown, cut it and say so instead of faking it.

In one sentence: the first business card that takes itself apart in mid-air above your phone and puts itself back together in someone else's hand.

---

## Appendix A — `packages/scene/CONTRACT.md` (binding, verbatim)

# Scene module contract (v1)

Every effect in `packages/scene/effects/<name>/` implements this contract. The shell (`apps/card`) owns
everything outside the canvas: camera, tracking, network rooms, sensors, DOM UI, sharing, contact.
An effect only draws. If you change this file, bump the version and say why in the build log.

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
same moment it lifts in the guest view, when both are started with the same `at`.

## MountOptions

```ts
interface MountOptions {
  role: "host" | "guest";
  layers: LayerManifest;            // see below
  baseUrl: string;                  // resolves layer src paths
  quality: "high" | "mid" | "low" | "test";
  reduced: boolean;                 // prefers-reduced-motion: calm fades, no camera moves, no tilt parallax
  safeRects?: Rect[];               // host: canvas CSS-px rects the scene must never draw over (tracking marker)
  assembleRect?: Rect;              // guest: canvas CSS-px rect where the card lands at the end of `assemble`
  test?: boolean;                   // test hooks exist only when true
  onLayer?(e: { index: number; id: string; phase: "lift" | "leave" | "arrive" | "settle" }): void;
  onDone?(e: { timeline: Timeline }): void;
  onLost?(message: string): void;   // context lost or fatal error
}
interface Rect { x: number; y: number; w: number; h: number }
```

## Handle

```ts
interface Handle {
  play(timeline: Timeline, o?: { at?: number }): Promise<void>;
  // `at` is a time in this device's performance.now() domain (the shell converts room time).
  // Default: now. Resolves when the timeline ends (never for `idle`).
  setTilt(x: number, y: number): void;          // host: device tilt, each in [-1, 1]; 0,0 when unknown
  setPose(m: Float32Array | null): void;        // guest: 4x4 column-major pose of the card plane in camera space
  setProjection(fovY: number, aspect: number): void; // guest: approximate camera intrinsics (degrees)
  replaceLayer(id: string, src: string): Promise<void>; // swap one layer image (e.g. a fresh QR for the next guest)
                                                 // without a visible jump; a 150 ms crossfade is allowed
  where(): { role: Role; timeline: Timeline; t: number };
  dispose(): void;                               // idempotent; frees GPU resources, rAF, listeners; remount allowed
}
```

Pose units: the card plane has width 1.0 (card units), origin at the card centre, +X right, +Y up,
+Z out of the host screen towards the viewer. Smoothing happens in the shell; the effect gets a
smoothed pose and may add only light interpolation.

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
- At most 3 flashes per second.
- Test hooks (`seek`, `setPaused`, `frames`, fake pose and tilt) only when `opts.test === true`, never in
  the production build.
- `dispose()` frees everything and leaves no running rAF.
- `three` is a peer dependency imported as `three`; the effect is built as an ES module into its own
  `dist/` and that `dist/` is committed.
