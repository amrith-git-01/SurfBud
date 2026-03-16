/// <reference types="chrome" />
import type { DownloadSettingsSyncPayload } from "../types/shared/download-settings.types";

interface AuthSuccessPayload {
  user: { userId: string; displayName: string };
  token: string;
}

function isExtensionContextAlive(): boolean {
  try {
    return Boolean(chrome?.runtime?.id);
  } catch {
    return false;
  }
}

window.addEventListener("message", (event: MessageEvent) => {
  try {
    if (event.source !== window) return;
    const msg = event.data;
    if (msg?.type !== "SURFBUD_AUTH_SUCCESS" && msg?.type !== "SURFBUD_SETTINGS_SYNC") {
      return;
    }

    if (!isExtensionContextAlive()) {
      console.warn("[SurfBud Bridge] Extension context not alive, skipping forward");
      return;
    }

    const send = chrome.runtime.sendMessage.bind(chrome.runtime);

    if (msg.type === "SURFBUD_AUTH_SUCCESS" && msg.payload) {
      const payload = msg.payload as AuthSuccessPayload;
      send(
        {
          type: "AUTH_SUCCESS",
          payload: {
            user: payload.user,
            token: payload.token,
          },
        },
        () => {
          const runtimeError = chrome.runtime.lastError;
          if (runtimeError) {
            console.warn("[SurfBud Bridge] AUTH_SUCCESS forward failed:", runtimeError.message);
          }
        },
      );
      return;
    }

    if (msg.type === "SURFBUD_SETTINGS_SYNC" && msg.payload) {
      const payload = msg.payload as DownloadSettingsSyncPayload;
      send(
        {
          type: "SETTINGS_SYNC",
          payload,
        },
        () => {
          const runtimeError = chrome.runtime.lastError;
          if (runtimeError) {
            console.warn("[SurfBud Bridge] SETTINGS_SYNC forward failed:", runtimeError.message);
          }
        },
      );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown content script bridge error";
    if (message.includes("Extension context invalidated")) {
      console.warn("[SurfBud Bridge] Ignoring invalidated extension context");
      return;
    }
    console.error("[SurfBud Bridge] Unexpected bridge error:", error);
  }
});
