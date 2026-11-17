// Shared marker layout for the tracking spike (host draws it, guest expects it).

export const CARD = { w: 1170, h: 2532 };
export const CELLS = 8; // 1 quiet + 1 black border + 4 bits + 1 black border + 1 quiet

export interface MarkerSlot { id: number; x: number; y: number; s: number } // design px, outer square incl. quiet zone

export function params() {
  const q = new URLSearchParams(location.search);
  return {
    size: parseFloat(q.get("size") ?? "0.22"),   // marker slot size as a fraction of card width
    inset: parseFloat(q.get("inset") ?? "0.035"),
    proc: parseInt(q.get("proc") ?? "960", 10),  // processing resolution, long side in px
    res: parseInt(q.get("res") ?? "720", 10),    // requested camera resolution, short side
    fov: parseFloat(q.get("fov") ?? "65"),       // vertical field of view guess in degrees (portrait)
    layout: (q.get("layout") ?? "corners") as "corners" | "big" | "both",
    big: parseFloat(q.get("big") ?? "0.5"),      // single bottom marker size as a fraction of card width
  };
}

export function slotsFor(p: ReturnType<typeof params>): MarkerSlot[] {
  const big = bigSlot(p.big, p.inset);
  if (p.layout === "big") return [big];
  if (p.layout === "both") return [...markerSlots(p.size, p.inset), big];
  return markerSlots(p.size, p.inset);
}

/** One large marker centred near the bottom of the card (where the QR sits before it dissolves). */
export function bigSlot(sizeFrac: number, insetFrac: number): MarkerSlot {
  const s = Math.round(CARD.w * sizeFrac);
  const m = Math.round(CARD.w * insetFrac * 3);
  return { id: 5, x: Math.round((CARD.w - s) / 2), y: CARD.h - m - s, s };
}

export function markerSlots(sizeFrac: number, insetFrac: number): MarkerSlot[] {
  const s = Math.round(CARD.w * sizeFrac);
  const m = Math.round(CARD.w * insetFrac);
  return [
    { id: 1, x: m, y: m, s },
    { id: 2, x: CARD.w - m - s, y: m, s },
    { id: 3, x: CARD.w - m - s, y: CARD.h - m - s, s },
    { id: 4, x: m, y: CARD.h - m - s, s },
  ];
}

/** Corners of the black marker square in card units (origin at card centre, +x right, +y up,
 *  card width = 1). Order matches js-aruco: TL, TR, BR, BL of the marker as drawn. */
export function markerCornersCardUnits(slot: MarkerSlot): [number, number][] {
  const c = slot.s / CELLS;
  const x0 = slot.x + c, y0 = slot.y + c, x1 = slot.x + slot.s - c, y1 = slot.y + slot.s - c;
  const u = (x: number, y: number): [number, number] => [(x - CARD.w / 2) / CARD.w, -(y - CARD.h / 2) / CARD.w];
  return [u(x0, y0), u(x1, y0), u(x1, y1), u(x0, y1)];
}

export const CARD_ASPECT = CARD.h / CARD.w; // card height in card units
