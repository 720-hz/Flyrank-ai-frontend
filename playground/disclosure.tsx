"use client";

import { useId, useState, type ReactNode } from "react";

export interface DisclosureProps {
  summary: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

/**
 * Disclosure built from scratch against the W3C APG "Disclosure (Show/Hide)" pattern:
 * https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
 *
 * A single button toggles visibility of the content that follows it. No custom keyboard
 * handling is needed beyond what a native <button> already gives you for free (Enter and
 * Space both activate it, and it is a normal Tab stop) — that's deliberate, per the pattern.
 */
export function Disclosure({ summary, children, defaultOpen = false }: DisclosureProps) {
  const generatedId = useId();
  const panelId = `disclosure-${generatedId}-panel`;
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 py-2 text-left text-sm font-medium text-text"
      >
        <span aria-hidden="true" className={`transition-transform ${open ? "rotate-90" : ""}`}>
          ▶
        </span>
        {summary}
      </button>
      <div id={panelId} hidden={!open} className="pb-2 pl-6 text-sm text-text/80">
        {children}
      </div>
    </div>
  );
}
