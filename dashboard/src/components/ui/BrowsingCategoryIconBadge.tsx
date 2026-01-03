import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";

const BADGE_BG_ALPHA = "1A";

function tintedBackground(color: string): string | undefined {
  const t = color.trim();
  if (t.startsWith("#") && (t.length === 7 || t.length === 9)) {
    return `${t.slice(0, 7)}${BADGE_BG_ALPHA}`;
  }
  if (t.startsWith("#") && t.length === 4) {
    const r = t[1];
    const g = t[2];
    const b = t[3];
    return `#${r}${r}${g}${g}${b}${b}${BADGE_BG_ALPHA}`;
  }
  return undefined;
}

function resolveLucideIcon(iconName: string): LucideIcon {
  const Icon = (LucideIcons as Record<string, LucideIcon | undefined>)[
    iconName.trim()
  ];
  return Icon ?? LucideIcons.Folder;
}

export interface BrowsingCategoryIconBadgeProps {
  /** PascalCase name matching lucide-react export (e.g. `Code`, `Briefcase`). */
  iconName: string;
  color: string;
  size?: "sm" | "md";
  className?: string;
}

const sizeClasses = {
  sm: { box: "h-5 w-5", icon: "h-3 w-3" },
  md: { box: "h-7 w-7", icon: "h-4 w-4" },
} as const;

/**
 * Category icon on a tinted background — used when Brandfetch logo is missing.
 */
export function BrowsingCategoryIconBadge({
  iconName,
  color,
  size = "md",
  className = "",
}: BrowsingCategoryIconBadgeProps) {
  const hex = color.trim();
  const bgTint = tintedBackground(hex);
  const Icon = resolveLucideIcon(iconName);
  const s = sizeClasses[size];

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-xl ${bgTint ? "" : "bg-gray-100"} ${s.box} ${className}`}
      style={{
        ...(bgTint ? { backgroundColor: bgTint } : {}),
        color: hex,
      }}
      aria-hidden
    >
      <Icon className={s.icon} strokeWidth={2} />
    </span>
  );
}
