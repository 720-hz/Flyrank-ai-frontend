# NOTES — hand-built components vs. shadcn/ui

## How this file got here

`npx shadcn@latest init` / `add` call out to `ui.shadcn.com` to fetch component source,
and that host is blocked by this sandbox's egress policy (`403` on the CONNECT, confirmed
via the proxy status endpoint — the same category of permanent, non-retryable block as
`fonts.googleapis.com` earlier in this project). `npm`'s registry isn't blocked, so instead
of running the CLI I installed the real packages shadcn's dialog/tabs are built on
(`@radix-ui/react-dialog`, `@radix-ui/react-tabs`, `class-variance-authority`, `clsx`,
`tailwind-merge`, `lucide-react`) and wrote `src/components/ui/dialog.tsx` and `tabs.tsx` by
hand to match shadcn's current default source — same library, same component shape, just
typed out instead of copy-pasted by the CLI. Both are wired into `/playground` next to the
hand-built versions so the comparisons below are backed by actual rendered, keyboard-tested
behavior, not just a source-code read. Flagged this trade-off to Ziad before doing it; he
approved it over waiting on a local CLI run.

## What I missed that shadcn (Radix) handles

**1. Background content isn't hidden from assistive tech in my modal.**
My `Modal` traps *keyboard* focus, but a screen reader's browse-mode/virtual cursor doesn't
go through the Tab key — it can still read into the page behind the overlay, because I never
mark the rest of the DOM `aria-hidden` (or `inert`) while the dialog is open. Radix's dialog
pulls in the `aria-hidden` package specifically to mark every other top-level sibling
`aria-hidden="true"` for the duration, and restore it on close. This is the single biggest
gap — the APG pattern calls it out explicitly ("hide all other page content from assistive
technology") and I skipped it.

**2. My scroll lock causes a layout shift; Radix's doesn't.**
I lock scroll with `document.body.style.overflow = "hidden"`. That removes the scrollbar,
which shrinks the content width and visibly jolts anything flush to the right edge. Radix
depends on `react-remove-scroll`, which compensates by adding padding equal to the removed
scrollbar's width, so nothing shifts. Confirmed by reading `@radix-ui/react-dialog`'s
`package.json` dependencies, not guessed.

**3. Initial focus target: container vs. first focusable child.**
I deliberately focus the dialog *container* (`tabIndex={-1}` div) on open, so a screen reader
announces the accessible name (`aria-labelledby`) before landing on any control — nothing is
"pre-armed" for an accidental Enter press. Radix's `FocusScope` instead focuses the first
focusable descendant in DOM order. Verified in the live demo: because my markup happens to
render the footer's "Close" button before the header's "✕" button, Radix lands focus
directly on "Close" on open — a destination the user didn't choose and wasn't told about via
the accessible name read-out. Both are defensible choices; shadcn's is slightly more fragile
to markup order, mine needs one more aria-describedby/live-region touch to be fully explicit
about what happened.

**4. Focus-trap robustness against non-Tab focus escapes.**
My trap only intercepts the literal `Tab`/`Shift+Tab` keydown. Radix additionally renders
invisible "focus guard" sentinel `<span tabindex="0">` elements at the very start/end of the
document body (`@radix-ui/react-focus-guards`) that redirect focus back into the active
dialog if it escapes some other way (e.g. a stray `.focus()` call, or certain assistive-tech
navigation paths that aren't literal Tab presses). Mine has no equivalent safety net.

**5. (Minor, test-only) Tabs: roving focus under synthetic rapid-fire keys.**
Firing three `ArrowRight` keydowns back-to-back with zero delay via Playwright, my
`selectByIndex` (plain `useState` + synchronous `.focus()`) wrapped correctly every time.
Radix's tablist needed ~150ms between presses to keep up with the same sequence — with
natural pacing it was 100% correct, including wraparound. Caveat this one honestly: it's an
artifact of synthetic zero-delay CDP key events, not something a real keyboard or
screen-reader user would ever trigger, so I don't count it as a real accessibility bug in
Radix — just a concrete, measured difference in implementation robustness under automated
testing, worth knowing if I ever write Playwright specs against Radix-based UI elsewhere.

## What shadcn/Radix gives up for "no library"

Not gaps in correctness, just scope I didn't need to build because the brief asked for one
dialog/one tablist, not a general-purpose primitive: RTL direction support, `orientation`
("vertical" tabs with ArrowUp/Down), `activationMode` ("manual" vs "automatic" tab
selection), non-modal dialogs, nested-dialog stacking, and CSS-animation hooks via
`data-state="open|closed"` attributes for enter/exit transitions. My components are simpler
specifically because they only have to be correct for the one case in the brief.

## Verification

All five points above came from actually running both versions side by side at `/playground`
with a headless-Chromium Playwright script driving real keyboard events (Tab, Shift+Tab,
Escape, ArrowLeft/Right, Home/End) and reading `document.activeElement` / ARIA attributes
after each step — not from reading source alone. See the component-level RTL tests
(`modal.test.tsx`, `tabs.test.tsx`, `disclosure.test.tsx`) for the automated keyboard-behavior
coverage that runs in CI via `npm run test:run`.

## Buttons with a brain — `lifecycle-button.tsx`

An animated button (`LifecycleButton`) that choreographs idle → loading → success/error → idle,
demoed live on `/playground` as two instances ("Send message" / "Save changes") sharing one
component, each wired to `fakeAsyncAction` (random 500–1500ms delay, 20% rejection rate) —
exactly the trigger the brief asks for.

**States implemented:** idle, hover/focus (plain CSS `:hover`/`:focus-visible`, free from using
a native `<button>`), loading (spinner + disabled + `aria-busy`), success (checkmark, auto-reverts
to idle), error (shake, "Retry" label, button stays actionable). That's five without trying;
`disabled` — the brief's bonus — falls out of `loading` for free since the native `disabled`
attribute is literally set then.

**Why nothing ever mounts or unmounts mid-transition.** All four state layers (idle/loading/
success/error) are always in the DOM, stacked in one grid cell via `absolute inset-0`, and
crossfade by toggling `opacity-0`/`opacity-100` plus a small `translate-y`. The alternative —
conditionally rendering only the "current" layer — means the outgoing layer vanishes the
instant React re-renders, so only the incoming layer could ever animate; a true two-sided
crossfade needs both visible at once. This also sidesteps the harder problem of delaying
unmount until an exit animation finishes (what a library like Framer Motion's
`AnimatePresence` exists to solve) without pulling in a library for one button.

**Duration/easing choices**, and why: hover/press feedback (background-color tint,
`active:scale-[0.97]`) is 150ms ease-out — fast enough to feel like direct manipulation, not so
fast it reads as a flicker. The idle/loading/success/error crossfade is 200ms ease-out — long
enough to register as a transition, short enough that a chat Send button doesn't feel laggy
under repeated use. The error shake and success "pop" are one-shot `@keyframes` (400ms and
300ms) defined in `globals.css` next to the existing reduced-motion rule, animating only
`transform` (`translateX` for the shake, `scale` for the pop) — never a layout-affecting
property — so both stay compositor-accelerated. `background-color`/`color` transitions (e.g.
the button turning red on error) are not compositor-accelerated in the strict sense, but they're
paint-only — they never trigger layout — so they're excluded from that constraint on purpose;
the requirement is about the *motion choreography*, not "literally zero non-transform
transitions anywhere."

**The one deliberate deviation from the brief's example.** The brief's own "concrete example"
describes the button's *width* animating to fit each label. Its *requirements* section says
"animate compositor-friendly properties (transform, opacity); no layout thrash" — and a width
tween is a layout-affecting animation by definition, full stop, regardless of easing. Those two
parts of the brief disagree with each other; I followed the requirements over the illustrative
example and gave the button a fixed `min-width` sized for its longest label instead, so the
crossfade never has to fight a resizing box. Worth flagging explicitly rather than silently
picking one.

**Interruptibility.** `onPress` is only invocable from `idle`/`success`/`error` — a `status ===
"loading"` guard (checked both before dispatch and inside the reducer) makes spam-clicking during
a pending request a no-op rather than firing overlapping requests. The subtler bug: re-pressing
from the `success` state (a legitimate thing to do — nothing says you can't send twice) has to
cancel the pending "auto-return-to-idle" `setTimeout` from the *first* success, or that stale
timer fires mid-way through the *second* request and yanks the button back to idle while it's
still loading. `lifecycle-button.test.tsx` has a test that specifically reproduces this by
advancing fake timers past where the stale timeout would have fired and asserting the button is
still in its loading state, not idle.

**`prefers-reduced-motion`.** No component-level media-query logic — the existing site-wide
rule in `globals.css` (`animation-duration`/`transition-duration: 0.01ms !important`,
`animation-iteration-count: 1`) already collapses every animation and transition on the page
under reduced motion, this button's included, for free. That's a feature of using real CSS
transitions/animations instead of a JS-driven animation library: one global rule covers
everything. Feedback is never conditioned on this — the label text, icon, and color always
change; only the *motion* between those states disappears. The page also shows the visitor's
current "Reduce motion" setting (via `usePrefersReducedMotionLabel`, a `matchMedia` listener)
so it's possible to confirm this live without changing OS settings mid-demo.

**A real bug this caught before shipping.** Making the visible label `aria-hidden` (so a
sighted user sees one crossfade, not the label doubled with the sr-only announcer) and relying
on the `aria-live` span for the accessible name meant the button had **no name at all in the
idle state** — `aria-live` exists to announce *changes*, not to supply a persistent name, and
the idle announcement is deliberately empty (nothing has happened yet). A screen reader user
tabbing to the button before ever pressing it would hear "button" with nothing else. Caught by
driving the real page with Playwright and asking for the button by its accessible name
(`getByRole("button", { name: /Send message/ })`) — it timed out, because there was no such
name. Fixed with a persistent `aria-label` set to whatever the current state's label is,
independent of the `aria-live` announcer. Worth stating plainly: an RTL test suite that only
ever queries `getByRole("button")` with no name filter would never have caught this — it took
asking for the component the way a real screen reader user's tooling does.

**A second bug this caught: the focus ring never actually rendered.** The button originally
had a base `outline-none` class plus `focus-visible:outline-2 focus-visible:outline-offset-2
focus-visible:outline-accent`, which looks reasonable and is a pattern seen all over
Tailwind-based codebases. It silently did nothing — real keyboard Tab navigation reached the
button, but `getComputedStyle(button).outlineStyle` was `"none"` regardless. Root cause, found
by reading the compiled CSS rather than guessing: Tailwind v4's outline utilities all share one
CSS custom property, `--tw-outline-style`, and `focus-visible:outline-2` only ever *reads* it
(`outline-style: var(--tw-outline-style)`) — it never sets it to `solid` itself. `.outline-none`
sets that same custom property to `"none"` **unconditionally** (the class has no `:focus`/
`:focus-visible` qualifier), and because custom properties resolve from the live cascade, that
`"none"` was still in effect for every state the element could ever be in, `:focus-visible`
included. Adding a bare `focus-visible:outline` utility (which does set the style to `solid`)
would have worked, but the simpler and more correct fix was to realize the `outline-none` base
class was never needed in the first place — nothing in this component relies on suppressing a
native default outline outside of `:focus-visible`, since modern browsers already gate their
own default outline on roughly the same heuristic. Removing it outright, rather than layering
another utility on top to fight it, is the fix that's actually in `lifecycle-button.tsx`.
Caught by checking `getComputedStyle` against a live, keyboard-Tab-driven Playwright session —
not by eyeballing the className string, which looked completely plausible both before and
after the fix.

**Verification:** `lifecycle-button.test.tsx` uses fake timers and manually-controlled
(`deferred()`) promises — not the real randomized `fakeAsyncAction` — to deterministically
exercise every transition: idle render, loading + disabled + `aria-busy`, the spam-click guard,
success-then-auto-idle, error-then-retry, the stale-timeout race described above, the
`aria-live` announcement text, and native keyboard focusability. Runs in CI via
`npm run test:run` alongside the rest.
