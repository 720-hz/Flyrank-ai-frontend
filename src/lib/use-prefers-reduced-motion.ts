"use client";

import { useSyncExternalStore } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** No `matchMedia` during SSR — assume motion is fine so the server render matches the
 *  client's first paint (same reasoning as use-online-status.ts and lifecycle-button.tsx's
 *  own copy of this check). */
function getServerSnapshot(): boolean {
  return false;
}

/**
 * Tracks the "Reduce motion" system setting. Used by AgentCore (FE-11) to decide whether to
 * mount the WebGL scene at all, not just to soften an existing animation — a self-animating
 * requestAnimationFrame loop like a `useFrame` render loop isn't something the site-wide CSS
 * `prefers-reduced-motion` rule in globals.css can reach (that rule only clamps CSS
 * transitions/animations), so this is a real behavioral branch, not a styling one.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
