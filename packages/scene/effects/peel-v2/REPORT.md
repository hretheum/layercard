# peel v2 — REPORT

2026-11-15, branch `scene/peel-v2`, worktree `layercard-scene-v2`. Nothing was pushed, merged,
rebased or tagged. Five milestone commits on top of `bf40105`: V1 `edaac19`, V2 `8c1f7ab`,
V3 `e7eb0df`, V4 `40792ca`, V5 (this report). `RUNLOG.md` has the times; `process/README.md` has one
captioned image per milestone.

## 1. State

All five milestones are done and every check is green in Playwright WebKit and in Chromium
(software GL), and also in Chromium on the Mac's GPU, which the brief did not ask for but which
turned out to matter (§3). Final run, 22:50–22:57: 23 passed in WebKit, 23 in Chromium software
GL, 23 on Metal (16 are v1's checks, 7 are new).

Not done, and not claimed: nothing was looked at on a real phone, with a real camera or a real
tracker (§8).

## 2. What changed from v1

### The lift-off — one layer, one place

v1: a layer left the host by sliding out through the right edge for 0.9 s, while the guest saw its
sheet in the air after 0.03 s. Through the camera the layer was in two places.

v2: host and anchored guest read one curve (`liftCurve` in `src/schedule.ts`): a 0.25 s *peel* in
which a sheet reaches 11.5 % of its rest height, then a rise into the 6 % overshoot at 0.9 s and the
settle at 1.25 s (overshoot and settle are v1's).

- **Host.** The layer never moves sideways. During the peel the print swells to 103.5 % inside its
  own rect, a highlight crosses it, it fades out (full until 0.08 s, gone at 0.25 s) and its shadow
  — cast from the height the guest's sheet has at that moment, clipped to the same rect — drifts
  down and to the right. The dashed outline (v1's look) is complete at 0.25 s; beside it the tag
  **"Lifted to guest"**. The shadow fades during 0.25–0.45 s.
- **Guest, anchored.** The sheet starts flat on the glass exactly on the host's print — no stair
  offset, no thickness — fades in over 0.08 s and rises along +Z. Its own shadow on the glass fades
  in during 0.25–0.45 s, as the host's fades out, so there is one shadow at any moment.
- **Host `rebuild`** calls the same function with time running backwards, in reverse order; the
  outline clears as a layer lands, the QR re-forms last, the end frame is idle frame zero (0
  differing values).
- **Unanchored guest**: unchanged (it enters from the top edge on v1's curve).
- Durations are unchanged and equal on both roles (6.1 s for the example).

**How it looks through a camera** (stand-in camera of the demo, `artifacts/compare-v1-v2-*.png`,
`process/v2-liftoff.png`): in v1's row the mark is on the host's screen and in the air at once from
0.06 s on, and the previous layer is still sliding out under it. In v2's row there is one mark in
every frame: on the glass it gains a white rim, leaves the glass, and from 0.25 s the screen under
it shows only the outline. At 35° this reads clearly as "it rose towards me". Frontally the read is
weaker: the stack's own geometry (v1's 0.035 stair, kept) puts sheets on top of each other in a
head-on view, so a rising sheet mostly grows by 1–2 %; the swell, the rim and the shadow carry it.
On the host alone the swell + highlight + departing shadow read as lifting, not as a fade — but
the shadow is dark on a dark card, so on the example it is subtle; on a light card it will be the
strongest cue. This is a judgement from still frames and one 30 fps film, not from a phone.

### Labels that hold still

- `src/layout.ts` is new. One arrangement: rows of blocks above and below the stack, in two
  columns either side of a channel; leader = stub → rail → gate → corner. Rails and stubs stay on
  the block side of the gate line, so they cannot meet the straight parts; the straight parts are
  uncrossed by swapping slots, which ends because every swap makes them shorter in total.
- v1's "beside the stack" mode is removed. It was used when one side had room next to the stack,
  which on a phone means "the stack is at a screen edge" — exactly the three views where v1 crossed.
- History (contract v1.1): the slot assignment is held; block and rail positions go through a 2 px
  dead band and a critically damped spring. Gates and the sheet end of every leader are exact.
- Result (identical in all three browser runs): 0 crossings, 0 overlaps, 0 blocks outside the
  margins in 85 + 85 poses and in v1's 12 views; under a 1.5 px / 30 Hz jitter the blocks do not
  move at all; a 70° sweep causes 2 slot changes in 4 s.

### The landing is the page

- `assembleRect` may be the whole canvas or run past it; layers are baked whole.
- The deck at the end of `fly` is solved from its real screen box so that 4 % of the canvas stays
  free on every side (0.89× the page for a full-bleed 390 × 844 landing; v1's 1.12× deck would have
  been cut by both side edges). `assemble` grows it into the rect.
- End frame against the reference: 0 differing values in WebKit and in Chromium on Metal for the
  four rects the brief names.

### Safari

Every check runs in Playwright WebKit 2388 and Chromium 1255; evidence per browser in
`checks/results/<browser>/`. This found a v1 bug (next section).

## 3. Findings worth knowing

1. **v1's "pixel-identical" flat frame was only true without a GPU.** With v1's code all 16 checks
   were green in WebKit, but host frame zero was up to **72 / 255** off the 2D composite on every
   scaled edge (34,430 px; Chromium on Metal: 74 / 255, 13,968 px). Two things hid it: v1 asserted
   the *mean* difference (0.56 passes "≤ 1"), and Playwright's headless Chromium has no GPU. Cause:
   the bake drew on a GPU-accelerated 2D canvas, which scales `drawImage` with another filter than
   the software canvas of the reference. Fix: `willReadFrequently` on the bake's canvases. All pixel
   assertions are now on the largest difference. v1 is what runs in production; if phones scale a
   2D canvas on their GPU the way the Mac does — not tested here — **the production card has this
   error today**, visible at most as a faint change of edges when the page takes over from the
   scene. v1 was not touched.
2. **A rebuilt `dist/` did not always reach the checks.** Vite does not watch its build output; a
   long-running dev server keeps serving the first bundle it transformed. The recorded runs on the
   Mac were not affected (each sync restarted the server, see `RUNLOG.md`), the sandbox runs were.
   `vite.config.ts` now has a plugin for it.
3. **A clipped `drawImage` depends on the size of the canvas in WebKit.** For a landing rect that
   runs past the top or left edge the first implementation was 2 / 255 off in WebKit only. The
   visible part of every layer is now always drawn on a canvas the size of the drawing buffer.
4. **Chrome for Testing 153 on Linux x86** (the sandbox the code is first tried in) stays 2 / 255
   off on about 1,200 edge pixels, before and after finding 1. HeadlessChrome 159 and WebKit on the
   Mac (ARM) are exact. Cause not established; if x86 Chrome matters, the safe answer is to show a
   pre-composited flat image at the exact end frames.

## 4. Acceptance (SPEC §2)

Evidence files are in `checks/results/webkit/`, `checks/results/chromium/` (software GL) and
`checks/results/chromium-metal/`; where one number is given it is the same in all three.

| ID | Item | Result |
|---|---|---|
| B1 | v1's 16 checks in both browsers; flat frames within 1/255, largest difference | met — 16 of 16 in each; largest difference in v1's pixel checks: WebKit 0, Chromium on Metal 0, Chromium software GL 1 |
| B2 | Host: no pixel changes outside the lifting layer's rect | met — 0 px in 6 layers × 2 tilts × 16 moments (`lift-handoff-host.json`). The two full-card layers cannot fail this; the four others can |
| B3 | Print gone before the sheet is one gap up | met — every print gone at 0.25 s; example's top sheet then 0.084 up, one gap at 0.29 s; 0 frames with both |
| B4 | Sheet corners at lift start within 1 CSS px | met — 0.29 px frontal, 0.31 px at 35° (state); drawn extent of the first sheet within 0.81 / 0.98 px (pixels) |
| B5 | Reads as rising; one place through the camera | met by the frames in §2, with the caveats there; `artifacts/compare-v1-v2-*.png` |
| B6 | Rebuild end = idle frame zero; durations unchanged | met — `rebuild-end.json` 0, `contract.json` 6.1 s both roles |
| B7 | Landing exact for the four rects | met — WebKit 0, Metal 0, software GL ≤ 1 (`assemble-overflow.json`); production bundle in real time: 0. An extra rect past the top-left corner: WebKit 1, Metal 0 |
| B8 | No sheet crosses a side edge in `fly` / `assemble` | met — 66 frames per case, closest approach 0.00 px (the end frame of a full-bleed landing) |
| B9 | ≥ 60 poses: 0 crossings, 0 overlaps, margins, 12 px | met — 85 poses × 2 canvas sizes, each edge and corner cut 6 times (`leaders-grid-*.json`) |
| B10 | Jitter: ≤ 0.5 px per frame at p95, ≤ 2 swaps/s; seek twice identical | met — 0 px, 0 swaps (3 poses); sweep 0.20 px, 0.5 swaps/s; 0 differing pixels (`label-steady.json`) |
| B11 | No allocation per frame in the history; tiers and budgets in both browsers | met — by reading the code (typed arrays made at mount, no closures in the frame path); `perf.json` per browser, §6 |
| B12 | v1 recoverable | met — see §9 |
| B13 | Demo: v1's controls plus a jitter switch | met — `demo/index.html` ("pose jitter (1.5 px, 30 Hz)"), `?jitter=1` |
| B14 | Artifacts | met — §10 |

## 5. Every creative decision

Lift-off
1. One curve for both roles; its shape: quadratic peel 0–0.25 s to 11.5 %, cubic Hermite rise to
   106 % at 0.9 s, v1's settle. 11.5 % because the top face of the highest sheet any manifest can
   have (8 flying layers) is then 0.1098 up — under one gap — when the print is gone.
2. The host's swell is 3.5 %, as a zoom of the print inside a quad that keeps its size, so the
   layer's own rect cuts it off (the acrylic rim swells out of the rect and is cut off with it).
3. The print stays at full opacity for the first 0.08 s (while the guest's sheet fades in over it),
   then fades to nothing at 0.25 s.
4. The lifting print keeps v1's acrylic film and specular sweep; the sweep crosses during the peel.
5. The shadow uses the guest's light (offset 0.10 / −0.14 of the height, blur 0.004 + 0.05 of it)
   and the height of the guest's sheet at that moment; it is clipped to the layer's rect and
   handed over to the guest's view during 0.25–0.45 s.
6. Outline traced during 0.03–0.25 s; tag fades in during 0.15–0.30 s.
7. Tag words: **"Lifted to guest"** (15 characters). It names the move and where the layer went.
8. `rebuild` is the exact reverse, mapped onto v1's 0.5 s landing; so the first 0.22 s of each
   landing show only a shadow gathering (invisible on the dark example card).
9. The guest's sheet has no thickness and no acrylic look on the glass; both grow over the peel.
10. The unanchored guest keeps v1's curve.

Landing
11. Deck rule: as large as fits with 4 % of the canvas free on every side, at most 1.12× the page,
    box centred on the visible part of the rect. For v1's centred 320 × 692 rect this gives 1.09×
    instead of v1's 1.12×.
12. The deck moves and grows over v1's 0.75 s with v1's easing.

Labels
13. Rows above and below only; two columns either side of a channel that is centred on the stack as
    far as the margins allow and at most 64 px wide.
14. Each sheet keeps the kind of corner its leader ends on (left for even stack indices, as v1);
    its column is free.
15. Block width cap: (84 % of the canvas − the channel) / 2, at most 176 px. v1's 44 % each could
    overlap. On a 390 px canvas this is 149 px (the example's widest block is 145 px); on 320 px it
    is 119 px, so long labels are cut there.
16. Rails are 7 px apart and close up to 2.5 px when an end holds three or four rows.
17. One-end fallback if a crossing were left; it was never needed in any checked pose.
18. History: hold 0.5 s, rest after 0.05 s, dead band 2 px, spring settling in 0.22 s; `reduced`
    keeps hold and dead band and drops the spring.
19. On canvases wide enough for v1's "beside" mode the unanchored pose now also leaves room for
    rows above and below. On phone-sized canvases it is unchanged.

Other
20. Demo default is the full-bleed landing (`?inset=1` gives v1's rect).
21. The perf check measures the guest full-bleed and with a pose that changes 30 times a second.

## 6. Performance

390 × 844 CSS px at device pixel ratio 2, Apple M3. Scene time = update + render + `gl.finish()`
per frame, inside the effect. Source: `checks/results/<browser>/perf.json`, final run.

| | Chromium on Metal (HeadlessChrome 159) | WebKit 2388 (Apple GPU) |
|---|---|---|
| host, high: median / p95 per timeline | 0.2–0.4 ms / 0.5–1.0 ms | 0–1 ms / 1–6 ms |
| guest, high, moving pose: median / p95 | 0.2–0.4 ms / 0.5–1.0 ms | 0 ms / 1 ms |
| worst single frame in a timeline other than `idle` | 5.5 ms (guest `explode`) | 4 ms |
| frame interval while playing | 16.7 ms | 10 ms |

WebKit's clock has 1 ms steps, so its numbers are coarse; its headless build runs animation frames
every 10 ms. Budget (6 ms median, high tier) asserted in both. Texture memory, both roles now
(the guest lands full-bleed): 16.98 MB of 64 (high), 9.57 of 40 (mid), 4.26 of 24 (low). Bundle
69,511 bytes (22,629 gzip; v1's bundle in the tag: 60,043 bytes), font 18,948 bytes.

## 7. Where rules pulled against each other

Priority list of the brief: contract and determinism → v1 recoverable → exact flat frames in both
browsers, QR and label legibility → one layer, one place → budgets → polish → process.

- **Exact flat frames over "v1 code is the floor".** The bake's canvas kind was changed in the V1
  milestone, before any v2 feature, because v1's code is not exact on a GPU.
- **One layer, one place over a v1 creative decision.** v1's lift started at full speed; the
  anchored lift now starts slowly (0.25 s peel), because the host cannot hide a print in 0.03 s.
- **"Leaders never cross" over "chrome look unchanged".** The "beside" mode is gone and long labels
  are cut a little earlier. Rows, chips, pills, leaders and frames look as in v1.
- **"Never cross" over "a swap at most once per 0.5 s".** A held assignment that would cross in the
  current frame is replaced at once. Measured rate stays at 0.5 per second in the sweep.
- **Contract ("stateless within 0.3 s once the pose rests") over the 0.5 s hold.** Rest ends a hold.
- **Process.** `SPEC.md` was written before code and amended three times (curve number, landing,
  labels as built); the amendments are listed at its top. The V2 and V3 commits were cut from one
  working tree in which V3 and V4 code already existed, by rebuilding the earlier state; each was
  checked in all three browser runs before it was committed.

Nothing on the ask-first list was needed: `CONTRACT.md`, `types.d.ts` and `examples/` are
unchanged, no tag was created or moved, nothing outside this folder was deleted or edited.

## 8. Limits and what was not verified

1. **No real device.** Not a frame on a phone, no real camera, no real tracker. "Sheet exactly on
   the print" holds for the pose the effect is given; a tracker's error adds to it.
2. **Playwright WebKit is not Mobile Safari.** It is the same engine on a Mac's GPU.
3. **During a slot change (0.22 s) blocks can pass over each other and leaders can cross.** The
   layouts at both ends of the slide are clean; the slide between them is a plain ease.
4. **Jitter larger than the 2 px dead band** makes blocks follow, 2 px behind and eased.
5. **`rebuild`'s first 0.2 s** show nothing on a dark card (decision 8).
6. **Frontal view** reads weaker than an angled one (§2).
7. **320 px canvases** cut labels longer than about 17 characters (decision 15).
8. **The one-end fallback and arrangement "2"** (rows pushed in over the stack) exist in code; the
   first is checked by force, the second is not reached by any checked pose and has no check.
9. **x86 Chrome**: finding 4.
10. **The page under the landing** is `<img>` elements scaled by the browser, not a 2D canvas; the
    end frame equals the contract's reference, the page was not compared.

## 9. v1 is recoverable

Checked at 22:57, after the final run: the tag `peel-v1.0` points at `c558f97`, the branch
`scene/peel-v1` at `c558f97`, the worktree `layercard-scene` is on that branch at that commit with
no uncommitted file. This run never checked them out, committed to them or moved them. v1's bundle
was read out of the tag with `git show` into `artifacts/tmp/v1/` (gitignored) for the comparison
sheets. **v1 was also rebuilt from the tag**: a `git archive` of it unpacked under
`artifacts/tmp/v1-src/`, `vite build` — the resulting `dist/peel.js` (60,043 bytes) has the same
SHA-256 as the bundle committed in the tag.

## 10. Artifacts

In `artifacts/` (rendered by Chromium on Metal unless the title says otherwise):

- `sheet-*.png` — 12 contact sheets, every role × timeline (anchored, frontal, 35° and unanchored
  for the guest), full-bleed landing.
- `compare-v1-v2-host-depart.png`, `compare-v1-v2-anchored-explode-frontal.png`,
  `compare-v1-v2-anchored-explode-35.png` — v1's and v2's production bundles side by side around the
  lift of one layer (`scripts/compare.mjs`).
- `peel-v2-sequence.mp4` — host and guest side by side, the whole sequence.

The owner's card (anchored and unanchored sheets and the landing) was rendered into
`~/dev/prv/products/layercard-runs/peel-v2-eryk/`, outside the repo, straight from
`~/dev/prv/products/layercard-content/eryk/` through the dev server (`PEEL_CONTENT_DIR`). No file,
name or text of it is in the repo, the commits, the artifacts or this report.

## 11. Proposed lines for `docs/build-log.md`

Not written there (the file is outside this folder). Every number below is in `checks/results/` or
`RUNLOG.md` of this folder.

- 2026-11-15 — peel v2: v1's host frame zero, called pixel-identical, was up to 72 / 255 off the 2D
  composite in WebKit and 74 / 255 in Chromium on a GPU (34,430 and 13,968 pixels of 329,160); the
  checks asserted the mean and ran without a GPU. Source: `packages/scene/effects/peel/RUNLOG.md`,
  V1 lines; `scripts/diffmap.mjs`.
- 2026-11-15 — peel v2: after baking on unaccelerated canvases the same frame differs by 0 values
  in WebKit 2388 and in HeadlessChrome 159 on Metal. Source: `checks/results/webkit/frame-zero.json`,
  `checks/results/chromium-metal/frame-zero.json`.
- 2026-11-15 — peel v2: a layer is now in one place: the host's print is gone 0.25 s into its lift,
  when the guest's sheet is at most 0.084 card widths above the glass (example card); v1 showed it
  in two places for 0.9 s. Source: `checks/results/*/lift-handoff.json`.
- 2026-11-15 — peel v2: labels: 0 leader crossings in 170 synthetic poses (v1: 1–2 crossings in 3 of
  12 views); under a 1.5 px / 30 Hz pose jitter label blocks move 0 px per frame. Source:
  `checks/results/*/leaders-grid-*.json`, `label-steady.json`.
- 2026-11-15 — peel v2: scene cost per frame 0.2–0.4 ms (median) in Chromium on Metal and at most
  1 ms in WebKit on an Apple M3, 390 × 844 at DPR 2; bundle 69,511 bytes (22,629 gzip). Source:
  `checks/results/chromium-metal/perf.json`, `checks/results/webkit/perf.json`.
- Proposal for contract v1.2 (not edited): say that the flat reference is drawn on an
  **unaccelerated** 2D canvas, and that "pixel-identical" means the largest difference per channel.
