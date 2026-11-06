"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * App-wide error boundary (FE-08) — catches an uncaught exception anywhere
 * under the root layout and shows a fallback instead of Next's default
 * overlay/white screen. More specific segments (e.g. agents/[id]/error.tsx)
 * sit closer to the primary flow and take priority over this one.
 */
export default function RouteError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-start justify-center gap-3 px-6 py-24">
      <h1 className="text-xl font-semibold text-text">Something went wrong</h1>
      <p className="text-sm text-text/70">
        This page hit an unexpected error. It&rsquo;s been logged — try again, or head back to
        the dashboard.
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
          href="/"
          className="rounded-md border border-main/20 px-4 py-2 text-sm font-medium text-text"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
