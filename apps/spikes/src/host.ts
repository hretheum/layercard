// Tracking spike, host side: draws a placeholder card with four ArUco 4x4 markers in the corners.
import { CARD, CELLS, params, slotsFor } from "./layout";

declare const AR: any;

const p = params();
const canvas = document.getElementById("c") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const dict = new AR.Dictionary("ARUCO_4X4_1000");

function draw() {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const vw = window.innerWidth, vh = window.innerHeight;
  canvas.width = Math.round(vw * dpr);
  canvas.height = Math.round(vh * dpr);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#0F1216";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // contain-fit the card
  const scale = Math.min(canvas.width / CARD.w, canvas.height / CARD.h);
  const ox = (canvas.width - CARD.w * scale) / 2, oy = (canvas.height - CARD.h * scale) / 2;
  ctx.setTransform(scale, 0, 0, scale, ox, oy);

  ctx.fillStyle = "#1B2230";
  ctx.fillRect(0, 0, CARD.w, CARD.h);
  ctx.fillStyle = "#F4F6F8";
  ctx.font = "700 150px Helvetica, Arial, sans-serif";
  ctx.fillText("Jane Maker", 135, 1560);
  ctx.fillStyle = "#A9B1BC";
  ctx.font = "56px Helvetica, Arial, sans-serif";
  ctx.fillText(`tracking test · ${p.layout}`, 135, 1680);

  for (const slot of slotsFor(p)) {
    const c = slot.s / CELLS;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(slot.x, slot.y, slot.s, slot.s);
    ctx.fillStyle = "#000000";
    ctx.fillRect(slot.x + c, slot.y + c, c * 6, c * 6);
    const bits: string = dict.codeList[slot.id];
    ctx.fillStyle = "#FFFFFF";
    for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) {
      if (bits[r * 4 + k] === "1") ctx.fillRect(slot.x + c * (2 + k), slot.y + c * (2 + r), c + 0.5, c + 0.5);
    }
  }
}

let lock: any = null;
async function keepAwake() {
  try { lock = await (navigator as any).wakeLock?.request("screen"); } catch { /* ignore */ }
}
document.addEventListener("click", keepAwake);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") keepAwake(); });
window.addEventListener("resize", draw);
draw();
