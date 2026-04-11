/// <reference types="chrome" />

const MAX_TAB_GROUP_URLS = 30;

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function sanitizeTabGroupUrls(urls: string[]): string[] {
  const unique = new Set<string>();
  const cleaned: string[] = [];

  for (const rawUrl of urls) {
    const candidate = rawUrl.trim();
    if (!isHttpUrl(candidate)) continue;

    const normalized = new URL(candidate).toString();
    const key = normalized.toLowerCase();
    if (unique.has(key)) continue;

    unique.add(key);
    cleaned.push(normalized);

    if (cleaned.length >= MAX_TAB_GROUP_URLS) {
      break;
    }
  }

  return cleaned;
}

export async function openTabGroupUrls(urls: string[]): Promise<number | undefined> {
  const sanitized = sanitizeTabGroupUrls(urls);
  const firstUrl = sanitized[0];

  if (!firstUrl) {
    return undefined;
  }

  const windowId = await new Promise<number | undefined>((resolve, reject) => {
    chrome.windows.create(
      {
        url: firstUrl,
        focused: true,
      },
      (window) => {
        const runtimeError = chrome.runtime.lastError;
        if (runtimeError?.message) {
          reject(new Error(runtimeError.message));
          return;
        }

        resolve(window?.id);
      },
    );
  });

  for (const url of sanitized.slice(1)) {
    await chrome.tabs.create({
      ...(windowId !== undefined ? { windowId } : {}),
      url,
      active: false,
    });
  }

  return windowId;
}

export async function openUrlsInBrowserWindow(
  windowId: number,
  urls: string[],
): Promise<void> {
  const sanitized = sanitizeTabGroupUrls(urls);
  if (sanitized.length === 0) {
    return;
  }
  const [first, ...rest] = sanitized;
  await new Promise<void>((resolve, reject) => {
    chrome.tabs.create({ windowId, url: first, active: true }, () => {
      const err = chrome.runtime.lastError;
      if (err?.message) {
        reject(new Error(err.message));
        return;
      }
      resolve();
    });
  });
  for (const url of rest) {
    await new Promise<void>((resolve, reject) => {
      chrome.tabs.create({ windowId, url, active: false }, () => {
        const err = chrome.runtime.lastError;
        if (err?.message) {
          reject(new Error(err.message));
          return;
        }
        resolve();
      });
    });
  }
}
