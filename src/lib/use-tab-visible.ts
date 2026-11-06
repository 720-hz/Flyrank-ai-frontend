"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void): () => void {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

function getSnapshot(): boolean {
  return document.visibilityState === "visible";
}

/** No `document.visibilityState` during SSR — assume visible so the server render (and the
 *  client's first paint, which is definitionally visible — the tab can't be hidden before it's
 *  painted) matches, same reasoning as this file's sibling hooks. */
function getServerSnapshot(): boolean {
  return true;
}

/**
 * Tracks the Page Visibility API's `document.visibilityState` (FE-13's "pauses when the tab is
 * hidden" requirement for the shader hero's `useFrame` loop). Browsers already throttle or
 * fully suspend `requestAnimationFrame` callbacks in a backgrounded tab on their own, but that's
 * implicit engine behavior, not something this codebase controls or can point to — this hook
 * makes the pause an explicit, inspectable, testable branch in `shader-hero-scene.tsx` instead
 * of relying on that behavior silently doing the right thing.
 */
export function useTabVisible(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
