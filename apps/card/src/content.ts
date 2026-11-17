// Card content: the layer manifest and the profile (who, contact, actions, how it was made).
// Lives in public/content and is copied from a content folder at build time (never committed).
import type { LayerManifest, Rect } from "../../../packages/scene/types";
import { lang } from "./i18n";

/** Plain text, or the same text per language. */
export type Text = string | { pl?: string; en?: string };
export type TextList = string[] | { pl?: string[]; en?: string[] };

export interface Profile {
  owner: string;
  role: string;
  contact: { vcard?: string; email?: string; linkedin?: string; website?: string };
  /** Tappable areas over the card image, in card design px (e.g. the website and e-mail on the card). */
  hotspots?: { href: string; label: string; rect: Rect }[];
  /** How the card folds on screens shorter than the card: strips (multiples of `step`, at most
   *  `maxSteps` per side) are taken out above and below a `center` band of the `around` layer;
   *  `crop` layers shrink with object-fit instead of being sliced. Card design px. */
  fold?: { around: string; center: number; step: number; maxSteps: number; crop?: string[] };
  /** Where the action buttons sit on the card after the QR zone is freed, in card design px. */
  actionsZone?: { x: number; y: number; w: number };
  caseStudies?: { title: Text; summary: Text; url: string }[];
  /** One project shown with a muted, looping film (16:9) above the case studies. */
  featured?: { title: Text; summary: Text; url: string; video: string; poster?: string; captions?: string };
  /** Set on a passed-on card: whose card format this is. */
  madeBy?: { name: string; linkedin?: string };
  howItWasMade: { title: Text; teaser?: Text; paragraphs: TextList; links: { label: string; url: string }[] };
}

export interface Content { manifest: LayerManifest; profile: Profile; base: string }

export const L = (v: Text | undefined): string => (v === undefined ? "" : typeof v === "string" ? v : v[lang] ?? v.en ?? v.pl ?? "");
export const LL = (v: TextList): string[] => (Array.isArray(v) ? v : v[lang] ?? v.en ?? v.pl ?? []);

export async function loadContent(): Promise<Content> {
  const base = new URL(`${import.meta.env.BASE_URL}content/`, location.origin).href;
  const [manifest, profile] = await Promise.all([
    fetch(base + "layers.json").then((r) => r.json()),
    fetch(base + "profile.json").then((r) => r.json()),
  ]);
  return { manifest, profile, base };
}
