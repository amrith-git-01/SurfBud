import Groq from "groq-sdk";
import { APIError } from "groq-sdk";
import type {
  ChatCompletion,
  ChatCompletionCreateParamsNonStreaming,
} from "groq-sdk/resources/chat/completions";
import { GROQ_CHAT_MODEL_FALLBACK_CHAIN } from "../constants/groq.models";
import { logger } from "./logger";

function isAuthenticationFailure(err: unknown): boolean {
  return err instanceof APIError && err.status === 401;
}

/**
 * Tries each model in {@link GROQ_CHAT_MODEL_FALLBACK_CHAIN} in order.
 * Stops on first success. Retries with the next model on rate limits, server errors,
 * or other failures — except **401**, which is rethrown (invalid API key).
 */
export async function chatCompletionWithModelFallback(
  groq: Groq,
  params: Omit<ChatCompletionCreateParamsNonStreaming, "model">,
): Promise<ChatCompletion> {
  let lastError: unknown;

  for (const model of GROQ_CHAT_MODEL_FALLBACK_CHAIN) {
    try {
      const completion = await groq.chat.completions.create({
        ...params,
        model,
      });
      if (model !== GROQ_CHAT_MODEL_FALLBACK_CHAIN[0]) {
        logger.info(
          { usedModel: model },
          "Groq: succeeded with fallback model",
        );
      }
      return completion;
    } catch (err) {
      lastError = err;
      if (isAuthenticationFailure(err)) {
        logger.error("Groq: authentication failed — not trying other models");
        throw err;
      }
      const status =
        err instanceof APIError ? err.status : undefined;
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(
        { model, status, message },
        "Groq chat completion failed — trying next model in chain",
      );
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error("All Groq models in fallback chain failed");
}
