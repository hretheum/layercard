import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const effect = process.env.LAYERCARD_EFFECT ?? "minimal";
const effectEntry = process.env.LAYERCARD_EFFECT_ENTRY ?? here(`../../packages/scene/effects/${effect}/src/index.ts`);
// Optional second build shipped beside the first, picked at runtime with ?fx=v2 (see src/effect.ts).
const effectV2Entry = process.env.LAYERCARD_EFFECT_V2_ENTRY ?? effectEntry;
const effectV3Entry = process.env.LAYERCARD_EFFECT_V3_ENTRY ?? effectEntry;
const effectV4Entry = process.env.LAYERCARD_EFFECT_V4_ENTRY ?? effectEntry;
const effectV5Entry = process.env.LAYERCARD_EFFECT_V5_ENTRY ?? effectEntry;

export default defineConfig({
  base: "/k/",
  // Effects built outside this workspace (vendored dist) import "three"; resolve it to our copy.
  resolve: { alias: { "@effect-v2": effectV2Entry, "@effect-v3": effectV3Entry, "@effect-v4": effectV4Entry, "@effect-v5": effectV5Entry, "@effect": effectEntry, three: here("../../node_modules/three/build/three.module.js") } },
  server: {
    host: true,
    port: 5174,
    strictPort: true,
    allowedHosts: [".trycloudflare.com"],
    hmr: false,
    proxy: { "^/k/(room|api)/.*": { target: "http://127.0.0.1:8787", ws: true } },
  },
  build: {
    target: "es2022",
    outDir: here("../../worker/public/k"),
    emptyOutDir: true,
    rollupOptions: {
      input: { guest: here("index.html"), host: here("host/index.html"), jak: here("jak/index.html") },
    },
  },
});
