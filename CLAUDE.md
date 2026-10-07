# CLAUDE.md

@AGENTS.md

Guidance for Claude Code (or any AI assistant working in this repo). Read this before making
changes.

## What this is

A FlyRank capstone for the "Frontend Development with AI" track. The actual product isn't
scoped yet — this file currently describes the starting-point stack and conventions, and
should be updated once the real project is defined in a later assignment.

## Stack

- **Framework:** Next.js (App Router), React, TypeScript — scaffolded via `create-next-app`
- **Styling:** Tailwind CSS
- **Package manager:** npm
- **Linting/formatting:** ESLint (configured by the scaffold); Prettier not yet added

## Conventions

- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) —
  `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`, etc. Keep the subject line under
  ~72 characters; use the body for the "why" when it's not obvious.
- **TypeScript:** prefer explicit types on public function signatures; avoid `any`.
- **Components:** functional components only, one component per file, colocate a component's
  styles/tests next to it rather than in a separate parallel tree.
- **No secrets in git:** anything sensitive goes in `.env.local` (gitignored), never committed.

## Environment notes

- **Fonts:** `next/font/google` cannot reach `fonts.googleapis.com` in sandboxed build
  environments (agent/CI sandboxes often block it). Declare brand fonts (Space Grotesk /
  Inter per the project instructions) as plain CSS font-family stacks with system-font
  fallback instead, or self-host via `next/font/local` if the woff2 files are vendored in.
- **shadcn/ui CLI:** `npx shadcn add ...` cannot reach `ui.shadcn.com` in sandboxed build
  environments for the same reason as the fonts block above. `npm`'s registry is fine, so
  install the underlying `@radix-ui/react-*` packages directly and hand-write the
  `src/components/ui/*.tsx` wrapper files to match shadcn's current default source instead
  of relying on the CLI to fetch them. See `playground/NOTES.md` for a worked example.

## Rules learned (FE-02 drill)

Learned by diffing a vague-prompt build against a precise-prompt build of the same settings
form — see `WORKFLOW.md` for the full comparison.

- **Forms use `react-hook-form` + `zod` (via `@hookform/resolvers/zod`), never hand-rolled
  validation state.** A `<form noValidate>` with no resolver wired to it is worse than no
  `noValidate` at all — it silently disables the browser's native checks and replaces them
  with nothing. (Round 1 of the drill shipped exactly this: empty name / malformed email
  submitted successfully with zero errors shown.) A review should fail any form where
  `noValidate` appears without a matching schema/resolver next to it.
- **Every input with a possible invalid state wires `aria-invalid` and `aria-describedby` to
  its error message, with the error rendered via an element the `aria-describedby` id
  actually points at.** Color or position alone doesn't count — a screen reader needs the
  association. `fieldset`/`legend` for grouped radios/checkboxes and `label htmlFor`/`id` for
  everything else are already covered by the "Components" rule below; this rule is specifically
  about the error-state wiring, which is easy to skip under a vague prompt because nothing
  prompted for it.
- **A component with non-trivial state logic (validation, async submission, persistence) ships
  with a colocated `*.test.tsx`, and `npm run test:run` is actually run — not just written —
  before the work is called done.** Round 1 had no tests and its central bug (see above) only
  surfaced on a manual line-by-line read; round 2's bugs would have shown up as a red test
  instead of requiring that read.

## Working style

- Make small, reviewable changes — prefer several focused commits over one large one.
- When asked to critique or improve a file, explain the reasoning before applying the change,
  not just the diff.
