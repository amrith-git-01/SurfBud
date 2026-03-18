const HEALTH_PATH = "/api/health";

/**
 * Polls until the API responds (HTTP server is listening after bootstrap) or attempts exhausted.
 * Reduces Socket.IO ERR_CONNECTION_REFUSED spam while Redis/DB init still blocks listen().
 */
export async function waitForApiHealth(baseUrl: string): Promise<boolean> {
  const url = `${baseUrl.replace(/\/$/, "")}${HEALTH_PATH}`;
  let delayMs = 200;
  const maxDelayMs = 4000;
  const maxAttempts = 20;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(url, { method: "GET", cache: "no-store" });
      if (res.ok) return true;
    } catch {
      /* ignore — connection refused, etc. */
    }
    await new Promise<void>((resolve) => {
      setTimeout(resolve, delayMs);
    });
    delayMs = Math.min(Math.floor(delayMs * 1.35), maxDelayMs);
  }

  return false;
}
