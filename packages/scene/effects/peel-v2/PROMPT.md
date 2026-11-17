# peel — scene brief for Claude Fable 5.2 (v2)

Create the second, sharper version of a maximum-ambition Three.js scene module for a phone business card that comes apart: the card lies flat on the host's phone screen, its QR dissolves when a guest connects, its layers LIFT off the glass as thin acrylic sheets, hang above the host's phone in the guest's camera as a labelled, measured exploded stack, then fly into the guest's phone and become the guest's whole screen. Version 1 of this module exists, works and is live; version 2 closes the three seams a real camera exposes: a layer that is briefly in two places, labels that shake and cross, and a landing that no longer matches the page it hands over to.

Do not rebuild v1 from scratch, restyle what this brief does not name, add a second effect or buy smoother motion with less exact flat frames. Build v1 with every seam closed, so that through a phone camera nothing ever gives the trick away.

Core idea: one layer, one place — at every instant a layer is either printed on the host's glass, in the air or in the guest's hand, never two of these at once.

The goal is the impression of a single physical sheet travelling between two phones: seen through the guest's camera, the print peels up off the host screen at exactly the spot where it was printed; the label beside it stays put while two people's hands tremble; the sheets drop into the guest's phone and the card fills the screen edge to edge. Achieve this with a host-side lift in place timed to the guest's lift, chrome that eases on its own short history, and a landing solved for a full-bleed target — not by dimming the host screen, hiding the camera image or shrinking the card to fit.

This is an iterative project in a real repository. You work in `packages/scene/effects/peel/` of the `layercard` repo, worktree `layercard-scene-v2`, branch `scene/peel-v2`, which starts from v1 (commit c558f97, tag `peel-v1.0`). Same stack as v1: Vite and TypeScript, three pinned as a peer dependency, `WebGLRenderer` on WebGL2. The module implements `packages/scene/CONTRACT.md` **v1.1** (Appendix A, binding; it clarifies v1 and adds one permission, chrome history). The example card is `examples/jane-maker/`. Realism here means stylistic fidelity to a design tool's layer view made physical, now judged through a real phone camera: the viewer must never catch a layer existing twice or a label jumping.

#### V1 IS THE FLOOR - KEEP WHAT WORKS

- Read v1 first: `history/v1/` holds its brief, spec, run log, report (with its limits and the 17 creative decisions) and artifacts. Its code is what this branch contains now.
- All 16 v1 checks stay green throughout; they are the floor, not the goal.
- Unchanged unless a section below changes it: the style law and palette, idle breathing and tilt parallax, the QR dissolve in `connect`, the stack geometry (0.08 / 0.11 / 0.035 / 0.012 card units), the selection chrome's look (chips, handles, red dims pill, measurement lines, Iosevka subset), the unanchored pose, reduced-motion behaviour, and every v1 creative decision not named here. The card's owner has not judged v1's taste yet; changing taste is not this run's job.
- v1 must stay recoverable byte for byte. The tag `peel-v1.0`, the branch `scene/peel-v1` and the worktree `layercard-scene` are not yours: never check them out, commit to them or move them. To render v1 for comparison, extract its `dist/peel.js` from the tag into `artifacts/tmp/v1/` (gitignored).

#### ONE LAYER, ONE PLACE - THE LIFT-OFF

This is the hero change. In v1, while a layer rose in the guest's anchored view, the host screen still showed it sliding off to the right for up to 0.9 s: through the camera, the same layer was visible twice.
- Host `depart`: a layer never moves sideways. When its turn comes it lifts in place: in the first 0.25 s of its lift it swells by 3–4% around its own centre, casts a contact shadow that drifts away from it as it rises, and fades out; its dashed outline (unchanged look) is complete when the print is gone. Someone looking at the host screen alone must read "it rose towards me", not "it faded". The tag beside the outline names where the layer actually went — choose the words (English, at most 16 characters, mono) and record them.
- Guest anchored `explode`: at the start of its lift the sheet lies exactly on the glass where the host shows that layer — projected corners within 1 CSS px of the layer's place on the host screen under the given pose — and rises from there along +Z. By the time it is one sheet gap (0.11 card units) above the glass, the host's print of it is gone. Through the camera the print peels up off the screen.
- Host `rebuild` runs the lift backwards: reverse order, each layer descends into its place and its outline clears as it lands; the QR re-forms last; the end frame equals `idle` frame zero exactly.
- Keep the per-layer start times and the 6.0–6.5 s total of v1 unless the lift truly needs otherwise; `durations()` reports exact values, identical on both roles.
- Unanchored guest: same schedule; it never saw the host screen, so it changes only where the shared timing does.

