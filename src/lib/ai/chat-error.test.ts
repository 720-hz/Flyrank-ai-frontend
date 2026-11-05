import { APICallError } from "ai";
import { describe, expect, it } from "vitest";
import { describeChatError } from "./chat-error";

function apiCallError(overrides: Partial<ConstructorParameters<typeof APICallError>[0]> = {}) {
  return new APICallError({
    message: "fallback message",
    url: "http://localhost/api/agents/pr-reviewer/chat",
    requestBodyValues: {},
    ...overrides,
  });
}

describe("describeChatError", () => {
  it("unwraps the `error` field from our route's JSON error body", () => {
    const error = apiCallError({
      statusCode: 404,
      responseBody: JSON.stringify({ error: "Unknown agent: nonexistent" }),
    });
    expect(describeChatError(error)).toEqual({ message: "Unknown agent: nonexistent", isOffline: false });
  });

  it("falls back to the APICallError's own message when the body isn't our JSON shape", () => {
    const error = apiCallError({ statusCode: 500, responseBody: "<html>502 Bad Gateway</html>" });
    expect(describeChatError(error).message).toBe("fallback message");
  });

  it("falls back to the APICallError's own message when there's no response body", () => {
    const error = apiCallError({ statusCode: 500, responseBody: undefined });
    expect(describeChatError(error).message).toBe("fallback message");
  });

  it("treats a fetch-level TypeError as an offline/connectivity problem", () => {
    const result = describeChatError(new TypeError("Failed to fetch"));
    expect(result.isOffline).toBe(true);
    expect(result.message).toMatch(/offline/i);
  });

  it("recognizes Safari's and Firefox's differently-worded network TypeErrors too", () => {
    expect(describeChatError(new TypeError("Load failed")).isOffline).toBe(true);
    expect(describeChatError(new TypeError("NetworkError when attempting to fetch resource.")).isOffline).toBe(true);
  });

  it("passes a plain Error's message through unchanged (the mid-stream onError path)", () => {
    const error = new Error("50000 minutes (~35 days) is implausible for a single incident.");
    expect(describeChatError(error)).toEqual({
      message: "50000 minutes (~35 days) is implausible for a single incident.",
      isOffline: false,
    });
  });

  it("falls back to a generic message for a non-Error value", () => {
    expect(describeChatError("some non-Error value").message).toBe("Something went wrong. Please try again.");
  });

  it("falls back to a generic message for null/undefined", () => {
    expect(describeChatError(undefined).message).toBe("Something went wrong. Please try again.");
    expect(describeChatError(null).message).toBe("Something went wrong. Please try again.");
  });

  it("falls back to a generic message for an Error with an empty message", () => {
    expect(describeChatError(new Error("")).message).toBe("Something went wrong. Please try again.");
  });
});
