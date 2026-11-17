# peel — notes for agents working in this folder

`@layercard/effect-peel`: one effect that implements `packages/scene/CONTRACT.md` (v1.1). This is
v2 of the effect. Read `SPEC.md` for what v2 changes and how it is accepted, `REPORT.md` for the
state of the work, `RUNLOG.md` for how it got here. v1 is the tag `peel-v1.0`; its documents are in
`history/v1/`. Code, comments and docs are in English (repo rule).

## Run

```sh
npm install                 # from the repo root (workspaces)
cd packages/scene/effects/peel
npm run dev                 # http://127.0.0.1:5274/demo/  — host and guest side by side, test controls
npm run build               # tsc --noEmit, then dist/peel.js + font + licence (commit dist/)
npm run check               # every check in Chromium and in WebKit; evidence in checks/results/<browser>/*.json
npm run sheets              # contact sheets into artifacts/   (dev server must be running)
npm run video               # artifacts/peel-v2-sequence.mp4   (dev server + ffmpeg)
node scripts/compare.mjs    # v1 beside v2 (needs v1's bundle in artifacts/tmp/v1/, see the script)
```

`npm run check -- --project=webkit` (or `chromium`) runs one browser. `PEEL_GL=metal PEEL_CHANNEL=chromium`
runs Chromium on the real GPU and writes to `checks/results/chromium-metal/`; without it Playwright's
headless shell renders WebGL in software. `PEEL_BROWSER=webkit` makes every script in `scripts/` use
WebKit. `PEEL_CHROME=/path/to/browser` replaces Playwright's Chromium. Playwright is pinned to the
version whose browser builds are in the Mac's cache (1.65.1 ↔ Chromium 1255, WebKit 2388); change
them together.

## Layout

- `src/index.ts` — the three contract exports. `src/effect.ts` — the effect: `update*()` turns
  (timeline, t, inputs) into per-sheet state, `apply()` pushes it to the GPU. `src/schedule.ts` —
  pure timing. `src/gl.ts` — shaders, geometries, materials. `src/assets.ts` — images, the bake, QR
  grid detection, font, label atlas. `src/layout.ts` — label placement.
- `demo/` — test-only stage (`window.demo`); `demo/camera.ts` is a stand-in camera feed;
  `demo/compare.html` mounts v1's and v2's production bundles side by side.
- `checks/` — Playwright specs and the harness page they drive (`window.H`).
- `scripts/` — contact sheets, strips, video, v1-beside-v2, difference maps, quick looks, the font recipe.

## Rules that keep the checks green

- **The pixel rule.** Layers are rasterised by a 2D canvas at the resolution of the flat fit, at
  their absolute position on a scratch canvas the size of the drawing buffer, then copied 1:1
  (`bakeLayer`). Do not bake into a cropped canvas at a shifted position: Chrome's `drawImage` is
  not translation-invariant. **The scratch canvases must be unaccelerated** (`willReadFrequently`):
  on a GPU both engines scale `drawImage` with another filter and edges end up 70/255 off.
- **Pixel checks assert the largest difference, not the mean,** and run where there is a GPU
  (WebKit, Chromium on Metal) as well as in software. A green mean hid the line above for all of v1.
- **A rebuilt `dist/` must reach the checks.** Vite does not watch its build output; the
  `peel:fresh-bundles` plugin drops the cached module when `dist/peel.js` changes. Do not remove it.
- **Flat means `acrylic === 0`.** Rim, tint, sweep, inner shadow and slab thickness all scale with it.
- **A frame is a pure function** of (role, timeline, t, tilt, pose, projection, images, canvas size,
  quality, reduced). No `Math.random`. Two exceptions: the 350 ms blend when the pose appears or
  disappears (wall clock, skipped while paused), and the label history in `src/layout.ts`
  (`LabelHistory`: held slots, dead band, spring) — chrome only, never sheets, cleared by `seek`.
- **One layer, one place.** Host and anchored guest read the same `liftCurve`; the host's print is
  gone at `PEEL` (0.25 s), before any sheet is one gap up. Change the curve in one place only.
