import {
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Code,
  File,
  type LucideIcon,
} from "lucide-react";

/**
 * File category → icon + color per DOWNLOADS_UI_SPEC (Section 4, 5, drawer).
 * Backend fileCategory from file-utils: document | image | text | code | executable | archive | audio | video | other
 */
const CATEGORY_CONFIG: Record<
  string,
  { Icon: LucideIcon; color: string }
> = {
  document: { Icon: FileText, color: "#2563EB" },
  image: { Icon: Image, color: "#7C3AED" },
  video: { Icon: Video, color: "#E11D48" },
  audio: { Icon: Music, color: "#059669" },
  archive: { Icon: Archive, color: "#EA580C" },
  code: { Icon: Code, color: "#0891B2" },
  text: { Icon: FileText, color: "#2563EB" },
  executable: { Icon: File, color: "#94A3B8" },
  other: { Icon: File, color: "#94A3B8" },
};

const DEFAULT_CONFIG = { Icon: File, color: "#94A3B8" };

export interface FileIconProps {
  /** Category from File.fileCategory (backend uses file-utils categories) */
  category?: string | null;
  /** Size of the icon container (spec: w-8 h-8 for feed/drawer rows) */
  size?: "sm" | "md";
  className?: string;
}

const sizeClasses = {
  sm: "w-6 h-6",
  md: "w-8 h-8",
} as const;

export function FileIcon({
  category,
  size = "md",
  className = "",
}: FileIconProps) {
  const normalized = (category ?? "other").toLowerCase();
  const { Icon, color } =
    CATEGORY_CONFIG[normalized] ?? DEFAULT_CONFIG;
  const sizeClass = sizeClasses[size];

  return (
    <span
      className={`flex items-center justify-center flex-shrink-0 rounded ${sizeClass} ${className}`}
      style={{ backgroundColor: `${color}18`, color }}
      aria-hidden
    >
      <Icon className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
    </span>
  );
}
