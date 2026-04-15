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
