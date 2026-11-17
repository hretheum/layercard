# Build log

Timestamps are Europe/Warsaw. Every number here has a source (command, measurement, report).

## 2026-11-15 (Sun)

- 15:35 — Repo name `layercard` chosen; concept: phone as card, layers peel off the host screen and fly
  into the guest phone (AR above the host phone when tracking works).
- 15:40 — Scene decisions for the Fable brief: material = thin acrylic slabs with design-tool selection
  chrome (frame, label, red measurements); motion = exploded view, axis-aligned, equal spacing, slight
  overshoot and settle; core idea = "Your card is a design file you can hold: its layers lift off the
  glass and land in your hand."; host idle = the card breathes its layers apart with device tilt.
- Repo scaffolded: scene contract v1, fictional example card (7 layers), worktrees `scene/peel-v1` and
  `shell/v1`.
- 15:50–16:00 — Tracking spike (`apps/spikes`, ArUco 4x4 via js-aruco2, homography pose, One Euro on
  corners). Synthetic self-test (`apps/spikes/checks/tracking-selftest.mjs`: host screenshot warped by
  ffmpeg into a fake Chrome camera, 720 px wide frame). A host phone at ~45 cm is ~146 px wide in a
  portrait 720p frame. Results: 4 corner markers at 22% of card width — not detected at 146 or 200 px,
  detected at 300 px; corners at 30% — detected at 200 px, not at 146 px; one bottom marker at 50% —
  detected at 146 and 200 px, 100% of frames. Detection 17–19 ms per frame at 720 px on the MacBook.
  Image tracking of the card (MindAR) dropped: the card leaves the screen during `depart`.
- 15:55 — Room spike: Worker + Durable Object (WebSocket hibernation) behind the Vite proxy; local
  ping–pong with server clock in 1 ms.
- 16:05–16:10 — First real-phone tracking results, big bottom marker (50% of card width), 720p portrait,
  processing 540x960 (pasted from the guest page): iPhone on iOS 26.6 (Chrome) — lock 76 ms, detection
  15/17 ms (p50/p95), 56.7 fps, tracked 100%, jitter 1.5 mm, estimated distance 210 mm; older iPhone on
  iOS 18.7 (Brave) — lock 76 ms, detection 11/14 ms, 60 fps, tracked 42% over the last ~5 s, jitter 1.7 mm,
  estimated distance 237 mm. Distance estimates assume a 70 mm card width and a 65° vertical FOV.
- 16:12 — Room page fix: the Vite proxy key "/room" also caught "/room.html"; now "^/room/.*". Through
  the quick tunnel: RTT ~28–33 ms, flash message one-way ≈ 81 ms (headless self-test on the Mac).
- 16:11–16:14 — Tracking at conversation distance (second tester, iPhone iOS 26.6, Chrome, guest role).
  Estimated distances run ~1.4x high against the reported ~50 cm (FOV guess 65° and 70 mm card width
  both off). At ~50 cm: 720p capture, 540x960 processing — tracked 39%, jitter 59.5 mm; 1080p capture,
  720x1280 processing — tracked 79–81%, jitter 14.5–35.7 mm, detection 30 ms → 29–31 fps on the main
  thread. Closer (~35 cm, est. 549 mm): 720p tracked 89%, jitter 20.9 mm. Closest (est. 337 mm), 1080p:
  tracked 100%, jitter 3.7 mm.
- 16:15 — Fable 5.2 run 1 (scene `peel`) started headless in `layercard-scene`; stream log in
  `../layercard-runs/peel-run1.jsonl`.
- 16:15 — Room on two real phones through the quick tunnel: RTT min 30 ms, median 35 ms, clock offset
  1 ms; one-way message ≈ 99 ms guest→host and ≈ 31 ms host→guest; the shared flash fired visibly
  together on both phones.
