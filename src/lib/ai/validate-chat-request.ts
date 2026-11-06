/**
 * Input caps for the chat route (FE-14 production hygiene).
 *
 * `CHAT_GENERATION_SETTINGS.maxOutputTokens` (config.ts) already caps what one turn can cost on
 * the *output* side. Nothing capped the *input* side until now — a script could send one
 * message with megabytes of text, or hundreds of messages, and every one of those input tokens
 * still gets billed even though the reply is capped. These checks run before `streamText` is
 * ever called, so an oversized request is rejected for free instead of spending a model call to
 * reject it.
 */
import { isTextUIPart, type UIMessage } from "ai";

/** Max turns in one conversation. Generous for real chat use, cheap to reject beyond it. */
export const MAX_MESSAGES = 40;

/** Max characters in a single message's text parts combined. */
export const MAX_MESSAGE_CHARS = 4_000;

/** Max characters across every message's text parts combined, for the whole request. */
export const MAX_TOTAL_CHARS = 20_000;

export interface ChatRequestValidationError {
  error: string;
}

function textLength(message: UIMessage): number {
  return message.parts
    .filter(isTextUIPart)
    .reduce((total, part) => total + part.text.length, 0);
}

/**
 * Validates an already-parsed `messages` array against the caps above. Returns `null` when the
 * request is within bounds, or a ready-to-send `{ error }` body (for a 400 response) describing
 * the first cap it hit — checked in the order a user would actually notice them: too many
 * messages, then one oversized message, then the whole conversation's total.
 */
export function validateChatRequest(messages: UIMessage[]): ChatRequestValidationError | null {
  if (messages.length > MAX_MESSAGES) {
    return {
      error: `Conversation is too long (${messages.length} messages, max ${MAX_MESSAGES}). Start a new chat.`,
    };
  }

  let totalChars = 0;
  for (const message of messages) {
    const length = textLength(message);
    if (length > MAX_MESSAGE_CHARS) {
      return { error: `Message is too long (${length} characters, max ${MAX_MESSAGE_CHARS}).` };
    }
    totalChars += length;
  }

  if (totalChars > MAX_TOTAL_CHARS) {
    return {
      error: `Conversation is too long (${totalChars} characters, max ${MAX_TOTAL_CHARS}). Start a new chat.`,
    };
  }

  return null;
}
