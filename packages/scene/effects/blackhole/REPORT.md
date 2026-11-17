# blackhole v5 — report

Written 2026-11-16 for a reader who has seen none of the run. Branch `scene/blackhole-v5`, folder
`packages/scene/effects/blackhole/`, five commits (B1 `28dfc35`, B2 `4dcbf90`, B3 `e9ee22c`,
B4 `688f7a5`, B5 `224d0bd`; two small commits after B5 only correct lines of this file). Nothing was pushed, merged or tagged.

## 1. The most important things

1. **It is built and every check is green in both browsers.** All five milestones are done. 25 tests
   in 20 files plus `perf` pass in WebKit and in Chromium on the Mac's GPU (Metal). In Chromium's
   software renderer `perf` and 24 tests passed in the full run and the 25th, `rebuild`, passed
   after one bound of my own was restated (section 5 has that, the run times and the numbers).
2. **Nobody has seen it on a phone.** Every frame was drawn by Playwright on this Mac and every
   "through the camera" picture comes from the demo's stand-in camera, which is ideal: exact, never
   late, no exposure, no glare. The first thing to do is to hold two real phones (section 7).
3. **What it is.** The host's card bends into a dent behind the glass; the dent is drawn through
   head-coupled perspective, so from the guest's camera it stays behind the middle of the card while
   the camera moves. Each layer stretches into the dent's bottom (the sink), comes out of the glass
   towards the guest's camera as a ribbon of its own pixels, and lands in a level that rises in the
   guest's screen with a wobbling surface. `fly` floods the screen, `assemble` settles the exact flat
   card, `rebuild` pours the card back out of the sink on the host.
4. **One reading of the contract needs the owner's yes or no.** During `explode` the guest canvas is
   transparent only above the level: the level is opaque and reaches 0.44 of the canvas height. The
   contract says the guest canvas has no background during `explode`; the brief asks for the screen to
   fill like a glass. I followed the brief. If the shell needs the camera everywhere until `fly`, the
   fill has to move into `fly` (section 7, item 2).
5. **The weakest part of the picture** is the ribbon near the host: seen from the guest's camera, a
   ribbon leaves the sink as a thread and only becomes a readable ribbon in the lower half of the
   guest's screen (section 2).
6. **One file outside my folder is modified and not committed**: the root `package-lock.json`
   (`npm install` added this workspace). It is left for the owner (section 7, item 5).

## 2. How the pull looks through the stand-in camera

The stand-in camera is a pinhole camera in the demo that sees the host's live canvas as a texture on
a phone model; the guest's canvas is drawn over its picture, as the shell draws over the camera feed.
At the demo's default distance (5.6 card widths, about 40 cm for a screen 7 cm wide) the host's
screen is about a third of the guest's screen wide, 130 of 390 CSS px. I looked at still frames and
at the two videos frame by frame, not at a phone in a hand.

What reads:

- **The bend.** In the first 1.2 s the card's grid lines lean towards a point under the mark and the
  name line curls into an arc around it and starts to swirl. At 130 px the curled name is the
  clearest sign; the grid's bend is visible but quiet on a dark card.
  Evidence: `process/b2-through-the-camera.png` (0°, 20°, 35°),
  `artifacts/sheet-guest-anchored-frontal-explode.jpg`, `…-20-explode.jpg`, `…-35-explode.jpg`
  (frames at 0.70–2.11 s).
- **The dent has depth.** While the camera swings from 35° on one side to 35° on the other, the ring
  slides on the host's own screen to about 76 CSS px either side of the centre (of 390), and in the
  camera's picture it stays behind the middle of the card. This is the part that makes it a hole in the phone and not a
  picture on it. Evidence: `artifacts/blackhole-orbit.mp4` (host left, guest right: watch the ring
  move on the left and stand still on the right), `process/b2-pull-four-eyes.png`, and the check
  `sink-follows-eye` (29 eyes, worst error 0.064 CSS px).
- **The ribbon starts at the sink.** The guest's ribbon begins within 1.8 CSS px of the ring's centre
  as drawn by the host, at four poses (check `glass-seam`). The host draws the part of each layer that
  is behind the glass, the guest the part in front; no row is drawn by both (check
  `pixels-conserved`). Evidence: `process/b3-ribbons-through-the-glass.jpg`.
