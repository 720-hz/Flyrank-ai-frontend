import { APICallError } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { _resetRateLimitStateForTests } from "@/lib/rate-limit";

const streamTextMock = vi.fn();
const convertToModelMessagesMock = vi.fn();

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return {
    ...actual,
    streamText: (...args: unknown[]) => streamTextMock(...args),
    convertToModelMessages: (...args: unknown[]) => convertToModelMessagesMock(...args),
  };
});

vi.mock("@/lib/ai/config", () => ({
  chatModel: "mock-model",
  CHAT_GENERATION_SETTINGS: { temperature: 0.4, maxOutputTokens: 1024 },
  CHAT_RATE_LIMIT: { limit: 10, windowMs: 60_000 },
  getAgentById: (id: string) => {
    if (id === "pr-reviewer") {
      return { id: "pr-reviewer", name: "PR Reviewer", description: "...", systemPrompt: "You are the PR Reviewer." };
    }
    if (id === "incident-summarizer") {
      return {
        id: "incident-summarizer",
        name: "Incident Summarizer",
        description: "...",
        systemPrompt: "You are the Incident Summarizer.",
      };
    }
    return undefined;
  },
  getAgentTools: (id: string) => (id === "incident-summarizer" ? { "mock-tool": {} } : undefined),
}));

