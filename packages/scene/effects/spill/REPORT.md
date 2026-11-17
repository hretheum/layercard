# spill v4 — report

Run of 2026-11-16, 00:02–02:12 CET, on the Mac, in worktree `layercard-scene-v4`, branch
`scene/spill-v4` (five milestone commits on top of `dc1d72a`), and one more commit the same
morning after the owner's first look (10:08–10:45, see the next section). Nothing pushed, merged
or tagged. For a reader who saw none of the work. Every number below is from the run after that
change.

## The short version

- **Changed on 16 November after the owner's first look.** From close range the sheet with the name
  left the frame through its bottom edge and stayed there. It now stands under the phone, inside
  the frame from top to bottom at every checked camera, with no chip on it. What changed, and what
  the frame still cuts, is in the next section.
- **The effect exists and passes its own bar in the stand-in.** `@layercard/effect-spill` is a
  new effect for contract v1.1. When the guest's camera finds the host phone, the card's layers
  leave the phone and stand in the room at room scale for the rest of a 7.5 s event: the
  background as a tinted wall 6 card widths across behind the phone, the grid in front of it with
  its columns continued floor-to-head, the other layers magnified 3.9 times above and below the
  phone, turned inwards. Blue guides run along the sheets' edges past the frame, and a red tape runs
  from the host phone to the bottom of the guest's frame with the distance in centimetres. Then
  everything is pulled into the guest's phone and lands exactly on the flat card.
- **The room stays put.** A sheet's place depends only on the card's manifest, never on the camera.
  With a shaking pose (1.5 px shift plus rotation, 30 Hz) sheet corners move 0.59 px per frame at
  the 95th percentile; without the effect's pose filter the same poses give 5.26 px.
- **The measurement is true.** Eight poses: the shown number is within 0.48 cm of the pose distance
  (card width taken as 7 cm). It does not flicker under jitter.
- **Exact frames are exact.** Host frame zero, the end of `rebuild` and the end of `assemble` equal
  the flat reference with a largest difference of 0 or 1 of 255 in Chromium and WebKit; the QR
  decodes through `idle`.
- **Checks:** 48 of 48 pass in Chromium (software GL) and WebKit (GPU), 24 of 24 in Chromium on
  Metal, and `perf` in all three — see "Final run".
- **Not done, and it matters:** nothing ran on a real phone, with a real camera or a real tracker.
  Everything "through the camera" here is through the stand-in camera of the demo.

## Changed after the owner's first look (16 November, 10:08)

**What the owner saw.** At some point the sheet with the name goes below the screen and stays
there for a long time.

**What it was.** In the first dolly film the camera stands 30 cm from the phone for its first
5.9 s. From there the name sheet landed with its second line under the bottom edge of the frame
and stayed so until the camera stepped back. Measured on the owner's card (a scratch script, its
output is not in the repo): from 30 cm on the phone's axis the name sheet showed 27 % of its area
at the end of `explode`, and less than half of it for 3.6 s of the event; the two text rows under
it showed nothing. The cause was the layout: sheets stepped towards the guest by stack order, up
to 2.2 card widths (15 cm). A sheet that is off the phone's axis and near the camera is outside the
camera's cone.

**What changed** (`src/room.ts`, `src/layout.ts`, `src/effect.ts`):

1. **Depth.** A row of sheets now comes towards the guest only as far as it stays inside the frame
   from top to bottom for a camera 30 cm in front of the phone (`FIT_CM`, a constant of the layout —
   the room still does not depend on the live pose). A row that cannot fit from there stands 0.2
   card widths in front of the phone, where a camera sees the most of it from any distance. Sheets
   that share a row stand 0.14 apart. Rows are 0.35 apart instead of 0.45.
2. **Labels.** A label hangs at the outer end of its sheet's visible top edge (left for a sheet left
   of the phone, right for the others). Before, the label of a sheet below the phone hung past its
   inner end, on the row above — on the name.
3. **The distance label** is pinned on the start of the red line, across the phone's foot. Before,
   it sat on the middle of the line, which is where the name row stands.

