"use client";

import { useSyncExternalStore } from "react";
import { readActivityLog, type ActivityEntry } from "@/lib/activity-log";

// useSyncExternalStore requires getSnapshot to return a referentially stable
// value when the underlying data hasn't changed (otherwise it can trigger
// render loops). localStorage reads are cheap, so we just cache the last
// parsed result keyed by the raw string, the same approach as
// `account-overview.tsx`.
const STORAGE_KEY = "flyrank:activity";

let cachedRaw: string | null = null;
let cachedEntries: ActivityEntry[] = [];

function getSnapshot(): ActivityEntry[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }

  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedEntries = readActivityLog();
  }
  return cachedEntries;
}

function getServerSnapshot(): ActivityEntry[] {
  return [];
}

function subscribeToNothing(): () => void {
  // No other part of this tab writes to this key after mount, so there's
  // nothing to subscribe to — this only needs a single client-side read
  // with an SSR-safe fallback.
  return () => {};
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleString();
}

export function ActivityList() {
  // getServerSnapshot ([]) matches what the server renders and what the
  // client renders on its first pass, so hydration never mismatches; once
  // mounted, React swaps in the real client snapshot (if any) on its own.
  const entries = useSyncExternalStore(
    subscribeToNothing,
    getSnapshot,
    getServerSnapshot,
  );

  if (entries.length === 0) {
    return (
      <div className="flex w-full max-w-md flex-col items-center gap-2 rounded-md border border-dashed border-main/30 px-6 py-10 text-center">
        <p className="text-text/80">No activity yet.</p>
        <p className="text-sm text-text/60">
          Actions you take on your account, like saving settings, will show
          up here.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex w-full max-w-md flex-col gap-3">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="flex flex-col gap-1 rounded-md border border-main/15 px-4 py-3"
        >
          <span className="text-sm font-medium text-text">
            {entry.message}
          </span>
          <span className="text-xs text-text/60">
            {formatTimestamp(entry.timestamp)}
          </span>
        </li>
      ))}
    </ul>
  );
}
