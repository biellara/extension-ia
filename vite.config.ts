import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import webExtension from "vite-plugin-web-extension";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [
    react(),
    webExtension({
      manifest: "src/manifest.json",
    }),
  ],
  publicDir: "public",
  build: {
    outDir: "dist",
    target: "es2022",
    sourcemap: true,
    minify: false,
    emptyOutDir: true
  },
});