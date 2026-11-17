# REPORT — peel v1

2026-11-15, branch `scene/peel-v1`, not pushed. Written for a reader who saw none of the work.
Numbers come from `checks/results/*.json`, produced natively on the Mac (Apple M3) unless stated.

## In short

- **The effect exists and implements contract v1 unchanged.** `dist/peel.js` (60,043 bytes, 19,618
  gzip) exports `supported`, `durations`, `mount`. Eryk confirmed at 17:12 that the shell runs the
  full host → guest → card flow against it.
- **All 16 checks pass on the Mac** (`npm run check`, 6.0 min). The flat frames are exact: host idle
  frame zero differs from a 2D-canvas composite in 0 values, the rebuild end frame in 0, the assemble
  end frame by at most 1/255 in a handful of values.
- **Look first at** `artifacts/peel-sequence.mp4` (12.8 s, host and guest side by side), then the
  twelve contact sheets in `artifacts/`, then `npm run dev` → `http://127.0.0.1:5273/demo/`.
- **Not verified:** anything on a real phone (frame times, tracking, Safari). Everything anchored
  was driven by synthetic poses, plus the one real frame Eryk reported.
- **Yours to judge:** the taste decisions listed below; I recorded them, I did not approve them.

## What works, with evidence

| What | Evidence | Result |
|---|---|---|
| Host idle frame zero = flat composite | `frame-zero.json`, `frame-zero-dist.json` | 0 differing values (source build and `dist/peel.js`) |
| Tilt parallax, QR bound, breath | `frame-zero.json` | layers 0 / 2 / 4 / 6 / 8 / 10 CSS px at full tilt, QR 4 px, breath peak 1.5 px, scale always 1 |
| QR scans in idle | `qr-1x.json`, `qr-2x.json` | decoded in 7 of 7 frames at both scales (jsQR) |
| Connect touches only the QR | `frame-zero.json` | 0 changed pixels outside the QR area, 12,686 inside (t = 0.4 s) |
| `safeRects` never drawn over | `safe-rects.json` | alpha 0 in all rect pixels, 100 frames, four host timelines |
| Depart leaves outlines, rebuild returns to idle | `rebuild-end.json`, `rebuild-end-dist.json`, sheets | rebuild end = idle frame zero, 0 differing values |
| Exploded stack geometry | `chrome.json` (state asserts) | sheet tops at 0.092 + 0.11·j, stair 0.035 card heights, no rotation |
| Unanchored fit | `chrome.json` | 28.7° off the normal; stack and label blocks exactly inside the 8 % margins |
| Selection chrome | `chrome.json` | 6 labels in each of 12 views, text 12 CSS px, rows 1.4 block heights apart, 0 overlapping blocks, all blocks inside the 8 % margins; 0 leader crossings in 9 views (see limits) |
| Fly ends opaque, assemble = flat composite | `assemble-end.json`, `assemble-end-dist.json` | alpha 255 everywhere; mean ≤ 2.3e-6 / 255, max 1 (three rects, anchored and not) |
| Determinism | `determinism.json` | 3 cases × 8 frames: identical hashes after shuffled seeks and after a remount |
| Dispose | `dispose.json` | textures 7 → 0, geometries 11–12 → 0, programs 6 → 0, 0 animation frames after dispose, remount on the same canvas renders correctly |
| Reduced motion | `reduced.json` | 0 moved, scaled or acrylic sheets on the host; guest: 0 drift, 0 overshoot, frame never moves, end frame still exact |
| Flashes | `flash.json` | 0 per second in all 16 series (limit 3) |
| Performance on a laptop GPU | `perf.json` (ANGLE Metal, Apple M3, DPR 2) | scene cost per frame: median 0.2–0.4 ms, p95 ≤ 0.8 ms (budget 6 ms), single worst frame 16.1 ms (host, low, idle); frame interval median 16.7 ms, p95 16.8 ms in every role, tier and timeline |
| Texture memory | `perf.json` | host 17.0 / 9.6 / 4.3 MB, guest 11.6 / 6.6 / 2.9 MB for high / mid / low (budgets 64 / 40 / 24) |
| Bundle, font | `perf.json`, `contract.json` | 19,618 bytes gzip (budget 120 KB); font 18,948 bytes (budget 40 KB), OFL licence beside it |
| Requests | `contract.json` | mounting requests the 7 layer files and the font, nothing else |
| Test hooks | `contract.json` | absent without `test: true` and absent from `dist/peel.js` |