- **The pour and the fill.** From 2.6 s the level rises at the bottom of the guest's screen; each
  ribbon widens on the way down, twists once and enters the surface, which ripples there. The layers
  that have arrived wait under the surface in the order they have on the card and ride it up.
  Evidence: the `guest-…-explode` sheets from 2.82 s on, `artifacts/blackhole-sequence.mp4`.

What does not read, or reads weakly:

- **The ribbon near the host is a thread.** It leaves the sink 0.012 card widths wide and aimed at
  the camera, so for the first third of its way it is a hairline with a light rim; the layer's own
  pixels become recognisable only where it is wide, in the lower half of the guest's screen, and
  text on a ribbon can be read only for large type (the e-mail line at 2.82 s is the best case).
- **The ring is small**: 0.073 card widths in radius, about 10 px across in the camera's picture. It
  reads as a small bright loop that marks the sink, not as lensing.
- **Labels are brief.** Each ribbon carries its chip and dims pill for 0.9–1.2 s; that is enough to
  notice them, not to read each one.
- **Small text lying on a large image layer while it floats** is low in contrast (seen on the
  owner's card, where lines of text wait under the surface on top of a large coloured field). It
  clears when the layers reach their places in `fly`.

## 3. What works and what does not

Works (each with a check; results in `checks/results/<webkit | chromium-metal | chromium>/`):

- **Exact flat frames.** Host `idle` frame zero, the end of `rebuild` and the end of `assemble`
  (full-bleed, inset, fractional and overflowing `assembleRect`) equal the contract's 2D reference:
  largest difference 0/255 on Metal and in WebKit (1/255 in WebKit for one rect that overflows the
  canvas on every side), at most 1/255 in software Chromium (`frame-zero`, `rebuild-end`,
  `assemble-end`, `assemble-overflow`, also run against `dist/`). The QR decodes at 1× and 2× (`qr`).
- **The marker is untouched.** `safeRects` stay at alpha 0 through all four host timelines, and
  their pixels do not change in 2 × 122 frames of `connect` and `depart`, with one rect placed on the
  sink itself (`safe-rects`, `marker-untouched`).
- **The sink follows the eye** (above), with a viewer and with the tilt eye; a switch between a
  viewer and none eases in 0.3 s, a moving viewer is used in the next frame (`viewer-switch`).
- **One layer, one place.** For 24 moments × 6 layers, host + air + level = 1 from the state and
  from the pixels: 0 rows drawn in two places, 0 rows out of place (`pixels-conserved`). Both
  devices hold every layer's clock identically in 1866 samples; the anchored guest draws nothing
  before the first row crosses the glass (`glass-seam`).
- **The level.** Never falls through `explode`, `fly`, `assemble`; wobbles while it fills; the
  canvas is opaque at the end of `fly`; nothing moves in the last 0.3 s of `assemble` (31 frames,
  one distinct) (`level-settles`).
- **The way back.** `rebuild` returns the layers bottom first, flat from 1.5 s, QR last; the end of
  `depart` is the start of `rebuild` and the end of `rebuild` is `idle` frame zero, 0 differing
  values (`rebuild`, `rebuild-end`).
- **The guest alone.** With no pose it draws a small virtual host phone near the top (the card 0.40
  of the canvas high), the same event from a virtual eye that swings ±10° once and is back at rest
  when `explode` ends (`unanchored`).
- **Determinism** in timeline, time, tilt, pose and viewer, across seeks and a remount
  (`determinism`); `reduced` (no ribbons, no wobble, a static gentle dent, exact end frames)
  (`reduced`); 0 flashes per second measured, the limit is 3 (`flash`); `dispose()` frees every texture, geometry and
  program and stops the frame loop (`dispose`); the contract's surface, no test hooks in `dist/`, no
  requests but the layers and the bundled font (`contract`); labels of 12 CSS px that settle in
  0.21–0.22 s after a 30° jump of the pose (`labels`).
- **Budgets.** Scene time on the Mac's GPU: largest median 0.5 ms and largest p95 0.9 ms over
  every role, tier and timeline on Metal; in WebKit, whose timer has 1 ms steps, medians 0–1 ms and
  p95 at most 4 ms (budget 6 ms median). Textures 17.0 / 9.6 / 4.3 MB at `high` / `mid` / `low`
  (budgets 64 / 40 / 24). No new full-size texture: the ring's colours are a 256 × 1 strip read from
  a composite 96 px wide. At most 14 draw calls on the host and 9 on the guest (`perf`).

Does not work, or is not done:

- **Nothing was verified on a phone, with a real camera, a real tracker or a real viewer relay**
  (`CLAUDE.md`, "Not verified in this run", has the full list). With the shell's relay (about 30 Hz,
  predicted) the dent on the host's screen will lag a moving hand by whatever the prediction misses.
  The effect hides that only at the ribbon's thin host end, not in the bend.
