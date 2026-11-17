# window — notes for agents working in this folder

`@layercard/effect-window`: one effect that implements `packages/scene/CONTRACT.md` (v1.2). The host
phone becomes a window into a lit cavity behind its glass; the card's layers hang in it and leave
through the glass to the guest. Read `PROMPT.md` for the brief, `SPEC.md` for what is built and how
it is accepted, `REPORT.md` for the state of the work, `RUNLOG.md` for how it got here. The effect
started as a copy of peel v2 (`../peel`, read-only for this folder). Code, comments and docs are in
English (repo rule).

## Run

```sh
npm install                 # from the repo root (workspaces)
cd packages/scene/effects/window
npm run dev                 # http://127.0.0.1:5275/demo/  — host, stand-in camera and guest, test controls
npm run build               # tsc --noEmit, then dist/window.js + font + licence (commit dist/)
npm run check               # every check in Chromium and in WebKit; evidence in checks/results/<browser>/*.json
npm run sheets              # contact sheets into artifacts/      (dev server must be running)
npm run video               # artifacts/window-sequence.mp4       (dev server + ffmpeg)
npm run orbit               # artifacts/window-orbit.mp4          (dev server + ffmpeg)
```

`npm run check -- --project=webkit` (or `chromium`) runs one browser. `WINDOW_GL=metal WINDOW_CHANNEL=chromium`
runs Chromium on the real GPU and writes to `checks/results/chromium-metal/`; without it Playwright's
headless shell renders WebGL in software. `WINDOW_BROWSER=webkit` makes every script in `scripts/` use
WebKit. `WINDOW_CHROME=/path/to/browser` replaces Playwright's Chromium. `WINDOW_CONTENT_DIR=/abs/folder`
serves a card from outside the repo at `/content/` (`?base=/content/` in the demo, `WINDOW_BASE=/content/`
for the scripts). Playwright is pinned to the version whose browser builds are in the Mac's cache
(1.65.1 ↔ Chromium 1255, WebKit 2388); change them together.

## Layout

