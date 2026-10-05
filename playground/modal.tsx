"use client";

import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Pass a stable id if the heading already has one; otherwise one is generated. */
  titleId?: string;
}

/**
 * Modal dialog built from scratch against the W3C APG "Dialog (Modal)" pattern:
 * https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
 *
 * - role="dialog" aria-modal="true" aria-labelledby
 * - focus moves into the dialog on open, is trapped inside it (Tab/Shift+Tab cycle),
 *   and returns to the triggering element on close
 * - Escape closes the dialog
 * - background scroll is suppressed while open
 */
export function Modal({ open, onClose, title, children, titleId }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);
  const generatedId = useId();
  const headingId = titleId ?? `modal-title-${generatedId}`;

  useEffect(() => {
    if (!open) return;

    previouslyFocusedElement.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    dialogRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocusedElement.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  function getFocusableElements(): HTMLElement[] {
    if (!dialogRef.current) return [];
    return Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }

    if (event.key !== "Tab") return;

    const focusable = getFocusableElements();
    if (focusable.length === 0) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey) {
      if (active === first || active === dialogRef.current) {
        event.preventDefault();
        last.focus();
      }
    } else {
      if (active === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-text/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="relative z-10 w-full max-w-md rounded-lg bg-background p-6 shadow-xl outline-none"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={headingId} className="text-lg font-semibold text-text">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded px-2 py-1 text-sm text-text/70 hover:bg-main/10 hover:text-text"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
