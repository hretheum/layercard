# blackhole — scene brief for Claude Fable 5.2 (v5)

Create a maximum-ambition Three.js scene module in which the guest's phone becomes a BLACK HOLE for the host's card: the moment a guest points their camera at the host's phone, the card on the host's real screen starts to bend towards the guest's lens — its pixels stretch, swirl and lens around a point that faces the camera, then pour out of the glass as long twisted ribbons of the card's own pixels, stream through the air between the two phones and fall into the guest's screen, which fills up with the card like a glass filling with liquid, until the surface settles and the card is the guest's whole screen.

Do not build a space wallpaper, a glowing accretion-disc cliché, a particle swirl, or a cartoon vortex drawn over the camera image. Build gravity that acts on a real interface: the pixels being pulled are the card's own pixels, the bending happens on the host's actual screen for the guest camera's eye, and nothing is drawn that is not part of the card.

Core idea: your phone has gravity — point it at my card and the card falls into it.

The goal is the impression of a physical pull acting on an image: lines of the card's grid curving towards one point, the name stretching like taffy, the mark spiralling inward, ribbons that keep the card's colours and text recognisable while they twist, a liquid level rising in the guest's screen with a surface that wobbles and settles. Achieve this with a gravitational-lens warp of the layer textures rendered on the host screen through head-coupled perspective (contract v1.2 `setViewer`), ribbon meshes that carry the layers' pixels along stretched UVs across the glass, and a fill simulation in screen space on the guest — not with bloom, generic particles, noise clouds or a video.

This is an iterative project in a real repository. You work in `packages/scene/effects/blackhole/` of the `layercard` repo — a new effect, yours — in worktree `layercard-scene-v5`, branch `scene/blackhole-v5`, which starts from `scene/window-v3`. Same stack: Vite and TypeScript, three pinned as a peer dependency, `WebGLRenderer` on WebGL2. The module implements `packages/scene/CONTRACT.md` v1.2 (Appendix A, binding). The example card is `examples/jane-maker/`. You may copy any code into your folder and adapt it from the three effects already built, all green in WebKit and Chromium: `packages/scene/effects/peel/` (v2: exact flat bake with its GPU fix, in-place lift-off, labels with history, full-bleed landing, check harness), `packages/scene/effects/window/` (v3: head-coupled perspective on the host from `setViewer`, the split of a layer at the glass between the two phones, the stand-in camera that shows the live host canvas) and, on branch `scene/spill-v4`, `packages/scene/effects/spill/` (v4: room-scale objects that stay put under jitter; read it with `git show`, never check it out). Those folders are read-only for you. Realism here means gravity made visible on a real screen and in real air, judged through a phone camera held by a person who moves; the style stays the design tool's world made physical.

#### OTHER RUNS MAY BE WORKING NEXT TO YOU

Other sessions may run on this Mac at the same time (demos on ports 5273–5276, worktrees `layercard-scene`, `layercard-scene-v2`, `-v3`, `-v4`). Neither of you may get in the other's way:
- Work only in `layercard-scene-v5`. Never open, build, test, commit or install in another worktree, never check out another branch, never run `git gc`, `git prune` or anything that rewrites shared history or refs; your commits go only to `scene/blackhole-v5`.
- Your demo dev server runs on port 5277; your scratch stays in `artifacts/tmp/` of your folder; your renders outside the repo go to `~/dev/prv/products/layercard-runs/blackhole-v5-eryk/`. Never stop a process you did not start.
- GPU-heavy work (the `perf` check, video renders) takes the lock `~/dev/prv/products/layercard-runs/locks/gpu.lock` (`mkdir` to take it, remove it when done; if it exists, wait up to 10 minutes, then go on and say so). Note in `perf` evidence which other demo ports were listening during the measurement.
- Your notes for the article go only into your own diary file and materials folder (below); other diaries you may read, never edit.

#### FIRST FRAME - STILL JUST A CARD

- Host `idle` frame zero is the flat card exactly (contract flat reference, largest difference ≤ 1/255 in both browsers); the QR scans throughout `idle`; idle breathing as in peel v2. No title, hint or loading theatre.
- Never draw over `safeRects` from `idle` to the end of `depart`: the tracking marker lives there; the pull must bend everything around it but leave the marker rect untouched and readable the whole time.

