import type { ReactNode } from "react";
import type { ConsoleToolPart } from "@/lib/ai/console-ui-message";
import type { ScoreIncidentSeverityOutput, SeverityLevel } from "@/lib/ai/tools";

/**
 * Renders one tool-call part as a distinct visual for each of its four
 * lifecycle states (FE-07). The outer shell (rounded card, same corner
 * radius/padding throughout) stays constant across states so a state change
 * reads as a morph rather than a swap; only the inner content re-keys and
 * fades in (`animate-in fade-in duration-200`, the same utility already used
 * for message bubbles elsewhere in this chat).
 */
export function ToolPart({ part }: { part: ConsoleToolPart }) {
  if (part.type === "tool-scoreIncidentSeverity") {
    return <ScoreIncidentSeverityPart part={part} />;
  }

  // Unreachable today (scoreIncidentSeverity is the only tool any agent has) —
  // the `never` type above proves it — but kept so a future second tool fails
  // safe instead of silently rendering nothing.
  const unknownPart = part as { type: string };
  return (
    <ToolCardShell tone="pending" title={`Calling ${unknownPart.type.slice("tool-".length)}…`}>
      <p className="text-xs text-text/60">No renderer registered for this tool yet.</p>
    </ToolCardShell>
  );
}

function ScoreIncidentSeverityPart({
  part,
}: {
  part: Extract<ConsoleToolPart, { type: "tool-scoreIncidentSeverity" }>;
}) {
  switch (part.state) {
    case "input-streaming":
      return (
        <ToolCardShell tone="pending" title="Reading incident details…" pulse>
          <IncidentInputPreview input={part.input} />
        </ToolCardShell>
      );
    case "input-available":
      return (
        <ToolCardShell tone="pending" title="Scoring severity…" pulse>
          <IncidentInputPreview input={part.input} />
        </ToolCardShell>
      );
    case "output-available":
      return <IncidentSeverityCard input={part.input} output={part.output} />;
    case "output-error":
      return (
        <ToolCardShell tone="error" title="Couldn't score this incident">
          <p className="text-sm text-red-700">{part.errorText}</p>
        </ToolCardShell>
      );
    default:
      // approval-requested / approval-responded / output-denied: this tool never
      // requests approval, so these states don't occur in practice.
      return null;
  }
}

const AFFECTED_USERS_COPY: Record<string, string> = {
  none: "None (internal-only)",
  some: "Some users",
  most: "Most users",
  all: "All users",
};

/** Shown for both input-streaming (fields may be missing) and input-available (all present). */
function IncidentInputPreview({
  input,
}: {
  input:
    | {
        impactSummary?: string;
        affectedUsersEstimate?: string;
        durationMinutes?: number;
        dataWasLostOrCorrupted?: boolean;
      }
    | undefined;
}) {
  const rows: Array<[string, ReactNode]> = [
    ["Impact", input?.impactSummary ?? <Placeholder />],
    [
      "Affected users",
      input?.affectedUsersEstimate ? (AFFECTED_USERS_COPY[input.affectedUsersEstimate] ?? input.affectedUsersEstimate) : <Placeholder />,
    ],
    ["Duration", typeof input?.durationMinutes === "number" ? `${input.durationMinutes} min` : <Placeholder />],
    [
      "Data loss",
      typeof input?.dataWasLostOrCorrupted === "boolean" ? (input.dataWasLostOrCorrupted ? "Yes" : "No") : <Placeholder />,
    ],
  ];

  return (
    <dl key={JSON.stringify(input)} className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs animate-in fade-in duration-200">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-text/50">{label}</dt>
          <dd className="truncate text-text/80">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Placeholder() {
  return <span className="inline-block h-3 w-16 animate-pulse rounded bg-main/10 align-middle" />;
}

const TONE_STYLES = {
  pending: "border-main/15 bg-main/[0.03]",
  error: "border-red-200 bg-red-50",
} as const;

function ToolCardShell({
  tone,
  title,
  pulse = false,
  children,
}: {
  tone: keyof typeof TONE_STYLES;
  title: string;
  pulse?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`max-w-[85%] animate-in fade-in slide-in-from-bottom-1 duration-200 rounded-lg border px-3 py-2 ${TONE_STYLES[tone]}`}
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        {tone === "pending" && (
          <span
            className={`size-1.5 rounded-full bg-main/50 ${pulse ? "animate-pulse" : ""}`}
            aria-hidden="true"
          />
        )}
        {tone === "error" && <span className="text-sm leading-none text-red-600">⚠</span>}
        <p className={`text-xs font-medium ${tone === "error" ? "text-red-700" : "text-text/70"}`}>{title}</p>
      </div>
      {children}
    </div>
  );
}

const LEVEL_STYLES: Record<SeverityLevel, { badge: string; bar: string }> = {
  SEV1: { badge: "bg-red-600 text-white", bar: "bg-red-600" },
  SEV2: { badge: "bg-orange-500 text-white", bar: "bg-orange-500" },
  SEV3: { badge: "bg-yellow-400 text-black", bar: "bg-yellow-400" },
  SEV4: { badge: "bg-emerald-500 text-white", bar: "bg-emerald-500" },
};

/**
 * The real, structured rendering of a tool result the FE-07 brief asks for —
 * a severity scorecard, not a JSON dump of `part.output`.
 */
export function IncidentSeverityCard({
  input,
  output,
}: {
  input: { impactSummary?: string };
  output: ScoreIncidentSeverityOutput;
}) {
  const level = LEVEL_STYLES[output.level];

  return (
    <div
      role="status"
      aria-label={`Incident severity: ${output.level}, score ${output.score} out of 100`}
      className="max-w-[85%] animate-in fade-in slide-in-from-bottom-1 duration-200 rounded-lg border border-main/10 bg-background p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${level.badge}`}>{output.level}</span>
        <span className="text-xs text-text/50">{output.score}/100</span>
      </div>

      {input.impactSummary && <p className="mt-2 text-sm text-text">{input.impactSummary}</p>}

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-main/10">
        <div
          className={`h-full rounded-full ${level.bar} transition-[width] duration-300`}
          style={{ width: `${output.score}%` }}
        />
      </div>

      <ul className="mt-3 flex flex-col gap-1">
        {output.factors.map((factor) => (
          <li key={factor.label} className="flex items-baseline justify-between gap-2 text-xs">
            <span className="text-text/60">
              {factor.label} <span className="text-text/40">— {factor.detail}</span>
            </span>
            <span className="shrink-0 font-medium text-text/70">+{factor.points}</span>
          </li>
        ))}
      </ul>

      <p className="mt-3 border-t border-main/10 pt-2 text-xs text-text/70">{output.recommendation}</p>
    </div>
  );
}
