# SPEC — Flyrank Console

No product had been scoped for this repo before FE-04 (`README.md`/`CLAUDE.md` said so
explicitly). This is that scoping, proposed as part of FE-04 since the assignment needs a
spec to scaffold placeholders against.

## What it is

**Flyrank Console** — a lightweight internal console for monitoring AI-assisted engineering
work: the agents/automations that run, the individual runs they produce, and a personal
account section. Think "the kind of internal tool a small engineering team actually uses
day to day," not a product marketing site — that's also the brief's design mood
("engineered and quietly confident... reads like well-documented output from a working
system, never like a pitch deck"). No real backend exists yet; every list/detail screen is a
routed placeholder until a later assignment wires it to real data, the same way `/health` is
the one screen in this assignment that fetches and renders something real.

## Sitemap

| Route | Screen | Status |
|---|---|---|
| `/` | Dashboard — at-a-glance summary (agent/run counts, health badge, recent activity) | Placeholder |
| `/agents` | Agents — list of configured agents/automations | **Built** (FE-06) |
| `/agents/[id]` | Agent detail — streaming chat with that agent (FE-06) | **Built** (FE-06) |
| `/runs` | Runs — list of execution runs across all agents | Placeholder |
| `/runs/[id]` | Run detail — a single run's input/output/status | Placeholder |
| `/health` | Health — system status, fetched live from `/api/health` | **Built** (fetches real data) |
| `/account` | Account overview — summary of saved settings | **Built** (FE-03) |
| `/account/settings` | Settings — validated profile/notification form | **Built** (FE-02/FE-03) |
| `/account/activity` | Activity — log of account actions | **Built** (FE-03) |

Every route above has existed and been reachable from the root nav since FE-04 — "every
screen in the spec exists as a routed placeholder" per that assignment's evaluation
criteria. Status is updated here as later assignments build each one out for real: Account
(FE-02/FE-03), Agents (FE-06 — streaming chat, see below), still-placeholder Dashboard/Runs
are expected gaps, not oversights.

## Agents (FE-06)

`/agents/[id]` is the console's "central AI interaction" per FE-06: a real streaming
conversation with one of three agents, each with its own system prompt (PR Reviewer,
Release Notes Drafter, Incident Summarizer — see `src/lib/ai/config.ts`, the single module
that owns every agent's system prompt and the shared model config). No persistence yet —
refreshing loses the conversation, same "no real backend" posture as the rest of the
product. A natural fit for `/runs`: logging each conversation as a Run is the obvious next
step, left for a later assignment rather than scope-creeping into this one.

## Tool calling / generative UI (FE-07)

The Incident Summarizer agent can call a server-side tool, `scoreIncidentSeverity`
(`src/lib/ai/tools.ts`), to compute an objective SEV1–SEV4 severity score instead of having
the model guess one in prose. The tool's four lifecycle states (input streaming, input
available, output available, output error) each render distinctly in
`src/app/agents/[id]/tool-parts.tsx`; a successful result renders as a scorecard component
(`IncidentSeverityCard`), not a JSON dump. Full contract documented in the README's
"Tool contract" section. Only this one agent has a tool today (`AGENT_TOOLS` in
`src/lib/ai/config.ts` is per-agent) — PR Reviewer and Release Notes Drafter stay prose-only
since neither has a structured result worth rendering as a component yet.

## Navigation structure

Root layout nav: **Dashboard · Agents · Runs · Health · Account**. "Account" expands to the
existing three-tab sub-nav (Overview / Settings / Activity) already built in
`src/app/account/account-nav.tsx` — this assignment doesn't change that, just links to it
from the root.
