/**
 * Domains excluded from the dashboard "recent sessions" feed (spec § context switches / noise).
 * Aligns with IGNORED_DOMAINS-style filtering so localhost / internal hosts do not appear as "sites".
 */
const EXCLUDED_EXACT = new Set(
  ["newtab", "chrome", "extensions", "settings", "about", "blank"].map((d) =>
    d.toLowerCase(),
  ),
);

export function isDomainExcludedFromBrowsingFeed(domain: string): boolean {
  const d = domain.trim().toLowerCase();
  if (d.length === 0) return true;
  if (EXCLUDED_EXACT.has(d)) return true;
  if (d.startsWith("192.168.")) return true;
  return false;
}
