// The guest's final screen: the card itself at full bleed (the same layers the scene just assembled),
// actions placed in the card's freed bottom zone, and the page continuing below in the card's grid.
// On screens shorter than the card, the card folds its window (see `fold` in the profile) so the
// actions fit on the first screen: strips are taken out of the window, everything below slides up.
import type { Content } from "./content";
import { L } from "./content";
import { t } from "./i18n";
import { fxParam } from "./effect";
import { inheritedUtm } from "./utm";
import { loadOwn, nameFromSlug, passerParam, saveOwn, slugFromText, type Passer } from "./pass";
import type { Rect } from "../../../packages/scene/types";

const BASE = import.meta.env.BASE_URL;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const svg = (body: string, size = 20) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const ICON = {
  connect: svg('<circle cx="9" cy="8" r="4"/><path d="M2 21c0-3.9 3.1-7 7-7s7 3.1 7 7"/><path d="M19 8v6M16 11h6"/>'),
  card: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="11" r="2.5"/><path d="M5.5 17c.6-1.8 2-2.8 3.5-2.8s2.9 1 3.5 2.8M15 9h3M15 13h3"/>'),
  phones: svg('<rect x="2" y="4" width="8" height="15" rx="1.5"/><rect x="14" y="4" width="8" height="15" rx="1.5"/><path d="M10.5 11.5h3"/>', 18),
  share: svg('<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>', 18),
  down: svg('<path d="M12 5v14M6 13l6 6 6-6"/>', 14),
  arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>', 16),
  linkedin: '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.75h4v11H3zm7 0h3.8v1.5h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1v5.45h-4v-4.83c0-1.15-.02-2.63-1.6-2.63-1.6 0-1.85 1.25-1.85 2.55v4.91h-4z"/></svg>',
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, html?: string) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (html !== undefined) e.innerHTML = html;
  return e;
}
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

type Cut = [number, number];
/** Card y after the cut intervals (card px) are taken out. */
const mapY = (y: number, cuts: Cut[]) => cuts.reduce((d, [a, b]) => d - Math.max(0, Math.min(y, b) - a), y);

export interface CardView {
  /** The card element; its rect is where the scene assembles. */
  screen: HTMLElement;
  /** Fits the card to the visible screen (folding the window if needed). Resolves when the motion ends. */
  settle(): Promise<void>;
}

