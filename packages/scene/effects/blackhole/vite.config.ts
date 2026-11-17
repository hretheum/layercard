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

/**
 * Serves `<repo>/examples/**` at `/examples/**` so the demo and the checks use the shared example card.
 * BLACKHOLE_CONTENT_DIR (an absolute folder outside the repo) is served at `/content/**`, for looking at
 * a private card through the demo (`?base=/content/`) without a file of it entering the repo.
 */
function serveExamples(): Plugin {
  const content = process.env.BLACKHOLE_CONTENT_DIR ? resolve(process.env.BLACKHOLE_CONTENT_DIR) : "";
  const handler = (req: any, res: any, next: () => void) => {
    const url = decodeURIComponent((req.url ?? "").split("?")[0]);
    const outside = content !== "" && url.startsWith("/content/");
    if (!url.startsWith("/examples/") && !outside) return next();
    const root = outside ? content : join(repoRoot, "examples");
    const file = normalize(outside ? join(content, url.slice("/content".length)) : join(repoRoot, url));
    if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) return next();
    res.setHeader("Content-Type", MIME[extname(file)] ?? "application/octet-stream");
    res.setHeader("Cache-Control", "no-store");
    createReadStream(file).pipe(res);
  };
  return {
    name: "blackhole:serve-examples",
    configureServer(server) { server.middlewares.use(handler); },
    configurePreviewServer(server) { server.middlewares.use(handler); },
  };
}

/**
 * Vite does not watch its own build output, so the dev server would go on serving the bundle it
 * first transformed after `dist/blackhole.js` has been rebuilt — and the "production bundle" checks
 * would test an old build. Every request for a bundle (dist/, or v1's copy under artifacts/tmp/)
 * therefore drops the cached module when the file on disk has changed.
 */
function freshBundles(): Plugin {
  const seen = new Map<string, number>();
  return {
    name: "blackhole:fresh-bundles",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = decodeURIComponent((req.url ?? "").split("?")[0]);
        if (url.endsWith(".js") && (url.startsWith("/dist/") || url.startsWith("/artifacts/"))) {
          const file = normalize(join(here, url));
          if (file.startsWith(here) && existsSync(file)) {
            const m = statSync(file).mtimeMs;
            if (seen.has(file) && seen.get(file) !== m) for (const mod of server.moduleGraph.getModulesByFile(file) ?? []) server.moduleGraph.invalidateModule(mod);
            seen.set(file, m);
          }
        }
        next();
      });
    },
  };
}

/**
 * The font is the effect's only bundled asset. In dev it is served from /assets; in the library build the
 * code keeps a literal `new URL("./blackhole-mono.woff2", import.meta.url)` so a downstream bundler can pick it up,
 * and the file (with its licence) is copied next to dist/blackhole.js.
 */
function fontAsset(isBuild: boolean): Plugin {
  const TOKEN = "__BLACKHOLE_FONT_URL__";
  return {
    name: "blackhole:font-asset",
    enforce: "pre",
    transform(code) {
      if (isBuild || !code.includes(TOKEN)) return null;
      return code.replaceAll(TOKEN, JSON.stringify("/assets/blackhole-mono.woff2"));
    },
    renderChunk(code) {
      if (!code.includes(TOKEN)) return null;
      return code.replaceAll(TOKEN, 'new URL("./blackhole-mono.woff2", import.meta.url).href');
    },
    closeBundle() {
      if (!isBuild) return;
      mkdirSync(join(here, "dist"), { recursive: true });
      copyFileSync(join(here, "assets/blackhole-mono.woff2"), join(here, "dist/blackhole-mono.woff2"));
      copyFileSync(join(here, "assets/OFL.txt"), join(here, "dist/OFL.txt"));
    },
  };
}

export default defineConfig(({ command }) => {
  const isBuild = command === "build";
  return {
    root: here,
    publicDir: false,
    define: { __BLACKHOLE_TEST__: JSON.stringify(!isBuild) },
    plugins: [freshBundles(), serveExamples(), fontAsset(isBuild)],
    server: { port: 5277, strictPort: true, host: "127.0.0.1", fs: { allow: [repoRoot] } },
    preview: { port: 5277, strictPort: true, host: "127.0.0.1" },
    build: {
      target: "es2022",
      outDir: "dist",
      emptyOutDir: true,
      minify: "esbuild",
      sourcemap: false,
      reportCompressedSize: true,
      lib: { entry: resolve(here, "src/index.ts"), formats: ["es"], fileName: () => "blackhole.js" },
      rollupOptions: { external: ["three"] },
    },
  };
});
