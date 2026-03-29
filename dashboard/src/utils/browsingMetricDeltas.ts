import { formatDurationSeconds } from "./formatDuration";

/** Delta for count metrics — same pattern as downloads overview cards. */
export function toCountDelta(
  difference: number,
  suffix: string,
): { direction: "up" | "down"; text: string } {
  if (difference >= 0) {
    return {
      direction: "up",
      text: `${Math.abs(difference)} ${suffix}`,
    };
  }
  return {
    direction: "down",
    text: `${Math.abs(difference)} ${suffix}`,
  };
}

/** Delta for duration metrics — formatted duration change vs baseline. */
export function toDurationDelta(
  currentSeconds: number,
  previousSeconds: number,
  suffix = "vs yesterday",
): { direction: "up" | "down"; text: string } {
  const diff = currentSeconds - previousSeconds;
  const abs = Math.abs(diff);
  const formatted = formatDurationSeconds(abs);
  if (diff >= 0) {
    return { direction: "up", text: `${formatted} ${suffix}` };
  }
  return { direction: "down", text: `${formatted} ${suffix}` };
}

export function avgSessionSeconds(
  totalActiveTimeSeconds: number,
  sessionCount: number,
): number {
  if (sessionCount <= 0) return 0;
  return Math.round(totalActiveTimeSeconds / sessionCount);
}

/**
 * When `sessionCount` is missing/0 in stored metrics but we have active time,
 * derive a lower bound from context switches (≥1 session; ≥ switches+1 edges).
 */
export function effectiveSessionCountForAvg(params: {
  totalActiveTimeSeconds: number;
  storedSessionCount: number;
  contextSwitches: number;
}): number {
  const { totalActiveTimeSeconds, storedSessionCount, contextSwitches } =
    params;
  if (storedSessionCount > 0) return storedSessionCount;
  if (totalActiveTimeSeconds <= 0) return 0;
  return Math.max(1, contextSwitches + 1);
}
