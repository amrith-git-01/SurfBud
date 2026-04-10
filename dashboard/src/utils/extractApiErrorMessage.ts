export function extractApiErrorMessage(err: unknown, fallback: string): string {
  const msg = (err as { response?: { data?: { message?: string; error?: { message?: string } } } })
    ?.response?.data?.error?.message;
  if (typeof msg === "string" && msg.trim()) return msg;
  const alt = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
  if (typeof alt === "string" && alt.trim()) return alt;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
