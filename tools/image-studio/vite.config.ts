import path from "node:path";
import { defineConfig } from "vite";

const githubPages = Boolean(process.env.GITHUB_PAGES);
const repoRoot = path.resolve(import.meta.dirname, "../..");

export default defineConfig({
  root: path.resolve(import.meta.dirname, "client"),
  base: githubPages ? "/project-duckingo/tools/image-studio/" : "/",
  publicDir: path.resolve(import.meta.dirname, "client/public"),
  build: {
    outDir: path.resolve(import.meta.dirname, githubPages ? "docs" : "dist"),
    emptyOutDir: true,
  },
  optimizeDeps: {
    exclude: ["@imgly/background-removal", "onnxruntime-web"],
  },
  resolve: {
    alias: {
      "onnxruntime-web/webgpu": path.resolve(import.meta.dirname, "client/src/empty-ort.ts"),
    },
  },
  server: {
    port: 4178,
    host: true,
    fs: {
      allow: [repoRoot],
    },
  },
  preview: {
    port: 4178,
    host: true,
  },
});
