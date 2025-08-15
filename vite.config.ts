// Diz ao Vite como empactar os alvos (background, content, popup, options)

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import webExtension from "vite-plugin-web-extension";

export default defineConfig({
  plugins: [
    react(),
    webExtension({

      manifest: "manifest.json",

    })
  ],
  build: {
    outDir: "dist",
    target: "es2022",
    sourcemap: true,
    minify: false
  },
  publicDir: "public"
});
