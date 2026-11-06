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

## Tool contract (FE-07)

The Incident Summarizer agent (`/agents/incident-summarizer`) can call one server-side tool.
Defined in [`src/lib/ai/tools.ts`](./src/lib/ai/tools.ts), wired into that agent only via
`AGENT_TOOLS` in [`src/lib/ai/config.ts`](./src/lib/ai/config.ts).

### `scoreIncidentSeverity`

Computes an objective, deterministic SEV1–SEV4 severity score from a few facts about an
incident's impact — the model reports what happened, the tool (not the model) decides how bad
it was.

**Input schema** (Zod, `scoreIncidentSeverityInputSchema`):

| Field | Type | Notes |
| --- | --- | --- |
| `impactSummary` | `string` (1–280 chars) | One plain-language sentence describing what broke. |
| `affectedUsersEstimate` | `"none" \| "some" \| "most" \| "all"` | Rough fraction of users who hit the problem. `"none"` = internal-only. |
| `durationMinutes` | `number` (int, ≥ 0) | Minutes from first user-facing impact to resolution. |
| `dataWasLostOrCorrupted` | `boolean` | Whether any user data was lost or corrupted. |

**Return shape** (`ScoreIncidentSeverityOutput`):

```ts
{
  level: "SEV1" | "SEV2" | "SEV3" | "SEV4";
  score: number;        // 0–100, higher is worse
  factors: Array<{ label: string; points: number; detail: string }>;
  recommendation: string;
}
```

Scoring is a plain additive rubric (affected-user tier + duration tier + a data-loss
penalty, clamped to 100) — see `computeIncidentSeverity` for the exact breakpoints. It's
unit-tested directly in `src/lib/ai/tools.test.ts`, independent of the model.

**Designed failure mode:** a `durationMinutes` over 20,160 (14 days) is treated as an almost
certain units mistake (e.g. seconds entered as minutes) rather than a real incident, and the
tool throws instead of scoring it. That message reaches the client as the tool part's
`errorText` — see the `onError` passed to `toUIMessageStreamResponse()` in
`src/app/api/agents/[id]/chat/route.ts`, which surfaces a thrown `Error`'s message instead of
the AI SDK's default generic "An error occurred." (only for errors; nothing about *successful*
tool inputs or outputs changes). Trigger it by telling the agent an incident lasted an
implausible number of minutes.

**Rendering:** `src/app/agents/[id]/tool-parts.tsx` renders all four tool-part states the AI
SDK emits (`input-streaming`, `input-available`, `output-available`, `output-error`) with a
distinct visual per state — the first two show the input filling in inside a pending card
(placeholders for fields not yet streamed), `output-available` renders a real
`IncidentSeverityCard` component (badge + score bar + factor breakdown + recommendation, not
a JSON dump), and `output-error` renders a red error card with the specific message above.

## Resilience & failure states (FE-08)

Inventory of the primary flow's (`/agents/[id]`'s streaming chat) expected and unexpected
failure modes, and how each is handled:

| Case | Handling |
| --- | --- |
| Mid-stream failure (model overloaded, rate-limited, connection drops after streaming starts) | The route's `onError` surfaces a designed message; the chat shows a red error card with that message and a **Retry** button that calls `regenerate()` — resending only the failed turn, not the whole conversation (`src/app/agents/[id]/agent-chat.tsx`). |
| Pre-stream failure (missing/invalid API key, a provider error before any chunk streams) | The route's top-level `catch` returns `{ error }` JSON with the right status. `HttpChatTransport` doesn't parse that JSON for you — its `.message` is the raw response *text* — so `describeChatError` (`src/lib/ai/chat-error.ts`) unwraps the `error` field instead of showing the literal `{"error":"..."}` string. |
| Rate limit / provider overload | `describeProviderError` (`src/lib/ai/server-error.ts`) recognizes an `APICallError` with status 429/503/529 and returns actionable copy ("wait a moment and try again") instead of raw provider text — used from both the pre-stream `catch` and the mid-stream `onError`, so the two paths agree. |
| Network failure before send | `useOnlineStatus` (`src/lib/use-online-status.ts`, built on `useSyncExternalStore`) shows a banner and disables Send/the textarea the moment the browser goes offline, instead of waiting for a fetch to fail first. |
| Empty / whitespace-only input | Unchanged from FE-06 — Send stays disabled. |
| First-run / no conversation yet | Each agent now ships two realistic `examplePrompts` (`src/lib/ai/config.ts`); the empty state renders them as click-to-fill chips instead of a bare sentence. |
| Unknown agent (e.g. `/agents/does-not-exist`) | `agents/[id]/not-found.tsx` explains why and links back to `/agents`, instead of Next's generic 404. |
| Uncaught render error | `app/error.tsx` (app-wide) and the more specific `agents/[id]/error.tsx` both offer **Try again** (Next's `retry()`) and a way back; `app/global-error.tsx` covers a crash in the root layout itself, with its own inline styles since it replaces the whole document. |
| Slow response | FE-06's thinking-dots indicator, plus new `loading.tsx` skeletons on `/agents` and `/agents/[id]` sized to the real layout so there's no shift when content swaps in. |
| Mobile Safari | The chat textarea is `text-base` (16px) at every breakpoint — under 16px, iOS Safari auto-zooms the page on focus, which on a chat screen means every send yanks the viewport in and out. Verified at 375×667 with zero horizontal overflow in both the empty and error states. |

All of the above were exercised live against the dev server with Playwright — intercepting
the chat route to simulate each failure rather than depending on the real provider — not just
unit-tested: happy path, mid-stream overload followed by a successful retry, a pre-stream 500
(confirms the JSON body doesn't leak as literal text), a 429, the offline banner, the
unknown-agent 404, and the mobile viewport in both the empty and error states. Zero uncaught
page errors across all of them; the only console output was the browser's own network-level
logging of the intentionally-sabotaged non-2xx responses, which is unavoidable for any failed
request and not specific to this app.

## Testing & CI (FE-10)

Two layers, each covering what it's actually good at:

**Component tests (Vitest + React Testing Library).** `npm run test:run` — 20 files, 111+
tests. Every query goes through `getByRole`/`getByLabelText`/`getByText`, never a test id, so
a CSS-class rename can't break a test (an accessible-name/role change is a real UI regression,
which should break one). Highest-risk coverage: `agent-chat.test.tsx` drives the chat
component through pending (`status: "submitted"`), streaming (including the hand-off from the
thinking indicator to partial text), and error (both a plain error and a mid-stream-failure
retry card) by mocking `@ai-sdk/react`'s `useChat` directly — the real `/api/agents/[id]/chat`
route, and the real Anthropic API behind it, are never reached by this layer.
`settings-form.test.tsx` covers the one `react-hook-form` + `zod` validated form (required
field, email format, successful submit + persistence, reset). `tool-parts.test.tsx` covers the
one tool-result component across all four states the AI SDK emits for a tool call
(`input-streaming`, `input-available`, `output-available`, `output-error`).

**One end-to-end test (Playwright), the real primary flow.** `npm run test:e2e` —
`e2e/agent-chat.spec.ts` drives a real Chromium browser against a real `next dev` server:
Dashboard → **Agents** nav link → into PR Reviewer → type a message → Send → the streamed
reply renders; a second case covers a failed turn → error card → **Retry** → a working
response succeeds. The one thing this suite can't let through to the real world — the chat
route's call to Anthropic — is intercepted at the network boundary with `page.route()`
(`e2e/mock-ui-message-stream.ts`), which hand-builds a real AI SDK `UIMessageChunk` SSE
response (and a real JSON error body, for the failure case). That's the browser's actual
fetch getting a fake server response, not a mocked module — so routing, the nav, scroll pinning,
and disabled/focus states are all exercised for real; only the Anthropic call itself is faked,
and it's faked by speaking its exact wire protocol rather than shortcutting the UI layer.

**Caught by actually running the suite, not just writing it:** the first version of the retry
E2E test asserted on a bare `getByRole("alert")` and failed with a strict-mode "resolved to 2
elements" error — Next.js's own route-change announcer (`#__next-route-announcer__`) also
carries `role="alert"`. Fixed by scoping the locator with `.filter({ hasText: ... })` to the
app's own error card specifically. Left in `e2e/agent-chat.spec.ts`'s comments as a reminder
that `role="alert"` isn't unique to app code on a Next.js page.

**CI (`.github/workflows/ci.yml`).** On every push to `main` and every PR: `npm ci` → lint →
Vitest → `next build` → install Playwright's Chromium → Playwright. All green is required for
the suite to pass; the Playwright HTML report uploads as a build artifact either way. No
`ANTHROPIC_API_KEY` is required anywhere in this pipeline — a placeholder value is set purely
so an un-mocked route that slipped through review would fail loudly on an obviously-fake key
instead of silently calling production Anthropic.

## Agent Core — a reactive 3D hero (FE-11)

What it is: a small [React Three Fiber](https://r3f.docs.pmnd.rs/) scene on the Dashboard
(`/`) standing in for the console's own AI subsystem rather than a generic demo object. A
distorting core (`@react-three/drei`'s `MeshDistortMaterial`) tilts toward the cursor/touch
position, spins and roughens as its "agent state" (Idle / Thinking / Speaking — the same
vocabulary `/agents/[id]`'s real chat UI already uses) is changed from a small custom control
panel, and a **Pulse** button fires a one-shot scale bump standing in for the moment a response
actually lands. The panel also swaps the core's geometry (icosahedron / torus knot) and its
color (four presets pulled from the app's own theme tokens). None of this is orbit-controlled
on purpose — it's a reactive hero sitting in the page, not a product viewer, so nothing invites
a visitor to drag the camera around while they're skimming the dashboard.

**Interactions, concretely:** cursor/touch-reactive tilt (free from R3F's own normalized
pointer state — the same code path handles touch, so this doubles as the mobile interaction),
a state switch that eases rotation speed/surface distortion rather than snapping, a shape swap,
a color swap, and a triggered one-shot pulse animation — five, where the brief asked for one.

**Perf note.** The real cost here is "three" + "@react-three/fiber" + "@react-three/drei"
themselves: the one chunk containing all three plus this scene's own code is **908 KB raw /
238 KB gzipped**. Two separate decisions keep that from being a tax on every Dashboard visit:

1. **It's dynamically imported with `ssr: false`** (`agent-core.tsx` → `next/dynamic(() =>
   import("./agent-core-scene"))`), so that chunk never ships in the server render or the
   initial client bundle — confirmed by grepping the built `page_client-reference-manifest.js`
   for `agent-core-scene`: it appears nowhere in the eager module map, only the small (~12 KB)
   orchestrator component does. It's fetched only once a visitor actually gets the WebGL path.
2. **A visitor with `prefers-reduced-motion` set, or without WebGL support, never triggers
   that import at all.** Both checks happen via `useSyncExternalStore`-backed hooks
   (`use-prefers-reduced-motion.ts`, `use-webgl-support.ts`) that resolve to the static
   `AgentCoreFallback` — a single gradient `div`, zero extra JS — before the dynamic import is
   ever requested, matching the pattern FE-08 already established for "assume the safe default
   during SSR, reconcile to the real client value right after."

No model file, no DRACO/meshopt pipeline: the core is procedural geometry
(`icosahedronGeometry` / `torusKnotGeometry`), so there's no asset to compress or lazy-load in
the first place — the entire weight is the library code, which the above already isolates.
Lighting is two plain directional lights plus ambient fill, no environment map/HDRI, keeping
the scene itself cheap to render on top of being cheap to load.

Frame rate: sampled via a real `requestAnimationFrame` counter over a real `next dev` server
in this environment's headless Chromium, which has no GPU and renders through SwiftShader
(software) — **52–58 fps** there, which given there's no hardware acceleration at all is a
reasonable proxy for "nothing about this scene is expensive" rather than a real device number;
a real GPU should comfortably sit at the display's refresh rate given the scene is one mesh,
one material, and two lights.

Caught by actually running it, not just writing it: the fallback and the Canvas wrapper share
`aspect-square w-full max-w-sm` so swapping between them causes no layout shift — except the
first version of `AgentCoreFallback` wrapped a centered inner circle in its own `flex
items-center justify-center` div, and that combination (a `display: flex` element that is
itself a flex item with `aspect-ratio` set, inside this page's shrink-to-fit flex layout)
collapsed to a real 0×0 box in Chromium — confirmed with `getBoundingClientRect`, not a visual
read. Fixed by putting the size/radius/gradient directly on one element instead of a
wrapper-plus-child. A related sizing issue (percentage widths not resolving against a
shrink-to-fit ancestor) needed `w-full` added up the flex chain in both `page.tsx` and
`agent-core.tsx`'s own root — see the comment at that line.

**What's next with more time:** `/agents/[id]`'s real `status` (submitted/streaming/error)
could drive Agent Core's state directly instead of the panel being the only input, so the hero
reflects an actual in-flight request; an idle→thinking→speaking→idle demo loop for visitors who
never touch the panel; and `@react-three/postprocessing`'s bloom on the core's highlight for a
closer match to the "glowing" fallback gradient (skipped here to keep the perf budget simple —
one mesh, no render-target passes).

## Shader hero — a custom aurora fragment shader (FE-13)

What it is: a fullscreen custom GLSL fragment shader on a new `/about` page (`ShaderHero` →
`about/page.tsx`), not a remix left mostly as-is — it's a from-scratch domain-warped flow
field written for this brief, palette-matched to the console's own theme tokens and reusing
the same R3F/drei plumbing (`shaderMaterial` + `extend`) FE-11's Agent Core already
established, rather than the session's shader-playground aurora copied wholesale.

**The shader, block by block** (full source + comments in `shader-hero-shader.ts`):

- **Vertex shader**: a fullscreen-quad trick, not a 3D object — `Plane()` in
  `shader-hero-scene.tsx` renders a 2x2 `planeGeometry`, whose local-space corners already sit
  at clip-space's `-1..1` extremes, so `gl_Position = vec4(position.xy, 0.0, 1.0)` forwards
  them straight through with no camera/projection matrix multiply at all. `vUv` is passed
  through unchanged for the fragment shader to use.
- **Hash + value noise + fbm**: `hash()` turns a 2D point into a pseudo-random float (no noise
  texture, no library); `valueNoise()` interpolates between the four hashed corners of a grid
  cell with `smoothstep` easing so it reads as noise, not a visible grid; `fbm()` stacks 5
  octaves of that noise at doubling frequency / halving amplitude — one octave alone looks
  like blobby static, five gives the wispy, layered aurora look.
- **Domain warp**: `fbm`'s own output feeds back in as an offset to `fbm`'s *input*
  (`fbm(flowUv + warp * 1.2)` where `warp` is itself two more `fbm` calls). This is the one
  trick that turns "noise sliding sideways over time" into something that looks like it's
  actually flowing and curling.
- **Palette walk**: the field's scalar value is walked through the app's own four theme
  colors (`--color-main` / accent / the Ember and Violet presets Agent Core already uses from
  FE-11) via three `smoothstep`-gated `mix()` calls — so this reads as the same product, not
  an invented rainbow gradient.
- **Vignette + bottom bias**: darkens the edges, and darkens the lower portion further still,
  so the headline (anchored near the bottom of the page) always sits on a dark-enough patch
  regardless of which palette color the flow field happens to land on there.
- **Grain**: a cheap per-pixel dither (`hash(vUv * u_resolution.xy + u_time) - 0.5`) so the
  gradient doesn't band on lower-end/compressed displays, and so it reads as deliberately
  textured rather than a flat CSS gradient.

**Uniforms used** — all three of the brief's core uniforms, not just the required two:

- `u_time` — seconds since mount, driving the domain warp's drift. Explicitly paused (not just
  implicitly rAF-throttled) while the tab is hidden, via a new `use-tab-visible.ts` hook
  (`useSyncExternalStore` over the Page Visibility API, same pattern as every other
  feature-detection hook in this repo) — `delta` simply isn't added to the clock on a tick
  where the tab was hidden, so the shader freezes on its last frame instead of jumping forward
  once the tab comes back.
- `u_resolution` — canvas size in CSS pixels, used only to aspect-correct the UV space fbm
  samples; devicePixelRatio doesn't change the aspect *ratio*, so no DPR multiply is needed
  here (DPR is handled separately below).
- `u_mouse` — pointer position normalized 0..1 within the canvas's own bounding box (not the
  window), Y-flipped to match `vUv`'s bottom-up convention, eased toward its live target each
  frame (`lerp(..., 0.06)`) rather than snapped, so the flow field *gently leans* toward the
  cursor within a soft `smoothstep` falloff radius instead of hard-following it.

**Responsible-shipping measures, one-liner:** `dpr={[1, 2]}` on the R3F `Canvas` caps
devicePixelRatio at 2x regardless of the real device ratio; `u_time` accumulation explicitly
pauses on tab-hidden via `use-tab-visible.ts`; and `useWebglSupport()` / `usePrefersReducedMotion()`
gate the scene behind a static `ShaderHeroFallback` (a plain CSS gradient through the same
four palette colors, zero extra JS) for visitors without WebGL or with reduced motion set —
same `next/dynamic(..., { ssr: false })` + safe-default-during-SSR pattern FE-11 established,
reused here, not reinvented.

**Contrast.** The headline sits over a `black/65 → black/20 → transparent` CSS scrim, chosen
by computing WCAG contrast ratios numerically (not eyeballed) for white text against every one
of the shader's four palette colors plus a synthetic near-white grain spike, across four
candidate scrim opacities — `black/65` clears AA's 4.5:1 floor with comfortable margin in the
worst case (7.78:1, up to 19:1 depending on the underlying color). The shader's own vignette
darkens the same region too, but the scrim is what *guarantees* the ratio regardless of what
the animated shader is doing on a given frame.

**Perf note — the vendor cost is already paid.** The same concern FE-11 flagged
("three" + "@react-three/fiber" + "@react-three/drei" are the real weight, not the scene
code) applies here too, but checking the actual production build
(`.next/server/app/*/page/react-loadable-manifest.json`) shows the vendor chunk is **shared,
not duplicated**: both Agent Core's dynamic import (`/` → chunk id `29621`) and this shader's
dynamic import (`/about` → chunk id `58959`) resolve to the exact same
`static/chunks/22h4t3l6n1nhw.js` — **940 KB raw / 240 KB gzipped** — alongside their own small
per-page chunk. This hero's own code (the material, the plane, the pointer/clock logic) is
**8.1 KB raw / 3.7 KB gzipped** on top of that shared chunk. A visitor who has already loaded
Agent Core on the Dashboard pays effectively nothing extra in vendor weight to then visit
`/about` — only the 3.7 KB gzipped delta — because Next.js dedupes the identical dynamic
`import("three")`/`import("@react-three/fiber")` graph into one content-addressed chunk rather
than bundling a second copy per route.

No model file, no texture: everything here is procedural GLSL on a single 2-triangle plane, so
there's no asset pipeline and no extra network request beyond the JS chunks above.
