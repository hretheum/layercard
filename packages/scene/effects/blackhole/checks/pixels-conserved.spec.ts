// A9 — every layer is accounted for at every sampled moment, and never in two places at once.
// Three places: the host (rows at rest, in the neck, in the stub up to the glass), the air (the ribbon
// between the glass and the guest's screen), the level in the guest's screen.
//  1. From the state: on both devices every layer's shares host + air + level are 1, both devices
//     hold the same shares, and each of 33 rows of every layer is in exactly one place.
//  2. From the pixels: one layer at a time is drawn in test colours (red = which row of the layer,
//     green = how far along the ribbon path). The rows seen on the host canvas, in the guest's
//     ribbons and in the guest's level do not overlap by more than the width of the cut, and every
//     row seen in a place is a row the state puts there.
import { expect, test } from "@playwright/test";
import { noPageErrors, openStage, record } from "./util";

const BINS = 32;

test("pixels-conserved: host + air + level = 1 for every layer, and no row is drawn in two places", async ({ page }) => {
  test.setTimeout(600_000);
  await openStage(page);
  const r = await page.evaluate(async (BINS) => {
    const d = (window as any).demo;
    const D = d.durations();
    const out: Record<string, unknown> = {};
    // which rows (bins of the material coordinate) a canvas shows, split by where the probe says they are
    const rows = (id: "host" | "guest", stubG: number) => {
      const p = d.pixels(id) as ImageData, card = new Set<number>(), air = new Set<number>(), level = new Set<number>();
      let n = 0;
      for (let i = 0; i < p.data.length; i += 4) {
        if (p.data[i + 3] !== 255) continue;
        n++;
        const bin = Math.min(BINS - 1, Math.floor((p.data[i] / 255) * BINS)), g = p.data[i + 1];
        if (g === 255 && p.data[i + 2] === 255) level.add(bin);
        // the air is drawn with blue 255; a pixel past the glass with less is an edge where the ribbon blends with the
        // part of its own strip it passes over (the guest alone draws both on one canvas): it names no row
        else if (g > stubG) { if (p.data[i + 2] === 255) air.add(bin); }
        else card.add(bin);
      }
      return { card, air, level, n };
    };
    const overlap = (a: Set<number>, b: Set<number>) => [...a].filter((x) => b.has(x)).length;
    for (const pose of [[20, 6, 5.6], null] as (number[] | null)[]) {
      d.setPose(...(pose ?? [null]));
      let moments = 0, sumOff = 0, differ = 0, rowTwice = 0, rowNowhere = 0, probes = 0;
      let hostAir = 0, airLevel = 0, hostLevel = 0, strayHost = 0, strayAir = 0, strayLevel = 0, pixels = 0;
      let seenHost = 0, seenAir = 0, seenLevel = 0;
      const offenders: unknown[] = [];
      const times: [string, number][] = [];
      for (let i = 0; i <= 18; i++) times.push(["explode", (D.explode * i) / 18]);
      for (let i = 1; i <= 5; i++) times.push(["fly", (D.fly * i) / 5]);
      for (const [tl, t] of times) {
        d.setProbe(false);
        d.setOnly(null);
        // the host has no fly: its event has ended, everything it had has left
        d.seek(["depart", tl === "explode" ? t : 1e3], [tl, t]);
        const info = d.info(), hs = info.host.sheets.filter((s: any) => !s.qr), gs = info.guest.sheets.filter((s: any) => !s.qr);
        const stubT = 1.5 * Math.pow(0.055, 1 / 1.2), travel = 1.5;
        moments++;
        for (let k = 0; k < gs.length; k++) {
          const g = gs[k], h = hs[k], feed = info.guest.feed[g.k];
          if (Math.abs(g.host + g.air + g.level - 1) > 1e-9 || Math.abs(h.host + h.air + h.level - 1) > 1e-9) sumOff++;
          if (tl === "explode" && (Math.abs(g.host - h.host) > 1e-12 || Math.abs(g.air - h.air) > 1e-12 || Math.abs(g.tau - h.tau) > 1e-12)) differ++;
          // 33 rows: each is on the host, in the air or in the level
          for (let i = 0; i <= 32; i++) {
            const tauU = g.tau - (i / 32) * feed;
            const places = [tauU <= stubT, tauU > stubT && tauU < travel, tauU >= travel].filter(Boolean).length;
            if (places > 1) rowTwice++;
            if (places < 1) rowNowhere++;
          }
        }
        // the pixels, one layer at a time, every third moment
        if (moments % 3 !== 1) continue;
        d.setProbe(true);
        for (const g of gs) {
          // the strip alone, then the layer in the level alone (drawn together their edges would blend into rows that are neither)
          d.setOnly("strips:" + g.id);
          // green 14 is the glass itself (5.5 % of the path): the host draws up to it, the anchored guest from it
          const host = rows("host", 15), guest = rows("guest", pose ? 13 : 14);
          d.setOnly("level:" + g.id);
          const floating = rows("guest", 14);
          probes++;
          pixels += host.n + guest.n + floating.n;
          // anchored: the host canvas holds what is at or behind the glass, the guest canvas the rest.
          // alone: the guest canvas holds all three
          const onHost = pose ? host.card : guest.card, inAir = guest.air, inLevel = floating.level;
          if (guest.level.size + floating.card.size + floating.air.size > 0) strayLevel++;
          if (pose) {
            // the host never draws the air or the level; the guest never draws the card
            if (host.air.size + host.level.size > 0) strayHost++;
            if (guest.card.size > 0) strayAir++;
          }
          if (overlap(onHost, inAir) > 2) { hostAir++; offenders.push({ tl, t, id: g.id, place: "host+air", host: [...onHost].sort((x, y) => x - y), air: [...inAir].sort((x, y) => x - y) }); }
          if (overlap(inAir, inLevel) > 2) { airLevel++; offenders.push({ tl, t, id: g.id, place: "air+level", air: [...inAir].sort((x, y) => x - y), level: [...inLevel].sort((x, y) => x - y) }); }
          if (overlap(onHost, inLevel) > 1) hostLevel++;
          // every row seen in a place is a row the state puts there (one bin of slack at each end)
          const lo = (share: number) => Math.floor(share * BINS) - 1, hi = (share: number) => Math.ceil(share * BINS);
          const crossed = g.air + g.level, arrived = g.level;
          for (const b of onHost) if (b < lo(crossed)) { strayHost++; offenders.push({ tl, t, id: g.id, place: "host", bin: b, crossed, arrived }); }
          for (const b of inAir) if (b < lo(arrived) || b > hi(crossed)) { strayAir++; offenders.push({ tl, t, id: g.id, place: "air", bin: b, crossed, arrived }); }
          for (const b of inLevel) if (b > hi(arrived)) { strayLevel++; offenders.push({ tl, t, id: g.id, place: "level", bin: b, crossed, arrived }); }
          seenHost += onHost.size; seenAir += inAir.size; seenLevel += inLevel.size;
        }
      }
      d.setProbe(false);
      d.setOnly(null);
      out[pose ? "anchored" : "unanchored"] = {
        moments, layers: 6, sharesNotOne: sumOff, devicesDiffer: differ, rowsInTwoPlaces: rowTwice, rowsNowhere: rowNowhere,
        probes, opaquePixelsRead: pixels, rowBinsSeen: { host: seenHost, air: seenAir, level: seenLevel },
        overlaps: { hostAndAir: hostAir, airAndLevel: airLevel, hostAndLevel: hostLevel },
        rowsSeenWhereTheStateDoesNotPutThem: { host: strayHost, air: strayAir, level: strayLevel }, offenders,
      };
    }
    return out;
  }, BINS) as Record<string, any>;
  record("pixels-conserved", { bins: BINS, ...r });
  for (const v of Object.values(r)) {
    expect(v).toMatchObject({ sharesNotOne: 0, devicesDiffer: 0, rowsInTwoPlaces: 0, rowsNowhere: 0 });
    expect(v.overlaps).toEqual({ hostAndAir: 0, airAndLevel: 0, hostAndLevel: 0 });
    expect(v.rowsSeenWhereTheStateDoesNotPutThem).toEqual({ host: 0, air: 0, level: 0 });
    // the check saw all three places in the pixels
    expect(v.rowBinsSeen.host).toBeGreaterThan(200);
    expect(v.rowBinsSeen.air).toBeGreaterThan(60);
    expect(v.rowBinsSeen.level).toBeGreaterThan(200);
  }
  noPageErrors(page);
});
