# blackhole — notes for agents working in this folder

`@layercard/effect-blackhole`: one effect that implements `packages/scene/CONTRACT.md` (v1.2). The guest
phone has gravity: the card on the host screen bends towards the guest camera, drains into a sink,
pours through the air as ribbons of its own pixels and fills the guest screen like a glass. Read
`PROMPT.md` for the brief, `SPEC.md` for what is built and how it is accepted, `REPORT.md` for the state
of the work, `RUNLOG.md` for how it got here. The effect started as a copy of the window effect
(`../window`, read-only for this folder). Code, comments and docs are in English (repo rule).

## Run

```sh
npm install                 # from the repo root (workspaces)
cd packages/scene/effects/blackhole
npm run dev                 # http://127.0.0.1:5277/demo/  — host, guest over the stand-in camera, test controls
npm run build               # tsc --noEmit, then dist/blackhole.js + font + licence (commit dist/)
sh scripts/checks.sh webkit # every check in one configuration: webkit | chromium (software GL) | metal (Chromium on the GPU)
npm run sheets              # contact sheets into artifacts/         (dev server must be running)
npm run video               # artifacts/blackhole-sequence.mp4      (dev server + ffmpeg)
npm run orbit               # artifacts/blackhole-orbit.mp4         (dev server + ffmpeg)
```

`scripts/checks.sh` runs everything but `perf` first and `perf` last under the GPU lock this Mac's
runs share (`scripts/gpu-lock.sh`, `~/dev/prv/products/layercard-runs/locks/gpu.lock`); video renders
should be started through `sh scripts/gpu-lock.sh …` too. Evidence lands in
`checks/results/<webkit|chromium|chromium-metal>/*.json`. `BLACKHOLE_BROWSER=webkit` makes every
script in `scripts/` use WebKit (on this Mac the only fast one for films: Playwright's Chromium draws
WebGL in software). `BLACKHOLE_CONTENT_DIR=/abs/folder` serves a card from outside the repo at
`/content/` (`?base=/content/` in the demo, `BLACKHOLE_BASE=/content/` for the scripts). Playwright is
pinned to the version whose browser builds are in the Mac's cache (1.65.1 ↔ Chromium 1255, WebKit
2388); change them together. The dev server must not be restarted or its sources edited while a check
run is going: the checks draw from the sources it serves.

## Layout

- `src/index.ts` — the three contract exports. `src/effect.ts` — the effect: `update*()` turns
  (timeline, t, inputs) into per-layer state, `apply()` pushes it to the GPU. `src/schedule.ts` — pure
  timing: the well's strength, per-layer clocks, shares, the level. `src/strip.ts` — the strip (one
  mesh per layer, placed row by row in the vertex shader), the lensing ring, the ribbon path in GLSL
  and in TypeScript. `src/liquid.ts` — the level's body and meniscus. `src/labels.ts` — label blocks
  that ride the ribbons. `src/gl.ts` — the flat sheets, lines, sprites, the glass test and the
  level's surface function every shader shares. `src/assets.ts` — images, the bake, QR grid
  detection, font, label atlas (the window effect's, unchanged).
- `demo/` — test-only stage (`window.demo`): host, guest, and `demo/camera.ts`, a stand-in camera
  that shows the live host canvas on a phone's screen. One fake pose drives the guest's `setPose` and
  the host's `setViewer`.
- `checks/` — Playwright specs; `harness.html` (`window.H`) mounts one effect, the stage checks
  (`glass-seam`, `pixels-conserved`) drive the demo page.
- `scripts/` — contact sheets, strips, stage looks, montages, videos, the check runner, the GPU lock.

## The model

- **Card space.** The card is 1 wide and H = h / w tall, centred on the origin, +Z out of the host
  screen. The glass is z = 0.
- **The well** is a dent behind the glass about the card's axis (`WELL` in `src/strip.ts`, constants
  in `src/schedule.ts`): a point is pulled towards the axis, turned about it (the swirl) and pushed
  behind the glass, all scaled by one strength a(t). **The sink** is the centre of the lensing ring,
  S = (0, 0, −0.30 a), a fixed point of card space.