- **Nothing is allocated per frame** in `update*`, `apply`, `layoutLabels*`, `write*`. No closures,
  array literals or `new` there; the label history lives in typed arrays made at mount.
- **Test hooks are compiled out.** Anything test-only lives behind `__PEEL_TEST__` (a Vite `define`),
  in module-level functions, never as class members. `checks/contract.spec.ts` greps `dist/peel.js`.
- **Schedule values are the same in every tier.** Tiers change pixel ratio, shadow taps and the sweep.

## Contract (v1.1)

### Met (evidence in `checks/results/<browser>/` for webkit, chromium and chromium-metal unless noted)

| Contract item | State |
|---|---|
| Exports `supported`, `durations`, `mount` | met — `contract.json` (source and dist) |
| `durations()` pure, `idle` = 0, `depart` = `explode` | met — `contract.json` (6.1 s for the example, as in v1) |
| Roles and timelines, wrong-role `play` rejects | met — `contract.json` |
| QR layers take part only in `idle`, `connect`, `rebuild` | met — sheets, `assemble-end.json` (reference without QR) |
| Shared per-layer schedule host `depart` / guest `explode` | met by construction (one `Plan`, one `liftCurve`); `lift-handoff.json` |
| `play(timeline, { at })`, resolves at the end, never for `idle` | met — dist checks play in real time |
| `setTilt`, `setPose`, `setProjection`, `replaceLayer` (150 ms crossfade), `where`, `dispose` | met — `frame-zero.json`, `chrome.json`, `contract.json`, `dispose.json` |
| Pose: OpenGL camera space (v1.1) | met — the convention v1 assumed; `lift-handoff.json` projects with it independently |
| `setProjection` aspect = canvas aspect (v1.1) | met — every check passes the canvas aspect |
| `safeRects` never drawn over, at most four (v1.1) | met — `safe-rects.json` (alpha 0 in 100 frames across the four host timelines) |
| Flat reference: contain, centred, unrounded, `drawImage` high quality at absolute positions (v1.1) | met within 1/255 (largest difference) — `frame-zero.json`, `rebuild-end.json`, `assemble-end.json`, `assemble-overflow.json` |
| `assembleRect` may extend past the canvas (v1.1) | met — `assemble-overflow.json` (full-bleed, two rects running below the canvas, a centred one, one past the top-left) |
| `onLayer` phases (v1.1) | met — `contract.json` (`leave`, `lift`, `settle`, `arrive`) |
| No requests except layer files and bundled assets | met — `contract.json` (`mountRequests`) |
| No DOM beyond the given canvas, no sensors | met with a stated reading: detached canvases (`OffscreenCanvas` when available), `Image` elements for decoding and `document.fonts` for the bundled `FontFace` are used; nothing is attached to the document |
| Guest canvas transparent during `explode` | met — `flash.json` (luminance on white stays high), sheets |
| Deterministic; chrome may keep short history, settles within 0.3 s, `seek` clears it (v1.1) | met — `determinism.json`, `label-steady.json` (rest error 0 after 0.3 s, same seek twice: 0 differing pixels) |
| At most 3 flashes per second | met — `flash.json` |
| Test hooks only with `opts.test === true`, never in the production build | met — `contract.json` (`hooksWithoutTestFlag`, `bundle.hasTestHooks`) |
| `dispose()` frees everything, no rAF | met — `dispose.json` |
| `three` as peer dependency, ES module in `dist/`, committed | met — `package.json`, `contract.json` (`bundle.imports`) |

### Not verified in this run

- **Real phones.** No frame was drawn on an iPhone or an Android phone; frame times, the "mid" tier
  under camera and tracker load, and pixel exactness there are unverified. Playwright WebKit on a
  Mac is not Mobile Safari.
- **Real camera and tracker.** The anchored path was exercised with synthetic poses and a synthetic
  jitter only; "sheet exactly on the print" also depends on the tracker's registration error.
- **The page under the landing.** The end frame equals the 2D-canvas reference of the contract; the
  shell shows `<img>` elements there, which the browser scales with its own filter. Whether the swap
  is invisible on a phone was not looked at.
