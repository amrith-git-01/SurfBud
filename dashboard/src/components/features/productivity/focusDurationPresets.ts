export const FOCUS_DURATION_SELECT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "none", label: "No timer" },
  { value: "30", label: "30 minutes" },
  { value: "60", label: "1 hour" },
  { value: "120", label: "2 hours" },
];

const STANDARD_MINUTES = new Set([30, 60, 120]);

export function durationOptionsForPlannedMins(
  plannedMins: number | null,
): Array<{ value: string; label: string }> {
  const opts = [...FOCUS_DURATION_SELECT_OPTIONS];
  if (
    plannedMins != null &&
    !STANDARD_MINUTES.has(plannedMins)
  ) {
    opts.splice(1, 0, {
      value: String(plannedMins),
      label: `${plannedMins} minutes (saved)`,
    });
  }
  return opts;
}

export function plannedMinsToSelectValue(plannedMins: number | null): string {
  if (plannedMins == null) {
    return "none";
  }
  return String(plannedMins);
}

export function selectValueToPlannedMins(value: string): number | null {
  if (value === "none") {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