- 16:20–16:30 — Card shell end to end (`apps/card`, `worker`, `packages/scene/effects/minimal`): host page
  with per-session room and QR, marker overlay after `connect`, tilt and wake lock after one tap; guest
  page with camera, tracker in a Web Worker and native-resolution ROI after the first lock, ready/start
  handshake on server time, explode → fly → assemble, landing on the card page (vCard, case studies,
  "Show someone", "Send link", chain counter); solo mode without a room. Headless e2e
  (`apps/card/checks/e2e.mjs`, fake camera from the host screenshot): tracking locked in 292/292
  detection results, marker side 122 px, detection 4–6 ms per frame in the worker with ROI (was
  17–19 ms full-frame on the main thread); host returned to idle after the guest landed.
- 16:28 — Fable run 1 at ~14 min: still planning (one permission denial for `git worktree list`,
  harmless); weekly usage window at 22%.
- 16:40 — Guest friction cut to two taps (open the scanned link, allow the camera): the camera is
  requested on page load in parallel with the room handshake; the "Point at my phone" button is gone.
  A single "Turn on the camera" button appears only if the browser rejects the request in under
  400 ms without asking (gesture required); a real refusal falls back to the unanchored flight.
  Shared links (no room) play the card immediately. e2e: 370/370 detection results locked.
- 17:09 — Early integration: the shell built against Fable's `peel` dist at M4 (commit c376afc,
  `LAYERCARD_EFFECT_ENTRY=.../peel/dist/peel.js`) passed the headless e2e on the first try: host
  idle → connect → depart with outlines → rebuild; guest anchored explode with labels → fly →
  assemble → card page; tracking 212/212 locked. Contract v1 needed no change. Observation for
  the scene: in the anchored view the upper label row can be clipped by the top of the screen.
- 17:15 — Deployed with Wrangler to Cloudflare: routes `hretheum.com/k` and `hretheum.com/k/*` (zone on
  Cloudflare, the rest of the site untouched: `/` and `/about` still 200 from the origin), plus
  `layercard.eof-fb9.workers.dev`. Production e2e against https://hretheum.com: tracking 312/312
  locked, guest landed, host back to idle. Content still the fictional example; effect = peel M4.
- 17:20–17:35 — Eryk's card designed in Figma through the Figma MCP (file "layercard — Eryk Orłowski",
  frame 2:2, private account): 1170 × 2532, seven layer frames named `id | label | dims` (bg, grid,
  field, frame, name, role, contact) plus guides for the runtime QR and the reserved 585 × 585 marker
  zone. Typefaces from hretheum.com: Archivo (display), Atkinson Hyperlegible Next and Mono. Layers
  exported one by one through `get_screenshot` (contentsOnly, natural size, RGBA with transparency),
  content kept outside the repo; rebuilt with the peel effect and deployed. Production e2e: guest
  landed on Eryk's card, host back to idle.
- 17:35 — LinkedIn CTA: "Connect on LinkedIn" is now the primary action on the card page (URL taken
  from hretheum.com), "Save contact" secondary; the vCard carries the profile as X-SOCIALPROFILE.
  Deployed; checked on https://hretheum.com/k/ in solo mode.
- 17:40 — Every link from the card to the main site now carries the event UTM tags with
  `utm_content=qr` (card page "hretheum.com" button, the "How it was made" link, the vCard URL).
  The card's own QR (room link under /k) is unchanged: it is the card itself, not a visit to the site.
- 17:45–18:00 — Self-hosted Archivo and Atkinson Hyperlegible (Next, Mono) on the card pages via
  @fontsource; host start pill fades after 6 s; chain counter namespace configurable (`STATS_NAME`)
  so it can start from zero before the event. Fallback checks (`apps/card/checks/fallbacks.mjs`):
  solo link, stale room, busy host, refused camera — all land on the card page (9–16 s), host back
  to idle in every case. Two fixes found by them: the guest now tells the host "assembled" before the
  page appears (a guest closing the tab right away left the host on outlines), and a guest leaving
  mid-peel makes the host rebuild at once. A camera request rejected in < 400 ms shows one "Turn on
  the camera" button that times out to the unanchored flight after 6 s.
