import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { APICallError, type UIMessage } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentChat, type AgentChatProps } from "./agent-chat";

const useChatMock = vi.fn();

vi.mock("@ai-sdk/react", () => ({
  useChat: (...args: unknown[]) => useChatMock(...args),
}));

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return {
    ...actual,
    DefaultChatTransport: class {
      constructor(public options: unknown) {}
    },
  };
});

vi.mock("streamdown", () => ({
  Streamdown: ({ children }: { children: string }) => <div data-testid="streamdown">{children}</div>,
}));

function textMessage(id: string, role: "user" | "assistant", text: string): UIMessage {
  return { id, role, parts: text ? [{ type: "text", text }] : [] };
}

function toolMessage(id: string, part: Record<string, unknown>): UIMessage {
  return {
    id,
    role: "assistant",
    parts: [
      { type: "tool-scoreIncidentSeverity", toolCallId: "call-1", ...part } as unknown as UIMessage["parts"][number],
    ],
  };
}

const DEFAULT_EXAMPLE_PROMPTS: [string, string] = ["Example prompt one", "Example prompt two"];

function renderAgentChat(props: Partial<AgentChatProps> = {}) {
  return render(
    <AgentChat
      agentId={props.agentId ?? "pr-reviewer"}
      agentName={props.agentName ?? "PR Reviewer"}
      examplePrompts={props.examplePrompts ?? DEFAULT_EXAMPLE_PROMPTS}
    />,
  );
}

const sendMessage = vi.fn();
const stop = vi.fn();
const regenerate = vi.fn();

function mockChat(overrides: Partial<ReturnType<typeof useChatMock>>) {
  useChatMock.mockReturnValue({
    messages: [],
    sendMessage,
    stop,
    regenerate,
    status: "ready",
    error: undefined,
    ...overrides,
  });
}

beforeEach(() => {
  sendMessage.mockReset();
  stop.mockReset();
  regenerate.mockReset();
  useChatMock.mockReset();
});

afterEach(() => {
  Object.defineProperty(navigator, "onLine", { value: true, configurable: true, writable: true });
});

