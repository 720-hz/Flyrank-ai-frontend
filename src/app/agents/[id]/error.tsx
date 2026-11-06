"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Error boundary for the primary flow (FE-08) — closer to the point of
 * failure than the app-wide app/error.tsx, so it takes priority for anything
 * thrown while rendering an agent's detail page (outside the chat itself,
 * which handles its own errors via useChat's `error`/`status` — see
 * agent-chat.tsx).
 */
export default function AgentDetailError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[agents/[id]/error]", error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-start justify-center gap-3 px-6 py-24">
      <h1 className="text-xl font-semibold text-text">This agent hit a problem</h1>
      <p className="text-sm text-text/70">
        Something went wrong loading this page. It&rsquo;s been logged — try again, or pick a
        different agent.
      </p>
      {/* /65, not /40 — see src/app/page.tsx's comment on this contrast fix (FE-12 audit). */}
      {error.digest && <p className="text-xs text-text/65">Reference: {error.digest}</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-md bg-main px-4 py-2 text-sm font-medium text-background"
        >
          Try again
        </button>
        <Link
          href="/agents"
          className="rounded-md border border-main/20 px-4 py-2 text-sm font-medium text-text"
        >
          Back to agents
        </Link>
      </div>
    </main>
  );
}
