# peel — SPEC (v1)

Written before any code, 2026-11-15. Source of truth for what is built and how it is accepted.
The brief is `PROMPT.md`; the binding contract is `packages/scene/CONTRACT.md` (v1). Where the brief
leaves a choice open, the choice is recorded here and repeated in `REPORT.md` under "Creative decisions".

## 1. What is built

`@layercard/effect-peel` — one ES module (`dist/peel.js`, three as peer dependency) exporting
`supported()`, `durations()`, `mount()` exactly as in the contract. One renderer, one scene graph, two
roles:

- **host** — orthographic, pixel-exact view of the card on the host's phone (`idle`, `connect`,
  `depart`, `rebuild`);
- **guest** — perspective view over the guest's camera (`explode`), then into screen space (`fly`,
  `assemble`).

Every frame is a pure function of `(role, timeline, t, tilt, pose, projection, layer images, canvas
size, quality, reduced)`. No history, no randomness.

### 1.1 Shared geometry and the pixel rule

- Card units as in the contract: width 1, origin at centre, +X right, +Y up, +Z towards the viewer.
- **Flat fit**: the card is fitted *contain*, centred, without rounding, into the canvas (host) or
  into `assembleRect` (guest; whole canvas when missing).
- **Screen-resolution bake**: every layer image is rasterised once with a 2D canvas
  (`drawImage`, smoothing quality `high`) at exactly the resolution of the flat fit, into its own
  integer-aligned device-pixel box. In the flat state each sheet is drawn 1:1 (texel = pixel), so the
  flat frame is the 2D composite by construction. Mipmaps of the same texture serve the minified
  perspective views.
- Pixel ratio = `min(devicePixelRatio, tier DPR cap, tier texture cap / fitted card size)`; a too-big
  canvas lowers the pixel ratio instead of breaking 1:1 (resolution is what tiers give up first).
- Colour: layer pixels pass through untouched (no colour-space conversion), premultiplied alpha,
  blending in display space like a 2D canvas.

### 1.2 Sheets

Each non-QR layer is a slab of clear acrylic the size of its own rect, 0.012 card widths thick,
printed with exactly its pixels. Acrylic look = body tint, hairline rim at the slab edge (brighter on
the top and left edges: key light above-left), fresnel boost at grazing angles, one soft moving
specular band. All of it scales with one `acrylic` amount that is exactly 0 in every flat frame.
Contact shadows are the blurred alpha of the print (plus a faint slab shadow) on the receiver below:
the nearest lower sheet that contains the caster's rect, else the glass.

Exploded stack (guest): bottom sheet 0.08 card widths above the glass, 0.11 between sheets, stair
offset 0.035 card heights per step along +Y, no rotations.

### 1.3 Schedule (seconds; identical in every quality tier)

`n` = number of non-QR layers, leave order = top layer first.

| Item | Value |
|---|---|
| `connect` | 0.8 |
| layer `k` starts | `0.2 + k·g`, `g = clamp(3.0/(n−1), 0.4, 0.75)` (0.6 for the example) |
| lift | 0.9 on `cubic-bezier(.16,1,.3,1)`, peak 1.06, then 0.35 settle (half cosine) |
| chrome draw-in | 0.45 after the settle (frame trace 0.25 clockwise) |
| inspection hold | 1.2 after the last chrome |
| `depart` = `explode` | `3.1 + (n−1)·g` → **6.1** for the example (n = 6) |
| `fly` | 1.2 |
| `assemble` | 1.0 |
| `rebuild` | 1.5 (sheets land in 0–1.0, QR re-forms 0.85–1.5) |
| `idle` | 0 (loops; breath period 5) |

### 1.4 Timelines

- **host idle** — flat card; upper layers translate with tilt, `z/zTop × 10 CSS px` at full tilt
  (tilt vector clamped to length 1), QR at most 4 px, translation only; drop shadow under each moved
  layer grows with the offset; with tilt 0 a 5 s breath of at most 1.5 px; at `t = 0`, tilt 0 the
  frame is the flat composite. Rendered at most 30 fps.
- **host connect** — QR dissolves along its own module grid (detected from the image), diagonal
  sweep, modules lift 2.5 px, shrink and fade. Nothing else animates.
- **host depart** — the QR is gone; each sheet turns acrylic, lifts (5 % scale, shadow) and leaves
  through the right edge; a 1 px dashed outline (6/6 CSS px, selection blue 55 %) with the tag
  "Layer moved →" stays behind. End: outlines and tags on the card background colour.
- **host rebuild** — sheets return from the right edge in reverse order, outlines disappear as they
  land, the QR re-forms last. End frame = idle frame zero.
- **guest explode** — transparent canvas. Anchored: sheets rise from the host screen along +Z into
  the stack. Unanchored (pose `null`): same schedule in a fixed virtual pose 29° off the normal
  (pitch 17°, yaw 24°), each sheet entering from the top edge; stack and chrome fit with 8 % margins.
  Each settled sheet gets selection chrome.
- **guest fly** — the frame leaves the anchor, arcs towards the camera to a face-on pose 1.12× the
  final size, the stack collapses to 28 % spacing, chrome fades, canvas ramps to opaque
  `card.background`.
- **guest assemble** — sheets drop bottom-first into `assembleRect` with one soft settle; acrylic
  fades to 0. End frame = flat composite of the non-QR layers inside `assembleRect`.

