/**
 * The non-WebGL / reduced-motion fallback (FE-13) — same two triggers, same reasoning, as
 * Agent Core's fallback in FE-11: fully static, no CSS animation either, so a visitor with
 * `prefers-reduced-motion` set gets motion suppressed outright rather than a "softer but still
 * moving" version.
 *
 * `aria-hidden`, not a labelled `role="img"` like Agent Core's fallback: Agent Core *is* the
 * content there (a demo object with its own control panel), but this hero is purely decorative
 * background behind real text content — the headline in `shader-hero.tsx` already carries the
 * page's meaning, so this div has nothing to announce.
 *
 * A static linear gradient through the same four theme colors the real shader's palette walks
 * through (see shader-hero-shader.ts's FRAGMENT_SHADER), so swapping between the two versions
 * changes *motion*, not *brand* — a visitor on either path sees recognizably the same hero.
 */
export function ShaderHeroFallback() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0"
      style={{
        background:
          "linear-gradient(135deg, #2b2e6b 0%, #8a5cf6 35%, #35d0a0 68%, #e0623d 100%)",
      }}
    />
  );
}
