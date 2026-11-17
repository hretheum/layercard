# peel v2 — SPEC

Written before any v2 code, 2026-11-15 21:10. Amended in milestone V2 (lift curve: 11.5 % instead
of 12.7 % at the end of the peel, so that the top face — not only the underside — of the highest
possible sheet stays under one gap; the pixel rule B1 now reads "max", see §1.4), in V3 (§1.2: the
deck is solved from its real screen box; the bake keeps a canvas-sized scratch) and in V4 (§1.3 is
the layout as built). The acceptance items in §2 were not changed. The brief is `PROMPT.md` (v2); the binding contract is
`packages/scene/CONTRACT.md` **v1.1**. v1 (tag `peel-v1.0`, archived in `history/v1/`) is the floor:
everything it does stays, except what is listed here.

## 1. What v2 changes

**Core idea: one layer, one place.** At every instant a layer is printed on the host's glass, in
the air, or in the guest's hand — never two of these.

### 1.1 The lift-off (shared by host `depart` and guest `explode`)

- One lift curve for both roles, `lift(τ)`, τ = seconds since the layer's start (start times as in
  v1: `0.2 + k·gap`). It replaces v1's `cubic-bezier(.16,1,.3,1)` rise, which had a sheet one gap up
  after 0.03 s. A sheet's height is `lift(τ)` times its own rest height:
  - **peel**, 0–0.25 s: quadratic ease-in to 11.5 % of the rest height;
  - **rise**, 0.25–0.9 s: cubic Hermite, entering with the peel's speed and arriving with zero
    speed at the peak, 106 % (v1's overshoot);
  - **settle**, 0.9–1.25 s: half cosine back to 100 % (as v1).
- The highest possible sheet (8 flying layers, resting 0.85 above the glass, 0.862 with its own
  thickness) has its top face 0.1098 above the glass at 0.25 s, so for every manifest a sheet is one
  gap (0.11) up only after 0.25 s — and the host's print of it is gone at 0.25 s. For the example
  card the top sheet is 0.084 up at that moment (measured by `lift-handoff`).
- The sheet's thickness grows with the same 0.25 s (it starts as a flat print on the glass), so no
  part of the slab is ever below the glass.
- **Host `depart`:** a layer never moves sideways and never draws outside its own rect. During
  the first 0.25 s of its lift the print swells to 103.5 % around its centre (clipped by its rect),
  a contact shadow of the print appears under it and drifts down-right with the shared rise height
  (the same model as the guest's shadow on the glass), and the print fades out late (opacity 1
  until 0.08 s, 0 at 0.25 s). The dashed outline is traced during 0.03–0.25 s, the tag fades in
  during 0.15–0.30 s. The shadow fades during 0.25–0.45 s. The tag reads **"Lifted to guest"**
  (15 characters).
- **Guest anchored `explode`:** at its start the sheet lies on the glass exactly on the layer's rect
  (z = 0, no stair offset), fades in over 0.08 s while it still coincides with the host print, and
  rises on `lift(τ)`. Its shadow on the glass fades in during 0.25–0.45 s, as the host's fades out.
- **Host `rebuild`** runs the lift backwards: reverse order, each layer descends in 0.25 s (swell
  103.5 % → 100 %, shadow converging, print fading in), its outline clears as it lands; QR last;
  end frame = idle frame zero.
- **Unanchored guest:** unchanged (it enters from the top edge on v1's curve; only the overshoot
  and settle are shared).
- Durations unchanged: 6.1 s for the example.

### 1.2 The landing

- `assembleRect` may run past the canvas. The flat fit is computed in the whole rect. The part of
  each layer that the canvas can show is baked exactly as before (drawn at its absolute position on
  a canvas the size of the drawing buffer — the reference's own operation); the part outside the
  canvas, visible only while the sheet is in the air, comes from a second, larger scratch canvas.
- The deck at the end of `fly` is as large as fits the canvas with 4 % of its width / height free on
  every side, at most 1.12× the final size (v1's size), with its screen box centred on the visible
  part of the landing rect. For a full-bleed 390 × 844 landing that is 0.89× the final size; for
  393 × 850 in a 393 × 659 canvas 0.69×. `assemble` grows (or, for a small centred rect, shrinks)
  and moves it into `assembleRect`.
- Nothing is clipped by the side edges during `fly` and `assemble`.

### 1.3 Labels

- One arrangement only: rows of blocks above and below the stack, in two columns either side of a
  narrow channel; leaders = stub → rail (down the channel) → gate → straight to a sheet corner. v1's
  "beside the stack" mode is removed (it caused the crossings when the stack was cut by a side edge).
  All gates of one end lie on one line between the blocks and the stack, so rails and stubs cannot
  meet the straight parts; the straight parts are uncrossed by swapping slots (also across the two
  columns and the two ends), which ends because each swap shortens their total length. If a crossing
  is left, every block goes to the end with more room — recorded per pose as the arrangement.
- Each sheet keeps the kind of corner its leader ends on (left for even stack indices, as in v1);
  its column and row may change. Blocks are at most as wide as lets two columns and the channel
  fit inside the margins (v1: 44 % of the canvas each, which could overlap); rails move closer
  together (7 → 2.5 CSS px) when one end holds three or four rows.
- Chrome history (contract v1.1): the slot assignment is held while it stays free of crossings and
  fits; it is replaced at most once per 0.5 s while the pose moves, and at once when the pose has
  rested for 0.05 s. Block positions follow a dead band of 2 CSS px and a critically damped spring
  (within 0.5 % after 0.22 s). Sheets, frames, handles, gates and the sheet end of every leader
  follow the pose exactly. `seek` clears the history. `reduced`: no spring, the dead band and the
  held assignment stay.
- On canvases wide enough for v1's "beside" mode the unanchored pose now also leaves room for rows
  above and below (on phone-sized canvases it is unchanged).

### 1.4 WebKit

Every check runs in Chromium and in Playwright WebKit; evidence per browser in
`checks/results/<browser>/`. Pixel references are rendered in the same browser. "Within 1/255" is
the **largest** difference of any channel of any pixel (v1 asserted the mean, which hid the baseline
finding of V1: on a GPU-accelerated 2D canvas the bake differed by up to 74/255 on layer edges).
Chromium also runs on the real GPU (`checks/results/chromium-metal/`).

## 2. Acceptance items

| ID | Item | Evidence |
|---|---|---|
| B1 | All 16 v1 checks pass in Chromium and WebKit; flat frames within 1/255 (max, not mean) in both | `npm run check`, `checks/results/{chromium,webkit}/*.json` |
| B2 | Host depart/rebuild: no pixel changes outside the rect of a layer that is lifting or has left, compared with the same frame without that layer's lift | check `lift-handoff` |
| B3 | Host print opacity is 0 before the guest sheet is one gap (0.11) above the glass, for every layer | check `lift-handoff` |
| B4 | Guest anchored: projected sheet corners at lift start within 1 CSS px of the layer's rect on the host screen, frontal and 35° | check `lift-handoff` |
| B5 | Host in-place lift reads as rising; through the stand-in camera each layer is in one place | v1-vs-v2 sheets, process image |
| B6 | Rebuild end frame = idle frame zero; durations unchanged and equal on both roles | checks `rebuild-end`, `contract` |
| B7 | Landing exact (≤ 1/255) for 390×844 in 390×844, 393×850 in 393×659, 320×693 in 320×568 and a centred smaller rect | check `assemble-overflow` |
| B8 | No sheet corner leaves the canvas sideways during `fly` and `assemble` | check `assemble-overflow` (state) |
| B9 | ≥ 60 poses (30–60 cm, ±35°, stack cut by every edge and corner): 0 leader crossings, 0 overlapping blocks, blocks inside the 8 % margins, text ≥ 12 CSS px | check `leaders-grid` |
| B10 | Jitter 1.5 CSS px at 30 Hz: block centres move ≤ 0.5 CSS px per frame (p95), ≤ 2 swaps per second; same seek twice → identical pixels | check `label-steady` |
| B11 | Chrome history allocates nothing per frame; tiers and budgets as v1, measured in both browsers | check `perf`, code review |
| B12 | v1 recoverable: tag, branch and worktree untouched; v1 `dist/peel.js` extracted from the tag renders the comparison sheets | `git` state in `RUNLOG.md`, v1-vs-v2 sheets |
| B13 | Demo: every v1 control plus a jitter switch | demo, video |
| B14 | Artifacts: v2 sheets for every role × timeline, three v1-vs-v2 sheets, one video; owner's card sheets outside the repo | `artifacts/`, outside path in `REPORT.md` |

## 3. Not changed

Style law, palette, idle, `connect`, stack geometry, the look of the selection chrome, the
unanchored pose, reduced-motion behaviour, and every v1 creative decision not named in §1.
