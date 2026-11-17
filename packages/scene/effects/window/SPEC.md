# window — SPEC

Written before any window code, 2026-11-15 23:25 (the folder then held peel v2 copied and renamed,
milestone W1). The brief is `PROMPT.md`; the binding contract is `packages/scene/CONTRACT.md` v1.2.

## 1. What is built

One effect, `@layercard/effect-window`, for both roles. Everything lives in **card space**: the
card is 1 wide and H = h / w tall, centred on the origin, +Z out of the host screen. The glass is the
plane z = 0. Behind it is a box, the **cavity**: the card's cross-section, 3 card widths deep.

### 1.1 Two phones, one world

- **Host** draws only what is behind the glass (z < 0). Its camera is an asymmetric frustum from an
  eye through the card's rect on the canvas (the window), so the screen shows what a real cavity
  would show that eye. The eye is `setViewer`'s position, or — with no viewer — a virtual eye 6 card
  units in front of the centre, swung by tilt up to ±25°. A switch between the two is blended over
  0.3 s of wall clock. A viewer is used in the next frame, without smoothing.
- **Guest, anchored** draws only what is in front of the glass (z ≥ 0), over the camera image, in
  the pose it is given. It draws nothing of the cavity and no shadow on the glass.
- **Guest, unanchored** draws both sides itself: the window as a card-sized opening, the cavity
  behind it clipped to that opening, the stack in front. Its virtual pose is solved so the settled
  stack and its labels fit the 8 % margins, and swings ±12° in yaw. One sweep takes half of the
  event (3.875 s), so the swing is back at its start, at rest, when the event ends, and `fly`
  always starts from the same pose. (W4 let the swing run on through the hold; W5 took that back:
  a frame of `fly` then depended on when `explode` had started, which the contract does not allow.)
- A fragment is kept or dropped by the sign of its card-space z, the same test on both devices, so a
  sheet that is crossing the glass is split along one line and is never whole on both.
- Anything behind the glass is also dropped where the line from the eye to it passes outside the
  window rect (the phone's body would hide it).

### 1.2 The cavity

- Four walls in the card background colour, a little lighter towards the opening and towards the
  lit back; they carry the card's own edge: the outermost rows and columns of the flat composite are
  extruded into depth, so whatever grid the card has at its edges runs away along the walls. No
  region of a wall is darker than the card background, shadows included.
- Rulers across the walls every 100 design px of depth, stronger every 500, with mono numerals at
  every 500 (high and mid tiers).
- The back wall is a soft luminous panel: the card background mixed half-way to the rim white,
  dimmer towards its corners. The layers' dashed outlines are drawn on it as they leave.
- A soft band of shadow on walls and floor at the depth of every sheet, and each sheet's blurred
  shadow on the sheet (or back wall) behind it.

### 1.3 The event (host `depart` = guest `explode`, 7.75 s for any manifest)

1. **The glass opens**, 0–1.2 s: the stack recedes as one to z = −0.6.
2. **Exploded inside**, 1.2–2.4 s: the layers fan out in depth. The bottom one goes to the back
   wall; the others hang near the glass, the top one at z = −0.25 and the rest 0.2 apart (closer
   when there are many, none deeper than 1.4), where they can still be told apart from 35° off the
   normal. (Changed during W2 from an even spacing over the whole depth: from 35° only the top
   two of six were visible at all.)
3. **Out through the glass**, from 2.4 s, top layer first, starts spread over 2.5 s. Each exit
   takes 1.1 s: 0.5 s approach, 0.25 s crossing — the sheet is tilted about its longer axis so the
   glass cuts it along a line that sweeps across it — and 0.35 s to its place in peel's stack
   (0.08 above the glass, 0.11 apart, 0.035 stair), flat, with one soft spring: 6 % past its place
   and back within the 0.1 s before its chrome. Then peel v2's chrome (0.45 s) and a
   1.2 s hold. The host shows a rim of light along the cut when it has no viewer.
4. End: the host shows the empty lit cavity with the outlines; the guest the stack with chrome.

`connect` 0.8 s (peel's QR dissolve). `fly` 1.2 s and `assemble` 1.0 s as peel v2 (full-bleed
landing). `rebuild` 1.8 s: layers come back in through the glass in reverse order, gather, move to
the glass and flatten; the QR re-forms last.

`reduced`: no travel. The opening is a cross-fade to the fanned-out state, each exit a fade out on
the host and a fade in at its place on the guest, the tilt eye stays frontal; a real viewer still
moves the perspective.

### 1.4 Flat frames

Host `idle` (peel v2's: flat, breathing, tilt parallax) and the end of `rebuild`, and the guest's
end of `assemble`, are the flat reference of the contract, baked as in peel v2.

## 2. Acceptance items

| ID | Item | Evidence |
|---|---|---|
| A1 | W1: peel v2's checks pass under the new name in WebKit and Chromium | `npm run check`, `RUNLOG.md` |
| A2 | Host idle frame zero and rebuild end = flat reference, largest difference ≤ 1/255, both browsers; QR decodes through `idle` | checks `frame-zero`, `rebuild-end`, `qr` |
| A3 | `safeRects` never drawn over from `idle` to the end of `depart` | check `safe-rects` |
| A4 | `durations()`: `depart` = `explode`, 7.5–8.5 s, same on both roles | check `contract` |
| A5 | At ≥ 12 eyes (frontal, ±20°, ±35° on both axes; 30, 45, 60 cm) the cavity's back corners and wall edges, as drawn on the host screen and seen by the stand-in camera, are within 1 CSS px of the real box; one image per eye against a direct 3D render | check `window-truth` |
| A6 | During the end hold no cavity pixel is darker than the card background; the back panel has ≥ 3× its luminance | check `exposure` |
| A7 | viewer ↔ none: eased within 0.3 s, bounded change per frame | check `viewer-switch` |
| A8 | A crossing sheet: host pixels only behind the glass, guest pixels only in front, halves meet within 1 CSS px in the stand-in camera; no frame with a layer whole on both | check `glass-seam` |
| A9 | Each crossing lasts 0.25 s (0.2–0.3); the settled stack has peel's geometry; labels as peel v2 | checks `glass-seam`, `chrome`, `leaders-grid`, `label-steady` |
| A10 | Unanchored: stack and chrome inside the 8 % margins at every drift angle; drift ±12°, 3.875 s per sweep, at rest at the end; the cavity is visible through the opening | check `unanchored`, sheets |
| A11 | Assemble end exact for full-bleed, overflowing and centred rects | checks `assemble-end`, `assemble-overflow` |
| A12 | Deterministic in time and inputs, the viewer included | check `determinism` |
| A13 | `reduced`: no travel, frontal tilt eye, real viewer still applies | check `reduced` |
| A14 | ≤ 3 flashes per second; dispose frees everything; contract surface (`setViewer` on the handle, no test hooks in `dist`) | checks `flash`, `dispose`, `contract` |
| A15 | Scene ≤ 6 ms median at `high`; texture budgets; no allocation per frame | check `perf`, code |
| A16 | Demo: one draggable pose drives guest pose and host viewer (inverse of the pose), viewer switch, tilt, quality, reduced, every timeline, play all | `demo/` |
| A17 | Artifacts: sheets for every role × timeline, orbit video, sequence video; owner's card outside the repo | `artifacts/`, outside path in `REPORT.md` |