#### LABELS THAT HOLD STILL

- Leaders never cross, in any view: including the stack cut by any screen edge or corner (v1 crossed in three such views). Blocks never overlap, stay inside the 8% margins and keep at least 12 CSS px text. If a pose admits no crossing-free layout beside the stack, change the arrangement for that pose, not the rule; record which poses needed it.
- Use the chrome history allowed by contract v1.1: when the pose trembles (the shell's smoothed pose still moves the projected card by 1–2 CSS px at 50 cm), label blocks stay put. Ease block positions (critically damped, settling in at most 0.25 s); hold each block's side and row with hysteresis so a swap happens at most once per 0.5 s and slides instead of jumping. Sheets, frames and handles follow the pose exactly every frame; a leader's sheet end follows its corner exactly, only its block end eases.
- With `reduced`, blocks snap to the stateless layout (no easing motion), still with hysteresis.

#### THE LANDING IS THE PAGE

- The shell now shows the guest a page that IS the card: after `assemble` it replaces the canvas with the same layers as `<img>` elements at the flat-reference positions, full width of the screen, no thumbnail. So `assembleRect` is full-bleed: `{0, 0, 390, 844}` on a 390 × 844 screen, and on short screens (iPhone in Safari with its toolbars) it runs past the bottom edge, e.g. `{0, 0, 393, 850}` on a 393 × 659 canvas.
- `fly`: the deck stays inside the canvas width — v1's 1.12× deck would be clipped at the sides of a full-bleed landing. Choose the deck size and record it; `assemble` then grows the sheets into `assembleRect`. During `fly` and `assemble` nothing is clipped by the side edges; only the part of `assembleRect` below the canvas falls outside.
- End frame: the flat reference inside `assembleRect`, clipped by the canvas, within 1/255 — for full-bleed rects, overflowing rects and the old centred, smaller rect (other shells may still use one).
- What the page does next (on short screens it folds the card's window to fit its buttons) belongs to the shell. The scene ends flat and whole.

#### SAFARI IS WHERE IT RUNS

- Most guests open the QR link from an iPhone camera, so the guest view runs in iOS Safari, which is WebKit. v1 was measured only in Chromium.
- Every check runs in Playwright WebKit as well as Chromium; results are written per browser. Install the WebKit build with Playwright if it is missing.
- Pixel checks (frame zero, assemble end, rebuild end) compare against a 2D composite rendered in the same browser. A WebKit difference above 1/255 is a bug to find (premultiplied alpha, colour space, texture upload, smoothing), not a threshold to loosen; if one remains, give its values and cause in the report.

#### MOTION

v1's seven independent systems stay; system 4 (host residue) now carries the in-place lift and its drifting shadow, and the label easing joins as an eighth, chrome-only system. Freeze any frame and it still reads as an exact exploded diagram; watch the anchored explode through the stand-in camera and every layer exists in exactly one place.

#### PERFORMANCE

Tiers and budgets as in v1, measured in both browsers, numbers in `perf` JSON. The chrome history allocates nothing per frame. Lower tiers give up resolution and shadows first; frame-zero fidelity, QR scannability, label legibility, the exact end frames, identical timings across tiers and "one layer, one place" are never traded away.

#### WHAT YOU DELIVER

In `packages/scene/effects/peel/`:
- Updated `src/`, `dist/peel.js` (committed), the demo with every v1 control plus a jitter switch for the fake pose.
- New checks, all in both browsers: `lift-handoff` (host: no layer pixel outside its own rect during `depart` and `rebuild`; print gone by one sheet gap of rise; guest anchored: projected corners at lift start within 1 CSS px, in a frontal and a 35° view), `leaders-grid` (at least 60 synthetic poses at 30–60 cm and up to ±35°, including the stack cut by each edge and each corner: 0 crossings, 0 overlaps, margins held), `label-steady` (a fixed synthetic jitter of 1.5 CSS px at 30 Hz on the projected card: block centres move at most 0.5 CSS px per frame at p95, swaps at most 2 per second; the same seek twice gives identical pixels), `assemble-overflow` (end frame exact for 390×844 in 390×844, 393×850 in 393×659, 320×693 in 320×568 and one centred smaller rect).
- `artifacts/`: v2 contact sheets for every role × timeline, plus v1-vs-v2 side-by-side sheets of the host `depart` and the anchored `explode` (frontal and 35°), and one side-by-side video of the whole v2 sequence.
- The owner's real card, for looking only: `~/dev/prv/products/layercard-content/eryk/layers.json` and its images. Render its anchored and unanchored sheets and the landing into `~/dev/prv/products/layercard-runs/peel-v2-eryk/`, outside the repo. Never copy its files, names or text into the repo, commits, artifacts or report — the repo will be public; call it "the owner's card" and give the outside path.
- `SPEC.md`, `RUNLOG.md`, `process/` (one captioned image per milestone), `CLAUDE.md` with its Contract section updated to v1.1, `REPORT.md`.

#### HOW YOU WORK

- This folder is yours: its structure and tidiness are your call. Without asking: installs from the repo root, running checks and builds, edits and commits inside this folder on `scene/peel-v2`, writing into `~/dev/prv/products/layercard-runs/peel-v2-eryk/`. Ask before: pushing, merging or rebasing, creating or moving tags, touching anything of v1 (tag, branch, worktree), editing `packages/scene/CONTRACT.md`, `packages/scene/types.d.ts` or `examples/`, deleting files outside this folder. Nobody is watching this run: if one of those seems needed, take the reversible option and put it in the report.
- Start the demo dev server on port 5274; v1's may be running on 5273.
- Before code, write `SPEC.md`: what v2 changes and a list of acceptance items, each checkable by a test, a build, a screenshot or a number. After every milestone, check yourself against it. If an approach turns out wrong, throw it away and rebuild rather than patch.
- Milestones, each ending in a commit with a contact sheet: V1 baseline — v1 code unchanged, all 16 checks run in WebKit too, differences recorded and fixed; V2 the lift-off (host and anchored guest); V3 the full-bleed landing; V4 labels (grid and steadiness); V5 the owner's card sheets, v1-vs-v2 artifacts, perf, report. The lift-off and the landing are what every guest sees: they come first and must be excellent. If you have to stop before the end, stop at a milestone boundary with every check green.
- Look at your own output early — a first screenshot no later than about your tenth step — and after every change that alters the image. Describe what you see against `SPEC.md`. Taste is judged by the card's owner; record your creative decisions instead of approving them.
- Before you start, say in one sentence what you are doing; give a one-line update every few steps; after each milestone add one line to `RUNLOG.md` and one captioned image to `process/`.
- Ordinary obstacles (failing builds, flaky checks, timeouts, a missing browser) you diagnose and work around. If something looks impossible, try it before setting it aside, and record the attempt.
- Give subagents only work whose mistakes are easy to catch (running checks, reading logs), on a cheaper model; decisions and code edits stay with you.
- Nothing larger than 1 MB goes into git except `dist/`, the font and the artifacts named above; downloads and scratch files go to `artifacts/tmp/`, which is gitignored (v1's history carries a 5.6 MB archive by accident).
- If rules conflict: the contract and cross-device determinism win, then keeping v1 recoverable, then the exact flat frames in both browsers with QR and label legibility, then "one layer, one place", then the budgets, then polish, then process rules. Name every such choice in the report.
- Finish with `REPORT.md` for a smart reader who saw none of your work: the most important things first, plain words, what changed from v1 and how it looks through a camera (with the evidence file), what does not work, what waits for the owner, what you would do next, every creative decision you made, and proposed lines for `docs/build-log.md`.

Acceptance bar: the job is not done if the host still shows a layer while the guest sees it in the air, if labels jitter or cross anywhere, if the landing clips at the sides or misses the page by a pixel, if any check passes only in Chromium, or if v1 can no longer be rebuilt from its tag. Done means: through the stand-in camera every layer is in exactly one place at every frame, frontal and at 35°; the host's in-place lift reads as rising, alone and through the camera; leaders never cross across the whole pose grid and blocks hold still under jitter; the landing is exact for full-bleed, overflowing and small rects; all v1 checks and the new ones pass in both Chromium and WebKit with evidence in `checks/` and `artifacts/`; the budgets hold with numbers; the owner's card sheets exist outside the repo; and nothing named here is missing from the screen — if something cannot be shown, cut it and say so instead of faking it.

In one sentence: the same card taking itself apart above one phone and landing as another phone's whole screen, now with no frame in which the trick shows.

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