`perf-swiftshader.json` is the same performance check on software GL (Playwright's default headless
shell); it is kept as a record and is not a performance statement.

## What does not work, and known limits

1. **No real-phone numbers.** "mid holds 60 fps on an iPhone 12-class phone" is unverified. On the
   M3 the scene costs 0.4 ms; that says nothing certain about a phone with camera and tracker running.
2. **Near head-on, the three text strips crowd each other.** With the specified stair (0.035 card
   heights per step) the name, role and contact strips of this card land on top of each other when
   seen along the normal; their frames, handles and measurement lines overlap
   (`artifacts/sheet-guest-anchored-frontal-explode.png`). Off-axis it opens up. I kept the specified
   geometry.
3. **Leaders can cross when the stack is partly outside the screen.** In three synthetic views
   (stack cut by the left edge, right edge, top-left corner) one side sits beside the stack and the
   other in rows, and 1–2 leaders cross. Blocks still do not overlap and stay inside the margins.
   In the nine views with the stack on screen there are no crossings.
4. **A layer is visible twice for up to 0.9 s** in the anchored view: leaving on the host screen
   (sliding right) and rising in the air. Seen in the stand-in camera; to be judged on real phones.
5. **Labels follow the pose rigidly.** There is no smoothing; if tracking jitters, labels jitter,
   and a row swap is a jump. Smoothing would need frame history, which the determinism rule excludes
   unless the contract allows it.
6. **Viewed from behind, the stack is drawn in the wrong order** (painter's order assumes the
   camera in front of the card). Not reachable in the intended use.
7. **Only Chromium was tested.** Pixel exactness depends on the browser's 2D canvas; it is by
   construction "the same call at the same place", but it was measured only in Chromium 153 and 159.
8. **More than four `safeRects`** are merged into the fourth as a bounding box.
9. **One decoder flake, explained.** jsQR failed on one 2x frame when given the whole lower third of
   the screen; OpenCV read the same frame, and jsQR reads all frames when the image is cropped to
   the code as a scanner's finder would. The check uses the crop.

## Waiting for Eryk

1. **Taste** — every item under "Creative decisions" is reversible; the first three change the
   look most.
2. **Real phones** — run `mid` on an iPhone 12-class device with camera and tracker on; watch the
   1.5 px frames against tracking jitter and the doubled layer (limit 4).
3. **History** — `ef77d72` contains eight files of the stopped parallel run, including a 5.6 MB font
   archive (`artifacts/tmp/font-src/JetBrainsMono-2.304.zip`, OFL). They were removed in `c81193b`
   but stay in history, as you asked. If the repo goes public you may want to squash this branch.
4. **`docs/build-log.md`** — the rule says public numbers go there; `docs/` is not this run's folder,
   so the lines are proposed at the end of this report instead of written.
5. **Contract proposals** below — none is needed for the effect to work.

## Creative decisions made on your behalf

1. **Sheets are the size of their layer, not of the card.** The mark is a square slab, the text
   lines are thin bars. It makes the stack read as real layers; it also causes limit 2.
2. **On the host every sheet leaves through the right edge** (and returns from it). The tag says
   "Layer moved →"; one direction keeps tag and motion consistent. Alternating edges was considered.
3. **The dims sit in a red pill under the label chip, not on the measurement line.** On a 390 px
   screen the card is about 90 px wide in the camera image; "margin 135 · gutter 30" is 142 px wide
   at 12 px. The red measurement line with end ticks runs along the bottom edge of each sheet.
