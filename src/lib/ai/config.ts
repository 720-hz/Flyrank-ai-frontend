/**
 * Centralized AI configuration for Flyrank Console.
 *
 * This is the single source of truth for "how we talk to Claude": the model,
 * generation settings, and every agent's system prompt live here, not scattered
 * across route handlers. FE-07 builds directly on this module (per the FE-06
 * brief), so keep new agents/behaviors added here rather than duplicated in a
 * route handler.
 */
import { anthropic } from "@ai-sdk/anthropic";

/**
 * Model id, overridable via env so a model bump doesn't need a code change.
 * claude-sonnet-4-5 is the default: strong instruction-following and fast
 * enough for a chat UI, at a fraction of an Opus-class model's cost.
 */
export const CHAT_MODEL_ID = process.env.ANTHROPIC_MODEL_ID ?? "claude-sonnet-4-5";

/**
 * The AI SDK provider automatically reads ANTHROPIC_API_KEY from the server
 * process's environment — it is never read client-side and never shipped to
 * the browser. Set it in `.env.local` for local dev and in Vercel's Project
 * Settings -> Environment Variables for deployed previews/production.
 */
export const chatModel = anthropic(CHAT_MODEL_ID);

/**
 * Generation settings shared by every agent. Kept conservative and deterministic-ish
 * on purpose: these agents answer questions about an engineering console's own
 * configs/runs, not writing open-ended creative text.
 */
export const CHAT_GENERATION_SETTINGS = {
  temperature: 0.4,
  maxOutputTokens: 1024,
} as const;

export interface ConsoleAgent {
  /** URL-safe id — used as the dynamic segment in /agents/[id] and the chat route. */
  id: string;
  name: string;
  /** One-line description shown on the /agents list. */
  description: string;
  /** Sent as the `system` message on every turn of this agent's conversation. */
  systemPrompt: string;
}

/**
 * The agents this console exposes. No real backend yet (same placeholder-until-wired
 * posture as the rest of the product per SPEC.md) — this array *is* the agent registry
 * for now. Swapping it for a real data source later shouldn't require touching the
 * route handler or the chat UI, only this file.
 */
export const CONSOLE_AGENTS: ConsoleAgent[] = [
  {
    id: "pr-reviewer",
    name: "PR Reviewer",
    description: "Reviews a pull request diff for bugs, style issues, and missing tests.",
    systemPrompt: `You are the PR Reviewer agent inside Flyrank Console, an internal tool \
engineers use to monitor and run AI-assisted automations.

Your job: when a user pastes a diff or describes a change, review it like a careful senior \
engineer doing code review. Call out real bugs and edge cases first, then style/convention \
issues, then missing or weak test coverage. Be specific — point at the exact line or \
function, not vague generalities. If the change looks solid, say so briefly instead of \
inventing nitpicks. Keep responses focused and skimmable; this is a chat panel, not a \
formal review document.`,
  },
  {
    id: "release-notes",
    name: "Release Notes Drafter",
    description: "Turns a list of merged changes into clean, user-facing release notes.",
    systemPrompt: `You are the Release Notes Drafter agent inside Flyrank Console.

Your job: when a user pastes a list of commits, PR titles, or merged changes, draft clean \
release notes from them. Group related changes, translate internal/technical phrasing into \
plain language a user of the product would understand, and separate user-facing changes \
from internal-only ones (bump internal-only items to the bottom under their own heading, or \
drop them if asked). Use short, confident sentences. Ask a clarifying question only if the \
input is too sparse to draft anything useful from.`,
  },
  {
    id: "incident-summarizer",
    name: "Incident Summarizer",
    description: "Turns a raw incident timeline into a structured postmortem summary.",
    systemPrompt: `You are the Incident Summarizer agent inside Flyrank Console.

Your job: when a user pastes a raw incident timeline (timestamps, log lines, chat excerpts, \
whatever they have), turn it into a structured summary: what happened, when it started and \
was resolved, likely root cause (flagged clearly as "likely" if not confirmed by the input), \
impact, and suggested follow-up actions. Stay neutral and factual — this feeds a postmortem, \
not a blame narrative. If the timeline has gaps, note them explicitly rather than guessing.`,
  },
];

export function getAgentById(id: string): ConsoleAgent | undefined {
  return CONSOLE_AGENTS.find((agent) => agent.id === id);
}
