# Deployment checklist & operations

Filled out against the actual Production deployment, not a hypothetical one — every box below
was checked by actually looking (Vercel dashboard, GitHub Checks tab, a live chat message sent to
the running app), not assumed from "the merge went through."

## Pre-deploy checklist

- [x] **CI green on the commit being deployed.** `main` @ `20c34c9` — lint, Vitest (157 tests),
      `next build`, and Playwright E2E all passing in `.github/workflows/ci.yml` before merge, not
      after. Required check on every PR; nothing merges to `main` without it.
- [x] **No secrets in git.** Full history checked, not just the current tree (see README's "Key
      decisions") — zero secrets ever committed. `.env.local` is gitignored; `.env.example`
      documents the shape with no real values.
- [x] **Environment variables set in Vercel, scoped correctly.** `ANTHROPIC_API_KEY` present
      under **Production and Development** (verified by name/scope only — a value was never
      viewed, entered, or handled by any tool in this session). Deliberately *not* scoped to
      Preview, so PR previews fail safe into the designed "missing API key" error card instead of
      spending real API credits on every pushed branch — see README's Production hygiene section.
- [x] **Rate limiting and input caps live on the one paid-per-request route.**
      `/api/agents/[id]/chat` rejects over-limit and oversized requests before any model call —
      see `src/lib/rate-limit.ts` and `src/lib/ai/validate-chat-request.ts`.
- [x] **`maxDuration` set appropriately.** `30` on the streaming chat route; the default is fine
      for `/api/health` since it does no external work.
- [x] **Accessibility/performance audit done and fixes verified.** `AUDIT.md` — Lighthouse mobile
      90+ and zero WAVE errors on all four primary-flow pages, before *and* after the fix pass.
- [ ] **Custom domain.** Not done — optional per the brief, and there's no real audience yet that
      a vanity domain would serve. Running on the default `flyrank-ai-frontend.vercel.app`.
- [ ] **Real Firefox/Safari/mobile Safari spot-check.** Not done from an automated session (this
      project's sandbox can only reach Chromium — see README's Cross-browser verification
      section for why) — this is the one item that needs a human with those actual browsers.

## Deploy mechanism

**Platform:** Vercel, connected to the `720-hz/Flyrank-ai-frontend` GitHub repo via the standard
Vercel-for-GitHub integration.

**Production:** auto-deploys on every push to `main` — confirmed directly in the Vercel
dashboard ("To update your Production Deployment, push to the main branch"), not assumed. There
is no separate manual "Promote to Production" step in this project's actual configuration,
despite that being a common extra step in other Vercel setups — worth re-checking per-project
rather than assuming either way.

**Preview:** every PR gets its own preview deployment automatically, commented onto the PR by the
Vercel bot. This is how FE-12's before/after audit and FE-14's rate-limit testing were done
against real deployed infrastructure before anything touched Production.

**Current Production state (as of this checklist):** Status **Ready**, built from `main` @
`20c34c9`, domain `flyrank-ai-frontend.vercel.app`. Verified live, not just "deployed" — sent a
real message to the PR Reviewer agent on the actual production URL and got back a real streamed
Claude response, not the fallback error path.

## Rollback plan

No database, no migrations, no stateful backend — this app's entire persistent state is
`localStorage` in each visitor's own browser, so a rollback here is purely "serve older code,"
nothing data-related to reconcile. Two ways, in order of preference:

1. **Vercel's own rollback.** Vercel keeps every previous deployment. From the Deployments tab,
   pick the last known-good deployment and redeploy/promote it to Production directly — this is
   the fastest path and doesn't require touching git at all.
2. **`git revert` on `main`.** If the bad change needs to actually come out of history going
   forward (not just stop being served), revert the offending commit(s) on `main` and push —
   Production auto-deploys the revert the same way it deploys anything else. Preferred over
   `git reset`/force-push, which this project's own conventions already avoid for shared
   branches.

Either path is a few minutes, not an incident. No feature flags or gradual rollout exist in this
project — "redeploy from a good commit" is the entire strategy, stated honestly rather than
describing infrastructure that isn't actually there.

## Monitoring

Stated plainly: there's no dedicated APM, error-tracking, or alerting service wired up (no
Sentry, no Datadog, nothing). What actually exists:

- **`/api/health`** — a real liveness endpoint (status/timestamp/uptime), fetched live by the
  `/health` page on every load. This is the only "monitoring" surface in the app itself today;
  it answers "is the process up," not "are users hitting errors."
- **Vercel's own deployment monitoring** — every deploy shows Ready/Error/Canceled in the
  dashboard, and a failed build blocks Production from ever serving broken code (it keeps serving
  the last good deployment instead). This is passive, dashboard-only — nothing pages anyone.
- **CI as the actual first line of defense.** Since there's no runtime error tracking, the real
  safety net is catching problems before they ship: the required lint/test/build/E2E gate on
  every PR.

**What a real version of this would need** (explicitly future work, not implied to exist):
request-level error tracking (Sentry or Vercel's own Observability product, which the project's
Vercel dashboard already surfaces as an available upsell), and an uptime check hitting
`/api/health` on a schedule with alerting on failure — both skipped here as genuinely
out-of-scope for a capstone with no real users, not forgotten.

## Sign-off

Checklist completed and verified against the live Production deployment on 2026-11-07, by Ziad
(with Claude Code driving the verification steps — Vercel dashboard checks, the live chat test,
the CI status check — under Ziad's direction throughout this session).
