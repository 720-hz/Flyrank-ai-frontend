import { afterEach, describe, expect, it, vi } from "vitest";
import { detectWebglSupport } from "./webgl-support";

describe("detectWebglSupport", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns true when getContext resolves a webgl2 context", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({} as RenderingContext);
    expect(detectWebglSupport()).toBe(true);
  });

  it("falls back to a webgl1 context when webgl2 isn't available", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(((type: string) =>
      type === "webgl" ? ({} as RenderingContext) : null) as typeof HTMLCanvasElement.prototype.getContext);
    expect(detectWebglSupport()).toBe(true);
  });

  it("returns false when neither webgl2 nor webgl1 is available", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    expect(detectWebglSupport()).toBe(false);
  });

  it("returns false instead of throwing when getContext itself throws", () => {
    // Some locked-down/headless environments throw rather than returning null — jsdom's own
    // getContext is actually one of them (it throws "not implemented" by default), which is
    // exactly the case this guard exists for.
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => {
      throw new Error("WebGL is disabled");
    });
    expect(detectWebglSupport()).toBe(false);
  });
});
