export const FILE_CATEGORIES = [
  "document",
  "image",
  "text",
  "code",
  "executable",
  "archive",
  "audio",
  "video",
  "other",
] as const;

export type FileCategory = (typeof FILE_CATEGORIES)[number];

function getFileExtension(filename: string): string | undefined {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1 || lastDot === filename.length - 1) return undefined;
  return filename.slice(lastDot + 1).toLowerCase();
}
export function inferFileCategory(opts: {
  filename?: string;
  mimeType?: string;
}): { fileExtension?: string; category: FileCategory } {
  const fileExtension = opts.filename
    ? getFileExtension(opts.filename)
    : undefined;
  const ext = fileExtension ?? "";
  const mime = (opts.mimeType ?? "").toLowerCase();
  // --- Executables first (most dangerous)
  const executableExts = new Set([
    "exe",
    "msi",
    "dmg",
    "pkg",
    "appimage",
    "deb",
    "rpm",
    "sh",
    "bat",
    "cmd",
    "ps1",
    "apk",
  ]);
  if (executableExts.has(ext)) {
    return { fileExtension, category: "executable" };
  }
  // --- Archives
  const archiveExts = new Set([
    "zip",
    "rar",
    "7z",
    "tar",
    "gz",
    "tgz",
    "bz2",
    "xz",
  ]);
  if (archiveExts.has(ext)) {
    return { fileExtension, category: "archive" };
  }
  // --- Documents
  const documentExts = new Set([
    "pdf",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "ppt",
    "pptx",
    "odt",
    "ods",
    "odp",
    "rtf",
  ]);
  if (
    documentExts.has(ext) ||
    mime === "application/pdf" ||
    mime === "application/msword" ||
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mime === "application/vnd.ms-excel" ||
    mime ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mime === "application/vnd.ms-powerpoint" ||
    mime ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ) {
    return { fileExtension, category: "document" };
  }
  // --- Images
  const imageExts = new Set([
    "jpg",
    "jpeg",
    "png",
    "gif",
    "webp",
    "svg",
    "heic",
    "heif",
    "tif",
    "tiff",
  ]);
  if (imageExts.has(ext) || mime.startsWith("image/")) {
    return { fileExtension, category: "image" };
  }
  // --- Audio
  const audioExts = new Set([
    "mp3",
    "wav",
    "flac",
    "m4a",
    "aac",
    "ogg",
    "oga",
    "opus",
  ]);
  if (audioExts.has(ext) || mime.startsWith("audio/")) {
    return { fileExtension, category: "audio" };
  }
  // --- Video
  const videoExts = new Set(["mp4", "m4v", "mov", "avi", "mkv", "webm", "wmv"]);
  if (videoExts.has(ext) || mime.startsWith("video/")) {
    return { fileExtension, category: "video" };
  }
  // --- Plain / rich text
  const textExts = new Set([
    "txt",
    "md",
    "markdown",
    "log",
    "csv",
    "tsv",
    "json",
    "yaml",
    "yml",
  ]);
  if (textExts.has(ext) || mime.startsWith("text/")) {
    return { fileExtension, category: "text" };
  }
  // --- Code
  const codeExts = new Set([
    "js",
    "ts",
    "tsx",
    "jsx",
    "mjs",
    "cjs",
    "py",
    "rb",
    "go",
    "java",
    "kt",
    "cs",
    "cpp",
    "cxx",
    "cc",
    "c",
    "rs",
    "php",
    "html",
    "css",
    "scss",
    "less",
    "sql",
  ]);
  if (codeExts.has(ext)) {
    return { fileExtension, category: "code" };
  }
  // Fallback
  return { fileExtension, category: "other" };
}
