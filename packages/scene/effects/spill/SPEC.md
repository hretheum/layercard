# spill — SPEC (v4)

Written before the first line of spill code (2026-11-16, 00:13), from `PROMPT.md` and peel v2's
source. It says what is built and how each part is accepted. Numbers marked *(tune)* are starting
values; the final ones are in `RUNLOG.md` and in the evidence files.

## What is built

`@layercard/effect-spill`: one scene module for contract v1.1. The card is a design file. For one
shared event of 7.5 s (host `depart` = guest `explode`) the file leaves the phone and stands in the
room at room scale; then it is pulled into the guest's phone (`fly`, `assemble`) and the host's
canvas zooms back in (`rebuild`).

- **Units.** Card frame of the contract: card width 1, origin at the card centre, +Z towards the
  viewer. One unit is taken as 7 cm (the brief's assumption) only where centimetres are shown.
- **Host `depart`.** The canvas zooms out: the card becomes an artboard `ZOOM` = 0.34 *(tune)* of
  its size at the canvas centre, the card's column grid continues across the whole canvas, and the
  layers lift off in place (peel v2's lift) in leave order. End: empty artboard, dashed outlines,
  grid around it. `rebuild` is the same run backwards in 1.8 s and ends on `idle` frame zero.
- **One zoom curve.** `zoomAt(t)` (pure) gives the artboard's scale. The host draws prints with it,
  the guest starts every sheet on the glass with it, so a sheet rises exactly where the host shows
  its print (one layer, one place).
- **The room.** Every flying layer has one room pose (position, yaw, scale) that depends only on
  the manifest — never on the camera pose — so the room cannot swim. Bottom layer: a wall 6 card
  widths across, 3 units behind the phone. Second full-bleed layer: the grid plane in front of
  the wall, its columns continued floor-to-head as soft guides. The other layers: one magnification
  (the widest becomes 3 card widths), in rows above and below the phone, alternating left and
  right of it, turned inwards. A row comes towards the guest only as far as it stays inside the
  frame from top to bottom for a camera 30 cm in front of the phone (a constant of the layout, not
  the live pose); a row that cannot fit from there stands 0.2 in front of the phone. Sheets are
  peel's acrylic slabs with the same baked textures.
- **The phone stays visible.** Sheets behind the card plane get a soft hole where the host phone
  is (anchored), or are drawn before the effect's own virtual phone (unanchored).
- **Travel.** Lift (shared `liftCurve`, 0.25 s on the glass) → growth and travel on one heavy curve
  per sheet (2.6 s) → chrome. Wall and grid unroll from the phone's height. Near the camera a sheet
  fades instead of covering the frame.
- **Guides and the measurement.** Two selection-blue guides per sheet run along its edges far past
  its corners; far parts are wide and soft. One red line runs from the host phone to the bottom
  centre of the guest's frame; its label, pinned on the line's start at the phone's foot, shows
  `round(|pose translation| × 7)` cm.
- **Chrome.** Label chip and dims pill per sheet, screen-space, 12 CSS px, placed at the sheet's
  visible top edge, at its outer end (where the row next to it does not reach), pushed apart when they would overlap, eased with the
  history contract v1.1 allows (dead band, spring, cleared by `seek`). A block that has to pass
  another while the camera moves is not drawn for as long as the two overlap.
- **Unsteady hand.** The pose passes a light adaptive low-pass (strong at rest, weak in motion);
  `seek` bypasses it. Chrome and the distance digits keep hysteresis.
- **Unanchored.** A virtual phone small in the middle, a virtual eye drifting ±12° (one sweep in
  4 s), the same schedule and the same room. The red line's label shows the distance in that
  virtual scene (stated in the report: it is not a measurement of the real room).
- **`fly` (1.4 s) / `assemble`.** Every sheet goes from its room pose to its place in peel v2's deck;
  guides retract, wall and grid roll up, the canvas turns opaque; `assemble` is peel v2's landing.
- **Reduced.** Sheets fade in at their room poses, guides appear whole, `fly` cross-fades, no
  drifting eye; end frames unchanged.
- **Tiers.** `mid`/`low` give up pixel ratio, rims' soft glow, the sweep and far guides first.
  Timings, frame zero, the QR, end frames, label size and one-layer-one-place are the same in all.

## Acceptance items

Each item names its evidence. `results/` means `checks/results/<webkit|chromium>/`; both browsers
must be green. "Sheet" means `artifacts/sheet-*.png`.

| # | Item | Evidence |
|---|---|---|
| A1 | Host `idle` frame zero equals the flat reference, largest difference ≤ 1/255 | `frame-zero.json` |
| A2 | QR decodes throughout `idle` (1× and 2×) | `qr-1x.json`, `qr-2x.json` |
| A3 | `safeRects` untouched from `idle` to the end of `depart` (and in `rebuild`) | `safe-rects.json` (alpha 0 in every sampled frame) |
| A4 | `durations()`: `depart` = `explode`, 7–8 s, identical for both roles and all tiers; `fly` ≈ 1.4 s; `rebuild` ≈ 1.8 s | `contract.json` |
| A5 | Host `depart` ends with the artboard at `ZOOM`, no print left, dashed outlines, grid drawn | `lift-handoff-host.json` (`end`), sheet host depart |
| A6 | One layer, one place: guest sheet starts on the host's zoomed print (corners ≤ 1 CSS px, drawn box ≤ 1.5 CSS px, three poses) and the print is gone before the sheet is one gap (0.11) off the glass; on the host no pixel changes outside the rects of the layers that are lifting | `lift-handoff.json`, `lift-handoff-host.json` |
| A7 | Room scale at the end of `explode`, ≥ 12 poses (30–60 cm, up to ±35°): phone in frame, ≥ 3 sheets in frame, ≥ 1 sheet crossing a frame edge, largest sheet 5–7 card widths, labels ≥ 12 px, inside the canvas, not overlapping | `room-scale.json` |
| A8 | Room is independent of the pose: sheet poses in the card frame identical across those poses | `room-scale.json` (`layoutSpread` = 0) |
| A9 | Distance label equals pose distance × 7 cm within 1 cm, ≥ 6 poses | `distance-label.json` |
| A10 | Steady room: 1.5 px / 30 Hz jitter (translation and rotation), far sheet corners move ≤ 2 CSS px per frame at p95; a real camera move is followed with ≤ 4 CSS px of lag at the card | `steady-room.json` |
| A11 | Labels steady under jitter, never drawn overlapping (also through a 70° orbit, where at most 24 of 240 frames may have a block giving way), settle to the stateless layout within 0.3 s, same seek → same pixels | `label-steady.json` |
| A12 | Guides and the red line are drawn at the end of `explode`; at least one guide runs past a frame edge in every pose of A7 | `room-scale.json` (`guides`), sheets |
| A13 | Unanchored: virtual phone in frame, same schedule, eye sweep ±12° ± 1° with a 4 s sweep, everything of A7 except the pose | `unanchored.json`, sheet guest unanchored explode |
| A14 | `fly` ends opaque with the deck inside the canvas width; `assemble` ends on the flat reference in `assembleRect` (≤ 1/255), also for rects past the canvas | `assemble-end.json`, `assemble-overflow.json` |
| A15 | `rebuild` ends on `idle` frame zero (0 differing values) | `rebuild-end.json` |
| A16 | Determinism: same seek, same pixels; two mounts agree | `determinism.json` |
| A17 | `dispose()` frees textures, geometries, programs, rAF; remount works | `dispose.json` |
| A18 | Reduced: no travel (sheets appear at room poses), no eye drift, end frames exact | `reduced.json` |
| A19 | At most 3 flashes per second in every timeline; guest canvas transparent in `explode` | `flash.json` |
| A20 | Contract surface: exports, wrong-role `play` rejects, `onLayer` phases, no extra requests, no test hooks in `dist/` | `contract.json` |
| A21 | Performance: scene ≤ 6 ms per frame at `high` (p95, Chromium on Metal and WebKit, this Mac); texture memory within peel's tier budgets; no new textures for room sheets | `perf.json` |
| A22 | Motion systems run independently (≥ 5 of: zoom, lift, travel, guides, grid unroll, measurement, sweep/rims, QR dissolve, label easing) | `motion.json` (each system's signal changes while the others are held) |
| A23 | Through the stand-in camera the file stands at room scale and stays put while the camera orbits and dollies | dolly video, sheets anchored frontal / 20° / 35° |
| A24 | Build: `tsc` clean, `dist/spill.js` committed, font + licence beside it | `npm run build` |
| A25 | Diary, materials and Progress updated at every milestone | vault files, commit times |
| A26 | Added 16 Nov after the owner's first look. At the end of `explode`, at all 16 poses of A7, the frame does not cut the row of sheets next below the phone from above or below (it may cut it at the sides); on the phone's horizon and at the standard pose no sheet's label lies on another sheet, and the distance label lies on none | `room-scale.json` (`rowNextBelowPhone`, `labelsOnOtherSheets`, `distanceLabelOnSheets`) |

## Milestones

S1 skeleton (peel v2 as spill, its checks green) → S2 the room (stand-in camera with a room, wall +
grid + one sheet anchored; A7, A8, A10) → S3 the whole event (all sheets, guides, red line, host
zoom; A5, A6, A9, A12) → S4 unanchored, `fly`, `assemble`, `rebuild`, reduced (A13–A15, A18) →
S5 owner's card, artifacts, perf, report (A21–A25).
After the run, 16 Nov: the owner's first look — the name sheet must not leave the frame (A26).
