/**
 * Skeleton for /agents (FE-08) — sized to match the real list (heading, one
 * line of subcopy, three cards of the same height/padding) so the swap to
 * real content doesn't shift layout.
 */
export default function AgentsLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10" aria-busy="true" aria-label="Loading agents">
      <div className="h-6 w-20 animate-pulse rounded bg-main/10" />
      <div className="mt-2 h-4 w-80 max-w-full animate-pulse rounded bg-main/10" />

      <ul className="mt-6 flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <li key={i} className="rounded-lg border border-main/10 p-4">
            <div className="h-4 w-32 animate-pulse rounded bg-main/10" />
            <div className="mt-2 h-3.5 w-64 max-w-full animate-pulse rounded bg-main/10" />
          </li>
        ))}
      </ul>
    </main>
  );
}
