import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The app calls the PDF API at /api/pdf on its own origin. In production the
// edge proxy routes that path to the pdf-service (docker/Caddyfile); in
// development and `vite preview` this proxy does the same, so local exports
// take the identical same-origin path and need no env file or CORS setup.
const pdfApiProxy = {
  "/api/pdf": {
    target: process.env.PDF_SERVICE_ORIGIN ?? "http://localhost:3040",
    rewrite: (p: string) => p.replace(/^\/api/, ""),
  },
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Installable app: manifest, icons and a service worker that caches the
    // app shell, so the editor opens offline (the resume itself is already in
    // localStorage). Exports still need the network; /api is never cached.
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.svg", "icons/favicon-32.png", "icons/apple-touch-icon.png", "logo/logo.png"],
      manifest: {
        name: "Paperplane — Resume Builder",
        short_name: "Paperplane",
        description:
          "Build your resume, pick a design, and download a PDF that looks exactly like the preview. Your resume stays on your device.",
        id: "/",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#ffffff",
        categories: ["productivity", "business"],
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        shortcuts: [
          { name: "Continue my resume", url: "/editor", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
          { name: "Browse templates", url: "/templates", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
        ],
      },
      workbox: {
        // The app shell. Fonts are many files across scripts; they are cached
        // as they are first used instead (below), not all downloaded up front.
        globPatterns: ["**/*.{js,css,html,svg,png,webmanifest}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === "font",
            handler: "CacheFirst",
            options: { cacheName: "fonts", expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  // Build to dist/, never docs/. docs/ holds the project's documentation, and
  // Vite empties its output directory before writing: with outDir "docs",
  // every `npm run build` deleted the QA reports, the release guide and the
  // issue log. (docs/ was the GitHub Pages publishing folder; the app is now
  // served from a container, see docs/DEPLOY.md.)
  build: { outDir: "dist", emptyOutDir: true },
  server: { proxy: pdfApiProxy },
  preview: { proxy: pdfApiProxy },
});
