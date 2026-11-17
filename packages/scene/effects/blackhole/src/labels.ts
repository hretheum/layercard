// Labels that ride the ribbons (guest): each layer's block (chip + dims pill) sits beside a point of
// its ribbon on a short leader. The stateless layout is a function of the anchors; what is drawn
// follows it on a short history, so a jittering pose does not shake the text (contract v1.1: the
// selection chrome may keep short history; `seek` clears it and the history settles within 0.3 s).

export interface RibbonLabel {
  /** inputs, set every frame: wanted, opacity from the schedule, the anchor on the ribbon (CSS px), the side the block hangs on */
  on: boolean; alpha: number; ax: number; ay: number; side: number;
  /** block size, CSS px */
  bw: number; bh: number;
  /** stateless target of the block's top-left corner */
  tx: number; ty: number;
  /** what is drawn: the block's top-left corner and the leader's start on the ribbon */
  x: number; y: number; lx: number; ly: number;
  /** the block had a place in the previous frame */
  held: boolean;
}

export function makeLabel(side: number): RibbonLabel {
  return { on: false, alpha: 0, ax: 0, ay: 0, side, bw: 0, bh: 0, tx: 0, ty: 0, x: 0, y: 0, lx: 0, ly: 0, held: false };
}

/** Distance between a ribbon and its block, and how far the block sits above the anchor's height. */
export const REACH = 26;
export const RISE = 14;
/** Time constant of the follow, seconds: 0.13 % of a step is left after 0.3 s, and a block within half a pixel of its target is put on it. */
export const FOLLOW = 0.045;

/**
 * Lays the blocks out and eases what is drawn towards the layout. `dt` is the time since the previous
 * frame; 0 (a seek, the first frame) puts every block on its target. Returns true when everything
 * drawn is on its target (nothing left to ease).
 */
export function layoutRibbonLabels(L: RibbonLabel[], cw: number, ch: number, mx: number, my: number, dt: number, still: boolean): boolean {
  // stateless targets: beside the anchor, kept inside the margins
  for (const l of L) {
    if (!l.on) continue;
    let side = l.side;
    // a block that does not fit on its side hangs on the other
    if (side > 0 && l.ax + REACH + l.bw > cw - mx) side = -1;
    else if (side < 0 && l.ax - REACH - l.bw < mx) side = 1;
    l.tx = side > 0 ? l.ax + REACH : l.ax - REACH - l.bw;
    l.ty = l.ay - RISE - l.bh / 2;
    l.tx = Math.min(Math.max(l.tx, mx), cw - mx - l.bw);
    l.ty = Math.min(Math.max(l.ty, my), ch - my - l.bh);
  }
  // blocks never overlap: a later block steps below an earlier one it would touch
  for (let i = 0; i < L.length; i++) {
    const a = L[i];
    if (!a.on) continue;
    for (let j = 0; j < i; j++) {
      const b = L[j];
      if (!b.on) continue;
      if (a.tx < b.tx + b.bw + 4 && b.tx < a.tx + a.bw + 4 && a.ty < b.ty + b.bh + 4 && b.ty < a.ty + a.bh + 4) {
        a.ty = Math.min(b.ty + b.bh + 4, ch - my - a.bh);
      }
    }
  }
  let settled = true;
  const k = dt > 0 && !still ? 1 - Math.exp(-dt / FOLLOW) : 1;
  for (const l of L) {
    if (!l.on) { l.held = false; continue; }
    if (!l.held || k >= 1) {
      l.x = l.tx; l.y = l.ty; l.lx = l.ax; l.ly = l.ay;
    } else {
      l.x += (l.tx - l.x) * k; l.y += (l.ty - l.y) * k;
      l.lx += (l.ax - l.lx) * k; l.ly += (l.ay - l.ly) * k;
      if (Math.abs(l.tx - l.x) < 0.5 && Math.abs(l.ty - l.y) < 0.5) { l.x = l.tx; l.y = l.ty; }
      if (Math.abs(l.ax - l.lx) < 0.5 && Math.abs(l.ay - l.ly) < 0.5) { l.lx = l.ax; l.ly = l.ay; }
      if (l.x !== l.tx || l.y !== l.ty || l.lx !== l.ax || l.ly !== l.ay) settled = false;
    }
    l.held = true;
  }
  return settled;
}
