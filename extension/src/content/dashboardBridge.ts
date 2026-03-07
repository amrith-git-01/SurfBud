/// <reference types="chrome" />

interface AuthSuccessPayload {
  user: { userId: string; displayName: string };
  token: string;
}

window.addEventListener("message", (event: MessageEvent) => {
  if (event.source !== window) return;
  const msg = event.data;
  if (msg?.type === "SURFBUD_AUTH_SUCCESS" && msg.payload) {
    const payload = msg.payload as AuthSuccessPayload;
    chrome.runtime.sendMessage({
      type: "AUTH_SUCCESS",
      payload: {
        user: payload.user,
        token: payload.token,
      },
    });
  } else if (msg?.type === "SURFBUD_AUTH_LOGOUT") {
    chrome.runtime.sendMessage({ type: "AUTH_LOGOUT" });
  }
});
