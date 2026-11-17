# blackhole — SPEC

Written before any blackhole code, 2026-11-16 10:50 (the folder then held the window effect copied and
renamed, milestone B1, its checks running). The brief is `PROMPT.md`; the binding contract is
`packages/scene/CONTRACT.md` v1.2. Where this file and the brief disagree, the brief wins; where the
brief and the contract disagree, the contract wins.

## 1. What is built

One effect, `@layercard/effect-blackhole`, for both roles. Everything lives in **card space**: the card
is 1 wide and H = h / w tall, centred on the origin, +Z out of the host screen towards the viewer. The
glass is the plane z = 0.

### 1.1 The well and the sink

- **The well** is a dent in the card behind the glass, a surface of revolution about the card's axis
  (the line through the card centre, normal to the glass). A point of the card at distance r from the
  axis is moved, with g(r) = 1 / (1 + (r / 0.25)²) and the strength a(t) in 0..1:
  - towards the axis: r' = r · (1 − 0.48 · a · g(r));
  - around the axis (the swirl): by up to 1.2 rad · g(r), growing with a and breathing slowly;
  - behind the glass: z = −0.30 · a · min(1, g(r) / g(0.12)).
- **The lensing ring** is a thin band on the flat floor of the well, just inside material radius 0.12 (0.073 on the glass,
  0.30 behind it at full strength), drawn in the card's own colours: for every direction around the
  ring, the colour of the card that differs most from the card background along that direction, read
  once from a small composite of the layers (96 px wide, not a full-size texture), brightened.
- **The sink** is the centre of that ring: the point S = (0, 0, −0.30 · a) on the card's axis. It is a
  fixed point of card space. **Where the sink shows on the host screen** is where the line from the eye
  to S meets the glass: (E.x, E.y) · d / (E.z + d) with d = 0.30 · a. That is the brief's "the line from
  the guest camera meets the card": the screen is drawn so that the camera sees a real dent whose
  bottom is behind the card's centre, and on the screen itself the sink moves towards the camera
  (0.10 card widths for a camera 20° off the normal at 45 cm, 0.19 for 35°).
- **The eye** is `setViewer`'s position or, with no viewer, the window effect's tilt eye (6 card units
  in front of the centre, swung by tilt up to ±25°, frontal with `reduced`). A switch between the two is
  blended over 0.3 s of wall clock; a viewer is used in the next frame without smoothing.
- **Host** draws the card through an off-axis frustum whose apex is the eye and whose window is the
  card's rect on the canvas (head-coupled perspective, the window effect's projection), and draws only
  what is at or behind the glass (z ≤ 0). `idle`, `connect` and the closed end of `rebuild` are drawn
  flat instead: those are the exact frames.

### 1.2 One layer, one strip

Every flying layer is one mesh, a strip: rows across its shorter side, ordered along its longer side
from the head (the end nearer the sink) to the tail. A vertex shader places every row from the layer's
clock, so a layer is one continuous object in one place at a time:

1. **At rest**: on the card, moved only by the well.
2. **The neck** (0.6 s before a row enters the sink): the row slides down the well in a short spiral and
   narrows to 0.012: the layer stretches towards the sink like taffy and falls into a point.
3. **The stub**: from the sink S straight towards the eye up to the glass. The stub is the first 5.5 %
   of the ribbon path by definition (both devices agree on which pixels are in it).
4. **The ribbon in the air** (guest only): from the glass point on a curve that first keeps going
   towards the camera, leaves that line of sight downwards and comes into the bottom edge of the guest's
   screen at the layer's own slot; one full twist
   on the way and a small wobble carried by the material; width from 0.012 at the sink to
   0.6 × the layer's shorter side (0.07–0.30); the end at the guest's screen is fixed to that screen.
   A row takes 1.5 s from the sink to the guest (slow out of the sink, fast into the phone).
5. **Arrived**: at the end of the path the row is in the guest's level (1.4).

The ribbon is the layer's own texture on a backing in the card background colour (it fades in through
the neck, so on the card a layer is only its own pixels) with a hairline acrylic rim on its two edges.

