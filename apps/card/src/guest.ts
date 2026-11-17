// Guest view: joins the host's room from the QR link, tracks the host screen with the camera, plays the
// peel anchored above it (or unanchored), then lands on the assembled card with contact and sharing.
// Without a room (shared link, expired room, busy host) it plays the card on its own screen.
import "./fonts";
import "./styles.css";
import { loadContent } from "./content";
import { passerFromUrl } from "./pass";
import { personalize } from "./personalize";
import { fx, quality, reduced } from "./effect";
import { markerCorners, MARKER_ID } from "./marker";
import { newClientId, RoomClient } from "./room";
import { t } from "./i18n";
import { renderCard } from "./ui";
import { viewerSender } from "./viewer";
import type { Handle } from "../../../packages/scene/types";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>("scene");
const video = $<HTMLVideoElement>("video");
const intro = $("intro");
const action = $<HTMLButtonElement>("action");
const hint = $("hint");
const page = $("page");

const hash = new URLSearchParams(location.hash.slice(1));
const [roomId, gRaw] = (hash.get("r") ?? "").split(".");
const g = Math.max(0, parseInt(gRaw ?? "0", 10) || 0);
const me = newClientId();

document.body.classList.add("guest");
document.documentElement.classList.add("busy"); // no scrolling until the card has landed: the landing rect must hold
const passer = passerFromUrl(); // a passed-on card: the passer's own card, drawn on this phone
const content = passer ? await personalize(await loadContent(), passer) : await loadContent();
const { manifest, profile } = content;
$("owner").textContent = t.cardOf(profile.owner);
$("note").textContent = t.cameraNote;

// Lay out the card page first (invisible) so the landing rect is known before the scene mounts.
const card = renderCard(page, content, g);
const rect = card.screen.getBoundingClientRect();
const dur = fx.durations(manifest);
let scene: Handle | null = null;

type Mode = "waiting" | "room" | "solo";
let mode: Mode = roomId ? "waiting" : "solo";
let room: RoomClient | null = null;
let startAt: number | null = null;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
action.hidden = true; // no tap needed: the only taps are opening the link and allowing the camera
$("owner").textContent = `${t.cardOf(profile.owner)} · ${t.aimHint}`;

async function ensureScene() {
  if (scene) return scene;
  scene = await fx.mount(canvas, { role: "guest", layers: manifest, baseUrl: content.base, quality: quality(), reduced: reduced(), assembleRect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height } });
  return scene;
}

let sender: ReturnType<typeof viewerSender> | null = null;
type Cam = { tracker: import("./tracker").Tracker; anchored: () => boolean; startedAt: number };

/** Starts the camera right away. If the browser insists on a tap first, asks for exactly one. */
async function startCamera(s: Handle): Promise<Cam | null> {
  const { Tracker } = await import("./tracker");
  let anchored = false;
  const stats = { results: 0, locked: 0, side: 0, ms: 0 };
  (window as any).__track = stats;
  const make = () => new Tracker(video, markerCorners(manifest), MARKER_ID, (pose, info) => {
    stats.results++; if (info.locked) stats.locked++; stats.side = Math.round(info.sidePx); stats.ms = Math.round(info.detectMs);
    if (pose) { s.setPose(pose); anchored = true; if (room && typeof s.setViewer === "function") (sender ??= viewerSender(room, me)).pose(pose); }
    hint.textContent = info.locked ? (info.sidePx < 70 ? t.closer : "") : t.aimHint;
  });
  const attempt = async () => { const tr = make(); await tr.start(); return tr; };
  let tracker: import("./tracker").Tracker;
  const t0 = performance.now();
  try {
    tracker = await attempt();
  } catch {
    if (performance.now() - t0 > 400) return null; // the person said no: continue without the camera
    action.hidden = false; action.disabled = false; action.textContent = t.enableCamera;
    const tapped = await Promise.race([
      new Promise<boolean>((r) => (action.onclick = () => r(true))),
      sleep(6000).then(() => false), // nobody tapped: go on without the camera
    ]);
    action.hidden = true;
    if (!tapped) return null;
    try { tracker = await attempt(); } catch { return null; }
  }
  document.body.classList.add("camera");
  const applyProjection = () => { const p = tracker.projection(innerWidth, innerHeight); s.setProjection(p.fovY, p.aspect); };
  applyProjection();
  addEventListener("resize", applyProjection);
  intro.hidden = true;
  hint.hidden = false;
  if (!anchored) hint.textContent = t.aimHint;
  return { tracker, anchored: () => anchored, startedAt: performance.now() };
}

async function runSolo(s: Handle) {
  intro.hidden = true;
  await s.play("explode");
  await land(s);
}

async function runRoom(s: Handle, cam: Cam | null) {
  if (cam) while (!cam.anchored() && performance.now() - cam.startedAt < 2000) await sleep(50);
  const anchored = !!cam?.anchored();
  if (!anchored) s.setPose(null);
  intro.hidden = true;
  room!.send({ type: "ready", id: me, anchored });
  const t1 = performance.now();
  let resent = false;
  while (startAt === null && performance.now() - t1 < 6000) {
    await sleep(50);
    if (!resent && performance.now() - t1 > 2500) { resent = true; room!.send({ type: "ready", id: me, anchored }); }
  }
  await s.play("explode", { at: startAt ?? performance.now() });
  hint.hidden = true;
  cam?.tracker.stop();
  sender?.stop();
  document.body.classList.remove("camera");
  await land(s, () => room!.send({ type: "assembled", id: me }));
}

async function land(s: Handle, onAssembled?: () => void) {
  await s.play("fly");
  await s.play("assemble");
  onAssembled?.(); // tell the host first: the page may be closed right after it appears
  page.classList.add("shown");
  await sleep(180);
  canvas.classList.add("gone");
  s.dispose();
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", manifest.card.background);
  await sleep(160);
  await card.settle(); // fold the card window if the screen is shorter than the card
  document.documentElement.classList.remove("busy");
  page.classList.add("revealed");
}

async function main() {
  const s = await ensureScene();
  if (!(roomId && /^[a-z0-9]{6,32}$/.test(roomId))) { await sleep(400); return runSolo(s); }
  room = new RoomClient(roomId, "guest");
  const welcomed = new Promise<boolean>((res) => {
    room!.on("welcome", (m) => { if (m.to === me) res(true); });
    room!.on("busy", (m) => { if (m.to === me) res(false); });
    setTimeout(() => res(false), 3500);
  });
  room.on("open", () => room!.send({ type: "hello", role: "guest", id: me, g }));
  room.on("start", (m) => { if (m.to === me) startAt = room!.toLocal(m.at); });
  addEventListener("pagehide", () => room?.send({ type: "bye", id: me }));
  const camP = startCamera(s); // ask for the camera while the host answers
  if (!(await welcomed)) { (await camP)?.tracker.stop(); document.body.classList.remove("camera"); hint.hidden = true; return runSolo(s); }
  await runRoom(s, await camP);
}

main();
void dur;
