// "How it was made" page, rendered from the profile content in the card's palette.
import "./fonts";
import "./styles.css";
import { L, LL, loadContent } from "./content";
import { t } from "./i18n";

const BASE = import.meta.env.BASE_URL;
const { profile } = await loadContent();
const h = profile.howItWasMade;
document.body.classList.add("jak");
document.title = `${L(h.title)} · ${profile.owner}`;

const root = document.getElementById("page")!;
root.removeAttribute("id");
root.className = "article";
const back = document.createElement("a");
back.className = "back";
back.href = BASE;
back.textContent = `← ${t.back}`;
back.onclick = (e) => { if (document.referrer.startsWith(location.origin) && history.length > 1) { e.preventDefault(); history.back(); } };
const title = document.createElement("h1");
title.textContent = L(h.title);
root.append(back, title);
for (const p of LL(h.paragraphs)) {
  const e = document.createElement("p");
  e.textContent = p;
  root.append(e);
}
const links = document.createElement("div");
links.className = "links";
for (const l of h.links) {
  const a = document.createElement("a");
  a.className = "btn secondary";
  a.href = l.url;
  a.target = "_blank";
  a.rel = "noopener";
  a.textContent = l.label;
  links.append(a);
}
root.append(links);