- **The glass splits it**: every fragment of a strip is dropped by the sign of its card-space z, the
  window effect's test: the host draws z ≤ 0 (rest, neck, stub), the anchored guest z ≥ 0 (the air).
- **The host's stub points at the eye**, so the eye it is drawn for sees it end-on: from the guest's
  camera the ribbon starts exactly at the sink, and an error in tracking moves only that thin, slow end.
  With no viewer the host shows a thin rim of light across each ribbon where the glass cuts it.
- **The outline stays**: each layer's dashed outline is traced on the glass, flat, as its rows drain;
  beside it the tag `Pulled to guest` (15 characters).

### 1.3 The event (host `depart` = guest `explode`, 7.75 s for any manifest)

| When | What |
|---|---|
| 0–1.2 s | The pull starts: a goes 0 → 1, the ring appears, the swirl begins. |
| from 0.45 s | Layers leave top first; the necks start spread evenly between 0.45 s and 5.35 s. Each: 0.6 s neck, then its rows enter the sink during F = 0.45 s + 0.30 s × its longer side (in card widths), each row then 1.5 s in the ribbon. More than two ribbons are in the air at any moment. |
| from about 2.5 s | The first rows arrive; the level starts to rise (1.4). |
| 7.25–7.75 s | Every row has left the host. The sink collapses to a point and goes out; the host shows the empty card background, the outlines and the tags. The last ribbon is still in the air. |

`durations()` reports depart = explode = 7.75 s for every manifest, connect 0.8, fly 1.2, assemble 1.0,
rebuild 1.8, idle 0. Schedule values are the same in every tier.

### 1.4 The guest

- **Anchored**: draws only what is in front of the glass: the ribbons, their labels, the level. Nothing
  of the card on the host's screen.
- **The level** is screen space. Below a surface the canvas is the card: the card background colour,
  opaque, and over it the layers that have arrived, each at its place in `assembleRect`, shown only as
  far as its rows have arrived and only below the surface. A layer whose place is still above the
  surface floats just under it and rides it up; every floating layer bobs a little. The surface has a
  small wobble (a sum of travelling sines and a ripple where a ribbon enters) and a hairline meniscus
  in the acrylic rim colour. The level is a function of the timeline only: in `explode` it is half
  the canvas height times the share of all rows that have arrived (about 0.44 of the height at the
  end), in `fly` it rises past the top, in `assemble` it stays there. It never falls.
- **Labels**: each ribbon carries its layer's chip and dims pill (peel v2's chrome, screen space,
  12 CSS px text) on a short leader beside the ribbon, on the lower part of its path (60–78 %: below the host phone in
  the camera image, never under the level);
  their position is eased on a short history that `seek` clears.
- `fly` (1.2 s): the last rows arrive, the level rises past the top, the canvas is opaque at the end.
- `assemble` (1.0 s): bobbing dies out, the layers come to their places; from 0.68 s on nothing moves
  and the end frame is the flat reference in `assembleRect`.
- **Unanchored**: the guest draws both sides itself: a small virtual host phone near the top (the card
  0.38 of the canvas height tall, a hairline rim around it), its card bending and draining, the
  ribbons pouring down into the level, from a virtual eye that swings ±10° once over the event and is
  back at rest at the end. Same schedule.

### 1.5 The way back and reduced motion

