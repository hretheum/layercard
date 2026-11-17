# layercard

A phone business card that comes apart into its design layers.

Someone scans the code on your screen and points their camera at your phone. The layers of your card
peel off your screen, hover above your phone as an exploded, labelled stack, then fly into their phone
and lock back together into the card, with your contact underneath. Anyone who has the card can show
it to the next person from their own phone.

It ran live as the author's business card at Figma Maker Collective in Warsaw on 17 November 2026
(hretheum.com/k). The code here is the state from that day.

## How it works

```
host phone (your card)                 Cloudflare Worker                 guest phone
──────────────────────                 ─────────────────                 ───────────
card + QR (room link)    ── hello ──►  room (Durable Object)  ◄── scan ── opens /k/#r=<room>
QR dissolves, marker on  ◄─ welcome ─  relays, answers clock  ─────────►  camera + tracker
                                        pings, counts phones              finds the marker,
depart (layers leave)    ◄── start {at: server time} ──►                  explode above your phone
outlines remain                                                           fly → assemble → card page
rebuild                  ◄─ assembled ─
```

- **Scene contract** (`packages/scene/CONTRACT.md`): an effect only draws. It gets the layer manifest,
  a role (host or guest), a timeline to play from a given time, the device tilt and, on the guest,
  the pose of the host screen. Both phones play the same choreography from the same server time.
- **Effects** live in `packages/scene/effects/<name>/`, each with its brief (`PROMPT.md`), run log,
  checks and a committed `dist/`. `minimal` is a plain reference. The five shipped effects, each built
  in a long autonomous run by Claude Fable 5.2 against the same contract:
  `peel-v1` and `peel-v2` (an acrylic exploded view, two runs), `window` (the host screen becomes a
  window into a room behind it), `spill` (the layers spill out into the room) and `blackhole` (the card
  is pulled into the guest's phone). The card picks one with `?fx=v1…v5`; `v5` is the default.
- **Make it my card**: a guest can put their own LinkedIn on the card and pass it on as their own card.
  The name, role and contact layers are drawn on the phone (`apps/card/src/personalize.ts`); the data
  travels only in the link, nothing is stored.
- **Tracking**: one ArUco 4×4 marker appears where the QR code was, after it dissolves. Detection runs
  in a Web Worker (js-aruco2); after the first lock only a region around the marker is scanned at full
  resolution. A homography gives the pose of the host screen.
- **Rooms**: a Cloudflare Worker with a Durable Object per room relays a handful of messages and keeps
  the clocks in sync. Nothing is stored about people; a second Durable Object keeps two counters
  (phones reached, longest chain).
- **Fallbacks**: no camera, refused camera, busy host or an old link all still end on the card page.

## Run it

```sh
npm install
npm run example:layers                    # builds the fictional example card (examples/jane-maker)
scripts/build-card.sh                     # builds the card app with all five effects into worker/public/k
(cd worker && npx wrangler dev)           # rooms + static files on http://127.0.0.1:8787
open http://127.0.0.1:8787/k/host/        # the host; scan its QR from a phone on the same network
```

A phone camera only works over HTTPS. For a quick test from a phone, expose the local worker with a
temporary tunnel, for example `cloudflared tunnel --url http://localhost:8787`.

## Make it yours

- **Your card**: a folder with `layers.json` (manifest), `layers/*.png`, `profile.json` and a vCard;
  build with `LAYERCARD_CONTENT=/path/to/folder`. Keep personal content out of the repository.
- **Your effect**: copy `packages/scene/effects/minimal`, implement the contract, build with
  `LAYERCARD_EFFECT=<name>` (or `LAYERCARD_EFFECT_ENTRY=/path/to/effect.js`).
- **Your domain**: set `routes` in `worker/wrangler.toml` and run `npx wrangler deploy`.

## Checks

- `apps/card/checks/e2e.mjs` — host and guest in headless Chrome with a fake camera made from the host
  screen; the guest must track the marker and land on the card.
- `apps/card/checks/fallbacks.mjs` — link without a room, stale room, busy host, refused camera.

## Licence

MIT, see `LICENSE`: use it, change it, sell it, ship it, as long as the copyright notice with my name
stays with the code. If you build a card or anything else on it, a line like "card format by
Eryk Orłowski (hretheum.com)" is appreciated. Third-party code and fonts keep their own licences
(listed below).

## Credits

three.js (MIT), js-aruco2 (MIT, with BSD-licensed ArUco dictionaries), qrcode (MIT), Archivo and
Atkinson Hyperlegible (SIL OFL 1.1).

## Support

This is a personal experiment shared as is: no support, no consulting, no custom work. Issues and
discussions are welcome.