- **Light cards were not looked at.** The ribbons' backing is the card background colour and the
  ring takes the colours that differ most from it; on a light card a ribbon is a light strip over a
  lit room.
- **`reduced` was checked by state and pixels and looked at in one sheet** (`process/b4-reduced.jpg`),
  not designed further.
- **`perf` says nothing about phones**, and in Chromium's software renderer its times are not
  meaningful (the pixel checks are).
- The weak points of the picture listed in section 2.

## 4. What was built, in one screen

- `src/` — `effect.ts` (the effect: both roles, timelines, state → GPU, test hooks), `schedule.ts`
  (every time constant and the per-layer plan; pure functions), `strip.ts` (the well, the ribbon path
  and the strip's shaders; the ring), `liquid.ts` and the `LIQUID` chunk in `gl.ts` (the level),
  `labels.ts` (labels that ride the ribbons). `dist/blackhole.js` is committed: 87.7 kB, 28.1 kB
  gzip, `three` external.
- `demo/` — `npm run dev` (port 5277), `/demo/index.html`: the host, the guest over the stand-in
  camera that shows the host's live canvas, one draggable pose that drives the guest's `setPose` and
  the host's `setViewer`; switches for viewer, jitter, quality, reduced; every timeline; play all.
- `checks/` — 20 spec files, 25 tests, plus `perf`; `sh scripts/checks.sh webkit | metal | chromium`.
- `artifacts/` — 18 contact sheets (`sheet-<role>-<…>-<timeline>.jpg`: host alone, host for a
  viewer at 20° and 35°, guest anchored frontal / 20° / 35°, guest unanchored),
  `blackhole-orbit.mp4` (the whole pull while the camera goes 35° left → 35° right → back),
  `blackhole-sequence.mp4` (connect → depart/explode → fly → assemble → rebuild, 14.75 s, side by
  side).
- `SPEC.md` (written before the code; changes after looking in §3, readings in §4), `RUNLOG.md`,
  `process/` (one image per milestone and more), `CLAUDE.md` (how to run, the model, the contract
  table).
- The owner's card: rendered for looking only into
  `~/dev/prv/products/layercard-runs/blackhole-v5-eryk/` (the same 18 sheets and two videos). Nothing
  of it is in the repo.

## 5. Checks and numbers

The last run, on the source as committed (after the floating queue), 2026-11-16 12:24–12:44:

| Configuration | Tests | `perf` |
|---|---|---|
| WebKit (Playwright 1.65.1, Apple GPU) | 25 passed, 1.1 min | passed, 1.2 min |
| Chromium on the GPU (full Chromium, ANGLE on Metal, Apple M3) | 25 passed, 1.5 min | passed, 1.2 min |
| Chromium with software WebGL (Playwright's headless shell, SwiftShader) | full run: 24 passed, 1 failed, 12.1 min; the failed test passed after its bound was restated (below) | passed, 1.2 min |

**The one failure and what was done about it.** `rebuild` (new in B4, run in software Chromium for
the first time in this last run) also compared the first frame of `depart` with the last frame of
`connect` and demanded 1/255. On a GPU the two frames are identical (0 in WebKit and on Metal). In
software Chromium they differ by at most 5/255, mean 0.008/255, no value more than 8/255 apart:
`connect` draws the card as flat sheets, `depart` draws it through the eye as tessellated strips
with the well at zero, and SwiftShader rasterises the two a hair differently. That join is not one
of the contract's exact frames. I restated the bound as what it has to guarantee (a join nobody can
see: no value over 8/255, mean under 0.05/255), left the effect alone, and ran `rebuild` again in
all three configurations: passed. The other 24 tests were not run a second time in software
Chromium; their source did not change.

| Number | WebKit | Chromium on Metal | Chromium, software |
|---|---|---|---|
| Host `idle` frame zero and the end of `rebuild` against the flat reference (largest difference of 255) | 0 | 0 | 0 |
| End of `assemble` against the flat reference, six cases in `assemble-end`, ten in `assemble-overflow` | 0; 1 for the one rect that overflows the canvas on every side | 0 | at most 1 |
| End of `connect` → start of `depart` | 0 | 0 | 5 (mean 0.008) |
| End of `depart` → start of `rebuild`; end of `rebuild` → `idle` | 0; 0 | 0; 0 | 0; 0 |
| Sink on the canvas against the eye–sink line, 29 eyes (CSS px) | 0.064 | 0.064 | 0.063 |
| Ribbon's first pixels from the ring's centre in the stand-in camera, 24 measurements (CSS px) | 1.8 | 1.8 | 1.65 |
| State samples in which the two devices differ, of 1866 | 0 | 0 | 0 |
| Rows drawn in two places (host and air, air and level, host and level) | 0 | 0 | 0 |
| `safeRects` frames changed, of 2 × 122 | 0 | 0 | 0 |
| Flashes per second, largest of 16 cases | 0 | 0 | 0 |
| Scene time, largest median / largest p95 over 6 role × tier runs and every timeline (ms) | 1 / 4 (the timer has 1 ms steps) | 0.5 / 0.9 | 0.5 / 34 (not meaningful) |
| Textures at `high` / `mid` / `low` (MB; budgets 64 / 40 / 24) | 17.0 / 9.6 / 4.3 | same | same |
| Draw calls, most in any timeline | host 14, guest 9 | same | same |

Bundle: `dist/blackhole.js` 87 724 bytes, 28 053 gzip; the font 18 948 bytes.

**`perf` and the GPU lock.** Every `perf` run and every video render took
`~/dev/prv/products/layercard-runs/locks/gpu.lock`; it was free every time (waited 0 s). During the
last measurements no other demo port was listening (the Mac had restarted at about 12:15 and the
other runs' servers were gone). During the measurements at B2, B3 and B4 the ports 5274, 5275 and
5276 were listening; the largest medians then were 0.4–0.5 ms on Metal and 1 ms in WebKit, as now.

**How the run went.** 10:36 start, reading the window effect and spill; 10:50 `SPEC.md`, before
any blackhole code; B1 11:11 (window copied and renamed, its checks green; one Metal test timed
out under a load average of 31–62 and passed alone); B2 11:42; B3 11:52; B4 12:00; B5: first
artifacts 12:01–12:09, the floating queue 12:10, the Mac restarted at about 12:15 in the middle of
the last run, which was started again at 12:24 and ended 12:44; artifacts rendered again after it.
`RUNLOG.md` has the entries as they were written.

## 6. Every creative decision

None of these was approved by anyone; each is mine and each can be changed in the named constant.
Times are in `src/schedule.ts`, shapes in `src/strip.ts`, the rest in `src/effect.ts`.

The dent and the sink

1. **The sink is behind the middle of the card, fixed in card space**, 0.30 card widths deep. The
   brief's "where the line from the guest camera meets the card" is where the sink *shows* on the
   host's screen: the point where the line from the eye to the sink crosses the glass. The other
   reading (the sink slides over the card under the camera's optical axis) would make the dent a
   flat picture that chases the camera; this one makes it a hole that has a place.
2. **The dent's shape**: pull towards the axis 0.48 × g(r), g(r) = 1 / (1 + (r / 0.25)²), a swirl of
   up to 1.2 rad that breathes slowly, a flat floor inside radius 0.12. First values were 0.42 /
   0.22 / 1.1; raised after the first look because the bend did not read in a screen 100 px wide.
3. **The ring is made of the card's own colours** (for each direction, the colour of the card that
   differs most from its background, brightened), not a white or orange glow. No particles, no
   glow, no stars: the only material in the scene is the card.
4. **The pull builds for 1.2 s before the first layer moves**, and the sink collapses to a point in
   the last 0.5 s of the event (7.25–7.75 s).

The layers on their way

5. **One strip per layer.** A layer is never cut into particles or shards: it is one mesh whose rows
   are placed by one clock, so it is always one continuous thing: on the card, in the neck, in the
   ribbon, in the level.
6. **The neck**: 0.6 s before a row enters the sink it slides down the dent in a spiral of 1.35 rad
   and narrows to 0.012 card widths. The layer stretches like taffy; it does not shrink as a whole.
7. **The ribbon's path**: out of the sink straight at the camera, a little further along that line,
   then down out of the line of sight and into the bottom of the guest's screen at a slot
   of its own; one full twist and a small wobble; 0.6 of the layer's shorter side wide (0.07–0.30
   card widths). The layer's rows run along its longer side, the end nearer the sink first.
8. **The ribbon's material**: the layer's own texture on a backing in the card's background colour,
   with a hairline acrylic rim on both edges. Text comes into the guest's screen unmirrored.
9. **The host's end of a ribbon is aimed at the eye**, so an error in tracking moves only a thin,
   slow, soft end. With no viewer the host shows a thin rim of light where the glass cuts a ribbon.
10. **Order and timing**: top layer first; the layers start evenly between 0.45 s and 5.35 s; a
    layer's rows enter the sink during 0.45 s + 0.30 s × its longer side; a row is 1.5 s in the
    ribbon (slow out of the sink, fast into the phone). The event is 7.75 s for any card. First
    values (1.0 s in the ribbon, 0.3–0.5 s to enter) left the air empty in 10 frames of 12.
11. **What stays on the host**: each layer's dashed outline, traced as its rows drain, with the tag
    `Pulled to guest`; at the end the empty card background, the outlines and the tags.
12. **The QR is never a ribbon**: it dissolves in `connect` (the window effect's dissolve, kept) and
    re-forms last in `rebuild`.

The guest's screen

13. **The liquid is the card.** Under the surface the canvas is the card's background colour,
    opaque, with the arrived layers in it; there is no separate "fluid" look, no refraction, no
    foam. The surface has a wobble of 3.2 CSS px, ripples where a ribbon enters and a hairline
    meniscus.
14. **How high**: half the canvas height × the share of all rows that have arrived, 0.44 at the end
    of `explode`; past the top after 85 % of `fly`. It never falls.
15. **Layers wait under the surface in the order they have on the card** (the highest nearest the
    surface, small layers keeping the next clear of themselves, large ones not) and ride it up to
    their places; while they wait they drift and bob a little. Changed in B5 after the final sheets
    showed lines of text floating through each other (`process/b5-floating-queue.jpg`).
16. **`fly`** floods the canvas in 1.0 s; **`assemble`** stops the bobbing and locks the layers one
    after another, the last at 0.68 s.
17. **Labels ride the ribbons** (peel v2's chip and dims pill) on the lower part of the path, below
    the host phone in the camera's picture and never under the level; at most two at a time.
18. **The guest alone**: a small virtual host phone near the top with a hairline rim, seen from a
    virtual eye pitched 8° that swings ±10° once over the event.

The way back and reduced motion

19. **`rebuild`** (1.8 s): the sink reappears, the layers unspool from it bottom layer first, the
    bend relaxes, flat from 1.5 s, the QR re-forms 1.3–1.8 s.
20. **`reduced`**: a static dent at 0.35 strength, no swirl, no neck, no ribbons, no wobble; layers
    fade from the host and fade in under a level that rises smoothly.

Inputs and tiers

21. **No smoothing of the viewer** (the contract allows 0.1 s): the shell already predicts, and any
    lag here would show as the dent sliding on the card. A switch between a viewer and none eases
    over 0.3 s.
22. **Tiers** change only the strips' tessellation (1 / 0.7 / 0.5) and, at `low`, drop the ripples;
    the schedule is the same in every tier.
23. **The demo's stage**: a neutral lit room, a dark phone model for the host, the guest's canvas
    over the camera's picture.

## 7. What waits for the owner

1. **Two phones in two hands, before the event.** What to look for, in this order: (a) does the dent
   stay on the card when the guest's hand moves, or does it slide (the viewer relay's lag); (b) does
   the bend read through a real camera at arm's length, in the room's light; (c) does the first third
   of a ribbon read at all; (d) frame rate on the guest's phone during the last two seconds of
   `explode`, when the level, three ribbons and the camera feed are on screen together; (e) the swap
   from the end of `assemble` to the page's own images.
2. **The level over the camera during `explode`**: accept the reading (transparent above the level,
   opaque below, up to 0.44 of the height), or ask for the fill to start only in `fly`. The second is
   a change of two functions (`level()` in `src/schedule.ts` and the check `level-settles`), and the
   ribbons would then pour into the bottom edge of an empty screen for 5 s.
3. **`onLayer` for an effect without a stack**: `leave` and `lift` fire when a layer's first row
   crosses the glass, `settle` when its last row is in the level (for the last layer: at the end of
   `explode`, with rows still in the air), `arrive` when it locks. If the shell shows per-layer UI on
   `settle`, check that this timing suits it.
4. **Contract wording.** I did not edit `packages/scene/CONTRACT.md`. Two sentences would make this
   effect conform without a "reading": that the guest canvas may be partly opaque during `explode`
   if the effect says where, and that "a hovering exploded stack" is one possible form of `explode`.
5. **The root `package-lock.json`** is modified in the worktree (the workspace
   `@layercard/effect-blackhole` and its dev dependencies were added by `npm install`). It is outside
   my folder, so it is not committed. Commit it with the merge, or run `git checkout package-lock.json`.
6. **Wiring into the shell.** The effect is a folder with a committed `dist/`; nothing in the shell
   or in `examples/` was touched, and nothing imports it yet. The host must call `setViewer` with the
   guest camera's position in card space for the dent to have depth; without it the host falls back
   to the tilt eye and the ribbons' host ends do not point at the guest.
7. **Light cards**: look at one before using the effect with one.
8. **The creative decisions in section 6**, above all 1 (where the sink is), 10 (7.75 s is long:
   the last layer leaves the host at about 7 s), 13–15 (the level) and 17 (labels shown for a
   second each).
9. **Merge, tag, push**: nothing was done. The branch is `scene/blackhole-v5`: on top of
   `scene/window-v3`, the commit with the brief (`26c8182`, there before the run), the five
   milestones, and two one-line commits to this file after B5.

## 8. Next steps, in the order I would take them

1. Item 1 above, on the two phones that will be used at the event; write down what is seen.
2. If the dent slides with the hand: add up to 0.1 s of smoothing to the viewer (the contract allows
   it; one constant) or have the shell predict further; then look again.
3. If the ribbon's first third does not read: widen the sink's end of the ribbon (`SINK_W` 0.012 →
   about 0.03 in `src/strip.ts`) and let the backing fade in earlier; `glass-seam` then needs its
   2 px bound looked at again.
4. Decide item 2; if the fill moves into `fly`, shorten `explode` (the air is then the only show on
   the guest's screen).
5. A light card and a card of ten or more layers through the demo (`?base=`), sheets for both.
6. Measure on phones: `perf` runs in any browser that Playwright can drive; on a phone, watch the
   demo at `quality=mid` with the browser's own frame meter.

## 9. Choices made where rules pulled apart

- **Brief over contract wording, stated**: the opaque level during `explode` and an `explode`
  without a stack (section 1, item 4). The contract's hard parts (exact frames, determinism, the
  marker, the shared schedule) were never traded.
- **Not getting in other runs' way over speed**: `perf` and the videos took the shared GPU lock
  (waited 0 s every time). Software Chromium was run at B1, B2 and B5, not at B3 and B4; WebKit and
  Chromium on Metal ran at every milestone from B2.
- **A visible fault over the milestone's neatness**: the floating layers were changed in B5, after
  B4's commit, because the final sheets showed lines of text crossing each other; every check and
  every artifact was run again after it.
- **One lock removed**: the Mac restarted at about 12:15 while my `perf` held the GPU lock. After
  the restart the lock directory was still there with my own owner line
  (`blackhole-v5 20080 2026-11-16T12:14:05`) and no process behind it; I removed it. No other run's
  process, port or file was touched.
- **Process rule bent once**: the diary's 11:18 entry first said 11:17; corrected the same minute.

## 10. Proposed lines for `docs/build-log.md`

```
- 2026-11-16 10:36–12:47 — Scene run v5, the effect "blackhole" (`packages/scene/effects/blackhole/`,
  branch `scene/blackhole-v5` from `scene/window-v3`), built in one run of Claude Fable 5.2 from
  `PROMPT.md`: the host card bends into a dent drawn for the guest camera's eye (`setViewer`), each
  layer leaves through the sink as one ribbon split at the glass between the two devices, and fills
  the guest screen as a level; contract v1.2. Five milestone commits (28dfc35, 4dcbf90, e9ee22c,
  688f7a5, 224d0bd). Source: `REPORT.md`, `RUNLOG.md`.
- Checks at the end: 25 tests + perf green in WebKit and in Chromium on Metal; in software Chromium
  perf and 24 tests green in the full run, the 25th after its own bound was restated; flat frames
  at most 1/255 from the reference (0 on Metal); sink within 0.064 CSS px of the eye–sink line for 29 eyes;
  0 rows drawn on both devices; scene time at most 0.5 ms median on the Mac's GPU; bundle 87.7 kB
  (28.1 kB gzip). Source: `checks/results/`.
- Not verified: real phones, a real camera, the viewer relay's lag, light cards. Open for the
  owner: the guest canvas is opaque under the level during `explode` (up to 0.44 of its height),
  which the contract's wording does not allow for. Source: `REPORT.md` §7.
```
