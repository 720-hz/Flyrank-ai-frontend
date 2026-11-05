import { describe, expect, it } from "vitest";
import {
  MAX_PLAUSIBLE_DURATION_MINUTES,
  computeIncidentSeverity,
  type ScoreIncidentSeverityInput,
} from "./tools";

function input(overrides: Partial<ScoreIncidentSeverityInput> = {}): ScoreIncidentSeverityInput {
  return {
    impactSummary: "Checkout returned 500s.",
    affectedUsersEstimate: "some",
    durationMinutes: 30,
    dataWasLostOrCorrupted: false,
    ...overrides,
  };
}

describe("computeIncidentSeverity", () => {
  it("scores a worst-case incident as SEV1, clamped to 100", () => {
    const result = computeIncidentSeverity(
      input({ affectedUsersEstimate: "all", durationMinutes: 500, dataWasLostOrCorrupted: true }),
    );
    expect(result.level).toBe("SEV1");
    expect(result.score).toBe(100); // 80 + 35 + 25 = 140, clamped
  });

  it("scores a minor, brief, internal-only incident as SEV4", () => {
    const result = computeIncidentSeverity(
      input({ affectedUsersEstimate: "none", durationMinutes: 5, dataWasLostOrCorrupted: false }),
    );
    expect(result.level).toBe("SEV4");
    expect(result.score).toBe(5);
  });

  it("returns one factor per input dimension with a human-readable detail", () => {
    const result = computeIncidentSeverity(input());
    expect(result.factors).toHaveLength(3);
    expect(result.factors.map((f) => f.label)).toEqual(["Affected users", "Duration", "Data integrity"]);
    for (const factor of result.factors) {
      expect(factor.detail.length).toBeGreaterThan(0);
    }
  });

  it("steps duration points up at the 15/60/240 minute boundaries", () => {
    expect(computeIncidentSeverity(input({ durationMinutes: 14 })).factors[1].points).toBe(0);
    expect(computeIncidentSeverity(input({ durationMinutes: 15 })).factors[1].points).toBe(10);
    expect(computeIncidentSeverity(input({ durationMinutes: 59 })).factors[1].points).toBe(10);
    expect(computeIncidentSeverity(input({ durationMinutes: 60 })).factors[1].points).toBe(20);
    expect(computeIncidentSeverity(input({ durationMinutes: 239 })).factors[1].points).toBe(20);
    expect(computeIncidentSeverity(input({ durationMinutes: 240 })).factors[1].points).toBe(35);
  });

  it("gives every severity level a distinct, non-empty recommendation", () => {
    const sev1 = computeIncidentSeverity(input({ affectedUsersEstimate: "all", durationMinutes: 300 }));
    const sev4 = computeIncidentSeverity(input({ affectedUsersEstimate: "none", durationMinutes: 1 }));
    expect(sev1.recommendation).not.toBe(sev4.recommendation);
    expect(sev1.recommendation.length).toBeGreaterThan(0);
  });

  it("throws a specific, actionable error for an implausible duration instead of scoring it", () => {
    expect(() =>
      computeIncidentSeverity(input({ durationMinutes: MAX_PLAUSIBLE_DURATION_MINUTES + 1 })),
    ).toThrow(/implausible/);
  });

  it("accepts a duration right at the plausibility boundary", () => {
    expect(() =>
      computeIncidentSeverity(input({ durationMinutes: MAX_PLAUSIBLE_DURATION_MINUTES })),
    ).not.toThrow();
  });
});
