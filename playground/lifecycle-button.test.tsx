import { render, screen, fireEvent, act } from "@testing-library/react";
import { Send } from "lucide-react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LifecycleButton } from "./lifecycle-button";

/** The loading/success/error labels are intentionally shown twice — once in the visible
 *  crossfading layer, once in the sr-only aria-live announcement (see the component's own
 *  comment on why those are separate elements). `getByText` with a CSS selector scopes the
 *  match to the visible span only, so these assertions aren't ambiguous between the two. */
function getVisibleText(text: string) {
  return screen.getByText(text, { selector: "span:not([aria-live])" });
}

/** A promise whose resolve/reject are controlled from the test, instead of the real
 *  randomized fakeAsyncAction — keeps these tests deterministic. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("LifecycleButton", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the idle label and is not disabled", () => {
    render(<LifecycleButton idleLabel="Send message" icon={Send} onPress={() => Promise.resolve()} />);
    const button = screen.getByRole("button");
    expect(button).not.toBeDisabled();
    expect(screen.getByText("Send message")).toBeInTheDocument();
  });

  it("shows the loading state and disables the button while onPress is pending", async () => {
    const { promise } = deferred<void>();
    const onPress = vi.fn(() => promise);
    render(<LifecycleButton idleLabel="Send message" icon={Send} onPress={onPress} />);

    fireEvent.click(screen.getByRole("button"));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
    expect(getVisibleText("Sending…")).toBeInTheDocument();
  });

  it("ignores extra clicks while a request is already in flight (spam-click guard)", () => {
    const { promise } = deferred<void>();
    const onPress = vi.fn(() => promise);
    render(<LifecycleButton idleLabel="Send message" icon={Send} onPress={onPress} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    // Only the first click should have started a request — the button is disabled for the
    // rest, and the handler also guards on status, so this must stay at exactly one call.
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("shows success on resolve, then auto-returns to idle after the hold duration", async () => {
    const { promise, resolve } = deferred<void>();
    const onPress = vi.fn(() => promise);
    render(
      <LifecycleButton
        idleLabel="Send message"
        icon={Send}
        onPress={onPress}
        successHoldMs={1000}
      />,
    );

    fireEvent.click(screen.getByRole("button"));
    await act(async () => {
      resolve();
      await promise;
    });

    expect(getVisibleText("Sent")).toBeInTheDocument();
    expect(screen.getByRole("button")).not.toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText("Send message")).toBeInTheDocument();
  });

  it("shows the error/retry state on reject, and a retry click runs onPress again", async () => {
    const first = deferred<void>();
    const onPress = vi.fn(() => first.promise);
    render(<LifecycleButton idleLabel="Send message" icon={Send} onPress={onPress} />);

    fireEvent.click(screen.getByRole("button"));
    await act(async () => {
      first.reject(new Error("boom"));
      await first.promise.catch(() => {});
    });

    expect(screen.getByText("Retry")).toBeInTheDocument();
    expect(screen.getByRole("button")).not.toBeDisabled();

    const second = deferred<void>();
    onPress.mockReturnValueOnce(second.promise);
    fireEvent.click(screen.getByRole("button"));

    expect(onPress).toHaveBeenCalledTimes(2);
    expect(getVisibleText("Sending…")).toBeInTheDocument();
  });

  it("re-pressing from success cancels the pending auto-reset, so a stale timer can't yank a newer request back to idle", async () => {
    const first = deferred<void>();
    const onPress = vi.fn(() => first.promise);
    render(
      <LifecycleButton
        idleLabel="Send message"
        icon={Send}
        onPress={onPress}
        successHoldMs={1000}
      />,
    );

    fireEvent.click(screen.getByRole("button"));
    await act(async () => {
      first.resolve();
      await first.promise;
    });
    expect(getVisibleText("Sent")).toBeInTheDocument();

    // Re-press partway through the success hold, before the original auto-reset would fire.
    act(() => {
      vi.advanceTimersByTime(300);
    });
    const second = deferred<void>();
    onPress.mockReturnValueOnce(second.promise);
    fireEvent.click(screen.getByRole("button"));
    expect(getVisibleText("Sending…")).toBeInTheDocument();

    // Advance past when the FIRST success's reset timer would have fired (300 + 800 > 1000).
    // If that stale timer weren't cleared, this would incorrectly snap the button back to
    // idle while the second request is still pending.
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(getVisibleText("Sending…")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("announces state changes for screen readers via an aria-live region", async () => {
    const { promise, reject } = deferred<void>();
    const onPress = vi.fn(() => promise);
    render(<LifecycleButton idleLabel="Send message" icon={Send} onPress={onPress} />);

    fireEvent.click(screen.getByRole("button"));
    await act(async () => {
      reject(new Error("boom"));
      await promise.catch(() => {});
    });

    const button = screen.getByRole("button");
    expect(button.querySelector('[aria-live="polite"]')?.textContent).toMatch(/failed/i);
  });

  it("is keyboard-focusable with no explicit tabIndex override (native button semantics)", () => {
    render(<LifecycleButton idleLabel="Send message" icon={Send} onPress={() => Promise.resolve()} />);
    const button = screen.getByRole("button");
    button.focus();
    expect(button).toHaveFocus();
    expect(button).not.toHaveAttribute("tabindex", "-1");
  });

  it("always has a non-empty accessible name, including before it's ever been pressed", async () => {
    // Regression guard for a real bug caught via a live Playwright check (see NOTES.md):
    // the visible label is aria-hidden (so sighted users see one crossfade, not duplicate
    // text), and aria-live only announces *changes* — its idle announcement is empty by
    // design, since nothing has happened yet. Without a separate persistent aria-label, a
    // screen reader user tabbing to this button before ever pressing it would hear nothing.
    const { promise, resolve } = deferred<void>();
    const onPress = vi.fn(() => promise);
    render(<LifecycleButton idleLabel="Send message" icon={Send} onPress={onPress} />);
    const button = screen.getByRole("button", { name: "Send message" });
    expect(button).toHaveAccessibleName("Send message");

    fireEvent.click(button);
    expect(button).toHaveAccessibleName("Sending…");

    await act(async () => {
      resolve();
      await promise;
    });
    expect(button).toHaveAccessibleName("Sent");
  });

  it("never carries a base outline-none class that would neutralize the focus-visible ring", () => {
    // Regression guard for a real Tailwind v4 gotcha caught via a live Playwright check (see
    // NOTES.md): Tailwind's outline utilities share one `--tw-outline-style` custom property.
    // `.outline-none` sets it to "none" UNCONDITIONALLY (not scoped to any pseudo-class), and
    // because CSS custom properties resolve from the live cascade, that "none" was still in
    // effect even while `:focus-visible` matched — so `focus-visible:outline-2` rendered a
    // zero-style (invisible) outline no matter how correct its width/color looked. The fix
    // was to drop the base `outline-none` class entirely rather than add more outline-*
    // variants on top of it. jsdom doesn't compute real `:focus-visible` styling, so this
    // guards the mechanism (no competing `outline-none`) rather than the computed CSS itself
    // — the computed-style assertion lives in the live Playwright check documented in NOTES.md.
    render(<LifecycleButton idleLabel="Send message" icon={Send} onPress={() => Promise.resolve()} />);
    const button = screen.getByRole("button");
    expect(button.className).not.toMatch(/(?:^|\s)outline-none(?:\s|$)/);
    expect(button.className).toMatch(/(?:^|\s)focus-visible:outline-2(?:\s|$)/);
  });
});
