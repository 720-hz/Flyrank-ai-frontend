"use client";

import { AlertTriangle, Check, Loader2, type LucideIcon } from "lucide-react";
import { useEffect, useReducer, useRef, useSyncExternalStore } from "react";

export type LifecycleStatus = "idle" | "loading" | "success" | "error";

interface State {
  status: LifecycleStatus;
  /** Bumped on every transition into "error", so the shake animation can be re-triggered
   *  even on back-to-back failures (a plain class toggle wouldn't replay — React sees no
   *  className change if the button fails, settles, and fails again with nothing in
   *  between forcing a reflow). Used as part of a React `key`. */
  errorNonce: number;
  /** Same idea for the success "pop". */
  successNonce: number;
}

type Action =
  | { type: "press" }
  | { type: "resolve" }
  | { type: "reject" }
  | { type: "reset" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "press":
      // Guarded at the call site too (see handlePress), but a reducer that can't produce
      // an invalid transition even if called wrong is cheap insurance.
      return state.status === "loading" ? state : { ...state, status: "loading" };
    case "resolve":
      return { ...state, status: "success", successNonce: state.successNonce + 1 };
    case "reject":
      return { ...state, status: "error", errorNonce: state.errorNonce + 1 };
    case "reset":
      return { ...state, status: "idle" };
    default:
      return state;
  }
}

export interface LifecycleButtonProps {
  idleLabel: string;
  loadingLabel?: string;
  successLabel?: string;
  errorLabel?: string;
  /** sr-only strings announced via aria-live; default to the visible labels if omitted. */
  announce?: Partial<Record<LifecycleStatus, string>>;
  icon: LucideIcon;
  /** The async work to perform. Reject to demo the error path, resolve for success.
   *  Injected rather than hardcoded so tests can supply deterministic promises instead of
   *  relying on the real demo's randomness. */
  onPress: () => Promise<void>;
  /** How long the success state holds before auto-returning to idle. */
  successHoldMs?: number;
  className?: string;
}

/**
 * A button that choreographs its own lifecycle (idle -> loading -> success/error -> idle)
 * instead of swapping content abruptly. Built for the "Buttons with a Brain" brief —
 * see playground/NOTES.md for the duration/easing rationale and why this intentionally
 * does NOT animate width (the brief's own example suggests it; the brief's *requirements*
 * explicitly rule out layout-affecting animation, and requirements win).
 *
 * Every visual layer (idle / loading / success / error) is always mounted, stacked in the
 * same grid cell, and crossfades via opacity + a small transform — no layer ever mounts or
 * unmounts mid-transition, which sidesteps the usual "exit animation never finishes because
 * React already unmounted it" problem without needing an animation library.
 */