**After.** On the owner's card the name sheet shows 62 % of its area from 30 cm, 69 % from 40 cm,
77 % from 47 cm, 92 % from 60 cm, and is inside the frame from top to bottom in all of them; no
chip stands on it. In the repo this is acceptance item A26, checked on the example card at all 16
poses of `room-scale` (`rowNextBelowPhone.insideTopToBottom` = 1 everywhere). Pictures:
`process/s6-before-after-30cm.jpg` (the same three moments of the dolly film, before and after) and
`process/s6-end-of-explode-six-cameras.jpg`.

**What is still cut, by design or by geometry:**

- From 30–35 cm the frame cuts the right end of the name row: the frame is 17 cm wide at the phone
  from 30 cm and a sheet is 21 cm wide. On the owner's card the end of the name's second line is
  outside the frame at 30 and 35 cm; from 40 cm the name is whole. The example card's
  longer name shows 45 % of its sheet at 30 cm.
- The text rows under the name are below the frame at 30 cm and come in as the camera steps back:
  the second row is whole from about 38 cm, the third from about 45 cm (owner's card, by the
  layout's arithmetic; at 40 cm the second row is measured in the frame, the third is not).
- At 5 of the 16 poses — the ones that look at the phone from above or below — one label or the
  distance label lies on the name sheet (`room-scale.json`, `labelsOnOtherSheets`,
  `distanceLabelOnSheets`).
- Under a shaking hand at 30 cm labels move more than before (0.44 px per frame at p95, was 0),
  because they hang at the end of the sheet that is nearer the camera. The bar is 0.5 px.

Two constants would trade the look for more of the text, and are the owner's call. Both figures are
arithmetic, not renders: `FLOAT_X` (how far sheets stand to the side, 0.85 — at about 0.45 the
owner's whole name should fit at 30 cm, and the composition is nearly centred) and `FLOAT_W` (how
large sheets are, 3 card widths — at 1.7 the name and the row under it should fit together at
30 cm, and the sheets are 12 cm wide instead of 21).

## How the spill looks through the stand-in camera

The stand-in camera is a room drawn to scale behind the guest canvas (card width 1 = 7 cm): 30 cm
floor tiles 1.25 m below the phone, a wall 2 m behind it, a 90 × 203 cm door, a figure holding the
phone whose screen shows the live host canvas.

| Evidence | What it shows |
|---|---|
| `artifacts/spill-v4-dolly.mp4` | The film to watch first (12 s). The file spills with the camera 30 cm from the phone; during the hold the camera steps back to 60 cm (the label counts 30 → 60 cm); then, time frozen, it orbits from 14° on one side to about 40° on the other and returns to the front at 47 cm. Sheets, guides and labels stay where they are in the room. |
| `process/s6-thesis-shot-47cm.jpg` | The brief's thesis shot at 2×, after the change: the phone small in the middle of the grid wall, the mark upper left and the name lower right (each 21 cm across, cut by the frame), the two text rows under the name, guides past the frame edge, the red tape with "47 cm" pinned at the phone's foot. `process/s3-thesis-shot-47cm.jpg` is the same shot before the change. |
| `artifacts/sheet-guest-anchored-{frontal,20,35}-explode.jpg` | Twelve frames of the event from three cameras. The wall comes out from behind the phone as a band and opens up and down; the text sheets and the mark leave the glass and travel out. |
| `artifacts/sheet-host-depart.jpg`, `sheet-host-rebuild.jpg` | The host: the canvas zooms out to an artboard 34 % of the card, the card's columns continue over the whole canvas, layers lift in place and leave dashed outlines; `rebuild` runs back to frame zero. |
| `artifacts/sheet-guest-unanchored-*.jpg` | No pose: a virtual phone small in the middle, an eye drifting ±12°, the same room. |
| `artifacts/sheet-guest-*-fly.jpg`, `*-assemble.jpg` | The suck-back into peel v2's deck and the full-bleed landing. |
| `artifacts/spill-v4-sequence.mp4` | Host and guest side by side through the whole sequence (14.7 s). |

## What works (with the evidence file in `checks/results/<browser>/`)

| SPEC | Item | Result |
|---|---|---|
| A1 | Host frame zero = flat reference | largest difference 0/255 in both browsers — `frame-zero.json` |
| A2 | QR scans through `idle` | decoded at every tilt, 1× and 2× — `qr-1x.json`, `qr-2x.json` |
| A3 | `safeRects` untouched | alpha 0 in 100 frames across `idle`, `connect`, `depart`, `rebuild` — `safe-rects.json` |
| A4 | One 7.5 s event, same on both roles | `depart` = `explode` = 7.5 s for every manifest; `fly` 1.4, `assemble` 1.0, `rebuild` 1.8 — `contract.json` |
| A5 | Host ends on the empty artboard | zoom 0.34, no print left, 6 outlines, grid drawn — `lift-handoff-host.json` |
| A6 | One layer, one place | sheet corners on the host's zoomed print within 0.00 px (state) and 0.44–0.89 px (drawn box), three poses; print gone at 0.25 s, sheet a gap off the glass at 0.32–0.38 s; 0 pixels change outside lifting layers' rects — `lift-handoff*.json` |
| A7 | Room scale, 16 poses (30–60 cm, ±35°) | phone in frame; 4–6 sheets in frame; 2–6 crossing a frame edge; largest sheet 6 card widths; 5–6 labels, none overlapping, none outside — `room-scale.json` |
| A8 | Room independent of the pose | drawn corners = pose × room pose within 0.0001 px — `room-scale.json` |
| A9 | Distance label | largest error 0.48 cm over 8 poses; 0 changes in 240 jittered frames; the label within 0.7 px of the line's start; no pose: 47 cm (virtual) — `distance-label.json` |
| A10 | Steady room | 0.593 px per frame p95 (1.04 max) under jitter, 5.26 (9.33 max) unfiltered; in a real move (30 → 60 cm in 2.5 s with a 30° orbit) lag at the card's corners ≤ 2.28 px, at sheet corners 5.3 px p95, 10.7 px at most — `steady-room.json` |
| A11 | Labels steady | block movement p95 ≤ 0.44 px per frame under jitter (0.01 at the standard pose, 0.44 from 30 cm); no overlapping frame, also through a 70° orbit (a block that must pass another is not drawn while they overlap: 12 of 240 frames); on its stateless place 0.3 s after the pose rests (0.035 px); one frame after a sudden pose jump a block is up to 23.7 px behind its place; same seek, same pixels — `label-steady.json` |
| A12 | Guides and the red line | 24 guides drawn, 5–14 of them past a frame edge in every pose — `room-scale.json` |
| A13 | Unanchored | eye −12°…+12°, one sweep in 4.00 s; phone 104–106 px wide, centred; same starts and travel as anchored; 6 sheets in frame — `unanchored.json` |
| A14 | `fly` and `assemble` | `fly` ends opaque, deck inside the canvas; `assemble` ends on the reference within 1/255, also for rects past the canvas — `assemble-end.json`, `assemble-overflow.json` |
| A15 | `rebuild` ends on frame zero | 0 differing values — `rebuild-end.json` |
| A16 | Determinism | same hashes across seeks and a remount — `determinism.json` |
| A17 | `dispose()` | textures, geometries, programs 0; no rAF; remount identical — `dispose.json` |
| A18 | Reduced motion | no travel, no drift, zoom only ever 1 or 0.34, end frames exact — `reduced.json` |
| A19 | Flashes | 0 per second in every timeline — `flash.json` |
| A20 | Contract surface | exports, rejections, events, requests, no test hooks in `dist/` — `contract.json` |
| A21 | Performance | see below — `perf.json` |
| A22 | Motion systems | seven independent in the shared event (zoom, lift, travel, guides, unroll, measurement, sweep) plus QR dissolve, live distance and label easing — `motion.json` |
| A23 | Room scale through the stand-in camera | looked at, not measured: the dolly film and the anchored sheets at 0°, 20°, 35°. The sheets stay where they are while the camera steps back and orbits. That is my reading of the pictures, not the owner's |
| A24 | Build | `tsc` clean; `dist/spill.js` 94.5 kB (30.1 kB gzip); font 18.9 kB with OFL |
| A26 | The row next below the phone stays in the frame; labels off other sheets | at all 16 poses the frame does not cut that row from above or below; on the phone's horizon and at the standard pose (8 poses) no label lies on another sheet and the distance label lies on none; at 5 pitched poses one does — `room-scale.json` |

**Performance** (this Mac, Apple M3; 390 × 844 CSS px at DPR 2; under the shared GPU lock; the
neighbouring run's demo was listening on port 5275 during every measurement):

| Browser (renderer) | Tier | Scene time per frame in the six moving timelines: largest median / largest p95 | Draw calls (most) |
|---|---|---|---|
| WebKit (Apple GPU) | `high` | 1 ms / 2 ms | 17 |
| WebKit (Apple GPU) | `mid` | 1 ms / 2 ms | 17 |
| WebKit (Apple GPU) | `low` | 0 ms / 2 ms | 16 |
| Chromium on Metal (Apple M3) | `high` | 0.5 ms / 1.2 ms | 17 |
| Chromium on Metal (Apple M3) | `mid` | 0.5 ms / 0.8 ms | 17 |
| Chromium on Metal (Apple M3) | `low` | 0.4 ms / 0.6 ms | 16 |
| Chromium headless shell (software GL) | all | recorded in `checks/results/chromium/perf.json`, not judged | 17 |

- Worst single frame in a moving timeline: WebKit 8 ms (host `depart` at `high`), Chromium on Metal
  4.2 ms (host `depart` at `mid`).
- `idle` is measured right after mount (38 frames): there WebKit's p95 was 6 ms at `high` with one
  frame of 56 ms (117 ms at `mid`), Chromium on Metal's worst frame 27 ms. The run of 02:00 had 3 ms
  and 33 ms; the Mac was busier at 10:30 (load average 14–16).
- Lock: waited 0 s and held in all three measurements; port 5275 was listening in all three.

"Scene time" is update + render + `gl.finish()` for one frame, measured inside the effect (test
build) while the timeline plays in real time. WebKit's clock has 1 ms steps, so its figures are
whole milliseconds. The budget is 6 ms at `high`. Chromium on Metal held 16.7 ms between frames in
every timeline and tier.

Texture memory: 17.5 MB at `high` (budget 64), 9.9 MB at `mid` (40), 4.4 MB at `low` (24) — peel's
budgets; room-scale sheets use the card's own baked textures, no new ones.

## Where things are

All paths are inside `packages/scene/effects/spill/`.

- **Code:** `src/` — `effect.ts` (the scene), `room.ts` (where each sheet stands; `CARD_WIDTH_CM = 7`
  is stated here and nowhere on screen), `schedule.ts` (every time and curve), `layout.ts` (labels),
  `gl.ts` (shaders), `assets.ts` (textures, label atlas, column detection). Guides are `#2F80FF`,
  the one measurement line `#FF4D3D`.
- **Bundle:** `dist/spill.js` (committed), `assets/spill-mono.woff2` with `assets/OFL.txt`.
- **Demo:** `npm run dev` in this folder, then `http://127.0.0.1:5276/demo/index.html` — host and guest side by
  side, the guest over the stand-in room; drag to orbit, wheel to step closer or back.
- **Checks:** `npm run check` (19 files, 25 tests per browser); results in `checks/results/<browser>/`.
  New in spill: `room-scale`, `distance-label`, `steady-room` (the brief's three), `unanchored`,
  `motion`; `lift-handoff` and `label-steady` were rewritten for the room. Two of peel's checks,
  `chrome` and `leaders-grid`, were removed with the things they measured (the hovering stack's
  chrome and its leader rails); their result files are deleted in the S5 commit.
- **Pictures and films:** `artifacts/` (sixteen contact sheets, two films), `process/` (what the
  run looked at on the way).
- **Words:** `SPEC.md` (25 acceptance items), `RUNLOG.md` (what happened, with times), `CLAUDE.md`
  (rules for the next agent and the contract table), this report.
- **Outside the repo:** the owner's card renders in `~/dev/prv/products/layercard-runs/spill-v4-eryk/`;
  the article diary and its materials in the vault (`Dziennik do artykułu — scena spill.md`,
  `materialy/spill-v4/`).

## What does not work, or is not known

- **Real devices.** No iPhone, no Android phone, no camera, no tracker. `mid` holding 60 fps on
  an iPhone 12 while the shell runs camera and tracker is unverified. This is the largest open risk
  for the 17 November event.
- **The jitter is synthetic.** White-noise shift plus rotation. A real tracker's error is
  correlated and has outliers; the pose filter's constants (about 1 Hz at rest, opening with speed)
  are tuned to the synthetic case and to a lag I judged acceptable.
- **During a fast camera move the far sheets lag.** Up to 10.7 px at the sheet corners in the test
  move (2.3 px at the phone). It reads as slight rubber-banding, not as swimming, in the dolly film.
- **No occlusion by people.** The wall is drawn over the host's hand and body; only the phone itself
  is cut out (its body is assumed 3.5 % of a card width larger than the card on every side).
- **Magnified prints are soft.** Sheets reuse the card's textures (the brief's rule), so at room
  scale text is magnified 3.9–6 times. It is clean at 47 cm and soft close to the camera.
- **Close to the phone the frame is smaller than the file.** From 30–35 cm it cuts the end of the
  name row and hides the rows under it; see "What is still cut" above.
- **Labels from above and below.** On the phone's horizon no label lies on another sheet; at 5 of
  the 16 checked poses, all of them pitched, one label or the distance label lies on the name
  sheet. The labels of the wall and the grid sit in the top corners, over the mark.
- **The red line crosses the name row.** The tape runs from the phone's foot straight down the
  frame, over the first row below the phone: a 1.5 px line with ticks over the text.
- **The unanchored distance is not a measurement.** Without a pose the label shows the virtual
  scene's 47 cm. It is consistent with what is drawn, but it measures nothing real.
- **The canvas grid needs a readable grid layer.** Columns are read from a full-bleed layer with
  regular vertical bands. A card without one gets columns one card width apart.
- **Chromium's default run is software GL** (Playwright's headless shell); its frame times are
  recorded, not judged. The GPU figures are WebKit's and Chromium-on-Metal's.

## Final run

The run after the change of 16 November, 10:24–10:34, on the `dist/` built at 10:24 (the build was
repeated at 10:34 with the same source and gave the same 94.53 kB). No source, check or demo file
was edited while it ran; the films and contact sheets were rendered after it.

| Run | Result |
|---|---|
| All checks except `perf`, Chromium (software GL) and WebKit (GPU) | 48 passed in 4.9m |
| `perf`, both browsers, under the GPU lock | 2 passed in 2.3m |
| All checks except `perf`, Chromium on Metal (`SPILL_GL=metal SPILL_CHANNEL=chromium`) | 24 passed in 56.1s |
| `perf`, Chromium on Metal, under the GPU lock | 1 passed in 1.1m |

The run of the night (01:57–02:07, before the change) had the same counts: 48, 2, 24 and 1 passed.

## Rule conflicts and how they were decided

- **Contract table vs this effect's brief.** The contract says guest `explode` ends in a "full
  stack hovering"; the brief forbids exactly that. The brief of the effect won: layers stand in the
  room. Everything checkable in the contract still holds (see `CLAUDE.md`, Contract section).
- **Determinism vs a room that stays put.** A pose filter is history. The contract allows the
  effect "light interpolation" of the pose, so the filter is used, `seek` bypasses it, and its
  effect is measured both ways (`steady-room.json`).
- **Leave order vs peel's "top layer first".** The room is built from the back, so the layers that
  go behind the phone leave first. This exposed a draw-order rule inherited from peel (found by
  looking, see RUNLOG 01:35) and was kept.
- **Not getting in the other run's way vs speed.** GPU-heavy work took the lock; films were
  rendered in WebKit (4 frames per second) instead of fighting for software GL. Once, restarting
  the final run, an earlier chain of commands stayed alive for 17 s and started `perf` in parallel;
  it was killed and the lock released (01:57). No file, port or process of the other run was touched.
- **`package-lock.json`.** Installing from the worktree root rewrote it (the new workspace). It is
  outside the folder but was committed with S1, as peel's runs did; say if it should be dropped.

## Creative decisions (recorded, not approved — taste is the owner's)

1. **The room.** Wall: bottom layer, 6 card widths (42 cm), 3 widths (21 cm) behind the phone.
   Grid: 5 widths across, 2 behind. Other layers: one magnification for all (the widest becomes 3
   card widths, 21 cm), in rows above and below the phone that keep the card's vertical order,
   0.35 apart, alternating 0.85 left and right of the axis, turned 22° inwards. Layers with the
   same rect share a row, 0.14 apart in depth. Since 16 November a row comes towards the guest only
   as far as it fits the frame from 30 cm (0.2 to 1.6 in front of the phone); before, sheets stepped
   0.55–2.2 towards the guest by stack order.
2. **"Behind the host" is read as "behind the host phone".** The wall stands between the phone and
   the host's body so that what is drawn in front really is in front; it is tinted glass (print
   density 0.5 behind the phone), not a blackout — the first version at 0.66 hid the room.
