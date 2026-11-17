# peel — notes for agents working in this folder

`@layercard/effect-peel`: one effect that implements `packages/scene/CONTRACT.md` (v1). Read `SPEC.md`
for what is built and how it is accepted, `REPORT.md` for the state of the work, `RUNLOG.md` for
how it got here. Code, comments and docs are in English (repo rule).

## Run

```sh
npm install                 # from the repo root (workspaces)
cd packages/scene/effects/peel
npm run dev                 # http://127.0.0.1:5273/demo/  — host and guest side by side, test controls
npm run build               # tsc --noEmit, then dist/peel.js + font + licence (commit dist/)
npm run check               # Playwright checks; evidence goes to checks/results/*.json
npm run sheets              # contact sheets into artifacts/   (dev server must be running)
npm run video               # artifacts/peel-sequence.mp4      (dev server + ffmpeg)
```

`PEEL_GL=metal` (or `swiftshader`) selects the ANGLE backend for checks and scripts,
`PEEL_CHROME=/path/to/browser` replaces Playwright's Chromium. Playwright is pinned to the version
whose Chromium build is in the Mac's cache (1.65.1 ↔ build 1255); change both together.

## Layout

- `src/index.ts` — the three contract exports. `src/effect.ts` — the effect: `update*()` turns
  (timeline, t, inputs) into per-sheet state, `apply()` pushes it to the GPU. `src/schedule.ts` —
  pure timing. `src/gl.ts` — shaders, geometries, materials. `src/assets.ts` — images, the bake, QR
  grid detection, font, label atlas. `src/layout.ts` — label placement.
- `demo/` — test-only stage (`window.demo`); `demo/camera.ts` is a stand-in camera feed.
- `checks/` — Playwright specs and the harness page they drive (`window.H`).
- `scripts/` — contact sheets, video, quick looks, the font recipe.

## Rules that keep the checks green

- **The pixel rule.** Layers are rasterised by a 2D canvas at the resolution of the flat fit, at
  their absolute position on a scratch canvas, then copied 1:1 (`bakeLayer`). Do not bake into a
  cropped canvas at a shifted position: Chrome's `drawImage` is not translation-invariant.
- **Flat means `acrylic === 0`.** Rim, tint, sweep, inner shadow and slab thickness all scale with it.
- **A frame is a pure function** of (role, timeline, t, tilt, pose, projection, images, canvas size,
  quality, reduced). No history, no `Math.random`. The one exception is the 350 ms blend when the pose
  appears or disappears (wall clock), skipped while paused.
- **Nothing is allocated per frame** in `update*`, `apply`, `layoutLabels`, `write*`. No closures,
  array literals or `new` there.
- **Test hooks are compiled out.** Anything test-only lives behind `__PEEL_TEST__` (a Vite `define`),
  in module-level functions, never as class members. `checks/contract.spec.ts` greps `dist/peel.js`.
- **Schedule values are the same in every tier.** Tiers change pixel ratio, shadow taps and the sweep.

## Contract

### Met (evidence in `checks/results/` unless noted)

| Contract item | State |
|---|---|
| Exports `supported`, `durations`, `mount` | met — `contract.json` (source and dist) |
| `durations()` pure, `idle` = 0, `depart` = `explode` | met — `contract.json` (6.1 s for the example) |
| Roles and timelines, wrong-role `play` rejects | met — `contract.json` |
| QR layers take part only in `idle`, `connect`, `rebuild` | met — sheets, `assemble-end.json` (reference without QR) |
| Shared per-layer schedule host `depart` / guest `explode` | met by construction (one `Plan`); `onLayer` order in `contract.json` |
| `play(timeline, { at })`, resolves at the end, never for `idle` | met — dist checks play in real time |
| `setTilt`, `setPose`, `setProjection`, `replaceLayer` (150 ms crossfade), `where`, `dispose` | met — `frame-zero.json`, `chrome.json`, `contract.json`, `dispose.json` |
| `safeRects` never drawn over | met — `safe-rects.json` (alpha 0 in 100 frames across the four host timelines) |
| `assembleRect` end frame = flat composite | met — `assemble-end.json` |
| No requests except layer files and bundled assets | met — `contract.json` (`mountRequests`) |
| No DOM beyond the given canvas, no sensors | met with a stated reading: detached canvases (`OffscreenCanvas` when available), `Image` elements for decoding and `document.fonts` for the bundled `FontFace` are used; nothing is attached to the document |
| Guest canvas transparent during `explode` | met — `flash.json` (luminance on white stays high), sheets |
| Deterministic | met — `determinism.json` |
| At most 3 flashes per second | met — `flash.json` (0 in every timeline) |
| Test hooks only with `opts.test === true`, never in the production build | met — `contract.json` (`hooksWithoutTestFlag`, `bundle.hasTestHooks`) |
| `dispose()` frees everything, no rAF | met — `dispose.json` |
| `three` as peer dependency, ES module in `dist/`, committed | met — `package.json`, `contract.json` (`bundle.imports`) |

### Not verified in this run

- **Real phones.** No frame time was measured on an iPhone 12-class device; "mid holds 60 fps while
  the shell runs camera and tracker" is unverified. Numbers in `checks/results/perf.json` come from
  the Mac.
- **Real camera and tracker.** The anchored path was exercised with synthetic poses only.
- **Safari / WebKit.** All checks ran in Chromium. The 2D bake, `FontFace`, `OffscreenCanvas` and
  premultiplied canvas uploads are standard, but pixel exactness was measured only in Chromium.
- **Pose convention.** The contract does not say which way the camera looks. The effect assumes an
  OpenGL-style camera space (camera at the origin looking down −Z, +Y up); a card facing the camera
  has its +Z towards the camera. See the proposal in `REPORT.md`.
- **More than four `safeRects`.** The first four are exact; further ones are merged into the fourth
  as a bounding box (still never drawn over, but more is left blank).
