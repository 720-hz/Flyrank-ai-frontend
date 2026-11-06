"use client";

import {
  COLOR_PRESETS,
  CORE_SHAPES,
  CORE_STATES,
  SHAPE_LABELS,
  STATE_LABELS,
  type CoreShape,
  type CoreState,
} from "./agent-core-state";

export interface AgentCorePanelProps {
  state: CoreState;
  onStateChange: (state: CoreState) => void;
  shape: CoreShape;
  onShapeChange: (shape: CoreShape) => void;
  color: string;
  onColorChange: (color: string) => void;
  onPulse: () => void;
  /** The real scene is unmounted (fallback/reduced-motion/no-WebGL) — material/shape controls
   *  still work (they drive the fallback's color too), but a one-shot animation trigger has
   *  nothing to animate, so Pulse is hidden rather than shown disabled-and-unexplained. */
  canAnimate: boolean;
}

/**
 * A small custom control panel, not Leva — this page already has its own design system
 * (Tailwind tokens in globals.css, the fieldset/legend radio-group pattern established in
 * SettingsForm), and Leva's own floating panel UI would be a visually foreign element sitting
 * on top of it. The trade-off is real: Leva would have taken a fraction of the code below.
 */
export function AgentCorePanel({
  state,
  onStateChange,
  shape,
  onShapeChange,
  color,
  onColorChange,
  onPulse,
  canAnimate,
}: AgentCorePanelProps) {
  return (
    <div className="flex w-full max-w-xs flex-col gap-4 rounded-lg border border-main/10 bg-background p-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-text">Agent state</legend>
        <div className="flex gap-2">
          {CORE_STATES.map((option) => (
            <label
              key={option}
              htmlFor={`core-state-${option}`}
              // has-[:focus-visible]: this label's radio input is sr-only, so the browser's
              // native focus ring (which SettingsForm's theme-preference radios get for free,
              // being plain visible inputs) lands on a 1px invisible element — silent for a
              // keyboard user. Forwarding focus-visible to the visible label is what makes tab
              // order followable here at all (caught in the FE-12 keyboard-only pass).
              className="flex-1 cursor-pointer rounded-md border border-main/15 px-2 py-1.5 text-center text-xs font-medium text-text/80 transition-colors has-checked:border-main has-checked:bg-main has-checked:text-background has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-main"
            >
              <input
                id={`core-state-${option}`}
                type="radio"
                name="core-state"
                value={option}
                checked={state === option}
                onChange={() => onStateChange(option)}
                className="sr-only"
              />
              {STATE_LABELS[option]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-text">Core shape</legend>
        <div className="flex gap-2">
          {CORE_SHAPES.map((option) => (
            <label
              key={option}
              htmlFor={`core-shape-${option}`}
              // has-[:focus-visible]: see the matching comment on the Agent state radios above.
              className="flex-1 cursor-pointer rounded-md border border-main/15 px-2 py-1.5 text-center text-xs font-medium text-text/80 transition-colors has-checked:border-main has-checked:bg-main has-checked:text-background has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-main"
            >
              <input
                id={`core-shape-${option}`}
                type="radio"
                name="core-shape"
                value={option}
                checked={shape === option}
                onChange={() => onShapeChange(option)}
                className="sr-only"
              />
              {SHAPE_LABELS[option]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-text">Core color</legend>
        <div className="flex gap-3">
          {COLOR_PRESETS.map((preset) => (
            <label
              key={preset.value}
              htmlFor={`core-color-${preset.value}`}
              // has-[:focus-visible]: see the comment on the Agent state radios above — same
              // sr-only-input-plus-styled-sibling pattern, same fix.
              className="cursor-pointer rounded-full has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-main"
            >
              <input
                id={`core-color-${preset.value}`}
                type="radio"
                name="core-color"
                value={preset.value}
                checked={color === preset.value}
                onChange={() => onColorChange(preset.value)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className="block size-7 rounded-full ring-offset-2 ring-offset-background transition-shadow"
                style={{
                  backgroundColor: preset.value,
                  boxShadow: color === preset.value ? `0 0 0 2px var(--color-background), 0 0 0 4px ${preset.value}` : undefined,
                }}
              />
              <span className="sr-only">{preset.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {canAnimate && (
        <button
          type="button"
          onClick={onPulse}
          className="rounded-md bg-main px-3 py-2 text-sm font-medium text-background transition-colors hover:brightness-110"
        >
          Pulse
        </button>
      )}
    </div>
  );
}
