import { defineConfig, type Plugin } from "vite";
import { createReadStream, existsSync, statSync, copyFileSync, mkdirSync } from "node:fs";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../../..");

const MIME: Record<string, string> = {
  ".png": "image/png", ".svg": "image/svg+xml", ".webp": "image/webp", ".json": "application/json",
  ".woff2": "font/woff2", ".txt": "text/plain",
};

/** Serves `<repo>/examples/**` at `/examples/**` so the demo and the checks use the shared example card. */
function serveExamples(): Plugin {
  const handler = (req: any, res: any, next: () => void) => {
    const url = decodeURIComponent((req.url ?? "").split("?")[0]);
    if (!url.startsWith("/examples/")) return next();
    const file = normalize(join(repoRoot, url));
    if (!file.startsWith(join(repoRoot, "examples")) || !existsSync(file) || !statSync(file).isFile()) return next();
    res.setHeader("Content-Type", MIME[extname(file)] ?? "application/octet-stream");
    res.setHeader("Cache-Control", "no-store");
    createReadStream(file).pipe(res);
  };
  return {
    name: "peel:serve-examples",
    configureServer(server) { server.middlewares.use(handler); },
    configurePreviewServer(server) { server.middlewares.use(handler); },
  };
}

/**
 * The font is the effect's only bundled asset. In dev it is served from /assets; in the library build the
 * code keeps a literal `new URL("./peel-mono.woff2", import.meta.url)` so a downstream bundler can pick it up,
 * and the file (with its licence) is copied next to dist/peel.js.
 */
function fontAsset(isBuild: boolean): Plugin {
  const TOKEN = "__PEEL_FONT_URL__";
  return {
    name: "peel:font-asset",
    enforce: "pre",
    transform(code) {
      if (isBuild || !code.includes(TOKEN)) return null;
      return code.replaceAll(TOKEN, JSON.stringify("/assets/peel-mono.woff2"));
    },
    renderChunk(code) {
      if (!code.includes(TOKEN)) return null;
      return code.replaceAll(TOKEN, 'new URL("./peel-mono.woff2", import.meta.url).href');
    },
    closeBundle() {
      if (!isBuild) return;
      mkdirSync(join(here, "dist"), { recursive: true });
      copyFileSync(join(here, "assets/peel-mono.woff2"), join(here, "dist/peel-mono.woff2"));
      copyFileSync(join(here, "assets/OFL.txt"), join(here, "dist/OFL.txt"));
    },
  };
}

export default defineConfig(({ command }) => {
  const isBuild = command === "build";
  return {
    root: here,
    publicDir: false,
    define: { __PEEL_TEST__: JSON.stringify(!isBuild) },
    plugins: [serveExamples(), fontAsset(isBuild)],
    server: { port: 5273, strictPort: true, host: "127.0.0.1", fs: { allow: [repoRoot] } },
    preview: { port: 5273, strictPort: true, host: "127.0.0.1" },
    build: {
      target: "es2022",
      outDir: "dist",
      emptyOutDir: true,
      minify: "esbuild",
      sourcemap: false,
      reportCompressedSize: true,
      lib: { entry: resolve(here, "src/index.ts"), formats: ["es"], fileName: () => "peel.js" },
      rollupOptions: { external: ["three"] },
    },
  };
});
