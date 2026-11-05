# Environment and AI toolchain

Capstone project for the FlyRank "Frontend Development with AI" track — 14 assignments,
building a production-style frontend with an AI coding assistant (Claude Code) doing most of
the heavy lifting, under human direction and review.

## Status

🚧 **Setup phase.** The actual product this repo will become hasn't been scoped yet — that
comes in a later assignment. Right now this is a scaffolded Next.js app plus the repo
conventions the rest of the track will build on.

## Stack (starting point, subject to change once the project is scoped)

- [Next.js](https://nextjs.org/) (React, TypeScript)
- [Tailwind CSS](https://tailwindcss.com/) for styling
- AI-assisted development via [Claude Code](https://code.claude.com/)

## Conventions

- Commits follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
  (`feat:`, `fix:`, `chore:`, `docs:`, etc.).
- See [`CLAUDE.md`](./CLAUDE.md) for the full stack/conventions reference Claude Code reads
  at the start of every session.

## Getting started

**Prerequisites**

- [Node.js](https://nodejs.org/) (current LTS) and npm
- Git
- [Claude Code](https://code.claude.com/) (optional, but it's how this project is built)

```bash
git clone https://github.com/720-hz/flyrank-frontend-capstone.git
cd flyrank-frontend-capstone
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Environment variables

Copy [`.env.example`](./.env.example) to `.env.local` and fill in real values for local
development — `.env.local` is gitignored, never commit it. In Vercel, set the same variables
under Project Settings → Environment Variables, separately per environment (Production /
Preview / Development).

## Tool contract (FE-07)

The Incident Summarizer agent (`/agents/incident-summarizer`) can call one server-side tool.
Defined in [`src/lib/ai/tools.ts`](./src/lib/ai/tools.ts), wired into that agent only via
`AGENT_TOOLS` in [`src/lib/ai/config.ts`](./src/lib/ai/config.ts).

### `scoreIncidentSeverity`

Computes an objective, deterministic SEV1–SEV4 severity score from a few facts about an
incident's impact — the model reports what happened, the tool (not the model) decides how bad
it was.

**Input schema** (Zod, `scoreIncidentSeverityInputSchema`):

| Field | Type | Notes |
| --- | --- | --- |
| `impactSummary` | `string` (1–280 chars) | One plain-language sentence describing what broke. |
| `affectedUsersEstimate` | `"none" \| "some" \| "most" \| "all"` | Rough fraction of users who hit the problem. `"none"` = internal-only. |
| `durationMinutes` | `number` (int, ≥ 0) | Minutes from first user-facing impact to resolution. |
| `dataWasLostOrCorrupted` | `boolean` | Whether any user data was lost or corrupted. |

**Return shape** (`ScoreIncidentSeverityOutput`):

```ts
{
  level: "SEV1" | "SEV2" | "SEV3" | "SEV4";
  score: number;        // 0–100, higher is worse
  factors: Array<{ label: string; points: number; detail: string }>;
  recommendation: string;
}
```

Scoring is a plain additive rubric (affected-user tier + duration tier + a data-loss
penalty, clamped to 100) — see `computeIncidentSeverity` for the exact breakpoints. It's
unit-tested directly in `src/lib/ai/tools.test.ts`, independent of the model.

**Designed failure mode:** a `durationMinutes` over 20,160 (14 days) is treated as an almost
certain units mistake (e.g. seconds entered as minutes) rather than a real incident, and the
tool throws instead of scoring it. That message reaches the client as the tool part's
`errorText` — see the `onError` passed to `toUIMessageStreamResponse()` in
`src/app/api/agents/[id]/chat/route.ts`, which surfaces a thrown `Error`'s message instead of
the AI SDK's default generic "An error occurred." (only for errors; nothing about *successful*
tool inputs or outputs changes). Trigger it by telling the agent an incident lasted an
implausible number of minutes.

**Rendering:** `src/app/agents/[id]/tool-parts.tsx` renders all four tool-part states the AI
SDK emits (`input-streaming`, `input-available`, `output-available`, `output-error`) with a
distinct visual per state — the first two show the input filling in inside a pending card
(placeholders for fields not yet streamed), `output-available` renders a real
`IncidentSeverityCard` component (badge + score bar + factor breakdown + recommendation, not
a JSON dump), and `output-error` renders a red error card with the specific message above.

## Resilience & failure states (FE-08)

Inventory of the primary flow's (`/agents/[id]`'s streaming chat) expected and unexpected
failure modes, and how each is handled:

| Case | Handling |
| --- | --- |
| Mid-stream failure (model overloaded, rate-limited, connection drops after streaming starts) | The route's `onError` surfaces a designed message; the chat shows a red error card with that message and a **Retry** button that calls `regenerate()` — resending only the failed turn, not the whole conversation (`src/app/agents/[id]/agent-chat.tsx`). |
| Pre-stream failure (missing/invalid API key, a provider error before any chunk streams) | The route's top-level `catch` returns `{ error }` JSON with the right status. `HttpChatTransport` doesn't parse that JSON for you — its `.message` is the raw response *text* — so `describeChatError` (`src/lib/ai/chat-error.ts`) unwraps the `error` field instead of showing the literal `{"error":"..."}` string. |
| Rate limit / provider overload | `describeProviderError` (`src/lib/ai/server-error.ts`) recognizes an `APICallError` with status 429/503/529 and returns actionable copy ("wait a moment and try again") instead of raw provider text — used from both the pre-stream `catch` and the mid-stream `onError`, so the two paths agree. |
| Network failure before send | `useOnlineStatus` (`src/lib/use-online-status.ts`, built on `useSyncExternalStore`) shows a banner and disables Send/the textarea the moment the browser goes offline, instead of waiting for a fetch to fail first. |
| Empty / whitespace-only input | Unchanged from FE-06 — Send stays disabled. |
| First-run / no conversation yet | Each agent now ships two realistic `examplePrompts` (`src/lib/ai/config.ts`); the empty state renders them as click-to-fill chips instead of a bare sentence. |
| Unknown agent (e.g. `/agents/does-not-exist`) | `agents/[id]/not-found.tsx` explains why and links back to `/agents`, instead of Next's generic 404. |
| Uncaught render error | `app/error.tsx` (app-wide) and the more specific `agents/[id]/error.tsx` both offer **Try again** (Next's `retry()`) and a way back; `app/global-error.tsx` covers a crash in the root layout itself, with its own inline styles since it replaces the whole document. |
| Slow response | FE-06's thinking-dots indicator, plus new `loading.tsx` skeletons on `/agents` and `/agents/[id]` sized to the real layout so there's no shift when content swaps in. |
| Mobile Safari | The chat textarea is `text-base` (16px) at every breakpoint — under 16px, iOS Safari auto-zooms the page on focus, which on a chat screen means every send yanks the viewport in and out. Verified at 375×667 with zero horizontal overflow in both the empty and error states. |

All of the above were exercised live against the dev server with Playwright — intercepting
the chat route to simulate each failure rather than depending on the real provider — not just
unit-tested: happy path, mid-stream overload followed by a successful retry, a pre-stream 500
(confirms the JSON body doesn't leak as literal text), a 429, the offline banner, the
unknown-agent 404, and the mobile viewport in both the empty and error states. Zero uncaught
page errors across all of them; the only console output was the browser's own network-level
logging of the intentionally-sabotaged non-2xx responses, which is unavoidable for any failed
request and not specific to this app.
