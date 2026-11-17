// Build-time constants (see vite.config.ts).
/** true in the dev/test build, false in dist/peel.js: test hooks are compiled out of the production bundle. */
declare const __PEEL_TEST__: boolean;
/** URL of the bundled font: a dev-server path in dev, `new URL("./peel-mono.woff2", import.meta.url).href` in dist. */
declare const __PEEL_FONT_URL__: string;
