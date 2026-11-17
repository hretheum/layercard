# spill — notes for agents working in this folder

`@layercard/effect-spill`: one effect that implements `packages/scene/CONTRACT.md` (v1.1). The card
is a design file; for 7.5 s it leaves the host phone and stands in the room at room scale, then it
is pulled into the guest's phone. Read `SPEC.md` for what is built and how it is accepted,
`REPORT.md` for the state of the work, `RUNLOG.md` for how it got here. The effect started as a
copy of peel v2 (`../peel/`, read-only for this folder). Code, comments and docs are in English.

## Run

```sh
npm install                 # from the repo root (workspaces)
cd packages/scene/effects/spill
npm run dev                 # http://127.0.0.1:5276/demo/  — host and guest side by side, test controls
npm run build               # tsc --noEmit, then dist/spill.js + font + licence (commit dist/)
npm run check               # every check in Chromium and in WebKit; evidence in checks/results/<browser>/*.json
sh scripts/gpu-lock.sh npm run check -- perf.spec.ts     # perf, under the lock the runs on this Mac share
npm run sheets              # contact sheets into artifacts/   (dev server must be running)
npm run video               # artifacts/spill-v4-sequence.mp4  (dev server + ffmpeg)
node scripts/dolly.mjs      # artifacts/spill-v4-dolly.mp4     (the stand-in camera stepping back, then orbiting)
node scripts/strip.mjs out.png '{"poses":[[0,0,6.7],[35,0,6.7]],"t":7.5}'   # a quick look
```

`npm run check -- --project=webkit` (or `chromium`) runs one browser. `SPILL_GL=metal SPILL_CHANNEL=chromium`
runs Chromium on the real GPU and writes to `checks/results/chromium-metal/`; without it Playwright's
headless shell renders WebGL in software. `SPILL_BROWSER=webkit` makes every script in `scripts/` use
WebKit. `SPILL_CONTENT_DIR=/abs/folder npm run dev` serves a private card at `/content/`
(`?base=/content/`, or `SPILL_BASE=/content/` for the scripts) without a file of it entering the repo.
Playwright is pinned to the version whose browser builds are in the Mac's cache (1.65.1 ↔ Chromium
1255, WebKit 2388); change them together. **Do not edit a served file (`src/`, `checks/harness.*`)
while checks run:** Vite reloads the page under the running check.

## Layout

- `src/index.ts` — the three contract exports. `src/schedule.ts` — pure timing (one 7.5 s event,
  `zoomAt`, `liftCurve`, `heavy`). `src/room.ts` — where every layer stands in the room, from the
  manifest alone. `src/effect.ts` — the effect: `updateHost` / `updateGuest` turn (timeline, t,
  inputs) into per-sheet state, `apply()` and `writeRoom()` push it to the GPU. `src/gl.ts` —
  shaders, geometries, materials. `src/assets.ts` — images, the bake, QR and column-grid detection,
  font, label atlas. `src/layout.ts` — label placement on the visible outline of a sheet.
- `demo/` — test-only stage (`window.demo`); `demo/camera.ts` is the stand-in camera: a room at room
  scale (card width 1 = 7 cm), a host figure, the phone with the live host canvas on its screen.
- `checks/` — Playwright specs and the harness page they drive (`window.H`, with `H.geo` for
  geometry the room checks share).
- `scripts/` — contact sheets, strips, the two films, difference maps, quick looks, the GPU lock.

## Rules that keep the checks green

- **The room is a function of the manifest.** `layoutRoom()` never sees the pose. A sheet's
  transform is `frame x room pose`; `room-scale` recomputes that independently. Do not make a room
  position depend on the camera: that is what "the room swims" means.
- **What stands near the phone must stay in the frame.** A row comes towards the guest only as far
  as it fits the frame, top to bottom, from `FIT_CM` (30 cm) — a constant, never the live pose. The
  owner's first remark on the effect was a name that had left the frame through its bottom edge:
  a sheet far from the phone's axis and near the camera is outside the camera's cone. Labels hang
  at the outer end of their sheet and the distance label is pinned at the phone's foot, so that
  nothing is stamped on the row next to it (`room-scale`, A26).
- **One zoom curve.** The host draws the artboard with `zoomAt(t)`, the guest starts every sheet on
  the glass with it. Lifts start when the zoom has ended (`LIFT_START = ZOOM_T1`).
- **One layer, one place.** Host print and guest sheet read the same `liftCurve`; the print is gone
  at `PEEL` (0.25 s), when the sheet is 0.05 off the glass. Unanchored, a layer is a flat print on
  the virtual phone's glass until its lift starts. Nothing but the first sheet may be drawn on the
  guest canvas before `MEASURE_T0` (the pixel part of `lift-handoff` measures the drawn box).
- **The pixel rule (peel).** Layers are baked by a 2D canvas at the resolution of the flat fit, at
  their absolute position, on unaccelerated scratch canvases, then copied 1:1. Flat frames (host
  frame zero, `rebuild` end, `assemble` end) depend on it and on `zoom === 1`, `acrylic === 0`.
  `zoomBack()` returns exactly 1 at its end. Pixel checks assert the largest difference.