- `src/index.ts` — the three contract exports. `src/effect.ts` — the effect: `update*()` turns
  (timeline, t, inputs) into per-sheet state, `apply()` pushes it to the GPU. `src/schedule.ts` —
  pure timing of the event. `src/cavity.ts` — the room behind the glass. `src/gl.ts` — shaders,
  geometries, materials and the glass test every shader shares. `src/assets.ts` — images, the bake,
  QR grid detection, font, label atlas. `src/layout.ts` — label placement (peel v2's).
- `demo/` — test-only stage (`window.demo`): host, guest, and `demo/camera.ts`, a stand-in camera
  that shows the live host canvas on a phone's screen. One fake pose drives the guest's `setPose`
  and the host's `setViewer`.
- `checks/` — Playwright specs; `harness.html` (`window.H`) mounts one effect, the stage checks
  (`window-truth`, `glass-seam`) drive the demo page.
- `scripts/` — contact sheets, strips, stage looks, montages, videos, quick looks, the font recipe.

## The model

- **Card space.** The card is 1 wide and H = h / w tall, centred on the origin, +Z out of the host
  screen. The glass is z = 0, the cavity the box behind it, `CAVITY_DEPTH` (3) deep.
- **Host** = what is behind the glass, through an off-axis frustum whose apex is the eye and whose
  window is the card's rect on the canvas (`hostWindow`). The eye is `setViewer`'s position or the
  tilt eye (`hostEye`). `idle`, `connect` and the closed end of `rebuild` are drawn flat instead
  (`hostFlat`): those are the exact frames.
- **Guest, anchored** = what is in front of the glass, in the pose given. **Guest, no pose** = both
  sides, from a virtual pose that swings.
- **The glass test** (`GLASS` in `src/gl.ts`): a fragment is dropped by the sign of its card-space
  z (`uSide`), and anything behind the glass is dropped where the line from the eye to it misses
  the window. Every material that draws in card space includes it.

## Rules that keep the checks green

- **The pixel rule** (peel v2's). Layers are rasterised by a 2D canvas at the resolution of the flat
  fit, at their absolute position on a scratch canvas the size of the drawing buffer, then copied
  1:1 (`bakeLayer`). The scratch canvases must be unaccelerated (`willReadFrequently`). Pixel checks
  assert the largest difference and run on a GPU (WebKit, Chromium on Metal) as well as in software.
- **Flat frames stay on the flat path.** Do not draw `idle` or the end of `rebuild` through the
  frustum "for consistency": points on the glass land on the same pixels, but the texture is then
  sampled through another matrix and single pixels end up 1/255 off (`rebuild.json`:
  `connectEndToDepartStart`). The joins are: `depart` t = 0 is the flat card within 1/255, the end
  of `depart` is the start of `rebuild` exactly, the end of `rebuild` is idle frame zero exactly.
- **One layer, one place.** Host and guest call the same `eventSheet()` with the same clock: depth,
  crossing tilt, stair offset. Change the exit in `src/schedule.ts` only. The sheet is tipped so
  that it is entirely behind the glass when its crossing starts and entirely in front when it ends
  (`crossHalf`, `lever`).
- **Card-space position is a centroid varying** on sheets (`vP`). A slab's side face seen edge-on
  covers a fraction of a pixel; extrapolated to the pixel centre its position is off by several
  slab thicknesses and the side face sticks out pixels past the cut. `glass-seam` catches this.
- **The room is lit, shadows take light away.** On a dark card nothing in the cavity is darker than
  the card background: walls are the background times a light factor, a sheet inside is its print
  times `gain` ≥ 1, and a shadow is capped at the light the receiver gains. `exposure` asserts it
  pixel by pixel. A light card cannot be lit (`Cavity.lit` false): it is shaded with depth instead.
- **Painter's order.** No depth buffer. Walls 1, outlines on the back wall 3, backing 9, sheets
  inside the room 10 + 10 per sheet, ruler flags 100, sheets at or in front of the glass +200.
- **A frame is a pure function** of (role, timeline, t, tilt, pose, viewer, projection, images,
  canvas size, quality, reduced). No `Math.random`. Exceptions, all wall clock and skipped while
  paused: the 0.3 s blend when a viewer appears or disappears, the 350 ms blend when the pose does,
  and the label history in `src/layout.ts` (chrome only, cleared by `seek`). The swing of the
  unanchored pose is *not* an exception: it is a function of `explode`'s own time and ends at rest
  with the event, so `fly` starts from one pose. Do not let it run on in the hold (W4 did).
- **A viewer is used as given**, in the next frame, with no smoothing. Smoothing belongs to the
  shell, which knows the latency; here it would make the walls lag the hand.
- **Nothing is allocated per frame** in `update*`, `eventSheet`, `hostEye`, `hostWindow`, `apply`,
  `layoutLabels*`, `write*`.
- **Test hooks are compiled out.** Anything test-only lives behind `__WINDOW_TEST__` (a Vite
  `define`), in module-level functions. `checks/contract.spec.ts` greps `dist/window.js`.
- **Checks do not depend on the frame rate.** Chromium's software GL draws the cavity at a few
  frames a second; anything about wall-clock easing steps the page clock (`viewer-switch`).
- **A rebuilt `dist/` must reach the checks**: keep the `window:fresh-bundles` plugin.
- **Schedule values are the same in every tier.** Tiers change pixel ratio, shadow taps, the sweep,
  ruler detail (numerals at `high` and `test` only, no rulers at `low`) and wall shadows (off at `low`).

## Contract (v1.2)

### Met (evidence in `checks/results/<browser>/` for webkit, chromium and chromium-metal unless noted)

| Contract item | State |
|---|---|
| Exports `supported`, `durations`, `mount` | met — `contract.json` (source and dist) |
| `durations()` pure, `idle` = 0, `depart` = `explode` | met — `contract.json` (7.75 s for any number of layers, `rebuild` 1.8 s) |
| Roles and timelines, wrong-role `play` rejects | met — `contract.json` |
| Host `depart`: layers leave one by one, each leaves its outline, ends in outlines only | met with a stated reading: the layers leave through the glass, the outlines are on the back wall of the cavity, and the end frame is the empty cavity with them — `glass-seam.json`, `artifacts/sheet-host-depart.png` |
| Host `rebuild` ends in idle frame zero | met, 0 differing values — `rebuild-end.json`, `rebuild.json` |
| Guest `assemble` ends in the flat composite inside `assembleRect` | met within 1/255 (largest difference) — `assemble-end.json`, `assemble-overflow.json` |
| QR layers take part only in `idle`, `connect`, `rebuild` | met — `rebuild.json` (QR re-forms 1.3–1.8 s), `assemble-end.json` (reference without QR) |
| Shared per-layer schedule host `depart` / guest `explode` | met by construction (one `Plan`, one `eventSheet()`), and measured: both devices hold every sheet at the same depth, tilt and offset in 1551 samples — `glass-seam.json` (`statesDiffer` 0) |
| `play(timeline, { at })`, resolves at the end, never for `idle` | met — dist checks play in real time |
| `setTilt`, `setPose`, `setProjection`, `replaceLayer` (150 ms crossfade), `where`, `dispose` | met — `frame-zero.json`, `chrome.json`, `contract.json`, `dispose.json` |
| `setViewer(eye \| null)` (v1.2), host: position in card space, +Z towards the viewer | met — `window-truth.json` (19 eyes: what the host draws for an eye is what a real box shows that eye), `contract.json` (`setViewer` on the handle) |
| Viewer: may ease the eye at most 0.1 s | met — no easing at all: a new eye is the eye of the next frame, error 0 — `viewer-switch.json` (`followError`) |
| Viewer: must ease any switch between a viewer and none | met — 0.3 s cubic, largest step 15 % of the way in 16 ms — `viewer-switch.json` |
| Pose: OpenGL camera space | met — `window-truth.json` and `glass-seam-pixels.json` project with it independently |
| `setProjection` aspect = canvas aspect | met — every check passes the canvas aspect |
| `safeRects` never drawn over, at most four | met — `safe-rects.json` (alpha 0 through the four host timelines; the cavity's shaders refuse those pixels too) |
| Flat reference: contain, centred, unrounded, `drawImage` high quality at absolute positions | met within 1/255 (largest difference) — `frame-zero.json`, `rebuild-end.json`, `assemble-end.json`, `assemble-overflow.json` |
| `assembleRect` may extend past the canvas | met — `assemble-overflow.json` |
| `onLayer` phases | met with a stated reading — `contract.json`. `leave` (host) and `lift` (guest) fire at the same moment, when the sheet starts to cross the glass (0.5 s into its exit), not when it starts to move inside the cavity; `settle` when it lands in the stack; `arrive` in `rebuild` when the stack is flat on the glass (1.5 s), in `assemble` as peel v2 |
| No requests except layer files and bundled assets | met — `contract.json` (`mountRequests`) |
| No DOM beyond the given canvas, no sensors | met with peel's stated reading: detached canvases, `Image` elements for decoding and `document.fonts` for the bundled `FontFace` are used; nothing is attached to the document |
| Guest canvas transparent during `explode` | met — `flash.json`; anchored, the guest draws nothing at all until a sheet crosses the glass (`glass-seam-pixels.json`, `guestPixelsBeforeAnyCrossing`); without a pose it draws the window and the stack and leaves the rest transparent |
| Deterministic in timeline, time and inputs (tilt, pose, viewer) | met — `determinism.json` (two viewers, across seeks and a remount), `unanchored.json` (the swing is a function of `explode`'s own time; `fly` starts from one pose) |
| Chrome may keep short history, settles within 0.3 s, `seek` clears it | met — `label-steady.json` (peel v2's layout, unchanged) |
| At most 3 flashes per second | met — `flash.json` |
| Test hooks only with `opts.test === true`, never in the production build | met — `contract.json` (`hooksWithoutTestFlag`, `bundle.hasTestHooks`) |
| `dispose()` frees everything, no rAF | met — `dispose.json` |
| `three` as peer dependency, ES module in `dist/`, committed | met — `package.json`, `contract.json` (`bundle.imports`) |

### Not verified in this run

- **Real phones.** No frame was drawn on an iPhone or an Android phone: frame times, the `mid` tier
  at 60 fps, pixel exactness there are unverified. Playwright WebKit on a Mac is not Mobile Safari.
- **A real camera.** Everything "through the camera" is the demo's stand-in: a pinhole camera that
  sees the host canvas as a texture, minified with mipmaps. Exposure, glare, the screen's own
  brightness and a rolling shutter were not looked at.
- **A real viewer.** The shell does not relay it yet. The eye was always exact and never late; with
  the real latency the walls will lag the hand by that latency, and the effect does nothing about it.
- **A real tracker.** Poses were synthetic (peel v2's jitter only in `label-steady` and `perf`).
- **Light cards.** No check, one look with a temporary card outside the repo.
- **The page under the landing**, as in peel v2: the end frame equals the contract's 2D-canvas
  reference; whether the swap to the shell's `<img>` elements is invisible on a phone was not looked at.