- **Host** = what is at or behind the glass, through an off-axis frustum whose apex is the eye and
  whose window is the card's rect on the canvas (`hostWindow`). The eye is `setViewer`'s position or
  the tilt eye (`hostEye`). Where the sink shows on the screen follows from that projection alone.
  `idle`, `connect` and the closed end of `rebuild` are drawn flat instead (`hostFlat`): the exact frames.
- **A layer is one strip** (`stripGeometry`, `STRIP_VERT`): rows across its shorter side, ordered from
  the head (the end nearer the sink) to the tail. A row is at rest on the card, in the neck (sliding
  down the well), in the stub (sink → glass, straight at the eye), in the air (the ribbon), or
  collapsed at the end of the path once it is in the guest's level. Which one follows from the
  layer's clock `tau` (seconds since its head row entered the sink) and the row's coordinate u:
  `tau − u · feed`. `shares()` in `src/schedule.ts` is the same split as numbers.
- **The glass test** (`GLASS` in `src/gl.ts`, the window effect's): a fragment is dropped by the sign
  of its card-space z (`uSide`). The host keeps z ≤ 0, the anchored guest z > 0, the guest alone both.
- **Guest, anchored** = the air and its own screen: ribbons, labels, the level. **Guest, no pose** =
  everything, with a small virtual host phone near the top from a virtual pose that swings.
- **The level** is screen space: `lqSurface()` (in `src/gl.ts`) is the surface's height at a pixel
  column; the liquid, the meniscus and the floating layers all read it. The layers in the level are
  the flat sheets of the landing, shown as far as their rows have arrived (`uRev`) and below the
  surface (`uSub`); in `assemble` they are the landing itself.

## Rules that keep the checks green

- **The pixel rule** (peel v2's). Layers are rasterised by a 2D canvas at the resolution of the flat
  fit, at their absolute position on a scratch canvas the size of the drawing buffer, then copied
  1:1 (`bakeLayer`). The scratch canvases must be unaccelerated (`willReadFrequently`). Pixel checks
  assert the largest difference and run on a GPU (WebKit, Chromium on Metal) as well as in software.
- **Flat frames stay on the flat path**: `idle`, `connect`, the end of `rebuild` (host) and the end of
  `assemble` (guest) are drawn by the flat sheets, never by the strips. The joins: `depart` t = 0 is
  the flat card within 1/255 (the strips at rest, through the frustum), the end of `depart` is the
  start of `rebuild` exactly, the end of `rebuild` is idle frame zero exactly.
- **One layer, one place.** Host and guest compute the same clock from the same `Plan`; change the
  event in `src/schedule.ts` only. The stub is the first `STUB` of the path on both devices, by
  definition, and it is the part with z ≤ 0. Do not give the host its own idea of the ribbon.
- **The stub points at the eye.** The eye a frame is drawn for sees the stub end-on, so the guest's
  ribbon starts exactly at the sink the host draws. The air's last two control points hang from the
  guest's camera, so that end does not move with the pose.
- **The ring lies on the flat floor of the well** (inside its radius): one plane, so its centre on
  the screen is the sink's projection (`sink-follows-eye` measures the pixels).
- **Painter's order.** No depth buffer. Card background 0, guest's virtual card 1–2, strips and flat
  sheets 10 + 10 per layer, outlines 140, ring 150, the cut's rim of light 160, tags 500; guest: the
  level's body 800, its layers 810+, its meniscus 890, leaders 900, label sprites 901. A strip's
  triangles run tail → head, so its neck and ribbon are drawn over the part still at rest.
- **A frame is a pure function** of (role, timeline, t, tilt, pose, viewer, projection, images,
  canvas size, quality, reduced). No `Math.random`. Exceptions, all wall clock and skipped while
  paused: the 0.3 s blend when a viewer appears or disappears, the 350 ms blend when the pose does,
  and the label history in `src/labels.ts` (chrome only, cleared by `seek`). The swing of the
  unanchored pose is a function of `explode`'s own time and ends at rest with the event.
- **A viewer is used as given**, in the next frame, with no smoothing (the shell predicts it).
- **Nothing is allocated per frame** in `update*`, `place`, `float`, `setPath`, `apply`, `write*`,
  `layoutRibbonLabels`.
- **Test hooks are compiled out.** Anything test-only lives behind `__BLACKHOLE_TEST__` (a Vite
  `define`), in module-level functions. `checks/contract.spec.ts` greps `dist/blackhole.js`. The
  probe colours are a uniform no production code path sets.
- **Checks do not depend on the frame rate.** Anything about wall-clock easing steps the page clock
  (`viewer-switch`) or the effect's own step hook (`labels`).
- **A rebuilt `dist/` must reach the checks**: keep the `blackhole:fresh-bundles` plugin.
- **Schedule values are the same in every tier.** Tiers change pixel ratio, rows per strip (`seg`),
  anisotropy, shadow taps of idle's parallax, and the ripples where ribbons pour in (off at `low`).

## Contract (v1.2)

### Met (evidence in `checks/results/<browser>/` for webkit, chromium and chromium-metal unless noted)

| Contract item | State |
|---|---|
| Exports `supported`, `durations`, `mount` | met — `contract.json` (source and dist) |
| `durations()` pure, `idle` = 0, `depart` = `explode` | met — `contract.json` (7.75 s for any number of layers, connect 0.8, fly 1.2, assemble 1.0, rebuild 1.8) |
| Roles and timelines, wrong-role `play` rejects | met — `contract.json` |
| Host `connect`: the QR dissolves, the card is otherwise still | met — `frame-zero.json` (`connect`: nothing changes outside the QR), the window effect's dissolve unchanged |
| Host `depart`: layers leave one by one, each leaves its outline, ends in outlines only | met — top layer first (`contract.json`, order of `leave`), each layer's dashed outline is traced on the glass as its rows cross it, the end frame is the card background with the outlines and the tag `Pulled to guest` (`rebuild.json`, `artifacts/sheet-host-depart.jpg`) |
| Host `rebuild` ends in idle frame zero | met, 0 differing values — `rebuild-end.json`, `rebuild.json` |
| Guest `explode`: "layers lift off the host screen into a hovering exploded stack … full stack hovering, chrome drawn" | **met with a stated reading, by the brief**: this effect has no stack. The layers leave the host as ribbons and collect in a level in the guest's screen; `explode` ends with the level at 0.44 of the canvas, the last layer's rows still arriving, each ribbon carrying its label while it flies — `level-settles.json`, `labels.json` |
| Guest `fly`: comes into the guest screen, canvas opaque by the end | met — the level rises past the top; smallest alpha 255 at the end — `level-settles.json`, `assemble-overflow.json` |
| Guest `assemble` ends in the flat composite inside `assembleRect` | met within 1/255 (largest difference) — `assemble-end.json`, `assemble-overflow.json`, `level-settles.json` |
| QR layers take part only in `idle`, `connect`, `rebuild` | met — `rebuild.json` (QR re-forms 1.3–1.8 s), `assemble-end.json` (reference without QR); the QR is never a strip |
| Shared per-layer schedule host `depart` / guest `explode` | met by construction (one `Plan`, one clock per layer) and measured: both devices hold every layer's clock and shares identically in 1866 samples — `glass-seam.json` (`statesDiffer` 0), `pixels-conserved.json` |
| `play(timeline, { at })`, resolves at the end, never for `idle` | met — the dist checks play in real time |
| `setTilt`, `setPose`, `setProjection`, `replaceLayer` (150 ms crossfade), `where`, `dispose` | met — `frame-zero.json`, `contract.json`, `dispose.json` |
| `setViewer(eye \| null)` (v1.2), host: position in card space, +Z towards the viewer | met — `sink-follows-eye.json` (29 eyes: the ring's centre on the canvas is where the line from the eye to the sink meets the glass), `contract.json` (`setViewer` on the handle) |
| Viewer: may ease the eye at most 0.1 s | met — no easing at all: a new eye is the eye of the next frame, error 0 — `viewer-switch.json` (`followError`) |
| Viewer: must ease any switch between a viewer and none | met — 0.3 s cubic — `viewer-switch.json` |
| Pose: OpenGL camera space | met — `glass-seam.json` projects the pose independently |
| `setProjection` aspect = canvas aspect | met — every check passes the canvas aspect |
| `safeRects` never drawn over, at most four | met — `safe-rects.json` (alpha 0 through the four host timelines), `marker-untouched.json` (the pixels never change through `connect` and `depart`, one rect on the sink itself) |
| Flat reference: contain, centred, unrounded, `drawImage` high quality at absolute positions | met within 1/255 (largest difference) — `frame-zero.json`, `rebuild-end.json`, `assemble-end.json`, `assemble-overflow.json` |
| `assembleRect` may extend past the canvas | met — `assemble-overflow.json` |
| `onLayer` phases | met with a stated reading — `contract.json`. `leave` (host) and `lift` (guest) fire at the same moment, when the layer's first row crosses the glass (0.6 s of neck and 0.13 s of stub after its neck starts); `settle` when its last row is in the level (the last layer's at the end of `explode`: its rows are still arriving); `arrive` in `assemble` when the layer locks flat, in `rebuild` when its last row is back at rest |
| No requests except layer files and bundled assets | met — `contract.json` (`mountRequests`) |
| No DOM beyond the given canvas, no sensors | met with peel's stated reading: detached canvases, `Image` elements for decoding and `document.fonts` for the bundled `FontFace` are used; nothing is attached to the document |
| Guest canvas transparent during `explode` | **met with a stated reading, by the brief**: the canvas has no background and is transparent above the level; the level itself is opaque and reaches 0.44 of the canvas height by the end of `explode` (the brief asks for it). Anchored, the guest draws nothing at all before the first row crosses the glass (`glass-seam.json`, `guestPixelsBeforeAnyCrossing`). If the shell needs the camera image everywhere through `explode`, the fill has to move into `fly` — see `REPORT.md` |
| Deterministic in timeline, time and inputs (tilt, pose, viewer) | met — `determinism.json` (two viewers, across seeks and a remount), `unanchored.json` (the swing is a function of `explode`'s own time; `fly` starts from one pose) |
| Chrome may keep short history, settles within 0.3 s, `seek` clears it | met — `labels.json` (settles in 208–224 ms after a 30° jump of the pose; the same seek gives the same pixels) |
| At most 3 flashes per second | met — `flash.json` |
| Test hooks only with `opts.test === true`, never in the production build | met — `contract.json` (`hooksWithoutTestFlag`, `bundle.hasTestHooks`) |
| `dispose()` frees everything, no rAF | met — `dispose.json` |
| `three` as peer dependency, ES module in `dist/`, committed | met — `package.json`, `contract.json` (`bundle.imports`) |

### Not verified in this run

- **Real phones.** No frame was drawn on an iPhone or an Android phone: frame times, the `mid` tier
  at 60 fps, pixel exactness there are unverified. Playwright WebKit on a Mac is not Mobile Safari.
- **A real camera.** Everything "through the camera" is the demo's stand-in: a pinhole camera that
  sees the host canvas as a texture, minified with mipmaps. Exposure, glare, the screen's own
  brightness, a rolling shutter and a lit room were not looked at.
- **A real viewer.** The eye was always exact and never late. With the shell's real relay (about
  30 Hz, predicted) the sink on the host's screen lags the hand by whatever the prediction misses;
  the effect hides that only at the ribbon's host end (soft, thin, slow), not in the bend itself.
- **A real tracker.** Poses were synthetic; jitter was looked at with the demo's switch only.
- **Light cards.** No check and no look: the ring picks the colours that differ most from the
  background, the ribbons' backing is the background colour; on a light card a ribbon is a light strip
  over a lit room.
- **The page under the landing**, as in peel v2: the end frame equals the contract's 2D-canvas
  reference; whether the swap to the shell's `<img>` elements is invisible on a phone was not looked at.