4. **Callouts go above and below the stack when they do not fit beside it** — which is always the
   case on a phone in portrait. Leader = stub to a rail, drop to a gate, then straight to the
   sheet corner. Sides still alternate by layer index.
5. **Font: Iosevka Medium** (OFL), 0.5 em advance. A 0.6 em mono would make the 18-character labels
   142 px wide instead of 118 px. Subset: Latin with Polish, Greek, basic Cyrillic, arrows — 794 glyphs.
6. **Handles are solid selection-blue squares, 5 CSS px** (the palette assigns handles to that blue).
7. **The print casts a small shadow inside its own slab** (30 % of the shadow colour, offset by the
   slab thickness). Without it white text on clear acrylic disappears over a bright room until the
   dark background sheet arrives. Not in the brief; off in the `low` tier.
8. **Coincident outlines are inset 4 px each** (background and grid share a rect); their tags stack.
9. **Schedule for other layer counts:** the gap between layers is `clamp(3.0/(n−1), 0.4, 0.75)` s so
   the shared timeline stays 6.1 s for 5–8 flying layers (0.6 s for the example, as specified).
10. **Unanchored pose:** pitch 17°, yaw 24° (seen from above-right), distance solved so stack and
    labels fill the screen up to the 8 % margins.
11. **Fly ends in a face-on "deck"**: 1.12× the final size, 28 % of the exploded spacing; assemble
    drops the sheets bottom-first with a 4 % overshoot.
12. **Shadows:** a sheet's shadow lands on the nearest lower sheet that contains its rect, else on
    the glass; in the unanchored view there is no glass, so no glass shadow.
13. **Idle shadow model:** the shadow stays 60 % of the way back to the layer's rest position, so it
    is revealed as the layer slides; strength grows with the offset and is exactly 0 at rest.
14. **Parallax carries through `connect`**, fades out in the first 0.2 s of `depart` and back in during
    the last 0.3 s of `rebuild`, so no timeline change jumps when the phone is tilted.
15. **Reduced motion on the guest:** `fly` cross-fades (stack out, background in) without moving
    the frame; `assemble` fades the flat layers in bottom-first.
16. **Initial state:** a host shows `idle` from mount; a guest shows nothing until `play`.
17. **Starting a timeline while another runs** resolves the earlier `play()` promise silently.

## Rule conflicts and how each was settled

- **Texture caps vs flat-frame fidelity.** A canvas whose fitted card exceeds the tier's texture cap
  gets a lower pixel ratio instead of a smaller texture, so the flat frame stays 1:1. Fidelity won;
  resolution is what the tier gives up.
- **"No DOM beyond the given canvas" vs the prescribed `FontFace` and a 2D bake.** Detached canvases,
  `Image` elements and `document.fonts` are used; nothing is attached to the document.
- **"Labels beside the stack, leaders never crossing, 12 px text" on a 390 px screen.** They cannot
  all hold beside the stack; blocks moved above and below it (decision 4).
- **"Measurement lines carrying the dims" vs label legibility.** Legibility won (decision 3).
- **"Layer i starts at 0.2 + i × 0.6" vs "total 6.0–6.5 s" for other layer counts.** The total won
  (decision 9); cross-device timing is unaffected because both roles use the same plan.
- **Public numbers go to `docs/build-log.md` vs "everything outside the folder is not yours".**
  The folder rule won; lines are proposed below.
- **Process rules.** The first screenshot came at about step 12, not 10. M1 and M2, and M3 and M4,
  were written together because they share schedule and state; each got its own commit with its
  evidence. `RUNLOG.md` times before 16:54 were reconstructed from timestamps; the first committed
  version (`ef77d72`) had estimated times — corrected in `c81193b`, and since then taken from `date`.

## Contract: assumptions made, changes proposed

Implemented against v1 as written. Proposals for a v1.1, in order of usefulness:

1. **State the camera convention for `setPose`.** Assumed: OpenGL-style camera space (camera at the
   origin, looking down −Z, +Y up), metres irrelevant, card width = 1.