export function LifecycleButton({
  idleLabel,
  loadingLabel = "Sending…",
  successLabel = "Sent",
  errorLabel = "Retry",
  announce,
  icon: Icon,
  onPress,
  successHoldMs = 1400,
  className = "",
}: LifecycleButtonProps) {
  const [state, dispatch] = useReducer(reducer, {
    status: "idle",
    errorNonce: 0,
    successNonce: 0,
  });
  const resetTimeoutRef = useRef<number | null>(null);
  // Lets a rapid-fire resolve/reject that lands after the component already moved on (e.g.
  // the user re-pressed from the error state before the first call's promise settled, were
  // that ever possible) be ignored instead of clobbering newer state. Belt-and-braces: the
  // `status === "loading"` guard already prevents overlapping presses today.
  const callIdRef = useRef(0);

  useEffect(
    () => () => {
      if (resetTimeoutRef.current !== null) window.clearTimeout(resetTimeoutRef.current);
    },
    [],
  );

  function handlePress() {
    if (state.status === "loading") return; // spam-click guard: no overlapping requests
    if (resetTimeoutRef.current !== null) {
      // A click from "success" or "error" (both are valid re-press points) must cancel any
      // queued return-to-idle timer, or that stale timer can fire mid-way through the *new*
      // request and yank the button back to idle out from under it.
      window.clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }
    const callId = ++callIdRef.current;
    dispatch({ type: "press" });
    onPress().then(
      () => {
        if (callId !== callIdRef.current) return;
        dispatch({ type: "resolve" });
        resetTimeoutRef.current = window.setTimeout(() => {
          dispatch({ type: "reset" });
        }, successHoldMs);
      },
      () => {
        if (callId !== callIdRef.current) return;
        dispatch({ type: "reject" });
      },
    );
  }

  const { status } = state;
  const isLoading = status === "loading";
  const isError = status === "error";

  // The button's accessible name, at all times — not just on change. Easy bug to ship: make
  // the visible label aria-hidden (so sighted users see the crossfade, not duplicate text)
  // and only announce via aria-live below, and you end up with a button that has NO name at
  // all in the idle state, because aria-live is for change announcements, not base naming.
  const currentLabel = { idle: idleLabel, loading: loadingLabel, success: successLabel, error: errorLabel }[
    status
  ];

  const announcement =
    announce?.[status] ??
    { idle: "", loading: loadingLabel, success: successLabel, error: `${errorLabel}: the last attempt failed` }[
      status
    ];

  return (
    <button
      type="button"
      onClick={handlePress}
      disabled={isLoading}
      aria-busy={isLoading}
      aria-label={currentLabel}
      data-status={status}
      className={`group relative inline-flex h-11 min-w-44 items-center justify-center rounded-md px-4 text-sm font-medium transition-[background-color,transform,box-shadow] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed active:scale-[0.97] ${
        isError
          ? "bg-red-600 text-white hover:bg-red-700"
          : "bg-main text-background hover:brightness-110"
      } ${className}`}
    >
      {/* Decorative, layered content: all four states are always mounted so both the
          outgoing and incoming layer can transition together (crossfade), instead of one
          snapping away the instant the other is ready to appear. */}
      <span aria-hidden="true" className="relative grid h-5 w-full place-items-center">
        <Layer active={status === "idle"}>
          <Icon className="size-4" />
          <span>{idleLabel}</span>
        </Layer>
        <Layer active={isLoading}>
          <Loader2 className="size-4 animate-spin" />
          <span>{loadingLabel}</span>
        </Layer>
        <Layer active={status === "success"} nonce={state.successNonce} pop>
          <Check className="size-4" />
          <span>{successLabel}</span>
        </Layer>
        <Layer active={isError} nonce={state.errorNonce} shake>
          <AlertTriangle className="size-4" />
          <span>{errorLabel}</span>
        </Layer>
      </span>

      {/* Screen readers don't see the crossfade above (it's aria-hidden, and a sighted user
          reads the icon swap just fine) — this is the actual state announcement. */}
      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </button>
  );
}

interface LayerProps {
  active: boolean;
  children: React.ReactNode;
  /** Bumped each time this layer newly becomes active, so its one-shot animation (shake /
   *  pop) can replay via a key change instead of silently no-op'ing on a repeat failure. */
  nonce?: number;
  shake?: boolean;
  pop?: boolean;
}

function Layer({ active, children, nonce = 0, shake, pop }: LayerProps) {
  return (
    <span
      key={shake || pop ? nonce : undefined}
      className={`absolute inset-0 flex items-center justify-center gap-2 transition-[opacity,transform] duration-200 ease-out ${
        active ? "opacity-100" : "pointer-events-none opacity-0"
      } ${active && shake ? "animate-[shake_400ms_ease-in-out]" : ""} ${
        active && pop ? "animate-[pop_300ms_ease-out]" : ""
      } ${active ? "" : "translate-y-1"}`}
    >
      {children}
    </span>
  );
}

/** Demo helper: resolves after a random delay, rejecting ~20% of the time — the brief's own
 *  spec for the trigger wired up on the playground page. Exported so the page and any other
 *  consumer can reuse the exact same fake without duplicating the magic numbers. */
export function fakeAsyncAction(): Promise<void> {
  return new Promise((resolve, reject) => {
    const delayMs = 500 + Math.random() * 1000;
    window.setTimeout(() => {
      if (Math.random() < 0.2) {
        reject(new Error("Simulated failure"));
      } else {
        resolve();
      }
    }, delayMs);
  });
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getReducedMotionSnapshot(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** No `matchMedia` during SSR — assume motion is fine so the server render matches the
 *  client's first paint (same reasoning as src/lib/use-online-status.ts). */
function getReducedMotionServerSnapshot(): boolean {
  return false;
}

/** Tiny hook so the page can show whether the visitor's system has "Reduce motion" on —
 *  purely informational copy; the actual behavior change is handled by the existing
 *  site-wide `prefers-reduced-motion` rule in globals.css (see NOTES.md), not by this hook.
 *  `useSyncExternalStore` instead of `useState` + `useEffect`, matching the pattern already
 *  established by `useOnlineStatus` for the same "subscribe to a mutable platform value"
 *  shape. */
export function usePrefersReducedMotionLabel(): string {
  const reduced = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
  return reduced ? "on (animations are instant below)" : "off";
}
