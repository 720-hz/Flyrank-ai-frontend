import { describe, expect, it } from "vitest";
import {
  CORE_SHAPES,
  CORE_STATES,
  COLOR_PRESETS,
  PULSE_DURATION_S,
  PULSE_MAGNITUDE,
  SHAPE_LABELS,
  STATE_LABELS,
  STATE_PROFILES,
  pulseEnvelope,
} from "./agent-core-state";

describe("agent-core-state data", () => {
  it("has a profile and a label for every declared state, no more and no less", () => {
    for (const state of CORE_STATES) {
      expect(STATE_PROFILES[state]).toBeDefined();
      expect(STATE_LABELS[state]).toBeDefined();
    }
    expect(Object.keys(STATE_PROFILES)).toHaveLength(CORE_STATES.length);
  });

  it("has a label for every declared shape", () => {
    for (const shape of CORE_SHAPES) {
      expect(SHAPE_LABELS[shape]).toBeDefined();
    }
  });

  it("ramps up rotate speed, distort, and distort speed from idle through thinking to speaking", () => {
    // Not an arbitrary ordering check — "speaking" reading as calmer than "idle" would be a
    // real regression in the one thing this data file exists to get right.
    expect(STATE_PROFILES.idle.rotateSpeed).toBeLessThan(STATE_PROFILES.thinking.rotateSpeed);
    expect(STATE_PROFILES.thinking.rotateSpeed).toBeLessThan(STATE_PROFILES.speaking.rotateSpeed);
    expect(STATE_PROFILES.idle.distort).toBeLessThan(STATE_PROFILES.speaking.distort);
    expect(STATE_PROFILES.idle.distortSpeed).toBeLessThan(STATE_PROFILES.speaking.distortSpeed);
  });

  it("every color preset is a valid hex color", () => {
    for (const preset of COLOR_PRESETS) {
      expect(preset.value).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe("pulseEnvelope", () => {
  it("is zero at the exact start and at/after the pulse duration", () => {
    expect(pulseEnvelope(0)).toBe(0);
    expect(pulseEnvelope(PULSE_DURATION_S)).toBe(0);
    expect(pulseEnvelope(PULSE_DURATION_S + 1)).toBe(0);
  });

  it("is zero before the pulse starts (a stale/negative elapsed time)", () => {
    expect(pulseEnvelope(-0.1)).toBe(0);
  });

  it("peaks at PULSE_MAGNITUDE at the midpoint, and nowhere exceeds it", () => {
    const midpoint = pulseEnvelope(PULSE_DURATION_S / 2);
    expect(midpoint).toBeCloseTo(PULSE_MAGNITUDE, 5);

    for (let t = 0; t <= PULSE_DURATION_S; t += PULSE_DURATION_S / 100) {
      expect(pulseEnvelope(t)).toBeLessThanOrEqual(PULSE_MAGNITUDE + 1e-9);
    }
  });

  it("is never negative across the full duration (a one-directional bump, not an oscillation)", () => {
    for (let t = 0; t <= PULSE_DURATION_S; t += PULSE_DURATION_S / 100) {
      expect(pulseEnvelope(t)).toBeGreaterThanOrEqual(0);
    }
  });
});
