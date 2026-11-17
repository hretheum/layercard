# window v3 — REPORT

2026-11-16, branch `scene/window-v3`, worktree `layercard-scene-v3`. Nothing was pushed, merged,
rebased or tagged; peel, its branches, tags and worktrees were not touched. Five milestone commits
on top of `7380c5e`: W1 `391fde8`, W2 `1b1268f`, W3 `cd1b630`, W4 `721d14b`, W5 (this report).
`RUNLOG.md` has the times; `process/README.md` has one captioned image per milestone.

## 1. State

All five milestones are done. Every check is green in Playwright WebKit, in Chromium with software
GL, and in Chromium on the Mac's GPU (Metal). Final run, 01:28–01:46: 28 passed in WebKit
(4.0 min), 28 in Chromium software GL (8.8 min), 28 on Metal (5.2 min). Of the 28, 21 are peel
v2's (five of them adapted to the window), 7 are new: `window-truth`, `glass-seam` (two),
`viewer-switch`, `exposure`, `unanchored`, `rebuild`. Peel's `lift-handoff` (two) was removed.

The one thing to know before anything else: **nothing here was seen on a phone or through a real
camera.** The shell does not relay the viewer yet, so the only place the effect exists as intended
is the demo's stand-in camera — a 3D scene with a phone whose screen is the live host canvas, seen
from the pose the guest is given. Everything below about "how it looks through the camera" is a
judgement from that stand-in, from still frames and two films.

One file outside the folder was changed and is **not** committed: `npm install` at the repo root
wrote the new workspace into the root `package-lock.json` (§9).

## 2. What was built, in plain words

Everything lives in one space: the card is 1 wide, the glass of the host phone is the plane z = 0,
and behind it is a box with the card's cross-section, 3 card widths deep — the cavity.

- **The host draws what is behind the glass.** Its camera is not a normal camera: it is a pyramid
  whose tip is an eye in front of the phone and whose base is the card's rect on the screen. So the
  flat picture on the screen is exactly what a real box behind the glass would show *that eye*.
  The eye is the guest's camera (`setViewer`, contract v1.2), used in the next frame as given. With
  no guest the eye is a point 6 card widths in front of the screen that tilt moves up to 25°. A
  switch between the two takes 0.3 s.
- **The anchored guest draws what is in front of the glass**, over its camera image, and nothing
  else: no cavity, no shadow on the glass, no overlay over the host's screen.
- **One test decides who draws a fragment**: the sign of its z. It is the same shader code on both
  phones, fed by the same clock, so a sheet that is crossing the glass is cut along one line.
- **The guest with no pose draws both sides itself**: the window as a card-sized opening, the
  cavity behind it, from a virtual eye that swings 12° either way.

The event (host `depart` = guest `explode`, 7.75 s for any card):

| When | What |
|---|---|
| 0–1.2 s | The glass opens: the whole card recedes as one stack to 0.6 card widths. The walls appear: card background, the card's own edge extruded into depth (the column grid runs along floor and ceiling), a ruler line every 100 design px, a stronger one every 500 with a numeral. |
| 1.2–2.4 s | Exploded inside: the background sheet goes to the back wall, the others hang near the glass, 0.25 behind it and 0.2 apart. They become acrylic slabs and cast soft shadows on the walls. |
| 2.4–6.0 s | Out through the glass, top layer first. Each exit: 0.5 s approach, 0.25 s crossing, 0.35 s to its place in peel's stack with one soft spring. The sheet is tipped during the crossing so the glass cuts it along a line that sweeps across it. An outline of the layer is traced on the back wall as it leaves. |
| 6.0–7.75 s | The last sheet's chrome, then a 1.2 s hold. The host shows the empty cavity with the lit back panel and the outlines; the guest has the full stack with peel v2's labels. |

`connect` (0.8 s), `fly` (1.2 s) and `assemble` (1.0 s) are peel v2's. `rebuild` (1.8 s): the layers
come back in through the glass, bottom layer first, slide into the room, gather, come to the glass
and flatten at 1.5 s; the QR re-forms last. `reduced`: nothing travels — the card fades to the
fanned-out state, each exit is a fade out on the host and a fade in on the guest, the tilt eye
stays frontal; a real viewer still moves the perspective.

