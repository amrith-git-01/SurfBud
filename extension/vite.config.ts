import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { crx } from "@crxjs/vite-plugin";
import { resolve } from "path";
import manifest from "./manifest.config";

export default defineConfig({
  plugins: [crx({ manifest }), react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }
          if (id.includes("@tanstack/react-query")) {
            return "tanstack-query";
          }
          if (id.includes("react-router")) {
            return "react-router";
          }
          if (id.includes("react-dom")) {
            return "react-dom";
          }
          if (id.includes("node_modules/react/")) {
            return "react";
          }
        },
      },
    },
  },
});
