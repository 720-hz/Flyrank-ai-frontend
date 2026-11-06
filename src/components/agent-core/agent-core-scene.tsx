"use client";

import { MeshDistortMaterial } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef, type ElementRef } from "react";
import * as THREE from "three";
import {
  pulseEnvelope,
  PULSE_DURATION_S,
  STATE_PROFILES,
  type CoreShape,
  type CoreState,
} from "./agent-core-state";

export interface AgentCoreSceneProps {
  shape: CoreShape;
  color: string;
  state: CoreState;
  /** Bumped by the parent to trigger a one-shot pulse — a value, not a boolean, so firing the
   *  same pulse twice in a row (two clicks before the first finishes) is still a change. */
  pulseToken: number;
}

function Core({ shape, color, state, pulseToken }: AgentCoreSceneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<ElementRef<typeof MeshDistortMaterial>>(null);
  // A fresh THREE.Color per color change (not a ref mutated during render, which React's
  // rules-of-hooks lint now flags) — `useFrame` always sees the latest closure each render, so
  // this is picked up correctly without needing to be a ref at all.
  const targetColor = useMemo(() => new THREE.Color(color), [color]);

  // Pulse bookkeeping lives in refs, not state: it has to be read and mutated inside the
  // useFrame loop every tick, and a React re-render per tick would defeat the point of driving
  // this off the frame clock in the first place. lastSeenTokenRef lets a render-time change to
  // `pulseToken` (new pulse requested) start a new pulse without needing an effect — the
  // comparison just happens inline on the next frame.
  const lastSeenTokenRef = useRef(pulseToken);
  const pulseElapsedRef = useRef<number | null>(null);

  useFrame((threeState, delta) => {
    const mesh = meshRef.current;
    const material = materialRef.current;
    if (!mesh || !material) return;

    if (pulseToken !== lastSeenTokenRef.current) {
      lastSeenTokenRef.current = pulseToken;
      pulseElapsedRef.current = 0;
    }

    const profile = STATE_PROFILES[state];

    // Ease distort/color toward this state's targets instead of snapping, so switching state
    // mid-animation (e.g. idle -> speaking while still settling from a pulse) reads as one
    // continuous motion rather than a cut.
    material.distort = THREE.MathUtils.lerp(material.distort, profile.distort, 0.06);
    material.color.lerp(targetColor, 0.08);

    mesh.rotation.y += delta * profile.rotateSpeed;

    // Pointer-reactive tilt. `pointer` is R3F's normalized [-1, 1] pointer position and updates
    // from touch as well as mouse, so this is also the mobile interaction — no separate touch
    // handling needed.
    mesh.rotation.x = THREE.MathUtils.lerp(mesh.rotation.x, threeState.pointer.y * 0.25, 0.04);
    mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, -threeState.pointer.x * 0.25, 0.04);

    if (pulseElapsedRef.current !== null) {
      pulseElapsedRef.current += delta;
      const scale = 1 + pulseEnvelope(pulseElapsedRef.current);
      mesh.scale.setScalar(scale);
      if (pulseElapsedRef.current >= PULSE_DURATION_S) pulseElapsedRef.current = null;
    } else {
      mesh.scale.setScalar(THREE.MathUtils.lerp(mesh.scale.x, 1, 0.12));
    }
  });

  return (
    <mesh ref={meshRef}>
      {shape === "icosahedron" ? (
        <icosahedronGeometry args={[1, 3]} />
      ) : (
        <torusKnotGeometry args={[0.68, 0.24, 180, 20]} />
      )}
      <MeshDistortMaterial
        ref={materialRef}
        roughness={0.15}
        metalness={0.35}
        speed={STATE_PROFILES[state].distortSpeed}
      />
    </mesh>
  );
}

/**
 * The actual WebGL scene — isolated in its own module so it can be loaded with `next/dynamic`
 * (`ssr: false`) from agent-core.tsx. That boundary is what keeps "three" and
 * "@react-three/fiber" (several hundred KB combined) out of every bundle except the one for a
 * visitor who's actually going to render WebGL: anyone with `prefers-reduced-motion` set, or
 * without WebGL support, never causes this module to load at all.
 *
 * Deliberately no environment map / HDRI and no orbit controls: lighting is two plain
 * directional lights plus ambient fill (zero extra asset weight), and the camera is fixed —
 * this is a reactive hero, not a product viewer, so letting a visitor drag the camera around
 * while skimming the dashboard would fight the page instead of sitting in it.
 */
export default function AgentCoreScene(props: AgentCoreSceneProps) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: "low-power" }}
      camera={{ position: [0, 0, 3.4], fov: 40 }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[2, 3, 4]} intensity={1.2} />
      <directionalLight position={[-3, -2, -2]} intensity={0.35} color="#8a5cf6" />
      <Core {...props} />
    </Canvas>
  );
}