2. **Define the flat reference.** "Card fitted contain, centred, no rounding, into the canvas (host)
   or `assembleRect` (guest); each layer drawn with `drawImage`, smoothing quality `high`, at its
   absolute position." The shell needs exactly this to swap in a static image without a jump —
   including the absolute position: Chrome's `drawImage` is not invariant under whole-pixel
   translation when edges fall on thirds of a pixel.
3. **Bound `safeRects`** (at most four) or accept the bounding-box merge.
4. **Say whether an effect may smooth label positions over time** (limit 5).
5. **`setProjection` aspect.** If it differs from the canvas aspect the effect corrects the card's
   proportions during `fly`; say that the shell passes the aspect of the canvas.
6. **`onLayer` phases.** Used as: host `depart` → `leave` at the start of each lift; guest `explode`
   → `lift` at the start, `settle` 1.25 s later; guest `assemble` and host `rebuild` → `arrive`.

## Additions beyond the brief

All inside this folder: four extra checks (`contract`, `safe-rects`, `chrome`, `qr`); the print's
inner shadow (decision 7); a warm-up frame at mount (removed a 526 ms stall on the first shadow);
the demo's stand-in camera (`demo/camera.ts`); two extra contact sheets (frontal and 35° off-axis);
helper scripts (`look`, `eval`, `sync`, `subset-font.py`).

## Touched outside the folder

- Root `package-lock.json`: this workspace's dependencies (`three` 0.187.0, `vite` 7.3.8,
  `typescript` 5.9.3, `@playwright/test` 1.65.1, `@types/three`, `@types/node`, `jsqr` 1.4.0) and
  their trees; `lightningcss` stayed in the lock as an optional peer of Vite.
- Root `node_modules/`: installed natively; my first install pruned 21 packages that the parallel
  run had installed (Vite 8 / TypeScript 7 toolchain).
- Process 77064 (the parallel run) stopped on your decision at 16:46.
- No browser was downloaded; nothing else outside the repo was changed. On your request of 16:02,
  notes and images for the article were written to the vault
  (`hretheum-karta/Dziennik do artykułu — scena peel.md`, `materialy/`).

## The parallel run, in four lines

From 16:14 to 16:46 a second unattended run of this brief wrote into the same folder. We overwrote
each other's files; `ef77d72` swept in eight of its files. On your decision it was stopped, its
files were removed in `c81193b` (five untracked ones deleted from disk), history was left alone.
Details and the exact file lists are in `RUNLOG.md`.

## What I would do next

1. Measure on two real phones (frame times per tier through the test hooks, then by eye).
2. Decide limit 2 with you: keep the stair, or let small sheets spread along X as well.
3. Give the host's leaving sheet a shorter path when a guest is anchored (limit 4).
4. Add WebKit to the checks once the shell targets iOS Safari for sure.
5. If the contract allows history: ease label blocks between rows.

## Proposed lines for `docs/build-log.md`

```
- 16:32 — peel: Chrome's drawImage is not invariant under whole-pixel translation when edges fall on
  thirds of a pixel (same layer at x = 0.33 vs 128.33: up to 15/255; vs 256.33: 21/255). Source:
  packages/scene/effects/peel/RUNLOG.md, measured in Chrome for Testing 153.
- 17:42 — peel: 16 checks pass natively (6.0 min). Frame zero vs 2D composite: 0 differing values;
  assemble end: max 1/255; rebuild end: 0. Source: packages/scene/effects/peel/checks/results/.
- 17:43 — peel: scene cost per frame on Apple M3 (ANGLE Metal, 390 × 844 at DPR 2): median 0.2–0.4 ms,
  p95 ≤ 0.8 ms; texture memory 17.0 MB host / 11.6 MB guest at high. Source: checks/results/perf.json.
- 17:46 — peel: bundle 60,043 bytes (19,618 gzip) without three; font subset 18,948 bytes (Iosevka
  Medium, OFL, 794 glyphs). Source: checks/results/perf.json, assets/.
```
