"use client";

import dynamic from "next/dynamic";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { useWebglSupport } from "@/lib/use-webgl-support";
import { ShaderHeroFallback } from "./shader-hero-fallback";

// `ssr: false` keeps "three" and "@react-three/fiber" out of both the server bundle and the
// initial client bundle, same load-bearing reasoning as Agent Core's own dynamic import
// (agent-core.tsx, FE-11): the module is only fetched once `shouldRenderShader` below is true
// on a mounted client, so a visitor with reduced motion or no WebGL never triggers it at all.
const ShaderHeroScene = dynamic(() => import("./shader-hero-scene"), {
  ssr: false,
  loading: () => <ShaderHeroFallback />,
});

/**
 * The shader hero's background layer (FE-13) — a custom GLSL fragment shader (see
 * shader-hero-shader.ts) rendered fullscreen behind whatever real content a page stacks on top
 * of it. This component only renders the background; it always fills its nearest positioned
 * ancestor via `absolute inset-0`, so a page using it supplies `relative` on the wrapper and
 * `relative z-10` on its own foreground content (see `src/app/about/page.tsx`).
 *
 * Same WebGL-support / reduced-motion gating as Agent Core, reusing the same two hooks: both
 * assume the safe fallback answer during SSR and the client's first paint, then React
 * reconciles to the real value right after (see use-webgl-support.ts) — no hydration-mismatch
 * warning, no manual isClient bookkeeping.
 */
export function ShaderHero() {
  const webglSupported = useWebglSupport();
  const prefersReducedMotion = usePrefersReducedMotion();

  const shouldRenderShader = webglSupported && !prefersReducedMotion;

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {shouldRenderShader ? <ShaderHeroScene /> : <ShaderHeroFallback />}
    </div>
  );
}
