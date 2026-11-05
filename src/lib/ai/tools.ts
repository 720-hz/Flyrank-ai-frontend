/**
 * Server-side tools the agents can call (FE-07). Kept in their own module, next
 * to `config.ts`, rather than inline in the route handler, so the tool contract
 * (schema + return shape) is one importable thing — the README's "Tool contract"
 * section and the client's rendering code should both be able to point at this
 * file as the source of truth.
 */
import { tool } from "ai";
import { z } from "zod";

export const AFFECTED_USERS_LEVELS = ["none", "some", "most", "all"] as const;
export type AffectedUsersLevel = (typeof AFFECTED_USERS_LEVELS)[number];

/**
 * Small and honest on purpose (see FE-07 mentor tips): every field here is a
 * hallucination surface, so this only asks the model for facts a human would
 * actually know from an incident timeline, not for the severity itself.
 */
export const scoreIncidentSeverityInputSchema = z.object({
  impactSummary: z
    .string()
    .min(1)
    .max(280)
    .describe(
      'One plain-language sentence describing what broke, e.g. "checkout returned 500s for all users".',
    ),
  affectedUsersEstimate: z
    .enum(AFFECTED_USERS_LEVELS)
    .describe(
      'Rough fraction of users who hit the problem. "none" means internal-only / no user-facing impact.',
    ),
  durationMinutes: z
    .number()
    .int()
    .min(0)
    .describe("Minutes from first user-facing impact to resolution."),
  dataWasLostOrCorrupted: z
    .boolean()
    .describe("Whether any user data was lost or corrupted as a result of this incident."),
});

export type ScoreIncidentSeverityInput = z.infer<typeof scoreIncidentSeverityInputSchema>;

export interface SeverityFactor {
  label: string;
  points: number;
  detail: string;
}

export type SeverityLevel = "SEV1" | "SEV2" | "SEV3" | "SEV4";

export interface ScoreIncidentSeverityOutput {
  level: SeverityLevel;
  /** 0-100, higher is worse. */
  score: number;
  factors: SeverityFactor[];
  recommendation: string;
}

const AFFECTED_USERS_POINTS: Record<AffectedUsersLevel, number> = {
  none: 5,
  some: 25,
  most: 55,
  all: 80,
};

const RECOMMENDATIONS: Record<SeverityLevel, string> = {
  SEV1: "Page on-call now, open an incident channel, and prepare a customer-facing status update.",
  SEV2: "Notify the on-call lead and the affected team; track it to resolution before end of shift.",
  SEV3: "File a ticket and fix within the current sprint — no immediate page needed.",
  SEV4: "Log it and move on; keep an eye out in case it recurs or widens.",
};

/**
 * A single incident lasting longer than this is almost certainly a units
 * mistake (seconds entered as minutes, say) rather than a genuine multi-week
 * outage. This is the tool's one deliberate failure mode: schema-valid input
 * that's still nonsense, caught in `execute` rather than in the schema, so a
 * reviewer can trigger a real `output-error` state on purpose.
 */
export const MAX_PLAUSIBLE_DURATION_MINUTES = 20_160; // 14 days

/**
 * Deterministic rubric — same inputs always produce the same severity, no
 * model guessing involved. Exported standalone so it's unit-testable without
 * going through the AI SDK tool wrapper or a live model.
 */
export function computeIncidentSeverity(
  input: ScoreIncidentSeverityInput,
): ScoreIncidentSeverityOutput {
  if (input.durationMinutes > MAX_PLAUSIBLE_DURATION_MINUTES) {
    throw new Error(
      `${input.durationMinutes} minutes (~${Math.round(input.durationMinutes / 1440)} days) is ` +
        "implausible for a single incident. Double-check the timeline for a units mistake " +
        "(e.g. seconds instead of minutes) and try again.",
    );
  }

  const factors: SeverityFactor[] = [];

  factors.push({
    label: "Affected users",
    points: AFFECTED_USERS_POINTS[input.affectedUsersEstimate],
    detail: `Estimated "${input.affectedUsersEstimate}" of users impacted.`,
  });

  let durationPoints: number;
  let durationDetail: string;
  if (input.durationMinutes < 15) {
    durationPoints = 0;
    durationDetail = "Resolved in under 15 minutes.";
  } else if (input.durationMinutes < 60) {
    durationPoints = 10;
    durationDetail = "Resolved in under an hour.";
  } else if (input.durationMinutes < 240) {
    durationPoints = 20;
    durationDetail = "Lasted up to 4 hours.";
  } else {
    durationPoints = 35;
    durationDetail = "Lasted 4+ hours.";
  }
  factors.push({ label: "Duration", points: durationPoints, detail: durationDetail });

  factors.push({
    label: "Data integrity",
    points: input.dataWasLostOrCorrupted ? 25 : 0,
    detail: input.dataWasLostOrCorrupted
      ? "User data was lost or corrupted."
      : "No data loss or corruption reported.",
  });

  const score = Math.min(
    100,
    factors.reduce((sum, factor) => sum + factor.points, 0),
  );

  let level: SeverityLevel;
  if (score >= 80) level = "SEV1";
  else if (score >= 55) level = "SEV2";
  else if (score >= 25) level = "SEV3";
  else level = "SEV4";

  return { level, score, factors, recommendation: RECOMMENDATIONS[level] };
}

/**
 * The tool itself, wired for the AI SDK: Zod schema for input validation +
 * model guidance (via `.describe()`), deterministic `execute`. A thrown Error
 * here becomes the `output-error` tool part's `errorText` on the client (see
 * the route handler's `onError` on `toUIMessageStreamResponse`).
 */
export const scoreIncidentSeverity = tool({
  description:
    "Compute an objective severity score (SEV1-SEV4) for an incident from structured facts " +
    "about its impact. Always call this instead of guessing a severity level yourself.",
  inputSchema: scoreIncidentSeverityInputSchema,
  execute: async (input) => computeIncidentSeverity(input),
});
