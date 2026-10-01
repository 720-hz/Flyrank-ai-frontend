"use client";

import { useEffect, useId, useState } from "react";

type Theme = "light" | "dark" | "system";

interface SettingsValues {
  displayName: string;
  email: string;
  theme: Theme;
  emailNotifications: boolean;
  productUpdates: boolean;
}

const STORAGE_KEY = "flyrank:settings";

const DEFAULT_VALUES: SettingsValues = {
  displayName: "",
  email: "",
  theme: "system",
  emailNotifications: true,
  productUpdates: false,
};

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "Match system" },
];

function readStoredValues(): SettingsValues {
  if (typeof window === "undefined") {
    return DEFAULT_VALUES;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_VALUES;
    }
    const parsed = JSON.parse(raw) as Partial<SettingsValues>;
    return { ...DEFAULT_VALUES, ...parsed };
  } catch {
    return DEFAULT_VALUES;
  }
}

export function SettingsForm() {
  const [values, setValues] = useState<SettingsValues>(DEFAULT_VALUES);
  const [status, setStatus] = useState<"idle" | "saved">("idle");
  const formId = useId();

  // Hydrate from localStorage after mount so the server-rendered markup
  // and the first client render stay in sync. localStorage is a browser-only
  // API, so this can't be read during render (SSR or first client paint).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from an external, browser-only store; not derivable during render.
    setValues(readStoredValues());
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    } catch {
      // Best-effort persistence only — localStorage can be unavailable
      // (private browsing, quota, etc.), and that shouldn't block the UI.
    }
    setStatus("saved");
  }

  function handleReset() {
    setValues(DEFAULT_VALUES);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // See note in handleSubmit.
    }
    setStatus("idle");
  }

  function update<K extends keyof SettingsValues>(key: K, value: SettingsValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setStatus("idle");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-10" noValidate>
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-main">Profile</h2>
          <p className="text-sm text-text/60">
            How you appear across the app.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${formId}-name`} className="text-sm font-medium">
            Display name
          </label>
          <input
            id={`${formId}-name`}
            name="displayName"
            type="text"
            autoComplete="name"
            placeholder="Ada Lovelace"
            value={values.displayName}
            onChange={(event) => update("displayName", event.target.value)}
            className="rounded-md border border-text/15 bg-background px-3 py-2 text-sm outline-none focus:border-main"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${formId}-email`} className="text-sm font-medium">
            Email address
          </label>
          <input
            id={`${formId}-email`}
            name="email"
            type="email"
            autoComplete="email"
            placeholder="ada@example.com"
            value={values.email}
            onChange={(event) => update("email", event.target.value)}
            className="rounded-md border border-text/15 bg-background px-3 py-2 text-sm outline-none focus:border-main"
          />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-3">
          <legend className="text-lg font-semibold text-main">
            Appearance
          </legend>
          <p className="-mt-2 text-sm text-text/60">
            Choose how the app looks on this device.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
            {THEME_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 text-sm"
              >
                <input
                  type="radio"
                  name="theme"
                  value={option.value}
                  checked={values.theme === option.value}
                  onChange={() => update("theme", option.value)}
                  className="h-4 w-4 accent-main"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-3">
          <legend className="text-lg font-semibold text-main">
            Notifications
          </legend>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={values.emailNotifications}
              onChange={(event) =>
                update("emailNotifications", event.target.checked)
              }
              className="mt-0.5 h-4 w-4 accent-main"
            />
            <span>
              Email notifications
              <span className="block text-text/60">
                Account activity and security alerts.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={values.productUpdates}
              onChange={(event) =>
                update("productUpdates", event.target.checked)
              }
              className="mt-0.5 h-4 w-4 accent-main"
            />
            <span>
              Product updates
              <span className="block text-text/60">
                Occasional notes about new features.
              </span>
            </span>
          </label>
        </fieldset>
      </section>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          className="rounded-md bg-main px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          Save settings
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="text-sm text-text/60 underline-offset-2 hover:underline"
        >
          Reset to defaults
        </button>
        <span role="status" aria-live="polite" className="text-sm text-accent">
          {status === "saved" ? "Saved." : ""}
        </span>
      </div>
    </form>
  );
}
