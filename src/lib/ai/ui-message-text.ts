import type { UIMessage } from "ai";

/**
 * Concatenates a UIMessage's text parts into a single string. A message can have
 * other part types (reasoning, tool calls, files) mixed in — this only extracts
 * what's renderable as plain/markdown text, which is all these agents produce.
 */
export function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is Extract<UIMessage["parts"][number], { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("");
}
