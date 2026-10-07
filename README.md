# Environment and AI toolchain

Capstone project for the FlyRank "Frontend Development with AI" track — 14 assignments,
building a production-style frontend with an AI coding assistant (Claude Code) doing most of
the heavy lifting, under human direction and review.

## Status

🚧 **Setup phase.** The actual product this repo will become hasn't been scoped yet — that
comes in a later assignment. Right now this is a scaffolded Next.js app plus the repo
conventions the rest of the track will build on.

## Stack (starting point, subject to change once the project is scoped)

- [Next.js](https://nextjs.org/) (React, TypeScript)
- [Tailwind CSS](https://tailwindcss.com/) for styling
- AI-assisted development via [Claude Code](https://code.claude.com/)

## Conventions

- Commits follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
  (`feat:`, `fix:`, `chore:`, `docs:`, etc.).
- See [`CLAUDE.md`](./CLAUDE.md) for the full stack/conventions reference Claude Code reads
  at the start of every session.

## Getting started

**Prerequisites**

- [Node.js](https://nodejs.org/) (current LTS) and npm
- Git
- [Claude Code](https://code.claude.com/) (optional, but it's how this project is built)

```bash
git clone https://github.com/720-hz/flyrank-frontend-capstone.git
cd flyrank-frontend-capstone
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Environment variables

Copy [`.env.example`](./.env.example) to `.env.local` and fill in real values for local
development — `.env.local` is gitignored, never commit it. In Vercel, set the same variables
under Project Settings → Environment Variables, separately per environment (Production /
Preview / Development).