## 3. How it looks through the stand-in camera

Evidence: `artifacts/window-orbit.mp4` (the camera goes from 35° left to 35° right and back while
the layers hang inside), `process/w5-orbit.png` (seven frames of it), `process/w2-window.png`,
`process/w3-through-the-glass.png`, `artifacts/window-sequence.mp4`, the sheets
`artifacts/sheet-guest-anchored-*.png`.

- **It reads as a hole.** In the orbit the walls sweep with the camera, the hanging layers slide
  against each other and against the far background sheet, and the near edge of the phone cuts
  them off the way a window frame would. At 35° the side wall fills most of the screen and the two
  or three nearest layers are still seen, each offset from the next. This is the strongest thing
  in the effect.
- **Frontally it is weaker.** The walls are a thin border and depth is told only by size: the
  background sheet is two thirds as large as the opening, the layers in front of it a little
  smaller than life. It reads as layers at different distances, less as a room.
- **It is a dark room.** The example and the owner's card are nearly black, the walls are that
  colour times at most 2, so through a camera the cavity is a dark box whose structure comes from
  the bright content and the slab edges, not from the walls. Nothing is darker than the card
  background (measured), but the rulers are faint at 100 px across and the numerals cannot be read
  there (they are readable on the host's own screen). The lit back panel only shows once the
  background sheet has left.
- **The crossing.** In `process/w3-through-the-glass.png` (2.92–3.10 s) the sheet is one object in
  two halves. The half still inside is dimmer and softer — it is a screen seen by a camera — the
  half outside is sharp with a bright acrylic edge. The cut reads as a change of sharpness, not as
  a gap or a step; measured gap at most 0.73 px.
- **From the guest's own camera the end is the stack**, and the stack's background sheet covers
  the host's screen from most angles. The "empty lit cavity with the outlines" is what the host's
  owner sees, and what the guest sees past the stack from the side.
- **Alone** (`artifacts/sheet-guest-unanchored-explode.png`, `process/w4-alone-and-back.png`): a
  card-sized window hangs in the camera image with the room behind it and swings slowly; it reads
  as deep without a host phone. There is no phone body around the opening — only a hairline — so
  it is a portal in the air, which is what the brief asked for but worth a look. After the event
  it stands still.

## 4. Numbers

All from `checks/results/{webkit,chromium,chromium-metal}/`, final run. "px" is CSS px.

| What | WebKit | Chromium, software GL | Chromium on Metal |
|---|---|---|---|
| Checks passed (final run) | 28 of 28 | 28 of 28 | 28 of 28 |
| `window-truth`: eyes (frontal, ±20°, ±35° on both axes and two diagonals; 4.5–9 card widths) | 19 | 19 | 19 |
| … points the host drew against the real box, on the host screen (px) | 0.000019 | 0.000019 | 0.000019 |
| … the same points in the camera (px) | 0.000011 | 0.000011 | 0.000011 |
| … camera image against the direct 3D render, largest shift (px) | 0.24 | 0.27 | 0.24 |
| … quarters of the window that could be placed / largest shift (px) | 54 of 76 / 0.36 | 54 of 76 / 0.37 | 54 of 76 / 0.36 |
| `glass-seam`: crossing of each layer (ms) | 260–280 | 260–280 | 260–280 |
| … samples (1551 × 6 layers) with a layer whole on both phones / on neither / on the wrong side | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 |
| … guest edge against the cut (px, 200 scans) | 0.74 | 0.75 | 0.75 |
| … host edge against the cut, on its screen / in the camera (px) | 0.33 / 0.40 | 0.33 / 0.38 | 0.33 / 0.40 |
| … largest gap between the halves in the camera (px) | 0.72 | 0.73 | 0.72 |
| … guest pixels behind the cut / drawn before any crossing | 0 / 0 | 0 / 0 | 0 / 0 |
| … near-white pixels on the host during a crossing, no viewer / viewer (the rim of light) | 859 / 732 | 843 / 498 | 844 / 732 |
| `exposure`: darkest pixel / card background (linear luminance) | 0.00592 / 0.00592 | 0.00592 / 0.00592 | 0.00592 / 0.00592 |
| … pixels darker than the background (6 eyes × 11 moments of the event) | 0 | 0 | 0 |
| … back panel / background | 31.7 × | 31.7 × | 31.7 × |
| `viewer-switch`: settled after (ms, viewer on / off; clock stepped by 16 ms) | 320 / 320 | 320 / 320 | 320 / 320 |
| … largest step of the way in 16 ms / steps away from the target | 14.5 % / 0 | 14.5 % / 0 | 14.8 % / 0 |
| … a moved viewer: error of the next frame's eye | 0 | 0 | 0 |
| `unanchored`: yaw at the start / half way / end of the event / in the hold / start of `fly` (°) | −12 / 12 / −12 / −12 / −12 | −12 / 12 / −12 / −12 / −12 | −12 / 12 / −12 / −12 / −12 |
| … moments with chrome (of 49 through the second sweep) / outside the 8 % margins / overlapping labels | 49 / 0 / 0 | 49 / 0 / 0 | 49 / 0 / 0 |
| `rebuild`: depart end → rebuild start / connect end → depart start / rebuild end → idle (largest difference, of 255) | 0 / 0 / 0 | 0 / 1 / 0 | 0 / 0 / 0 |
| `frame-zero`: largest difference to the flat reference (of 255) | 0 | 0 | 0 |
| `rebuild-end` | 0 | 0 | 0 |
| `assemble-end` / `assemble-overflow` | 0 / 1 | 1 / 1 | 0 / 0 |
| `perf`: host `depart` at `high`, scene ms median / p95, viewer moving 30 times a second | 0 / 1 (clock in 1 ms steps) | 0.3 / 0.7 (not meaningful) | 0.2 / 0.4 |
| … host `rebuild` at `high` | 0 / 1 | 0.3 / 1.4 | 0.2 / 0.4 |
| … guest `explode` at `high` | 0 / 1 | 0.3 / 0.5 | 0.3 / 0.6 |
| … host `depart` at `mid` | 0 / 1 | 0.2 / 0.4 | 0.2 / 0.3 |
| … host `depart` at `high`, time between frames median / p95 (ms) | 10 / 12 | 133.3 / 250 | 16.7 / 16.7 |
| … textures at `high` / `mid` / `low` (MB; budgets 64 / 40 / 24) | 17.57 / 10.09 / 4.8 | same | same |
| … bundle / gzip / font (bytes) | 91,719 / 29,339 / 18,948 | same | same |

Renderers: WebKit 2388 on the Apple GPU; HeadlessChrome 159 on SwiftShader; the same Chromium on
ANGLE Metal, Apple M3. The M3's GPU is an integrated laptop GPU, so the 6 ms budget holds there with
a wide margin (median 0.2 ms, measured with `gl.finish()` after every frame); it says little about
a phone. `QR` scans through `idle` at 1× and 2× (`qr-1x.json`, `qr-2x.json`, as in peel v2).

Flat frames: host frame zero, the rebuild end and the assemble end are exact (0) in WebKit and on
Metal; software GL is 1/255 off in the assemble end, as peel v2 was.

## 5. What does not work, what is limited

- **Real devices: nothing verified.** Frame time on a phone, the `mid` tier at 60 fps on an
  iPhone 12, exposure through a real camera, latency between the guest's hand and the host's
  picture — none of it was measured. With lag the walls *will* swim; the effect uses a new eye in
  the next frame and adds no smoothing of its own, the rest is the shell's (prediction).
- **Light cards.** The room cannot be lit when the card background is already near white. Such a
  card gets the opposite treatment (walls shaded with depth, dark rulers) and the two exposure
  rules of the brief cannot hold for it. This path was looked at once with a temporary light
  variant of the example, outside the repo; no check covers it.
- **No depth buffer.** Order is painter's order. Known approximations: ruler flags are drawn over
  every sheet inside the room, also those nearer than the flag; they are hidden behind the bottom
  sheet by assuming that sheet is opaque and card-sized. Wall shadows take at most 8 sheets.
- **Shadows on sheets are faint by design** (§6.2), and sheets cast them on each other only when
  they are close (during the fan, and in the stack in front).
- **`window-truth` does not detect corners in pixels.** Its analytic part projects 20 points of the
  box through the matrices the host actually drew with and compares with the real box seen from
  the camera's true position; its pixel part registers the camera's image of the screen against a
  direct 3D render (whole window and quarters). A corner detector on a 70-px-wide screen with dark
  walls was not reliable enough to trust.
- **Software GL is slow.** Chromium's headless shell draws the cavity at a few frames a second, so
  its check run takes 12 min and its frame times mean nothing; the 6 ms budget is judged on Metal.
- **The guest alone stands still after the event.** Its eye swings only during `explode` and is
  at rest when the event ends (§6.4); the hold before `fly` is a still picture.
- **The anchored guest's stack hides the room at the end** (§3).
- **A viewer nearer than one card width, or behind the glass, is not used as given** (clamped to 1
  card width, or ignored).

## 6. Where rules pulled against each other

In the brief's order of priority.

1. **Exact flat frames against "everything through the eye".** `idle`, `connect` and the closed
   end of `rebuild` are drawn on peel's flat path, not through the frustum. Through the frustum the
   same sheets land on the same pixels but single values come out 1/255 off, and frame zero must
   be exact. Cost: at the first frame of `depart` the picture changes by at most 1/255 on a few
   pixels (`rebuild.json`). Exactness won.
2. **"Nothing darker than the card background" against "soft shadows".** A shadow in this room is
   the absence of the light the room adds: walls fall back to the background colour, a sheet
   falls back to its print. So shadows can never be darker than the unlit card — and on sheets
   they are weak (a sheet gains at most 42 %). The exposure rule won over shadow contrast.
3. **The fan over the whole depth against "distinct from 35°".** The first version spread the
   layers evenly over 3 card widths; from 35° the window's edge hid all but two. The upper layers
   now hang within 1.4 of the glass. SPEC was changed and says so.
4. **Determinism against an eye that keeps moving.** W4 let the unanchored eye swing on through
   the hold after the event, so the window stayed alive. But then `fly` started from wherever the
   swing happened to be, and a frame of `fly` depended on when `explode` had begun. The contract
   says a frame depends on its timeline, its time and the inputs. W5 took the liveliness back:
   one sweep now takes half of the event (3.875 s instead of 4), the swing ends where it began, at
   rest, exactly at 7.75 s, and holds. The contract won.
5. **"About 0.25 s" for a crossing.** The print crosses in 0.25 s; the slab under it is 0.012
   thick and its side faces follow 15–35 ms later (measured 260–280 ms).
6. **Process rules.** The root `package-lock.json` is outside the folder: left modified and
   uncommitted rather than committed without asking. Peel's `lift-handoff` check was removed, not
   adapted: the lift it tested does not exist here; `glass-seam` takes its place.

## 7. Creative decisions

Recorded, not approved — for the owner in the morning.

1. The cavity has the card's cross-section and is 3 card widths deep; the back wall is the panel.
2. Upper layers hang near the glass (0.25, then 0.2 apart, closer when there are many, none deeper
   than 1.4); only the bottom layer goes to the back wall, 0.02 off it.
3. Opening: the stack recedes 0.6 in 1.2 s (ease in-out); the sheets turn into slabs during
   1.2–1.7 s; in the fan the upper layers start up to 0.3 s after the bottom one.
4. Exits are spread over 2.5 s whatever the number of layers, so the event is always 7.75 s.
5. Each exit ends in one soft spring: 6 % past its place and back before its chrome.
6. The crossing tilt is about the sheet's longer axis, top (or right) edge first, and exactly large
   enough that the sheet is all inside when the crossing starts and all outside when it ends. In
   `rebuild` the bottom (or left) edge enters first, so it reads as sheets sliding in from an edge.
7. Walls: the outermost rows and columns of the flat card, extruded; light factor 1.12 at depth
   rising to 2.07 at the opening; a little of the panel's colour near the opening.
8. Rulers: every 100 design px at 7 % white, every 500 at 20 %, thinning out where they would
   alias. Numerals are upright flags in both lower corners (500 … 3500), 0.042 card widths tall,
   not text lying on the walls (that was one or two pixels wide from most eyes).
9. Back panel: the card background mixed half-way to the acrylic rim white, 30 % dimmer in the
   corners; it lights up as the bottom layer starts to leave. Until then a sheet in the card
   background colour stands behind the bottom layer, so the room is closed at the back.
10. The room's light comes on with the opening; a sheet inside is up to 42 % brighter than printed.
11. Wall shadows: a soft band behind each sheet, stronger the closer the sheet is to that wall.
12. The outline a layer leaves is drawn on the back wall (dashed blue, 1.25 px, traced during its
    crossing), not on the glass. Peel's "Lifted to guest" tags are gone.
13. The rim of light along the cut (host without a viewer) is about 1.5 px of rim white.
14. No specular sweep inside the room; it runs onto a sheet as the sheet comes through the glass.
15. The tilt eye: 6 card widths out, ±25°. Idle's flat parallax fades over the first 0.3 s of
    `depart` while the perspective takes over.
16. The guest alone: 10° of pitch, swing ±12°, one sweep in 3.875 s (half the event), from one
    end and back to it; still after the event. A hairline in rim white around the opening.
17. `rebuild`: re-entries 0.42 s apart in total, 0.2 s crossing, 0.3 s slide to a shallow fan
    (40 % of the hanging depths), gather until 1.2 s, flat at 1.5 s, QR 1.3–1.8 s.
18. `reduced`: the card fades out in 0.6 s, the sheets fade in at their places in the next 0.6 s
    as flat prints (no slabs), every exit is a 0.25 s fade.
19. Light cards are shaded with depth instead of lit (§5).
20. `onLayer`: `leave` / `lift` fire when a sheet starts to cross the glass, `settle` when it
    lands, `arrive` (rebuild) when the stack is flat.
21. Tiers: `mid` has dimmer rulers and no numerals, `low` no rulers and no wall shadows.
22. The stand-in camera minifies the host's screen with mipmaps, as a camera integrates a screen.

## 8. What waits

**For the owner**
- Taste: the darkness of the room; the grey of the back panel; the white slab outlines, which from
  the front read as frames in a tunnel; the length (7.75 s); the rebuild as a wipe from the edge.
- The owner's card: sheets and both films are in
  `~/dev/prv/products/layercard-runs/window-v3-eryk/` (outside the repo): 17 sheets,
  `window-orbit.mp4`, `window-sequence.mp4`, rendered natively in WebKit from the content folder
  through the dev server (`WINDOW_CONTENT_DIR`). Nothing of that card is in the repo. It has seven
  flying layers, so its exits come 0.42 s apart instead of 0.5 s, and it is as dark as the example.

**For the shell**
- Relay the viewer: the inverse of the guest's pose applied to the origin (`eyeOf` in
  `demo/main.ts` is the three lines), about 30 times a second, `null` when the guest loses the
  marker. The host redraws on every `setViewer`, also after `depart` has ended.
