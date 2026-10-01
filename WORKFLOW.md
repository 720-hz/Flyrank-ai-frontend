# WORKFLOW — vague vs. precise prompting (FE-02)

Same feature, two branches, two fresh agent sessions off `main` (`7c18293`): a settings form
at `/settings` with display name, email, theme, and two notification checkboxes.

**Round 1** (`round-1-vague/settings-form`, commit `7fa0c21`) — one sentence, no file
references, no constraints: *"Add a settings form to the app."* Output accepted unreviewed.

**Round 2** (`round-2-precise/settings-form`, commits `a5e32ac`, `46fbf6e`) — file references
(`CLAUDE.md`, `page.tsx`, `globals.css`'s design tokens), an explicit validation stack
(react-hook-form + zod), exact field rules, an accessibility spec (aria-invalid/
aria-describedby), and a verification step: write the component, then write and run tests,
then build and lint, all before committing.

## Correctness — the AI mistake

Both components are close in size (219 vs. 234 lines), so round 1 isn't thin — it's wrong.
It sets `noValidate` on the `<form>` (disabling the browser's native checks) but never adds
any replacement: `grep -i "error\|invalid"` on round 1's `settings-form.tsx` returns nothing.
Submit with an empty name and `"not-an-email"` and it silently "succeeds" — the one thing a
*settings form* most needs, it doesn't do. That's the mistake I caught in review, and it's
exactly the kind vague prompting produces: the model wasn't wrong about what I said, it was
underspecified by what I didn't say. Round 2's zod schema makes both cases fail with specific
messages, and `settings-form.test.tsx` (93 lines, 4 tests, all passing) asserts it.

## Accessibility

Round 1 does get fieldset/legend and label/htmlFor right for the static fields — not everything
vague prompting produces is bad. The gap is entirely in error state: round 2 wires
`aria-invalid`, `aria-describedby`, and `role="alert"` to the zod errors; round 1 has nothing
to wire since nothing is ever invalid.

## Edge cases & review effort

Round 1 persists synchronously with no in-flight state — there's no "saving" to disable
against. Round 2 simulates an async save and disables the submit button on `!isValid ||
isSubmitting`. Reviewing round 1 meant reading every line by hand to notice what *wasn't*
there (the `noValidate` bug wasn't visible without that read). Reviewing round 2 meant reading
the 4 tests, running them, and trusting the green result instead of re-deriving each case.

## Time

Round 1 finished in well under a minute of agent time but cost more of *my* time after: the
missing-validation bug only surfaced on a careful manual read. Round 2's agent run took ~7
minutes (56 tool calls, including installing and configuring Vitest from scratch), but review
was faster end-to-end — a test run stood in for re-checking every rule by hand. The slower
round was the cheaper one once review time is counted.
