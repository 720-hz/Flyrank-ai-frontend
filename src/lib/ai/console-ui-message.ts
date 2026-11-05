import type { InferUITools, UIDataTypes, UIMessage } from "ai";
import type { scoreIncidentSeverity } from "@/lib/ai/tools";

/**
 * Every tool any agent in this console can call, keyed by name. One union
 * type across all agents (rather than a type per agent) keeps the client
 * simple: `useChat` and the tool-part renderer are typed once, against the
 * full set, and an agent that doesn't have a given tool just never emits
 * that part.
 *
 * `import type` only — this never pulls the actual tool implementation (or
 * `zod`) into the client bundle, just its shape.
 */
type ConsoleTools = {
  scoreIncidentSeverity: typeof scoreIncidentSeverity;
};

/** The `UIMessage` shape used everywhere on the client, with real tool-part types. */
export type ConsoleUIMessage = UIMessage<unknown, UIDataTypes, InferUITools<ConsoleTools>>;

export type ConsoleUIMessagePart = ConsoleUIMessage["parts"][number];

export type ConsoleToolPart = Extract<ConsoleUIMessagePart, { type: `tool-${string}` }>;

export function isToolPart(part: ConsoleUIMessagePart): part is ConsoleToolPart {
  return part.type.startsWith("tool-");
}
