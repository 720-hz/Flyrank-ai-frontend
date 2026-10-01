"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { appendActivityEntry } from "@/lib/activity-log";

const THEME_OPTIONS = ["light", "dark", "system"] as const;

const THEME_LABELS: Record<(typeof THEME_OPTIONS)[number], string> = {
  light: "Light",
  dark: "Dark",
  system: "Match system",
};

const settingsSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Display name is required")
    .refine(
      (value) => value.length >= 2 && value.length <= 60,
      "Display name must be between 2 and 60 characters",
    ),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .pipe(z.email("Enter a valid email address")),
  theme: z.enum(THEME_OPTIONS),
  emailNotifications: z.boolean(),
  productUpdates: z.boolean(),
});

export type SettingsFormValues = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: SettingsFormValues = {
  displayName: "",
  email: "",
  theme: "system",
  emailNotifications: true,
  productUpdates: false,
};

const STORAGE_KEY = "flyrank:settings";

function readPersistedSettings(): SettingsFormValues | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = settingsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Simulates an async persistence call (e.g. a network request). */
function persistSettings(values: SettingsFormValues): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
      } catch {
        // localStorage may be unavailable (private mode, disabled storage) — ignore.
      }
      resolve();
    }, 0);
  });
}

function clearPersistedSettings(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Builds a human-readable summary of what changed, for the activity log.
 * `previous` is whatever was persisted before this save (null on the very
 * first save). Connects the Settings screen to Activity: this is the only
 * place anything gets written to the activity log from this form.
 */
function describeSettingsChange(
  previous: SettingsFormValues | null,
  next: SettingsFormValues,
): string {
  if (!previous) return "Set up account settings";

  const changed: string[] = [];
  if (previous.displayName !== next.displayName) changed.push("display name");
  if (previous.email !== next.email) changed.push("email");
  if (previous.theme !== next.theme) {
    changed.push(`theme to ${THEME_LABELS[next.theme]}`);
  }
  if (previous.emailNotifications !== next.emailNotifications) {
    changed.push(
      `email notifications ${next.emailNotifications ? "on" : "off"}`,
    );
  }
  if (previous.productUpdates !== next.productUpdates) {
    changed.push(`product updates ${next.productUpdates ? "on" : "off"}`);
  }

  if (changed.length === 0) return "Saved settings (no changes)";
  return `Updated ${changed.join(", ")}`;
}

export function SettingsForm() {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid, isSubmitting, touchedFields, isSubmitted },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    mode: "onBlur",
    defaultValues: DEFAULT_SETTINGS,
  });

  // Load any persisted values after mount, once hydration is already complete,
  // so the server-rendered markup and first client paint always match defaults.
  useEffect(() => {
    const persisted = readPersistedSettings();
    if (persisted) {
      reset(persisted);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fieldHasVisibleError = (field: "displayName" | "email") =>
    Boolean(errors[field]) && (Boolean(touchedFields[field]) || isSubmitted);

  const onSubmit = async (values: SettingsFormValues) => {
    setShowConfirmation(false);
    const previous = readPersistedSettings();
    await persistSettings(values);
    appendActivityEntry(describeSettingsChange(previous, values));
    setShowConfirmation(true);
  };

  const handleResetToDefaults = () => {
    const hadPersistedSettings = readPersistedSettings() !== null;
    clearPersistedSettings();
    reset(DEFAULT_SETTINGS);
    setShowConfirmation(false);
    if (hadPersistedSettings) {
      appendActivityEntry("Reset settings to defaults");
    }
  };

  return (
    <form
      noValidate
      aria-label="Settings"
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full max-w-md flex-col gap-6"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="displayName" className="text-sm font-medium text-text">
          Display name
        </label>
        <input
          id="displayName"
          type="text"
          autoComplete="name"
          aria-invalid={fieldHasVisibleError("displayName")}
          aria-describedby={
            fieldHasVisibleError("displayName") ? "displayName-error" : undefined
          }
          className="rounded-md border border-main/30 bg-background px-3 py-2 text-text outline-none focus:border-main"
          {...register("displayName")}
        />
        {fieldHasVisibleError("displayName") && (
          <p id="displayName-error" role="alert" className="text-sm text-red-600">
            {errors.displayName?.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-text">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={fieldHasVisibleError("email")}
          aria-describedby={fieldHasVisibleError("email") ? "email-error" : undefined}
          className="rounded-md border border-main/30 bg-background px-3 py-2 text-text outline-none focus:border-main"
          {...register("email")}
        />
        {fieldHasVisibleError("email") && (
          <p id="email-error" role="alert" className="text-sm text-red-600">
            {errors.email?.message}
          </p>
        )}
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-text">Theme preference</legend>
        <div className="flex flex-col gap-2">
          {THEME_OPTIONS.map((option) => (
            <label
              key={option}
              htmlFor={`theme-${option}`}
              className="flex items-center gap-2 text-sm text-text"
            >
              <input
                id={`theme-${option}`}
                type="radio"
                value={option}
                className="accent-main"
                {...register("theme")}
              />
              {THEME_LABELS[option]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor="emailNotifications" className="flex items-center gap-2 text-sm text-text">
          <input
            id="emailNotifications"
            type="checkbox"
            className="accent-main"
            {...register("emailNotifications")}
          />
          Email notifications
        </label>
        <label htmlFor="productUpdates" className="flex items-center gap-2 text-sm text-text">
          <input
            id="productUpdates"
            type="checkbox"
            className="accent-main"
            {...register("productUpdates")}
          />
          Product updates
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="rounded-md bg-main px-4 py-2 text-sm font-medium text-background transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Saving…" : "Save settings"}
        </button>
        <button
          type="button"
          onClick={handleResetToDefaults}
          className="text-sm font-medium text-main underline underline-offset-2"
        >
          Reset to defaults
        </button>
      </div>

      {showConfirmation && (
        <p role="status" aria-live="polite" className="text-sm font-medium text-accent">
          Settings saved.
        </p>
      )}
    </form>
  );
}
