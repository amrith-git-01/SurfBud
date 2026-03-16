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

export type FileCategory =
  | "document"
  | "video"
  | "audio"
  | "archive"
  | "code"
  | "image"
  | "text"
  | "executable"
  | "other";

const DOCUMENT_EXTENSIONS = new Set(["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "mkv", "mov", "webm", "avi", "m4v"]);
const AUDIO_EXTENSIONS = new Set(["mp3", "wav", "flac", "aac", "ogg", "m4a"]);
const ARCHIVE_EXTENSIONS = new Set(["zip", "rar", "7z", "tar", "gz", "bz2", "xz"]);
const CODE_EXTENSIONS = new Set(["js", "ts", "tsx", "jsx", "py", "java", "go", "rs", "cpp", "c", "h", "css", "html", "json", "yml", "yaml", "md"]);
const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico", "tiff"]);
const TEXT_EXTENSIONS = new Set(["txt", "rtf", "csv", "log", "ini", "cfg"]);
const EXECUTABLE_EXTENSIONS = new Set(["exe", "msi", "dmg", "pkg", "app", "sh", "bat", "ps1"]);

export function inferFileCategory(filename: string, mimeType?: string): FileCategory {
  const extension = extractExtension(filename);
  const normalizedMime = (mimeType ?? "").toLowerCase();

  if (DOCUMENT_EXTENSIONS.has(extension) || normalizedMime.includes("application/pdf")) {
    return "document";
  }
  if (VIDEO_EXTENSIONS.has(extension) || normalizedMime.startsWith("video/")) {
    return "video";
  }
  if (AUDIO_EXTENSIONS.has(extension) || normalizedMime.startsWith("audio/")) {
    return "audio";
  }
  if (
    ARCHIVE_EXTENSIONS.has(extension)
    || normalizedMime.includes("zip")
    || normalizedMime.includes("compressed")
  ) {
    return "archive";
  }
  if (CODE_EXTENSIONS.has(extension)) {
    return "code";
  }
  if (IMAGE_EXTENSIONS.has(extension) || normalizedMime.startsWith("image/")) {
    return "image";
  }
  if (TEXT_EXTENSIONS.has(extension) || normalizedMime.startsWith("text/")) {
    return "text";
  }
  if (EXECUTABLE_EXTENSIONS.has(extension)) {
    return "executable";
  }

  return "other";
}
