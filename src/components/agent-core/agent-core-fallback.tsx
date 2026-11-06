/**
 * The non-WebGL fallback. Shown for either of two unrelated reasons — `prefers-reduced-motion`
 * is set, or the browser has no WebGL — so it's deliberately fully static (no CSS animation
 * either): a visitor in the first group gets motion suppressed regardless of what's technically
 * still allowed, which is simplest to reason about and avoids a second "is this animation gentle
 * enough" judgment call.
 *
 * Plain radial-gradient + box-shadow standing in for the same "glowing core" shape as the real
 * scene, in the same `aspect-square w-full max-w-sm` footprint the Canvas wrapper uses, so
 * there's no layout shift swapping between them.
 *
 * A single sized element, not a wrapper around a centered child: a `display: flex` element
 * that is *itself* a flex item with `aspect-ratio` set (the wrapper+centered-circle version
 * this replaced) collapses to a 0×0 box in this page's flex-row layout in at least Chromium —
 * confirmed with a real bounding-box check, not just a visual read. Putting the size, radius,
 * and gradient directly on one element sidesteps it entirely.
 */
export function AgentCoreFallback({ color }: { color: string }) {
  return (
    <div
      role="img"
      aria-label="Agent Core — a static preview is shown because motion is reduced or 3D isn't supported on this device"
      className="aspect-square w-full max-w-sm rounded-full"
      style={{
        background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${color} 70%, white), ${color} 60%, color-mix(in srgb, ${color} 70%, black) 100%)`,
        boxShadow: `0 0 60px -10px color-mix(in srgb, ${color} 60%, transparent)`,
      }}
    />
  );
}