- `rebuild` (1.8 s): the sink reappears (0–0.3 s), the layers unspool from it bottom layer first
  (the strip's clock run backwards, starts spread over 0.5 s, 0.55 s each), the bend relaxes (1.15–1.5 s),
  from 1.5 s the card is flat, the QR re-forms 1.3–1.8 s; the end frame is `idle` frame zero.
- `reduced`: the well is static and gentle (a = 0.35, no swirl, the tilt eye frontal; a real viewer
  still moves the perspective), no necks and no ribbons: a layer fades from the host at its time and
  fades in under the level; the level rises without wobble and nothing bobs; end frames stay exact.

### 1.6 Motion systems (independent, each a function of time and inputs)

(1) the well's strength and swirl, (2) the sink's place on the screen from the eye, (3) per-layer neck,
twist and drain, (4) the ribbons' travel along their curves, (5) the split at the glass, (6) the level,
its wobble and meniscus, (7) the outlines and tags left on the host, (8) the QR dissolve, (9) label easing.

## 2. Acceptance items

| ID | Item | Evidence |
|---|---|---|
| A1 | B1: the window effect's checks pass under the new name in WebKit and Chromium | `RUNLOG.md` |
| A2 | Host `idle` frame zero and the end of `rebuild` = the flat reference, largest difference ≤ 1/255, both browsers; the QR decodes through `idle` | checks `frame-zero`, `rebuild-end`, `qr` |
| A3 | `safeRects` are never drawn over from `idle` to the end of `depart`, and their pixels never change during `connect` and `depart` | checks `safe-rects`, `marker-untouched` |
| A4 | `durations()`: depart = explode, 7–8 s, the same for any manifest and on both roles | check `contract` |
| A5 | For ≥ 12 eyes (30–60 cm, up to ±35° on both axes) the centre of the ring as drawn on the host canvas is within 2 CSS px of where the line from the eye to S meets the glass; the same with the tilt eye | check `sink-follows-eye` |
| A6 | The bend reads through the stand-in camera at 0°, 20°, 35°: grid lines curve towards the sink, the ring is visible in a host screen 90–150 px wide | `artifacts/` sheets, `process/b2-*.png` |
| A7 | viewer ↔ none: eased within 0.3 s, bounded change per frame; a moving viewer is followed in the next frame | check `viewer-switch` |
| A8 | A strip is split at the glass: host pixels only at z ≤ 0, guest pixels only at z ≥ 0; both devices hold every layer's clock identically; the anchored guest draws nothing before the first row crosses; in the stand-in camera the ribbon starts within 2 CSS px of the ring's centre | check `glass-seam` |
| A9 | Every layer is accounted for at every sampled moment: host + air + level = 1 from the state, and no row is drawn in two places (rows seen in pixels on the host canvas, in the guest's ribbons and in the guest's level do not overlap by more than the cut's width, and agree with the state) | check `pixels-conserved` |
| A10 | The level is monotonic through `explode`, `fly`, `assemble`; the last 0.3 s of `assemble` contain no wobble (state and pixels) | check `level-settles` |
| A11 | Assemble end exact (≤ 1/255) for full-bleed, overflowing and centred rects | checks `assemble-end`, `assemble-overflow` |
| A12 | Rebuild: layers return bottom first, flat at 1.5 s, QR last; depart end = rebuild start; rebuild end = idle zero | checks `rebuild`, `rebuild-end` |
| A13 | Deterministic in time and inputs, the viewer included, across seeks and a remount | check `determinism` |
| A14 | `reduced`: static gentle well, no ribbons, no wobble, exact end frames | check `reduced` |
| A15 | Labels: text ≥ 12 CSS px, each label beside its own ribbon and inside the canvas, eased on history, settled within 0.3 s, `seek` clears the history | check `labels` |
| A16 | Unanchored: the virtual phone near the top, its ribbons reach the level, the swing is back at rest at the end, nothing drawn before the first play | check `unanchored`, sheets |
| A17 | ≤ 3 flashes per second; `dispose()` frees everything; contract surface (`setViewer` on the handle, no test hooks in `dist`) | checks `flash`, `dispose`, `contract` |
| A18 | Scene ≤ 6 ms median at `high` on the Mac's GPU; texture memory within peel's budgets (64 / 40 / 24 MB); no new full-size textures; no allocation per frame | check `perf`, code |
| A19 | Demo: host, stand-in camera with the live host canvas, guest; one draggable pose drives guest pose and host viewer; viewer, jitter, quality, reduced switches; every timeline; play all | `demo/` |
| A20 | Artifacts: sheets for every role × timeline (anchored frontal, 20°, 35°; unanchored), orbit video during the pull, the sequence video; the owner's card outside the repo | `artifacts/`, `REPORT.md` |
| A21 | At least five motion systems visibly independent | `artifacts/` sheets, `REPORT.md` |

## 3. Changes after looking (recorded as they were made)

- 11:20 — the first look showed the air empty in 10 frames of 12: a row took 1.0 s from sink to guest
  and a layer entered the sink in 0.3–0.5 s. Now 1.5 s and 0.45 s + 0.30 s × the longer side, the
  necks start between 0.45 s and 5.35 s, and the path leaves the camera's line of sight earlier.
- 11:22 — the well was made a little wider and stronger (radius 0.22 → 0.25, pull 0.42 → 0.48, swirl
  1.1 → 1.2 rad) so the bend reads in a host screen about 100 px wide.
- 11:25 — the ring's band moved inside its radius, onto the flat floor of the well: with its outer
  edge on the slope its centre was not the sink for an eye off the axis.
- 11:26 — labels wait until the ribbon's head has passed 55 % of the path: before that they sat on
  the host's screen in the camera image.
- 11:33 — the level's floating layers: a layer whose place is above the surface rides 5 px (top
  layer) to 50 px (bottom layer, with six layers) under it, so six sheets do not pile onto one line; drift, bob and tilt
  of a floating sheet are functions of the timeline's time only and fall to exactly zero by the
  layer's lock time in `assemble` (0.68 s for the last). (Replaced at 12:10, below.)
- 11:46 — the row a fragment belongs to is read at the sample's centroid, not extrapolated to the
  pixel centre: where a strip is seen edge-on its triangles are slivers and the extrapolated row was
  another row (found by `pixels-conserved`). Labels follow with a 0.045 s time constant and snap
  within 0.5 px, so a 30° jump of the pose settles in 0.21–0.22 s; a block is moved up its ribbon
  until it is above the level.
- 11:54 — no change to the effect: `level-settles` looked for the meniscus one to three pixels under
  the surface's first transparent pixel; on a steep part of the wobble the hairline is that pixel.
- 12:10 — the final sheets showed lines of text floating through each other for 3.5 s of `explode`
  (9 px apart under the surface, in stacking order, the reverse of their order on the card). Floating
  layers now queue under the surface in the card's own vertical order, the highest on the card nearest
  the surface (5 px under it); a layer under 200 px high keeps 0.9 of its own height clear under
  itself (at most 140 px; the whole queue at most 220 px or 0.28 of the canvas height, scaled down
  if it would be more), a larger one (an image) keeps none, so lines may lie on it. A layer's room
  opens in the 0.35 s before its first row lands; no layer is held deeper than the level can show;
  the queue lets go during `fly` (30–75 % of it), so nothing is held when `assemble` starts. With
  the old rule a card of ten or more layers would have had layers still held at the end of `fly`.
- 12:43 — no change to the effect: in Chromium's software renderer the first frame of `depart`
  differs from the last frame of `connect` by at most 5/255 (mean 0.008; 0 on a GPU). The check
  `rebuild` asked for 1/255 there; that join is not one of the contract's exact frames, and the bound
  is now what it has to guarantee: no value over 8/255, mean under 0.05/255.

## 4. Readings of the contract and the brief (stated, not hidden)

- **The guest canvas during `explode`** is transparent above the level and opaque below it; the
  contract says the guest canvas has no background during `explode` so that the camera shows through,
  the brief asks for the screen to fill like a glass. The level stays under 0.44 of the canvas height
  until `fly`.
- **`onLayer`**: `leave` and `lift` fire when a layer's first row crosses the glass; `settle` when its
  last row is in the level, or at the end of `explode` for a layer whose rows are still arriving;
  `arrive` when the layer locks flat (`assemble`) or its last row is back at rest (`rebuild`).
- **"A hovering exploded stack"** (contract, guest `explode`) is replaced by ribbons and a level, as the
  brief asks; the chrome (chips, dims) rides the ribbons.
- **`setViewer` smoothing**: none; the contract allows up to 0.1 s.

