import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: [".trycloudflare.com"],
    hmr: false,
    proxy: { "^/room/.*": { target: "http://127.0.0.1:8787", ws: true } },
  },
  build: {
    rollupOptions: {
      input: { index: here("index.html"), host: here("host.html"), guest: here("guest.html"), room: here("room.html") },
    },
  },
});