/** Builds the page into `root`. The card starts exactly as the scene's last frame. */
export function renderCard(root: HTMLElement, content: Content, g: number): CardView {
  const { profile, manifest, base } = content;
  const W = manifest.card.w, H = manifest.card.h;
  const fold = profile.fold;
  const around = fold ? manifest.layers.find((l) => l.id === fold.around) : undefined;
  const cutsFor = (r: number): Cut[] => {
    if (!fold || !around || r <= 0) return [];
    const mid = around.rect.y + around.rect.h / 2, half = fold.center / 2;
    return [[mid - half - r, mid - half], [mid + half, mid + half + r]];
  };
  root.innerHTML = "";

  // 1. the screen is the card
  const screen = el("section", { class: "screen", "aria-label": profile.owner });
  screen.style.background = manifest.card.background;
  const stage = el("div", { class: "stage" });
  screen.append(stage);

  type Item = { el: HTMLElement; rect: Rect; kind: "move" | "crop" };
  type Sliced = { box: HTMLElement; src: string; rect: Rect };
  type Piece = { el: HTMLElement; img: HTMLImageElement; rect: Rect; start: number; len: number; keep: boolean };
  const items: Item[] = [];
  const sliced: Sliced[] = [];
  let pieces: Piece[] = [];
  const crop = new Set(fold?.crop ?? []);

  for (const l of [...manifest.layers].sort((a, b) => a.z - b.z)) {
    if (l.role === "qr") continue;
    const src = new URL(l.src, base).href;
    if (crop.has(l.id)) {
      const box = el("div", { class: "crop" });
      box.append(el("img", { src, alt: "", decoding: "async", draggable: "false" }));
      stage.append(box);
      items.push({ el: box, rect: l.rect, kind: "crop" });
    } else {
      const box = el("div", { class: "sliced" });
      stage.append(box);
      sliced.push({ box, src, rect: l.rect });
    }
  }

  // the card's words live in its images; say them for screen readers and search
  screen.append(el("h1", { class: "sr" }, esc(profile.owner)), el("p", { class: "sr" }, esc(profile.role)));

  for (const h of profile.hotspots ?? []) {
    const a = el("a", { class: "hotspot", href: h.href, "aria-label": h.label });
    if (!h.href.startsWith("mailto:")) { a.target = "_blank"; a.rel = "noopener"; }
    stage.append(a);
    items.push({ el: a, rect: h.rect, kind: "move" });
  }

  const zoneSpec = profile.actionsZone ?? { x: W * 0.115, y: H * 0.725, w: W * 0.77 };
  const zone = el("div", { class: "zone reveal" });
  if (profile.contact.linkedin) {
    zone.append(el("a", { class: "btn primary", href: profile.contact.linkedin, target: "_blank", rel: "noopener" }, `${ICON.connect}<span>${esc(t.connectLinkedIn)}</span>`));
  }
  if (profile.contact.vcard) {
    zone.append(el("a", { class: `btn ${profile.contact.linkedin ? "secondary" : "primary"}`, href: new URL(profile.contact.vcard, base).href }, `${ICON.card}<span>${esc(t.saveContact)}</span>`));
  }
  const hint = el("a", { class: "hint reveal", href: "#more" }, `${ICON.down}<span>${esc(t.passTitle)}</span>`);
  stage.append(zone, hint);
  root.append(screen);

  /** Splits every sliced layer at the cut lines, so strips can collapse while the rest slides up.
   *  New pieces are decoded before they replace the old ones, so the swap never blinks. */
  async function slice(cuts: Cut[]) {
    const next: Piece[] = [];
    const boxes = new Map<HTMLElement, DocumentFragment>();
    for (const s of sliced) {
      const frag = document.createDocumentFragment();
      boxes.set(s.box, frag);
      const y0 = s.rect.y, y1 = s.rect.y + s.rect.h;
      const marks = [y0, y1, ...cuts.flat().filter((y) => y > y0 && y < y1)].sort((a, b) => a - b);
      for (let i = 0; i < marks.length - 1; i++) {
        const [a, b] = [marks[i], marks[i + 1]];
        if (b - a < 0.5) continue;
        const keep = !cuts.some(([ca, cb]) => a >= ca && b <= cb);
        const piece = el("div", { class: "piece" });
        const img = el("img", { src: s.src, alt: "", decoding: "async", draggable: "false" });
        piece.append(img);
        frag.append(piece);
        next.push({ el: piece, img, rect: s.rect, start: a - y0, len: b - a, keep });
      }
    }
    await Promise.all(next.map((p) => p.img.decode().catch(() => {})));
    for (const [box, frag] of boxes) box.replaceChildren(frag);
    pieces = next;
  }

  /** Lays everything out in px for the current width; `folded` takes the cuts out. */
  function place(cuts: Cut[], folded: boolean) {
    const s = screen.clientWidth / W;
    const c = folded ? cuts : [];
    const px = (v: number) => `${v * s}px`;
    const set = (e: HTMLElement, x: number, y: number, w: number, h: number) =>
      Object.assign(e.style, { left: px(x), top: px(y), width: px(w), height: px(h) });
    stage.style.height = px(H);
    screen.style.height = px(mapY(H, c));
    for (const it of items) {
      const top = mapY(it.rect.y, c);
      const h = it.kind === "crop" ? mapY(it.rect.y + it.rect.h, c) - top : it.rect.h;
      set(it.el, it.rect.x, top, it.rect.w, h);
    }
    for (const p of pieces) {
      set(p.el, p.rect.x, mapY(p.rect.y + p.start, c), p.rect.w, folded && !p.keep ? 0 : p.len);
      Object.assign(p.img.style, { top: px(-p.start), height: px(p.rect.h) });
    }
    const zoneTop = mapY(zoneSpec.y, c) * s;
    Object.assign(zone.style, { left: px(zoneSpec.x), top: `${zoneTop}px`, width: px(zoneSpec.w) });
    hint.style.top = `${zoneTop + zone.offsetHeight + 22}px`;
  }

  /** How much (card px, per side) the window must give up so the actions fit the visible screen. */
  function foldFor(): number {
    if (!fold || !around) return 0;
    const s = screen.clientWidth / W;
    const need = (zoneSpec.y * s + (zone.offsetHeight || 110) + 52 - innerHeight) / s;
    if (need <= 0) return 0;
    return Math.min(fold.maxSteps, Math.ceil(need / 2 / fold.step)) * fold.step;
  }

  let cuts: Cut[] = [];
  const ready = slice(cuts).then(() => place(cuts, false));
  place(cuts, false);

  let width = screen.clientWidth;
  addEventListener("resize", () => {
    if (screen.clientWidth === width) return; // ignore toolbar show/hide while scrolling
    width = screen.clientWidth;
    if (!settled) return place(cuts, false);
    cuts = cutsFor(foldFor());
    void slice(cuts).then(() => place(cuts, true));
  });

  let settled = false;
  async function settle() {
    await ready;
    const r = foldFor();
    settled = true;
    if (r === 0) return;
    cuts = cutsFor(r);
    await slice(cuts);
    place(cuts, false);
    void screen.offsetHeight; // commit the unfolded geometry before animating
    screen.classList.add("folding");
    place(cuts, true);
    await sleep(720);
    screen.classList.remove("folding");
  }

  // 2. the page continues in the card's grid
  const more = el("section", { class: "more reveal", id: "more" });
  const colW = (W - 2 * 135 - 3 * 30) / 4;
  for (let i = 0; i < 4; i++) {
    const c = el("div", { class: "column" });
    Object.assign(c.style, { left: `${((135 + i * (colW + 30)) / W) * 100}%`, width: `${(colW / W) * 100}%` });
    more.append(c);
  }

  const passUtm = inheritedUtm(location.search); // links to the next phone keep the source that started the chain (worker daily counters)
  // a passed-on card: credit the person whose card format this is
  if (profile.madeBy) {
    const by = el("div", { class: "block" });
    by.append(el("p", { class: "over" }, esc(t.madeByTitle)));
    by.append(el("p", {}, `${esc(t.madeByBody(profile.owner.split(" ")[0]))} <strong>${esc(profile.madeBy.name)}</strong>.`));
    by.append(el("a", { class: "more-link", href: BASE }, `<span>${esc(t.seeOriginal(profile.madeBy.name.split(" ")[0]))}</span>${ICON.arrow}`));
    more.append(by);
  }

  const pass = el("div", { class: "block" });
  pass.append(el("p", { class: "over" }, esc(t.passTitle)), el("p", {}, esc(t.passBody)));

  // the passer's own LinkedIn: opened in the app, copied there, pasted back here, confirmed
  let own: Passer | null = loadOwn();
  let onOwnChange = () => {};
  const mine = el("div", { class: "mine" });
  const drawMine = (state: "idle" | "waiting" | "confirm" | "set", draft?: Passer) => {
    mine.replaceChildren();
    onOwnChange();
    if (state === "set" && own) {
      const line = el("p", { class: "mine-set" }, `${ICON.linkedin}<span>${esc(t.passingAs)} <strong>${esc(own.name)}</strong></span>`);
      const change = el("button", { class: "link-btn", type: "button" }, esc(t.change));
      change.onclick = () => { own = null; saveOwn(null); drawMine("idle"); };
      line.append(change);
      mine.append(line);
      return;
    }
    if (state === "confirm" && draft) {
      mine.append(el("p", {}, esc(t.thatsYou)));
      const input = el("input", { class: "mine-name", type: "text", value: draft.name, maxlength: "40", autocomplete: "name", "aria-label": t.yourName }) as HTMLInputElement;
      const roleIn = el("input", { class: "mine-name", type: "text", value: draft.role ?? "", maxlength: "60", autocomplete: "organization-title", placeholder: t.yourRole, "aria-label": t.yourRole }) as HTMLInputElement;
      const row = el("div", { class: "pair" });
      const yes = el("button", { class: "btn secondary", type: "button" }, `<span>${esc(t.thatsMe)}</span>`);
      const no = el("button", { class: "btn secondary", type: "button" }, `<span>${esc(t.tryAgain)}</span>`);
      yes.onclick = () => {
        const role = roleIn.value.replace(/\s+/g, " ").trim().slice(0, 60);
        own = { slug: draft.slug, name: input.value.trim().slice(0, 40) || draft.name, ...(role ? { role } : {}) };
        saveOwn(own); drawMine("set");
      };
      no.onclick = () => drawMine("waiting");
      row.append(yes, no);
      mine.append(input, roleIn, row);
      return;
    }
    const open = el("a", { class: "btn secondary", href: "https://www.linkedin.com/in/me/" }, `${ICON.linkedin}<span>${esc(t.addMyLinkedIn)}</span>`);
    open.onclick = () => setTimeout(() => drawMine("waiting"), 400);
    mine.append(open);
    if (state === "waiting") {
      mine.append(el("p", { class: "mine-hint" }, esc(t.copyHint)));
      const paste = el("button", { class: "btn secondary", type: "button" }, `<span>${esc(t.pasteMyLink)}</span>`);
      const err = el("p", { class: "mine-hint" });
      paste.onclick = async () => {
        let text = "";
        try { text = await navigator.clipboard.readText(); } catch { /* denied */ }
        const slug = slugFromText(text);
        if (slug) drawMine("confirm", { slug, name: nameFromSlug(slug) });
        else err.textContent = t.noLinkYet;
      };
      mine.append(paste, err);
    } else {
      mine.append(el("p", { class: "mine-hint" }, esc(t.addMyLinkedInBody)));
    }
  };
  drawMine(own ? "set" : "idle");
  pass.append(mine);

  const pair = el("div", { class: "pair" });
  const extra = () => [passUtm, fxParam, passerParam(own)].filter(Boolean);
  const show = el("a", { class: "btn secondary", href: "#" }, `${ICON.phones}<span>${esc(t.showSomeone)}</span>`) as HTMLAnchorElement;
  const hostHref = () => `${BASE}host/?${[`g=${g + 1}`, ...extra()].join("&")}`;
  show.href = hostHref();
  show.addEventListener("click", () => { show.href = hostHref(); });
  onOwnChange = () => { show.href = hostHref(); };
  pair.append(show);
  const send = el("button", { class: "btn secondary", type: "button" }, `${ICON.share}<span>${esc(t.sendLink)}</span>`);
  send.onclick = async () => {
    const hashPart = [fxParam, passerParam(own)].filter(Boolean).join("&");
    const url = `${location.origin}${BASE}${passUtm ? `?${passUtm}` : ""}${hashPart ? `#${hashPart}` : ""}`;
    try {
      // the title names whose card the link opens: the guest's own card, or else the original one
      const title = own ? own.name : profile.madeBy?.name ?? profile.owner;
      if (navigator.share) await navigator.share({ title, url });
      else { await navigator.clipboard.writeText(url); send.querySelector("span")!.textContent = t.copied; }
    } catch { /* cancelled */ }
  };
  pair.append(send);
  pass.append(pair);
  more.append(pass);

  if (profile.featured) {
    const f = profile.featured;
    const work = el("div", { class: "block" });
    work.append(el("p", { class: "over" }, esc(t.selectedWork)));
    const frame = el("div", { class: "film-frame" });
    let captionLine: HTMLElement | null = null;
    const video = el("video", { class: "film", src: new URL(f.video, base).href, muted: "", loop: "", playsinline: "", preload: "metadata", crossorigin: "anonymous", "aria-label": L(f.title) }) as HTMLVideoElement;
    if (f.poster) video.setAttribute("poster", new URL(f.poster, base).href);
    if (f.captions) {
      const track = el("track", { kind: "captions", srclang: "en", label: "English", src: new URL(f.captions, base).href, default: "" }) as HTMLTrackElement;
      video.append(track);
      // captions drawn in a line under the film, so they never cover a small picture
      const line = el("p", { class: "film-cue", "aria-hidden": "true" });
      track.track.mode = "hidden";
      track.track.addEventListener("cuechange", () => {
        const cue = track.track.activeCues?.[0] as VTTCue | undefined;
        line.textContent = cue ? cue.text.replace(/\n/g, " ") : "\u00a0";
      });
      line.textContent = "\u00a0";
      captionLine = line;
    }
    video.muted = true;
    // silent loop while on screen; the sound button restarts the film from the top with its voice-over
    let heard = false;
    // a pause by the guest sticks: scrolling back does not restart the film
    let held = false;
    new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting && !held ? video.play().catch(() => {}) : video.pause())), { threshold: 0.4 }).observe(video);
    const playIcon = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>';
    const pauseIcon = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="13.5" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>';
    const toggle = el("button", { class: "film-btn film-play", type: "button", "aria-label": t.pause }, pauseIcon) as HTMLButtonElement;
    const sync = () => {
      toggle.innerHTML = video.paused ? playIcon : pauseIcon;
      toggle.setAttribute("aria-label", video.paused ? t.play : t.pause);
    };
    video.addEventListener("play", sync);
    video.addEventListener("pause", sync);
    toggle.addEventListener("click", () => {
      if (video.paused) { held = false; video.play().catch(() => {}); }
      else { held = true; video.pause(); }
    });
    const sound = el("button", { class: "film-btn film-sound", type: "button" }, esc(t.soundOn)) as HTMLButtonElement;
    sound.addEventListener("click", () => {
      heard = !heard;
      video.muted = !heard;
      if (heard) video.currentTime = 0;
      held = false;
      video.play().catch(() => {});
      sound.textContent = heard ? t.soundOff : t.soundOn;
      sound.setAttribute("aria-pressed", String(heard));
    });
    const controls = el("div", { class: "film-controls" });
    controls.append(toggle, sound);
    frame.append(video, controls);
    work.append(frame);
    if (captionLine) work.append(captionLine);
    work.append(el("p", {}, `<strong>${esc(L(f.title))}</strong> · ${esc(L(f.summary))}`));
    work.append(el("a", { class: "more-link", href: f.url, target: "_blank", rel: "noopener" }, `<span>${esc(t.readCase)}</span>${ICON.arrow}`));
    more.append(work);
  }

  if (profile.caseStudies?.length) {
    const cases = el("div", { class: "block" });
    cases.append(el("p", { class: "over" }, esc(t.caseStudies)));
    const list = el("div", { class: "rows" });
    for (const c of profile.caseStudies) {
      list.append(el("a", { class: "row", href: c.url, target: "_blank", rel: "noopener" },
        `<span><strong>${esc(L(c.title))}</strong><small>${esc(L(c.summary))}</small></span>${ICON.arrow}`));
    }
    cases.append(list);
    more.append(cases);
  }

  const how = el("div", { class: "block" });
  how.append(el("p", { class: "over" }, esc(t.backstage)));
  if (profile.howItWasMade.teaser) how.append(el("p", {}, esc(L(profile.howItWasMade.teaser))));
  how.append(el("a", { class: "more-link", href: `${BASE}jak/` }, `<span>${esc(L(profile.howItWasMade.title))}</span>${ICON.arrow}`));
  more.append(how);

  const meta = el("p", { class: "meta" });
  const chain = el("span");
  meta.append(chain, el("span", {}, esc(t.cameraMeta)));
  more.append(meta);
  fetch(`${BASE}api/stats`).then((r) => r.json()).then((s) => { if (s?.phones) chain.textContent = t.chainMeta(s.phones); }).catch(() => {});
  root.append(more);

  return { screen, settle };
}
