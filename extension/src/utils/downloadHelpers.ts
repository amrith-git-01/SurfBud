export function extractFilename(filepath: string): string {
  if (!filepath) return "unknown";
  const normalized = filepath.replace(/\\/g, "/");
  const lastSlash = normalized.lastIndexOf("/");
  return lastSlash === -1 ? normalized : normalized.slice(lastSlash + 1);
}

export function extractExtension(filename: string): string {
  if (!filename) return "";
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1 || lastDot === filename.length - 1) return "";
  return filename.slice(lastDot + 1).toLowerCase();
}

export function extractDomain(url: string): string {
  if (!url || typeof url !== "string") return "";
  try {
    const hostname = new URL(url).hostname;
    return hostname ?? "";
  } catch {
    return "";
  }
}
