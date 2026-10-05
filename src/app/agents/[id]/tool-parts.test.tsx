import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { IncidentSeverityCard, ToolPart } from "./tool-parts";
import type { ConsoleToolPart } from "@/lib/ai/console-ui-message";

type ScoreIncidentSeverityPart = Extract<ConsoleToolPart, { type: "tool-scoreIncidentSeverity" }>;

function basePart(overrides: Partial<ScoreIncidentSeverityPart>): ScoreIncidentSeverityPart {
  return {
    type: "tool-scoreIncidentSeverity",
    toolCallId: "call-1",
    ...overrides,
  } as ScoreIncidentSeverityPart;
}

describe("ToolPart (scoreIncidentSeverity)", () => {
  it("shows placeholders for fields that haven't streamed in yet during input-streaming", () => {
    render(<ToolPart part={basePart({ state: "input-streaming", input: { impactSummary: "Checkout is down" } })} />);
    expect(screen.getByText("Reading incident details…")).toBeInTheDocument();
    expect(screen.getByText("Checkout is down")).toBeInTheDocument();
    // Affected users / duration / data-loss haven't arrived yet — no "Yes"/"No" or number rendered.
    expect(screen.queryByText("Yes")).not.toBeInTheDocument();
    expect(screen.queryByText("No")).not.toBeInTheDocument();
  });

  it("shows the full input once input-available, distinct from the streaming title", () => {
    render(
      <ToolPart
        part={basePart({
          state: "input-available",
          input: {
            impactSummary: "Checkout is down",
            affectedUsersEstimate: "most",
            durationMinutes: 42,
            dataWasLostOrCorrupted: false,
          },
        })}
      />,
    );
    expect(screen.getByText("Scoring severity…")).toBeInTheDocument();
    expect(screen.getByText("Most users")).toBeInTheDocument();
    expect(screen.getByText("42 min")).toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument();
  });

  it("renders output-available as a severity scorecard component, not a JSON dump", () => {
    render(
      <ToolPart
        part={basePart({
          state: "output-available",
          input: {
            impactSummary: "Checkout is down",
            affectedUsersEstimate: "most",
            durationMinutes: 42,
            dataWasLostOrCorrupted: false,
          },
          output: {
            level: "SEV2",
            score: 65,
            factors: [{ label: "Affected users", points: 55, detail: 'Estimated "most" of users impacted.' }],
            recommendation: "Notify the on-call lead.",
          },
        })}
      />,
    );
    expect(screen.getByRole("status", { name: /Incident severity: SEV2, score 65 out of 100/ })).toBeInTheDocument();
    expect(screen.getByText("SEV2")).toBeInTheDocument();
    expect(screen.getByText("Checkout is down")).toBeInTheDocument();
    expect(screen.getByText("Notify the on-call lead.")).toBeInTheDocument();
    // Not a JSON dump: the raw shape of the output shouldn't appear as literal text.
    expect(screen.queryByText(/"level"/)).not.toBeInTheDocument();
  });

  it("renders output-error as a designed error state with the specific message, not a crash", () => {
    render(
      <ToolPart
        part={basePart({
          state: "output-error",
          input: {
            impactSummary: "Checkout is down",
            affectedUsersEstimate: "most",
            durationMinutes: 50000,
            dataWasLostOrCorrupted: false,
          },
          errorText: "50000 minutes (~35 days) is implausible for a single incident.",
        })}
      />,
    );
    expect(screen.getByText("Couldn't score this incident")).toBeInTheDocument();
    expect(screen.getByText(/50000 minutes \(~35 days\) is implausible/)).toBeInTheDocument();
  });
});

describe("IncidentSeverityCard", () => {
  it("colors SEV1 and SEV4 differently", () => {
    const { container: sev1 } = render(
      <IncidentSeverityCard
        input={{}}
        output={{ level: "SEV1", score: 95, factors: [], recommendation: "Page on-call now." }}
      />,
    );
    const { container: sev4 } = render(
      <IncidentSeverityCard
        input={{}}
        output={{ level: "SEV4", score: 10, factors: [], recommendation: "Log it and move on." }}
      />,
    );
    const sev1Badge = sev1.querySelector("span.bg-red-600");
    const sev4Badge = sev4.querySelector("span.bg-emerald-500");
    expect(sev1Badge).not.toBeNull();
    expect(sev4Badge).not.toBeNull();
  });
});
