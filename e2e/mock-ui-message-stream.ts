import type { Route } from "@playwright/test";

/**
 * Hand-rolled slice of the AI SDK's `UIMessageChunk` wire protocol (ai@7 /
 * @ai-sdk/react@4 — see `node_modules/ai/dist/index.d.ts`'s `UIMessageChunk` union and
 * `JsonToSseTransformStream`), just enough to drive `useChat`'s `DefaultChatTransport`
 * through a real success and a real failure. Deliberately NOT imported from `ai` or from
 * our own route handler — this file only needs to speak the same wire format a real
 * backend does, which is the point of mocking at the network boundary (`page.route`)
 * instead of mocking a module: the browser never knows the difference, and the real
 * `/api/agents/[id]/chat` route (and the real Anthropic API behind it) is never reached.
 */
type UIMessageChunk = Record<string, unknown>;

function sseBody(chunks: UIMessageChunk[]): string {
  return chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("") + "data: [DONE]\n\n";
}

const SSE_HEADERS = {
  "content-type": "text/event-stream",
  "cache-control": "no-cache",
  connection: "keep-alive",
  "x-vercel-ai-ui-message-stream": "v1",
  "x-accel-buffering": "no",
};

/**
 * Fulfills a chat request with a successful assistant reply, split across two
 * `text-delta` chunks so the page's "streaming" state (thinking indicator -> partial
 * text -> final text) is actually exercised, not just a single jump to the final value.
 */
export async function fulfillWithAssistantReply(route: Route, text: string): Promise<void> {
  const id = "mock-text-1";
  const midpoint = Math.ceil(text.length / 2);
  await route.fulfill({
    status: 200,
    headers: SSE_HEADERS,
    body: sseBody([
      { type: "start" },
      { type: "start-step" },
      { type: "text-start", id },
      { type: "text-delta", id, delta: text.slice(0, midpoint) },
      { type: "text-delta", id, delta: text.slice(midpoint) },
      { type: "text-end", id },
      { type: "finish-step" },
      { type: "finish" },
    ]),
  });
}

/**
 * Fulfills a chat request the way the real route does for a provider failure: a plain
 * JSON error body with a non-2xx status, never a broken stream (see the catch branch in
 * `src/app/api/agents/[id]/chat/route.ts`).
 */
export async function fulfillWithError(route: Route, message: string, status = 500): Promise<void> {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify({ error: message }),
  });
}
