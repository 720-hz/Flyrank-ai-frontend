# AI-ASSISTANCE — FE-03 account app

## What this app is

A small "account" section (`/account`, `/account/settings`, `/account/activity`) built on top
of the settings form from FE-02. Three connected screens sharing real state through
`localStorage`: Settings writes, Overview reads a summary of it, Activity logs what changed
and Overview/Activity both read that log. See `PROMPTS.md` for the exact prompts.

## How AI assisted

Two scoped, independent prompts (full text in `PROMPTS.md`) did the actual feature
implementation — each one read the repo's conventions (`CLAUDE.md`), the design tokens
(`globals.css`), and the neighboring code it needed to stay consistent with (the settings
form's validated shape and SSR-safe localStorage-read pattern), then wrote the
component/module, a colocated test file, and ran lint/test/build itself before reporting
back. Every prompt ended by asking for at least one specific, disagreeable judgment call —
not "looks good" — which is what turned the hand-off into an actual review rather than a
rubber stamp. Both prompts surfaced real tradeoffs:

- Prompt 1 flagged that it used `useSyncExternalStore` (not the settings form's `useEffect` +
  `reset()` pattern) because ESLint's `react-hooks/set-state-in-effect` rejects a raw
  `setState` call inside an effect — a genuine inconsistency between two "read localStorage on
  mount" implementations in the same codebase, now sitting in the repo for a real decision
  later (standardize on one, or accept both).
- Prompt 1 also flagged that the overview's parsing is defensive shape-checking, not the
  settings form's full zod validation — so a record that's well-shaped but would fail the
  form's own rules (e.g. a 1-character name) would still render on the dashboard.
- Prompt 2 flagged that `appendActivityEntry` had no guard against an empty `message` — see
  the manual fix below, which came directly from that flag.

## Manual improvements after review

Three concrete fixes made after reading the AI-generated code, not before:

**1. Semantic HTML on the overview cards** (commit `ec968ae`). The generated `SummaryCard`
used plain `<div>`/`<span>` for label/value pairs:

```tsx
// before
<div className="flex flex-col gap-1 rounded-md border border-main/15 px-4 py-3">
  <span className="text-xs ...">{label}</span>
  <span className="text-sm ...">{value}</span>
</div>
```

A `<dl>` is the correct element for key-value summary content — screen readers announce the
term/definition relationship, which a styled `<div>` never conveys regardless of how it looks.
Changed the wrapping grid to `<dl>` and the card internals to `<dt>`/`<dd>` (a `<div>` wrapping
one `<dt>`/`<dd>` pair per item is valid inside a `<dl>` per the HTML5 content model, so no
visual change was needed):

```tsx
// after
<div className="flex flex-col gap-1 rounded-md border border-main/15 px-4 py-3">
  <dt className="text-xs ...">{label}</dt>
  <dd className="text-sm ...">{value}</dd>
</div>
```

**2. Guarded `appendActivityEntry` against blank messages** (commit `0356878`). This was the
tradeoff the agent itself flagged ("doesn't validate `message`... happily store an empty
string") rather than something I found independently — but flagging a risk isn't the same as
deciding it's acceptable, and once the function had a real caller (step 3 below) a careless
`appendActivityEntry("")` would have silently written a blank row with no way to explain it
later:

```ts
// before
export function appendActivityEntry(message: string): ActivityEntry[] {
  const existing = readActivityLog();
  // ... builds and stores `entry` with the raw `message`, unconditionally
}

// after
export function appendActivityEntry(message: string): ActivityEntry[] {
  const trimmedMessage = message.trim();
  const existing = readActivityLog();
  if (!trimmedMessage) {
    return existing; // no-op: nothing worth logging
  }
  // ... builds and stores `entry` with `trimmedMessage`
}
```

Added a test for the no-op case so the guard can't silently regress.

**3. The cross-feature wiring itself was written by hand, not prompted** (commit `e4ee8b1`).
Both AI prompts were deliberately scoped to one feature each and explicitly told not to wire
anything up ("this module doesn't wire up any callers itself" / "don't modify its validation
logic") — connecting the settings form's save/reset handlers to `appendActivityEntry`,
including diffing old vs. new values into a human-readable message ("Updated email, theme to
Dark" / "Set up account settings" / "Reset settings to defaults"), was ~25 lines written
directly. This was a deliberate split, not a gap filled in afterward: integration logic that
decides *when* two independently-built features talk to each other is exactly the kind of
decision that's cheap to get wrong silently (log too much, log nothing, log on the wrong
condition) and cheap to just write once it's been thought through — a prompt detailed enough
to fully specify it would have been most of the implementation anyway.

Also manual: moving `/settings` to `/account/settings` (commit `9d0762f`, a `git mv` plus a
one-line link update) — mechanical refactoring with no judgment calls worth outsourcing.

## Net effect

Every AI-generated file was reviewed before being trusted, not just before being merged — the
two fixes above came from reading the diffs, not from tests failing (all tests passed before
either fix; `npm run lint`/`test:run`/`build` passing is necessary, not sufficient, evidence
of correctness). The accessibility gap in particular is the kind of thing a test suite
wouldn't catch on its own — `getByText` finds a `<dt>` exactly as easily as a `<div>`.