- Predict the latency. The effect does not smooth; a late eye shows as walls that lag the hand.
- `durations()` is 7.75 s for `depart` / `explode` and 1.8 s for `rebuild` (peel: 6.1 and 1.5).
- Nothing else changes against peel v2: same `safeRects`, `assembleRect`, events, `replaceLayer`.

**Contract** — nothing blocked the work. Two proposals, neither applied:
- Say that a viewer is used only while the host draws through the glass (`depart`, `rebuild`);
  `idle` and `connect` are flat by definition (exact frames) and ignore it.
- Decide whether a guest without a pose may keep its virtual camera moving after `explode` has
  ended (a function of the time since it started). I read the determinism rule as "no" and
  stopped the swing at the end of the event (§6.4); a moving hold would look more alive.

## 9. Outside the folder

- Root `package-lock.json`: modified by `npm install` (workspace entry for
  `@layercard/effect-window`), not committed. Reversible with `git checkout package-lock.json`.
- `~/dev/prv/products/layercard-runs/window-v3-eryk/`: the owner's card renders.
- The article diary in the vault got a "Wersja 3: window" section and images (asked for by the
  owner during the run).
- `docs/build-log.md` was not edited (§11 proposes lines).

## 10. What I would do next

1. Two phones and a tracker. Everything else is second to seeing whether the hole survives a real
   camera's exposure and the real latency.
