import Link from "next/link";

/**
 * Shown when `page.tsx` calls `notFound()` for an unknown agent id (FE-08) —
 * a designed empty state pointing somewhere useful, instead of Next's
 * generic 404.
 */
export default function AgentNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-start justify-center gap-3 px-6 py-24">
      <h1 className="text-xl font-semibold text-text">Agent not found</h1>
      <p className="text-sm text-text/70">
        That agent doesn&rsquo;t exist, or it may have been renamed. Here are the ones that do:
      </p>
      <Link
        href="/agents"
        className="mt-2 rounded-md bg-main px-4 py-2 text-sm font-medium text-background"
      >
        Browse agents
      </Link>
    </main>
  );
}