- 17:50 — Incident: a build against a vendored effect failed (it could not resolve `three` outside the
  workspace) after Vite had already emptied the output folder; the failure was hidden by a pipe in
  the shell command, the deploy went ahead and shipped an incomplete app — the host page failed to
  start on production for ~5 minutes. Fixes: `set -o pipefail` on every build-and-deploy chain;
  `three` aliased so a vendored effect resolves our copy; builds use `scripts/vendor-peel.sh`, which
  copies `dist/` from a committed scene revision into `../layercard-runs/peel-dist/<sha>`, never a
  run's work in progress. Production rebuilt on peel M4 (c376afc) and re-checked (e2e + fallbacks).
- 18:00 — Fable run finished: M5 (chrome polish, quality tiers, performance) and M6 (16 checks green)
  committed at e7d2d9f / a4e880d / c558f97. Vendored c558f97 and deployed: production e2e and all
  fallback checks pass. Scene numbers from its REPORT (Apple M3): scene cost median 0.2–0.4 ms per
  frame, p95 ≤ 0.8 ms; bundle 19,618 bytes gzip; texture memory host 17.0 / 9.6 / 4.3 MB
  (high / mid / low); no real-phone measurements yet.
- 18:05 — Known limit from the scene report (text strips overlapping near head-on) fixed in content,
  not code: on Eryk's card the text layers were reordered so that the lower a strip sits on the card,
  the lower it sits in the stack (bg, grid, contact, role, name, field, frame). The stair offset now
  pulls the strips apart instead of together; the flat card is unchanged because these layers never
  overlap. Deployed and re-checked on production.
