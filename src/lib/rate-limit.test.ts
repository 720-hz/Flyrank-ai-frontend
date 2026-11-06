import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { _resetRateLimitStateForTests, checkRateLimit, getClientIp } from "./rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    _resetRateLimitStateForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests up to the limit within the window", () => {
    const opts = { limit: 3, windowMs: 60_000 };
    expect(checkRateLimit("a", opts).allowed).toBe(true);
    expect(checkRateLimit("a", opts).allowed).toBe(true);
    expect(checkRateLimit("a", opts).allowed).toBe(true);
  });

  it("blocks the request that exceeds the limit, with a retryAfterSeconds", () => {
    const opts = { limit: 2, windowMs: 60_000 };
    checkRateLimit("a", opts);
    checkRateLimit("a", opts);

    const result = checkRateLimit("a", opts);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks separate keys independently", () => {
    const opts = { limit: 1, windowMs: 60_000 };
    expect(checkRateLimit("a", opts).allowed).toBe(true);
    expect(checkRateLimit("b", opts).allowed).toBe(true);
    expect(checkRateLimit("a", opts).allowed).toBe(false);
  });

  it("allows requests again once the window has slid past the old hits", () => {
    const opts = { limit: 1, windowMs: 60_000 };
    expect(checkRateLimit("a", opts).allowed).toBe(true);
    expect(checkRateLimit("a", opts).allowed).toBe(false);

    vi.advanceTimersByTime(60_001);

    expect(checkRateLimit("a", opts).allowed).toBe(true);
  });

  it("only counts hits still inside the sliding window, not the whole history", () => {
    const opts = { limit: 2, windowMs: 10_000 };
    expect(checkRateLimit("a", opts).allowed).toBe(true);
    vi.advanceTimersByTime(11_000); // first hit ages out
    expect(checkRateLimit("a", opts).allowed).toBe(true);
    expect(checkRateLimit("a", opts).allowed).toBe(true);
    expect(checkRateLimit("a", opts).allowed).toBe(false);
  });
});

describe("getClientIp", () => {
  it("reads the first address out of a comma-separated x-forwarded-for chain", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "203.0.113.5, 10.0.0.1" },
    });
    expect(getClientIp(request)).toBe("203.0.113.5");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const request = new Request("http://localhost", { headers: { "x-real-ip": "203.0.113.9" } });
    expect(getClientIp(request)).toBe("203.0.113.9");
  });

  it("falls back to a constant key when neither header is present (e.g. local dev)", () => {
    const request = new Request("http://localhost");
    expect(getClientIp(request)).toBe("unknown");
  });
});
