// Host view: the card on the phone that is shown to someone. Waits for a guest in its room, dissolves
// the QR, shows the tracking marker, plays the peel in sync with the guest, then rebuilds.
import QRCode from "qrcode";
import { inheritedUtm } from "./utm";
import "./styles.css";
import { loadContent } from "./content";
import { fx, fxName, fxParam, quality, reduced } from "./effect";
import { drawMarker } from "./marker";
import { newRoomId, RoomClient } from "./room";
import { viewerReceiver } from "./viewer";
import { t } from "./i18n";
import { passerFromUrl, passerParam } from "./pass";
import { personalize } from "./personalize";

const BASE = import.meta.env.BASE_URL;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>("scene");
const markerCanvas = $<HTMLCanvasElement>("marker");
const startBtn = $<HTMLButtonElement>("start");
const dot = $("dot");

const g = Math.max(0, parseInt(new URLSearchParams(location.search).get("g") ?? "0", 10) || 0);
const roomId = newRoomId();
if (fxParam) { // a non-default build: say so in a corner, quietly, so two phones can be compared
  const tag = document.createElement("div");
  tag.id = "fxtag"; tag.textContent = fxName;
  document.body.append(tag);
}
const inherited = inheritedUtm(location.search); // the guest link carries the source of this page, so a chain is attributed to where it started
const passer = passerFromUrl(); // the guest who is passing the card on, with their own LinkedIn on it
const guestUrl = `${location.origin}${BASE}${inherited ? `?${inherited}` : ""}#r=${roomId}.${g}${fxParam ? `&${fxParam}` : ""}${passer ? `&${passerParam(passer)}` : ""}`;

const content = passer ? await personalize(await loadContent(), passer) : await loadContent(); // the passer shows their own card
const manifest = structuredClone(content.manifest);
const qr = manifest.layers.find((l) => l.role === "qr");
if (qr) {
  qr.src = await QRCode.toDataURL(guestUrl, {
    margin: 2, width: qr.rect.w, errorCorrectionLevel: "M", color: { dark: "#0F1216", light: "#F4F6F8" },
  });
}

const dur = fx.durations(manifest);
// Opened from the Home Screen (full screen), iOS reports a viewport shorter than the screen under a translucent
// status bar; size the canvases to the whole physical screen so the card fills it edge to edge.
const standalone = (navigator as any).standalone === true || matchMedia("(display-mode: standalone)").matches;
if (standalone) {
  const fit = () => {
    const portrait = innerHeight >= innerWidth;
    const h = portrait ? Math.max(screen.height, screen.width) : Math.min(screen.height, screen.width);
    document.documentElement.style.setProperty("--host-h", `${h}px`);
    document.body.style.height = `${h}px`;
  };
  fit();
  addEventListener("resize", fit);
}
// the space around the fitted card takes the card's own colour, so the card meets the screen edges without bands
{
  const bg = manifest.layers.find((l) => l.z === 0 && l.rect.w === manifest.card.w && l.rect.h === manifest.card.h);
  // the background layer, scaled to the screen height and repeated sideways, continues the card's vertical gradient into the side bands
  document.body.style.background = bg ? `${manifest.card.background} url("${new URL(bg.src, content.base).href}") center / auto 100% repeat-x` : manifest.card.background;
}
document.querySelector('meta[name="theme-color"]')?.setAttribute("content", manifest.card.background);
const scene = await fx.mount(canvas, { role: "host", layers: manifest, baseUrl: content.base, quality: quality(), reduced: reduced() });
scene.play("idle");

let markerOn = false;
const paintMarker = () => drawMarker(markerCanvas, manifest, markerOn);
paintMarker();
addEventListener("resize", paintMarker);

// --- sensors and wake lock (need one tap on iOS) ---
let neutral: { b: number; g: number } | null = null;
function onOrientation(e: DeviceOrientationEvent) {
  if (e.beta == null || e.gamma == null) return;
  if (!neutral) neutral = { b: e.beta, g: e.gamma };
  scene.setTilt((e.gamma - neutral.g) / 25, (e.beta - neutral.b) / 25);
}
let wake: any = null;
async function keepAwake() { try { wake = await (navigator as any).wakeLock?.request("screen"); } catch { /* not available */ } }
startBtn.textContent = t.hostStart;
setTimeout(() => startBtn.classList.add("dim"), 6000);
startBtn.onclick = async () => {
  startBtn.hidden = true;
  const DOE = DeviceOrientationEvent as any;
  try { if (typeof DOE?.requestPermission === "function") await DOE.requestPermission(); } catch { /* denied */ }
  addEventListener("deviceorientation", onOrientation);
  keepAwake();
};
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && !startBtn.hidden) return; if (document.visibilityState === "visible") keepAwake(); });

// --- room choreography ---
type State = "idle" | "connected" | "playing" | "rebuilding";
let state: State = "idle";
let guest: string | null = null;
let fallback = 0;
const room = new RoomClient(roomId, "host");
// v1.2 effects (window) render the host screen for the anchored guest's eye.
const viewer = viewerReceiver(room, scene, (id) => id === guest);
room.on("open", () => { dot.dataset.on = "1"; });
room.on("close", () => { dot.dataset.on = "0"; });

room.on("hello", (m) => {
  if (m.role !== "guest") return;
  if (state !== "idle" && guest !== m.id) { room.send({ type: "busy", to: m.id }); return; }
  guest = m.id;
  room.send({ type: "welcome", to: m.id });
  if (state !== "idle") return;
  state = "connected";
  scene.play("connect").then(() => { if (state === "connected" || state === "playing") { markerOn = true; paintMarker(); } });
  armFallback(60_000);
});

room.on("ready", (m) => {
  if (m.id !== guest || state !== "connected") return;
  state = "playing";
  const at = room.serverNow() + 700;
  room.send({ type: "start", to: guest, at });
  scene.play("depart", { at: room.toLocal(at) });
  armFallback((dur.depart + dur.fly + dur.assemble) * 1000 + 15_000);
});

room.on("assembled", (m) => { if (m.id === guest) rebuild(); });
room.on("bye", (m) => { if (m.id === guest) rebuild(); });

function armFallback(ms: number) { clearTimeout(fallback); fallback = window.setTimeout(rebuild, ms); }

function rebuild() {
  viewer.reset();
  if (state === "idle" || state === "rebuilding") return;
  clearTimeout(fallback);
  state = "rebuilding";
  markerOn = false; paintMarker();
  scene.play("rebuild").then(() => { scene.play("idle"); state = "idle"; guest = null; });
}

(window as any).__layercard = { roomId, guestUrl, get state() { return state; } };