describe("AgentChat", () => {
  it("shows an empty-state prompt before any messages", () => {
    mockChat({ messages: [] });
    renderAgentChat();
    expect(screen.getByText(/Send a message to start a conversation with PR Reviewer/)).toBeInTheDocument();
  });

  it("fills the input with an example prompt when clicked, without sending it", async () => {
    const user = userEvent.setup();
    mockChat({ messages: [] });
    renderAgentChat();

    await user.click(screen.getByRole("button", { name: DEFAULT_EXAMPLE_PROMPTS[0] }));

    expect(screen.getByRole("textbox", { name: "Message PR Reviewer" })).toHaveValue(DEFAULT_EXAMPLE_PROMPTS[0]);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("shows the thinking indicator while the request is submitted, before any assistant message exists", () => {
    mockChat({ messages: [textMessage("u1", "user", "hi")], status: "submitted" });
    renderAgentChat();
    expect(screen.getByRole("status", { name: "PR Reviewer is thinking" })).toBeInTheDocument();
  });

  it("keeps the thinking indicator while streaming has started but no text has arrived yet", () => {
    mockChat({
      messages: [textMessage("u1", "user", "hi"), textMessage("a1", "assistant", "")],
      status: "streaming",
    });
    renderAgentChat();
    expect(screen.getByRole("status", { name: "PR Reviewer is thinking" })).toBeInTheDocument();
  });

  it("hands off from the indicator to rendered text once the first token arrives", () => {
    mockChat({
      messages: [textMessage("u1", "user", "hi"), textMessage("a1", "assistant", "Looks good")],
      status: "streaming",
    });
    renderAgentChat();
    expect(screen.queryByRole("status", { name: "PR Reviewer is thinking" })).not.toBeInTheDocument();
    expect(screen.getByTestId("streamdown")).toHaveTextContent("Looks good");
  });

  it("announces the completed reply to screen readers once the turn is ready", () => {
    mockChat({
      messages: [textMessage("u1", "user", "hi"), textMessage("a1", "assistant", "Looks good to me")],
      status: "ready",
    });
    renderAgentChat();
    expect(screen.getByTestId("announced-reply")).toHaveTextContent("Looks good to me");
  });

  it("does not announce the in-progress reply while still streaming (FE-12: avoid re-reading the live region on every chunk)", () => {
    mockChat({
      messages: [textMessage("u1", "user", "hi"), textMessage("a1", "assistant", "partial a")],
      status: "streaming",
    });
    renderAgentChat();
    expect(screen.getByTestId("announced-reply")).toHaveTextContent("");
  });

  it("renders user messages as plain text, not through the markdown renderer", () => {
    mockChat({ messages: [textMessage("u1", "user", "**not markdown**")], status: "ready" });
    renderAgentChat();
    expect(screen.getByText("**not markdown**")).toBeInTheDocument();
    expect(screen.queryByTestId("streamdown")).not.toBeInTheDocument();
  });

  it("shows Stop instead of Send while busy, and clicking it calls stop()", async () => {
    const user = userEvent.setup();
    mockChat({
      messages: [textMessage("u1", "user", "hi"), textMessage("a1", "assistant", "partial answer")],
      status: "streaming",
    });
    renderAgentChat();

    expect(screen.queryByRole("button", { name: "Send" })).not.toBeInTheDocument();
    const stopButton = screen.getByRole("button", { name: "Stop" });
    await user.click(stopButton);
    expect(stop).toHaveBeenCalledTimes(1);

    // The partial assistant content stays visible — stopping must not drop it.
    expect(screen.getByText("partial answer")).toBeInTheDocument();
  });

  it("disables the input while busy and re-enables it once ready", () => {
    mockChat({ messages: [], status: "streaming" });
    const { rerender } = renderAgentChat();
    expect(screen.getByRole("textbox", { name: "Message PR Reviewer" })).toBeDisabled();

    mockChat({ messages: [], status: "ready" });
    rerender(
      <AgentChat agentId="pr-reviewer" agentName="PR Reviewer" examplePrompts={DEFAULT_EXAMPLE_PROMPTS} />,
    );
    expect(screen.getByRole("textbox", { name: "Message PR Reviewer" })).toBeEnabled();
  });

  it("sends the typed message and clears the input, and a second send works after that", async () => {
    const user = userEvent.setup();
    mockChat({ messages: [], status: "ready" });
    renderAgentChat();

    const textarea = screen.getByRole("textbox", { name: "Message PR Reviewer" });
    await user.type(textarea, "first question");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(sendMessage).toHaveBeenCalledWith({ text: "first question" });
    expect(textarea).toHaveValue("");

    // Stopping and sending again must keep working — the first thing a reviewer tries.
    await user.type(textarea, "second question");
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(sendMessage).toHaveBeenCalledWith({ text: "second question" });
    expect(sendMessage).toHaveBeenCalledTimes(2);
  });

  it("does not send an empty or whitespace-only message", async () => {
    const user = userEvent.setup();
    mockChat({ messages: [], status: "ready" });
    renderAgentChat();

    const sendButton = screen.getByRole("button", { name: "Send" });
    expect(sendButton).toBeDisabled();

    const textarea = screen.getByRole("textbox", { name: "Message PR Reviewer" });
    await user.type(textarea, "   ");
    expect(sendButton).toBeDisabled();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("sends on Enter and inserts a newline on Shift+Enter instead of sending", async () => {
    const user = userEvent.setup();
    mockChat({ messages: [], status: "ready" });
    renderAgentChat();

    const textarea = screen.getByRole("textbox", { name: "Message PR Reviewer" });
    await user.type(textarea, "line one");
    await user.keyboard("{Shift>}{Enter}{/Shift}");
    expect(sendMessage).not.toHaveBeenCalled();
    expect(textarea).toHaveValue("line one\n");

    await user.type(textarea, "line two");
    await user.keyboard("{Enter}");
    expect(sendMessage).toHaveBeenCalledWith({ text: "line one\nline two" });
  });

  it("shows an error message and re-enables input after a failed turn", () => {
    mockChat({
      messages: [textMessage("u1", "user", "hi")],
      status: "error",
      error: new Error("The agent failed to respond. Please try again."),
    });
    renderAgentChat();

    expect(screen.getByRole("alert")).toHaveTextContent("The agent failed to respond. Please try again.");
    expect(screen.getByRole("textbox", { name: "Message PR Reviewer" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
  });

  it("shows a designed error card with a working Retry for a mid-stream failure, and retries only the last message", async () => {
    const user = userEvent.setup();
    mockChat({
      messages: [textMessage("u1", "user", "Checkout was down for an hour")],
      status: "error",
      error: new Error("Claude is temporarily overloaded. Wait a moment and try again."),
    });
    renderAgentChat({ agentId: "incident-summarizer", agentName: "Incident Summarizer" });

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Claude is temporarily overloaded. Wait a moment and try again.");

    const retryButton = screen.getByRole("button", { name: "Retry sending your last message" });
    await user.click(retryButton);

    expect(regenerate).toHaveBeenCalledTimes(1);
    expect(regenerate).toHaveBeenCalledWith();
  });

  it("ignores a second Retry click while the first retry is still in flight", () => {
    mockChat({
      messages: [textMessage("u1", "user", "hi")],
      status: "error",
      error: new Error("Something went wrong. Please try again."),
    });
    renderAgentChat();

    const retryButton = screen.getByRole("button", { name: "Retry sending your last message" });
    fireEvent.click(retryButton);
    fireEvent.click(retryButton);

    expect(regenerate).toHaveBeenCalledTimes(1);
  });

  it("unwraps a raw JSON error body from the server into a clean retry-card message", () => {
    const apiError = new APICallError({
      message: '{"error":"Unknown agent: nonexistent"}',
      url: "/api/agents/nonexistent/chat",
      requestBodyValues: {},
      statusCode: 404,
      responseBody: '{"error":"Unknown agent: nonexistent"}',
    });

    mockChat({ messages: [textMessage("u1", "user", "hi")], status: "error", error: apiError });
    renderAgentChat();

    expect(screen.getByRole("alert")).toHaveTextContent("Unknown agent: nonexistent");
    expect(screen.queryByText(/"error":/)).not.toBeInTheDocument();
  });

  it("renders a tool part's severity card alongside the message list", () => {
    mockChat({
      messages: [
        textMessage("u1", "user", "Checkout was down for everyone for an hour"),
        toolMessage("a1", {
          state: "output-available",
          input: { impactSummary: "Checkout was down for everyone for an hour" },
          output: {
            level: "SEV2",
            score: 65,
            factors: [{ label: "Affected users", points: 55, detail: 'Estimated "most" of users impacted.' }],
            recommendation: "Notify the on-call lead.",
          },
        }),
      ],
      status: "ready",
    });
    renderAgentChat({ agentId: "incident-summarizer", agentName: "Incident Summarizer" });

    expect(screen.getByRole("status", { name: /Incident severity: SEV2/ })).toBeInTheDocument();
  });

  it("suppresses the generic thinking indicator once a tool part has started streaming", () => {
    mockChat({
      messages: [
        textMessage("u1", "user", "Checkout was down"),
        toolMessage("a1", { state: "input-streaming", input: { impactSummary: "Checkout was down" } }),
      ],
      status: "streaming",
    });
    renderAgentChat({ agentId: "incident-summarizer", agentName: "Incident Summarizer" });

    expect(screen.queryByRole("status", { name: "Incident Summarizer is thinking" })).not.toBeInTheDocument();
    expect(screen.getByText("Reading incident details…")).toBeInTheDocument();
  });

  it("shows an offline banner and disables sending while the browser reports offline", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true, writable: true });
    mockChat({ messages: [], status: "ready" });
    renderAgentChat();

    expect(await screen.findByText(/You.re offline/)).toBeInTheDocument();

    const textarea = screen.getByRole("textbox", { name: "Message PR Reviewer" });
    expect(textarea).toBeDisabled();

    Object.defineProperty(navigator, "onLine", { value: true, configurable: true, writable: true });
    fireEvent(window, new Event("online"));

    expect(screen.queryByText(/You.re offline/)).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Message PR Reviewer" })).toBeEnabled();

    await user.type(screen.getByRole("textbox", { name: "Message PR Reviewer" }), "hi");
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(sendMessage).toHaveBeenCalledWith({ text: "hi" });
  });

  it("shows a jump-to-latest control once the user scrolls away from the bottom", () => {
    mockChat({ messages: [textMessage("u1", "user", "hi")], status: "ready" });
    renderAgentChat();

    const container = screen.getByTestId("messages-scroll");
    Object.defineProperty(container, "scrollHeight", { value: 1000, configurable: true });
    Object.defineProperty(container, "clientHeight", { value: 300, configurable: true });
    Object.defineProperty(container, "scrollTop", { value: 0, configurable: true, writable: true });

    expect(screen.queryByRole("button", { name: /Jump to latest/ })).not.toBeInTheDocument();

    fireEvent.scroll(container);
    expect(screen.getByRole("button", { name: /Jump to latest/ })).toBeInTheDocument();
  });
});