#### THE PULL - THE HERO

Host `depart` and guest `explode` are one event with one schedule, 7–8 s; `durations()` reports exact values, identical on both roles.
- **The pull starts** (about 0–1.2 s): on the host's screen a point appears where the line from the guest camera (the viewer) meets the card — the sink. The card's pixels begin to bend towards it like light around a mass: grid lines curve, the edges of the layers bow inward, the image near the sink lenses into a thin bright ring of the card's own colours. Rendered through head-coupled perspective, so from the guest's camera the sink sits slightly behind the glass and the bending has depth.
- **Spaghettification** (about 1.2 s to the end): top layer first, each layer stretches towards the sink, twists once or twice and leaves the glass as a ribbon — its pixels, its text, its colours, stretched along the ribbon but still recognisable — through the sink and out into the air. On the host the layer's pixels drain into the sink and its dashed outline stays behind; in the guest's anchored view the ribbon continues in front of the glass, arcs through the air and enters the guest's screen at its bottom edge, as if pouring into the phone. A layer exists in one place at a time: the glass splits it between the two phones exactly as in the window effect (host draws z ≤ 0, guest draws z ≥ 0).
- **The glass fills** (from about 2 s): on the guest's screen, everything that has poured in collects as a level rising from the bottom — the card background as a liquid, the arrived layers floating in it, a surface with a small deterministic wobble and a hairline meniscus. By the end of `explode` the level has risen to about the middle of the screen; above it the camera image and the stream.
- **Labels**: each ribbon carries its layer's label chip and dims riding along it (peel v2's chrome, screen-space, at least 12 CSS px, easing on history), so the viewer can tell which layer is falling.
- **Host end of `depart`**: the sink collapses to a point and goes out; the screen shows the empty card background with the layers' dashed outlines, tag "Pulled to guest" or your own words (English, at most 16 characters).
- **Host without a viewer**: the sink sits where the tilt eye points (as the window's tilt eye) and the ribbons are cut at the glass with a thin rim of light.
- **Guest, unanchored**: no phone in view; the guest's screen shows a small virtual host phone near the top, its card bending and pouring down in ribbons into the rising level, from a slowly drifting virtual eye; the same schedule; everything named above shows.
- **Design for the camera and the hand**: in the camera image the host screen is only 90–150 px wide, so the bend must read in big strokes — the grid's curvature and the stretch of the name — not fine detail; the guest end of each ribbon is fixed to the guest's screen, so jitter only moves its host end — make that end soft and heavy so tracking error disappears in the motion; in a lit room the ribbons stay bright and readable, never murky.
- Thesis shot: through the guest's camera the host phone's screen is bent like a lens towards the camera, the name stretched into a ribbon that twists across the air and pours into the bottom of the guest's screen, where the level is rising.

#### SETTLING - FLY AND ASSEMBLE

- Guest `fly` (about 1.2 s): the last of the stream drains in, the level rises to fill the screen, the camera image is covered; the canvas is opaque card background at the end.
- Guest `assemble` (about 1.0 s): the surface calms, the floating layers drift to their places and lock flat; the end frame equals the flat reference in `assembleRect` (full-bleed, including rects that run past the canvas) within 1/255 — no wobble, no meniscus, no leftover distortion.
- Host `rebuild` (about 1.8 s): the sink reappears and pours the card back out — layers unspool from it in reverse order to their places, the bend relaxes, the QR re-forms last; the end frame equals `idle` frame zero exactly.

#### MOTION

Independent systems, deterministic in time and inputs: (1) the lens warp of the card around the sink, (2) the sink's position following the viewer or the tilt eye, (3) per-layer stretch, twist and drain, (4) ribbons travelling through the air on heavy curves, (5) the split at the glass, (6) the rising level and its wobble and meniscus, (7) host residue outlines, (8) the QR dissolve, (9) label easing. Freeze any frame and it reads as a precise diagram of an image falling into a point; watch it twice and the second time you follow one letter of the name all the way into the guest's phone. With `reduced`: the warp is static and gentle, layers fade from the host and fade in under the rising level without ribbons, the level rises without wobble; the end frames stay exact.

#### STYLE LAW AND PALETTE

Gravity acting on a design file. Everything visible is made of the card's own pixels and colours (from the layers and the manifest) plus peel's chrome: selection blue `#2F80FF`, measure red `#FF4D3D`, chip text `#FFFFFF`, acrylic rim `#EAF2FF`. No stars, no space backdrop, no glow beyond the thin lensing ring, nothing blurs except motion stretch along a ribbon. Bright and readable in a lit room: the bend legible at a glance through the camera, the ribbons' text legible on inspection.

#### PERFORMANCE

- Host: lens warp and ribbons from a moving eye, scene ≤ 6 ms per frame at `high` on an integrated laptop GPU; `mid` 60 fps on an iPhone 12-class phone. Guest: ribbons plus the fill, the same budget while the shell runs camera and tracker.
- Ribbons reuse the layer textures (no new full-size textures); the warp is a shader on existing quads; texture memory within peel's budgets.
- Lower tiers give up ribbon segments, wobble detail and resolution first; frame-zero fidelity, QR scannability and the untouched marker, the exact end frames, identical timings across tiers, correct perspective for the eye and one layer, one place are never traded away. Precompute the schedule; no allocations per frame; `dispose()` frees everything.

#### WHAT YOU DELIVER

In `packages/scene/effects/blackhole/`:
- `package.json` (`@layercard/effect-blackhole`), `src/`, `dist/blackhole.js` (ES module, committed), font and licence (peel's subset may be reused).
- `demo/`: host and guest side by side, the stand-in camera with the live host canvas on the phone screen and the guest's own screen visible beside it, a fake pose you orbit by dragging that drives both the guest's `setPose` and the host's `setViewer` (the eye as the inverse of the pose, as the shell does), viewer on/off, jitter switch, quality and reduced switches, every timeline and "play all".
- `checks/` (Playwright), every one in WebKit and Chromium: the inherited checks adapted (frame-zero, assemble-end with overflowing rects, rebuild-end, determinism with viewer input, dispose, reduced, flash, perf, qr, safe-rects, contract, labels, glass-seam, viewer-switch), plus:
  - `marker-untouched`: during `connect` and `depart` the pixels inside `safeRects` never change;
  - `sink-follows-eye`: for at least 12 eyes (30–60 cm, up to ±35°) the sink lands within 2 CSS px of where the line from the eye through the card's centre region meets the screen, per your SPEC's definition;
  - `pixels-conserved`: every layer is accounted for at every sampled moment — on the host, in the air or in the guest's level — and never in two of them at once;
  - `level-settles`: the fill level is monotonic, and the last 0.3 s of `assemble` contain no wobble.
- `artifacts/`: contact sheets for every role × timeline (anchored frontal, 20°, 35°; unanchored), a stand-in camera orbit video during the pull, and the full sequence side by side.
- The owner's card, for looking only: renders from `~/dev/prv/products/layercard-content/eryk/` into `~/dev/prv/products/layercard-runs/blackhole-v5-eryk/`; never copy its files, names or text into the repo, commits, artifacts or report.
- `SPEC.md`, `RUNLOG.md`, `process/`, `CLAUDE.md` (Contract section v1.2), `REPORT.md`.

#### THE DIARY, THE MATERIALS AND THE PROGRESS — KEPT LIVE

The owner is writing an article about this project and follows your run from his notes. Keep three things up to date during the run, not at the end:
- **Your diary file:** `<owner's private notes>/Dziennik do artykułu — scena blackhole.md`. Create it at the start with frontmatter like the sibling `Dziennik do artykułu — scena peel.md` (title, `provenance: ai_authored`, agent, date, session context, `status: zbierane na bieżąco`). Write in Polish, plainly, for the article: after every milestone and after every surprise, wrong assumption, measurement or decision worth telling, add an entry headed with the time from `date` and a short title, two to five bullets, the numbers with their source, and an embedded image. Facts only: no feelings or opinions attributed to the owner.
- **Your materials:** `<owner's private notes>/blackhole-v5/` (it exists) — screenshots, contact sheets and short videos referenced by the diary, named `YYYY-MM-DD blackhole <what it shows>.png`. Renders of the owner's card may go here too: the vault is private, unlike the repo.
- **Progress:** the top of the diary holds a `## Progress` section — one checklist line per milestone (B1–B5) with status (`[ ]` waiting, `[~]` in progress since HH:MM, `[x]` done at HH:MM with the commit hash) and a "now:" line saying what you are doing. Update it when a milestone starts, when it ends, and whenever "now" changes meaningfully.
These three writes are outside the repo and allowed without asking; nothing else outside your folder is.

#### HOW YOU WORK

- The `blackhole` folder is yours: its structure and tidiness are your call. Without asking: installs from the root of your worktree, builds and checks, edits and commits inside your folder on `scene/blackhole-v5`, the renders, diary and materials named above. Ask before: pushing, merging or rebasing, creating or moving tags, touching any other worktree, branch or effect, editing `packages/scene/CONTRACT.md`, `packages/scene/types.d.ts` or `examples/`, deleting files outside your folder. Nobody is watching this run: if one of those seems needed, take the reversible option and put it in the report. If the contract blocks you, implement against it as written and propose the change in the report.
- The shell already relays the viewer to the host (about 30 Hz, predicted up to 120 ms ahead, null after 300 ms without samples); the stand-in camera is still where you judge the hero, so keep it faithful.
- Before code, write `SPEC.md`: what you build and a list of acceptance items, each checkable by a test, a build, a screenshot or a number. After every milestone, check yourself against it. If an approach turns out wrong, throw it away and rebuild rather than patch.
- Milestones, each ending in a commit with a contact sheet, a diary entry and a Progress update: B1 skeleton — the window effect copied and renamed, its checks green in both browsers; B2 the pull on the host — lens warp, sink following the eye, marker untouched, judged through the stand-in camera; B3 the ribbons and the split at the glass, `pixels-conserved` green; B4 the fill on the guest, `fly`, `assemble`, `rebuild`, the unanchored guest; B5 the owner's card, artifacts, perf, report. B2 is the foundation: if the bend does not read as gravity through the stand-in camera, nothing after it matters. The event is tomorrow morning: if you have to stop before the end, stop at a milestone boundary with every check green.
- Look at your own output early — a first screenshot no later than about your tenth step — and after every change that alters the image; describe what you see against `SPEC.md`. Taste is judged by the card's owner; record your creative decisions instead of approving them.
- Before you start, say in one sentence what you are doing; give a one-line update every few steps.
- Ordinary obstacles you diagnose and work around; if something looks impossible, try it before setting it aside and record the attempt. Subagents only for work whose mistakes are easy to catch, on a cheaper model; decisions and code edits stay with you.
- Nothing larger than 1 MB goes into git except `dist/`, the font and the artifacts named above; scratch goes to `artifacts/tmp/` (gitignored).
- If rules conflict: the contract and cross-device determinism win, then not getting in other runs' way, then the exact flat frames in both browsers with QR scannability and the untouched marker, then correct perspective and one layer, one place, then the budgets, then polish, then process rules. Name every such choice in the report.
- Finish with `REPORT.md` for a smart reader who saw none of your work: the most important things first, plain words, how the pull looks through the stand-in camera (with the evidence files), what works and what does not, what waits for the owner, what you would do next, every creative decision you made, and proposed lines for `docs/build-log.md`. Close the diary with a final entry and set every Progress line.

Acceptance bar: the job is not done if the pull looks like a swirl painted on top of the camera image, if the bend does not follow the guest's camera, if the marker is ever touched, if a layer is ever in two places or lost, if the level does not settle into an exact flat card, if a check passes only in Chromium, if the diary and Progress were written only at the end, or if anything of another run was touched. Done means: through the stand-in camera the host's card bends towards the lens from every angle in the grid, pours out of the glass in recognisable ribbons and fills the guest's screen; the landing and the rebuild are exact in both browsers and the QR scans in `idle`; the unanchored path reads on its own; at least five motion systems run independently; the budgets hold with numbers; the diary, materials and Progress tell the run as it happened; and nothing named here is missing from the screen — if something cannot be shown, cut it and say so instead of faking it.

In one sentence: the guest's phone has gravity, and the card falls into it — bending on the real screen, pouring through the air, filling the glass.

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
