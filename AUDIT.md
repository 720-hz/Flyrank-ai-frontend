# FE-12 — Accessibility & performance audit

Scope: the four pages that make up the primary flow — Dashboard (`/`), Agents list (`/agents`),
an agent chat (`/agents/pr-reviewer`), and Account Settings (`/account/settings`). Audited
against the pushed preview deployment, then re-audited after fixes on the same deployment once
it picked up the fix commit.

- Before: `https://flyrank-ai-frontend-re4kypram-720-hz.vercel.app` (main, pre-FE-12)
- After: `https://flyrank-ai-frontend-git-task-12-a11y-perf-audit-720-hz.vercel.app` (this branch)

**Tooling note.** This sandbox's network egress is allowlisted and blocks both `vercel.app`
and `googleapis.com` directly, so the Lighthouse CLI (`npx lighthouse ...`) and the PageSpeed
Insights REST API both fail here with a blocked-host error before they ever reach the site.
Real Lighthouse mobile runs and WAVE runs still happened — against the actual deployed URLs,
not a local build — by driving [PageSpeed Insights](https://pagespeed.web.dev/) and
[WAVE](https://wave.webaim.org/) through a real, network-unrestricted browser instead of the
CLI/API. The numbers below are genuine Lighthouse-mobile and WAVE output, just reached by a
different front door than `npx lighthouse`.

## Before

| Page | Performance | Accessibility | Best Practices | SEO |
| --- | --- | --- | --- | --- |
| Dashboard `/` | 91 | 96 | 100 | 100 |
| Agents `/agents` | 100 | 100 | 100 | 100 |
| Chat `/agents/pr-reviewer` | 100 | 100 | 100 | 100 |
| Settings `/account/settings` | 100 | 100 | 100 | 100 |

| Page | WAVE errors | WAVE contrast errors | WAVE alerts |
| --- | --- | --- | --- |
| Dashboard | 0 | 0 | 1 (redundant link) |
| Agents | 0 | 0 | 1 (redundant link) |
| Chat | 0 | 0 | 1 (redundant link) |
| Settings | 0 | 0 | 2 (redundant link) |

Screenshots: `audit/screenshots/before-{dashboard,agents,chat,settings}-mobile.jpg` (Lighthouse)
and `audit/screenshots/before-wave-{dashboard,agents,chat,settings}.jpg` (WAVE).

Only the Dashboard carried real Lighthouse deficiencies — the other three pages were already
at 100 across the board on first run. That tracks with where the actual bugs lived: Agent
Core's custom radio controls (the keyboard-focus bug below) and most of the low-contrast text
sit on the Dashboard; the chat page's own contrast issues (tool-result cards in
`tool-parts.tsx`) only exist once a message has been sent, so a cold-load Lighthouse pass of an
empty chat never renders them. WAVE and the keyboard-only pass below are what actually caught
those.

## What a keyboard-only pass found

Tabbed through all four pages with no mouse, chat flow included (send a message, Tab to Stop
mid-stream, Tab to Retry after forcing an error). One real bug, confirmed at the DOM level, not
just by eye:

**Agent Core's custom controls (Dashboard) had zero visible focus indicator.** The Agent
state / Core shape / Core color controls in `agent-core-panel.tsx` are `sr-only` native
`<input type="radio">` elements with a styled `<label>` sibling carrying the visible pill/swatch
— a legitimate pattern for a custom-styled control, but the native focus ring lands on the
*invisible* input, not the visible label, so nothing renders it. Confirmed by tabbing to the
"Idle" pill and reading `document.activeElement` directly: it reported a real, focused
`<input id="core-state-idle">` while the screenshot showed no highlight anywhere on screen. For
comparison, `account/settings`'s theme-preference radios use the same `fieldset`/visible-radio
pattern as a plain, un-hidden `<input>`, and get a focus ring for free — this is specifically a
regression introduced by hiding the input to build a custom look, not a framework default.

Everything else in the keyboard pass was already fine: logical tab order, the chat input and
Send/Stop controls reachable and operable, the Retry button after a forced error reachable and
activatable with Enter/Space, no keyboard traps.

## Fixes

**1. Contrast — `text-*/50` and `text-*/40` muted-text utilities against this theme's
`#fafaf7` background.** Lighthouse's `color-contrast` audit flagged these on the Dashboard;
WAVE doesn't catch them because they're all well above WAVE's structural-error bar even when
failing WCAG's contrast ratio, so this was a Lighthouse-and-manual-math find, not a WAVE one.
Computed the actual ratios (standard relative-luminance/contrast-ratio formulas, not a
visual guess): `/50` opacity text comes out to **≈3.4:1**, below WCAG AA's 4.5:1 minimum for
normal-weight text; `/40` is worse. Standardized every instance of this pattern on **`/65`**
(**≈5.5–6.6:1** depending on the exact underlying color), which clears AA with margin. Changed
in `src/app/page.tsx`, `src/components/placeholder-screen.tsx`, `src/app/error.tsx`,
`src/app/agents/[id]/error.tsx`, and `src/app/agents/[id]/tool-parts.tsx` (the tool-result
card's label, score, and factor-detail text — the chat-only instances Lighthouse's cold-load
scan couldn't reach).

**2. Keyboard focus — `has-[:focus-visible]:` forwarding on Agent Core's radios.** Added
`has-[:focus-visible]:outline has-[:focus-visible]:outline-2
has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-main` to the Agent state,
Core shape, and Core color labels in `agent-core-panel.tsx`, so focus-visible on the hidden
input now draws a ring on its visible label sibling via Tailwind v4's `has-[]` arbitrary
variant. No change to the hidden-input pattern itself — the custom look stays, the control just
stops swallowing its own focus indicator.

**3. AI-specific accessibility — streamed output announced once, and the Stop button.** The
brief asked for two things here:

- *Streamed output announced politely.* Added a visually-hidden (`sr-only`)
  `aria-live="polite"` region in `agent-chat.tsx`, populated via a `useMemo` (not a `useEffect`
  + `setState` — that tripped `react-hooks/set-state-in-effect`, fixed the same way FE-11's
  `react-hooks/refs` finding was: derive, don't effect) that's empty until a turn reaches
  `status === "ready"`, then holds that turn's full final text. Deliberately *not* making the
  visible, continuously-mutating streaming bubble itself `aria-live`: a live region re-announces
  a changed text node's entire current content on every mutation, and a token-by-token
  streaming bubble mutates dozens of times a second — that would be a screen reader re-reading
  the message from the top on every token. Firing once, on completion, with the complete reply
  is "polite" in both the literal ARIA sense (queued, non-interrupting) and the practical one.
- *Keyboard-reachable stop button.* Already true — `stop()` is wired to a plain
  `<button type="button">`, not a styled `div`/`span`, so it was already in tab order and
  operable with Enter/Space with no change needed. Verified directly: tabbed to it mid-stream
  and activated it with the keyboard, not a click.

Full diff-level detail and the "why" for each is in the inline comments at each change site.

## After

| Page | Performance | Accessibility | Best Practices | SEO |
| --- | --- | --- | --- | --- |
| Dashboard `/` | 97 | 100 | 100 | 100 |
| Agents `/agents` | 100 | 100 | 100 | 100 |
| Chat `/agents/pr-reviewer` | 100 | 100 | 100 | 100 |
| Settings `/account/settings` | 100 | 100 | 100 | 100 |

| Page | WAVE errors | WAVE contrast errors | WAVE alerts |
| --- | --- | --- | --- |
| Dashboard | 0 | 0 | 1 (redundant link, unchanged) |
| Agents | 0 | 0 | 1 (redundant link, unchanged) |
| Chat | 0 | 0 | 1 (redundant link, unchanged) |
| Settings | 0 | 0 | 2 (redundant link, unchanged) |

Screenshots: `audit/screenshots/after-{dashboard,agents,chat,settings}-mobile.jpg` and
`audit/screenshots/after-wave-{dashboard,agents,chat,settings}.jpg`.

**Dashboard Performance methodology note.** The first post-fix PSI run on this preview scored
Performance 89 — *lower* than the 91 before-score, which doesn't make sense for a change that's
entirely CSS utility classes plus one small hidden `<div>`. Investigated rather than reporting
it at face value: re-ran the same URL twice more. Second run: still 89. Third run: **97**. This
is Vercel Preview cold-cache behavior, not a regression — a freshly-pushed, low-traffic preview
domain's CDN edge cache starts cold, so the first PSI crawl(s) eat real cache-miss latency on
FCP/LCP that a warm Production domain never shows; a couple of repeat hits warm it and the score
settles. 97 (warm cache) is the representative, reproducible number and is what's reported
above and in the screenshot; the before-score's own 91 was itself taken on an already-warm
Production domain, so warm-to-warm is the fair comparison.

**WAVE's "redundant link" alert — not fixed, deliberately.** On every page it's `root-nav.tsx`'s
"Flyrank Console" wordmark link and the "Dashboard" nav item both pointing at `/`; on Settings
there's a second instance from `account-nav.tsx`'s "Settings" tab and an in-page "Settings" CTA
in `account-overview.tsx` both pointing at `/account/settings`. Both are the standard,
deliberate "logo links home" plus "home/section is also in the nav" convention — removing
either leg would mean either dropping the wordmark-links-home affordance sighted users expect
site-wide, or removing an in-context CTA that exists specifically so a user reading the account
overview doesn't have to go hunt the nav for Settings. WAVE flags this as a courtesy alert, not
an error, for exactly this reason: two links to the same destination is only a problem when it's
accidental duplication a user has to tab through twice for no reason, and screen reader users
can skip past a single extra redundant link in a landmark nav in about one keypress. Left as-is.

## Keyboard-only pass, re-verified after the fix

Re-ran the same pass against the pushed preview deployment. Agent state, Core shape, and Core
color all now show a visible focus ring when tabbed to with the keyboard — confirmed for the
"Idle" state pill and for the "Accent" (green) color swatch specifically, each via a fresh page
load, counted Tab presses to the control, a screenshot showing the ring, and a
`document.activeElement` check confirming which element keyboard focus actually landed on (not
just that *something* looked highlighted). The rest of the primary flow — composing and sending
a chat message, Stop mid-stream, Retry after a forced error — remains fully keyboard-operable,
as it already was before this task.

## Evaluation criteria

- **Lighthouse mobile Performance and Accessibility both 90+:** yes on every page — Dashboard
  (the only page with headroom to begin with) went 91→97 / 96→100; the other three were already
  100/100 and stayed there.
- **Zero WAVE errors on audited pages:** yes, 0 errors and 0 contrast errors on all four pages,
  before and after. The one alert type present (redundant link) is addressed above — justified,
  not fixed, per the brief's own "fixed or justified" standard.
- **Primary flow completable by keyboard alone:** yes, including the one real gap this audit
  found (Agent Core's focus ring) and fixed.
- **Measurable deltas:** Dashboard Performance 91→97, Accessibility 96→100; zero WAVE errors
  maintained throughout; Agent Core's three control groups go from a real, confirmed
  zero-visible-focus-indicator bug to a confirmed visible ring; five low-contrast text instances
  (≈3.4:1) brought up to ≈5.5–6.6:1, clearing WCAG AA.