2. If the room is too dark through a phone camera: lift the walls (the factor is one line in
   `src/cavity.ts`) and thicken the 500-px rulers to 2 px; the exposure check will hold.
3. A check for light cards, and a second example card that is light.
4. A depth buffer for the room, to drop the painter's-order approximations.
5. A pixel corner detector for `window-truth`, on a test pattern rather than on the dark walls.

## 11. Proposed lines for `docs/build-log.md`

Not written there (the file is outside this folder). Every number below is in `checks/results/` or
`RUNLOG.md` of this folder.

- 2026-11-16 — window v3: the host draws its screen through an off-axis frustum from the guest
  camera's position (`setViewer`). At 19 camera positions (0°, ±20°, ±35° on both axes, 4.5–9 card
  widths away) the 20 points of the cavity the host drew are 0.00002 CSS px from where a real box
  3 card widths deep projects, and the stand-in camera's image of the screen is shifted by at most
  0.24 px (WebKit, Metal) or 0.27 px (software GL) against a direct 3D render. Source:
  `checks/results/*/window-truth.json`.
- 2026-11-16 — window v3: a layer crossing the glass is split between the phones along one line.
  Crossings take 260–280 ms; in 1551 samples of the event no layer is whole on both phones; the
  halves meet with a gap of at most 0.73 CSS px in the stand-in camera. Source:
  `checks/results/*/glass-seam.json`, `glass-seam-pixels.json`.