- **A frame is a pure function** of (role, timeline, t, tilt, pose, projection, images, canvas
  size, quality, reduced) when it is reached by `seek`. History exists in four places, all cleared
  by `seek`: the 350 ms blend when the pose appears or disappears; the pose filter (`filterPose`,
  the contract's "light interpolation"); the label history (`easeLabels`, `labelPref`, and
  `fade`: of two drawn blocks that overlap, the one further from its place is not drawn); the dead
  band of the distance number. Sheets never read chrome history.
- **Painter's order, no depth buffer.** Sheets are sorted far-to-near each frame; in `assemble` by
  stack index only. Sheets behind the card plane draw before the virtual phone (order < 300) and
  get the hole where the real phone is.
- **Nothing is allocated per frame** in `update*`, `apply`, `writeRoom`, `placeLabels`,
  `easeLabels`. No closures, array literals or `new` there.
- **Test hooks are compiled out.** Anything test-only lives behind `__SPILL_TEST__` (a Vite
  `define`), in module-level functions. `checks/contract.spec.ts` greps `dist/spill.js`.
- **Schedule values are the same in every tier.** Tiers change pixel ratio, shadow taps, the sweep,
  slab thickness, guides per sheet and the plane of columns.
- **A rebuilt `dist/` must reach the checks.** The `spill:fresh-bundles` Vite plugin drops the cached
  module when `dist/spill.js` changes. Do not remove it.

## Contract (v1.1)

### Met (evidence in `checks/results/<browser>/` for webkit and chromium unless noted)

| Contract item | State |
|---|---|
| Exports `supported`, `durations`, `mount` | met — `contract.json` (source and dist) |
| `durations()` pure, `idle` = 0, `depart` = `explode` | met — `contract.json` (7.5 s for every manifest; `fly` 1.4, `assemble` 1, `rebuild` 1.8) |
| Roles and timelines, wrong-role `play` rejects | met — `contract.json` |
| QR layers take part only in `idle`, `connect`, `rebuild` | met — sheets, `assemble-end.json` (reference without QR) |
| Shared per-layer schedule host `depart` / guest `explode` | met by construction (one `Plan`, one `liftCurve`, one `zoomAt`); `lift-handoff.json`, `unanchored.json` (`schedule`) |
| Host `depart` "each leaves its outline behind", ends in "outlines only" | met — `lift-handoff-host.json` (`end`: no print left, every outline whole) |
| Guest `explode` "full stack hovering, chrome drawn" | met with a stated reading: the layers do not hover as a stack above the phone, they stand in the room (the brief of this effect); chrome is drawn — `room-scale.json` |
| `play(timeline, { at })`, resolves at the end, never for `idle` | met — dist checks play in real time |
| `setTilt`, `setPose`, `setProjection`, `replaceLayer` (150 ms crossfade), `where`, `dispose` | met — `frame-zero.json`, `room-scale.json`, `contract.json`, `dispose.json` |
| Pose: OpenGL camera space, card width 1 (v1.1) | met — `room-scale.json`, `lift-handoff.json` project with it independently |
| "The effect … may add only light interpolation" to the pose | used: an adaptive low-pass (about 1 Hz at rest, opening with speed), bypassed by `seek` — `steady-room.json` gives the jitter with and without it and the lag in a real move |
| `setProjection` aspect = canvas aspect (v1.1) | met — every check passes the canvas aspect |
| `safeRects` never drawn over, at most four (v1.1) | met — `safe-rects.json` (alpha 0 through `idle`, `connect`, `depart`, `rebuild`) |
| Flat reference (v1.1) | met within 1/255 (largest difference) — `frame-zero.json`, `rebuild-end.json`, `assemble-end.json`, `assemble-overflow.json` |
| `assembleRect` may extend past the canvas (v1.1) | met — `assemble-overflow.json` |
| `onLayer` phases (v1.1) | met — `contract.json` (`leave`, `lift`, `settle`, `arrive`) |
| No requests except layer files and bundled assets | met — `contract.json` (`mountRequests`) |
| No DOM beyond the given canvas, no sensors | met with peel's stated reading: detached canvases (`OffscreenCanvas` when available), `Image` elements for decoding and `document.fonts` for the bundled `FontFace`; nothing is attached to the document |
| Guest canvas transparent during `explode` | met — `unanchored.json` (corner alpha 0), `flash.json`; the sheets themselves are tinted glass |
| Deterministic; chrome may keep short history, settles within 0.3 s, `seek` clears it (v1.1) | met — `determinism.json`, `label-steady.json` |
| At most 3 flashes per second | met — `flash.json` |
| Test hooks only with `opts.test === true`, never in the production build | met — `contract.json` (`hooksWithoutTestFlag`, `bundle.hasTestHooks`) |
| `dispose()` frees everything, no rAF | met — `dispose.json` |
| `three` as peer dependency, ES module in `dist/`, committed | met — `package.json`, `contract.json` (`bundle.imports`) |

### Not verified in this run

- **Real phones.** No frame was drawn on an iPhone or an Android phone; frame times, the "mid" tier
  under camera and tracker load, and pixel exactness there are unverified. Playwright WebKit on a
  Mac is not Mobile Safari.
- **Real camera and tracker.** The anchored path was exercised with synthetic poses and synthetic
  jitter only. How the room behaves under a real tracker's error (which is not white noise) is
  unverified; so is the hole around a real phone, whose body is assumed 3.5 % of a card width
  larger than the card on every side.
- **The page under the landing.** As in peel v2: the end frame equals the 2D-canvas reference; the
  shell's `<img>` swap was not looked at.
