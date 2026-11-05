import { APICallError } from "ai";
import { describe, expect, it } from "vitest";
import { describeProviderError } from "./server-error";

function apiCallError(statusCode: number | undefined) {
  return new APICallError({
    message: "raw provider message",
    url: "http://localhost/api/agents/pr-reviewer/chat",
    requestBodyValues: {},
    statusCode,
  });
}

describe("describeProviderError", () => {
  it("gives a friendly, actionable message for a 429 rate limit", () => {
    const result = describeProviderError(apiCallError(429));
    expect(result).toEqual({
      message: "Claude is receiving a lot of requests right now. Wait a moment and try again.",
      status: 429,
    });
  });

  it("gives a friendly, actionable message for a 503 or 529 overload", () => {
    expect(describeProviderError(apiCallError(503))?.status).toBe(503);
    expect(describeProviderError(apiCallError(529))?.status).toBe(503);
    expect(describeProviderError(apiCallError(529))?.message).toMatch(/overloaded/i);
  });

  it("returns undefined for an unrecognized APICallError status, leaving the caller's fallback in charge", () => {
    expect(describeProviderError(apiCallError(400))).toBeUndefined();
    expect(describeProviderError(apiCallError(undefined))).toBeUndefined();
  });

  it("returns undefined for a plain Error — e.g. the tool's own designed failure message", () => {
    expect(describeProviderError(new Error("60000 minutes is implausible"))).toBeUndefined();
  });

  it("returns undefined for a non-Error value", () => {
    expect(describeProviderError("some non-Error value")).toBeUndefined();
  });
});
