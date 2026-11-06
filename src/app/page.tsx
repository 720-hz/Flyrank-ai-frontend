import { AgentCore } from "@/components/agent-core/agent-core";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3 px-6 py-16">
      <h1 className="text-3xl font-semibold text-main">Dashboard</h1>
      <p className="text-text/80">
        An at-a-glance summary — agent and run counts, system health, and recent activity — will
        live here.
      </p>
      {/* /65, not /50: Lighthouse's color-contrast audit flagged /50 (≈3.4:1) against this
          page's background as below the 4.5:1 AA minimum for normal-weight small text; /65
          (≈6.6:1) clears it with margin. Same fix applied everywhere else this muted-text
          pattern appears (placeholder-screen.tsx, tool-parts.tsx, both error.tsx files). */}
      <p className="text-sm text-text/65">Scaffolded in FE-04 — not wired to real data yet.</p>

      <div className="mt-10 flex w-full flex-col items-center gap-3">
        <AgentCore />
        <p className="max-w-sm text-center text-xs text-text/65">
          Agent Core — a reactive stand-in for this console&rsquo;s AI subsystem (FE-11). Reacts
          to your cursor/touch; the panel drives its state, shape, and color.
        </p>
      </div>
    </main>
  );
}
