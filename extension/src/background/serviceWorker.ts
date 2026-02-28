/// <reference types="chrome" />
import { createSHA256 } from "hash-wasm";
import {
  extractFilename,
  extractDomain,
} from "../utils/downloadHelpers";

const API_BASE = "http://localhost:3001/api";

interface DownloadPayload {
  hash: string;
  filename: string;
  url: string;
  size?: number;
  mimeType?: string;
  sourceDomain?: string;
  durationMs?: number;
  isRemoved?: boolean;
  removedAt?: string;
}

async function computeHash(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok || !response.body) return null;

    const sha256 = await createSHA256();
    sha256.init();

    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) sha256.update(value);
    }

    return sha256.digest("hex");
  } catch {
    return null;
  }
}

async function extractMetadata(item: chrome.downloads.DownloadItem): Promise<{
  filename: string;
  url: string;
  size?: number;
  mimeType?: string;
  sourceDomain: string;
  durationMs: number;
}> {
  const filename = extractFilename(item.filename ?? "");
  const url = item.finalUrl ?? item.url ?? "";
  const size =
    typeof item.totalBytes === "number" && item.totalBytes >= 0
      ? item.totalBytes
      : undefined;
  const mimeType = item.mime || undefined;
  const sourceDomain = extractDomain(url);
  const startMs = item.startTime
    ? new Date(item.startTime).getTime()
    : Date.now();
  const durationMs = Math.max(0, Math.round(Date.now() - startMs));
  return {
    filename,
    url,
    size,
    mimeType,
    sourceDomain,
    durationMs,
  };
}
const AUTH_STORAGE_KEY = "authToken";

chrome.runtime.onMessage.addListener(
  (
    msg: { type: string; payload?: { user: unknown; token: string } },
    _sender,
    sendResponse,
  ): boolean => {
    if (msg.type === "AUTH_SUCCESS" && msg.payload) {
      chrome.storage.sync
        .set({
          authToken: msg.payload.token,
          user: msg.payload.user,
          isAuthenticated: true,
        })
        .then(() => sendResponse({ ok: true }));
    } else if (msg.type === "AUTH_LOGOUT") {
      chrome.storage.sync
        .remove(["authToken", "user", "isAuthenticated"])
        .then(() => sendResponse({ ok: true }));
    } else {
      sendResponse({ ok: false });
    }
    return true;
  },
);

async function getAuthToken(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      [AUTH_STORAGE_KEY],
      (result: { authToken?: string }) => {
        resolve(result.authToken ?? null);
      },
    );
  });
}

async function sendToBackend(payload: DownloadPayload): Promise<void> {
  const token = await getAuthToken();
  if (!token) {
    console.log("SurfBud: not authenticated, skipping upload");
    return;
  }
  try {
    const response = await fetch(`${API_BASE}/download/track`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.error("SurfBud: failed to send download", response.status);
    } else {
      console.log("SurfBud: download tracked", payload.filename);
    }
  } catch (err) {
    console.error("SurfBud: failed to send download", err);
  }
}
chrome.downloads.onChanged.addListener((delta) => {
  if (delta.state?.current !== "complete") return;
  void (async () => {
    const results = await new Promise<chrome.downloads.DownloadItem[]>(
      (resolve) => {
        chrome.downloads.search({ id: delta.id }, (items) =>
          resolve(items ?? []),
        );
      },
    );
    const item = results[0];
    if (!item || !item.filename || !item.url) return;
    const metadata = await extractMetadata(item);
    const hash = await computeHash(item.url);
    if (hash === null) {
      console.log("SurfBud: could not compute content hash, skipping upload", metadata.filename);
      return;
    }
    const payload: DownloadPayload = {
      hash,
      filename: metadata.filename,
      url: metadata.url,
      size: metadata.size,
      mimeType: metadata.mimeType,
      sourceDomain: metadata.sourceDomain || undefined,
      durationMs: metadata.durationMs,
      isRemoved: false,
      removedAt: undefined,
    };
    await sendToBackend(payload);
  })();
});