3. **Backdrop layers leave through the glass, away from the viewer,** and unroll behind the phone
   (a band at the phone's height that opens up and down). They never cross in front of the phone.
4. **Leave order:** backdrops bottom-up, then the rest top-down.
5. **Host canvas:** artboard at 34 %, centred; the canvas grid is the card's own columns, read from
   the grid layer's pixels; one tag above the artboard, "Spilled to guest".
6. **The measurement** is a tape from the foot of the host phone to the bottom centre of the
   guest's frame, a tick every 10 cm, the number pinned on its start across the phone's foot (on
   its middle until 16 November); it is drawn out early (1.25–1.95 s) so the true distance is on
   screen before the room is.
7. **Labels** sit above the visible part of a sheet's top edge, at its outer end: left for a sheet
   left of the phone, right for the others (since 16 November; before, at the highest point of the
   outline). A block that has to pass another is hidden while they overlap.
8. **Timing:** zoom-out 0.1–0.9 s; lifts 0.9–2.9 s; travel 2.3 s on a quintic ("heavy") curve,
   depth leading, the turn following; chrome 0.45 s; a 1.6 s hold; `fly` 1.4 s; `rebuild` 1.8 s.
9. **Close to the camera a sheet fades** (from 13 cm, gone at 5 cm) instead of filling the frame.
10. **Reduced motion:** the host's zoom is a fade-out at one size and a fade-in at the other; a layer
    fades out on the glass and then fades in at its room pose.
11. **Tiers:** `mid` and `low` draw 2 guides per sheet instead of 4; `low` also drops the plane of
    columns, thins the slabs and has no sweep.
12. **The stand-in room:** tile size, door, picture, sideboard, a grey figure 35 cm behind the phone.
13. **Contact sheets are JPEG (quality 0.9)**, 5.5 MB for sixteen as WebKit encodes them (3.6 MB
    in the night's set, encoded by Chromium), instead of PNG.
14. **The acrylic** is peel's (rim, sweep, inner shadow), 2.2 times as thick at room scale.
15. **Guides:** along each sheet's top edge both ways and along its inner edge up and down, 7 card
    widths long (49 cm), wide and soft far from the sheet.
16. **Unsteady hand:** the pose passes a low-pass of about 1 Hz at rest that opens with speed; a
    label moves only when its place has moved more than 2 px; the distance number changes only
    after 0.8 cm.

## What waits for the owner

- Looking at the new dolly film and `process/s6-before-after-30cm.jpg` and saying whether the name
  now does what it should.
- `FLOAT_X` and `FLOAT_W`: whether the end of the name and the rows under it should be in the frame
  from 30 cm at the price named in "What is still cut".
- A run on real phones before the event, anchored and unanchored, at `mid`.
- Whether the unanchored guest should show a distance at all (see "The unanchored distance is not a measurement" above).
- The owner's card: renders are in `~/dev/prv/products/layercard-runs/spill-v4-eryk/` (sixteen
  contact sheets, a dolly film, the sequence film) and in the vault's `materialy/spill-v4/`; none of
  its files, names or text is in the repo.
- `packages/scene/CONTRACT.md`: nothing needed changing. One sentence may deserve a note in a later
  version: the "Ends in" column for `explode` describes peel.
- The S2 commit message says "45 tests"; the count was 48. The message was not rewritten.
- Whether `package-lock.json` (outside this folder, changed by the install) stays in the S1 commit.
- Pushing or merging `scene/spill-v4`: nothing was pushed, merged, rebased or tagged.
- The sixteen creative decisions above, three of them changed on 16 November (1, 6, 7).

## What I would do next

1. Record a real tracker's poses on the two phones and replay them through `steady-room`; tune the
   filter to that instead of to white noise.
2. Sharper sheets near the camera: bake the two or three nearest layers once more at a higher
   resolution if the tier's budget allows (it does: 17.5 of 64 MB).
3. Keep labels off other sheets from pitched cameras too (hide a label that would lie on a sheet).
4. A depth cue for people: let the shell pass a person mask, or dim the wall where the tracker
   sees the hand.
5. Host rulers along the canvas edges, to match the guest's tape.

## Proposed lines for `docs/build-log.md`

- 2026-11-16 — spill v4 (`scene/spill-v4`, commits `e0d3497` (S1), `73ce561` (S2), `9f0af72` (S3), `0b0aec1` (S4), `ca7869e` (S5) and the commit of the same morning that carries this version of the report): new effect
  `packages/scene/effects/spill/`, contract v1.1 unchanged. Source: `packages/scene/effects/spill/REPORT.md`.
- Shared event 7.5 s for every manifest (`depart` = `explode`), `fly` 1.4 s, `assemble` 1.0 s,
  `rebuild` 1.8 s. Source: `checks/results/webkit/contract.json`.
- Flat frames: largest difference 0/255 (frame zero, `rebuild` end) and ≤ 1/255 (`assemble` end) in
  Chromium and WebKit. Source: `frame-zero.json`, `rebuild-end.json`, `assemble-end.json`.
- Steady room: sheet corners 0.593 px per frame at p95 under 1.5 px / 30 Hz jitter with rotation,
  5.259 px without the pose filter; card-corner lag ≤ 2.283 px in a 30 → 60 cm move. Source:
  `checks/results/webkit/steady-room.json`.
- 2026-11-16, after the owner's first look: a row of sheets comes towards the guest only as far as
  it fits the frame from 30 cm; labels hang at the outer end of their sheet; the distance label is
  pinned at the phone's foot. The row next below the phone is inside the frame from top to bottom
  at all 16 checked poses. Source: `checks/results/webkit/room-scale.json` (`rowNextBelowPhone`).
- Distance label: largest error 0.48 cm over eight poses, card width taken as 7 cm. Source:
  `checks/results/webkit/distance-label.json`.
- Performance on an Apple M3, scene time per frame in the moving timelines: WebKit ≤ 1 ms median,
  ≤ 2 ms p95; Chromium on Metal ≤ 0.5 ms median, ≤ 1.2 ms p95 (budget 6 ms). Texture memory
  17.5 / 9.9 / 4.4 MB (`high` / `mid` / `low`). Source: `checks/results/{webkit,chromium-metal}/perf.json`.
- Bundle: `dist/spill.js` 94.5 kB (30.1 kB gzip); font 18.9 kB. Source: `perf.json` (`sizes`).
- Not measured: any real phone, camera or tracker.
