# PROMPTS — FE-03 account app

Chronological log of the prompts actually sent to the AI assistant (Claude Code, via an
isolated subagent per prompt — each one started with no memory of the others, the same way a
fresh terminal session would) while building the `/account` app on `task-3/account-app`. Steps
not listed here (the `/settings` → `/account/settings` move, and wiring the settings form to
the activity log) were written by hand — see `AI-ASSISTANCE.md` for which parts were AI vs.
manual and why.

## Prompt 1 — account layout + dashboard overview

Produced `src/app/account/layout.tsx`, `src/app/account/account-nav.tsx`,
`src/app/account/page.tsx`, `src/app/account/account-overview.tsx`, and
`src/app/account/account-overview.test.tsx`. Commit `9cf721c`.

```
You're working as Claude Code in the git repository at /home/claude/flyrank-frontend-capstone
(Next.js App Router + TypeScript + Tailwind v4, react-hook-form + zod already in use). You're
on git branch `task-3/account-app`, already checked out. Do not switch branches, do not push.

Read first: `CLAUDE.md` (conventions — Conventional Commits, functional components, one per
file, colocate tests, no `any`, and an "Environment notes" section about `next/font/google`
being unreachable here — don't use it), `src/app/globals.css` (design tokens: `--color-main`
#2B2E6B primary, `--color-text` #14161A, `--color-background` #FAFAF7, `--color-accent`
#35D0A0 — use at most once in the whole UI), `src/app/page.tsx`, and the existing settings
feature at `src/app/account/settings/page.tsx` + `src/app/account/settings/settings-form.tsx`
(already built, validated with react-hook-form + zod, don't modify its validation logic). Note
its `localStorage` key is `"flyrank:settings"` and its persisted shape is `SettingsFormValues`
exported from `settings-form.tsx` — `{ displayName, email, theme, emailNotifications,
productUpdates }`.

Build:

1. `src/app/account/layout.tsx` — a shared layout for everything under `/account/*`. A simple
top nav with three links: "Overview" (`/account`), "Settings" (`/account/settings`),
"Activity" (`/account/activity` — this route doesn't exist yet, link it anyway, it's built in
a follow-up step by someone else). Highlight the active link (use `usePathname` from
`next/navigation`; this means the nav needs to be a client component — keep the rest of the
layout a server component, extract just the nav into its own small client component file,
e.g. `src/app/account/account-nav.tsx`). Use `<nav>` with `aria-label`, and mark the current
page link with `aria-current="page"`.

2. `src/app/account/page.tsx` — the dashboard/overview screen. Server component is fine for
the shell, but it needs to read a browser-only value (`localStorage`), so the actual content
needs a small client component, e.g. `src/app/account/account-overview.tsx`. On mount, read
`"flyrank:settings"` from `localStorage` (same key/shape as the settings form — don't
duplicate the zod schema, just read it defensively: if it's missing or malformed, show an
empty/default state, don't crash). Render a few summary cards: display name (or "Not set yet"
if empty), email (or "Not set yet"), theme preference, and the two notification toggles'
state (on/off). If nothing is persisted yet, show a clear empty state with a link to
`/account/settings` prompting the user to fill it in — don't show misleading zeroed-out data
as if it were real.

Keep this SSR-safe the same way the settings form does it (read in `useEffect`, not during
render, so server-rendered markup and first client paint match before hydrating in the real
value).

Write a colocated test, `src/app/account/account-overview.test.tsx`, covering: (a) the empty
state shows when nothing is in `localStorage`, (b) persisted values render correctly when
`localStorage` has valid data. Use the existing Vitest + Testing Library setup (see
`vitest.config.ts`, `vitest.setup.ts`, and the pattern in
`src/app/account/settings/settings-form.test.tsx`).

Run `npm run lint`, `npm run test:run`, and `npm run build` — all three must be clean. If
something fails, fix it before finishing.

Commit on the current branch with a Conventional Commits message. Do not push. Report back:
files touched, test/build/lint results, and the commit hash. Also flag anything you'd
consider a design or implementation tradeoff worth a human reviewing (don't just say "looks
good" — name at least one real judgment call you made and why).
```

## Prompt 2 — activity log module + screen

Produced `src/lib/activity-log.ts`, `src/lib/activity-log.test.ts`,
`src/app/account/activity/page.tsx`, `src/app/account/activity/activity-list.tsx`, and
`src/app/account/activity/activity-list.test.tsx`. Commits `14210ba`, `eeb2737`.

```
You're working as Claude Code in the git repository at /home/claude/flyrank-frontend-capstone
(Next.js App Router + TypeScript + Tailwind v4). You're on git branch `task-3/account-app`,
already checked out. Do not switch branches, do not push.

Read first: `CLAUDE.md` (conventions), `src/app/globals.css` (design tokens — `--color-main`
#2B2E6B, `--color-text` #14161A, `--color-background` #FAFAF7, `--color-accent` #35D0A0 used
at most once total in the whole app; check `src/app/account/account-overview.tsx` to see if
it already uses the accent color anywhere before you decide whether you're allowed to use
it), `src/app/account/layout.tsx` and `src/app/account/account-nav.tsx` (there's already a
nav link to `/account/activity` waiting for this route to exist), and
`src/app/account/account-overview.tsx` (the pattern for SSR-safe localStorage reads via
`useSyncExternalStore` — follow the same pattern here for consistency rather than inventing a
third approach).

Build a small, reusable activity-log feature:

1. `src/lib/activity-log.ts` — a plain TypeScript module (not a component) with:
   - A type `ActivityEntry = { id: string; message: string; timestamp: string }`
     (`timestamp` as an ISO string).
   - `readActivityLog(): ActivityEntry[]` — reads from `localStorage` key
     `"flyrank:activity"`, returns `[]` if missing/malformed (never throws), most-recent-first.
   - `appendActivityEntry(message: string): ActivityEntry[]` — appends a new entry (generate
     an id with `crypto.randomUUID()`, timestamp with `new Date().toISOString()`), caps the
     stored log at the 20 most recent entries (drop the oldest beyond that), persists it, and
     returns the updated array. This function is meant to be called from other features later
     (e.g. when the settings form saves) — don't wire that up yourself, just export a clean
     function someone else can call.
   - Guard all `localStorage`/`crypto` access the same defensive way the rest of the codebase
     does (try/catch, SSR-safe — this module itself doesn't need to be SSR-safe since it's
     only ever called from client code, but it must not throw if called in an environment
     without `localStorage`).
   - Write `src/lib/activity-log.test.ts` covering: appends in the right order
     (most-recent-first), the 20-entry cap actually drops the oldest, and reading with nothing
     stored returns `[]`.

2. `src/app/account/activity/page.tsx` + `src/app/account/activity/activity-list.tsx`
(client component, colocated) — the screen. List entries most-recent-first, each showing the
message and a human-readable relative-ish or formatted timestamp (your call — e.g.
`toLocaleString()` is fine, doesn't need to be fancy relative-time). Empty state: "No activity
yet." with brief explanatory text. Use a semantically appropriate list element. Follow the
SSR-safe client-read pattern from `account-overview.tsx`.

   Write `src/app/account/activity/activity-list.test.ts` (or `.tsx` — whichever matches how
   you write the test) covering: empty state renders when nothing is stored, and persisted
   entries render in the right order.

Run `npm run lint`, `npm run test:run`, `npm run build` — all three clean, fix anything that
fails before finishing.

Commit on the current branch with a Conventional Commits message (one commit is fine, or split
lib vs. UI into two — your call, but keep it reviewable). Do not push.

Report back: files touched, test/build/lint results, commit hash(es), and at least one real
judgment call or tradeoff you made that's worth a human double-checking — not a generic "looks
good," something specific enough that I could disagree with it.
```
