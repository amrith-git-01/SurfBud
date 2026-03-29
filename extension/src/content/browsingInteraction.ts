/// <reference types="chrome" />

type BrowsingInteractionKind = "key" | "click" | "scroll";

const SCROLL_THROTTLE_MS = 1000;
const CLICK_THROTTLE_MS = 250;
const KEY_THROTTLE_MS = 250;

let lastScrollAt = 0;
let lastClickAt = 0;
let lastKeyAt = 0;

function safeSend(kind: BrowsingInteractionKind): void {
  try {
    chrome.runtime.sendMessage({
      type: "BROWSING_INTERACTION",
      payload: { kind },
    });
  } catch {
    // Ignore extension context invalidation during page navigations/reloads.
  }
}

function shouldThrottle(now: number, lastAt: number, thresholdMs: number): boolean {
  return now - lastAt < thresholdMs;
}

window.addEventListener(
  "click",
  () => {
    const now = Date.now();
    if (shouldThrottle(now, lastClickAt, CLICK_THROTTLE_MS)) return;
    lastClickAt = now;
    safeSend("click");
  },
  { passive: true, capture: true },
);

window.addEventListener(
  "keydown",
  () => {
    const now = Date.now();
    if (shouldThrottle(now, lastKeyAt, KEY_THROTTLE_MS)) return;
    lastKeyAt = now;
    safeSend("key");
  },
  { passive: true, capture: true },
);

window.addEventListener(
  "scroll",
  () => {
    const now = Date.now();
    if (shouldThrottle(now, lastScrollAt, SCROLL_THROTTLE_MS)) return;
    lastScrollAt = now;
    safeSend("scroll");
  },
  { passive: true, capture: true },
);
