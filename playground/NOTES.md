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
