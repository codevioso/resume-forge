import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

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
  plugins: [react(), tailwindcss()],
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
