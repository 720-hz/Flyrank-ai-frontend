import { APICallError } from "ai";

export interface ChatErrorDescription {
  /** Safe to render directly — never raw JSON, a stack trace, or a bare browser error string. */
  message: string;
  /** True when this looks like a client-side connectivity problem rather than a server/model error. */
  isOffline: boolean;
}

const GENERIC_FALLBACK = "Something went wrong. Please try again.";
const OFFLINE_MESSAGE = "You appear to be offline. Check your connection and try again.";

/**
 * Turns whatever `useChat`'s `error` object actually contains into copy that's
 * safe to show a user. Two raw shapes need translating, not just forwarding
 * `error.message`:
 *
 *  - A non-2xx response from our own route (404 unknown agent, 400 bad body,
 *    500 pre-stream failure, a future 429) arrives as an `APICallError` whose
 *    `.message` is the RAW RESPONSE BODY TEXT, because `HttpChatTransport`
 *    doesn't parse the JSON for you — e.g. the literal string
 *    `{"error":"The agent failed to respond. Please try again."}`. Unwrap it.
 *  - A failed `fetch` itself (offline, DNS failure, connection reset before
 *    any response arrives) throws a plain `TypeError` with a terse browser
 *    string ("Failed to fetch", "Load failed", "NetworkError when attempting
 *    to fetch resource."). Replace it with something a user can act on.
 *
 * Anything else — most notably a mid-stream failure, which arrives as the
 * plain string our route's own `onError` chose (the designed
 * scoreIncidentSeverity failure, a rate-limit/overload notice, etc.) — is
 * already intentional, user-facing copy, so it passes through unchanged.
 */
export function describeChatError(error: unknown): ChatErrorDescription {
  if (error == null) {
    return { message: GENERIC_FALLBACK, isOffline: false };
  }

  if (isNetworkError(error)) {
    return { message: OFFLINE_MESSAGE, isOffline: true };
  }

  if (APICallError.isInstance(error)) {
    const unwrapped = unwrapJsonErrorBody(error.responseBody);
    return { message: unwrapped ?? (error.message || GENERIC_FALLBACK), isOffline: false };
  }

  if (error instanceof Error && error.message) {
    return { message: error.message, isOffline: false };
  }

  return { message: GENERIC_FALLBACK, isOffline: false };
}

function isNetworkError(error: unknown): boolean {
  if (!(error instanceof TypeError)) return false;
  const message = error.message.toLowerCase();
  return message.includes("fetch") || message.includes("network") || message.includes("load failed");
}

/** Our route always returns `{ "error": "..." }` on failure — pull that field out if present. */
function unwrapJsonErrorBody(responseBody: string | undefined): string | undefined {
  if (!responseBody) return undefined;
  try {
    const parsed: unknown = JSON.parse(responseBody);
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      "error" in parsed &&
      typeof (parsed as { error: unknown }).error === "string"
    ) {
      return (parsed as { error: string }).error;
    }
  } catch {
    // Not JSON — fall through and let the caller use error.message instead.
  }
  return undefined;
}