### 1.5 Selection chrome

Frame 1.5 CSS px (constant on screen) traced clockwise, four square handles, a red measurement line
with end ticks along the bottom edge, a leader from a sheet corner to a screen-space label block:
blue chip with the `label`, red pill with the `dims`, text 12 CSS px from the bundled font. Labels
alternate sides by index, are at least 1.4 block heights apart, leaders do not cross (order-preserving
slots plus an uncrossing pass). When there is no room beside the stack the block goes above or below
it on its side.

### 1.6 Reduced motion

Same schedule. Lifts, slides and the fly become fades at fixed offsets; no overshoot, no parallax, no
breath, no sweep, no chrome tracing.

### 1.7 Quality tiers

| Tier | DPR cap | texture cap | acrylic | shadows | memory budget |
|---|---|---|---|---|---|
| high | 2 | 2048 | rim + sweep | 5 taps | 64 MB |
| mid | 1.5 | 1536 | rim + sweep | 1 tap | 40 MB |
| low | 1 | 1024 | rim only | none | 24 MB |
| test | 1 | 2048 | rim + sweep | 5 taps | 64 MB |

## 2. Acceptance items

Each item names its evidence. "check" = Playwright spec in `checks/`, "sheet" = contact sheet in
`artifacts/`, "json" = `checks/results/*.json`.

| ID | Item | Evidence |
|---|---|---|
| A1 | Exports and types match contract v1; `tsc --noEmit` clean; `dist/peel.js` builds, imports only `three` | build, check `contract` |
| A2 | Host idle frame zero vs 2D composite: mean absolute difference ≤ 1/255 | check `frame-zero` |
| A3 | Idle: top layer ≤ 10 CSS px at full tilt, QR ≤ 4 px and translation only, breath ≤ 1.5 px, flat at t = 0 | check `frame-zero` (state asserts), sheet host-idle |
| A4 | `safeRects` pixels stay untouched (alpha 0) in every host timeline | check `safe-rects` |
| A5 | Connect dissolves the QR on its module grid; other layers unchanged | sheet host-connect, check `frame-zero` (non-QR area) |
| A6 | Depart: every non-QR layer leaves in order, outline + tag stays; end frame = outlines on background | sheet host-depart |
| A7 | Rebuild end frame = idle frame zero (identical pixels) | check `rebuild-end` |
| A8 | Guest explode unanchored: stack + chrome inside 8 % margins, viewed 25–35° off normal | check `chrome`, sheet guest-unanchored-explode |
| A9 | Guest explode anchored: stack geometry (0.08 / 0.11 / 0.035·H / 0.012) and axis alignment | check `chrome` (state asserts), sheet guest-anchored-explode |
| A10 | Chrome: every sheet labelled and measured; text ≥ 12 CSS px; ≥ 1.4 block heights apart; no leader crossings (frontal and 35° off-axis) | check `chrome` |
| A11 | Fly ends opaque `card.background`; assemble end frame = flat composite in `assembleRect`, mean abs diff ≤ 1/255 | check `assemble-end` |
| A12 | Determinism: same timeline and time twice → identical pixels, both roles | check `determinism` |
| A13 | `durations()` pure; depart = explode; totals in 6.0–6.5 s for the example | check `contract` |
| A14 | Dispose: no rAF, renderer memory counters at zero, remount works | check `dispose` |
| A15 | Reduced: no overshoot, no parallax, only fades at fixed offsets | check `reduced` |
| A16 | At most 3 luminance flashes per second in every timeline | check `flash` |
| A17 | Frame times recorded per role × tier; scene ≤ 6 ms at `high` on an integrated laptop GPU | check `perf`, json |
| A18 | Texture memory estimate within tier budgets; bundle ≤ 120 KB gzip without three and font | check `perf`, json, build |
| A19 | Font: OFL, woff2 ≤ 40 KB, licence next to it, loaded with `FontFace` from the effect folder; no other requests | check `contract` (request log) |
| A20 | Test hooks exist only with `opts.test === true` and not in `dist/peel.js` | check `contract` |
| A21 | Demo: both roles side by side, every timeline, play all, tilt, draggable fake pose, pose-null, quality, reduced | demo, video |
| A22 | Contact sheets (12 frames) for every role × timeline, guest anchored and unanchored; one side-by-side video | artifacts |

## 3. Not in scope for v1

Real camera, tracking, rooms, sensors and DOM UI (shell). Performance on a real iPhone 12-class
phone cannot be measured from this run and is reported as not verified.

## 4. Status at M6 (2026-11-15)

Checked against this list after every milestone; final state, evidence produced natively on the Mac:

| Items | State |
|---|---|
| A1–A7, A9–A16, A18–A22 | met — see `REPORT.md`, "What works, with evidence" |
| A8 | met — 28.7° off the normal, stack and label blocks on the 8 % margins |
| A17 | met on a laptop GPU (Apple M3, ANGLE Metal: median 0.2–0.4 ms per frame); **not measured on a phone** |

Changes to this spec made while building, all recorded in `REPORT.md`: the label layout of §1.5 became
rail-and-gate callouts in rows above and below the stack; label blocks keep the 8 % margins in the
anchored view as well; handles are 5 CSS px; a print casts a small shadow inside its slab; a
`qr` check was added.

