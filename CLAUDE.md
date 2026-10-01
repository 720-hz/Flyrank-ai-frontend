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

## Working style

- Make small, reviewable changes — prefer several focused commits over one large one.
- When asked to critique or improve a file, explain the reasoning before applying the change,
  not just the diff.
