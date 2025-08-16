import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import webExtension from "vite-plugin-web-extension";
import deepmerge from "deepmerge"; 

import baseManifest from "./src/manifest.base.json";
import devManifest from "./manifest.json"; 


export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';

  const envManifest = isDev ? devManifest : {};

  return {
    plugins: [
      react(),
      webExtension({
        manifest: () => {
          return deepmerge(baseManifest, envManifest);
        },
      }),
    ],
    build: {
      outDir: "dist",
      target: "es2022",
      sourcemap: true,
      minify: false,
    },
    publicDir: "public",
  };
});