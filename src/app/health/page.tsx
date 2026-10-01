import type { Metadata } from "next";
import { headers } from "next/headers";
import type { HealthStatus } from "@/app/api/health/route";
import { buildRequestOrigin } from "./request-origin";

export const metadata: Metadata = {
  title: "Health — Flyrank Console",
  description: "Live system status.",
};

// This page's whole purpose is to show a fresh status on every load — never
// cache it, and don't try to statically prerender it at build time (there's
// no running server yet for it to fetch from).
export const dynamic = "force-dynamic";

async function fetchHealth(): Promise<
  { ok: true; data: HealthStatus } | { ok: false; error: string }
> {
  try {
    const headersList = await headers();
    const host = headersList.get("host");
    if (!host) {
      return { ok: false, error: "Could not determine the request host." };
    }

    const response = await fetch(`${buildRequestOrigin(host)}/api/health`, {
      cache: "no-store",
    });
    if (!response.ok) {
      return { ok: false, error: `/api/health responded with ${response.status}` };
    }

    return { ok: true, data: (await response.json()) as HealthStatus };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown fetch error",
    };
  }
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-main/10 py-3 text-sm">
      <dt className="text-text/60">{label}</dt>
      <dd className="font-medium text-text">{value}</dd>
    </div>
  );
}

export default async function HealthPage() {
  const result = await fetchHealth();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-24">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-main">Health</h1>
        <p className="text-text/80">
          Fetched live from <code className="text-sm">/api/health</code> on
          every load.
        </p>
      </div>

      {result.ok ? (
        <dl className="rounded-md border border-main/15 px-4">
          <StatusRow label="Status" value={result.data.status} />
          <StatusRow
            label="Checked at"
            value={new Date(result.data.timestamp).toLocaleString()}
          />
          <StatusRow
            label="Process uptime"
            value={`${result.data.uptimeSeconds}s`}
          />
        </dl>
      ) : (
        <div
          role="alert"
          className="rounded-md border border-dashed border-main/30 px-4 py-6 text-sm text-text/80"
        >
          Couldn&apos;t reach the health check: {result.error}
        </div>
      )}
    </main>
  );
}
