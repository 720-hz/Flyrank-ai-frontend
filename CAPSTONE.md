# Capstone submission — Flyrank Console

Structured portfolio entry for "Build & Deploy a Production-Ready AI-Enhanced Frontend
Application." This project took the "finalize what you've built" path — the app built since
FE-04 was already a real internal tool, so this capstone closed its remaining gaps (production
hygiene, a real README, a deployment checklist, this document) rather than starting over.

## 1. Project brief

Flyrank Console is a small internal tool for monitoring AI-assisted engineering work — the
agents/automations a team runs, the individual runs they produce, and the account settings
around them. It's for an engineering team that wants a lightweight, in-house way to see what
their AI agents actually did and why, instead of scattered logs and ad hoc scripts — not another
AI chatbot product. I chose it because no product had been scoped for this repo before FE-04,
and I wanted every later assignment — real streaming chat with tool calling, resilience and
failure states, accessibility and performance audits, testing, and deployment — to accumulate
into one coherent, real-feeling tool instead of a different disconnected demo each week, since
that's closer to what shipping actual production AI tooling looks like than a greenfield rebuild
every sprint would have been.

## 2. Live, deployed application

**URL:** https://flyrank-ai-frontend.vercel.app

Functional, not a mockup — `/agents/pr-reviewer` (and the other two agents) stream real Claude
responses in production, verified live by sending an actual message and getting an actual
reply back, not just reaching the error-handling path. Accessible to WCAG 2.1 AA: see the
Lighthouse/WAVE results in [§6](#6-performance--accessibility-audit) below — zero WAVE errors
and 96–100 Lighthouse Accessibility across the four primary-flow pages, with the one real
keyboard-accessibility bug this project found (Agent Core's custom radio controls had no visible
focus indicator) fixed and re-verified.

## 3. Repository with complete README

**Repo:** https://github.com/720-hz/Flyrank-ai-frontend
**README:** https://github.com/720-hz/Flyrank-ai-frontend/blob/main/README.md

The README covers setup (`npm install && npm run dev`, one command per the brief), the full
environment-variable table, an architecture overview of `src/`, how AI integration actually
works (Vercel AI SDK + Anthropic, three agent system prompts, one server-side tool call), and a
dedicated [Known limitations & future improvements](README.md#known-limitations--future-improvements)
section. `SPEC.md` is the sitemap/status-per-route this project worked against throughout.

**AI integration, briefly:** `/agents/[id]` streams a real conversation (Vercel AI SDK's
`streamText` + Anthropic provider) with one of three purpose-built system prompts — PR Reviewer,
Release Notes Drafter, Incident Summarizer (`src/lib/ai/config.ts`). This isn't a generic
chatbot wrapper: the Incident Summarizer can call a server-side tool, `scoreIncidentSeverity`
(`src/lib/ai/tools.ts`), that computes an objective SEV1–SEV4 severity score from a plain
additive rubric — the model reports what happened, the tool (not the model) decides how bad it
was, and the result renders as a real scorecard component, not a JSON dump. That split — model
for language, deterministic code for anything that needs to be consistent — is the actual design
decision this project is making about where an LLM belongs in a product.

## 4. Testing evidence

- **Unit/component tests:** `npm run test:run` — **157 tests across 26 files**, all passing,
  every query through `getByRole`/`getByLabelText`/`getByText` rather than test ids.
- **Coverage:** `npm run test:coverage` — **60.35% statement/line, 88.71% branch, 85.21%
  function** coverage, well over the 50% bar. Full raw output: [`audit/coverage-output.txt`](./audit/coverage-output.txt).
  Coverage is concentrated in logic-heavy files (hooks, `lib/`, forms, the chat component) by
  design — see [Known limitations](README.md#known-limitations--future-improvements) for why the
  two WebGL scene files and thin page wrappers are at 0% unit coverage and what covers them
  instead.
- **End-to-end test, the real primary flow:** `npm run test:e2e` — a real Chromium browser
  against a real `next dev` server, Dashboard → Agents → PR Reviewer → send a message → streamed
  reply renders; a second case covers a failed turn → error card → Retry → success. Only the
  Anthropic network call is faked, by speaking its exact wire protocol — everything else (nav,
  routing, DOM state) is exercised for real.
- **CI:** `.github/workflows/ci.yml` — `npm ci` → lint → Vitest → `next build` → Playwright, on
  every push to `main` and every PR. All green required to merge; this gate is what caught a
  real regression (two broken E2E tests) when FE-12 and FE-13 interacted badly — see the
  Reflection below.

## 5. Performance & accessibility audit

Full detail, methodology, and screenshots: [`AUDIT.md`](./AUDIT.md).

| Page | Performance (before→after) | Accessibility (before→after) | WAVE errors |
| --- | --- | --- | --- |
| Dashboard `/` | 91 → 97 | 96 → 100 | 0 → 0 |
| Agents `/agents` | 100 | 100 | 0 → 0 |
| Chat `/agents/pr-reviewer` | 100 | 100 | 0 → 0 |
| Settings `/account/settings` | 100 | 100 | 0 → 0 |

**One concrete improvement made from the audit:** a keyboard-only pass found that Agent Core's
custom Agent-state/Core-shape/Core-color radio controls (`agent-core-panel.tsx`) rendered zero
visible focus indicator — the native focus ring was landing on a visually-hidden input, not its
styled label sibling. Fixed with Tailwind's `has-[:focus-visible]:` variant forwarding the ring
onto the visible label, and re-verified by tabbing to each control and checking
`document.activeElement` directly rather than just eyeballing a screenshot.

## 6. Deployment & operation

Full checklist, deploy mechanism, rollback plan, and monitoring posture:
[`DEPLOYMENT.md`](./DEPLOYMENT.md).

**Error states, briefly** (full inventory in README's Resilience & failure states section): a
mid-stream provider failure shows a designed error card with a Retry that resends only the
failed turn; a missing API key no longer leaks raw JSON to the screen; the app disables sending
proactively when the browser goes offline; rate-limited and oversized requests get a clean
400/429 instead of reaching the model at all.

**Rollback, briefly:** no database or migrations exist — this app's only persistent state is
per-browser `localStorage` — so rollback is purely "serve older code": either Vercel's own
previous-deployment redeploy, or `git revert` + push. A few minutes, not an incident.

## 7. Reflection

> Draft — grounded in what actually happened across this project's history, but this is mine to
> read, edit, and make sound like me before it's submitted as my own reflection. — Ziad

**What was hardest, and why.** Merging FE-12's accessibility/performance fixes broke two Playwright
E2E tests on `main` — not because the fixes were wrong, but because the new `aria-live`
announcement region I added duplicated visible chat text, so `page.getByText(...)` started
matching two elements instead of one. The hard part wasn't the fix (scoping the locators), it was
that nothing caught it until I actually opened the merged PR's Checks tab instead of assuming a
green "Merge" button meant the branch was clean. That became the pattern for the rest of the
project: a stray backtick inside a GLSL comment that silently closed a JS template literal was
invisible reading the diff but instant with `tsc --noEmit`; a test that asserted a bare
`getByRole("alert")` passed "by eye" but failed strict-mode because Next's own route announcer
also carries that role. Three different bugs, same root cause — code that looks right doesn't
mean code that is right, and the gap between those two only shows up when you actually run the
thing.

**What I'd do differently.** I'd build the production-hygiene work (rate limiting, input caps,
the real README, the deployment checklist) earlier instead of saving it all for the last
assignment. None of it depended on anything built late — it could have ridden along with FE-06
when the chat route first existed, and doing it last meant the app spent most of its life
without any abuse protection on the one route that actually costs money per request.

**Something that surprised me.** How often the AI-written code was syntactically and visually
fine and still wrong in a way only execution revealed — not "AI makes obvious mistakes," but
specifically that a diff can read as clean, pass a human skim, and still carry a real bug that a
compiler, a test runner, or a real browser catches in seconds. That's the actual argument for
"verify by running it, not by reading it carefully enough," and it's the one habit from this
internship I expect to keep using well past this project.
