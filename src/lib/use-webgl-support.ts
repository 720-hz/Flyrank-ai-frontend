"use client";

import { useSyncExternalStore } from "react";
import { detectWebglSupport } from "./webgl-support";

/** WebGL support can't change during a session, so there's nothing to subscribe to — this is
 *  just a no-op unsubscribe to satisfy useSyncExternalStore's contract. */
function subscribe(): () => void {
  return () => {};
}

function getSnapshot(): boolean {
  return detectWebglSupport();
}

/** No `document` during SSR — assume unsupported so the server render (and the client's first
 *  hydration pass) renders the safe fallback. useSyncExternalStore's documented
 *  hydration-mismatch handling then re-renders with the real client value right after, with no
 *  manual isClient/useEffect bookkeeping needed (same pattern as use-prefers-reduced-motion.ts
 *  and use-online-status.ts). */
function getServerSnapshot(): boolean {
  return false;
}

export function useWebglSupport(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
