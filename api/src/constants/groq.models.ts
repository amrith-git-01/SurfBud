/**
 * Groq chat model fallback order: first model is primary; on error or rate limit,
 * the next model is used (see `chatCompletionWithModelFallback`).
 * IDs must match Groq Cloud model strings.
 */
export const GROQ_CHAT_MODEL_FALLBACK_CHAIN: readonly string[] = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "llama-3.3-70b-versatile",
] as const;
