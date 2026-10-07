"use client";

import {
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  /** Accessible name for the tablist, e.g. "Account settings sections". */
  label: string;
  defaultSelectedId?: string;
}

/**
 * Tabs built from scratch against the W3C APG "Tabs" pattern (automatic activation):
 * https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
 *
 * - role="tablist" / role="tab" / role="tabpanel" with aria-selected/aria-controls/aria-labelledby
 * - roving tabindex: only the selected tab is in the Tab order
 * - ArrowLeft/ArrowRight move and select (wraparound), Home/End jump to first/last
 */
export function Tabs({ items, label, defaultSelectedId }: TabsProps) {
  const generatedId = useId();
  const [selectedId, setSelectedId] = useState(defaultSelectedId ?? items[0]?.id);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function idFor(itemId: string, part: "tab" | "panel"): string {
    return `tabs-${generatedId}-${part}-${itemId}`;
  }

  function selectByIndex(index: number) {
    const item = items[index];
    if (!item) return;
    setSelectedId(item.id);
    tabRefs.current[item.id]?.focus();
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, currentIndex: number) {
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        selectByIndex((currentIndex + 1) % items.length);
        break;
      case "ArrowLeft":
        event.preventDefault();
        selectByIndex((currentIndex - 1 + items.length) % items.length);
        break;
      case "Home":
        event.preventDefault();
        selectByIndex(0);
        break;
      case "End":
        event.preventDefault();
        selectByIndex(items.length - 1);
        break;
      default:
        break;
    }
  }

  return (
    <div>
      <div role="tablist" aria-label={label} className="flex gap-2 border-b border-main/10">
        {items.map((item, index) => {
          const isSelected = item.id === selectedId;
          return (
            <button
              key={item.id}
              ref={(el) => {
                tabRefs.current[item.id] = el;
              }}
              id={idFor(item.id, "tab")}
              role="tab"
              type="button"
              aria-selected={isSelected}
              aria-controls={idFor(item.id, "panel")}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => setSelectedId(item.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                isSelected
                  ? "border-main text-main"
                  : "border-transparent text-text/70 hover:text-text"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item) => {
        const isSelected = item.id === selectedId;
        return (
          <div
            key={item.id}
            id={idFor(item.id, "panel")}
            role="tabpanel"
            aria-labelledby={idFor(item.id, "tab")}
            tabIndex={0}
            hidden={!isSelected}
            className="p-4"
          >
            {item.content}
          </div>
        );
      })}
    </div>
  );
}
