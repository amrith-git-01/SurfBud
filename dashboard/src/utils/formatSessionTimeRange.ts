/**
 * Formats a same-day time range for display (e.g. "7:54 – 8:16 AM") in `timeZone`.
 */
export function formatSessionTimeRangeInZone(
  startIso: string,
  endIso: string,
  timeZone: string,
): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const opts: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  };
  return `${start.toLocaleTimeString(undefined, opts)} – ${end.toLocaleTimeString(undefined, opts)}`;
}
