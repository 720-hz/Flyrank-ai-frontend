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
