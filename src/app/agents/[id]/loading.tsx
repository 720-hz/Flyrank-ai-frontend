/**
 * Skeleton for /agents/[id] (FE-08) — mirrors AgentChat's real dimensions
 * (same `h-[min(70dvh,640px)]` shell, header lines, a couple of message-sized
 * blocks, the input bar's height) so there's no layout shift when the real
 * chat mounts. This segment resolves almost instantly today (no real data
 * fetch yet), but the boundary matters once one exists.
 */
export default function AgentDetailLoading() {
  return (
    <main
      className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-10"
      aria-busy="true"
      aria-label="Loading agent"
    >
      <div>
        <div className="h-6 w-40 animate-pulse rounded bg-main/10" />
        <div className="mt-2 h-4 w-72 max-w-full animate-pulse rounded bg-main/10" />
      </div>

      <div className="flex h-[min(70dvh,640px)] min-h-[420px] flex-col rounded-lg border border-main/10 bg-background">
        <div className="flex-1 space-y-3 px-4 py-4">
          <div className="h-9 w-2/3 animate-pulse rounded-lg bg-main/10" />
          <div className="ml-auto h-9 w-1/2 animate-pulse rounded-lg bg-main/10" />
          <div className="h-9 w-3/5 animate-pulse rounded-lg bg-main/10" />
        </div>
        <div className="flex shrink-0 items-end gap-2 border-t border-main/10 p-3">
          <div className="h-11 flex-1 animate-pulse rounded-md bg-main/10" />
          <div className="h-11 w-16 shrink-0 animate-pulse rounded-md bg-main/10" />
        </div>
      </div>
    </main>
  );
}
