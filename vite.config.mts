// vite.config.mts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import webExtension from "vite-plugin-web-extension";

// Se você usa variáveis de ambiente do Vite, pode continuar normalmente:
// import dotenv from "dotenv";
// dotenv.config();

export default defineConfig({
  plugins: [
    react(),
    webExtension()
  ],
  // (mantenha aqui o que você já tinha: build, resolve.alias, etc.)
});