- 20:45 — Guest final screen redesigned (Eryk: the landing page read as a thumbnail with duplicated
  text). The page is now built from the same layers the scene assembles, full bleed, so the hand-off
  from canvas to page is invisible; actions sit in the freed QR zone; the page continues below in the
  card's grid. The canvas composite is gone, which also fixes the incomplete card image on WebKit
  (layers drawn before decode). Short viewports (iPhone 15 in Safari with toolbars: 393×659 in
  Playwright's device profile) fold the window: two strips in multiples of the 90 px tick step are cut
  around the crosshair band, the field crops, the rest slides up in 0.7 s. Checked in WebKit on
  iPhone 15 / SE / Pixel 7 profiles and a 1280×720 desktop; e2e and all fallbacks pass locally and
  on production (deploy a176b212).
- 21:10 — Scene contract v1.1 (same text as on `scene/peel-v2`): clarifications from the peel v1
  report, `assembleRect` may run past the canvas, chrome may keep short history. No breaking change;
  the shell already passes a full-bleed `assembleRect` and the canvas aspect to `setProjection`.
- 23:20 — peel v2 (Fable run 2, commit c3778a3, 23 checks green in WebKit, Chromium and Chromium on
  Metal) shipped beside v1: `?fx=v2` on the host page (passed on to the guest in the QR link, to
  "Pokaż komuś" and to "Wyślij link") or `#fx=v2` on a guest link. v1 stays the default.
  `scripts/build-card.sh` pins both builds. Local e2e (v1 and v2) and fallbacks (v2) pass. Finding
  from the v2 report: v1's flat frame differs from the 2D composite by up to 72/255 on edges on a GPU
  (Playwright's headless Chromium has none, so v1's checks never saw it); v2 fixes it.
- 23:35 — Scene contract v1.2 (same text as on `scene/window-v3`): optional host `setViewer(eye)`.
  The shell will relay the anchored guest's camera position to the host through the room for the
  third effect, "window"; effects without `setViewer` are unaffected.
- 2026-11-16 09:50 — Window (v3, commit 40eb8c6, 28 checks green in WebKit, Chromium and Chromium on
  Metal) and spill (v4, commit ca7869e) shipped beside peel v1/v2: `?fx=v3`, `?fx=v4`. The viewer relay
  of contract v1.2 is live: the anchored guest sends its camera position in card space (−Rᵀt of the pose)
  about 30 times a second; the host predicts it forward (at most 120 ms) and calls `setViewer`; 300 ms
  without a sample → null. Local e2e for v3: 196 samples relayed, 498 host frames driven. Fallbacks pass
  for v3 and v4; v1 e2e unchanged. v1 stays the default.
- 2026-11-16 11:00 — spill (v4) updated to 6549df7 (Fable's fix: the name sheet no longer leaves the frame at close range; distance label pinned to the start of the red line). Local e2e v4 passes.
- 2026-11-16 11:05 — Card UI in English for everyone, whatever the browser language (Eryk's decision); Polish strings kept in i18n.ts.
- 2026-11-16 12:55 — blackhole (v5, commit a91b822, 25 tests + perf green in WebKit and Chromium on Metal) shipped beside v1–v4: ?fx=v5. Uses the viewer relay (local e2e: 206 samples, 496 host frames). Fallbacks pass for v5. The opaque fill covers the lower 0.44 of the guest canvas during explode (brief over the contract's transparent canvas; tracking reads the video, not the canvas, so it is unaffected).
- 2026-11-16 13:05 — Default build switched to v5 (blackhole) on Eryk's word; v1–v4 stay reachable with ?fx=v1…v4.
- 2026-11-16 13:15 — 'How this card was made' text revised after a Sztuczny Miodek pass (EN and PL: linter PASS before and after; manual: two rhetorical triads and the slogan opener rewritten, facts brought up to five animation versions). Default v5 verified on production with scripts/fx-check.cjs.
- 2026-11-16 13:50 — Host page fits the phone: the bands around the fitted card take the card's background layer (scaled to the screen height, repeated sideways); a web app manifest and Apple meta tags let /k/host/ open full screen from the Home Screen (standalone, translucent status bar).
- 2026-11-16 13:55 — Host opened from the Home Screen: canvases sized to the whole screen (iOS reported a viewport shorter than the screen under the translucent status bar, so the fitted card left bands).
- 2026-11-16 14:00 — Pages marked translate="no" and <meta name="google" content="notranslate">: Chrome on a Polish Android translated the English guest page back into Polish.
- 2026-11-16 14:05 — Card design: thin red layout guides (margins, centre, field top/bottom, contact bottom) and a top ruler added to the grid layer in Figma (layer count unchanged: the contract allows at most 8 and the card has 8). Local e2e (v5) passes, tracking unaffected.
- 2026-11-16 14:10 — blackhole (v5) ribbons a touch faster (b784f95): travel 1.3 s instead of 1.5 s, feed 0.40 + 0.26 × side; local e2e passes.
- 2026-11-16 14:10 — vCard: phone number added; the website in the vCard is now the short https://hretheum.com/k/web, which the worker redirects (302) to the UTM-tagged home page (utm_content=qr).
- 2026-11-16 14:15 — vCard: a second URL labelled "Source code" (https://hretheum.com/k/code). The repo is private until the open-source check, so /k/code redirects to /k/jak/ for now; switch CODE_URL in worker/src/index.ts to the GitHub repo at publication.
- 2026-11-16 14:20 — vCard "Source code" points straight at https://github.com/hretheum/layercard (Eryk opens the repo to the public before the event); /k/code redirects there too.
- 2026-11-16 14:20 — The contact card is served by the worker with a "We met" date (the day it is saved, Europe/Warsaw) and, on 2026-11-17 only, "Met at: Figma Maker Collective, Warsaw". No photo (Eryk's decision after the vCard tests; test files removed).

## 2026-11-16 21:31 — counter reset before the event (scheduled task)

- `STATS_NAME = "event-2026-11-17"` in worker/wrangler.toml (was "global").
- Build: scripts/build-card.sh, default v5 blackhole b784f95 (the faster-ribbons fix that replaced a91b822), v1 c558f97, v2 c3778a3, v3 40eb8c6, v4 6549df7. Includes the guest-page work of 16.11: Ganiri film with voice-over (pause, sound on, captions under the film) and "Make it my card" (the passer's own card drawn on the phone, credit to Eryk).
- Deployed: worker version 867be9c8-31ad-4e0b-a5c3-eda395fd9736.
- Checks: /k/api/stats → {"phones":0,"longest":0}; scripts/fx-check.cjs → /k/host/ and ?fx=v5 load blackhole, ?fx=v2 peel, ?fx=v3 window, ?fx=v4 spill. No e2e on production afterwards.
