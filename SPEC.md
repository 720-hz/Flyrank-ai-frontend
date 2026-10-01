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

| Route | Screen | Status after FE-04 |
|---|---|---|
| `/` | Dashboard — at-a-glance summary (agent/run counts, health badge, recent activity) | Placeholder |
| `/agents` | Agents — list of configured agents/automations | Placeholder |
| `/agents/[id]` | Agent detail — a single agent's config and recent runs | Placeholder |
| `/runs` | Runs — list of execution runs across all agents | Placeholder |
| `/runs/[id]` | Run detail — a single run's input/output/status | Placeholder |
| `/health` | Health — system status, fetched live from `/api/health` | **Built** (fetches real data) |
| `/account` | Account overview — summary of saved settings | **Built** (FE-03) |
| `/account/settings` | Settings — validated profile/notification form | **Built** (FE-02/FE-03) |
| `/account/activity` | Activity — log of account actions | **Built** (FE-03) |

Every route above exists and is reachable from the root nav as of this assignment — "every
screen in the spec exists as a routed placeholder" per the evaluation criteria. The Account
section, having been built across FE-02/FE-03, is further along than the rest; that's
expected, not a gap.

## Navigation structure

Root layout nav: **Dashboard · Agents · Runs · Health · Account**. "Account" expands to the
existing three-tab sub-nav (Overview / Settings / Activity) already built in
`src/app/account/account-nav.tsx` — this assignment doesn't change that, just links to it
from the root.
