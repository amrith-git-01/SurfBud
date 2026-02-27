export function notifyExtensionAuth(
  accessToken: string,
  user: { userId: string; displayName: string },
): void {
  window.postMessage(
    {
      type: "SURFBUD_AUTH_SUCCESS",
      payload: { user, token: accessToken },
    },
    "*",
  );
}

export function notifyExtensionLogout(): void {
  window.postMessage({ type: "SURFBUD_AUTH_LOGOUT" }, "*");
}
