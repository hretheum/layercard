// A passed-on card belongs to the person who passed it on: the same layers and choreography as the
// original, with the name, role and contact layers drawn on the phone from their data, and the
// generative field turned to a colour of their own. The original owner is credited below the card.
import "./fonts";
import type { Content } from "./content";
import type { Passer } from "./pass";

const PAPER = "#F3F5F7", QUIET = "#8D96A6", MINT = "#3DDCB4";
const DISPLAY = '600 160px "Archivo"', BODY = '400 46px "Atkinson Hyperlegible Next"', MONO = '400 34px "Atkinson Hyperlegible Mono"';

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d")!] as const;
}

/** Shrinks a font until the text fits the width. */
function fit(ctx: CanvasRenderingContext2D, font: string, text: string, maxW: number) {
  const m = font.match(/(\d+)px/)!;
  let size = +m[1];
  ctx.font = font;
  while (size > 20 && ctx.measureText(text).width > maxW) { size -= 4; ctx.font = font.replace(/\d+px/, `${size}px`); }
  return size;
}

function nameLayer(name: string, w: number, h: number) {
  const [c, ctx] = canvas(w, h);
  const words = name.trim().split(/\s+/);
  const lines = words.length > 1 ? [words[0], words.slice(1).join(" ")] : [words[0]];
  ctx.fillStyle = PAPER; ctx.textBaseline = "alphabetic";
  const size = Math.min(...lines.map((l) => fit(ctx, DISPLAY, l, w)));
  ctx.font = DISPLAY.replace(/\d+px/, `${size}px`);
  // two lines sit like the original (cap height at the top, 1.0 line height); one line sits on the lower baseline
  const base2 = h * 0.92, base1 = base2 - size;
  if (lines.length === 2) { ctx.fillText(lines[0], 0, base1); ctx.fillText(lines[1], 0, base2); }
  else ctx.fillText(lines[0], 0, base2);
  return c.toDataURL("image/png");
}

function roleLayer(role: string, credit: string, w: number, h: number) {
  const [c, ctx] = canvas(w, h);
  ctx.textBaseline = "alphabetic";
  if (role) { ctx.fillStyle = PAPER; fit(ctx, BODY, role, w); ctx.fillText(role, 0, 46); }
  ctx.fillStyle = QUIET; fit(ctx, BODY, credit, w); ctx.fillText(credit, 0, role ? 106 : 46);
  return c.toDataURL("image/png");
}

function contactLayer(text: string, w: number, h: number) {
  const [c, ctx] = canvas(w, h);
  ctx.fillStyle = MINT; ctx.textBaseline = "middle";
  fit(ctx, MONO, text, w);
  ctx.fillText(text, 0, h / 2);
  return c.toDataURL("image/png");
}

const hash = (s: string) => { let x = 2166136261; for (const ch of s) x = Math.imul(x ^ ch.charCodeAt(0), 16777619); return x >>> 0; };

/** The field image, hue-rotated by an angle that comes from the person's profile slug. */
async function fieldLayer(src: string, slug: string) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  await img.decode();
  const [c, ctx] = canvas(img.naturalWidth, img.naturalHeight);
  ctx.drawImage(img, 0, 0);
  const deg = 60 + (hash(slug) % 240); // never close to the original colours
  const a = (deg * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a);
  // the standard hue-rotate matrix (as in CSS filter: hue-rotate)
  const m = [
    0.213 + cos * 0.787 - sin * 0.213, 0.715 - cos * 0.715 - sin * 0.715, 0.072 - cos * 0.072 + sin * 0.928,
    0.213 - cos * 0.213 + sin * 0.143, 0.715 + cos * 0.285 + sin * 0.140, 0.072 - cos * 0.072 - sin * 0.283,
    0.213 - cos * 0.213 - sin * 0.787, 0.715 - cos * 0.715 + sin * 0.715, 0.072 + cos * 0.928 + sin * 0.072,
  ];
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    d[i] = m[0] * r + m[1] * g + m[2] * b;
    d[i + 1] = m[3] * r + m[4] * g + m[5] * b;
    d[i + 2] = m[6] * r + m[7] * g + m[8] * b;
  }
  ctx.putImageData(data, 0, 0);
  return c.toDataURL("image/png");
}

/** Turns the original card into the passer's card. The original owner stays as `madeBy`. */
export async function personalize(content: Content, p: Passer): Promise<Content> {
  await Promise.all([DISPLAY, BODY, MONO].map((f) => document.fonts.load(f).catch(() => [])));
  const manifest = structuredClone(content.manifest);
  const owner = content.profile;
  const credit = `Card by ${owner.owner}`;
  for (const l of manifest.layers) {
    const { w, h } = l.rect;
    if (l.id === "name") l.src = nameLayer(p.name, w, h);
    else if (l.id === "role") l.src = roleLayer(p.role ?? "", credit, w, h);
    else if (l.id === "contact") l.src = contactLayer(`linkedin.com/in/${decodeURIComponent(p.slug)}`, w, h);
    else if (l.id === "field") l.src = await fieldLayer(new URL(l.src, content.base).href, p.slug).catch(() => l.src);
  }
  const profile = {
    ...owner,
    owner: p.name,
    role: p.role ?? "",
    contact: { linkedin: `https://www.linkedin.com/in/${p.slug}/` },
    hotspots: [],
    featured: undefined,
    caseStudies: undefined,
    madeBy: { name: owner.owner, linkedin: owner.contact.linkedin },
  };
  return { manifest, profile, base: content.base };
}
