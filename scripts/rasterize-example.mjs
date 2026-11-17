// Builds the fictional example card layers (examples/jane-maker) as PNG files.
// Usage: node scripts/rasterize-example.mjs
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import QRCode from "qrcode";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "examples/jane-maker");
const manifest = JSON.parse(readFileSync(join(dir, "layers.json"), "utf8"));
mkdirSync(join(dir, "layers"), { recursive: true });

const sans = "Helvetica Neue, Helvetica, Arial, sans-serif";
const mono = "Menlo, Monaco, Courier New, monospace";

const svgFor = {
  bg: (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><radialGradient id="g" cx="0.5" cy="0.28" r="0.75">
      <stop offset="0" stop-color="#1B2230"/><stop offset="1" stop-color="#0F1216"/></radialGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/></svg>`,
  grid: (w, h) => {
    const margin = 135, gutter = 30, cols = 4;
    const colW = (w - 2 * margin - (cols - 1) * gutter) / cols;
    let bands = "";
    for (let i = 0; i < cols; i++) {
      const x = margin + i * (colW + gutter);
      bands += `<rect x="${x}" y="0" width="${colW}" height="${h}" fill="#5B8CFF" fill-opacity="0.06"/>`;
    }
    let rows = "";
    for (let y = 0; y < h; y += 96) rows += `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="#FFFFFF" stroke-opacity="0.05" stroke-width="2"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${bands}${rows}</svg>`;
  },
  mark: (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <circle cx="${w * 0.38}" cy="${h * 0.42}" r="${w * 0.27}" fill="#FF6A3D"/>
    <circle cx="${w * 0.62}" cy="${h * 0.42}" r="${w * 0.27}" fill="#3DDC97" fill-opacity="0.85"/>
    <circle cx="${w * 0.5}" cy="${h * 0.63}" r="${w * 0.27}" fill="#5B8CFF" fill-opacity="0.8"/></svg>`,
  name: (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <text x="0" y="${h * 0.74}" font-family="${sans}" font-size="150" font-weight="700" fill="#F4F6F8" letter-spacing="-3">Jane Maker</text></svg>`,
  role: (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <text x="0" y="${h * 0.72}" font-family="${sans}" font-size="56" fill="#A9B1BC">Product designer · Warsaw</text></svg>`,
  contact: (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <text x="0" y="${h * 0.7}" font-family="${mono}" font-size="48" fill="#7FE3C2">jane@example.com</text></svg>`,
};

for (const layer of manifest.layers) {
  const out = join(dir, layer.src);
  if (layer.role === "qr") {
    const png = await QRCode.toBuffer("https://example.com/k#r=demo", {
      width: layer.rect.w, margin: 2, color: { dark: "#0F1216", light: "#F4F6F8" },
    });
    writeFileSync(out, png);
    continue;
  }
  const svg = svgFor[layer.id](layer.rect.w, layer.rect.h);
  writeFileSync(out.replace(/\.png$/, ".svg"), svg);
  const png = new Resvg(svg, { font: { loadSystemFonts: true } }).render().asPng();
  writeFileSync(out, png);
}
console.log("example layers written to", join(dir, "layers"));
