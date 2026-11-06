"use client";

import { shaderMaterial } from "@react-three/drei";
import { Canvas, extend, useFrame, useThree, type ThreeElement } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useTabVisible } from "@/lib/use-tab-visible";
import { FRAGMENT_SHADER, VERTEX_SHADER } from "./shader-hero-shader";

// `shaderMaterial` (drei) wires the uniform defaults + both shader strings into a real
// `THREE.ShaderMaterial` subclass; `extend` registers it on the R3F JSX namespace so it can be
// used below as `<shaderHeroMaterial ... />` like any built-in `<meshStandardMaterial>` would
// be, instead of constructing it imperatively.
const ShaderHeroMaterial = shaderMaterial(
  {
    u_time: 0,
    u_resolution: new THREE.Vector2(1, 1),
    u_mouse: new THREE.Vector2(0.5, 0.5),
  },
  VERTEX_SHADER,
  FRAGMENT_SHADER,
);
extend({ ShaderHeroMaterial });

declare module "@react-three/fiber" {
  interface ThreeElements {
    shaderHeroMaterial: ThreeElement<typeof ShaderHeroMaterial>;
  }
}

function Plane() {
  const materialRef = useRef<InstanceType<typeof ShaderHeroMaterial>>(null);
  // Where the pointer actually is right now (set directly from the DOM event, no React
  // re-render) vs. where the uniform currently sits — `useFrame` eases the latter toward the
  // former each tick. Refs, not state: a value read 60 times a second belongs in a ref for the
  // same reason Agent Core's pulse bookkeeping does (see agent-core-scene.tsx).
  const pointerTarget = useRef(new THREE.Vector2(0.5, 0.5));
  const pointerCurrent = useRef(new THREE.Vector2(0.5, 0.5));
  const clockRef = useRef(0);
  // Not read through a ref: `useFrame`'s callback is a plain closure re-created every render
  // (same reasoning as agent-core-scene.tsx's `targetColor` — see its comment), so it always
  // sees this render's `tabVisible` value without needing one.
  const tabVisible = useTabVisible();

  const { gl, size } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;

    function updateTarget(clientX: number, clientY: number) {
      const rect = canvas.getBoundingClientRect();
      // Normalize to 0..1 within the canvas's own box (not the whole window) — the hero can sit
      // anywhere on the page, and the shader works in its own local UV space regardless. Y is
      // flipped so 0 is the bottom, matching the shader's/vUv's own bottom-up convention.
      pointerTarget.current.set(
        (clientX - rect.left) / rect.width,
        1 - (clientY - rect.top) / rect.height,
      );
    }

    function handlePointerMove(event: PointerEvent) {
      updateTarget(event.clientX, event.clientY);
    }

    canvas.addEventListener("pointermove", handlePointerMove);
    return () => canvas.removeEventListener("pointermove", handlePointerMove);
  }, [gl]);

  useFrame((_state, delta) => {
    const material = materialRef.current;
    if (!material) return;

    // Pause the clock while the tab is hidden (FE-13's "animation pauses when the tab is
    // hidden" requirement) — `delta` simply isn't added to `u_time` on a tick where the tab was
    // hidden, so the shader freezes on whatever frame it was last showing rather than jumping
    // forward once the tab comes back.
    if (tabVisible) {
      clockRef.current += delta;
    }
    material.uniforms.u_time.value = clockRef.current;

    // Resolution in CSS pixels — only the aspect *ratio* matters to the shader's UV correction,
    // which is unaffected by devicePixelRatio, so there's no need to multiply by `gl`'s pixel
    // ratio here.
    material.uniforms.u_resolution.value.set(size.width, size.height);

    // Ease the uniform toward the live pointer target rather than snapping straight to it —
    // this is the "gently leans toward the cursor" behavior the flow field has, not a hard
    // follow.
    pointerCurrent.current.lerp(pointerTarget.current, 0.06);
    material.uniforms.u_mouse.value.copy(pointerCurrent.current);
  });

  return (
    <mesh>
      {/* A 2x2 plane exactly matches the [-1, 1] clip-space square the vertex shader expects —
          see the comment at the top of shader-hero-shader.ts's VERTEX_SHADER. */}
      <planeGeometry args={[2, 2]} />
      <shaderHeroMaterial ref={materialRef} />
    </mesh>
  );
}

/**
 * The actual WebGL scene — isolated in its own module, loaded via `next/dynamic` (`ssr: false`)
 * from `shader-hero.tsx`, same reasoning as Agent Core's split in FE-11: "three" and
 * "@react-three/fiber" never reach a visitor with `prefers-reduced-motion` set or without WebGL,
 * because this module is never imported for them.
 *
 * No camera/lighting setup here at all — deliberately. This isn't a lit 3D object, it's a flat
 * fullscreen shader, so the default R3F camera is left untouched and genuinely unused; the
 * vertex shader bypasses it entirely (see shader-hero-shader.ts).
 */
export default function ShaderHeroScene() {
  return (
    // `dpr={[1, 2]}` is the FE-13 brief's "devicePixelRatio capped" requirement: R3F clamps the
    // actual render resolution to at most 2x CSS pixels regardless of the real device ratio (a
    // 3x phone screen still renders at 2x), which is the standard ceiling for "sharp enough to
    // look native, not so high it burns GPU/battery for no visible gain on a full-bleed
    // fullscreen pass." `powerPreference: "low-power"` mirrors Agent Core's own choice — this
    // is a background decoration, not the point of the page.
    <Canvas dpr={[1, 2]} gl={{ antialias: false, powerPreference: "low-power" }}>
      <Plane />
    </Canvas>
  );
}