import { POST } from "./route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/agents/pr-reviewer/chat", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/agents/[id]/chat", () => {
  beforeEach(() => {
    streamTextMock.mockReset();
    convertToModelMessagesMock.mockReset();
    convertToModelMessagesMock.mockResolvedValue([{ role: "user", content: "hi" }]);
    // Every request in this file shares the same client key (no x-forwarded-for header set),
    // so without a reset the rate limiter would start 429-ing tests later in the file purely
    // from accumulated call count, not from anything the test itself is checking.
    _resetRateLimitStateForTests();
  });

  it("returns 404 for an unknown agent id", async () => {
    const response = await POST(makeRequest({ messages: [] }), makeParams("nonexistent"));
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toMatch(/nonexistent/);
    expect(streamTextMock).not.toHaveBeenCalled();
  });

  it("returns 400 when the body isn't valid JSON", async () => {
    const request = new Request("http://localhost/api/agents/pr-reviewer/chat", {
      method: "POST",
      body: "not json",
    });
    const response = await POST(request, makeParams("pr-reviewer"));
    expect(response.status).toBe(400);
  });

  it("returns 400 when `messages` is missing or not an array", async () => {
    const response = await POST(makeRequest({ notMessages: true }), makeParams("pr-reviewer"));
    expect(response.status).toBe(400);
    expect(streamTextMock).not.toHaveBeenCalled();
  });

  it("calls streamText with the agent's system prompt and the shared model/settings", async () => {
    const toUIMessageStreamResponse = vi.fn().mockReturnValue(new Response("stream"));
    streamTextMock.mockReturnValue({ toUIMessageStreamResponse });

    const messages = [{ id: "1", role: "user", parts: [{ type: "text", text: "hi" }] }];
    const response = await POST(makeRequest({ messages }), makeParams("pr-reviewer"));

    expect(convertToModelMessagesMock).toHaveBeenCalledWith(messages);
    expect(streamTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "mock-model",
        system: "You are the PR Reviewer.",
        temperature: 0.4,
        maxOutputTokens: 1024,
      }),
    );
    expect(toUIMessageStreamResponse).toHaveBeenCalled();
    expect(response).toBeInstanceOf(Response);
  });

  it("returns a 500 JSON error if streamText throws synchronously (e.g. missing API key)", async () => {
    streamTextMock.mockImplementation(() => {
      throw new Error("Missing ANTHROPIC_API_KEY");
    });

    const messages = [{ id: "1", role: "user", parts: [{ type: "text", text: "hi" }] }];
    const response = await POST(makeRequest({ messages }), makeParams("pr-reviewer"));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });

  it("passes the agent's tools to streamText for an agent that has some, and omits them for one that doesn't", async () => {
    const toUIMessageStreamResponse = vi.fn().mockReturnValue(new Response("stream"));
    streamTextMock.mockReturnValue({ toUIMessageStreamResponse });

    const messages = [{ id: "1", role: "user", parts: [{ type: "text", text: "hi" }] }];

    await POST(makeRequest({ messages }), makeParams("incident-summarizer"));
    expect(streamTextMock).toHaveBeenCalledWith(
      expect.objectContaining({ tools: { "mock-tool": {} } }),
    );

    streamTextMock.mockClear();
    await POST(makeRequest({ messages }), makeParams("pr-reviewer"));
    expect(streamTextMock).toHaveBeenCalledWith(expect.objectContaining({ tools: undefined }));
  });

  it("gives toUIMessageStreamResponse an onError that surfaces a thrown Error's message", async () => {
    const toUIMessageStreamResponse = vi.fn().mockReturnValue(new Response("stream"));
    streamTextMock.mockReturnValue({ toUIMessageStreamResponse });

    const messages = [{ id: "1", role: "user", parts: [{ type: "text", text: "hi" }] }];
    await POST(makeRequest({ messages }), makeParams("pr-reviewer"));

    const { onError } = toUIMessageStreamResponse.mock.calls[0][0] as {
      onError: (error: unknown) => string;
    };
    expect(onError(new Error("60000 minutes is implausible"))).toBe("60000 minutes is implausible");
    expect(onError("some non-Error value")).toBe("An error occurred.");
  });

  it("gives onError a friendly message for a mid-stream rate-limit or overload error (FE-08)", async () => {
    const toUIMessageStreamResponse = vi.fn().mockReturnValue(new Response("stream"));
    streamTextMock.mockReturnValue({ toUIMessageStreamResponse });

    const messages = [{ id: "1", role: "user", parts: [{ type: "text", text: "hi" }] }];
    await POST(makeRequest({ messages }), makeParams("pr-reviewer"));

    const { onError } = toUIMessageStreamResponse.mock.calls[0][0] as {
      onError: (error: unknown) => string;
    };
    const rateLimited = new APICallError({ message: "raw", url: "x", requestBodyValues: {}, statusCode: 429 });
    const overloaded = new APICallError({ message: "raw", url: "x", requestBodyValues: {}, statusCode: 529 });
    expect(onError(rateLimited)).toMatch(/receiving a lot of requests/);
    expect(onError(overloaded)).toMatch(/overloaded/i);
  });

  it("returns the provider's status and a friendly message when streamText throws a rate-limit error synchronously", async () => {
    streamTextMock.mockImplementation(() => {
      throw new APICallError({ message: "raw", url: "x", requestBodyValues: {}, statusCode: 429 });
    });

    const messages = [{ id: "1", role: "user", parts: [{ type: "text", text: "hi" }] }];
    const response = await POST(makeRequest({ messages }), makeParams("pr-reviewer"));

    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error).toMatch(/receiving a lot of requests/);
  });

  describe("rate limiting (FE-14)", () => {
    it("allows requests up to the configured limit, then 429s with a Retry-After header", async () => {
      const toUIMessageStreamResponse = vi.fn().mockReturnValue(new Response("stream"));
      streamTextMock.mockReturnValue({ toUIMessageStreamResponse });
      const messages = [{ id: "1", role: "user", parts: [{ type: "text", text: "hi" }] }];

      for (let i = 0; i < 10; i++) {
        const response = await POST(makeRequest({ messages }), makeParams("pr-reviewer"));
        expect(response.status).not.toBe(429);
      }

      const limited = await POST(makeRequest({ messages }), makeParams("pr-reviewer"));
      expect(limited.status).toBe(429);
      expect(limited.headers.get("Retry-After")).toBeTruthy();
      const body = await limited.json();
      expect(body.error).toMatch(/too many requests/i);
    });

    it("checks the rate limit before parsing the body, so a malformed body on an over-limit request still 429s", async () => {
      const toUIMessageStreamResponse = vi.fn().mockReturnValue(new Response("stream"));
      streamTextMock.mockReturnValue({ toUIMessageStreamResponse });

      for (let i = 0; i < 10; i++) {
        await POST(makeRequest({ messages: [] }), makeParams("pr-reviewer"));
      }

      const request = new Request("http://localhost/api/agents/pr-reviewer/chat", {
        method: "POST",
        body: "not json",
      });
      const response = await POST(request, makeParams("pr-reviewer"));
      expect(response.status).toBe(429);
    });

    it("tracks separate IPs independently via x-forwarded-for", async () => {
      const toUIMessageStreamResponse = vi.fn().mockReturnValue(new Response("stream"));
      streamTextMock.mockReturnValue({ toUIMessageStreamResponse });
      const messages = [{ id: "1", role: "user", parts: [{ type: "text", text: "hi" }] }];

      function makeRequestFromIp(ip: string) {
        return new Request("http://localhost/api/agents/pr-reviewer/chat", {
          method: "POST",
          body: JSON.stringify({ messages }),
          headers: { "x-forwarded-for": ip },
        });
      }

      for (let i = 0; i < 10; i++) {
        await POST(makeRequestFromIp("203.0.113.1"), makeParams("pr-reviewer"));
      }
      const limited = await POST(makeRequestFromIp("203.0.113.1"), makeParams("pr-reviewer"));
      expect(limited.status).toBe(429);

      const otherIp = await POST(makeRequestFromIp("203.0.113.2"), makeParams("pr-reviewer"));
      expect(otherIp.status).not.toBe(429);
    });
  });

  describe("input caps (FE-14)", () => {
    it("rejects a conversation with more than MAX_MESSAGES messages", async () => {
      const tooManyMessages = Array.from({ length: 41 }, (_, i) => ({
        id: String(i),
        role: "user" as const,
        parts: [{ type: "text" as const, text: "hi" }],
      }));

      const response = await POST(makeRequest({ messages: tooManyMessages }), makeParams("pr-reviewer"));
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toMatch(/too long/i);
      expect(streamTextMock).not.toHaveBeenCalled();
    });

    it("rejects a single message over MAX_MESSAGE_CHARS", async () => {
      const messages = [
        { id: "1", role: "user" as const, parts: [{ type: "text" as const, text: "a".repeat(4_001) }] },
      ];

      const response = await POST(makeRequest({ messages }), makeParams("pr-reviewer"));
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toMatch(/too long/i);
      expect(streamTextMock).not.toHaveBeenCalled();
    });

    it("rejects a conversation whose combined text exceeds MAX_TOTAL_CHARS even with no single oversized message", async () => {
      const messages = Array.from({ length: 10 }, (_, i) => ({
        id: String(i),
        role: "user" as const,
        parts: [{ type: "text" as const, text: "a".repeat(2_500) }], // 10 * 2500 = 25,000 > 20,000
      }));

      const response = await POST(makeRequest({ messages }), makeParams("pr-reviewer"));
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toMatch(/too long/i);
      expect(streamTextMock).not.toHaveBeenCalled();
    });

    it("allows a normal-sized conversation through to streamText", async () => {
      const toUIMessageStreamResponse = vi.fn().mockReturnValue(new Response("stream"));
      streamTextMock.mockReturnValue({ toUIMessageStreamResponse });
      const messages = [{ id: "1", role: "user" as const, parts: [{ type: "text" as const, text: "hi" }] }];

      const response = await POST(makeRequest({ messages }), makeParams("pr-reviewer"));
      expect(response.status).toBe(200);
      expect(streamTextMock).toHaveBeenCalled();
    });
  });
});
