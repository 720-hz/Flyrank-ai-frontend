"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function getSnapshot(): boolean {
  return navigator.onLine;
}

/** There's no `navigator` during SSR — assume online so the server render matches the client's first paint. */
function getServerSnapshot(): boolean {
  return true;
}

/**
 * Tracks browser online/offline state (FE-08's proactive handling of the
 * "network failure before send" case — surfaced as a banner and a disabled
 * Send button, rather than waiting for the fetch to fail and showing an
 * error after the fact). `navigator.onLine` is exactly the kind of mutable
 * external value `useSyncExternalStore` exists for, rather than a `useState`
 * synced from a `useEffect`.
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
