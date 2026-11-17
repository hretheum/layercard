// Copies a card content folder (layers.json, layers/, profile.json, vCard) into apps/card/public/content.
// LAYERCARD_CONTENT points at a private folder outside the repo; the default is the fictional example.
import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(process.env.LAYERCARD_CONTENT ?? join(root, "examples/jane-maker"));
const dst = join(root, "apps/card/public/content");
for (const f of ["layers.json", "profile.json"]) {
  if (!existsSync(join(src, f))) throw new Error(`missing ${f} in ${src}`);
}
rmSync(dst, { recursive: true, force: true });
cpSync(src, dst, { recursive: true, filter: (p) => !p.endsWith(".svg") });
console.log(`content: ${src} -> ${dst}`);
