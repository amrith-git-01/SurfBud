import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "SurfBud-dev",
  version: "1.0.0",
  description: "SurfBud helps you manage downloads and prevent duplicates.",

  content_security_policy: {
    extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';",
  },

  permissions: ["storage", "downloads", "sidePanel", "alarms", "tabs"],

  host_permissions: [
    "http://localhost:3000/*",
    "http://localhost:3001/*",
    "http://localhost:5173/*",
    "<all_urls>",
    "file:///*",
  ],

  content_scripts: [
    {
      js: ["src/content/dashboardBridge.ts"],
      matches: [
        "http://localhost/*",
        "http://127.0.0.1/*",
        "http://localhost:5173/*",
        "http://127.0.0.1:5173/*",
        "http://localhost:4173/*",
        "http://127.0.0.1:4173/*",
        "https://*.surfbud.com/*",
        "https://surfbud.com/*",
      ],
    },
    {
      js: ["src/content/browsingInteraction.ts"],
      matches: ["http://*/*", "https://*/*"],
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
