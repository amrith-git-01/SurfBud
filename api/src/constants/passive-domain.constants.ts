export const PASSIVE_DOMAIN_SUBSTRINGS: readonly string[] = [
  "youtube.com",
  "netflix.com",
  "spotify.com",
  "twitch.tv",
  "disneyplus.com",
  "hulu.com",
  "primevideo.com",
] as const;
export function isPassiveDomain(hostname: string): boolean {
  const lower = hostname.trim().toLowerCase();
  return PASSIVE_DOMAIN_SUBSTRINGS.some((frag) => lower.includes(frag));
}
