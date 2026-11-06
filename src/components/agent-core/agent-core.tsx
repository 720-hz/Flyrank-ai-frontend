"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { useWebglSupport } from "@/lib/use-webgl-support";
import { AgentCoreFallback } from "./agent-core-fallback";
import { AgentCorePanel } from "./agent-core-panel";
import { DEFAULT_COLOR, type CoreShape, type CoreState } from "./agent-core-state";

// `ssr: false` is the load-bearing line here: it's what keeps "three" and
// "@react-three/fiber" out of both the server bundle and the initial client bundle. The module
// is only fetched at all once `shouldRender3d` (below) is true on a mounted client — a visitor
// with reduced motion or no WebGL never triggers this import.
const AgentCoreScene = dynamic(() => import("./agent-core-scene"), {
  ssr: false,
  loading: () => <div className="aspect-square w-full max-w-sm animate-pulse rounded-full bg-main/5" />,
});

/**
 * "Agent Core" — a small reactive 3D hero for the console's Dashboard (FE-11). Represents the
 * product's own AI subsystem rather than a generic demo object: its three states (idle /
 * thinking / speaking) echo the same vocabulary `/agents/[id]`'s chat UI already uses for a
 * live agent turn, and "Pulse" stands in for the moment a response actually lands.
 *
 * Decides whether a visitor gets the real WebGL scene or the static fallback — `prefers-
 * reduced-motion` or no WebGL, either one routes to AgentCoreFallback and never loads the
 * dynamic import above. Both checks go through useSyncExternalStore-backed hooks that assume
 * the safe (fallback) answer during SSR and the initial client hydration pass, then React
 * reconciles to the real client value right after — no manual isClient/useEffect bookkeeping,
 * and no hydration-mismatch warning (see use-webgl-support.ts).
 */
export function AgentCore() {
  const webglSupported = useWebglSupport();
  const prefersReducedMotion = usePrefersReducedMotion();

  const [state, setState] = useState<CoreState>("idle");
  const [shape, setShape] = useState<CoreShape>("icosahedron");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [pulseToken, setPulseToken] = useState(0);

  const shouldRender3d = webglSupported && !prefersReducedMotion;

  return (
    // `w-full` here (and on this component's own wrapper in page.tsx) isn't decorative: the
    // Canvas/fallback children below are sized with `w-full max-w-sm` + `aspect-square`, and
    // a percentage width only resolves against a DEFINITE ancestor width — without a `w-full`
    // somewhere up this shrink-to-fit flex chain, both children collapse to a real 0×0 box
    // (confirmed with getBoundingClientRect, not just a visual read; see agent-core-fallback.tsx).
    <div className="flex w-full flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-center">
      {shouldRender3d ? (
        <div className="aspect-square w-full max-w-sm touch-none">
          <AgentCoreScene shape={shape} color={color} state={state} pulseToken={pulseToken} />
        </div>
      ) : (
        <AgentCoreFallback color={color} />
      )}
      <AgentCorePanel
        state={state}
        onStateChange={setState}
        shape={shape}
        onShapeChange={setShape}
        color={color}
        onColorChange={setColor}
        onPulse={() => setPulseToken((token) => token + 1)}
        canAnimate={shouldRender3d}
      />
    </div>
  );
}
