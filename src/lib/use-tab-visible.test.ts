import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useTabVisible } from "./use-tab-visible";

function setVisibilityState(value: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { value, configurable: true });
}

describe("useTabVisible", () => {
  beforeEach(() => {
    setVisibilityState("visible");
  });

  afterEach(() => {
    setVisibilityState("visible");
  });

  it("reflects document.visibilityState once mounted", () => {
    setVisibilityState("hidden");
    const { result } = renderHook(() => useTabVisible());
    expect(result.current).toBe(false);
  });

  it("flips to false when the document fires a visibilitychange to hidden", () => {
    const { result } = renderHook(() => useTabVisible());
    expect(result.current).toBe(true);

    act(() => {
      setVisibilityState("hidden");
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(result.current).toBe(false);
  });

  it("flips back to true when the tab becomes visible again", () => {
    setVisibilityState("hidden");
    const { result } = renderHook(() => useTabVisible());
    expect(result.current).toBe(false);

    act(() => {
      setVisibilityState("visible");
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(result.current).toBe(true);
  });

  it("stops listening after unmount", () => {
    const { result, unmount } = renderHook(() => useTabVisible());
    unmount();

    act(() => {
      setVisibilityState("hidden");
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(result.current).toBe(true);
  });
});
