import { beforeEach, describe, expect, it, vi } from "vitest";

const streamTextMock = vi.fn();
const convertToModelMessagesMock = vi.fn();

vi.mock("ai", () => ({
  streamText: (...args: unknown[]) => streamTextMock(...args),
  convertToModelMessages: (...args: unknown[]) => convertToModelMessagesMock(...args),
}));

vi.mock("@/lib/ai/config", () => ({
  chatModel: "mock-model",
  CHAT_GENERATION_SETTINGS: { temperature: 0.4, maxOutputTokens: 1024 },
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
});
