import type { BrowsingStatsPeriod } from "../schemas/browsing.schemas";

/**
 * Returns 'YYYY-MM-DD' in the given IANA timezone.
 * Uses en-CA locale which produces YYYY-MM-DD natively — no string manipulation needed.
 */
export function toDateString(date: Date, timezone: string = "UTC"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Returns 'YYYY-MM-DD' of the Monday of the week containing `date`, in the given timezone.
 */
export function getMondayString(date: Date, timezone: string = "UTC"): string {
  const localDateStr = toDateString(date, timezone);
  const parts = localDateStr.split("-").map((x) => parseInt(x, 10));
  const y = parts[0] ?? 0;
  const m = (parts[1] ?? 1) - 1;
  const d = parts[2] ?? 1;
  const utcDate = new Date(Date.UTC(y, m, d, 12, 0, 0));
  const day = utcDate.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  utcDate.setUTCDate(utcDate.getUTCDate() + diff);
  return `${utcDate.getUTCFullYear()}-${String(utcDate.getUTCMonth() + 1).padStart(2, "0")}-${String(utcDate.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Returns 'YYYY-MM-DD' of the 1st of the month containing `date`, in the given timezone.
 */
export function getMonthStartString(
  date: Date,
  timezone: string = "UTC",
): string {
  const localDateStr = toDateString(date, timezone);
  const [y, m] = localDateStr.split("-");
  return `${y}-${m}-01`;
}

/**
 * Inclusive calendar bounds (YYYY-MM-DD in `timezone`) for breakdown stats.
 * `all` → no date filter (both null).
 */
export function getStatsPeriodDateBounds(
  period: BrowsingStatsPeriod,
  timezone: string,
  anchorDate?: string,
): { from: string | null; to: string | null } {
  const now = new Date();
  const todayStr = toDateString(now, timezone);

  if (period === "all") {
    return { from: null, to: null };
  }
  if (period === "today") {
    const d = anchorDate ?? todayStr;
    return { from: d, to: d };
  }
  if (period === "week") {
    return { from: getMondayString(now, timezone), to: todayStr };
  }
  if (period === "month") {
    return { from: getMonthStartString(now, timezone), to: todayStr };
  }
  return { from: todayStr, to: todayStr };
}

/**
 * Last instant of the given calendar day in `timezone` (end of local day).
 */
export function endOfDateInTimezone(dateStr: string, timezone: string): Date {
  const start = startOfDateInTimezone(dateStr, timezone);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

/**
 * Returns a Date (UTC instant) representing midnight at the start of the given
 * date string (YYYY-MM-DD) in the given IANA timezone.
 */
export function startOfDateInTimezone(dateStr: string, timezone: string): Date {
  const ref = new Date(dateStr + "T12:00:00Z");
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(ref);
  const part = (name: string) =>
    parts.find((p) => p.type === name)?.value ?? "0";
  const localHour = parseInt(part("hour"), 10);
  const localMin = parseInt(part("minute"), 10);
  const localSec = parseInt(part("second"), 10);
  const msToSubtract =
    (localHour * 3600 + localMin * 60 + localSec) * 1000;
  return new Date(ref.getTime() - msToSubtract);
}

/**
 * Returns true if the given IANA timezone is currently within windowMinutes AFTER midnight.
 * Only checks 00:00–00:windowMinutes — never before the day ends (23:30–23:59).
 * Uses formatToParts — no locale-dependent string parsing.
 */
/** Local calendar hour 0–23 for `date` in the given IANA timezone. */
export function hourOfDayInTimezone(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    hour12: false,
  }).formatToParts(date);
  return Number(parts.find((p) => p.type === "hour")?.value ?? "0");
}

export function isAtMidnight(
  tz: string,
  windowMinutes: number = 30,
): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const h = Number(parts.find((p) => p.type === "hour")?.value ?? "99");
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? "99");

  return h === 0 && m <= windowMinutes;
}
