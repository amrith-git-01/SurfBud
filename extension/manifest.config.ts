import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "SurfBud-dev",
  version: "1.0.0",
  description: "SurfBud helps you manage downloads and prevent duplicates.",

  content_security_policy: {
    extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';",
  },

  permissions: ["storage", "downloads", "sidePanel", "alarms"],

  host_permissions: [
    "http://localhost:3000/*",
    "http://localhost:3001/*",
    "http://localhost:5173/*",
    "<all_urls>",
  ],

  content_scripts: [
    {
      js: ["src/content/dashboardBridge.ts"],
      matches: [
        "http://localhost:5173/*",
        "https://*.surfbud.com/*",
        "https://surfbud.com/*",
      ],
    },
  ],

  action: {
    default_title: "SurfBud",
  },

  side_panel: {
    default_path: "index.html",
  },

  background: {
    service_worker: "src/background/serviceWorker.ts",
    type: "module",
  },
});
