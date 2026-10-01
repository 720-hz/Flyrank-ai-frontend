/**
 * A small client-side activity log, persisted to localStorage. Entries are
 * kept most-recent-first and capped at MAX_ENTRIES so the stored log can't
 * grow without bound.
 *
 * This module is only ever imported from client components, so it doesn't
 * need the SSR-safe `useSyncExternalStore` treatment that reading it in a
 * render path would (see `account-overview.tsx` for that pattern) — but its
 * functions must still never throw if `localStorage` or `crypto` are
 * unavailable (private browsing, disabled storage, non-browser test
 * environments, etc.).
 */

export type ActivityEntry = {
  id: string;
  message: string;
  timestamp: string;
};

const STORAGE_KEY = "flyrank:activity";
const MAX_ENTRIES = 20;

function isActivityEntry(value: unknown): value is ActivityEntry {
  if (typeof value !== "object" || value === null) return false;
  const { id, message, timestamp } = value as Record<string, unknown>;
  return (
    typeof id === "string" &&
    typeof message === "string" &&
    typeof timestamp === "string"
  );
}

/**
 * Reads the persisted activity log, most-recent-first. Returns `[]` if
 * nothing is stored, storage is unavailable, or the stored value is
 * malformed — this never throws.
 */
export function readActivityLog(): ActivityEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isActivityEntry);
  } catch {
    return [];
  }
}

/**
 * Appends a new entry to the front of the activity log, persists it (capped
 * at the `MAX_ENTRIES` most recent entries), and returns the updated,
 * most-recent-first array. Intended to be called by other features when
 * something worth logging happens (e.g. saving settings) — this module
 * doesn't wire up any callers itself.
 */
export function appendActivityEntry(message: string): ActivityEntry[] {
  const existing = readActivityLog();

  let id: string;
  try {
    id = crypto.randomUUID();
  } catch {
    // crypto.randomUUID isn't available in every environment (older
    // browsers, some test runners) — fall back to a timestamp + random
    // suffix rather than failing to log the entry at all.
    id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  const entry: ActivityEntry = {
    id,
    message,
    timestamp: new Date().toISOString(),
  };

  const updated = [entry, ...existing].slice(0, MAX_ENTRIES);

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage may be unavailable (private mode, disabled storage,
    // quota exceeded) — the caller still gets the updated array back even
    // though it couldn't be persisted.
  }

  return updated;
}
