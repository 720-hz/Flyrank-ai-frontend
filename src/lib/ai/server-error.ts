import { APICallError } from "ai";

/**
 * Friendlier, user-actionable copy for the provider-side conditions that are
 * common enough to design for on purpose: being rate-limited, and the model
 * being temporarily overloaded. Both are conditions a user can do something
 * about (wait, then retry) rather than a dead end.
 *
 * Used from both the chat route's top-level catch (a pre-stream failure) and
 * its `onError` (a mid-stream failure) so the two paths agree on copy. Any
 * other error — a thrown programmer/config error, an unrecognized provider
 * error — returns `undefined` so the caller falls back to its own generic
 * message; server internals never reach the client verbatim.
 */
export function describeProviderError(error: unknown): { message: string; status: number } | undefined {
  if (!APICallError.isInstance(error)) return undefined;

  if (error.statusCode === 429) {
    return {
      message: "Claude is receiving a lot of requests right now. Wait a moment and try again.",
      status: 429,
    };
  }

  if (error.statusCode === 503 || error.statusCode === 529) {
    return {
      message: "Claude is temporarily overloaded. Wait a moment and try again.",
      status: 503,
    };
  }

  return undefined;
}
