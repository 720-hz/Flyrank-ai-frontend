"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import type { SettingsFormValues } from "./settings/settings-form";

const STORAGE_KEY = "flyrank:settings";

type AccountSummary = Pick<
  SettingsFormValues,
  "displayName" | "email" | "theme" | "emailNotifications" | "productUpdates"
>;

const THEME_LABELS: Record<AccountSummary["theme"], string> = {
  light: "Light",
  dark: "Dark",
  system: "Match system",
};

function isValidTheme(value: unknown): value is AccountSummary["theme"] {
  return value === "light" || value === "dark" || value === "system";
}

/**
 * Parses the settings persisted by the Settings form. This intentionally
 * doesn't re-run the settings form's zod schema (e.g. display name length
 * bounds or email format) — it only checks the shape is usable for display,
 * and treats anything else (missing key, malformed JSON, wrong types) as
 * "nothing saved yet" rather than throwing.
 */
function parseAccountSummary(raw: string | null): AccountSummary | null {
  try {
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;

    const { displayName, email, theme, emailNotifications, productUpdates } =
      parsed as Record<string, unknown>;

    if (typeof displayName !== "string" || typeof email !== "string") {
      return null;
    }
    if (!isValidTheme(theme)) return null;
    if (
      typeof emailNotifications !== "boolean" ||
      typeof productUpdates !== "boolean"
    ) {
      return null;
    }

    return { displayName, email, theme, emailNotifications, productUpdates };
  } catch {
    return null;
  }
}

// useSyncExternalStore requires getSnapshot to return a referentially stable
// value when the underlying data hasn't changed (otherwise it can trigger
// render loops). localStorage reads are cheap, so we just cache the last
// parsed result keyed by the raw string.
let cachedRaw: string | null = null;
let cachedSummary: AccountSummary | null = null;

function getSnapshot(): AccountSummary | null {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSummary = parseAccountSummary(raw);
  }
  return cachedSummary;
}

function getServerSnapshot(): AccountSummary | null {
  return null;
}

function subscribeToNothing(): () => void {
  // No other part of this tab writes to this key after mount, so there's
  // nothing to subscribe to — this only needs a single client-side read
  // with an SSR-safe fallback.
  return () => {};
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-main/15 px-4 py-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-text/60">
        {label}
      </dt>
      <dd className="text-sm font-medium text-text">{value}</dd>
    </div>
  );
}

export function AccountOverview() {
  // getServerSnapshot (null) matches what the server renders and what the
  // client renders on its first pass, so hydration never mismatches; once
  // mounted, React swaps in the real client snapshot (if any) on its own.
  const summary = useSyncExternalStore(
    subscribeToNothing,
    getSnapshot,
    getServerSnapshot,
  );

  if (!summary) {
    return (
      <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-md border border-dashed border-main/30 px-6 py-10 text-center">
        <p className="text-text/80">
          You haven&apos;t set up your account yet.
        </p>
        <Link
          href="/account/settings"
          className="text-sm font-medium text-main underline underline-offset-2"
        >
          Go to Settings
        </Link>
      </div>
    );
  }

  return (
    <dl className="grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
      <SummaryCard
        label="Display name"
        value={summary.displayName || "Not set yet"}
      />
      <SummaryCard label="Email" value={summary.email || "Not set yet"} />
      <SummaryCard label="Theme" value={THEME_LABELS[summary.theme]} />
      <SummaryCard
        label="Email notifications"
        value={summary.emailNotifications ? "On" : "Off"}
      />
      <SummaryCard
        label="Product updates"
        value={summary.productUpdates ? "On" : "Off"}
      />
    </dl>
  );
}