- 2026-11-16 — window v3: slab side faces stuck out up to 5 px past the cut until the card-space
  position was interpolated at the centroid of the covered fragment instead of the pixel centre.
  Source: `packages/scene/effects/window/RUNLOG.md`, W3 line of 00:40.
- 2026-11-16 — window v3: nothing in the cavity is darker than the card background (darkest pixel
  0.00592 = the background's luminance, 6 eyes × 11 moments); the lit back panel is 31.7 times the
  background (example card, #0F1216). Source: `checks/results/*/exposure.json`.
- 2026-11-16 — window v3: host `depart` = guest `explode` takes 7.75 s for any number of layers,
  `rebuild` 1.8 s (peel v2: 6.1 s and 1.5 s for the example). Source: `checks/results/*/contract.json`.
- 2026-11-16 — window v3: scene time at `high` with the viewer moving 30 times a second, Chromium
  159 on ANGLE Metal, Apple M3: median 0.2 ms, p95 0.4 ms per frame (budget 6 ms); bundle 91,719
  bytes (29,339 gzip), font 18,948 bytes, textures 17.57 MB at `high`. No phone was measured.
  Source: `checks/results/chromium-metal/perf.json`.
- 2026-11-16 — window v3: 28 checks pass in Playwright WebKit 2388, in HeadlessChrome 159 with
  software GL and on Metal; Chromium's software GL draws the cavity at about 7 frames a second
  (133 ms between frames), so its run takes 9–12 min against 3–5 min for the others. Source:
  `packages/scene/effects/window/RUNLOG.md`.
- 2026-11-16 — window v3: one check failed for a reason in the check: `viewer-switch` sampled real
  animation frames and software GL drew one frame in 520 ms; it now steps the page clock (16 ms)
  and gives 320 ms for the 0.3 s blend in all three runs. Source: `RUNLOG.md`, W2 line of 00:33.
