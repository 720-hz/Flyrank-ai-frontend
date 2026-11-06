/**
 * Shared, framework-agnostic data for the Agent Core 3D hero (FE-11). Kept separate from both
 * the R3F scene and the control panel so the state/shape/color vocabulary — and the one
 * nontrivial bit of logic here, the pulse envelope — can be unit-tested directly, without
 * touching React or WebGL at all (jsdom can't give us a real WebGL context, so none of this
 * module may import "three" or "@react-three/fiber").
 */

export type CoreState = "idle" | "thinking" | "speaking";
export type CoreShape = "icosahedron" | "torusKnot";

export interface StateProfile {
  /** Radians/second the core spins at its base rate, before the pointer-tilt is layered on. */
  rotateSpeed: number;
  /** Target `distort` factor on the MeshDistortMaterial — how gnarled the surface gets. */
  distort: number;
  /** Target `speed` on the MeshDistortMaterial — how fast the distortion noise animates. */
  distortSpeed: number;
}

export const CORE_STATES: readonly CoreState[] = ["idle", "thinking", "speaking"];

export const STATE_PROFILES: Record<CoreState, StateProfile> = {
  idle: { rotateSpeed: 0.08, distort: 0.22, distortSpeed: 0.6 },
  thinking: { rotateSpeed: 0.22, distort: 0.42, distortSpeed: 1.8 },
  speaking: { rotateSpeed: 0.4, distort: 0.58, distortSpeed: 3.4 },
};

export const STATE_LABELS: Record<CoreState, string> = {
  idle: "Idle",
  thinking: "Thinking",
  speaking: "Speaking",
};

export const CORE_SHAPES: readonly CoreShape[] = ["icosahedron", "torusKnot"];

export const SHAPE_LABELS: Record<CoreShape, string> = {
  icosahedron: "Icosahedron",
  torusKnot: "Torus knot",
};

export interface ColorPreset {
  label: string;
  value: string;
}

/** Drawn from the app's own theme tokens (globals.css's --color-main/--color-accent) plus two
 *  additions, rather than arbitrary swatches, so every preset already belongs on this page. */
export const COLOR_PRESETS: readonly ColorPreset[] = [
  { label: "Main", value: "#2b2e6b" },
  { label: "Accent", value: "#35d0a0" },
  { label: "Ember", value: "#e0623d" },
  { label: "Violet", value: "#8a5cf6" },
];

export const DEFAULT_COLOR = COLOR_PRESETS[1].value; // Accent — matches the brand's one "alive" color.

/** How long a triggered pulse lasts, in seconds. */
export const PULSE_DURATION_S = 0.6;
/** How large the one-shot scale bump gets at its peak (1 + this). */
export const PULSE_MAGNITUDE = 0.35;

/**
 * The scale multiplier for a pulse at `elapsed` seconds since it was triggered — a single
 * half-sine bump that starts and ends at 0 (no snap at either edge) and peaks at
 * `PULSE_MAGNITUDE` at the midpoint. Returns 0 once the pulse has finished.
 *
 * Pulled out of the R3F component specifically so it's testable as plain arithmetic — the
 * frame loop just calls this every tick with however much time has elapsed.
 */
export function pulseEnvelope(elapsedSeconds: number): number {
  if (elapsedSeconds < 0 || elapsedSeconds >= PULSE_DURATION_S) return 0;
  return Math.sin((elapsedSeconds / PULSE_DURATION_S) * Math.PI) * PULSE_MAGNITUDE;
}
