import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UIMessage } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentChat } from "./agent-chat";

const useChatMock = vi.fn();

vi.mock("@ai-sdk/react", () => ({
  useChat: (...args: unknown[]) => useChatMock(...args),
}));

vi.mock("ai", () => ({
  DefaultChatTransport: class {
    constructor(public options: unknown) {}
  },
}));

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

const sendMessage = vi.fn();
const stop = vi.fn();

function mockChat(overrides: Partial<ReturnType<typeof useChatMock>>) {
  useChatMock.mockReturnValue({
    messages: [],
    sendMessage,
    stop,
    status: "ready",
    error: undefined,
    ...overrides,
  });
}

beforeEach(() => {
  sendMessage.mockReset();
  stop.mockReset();
  useChatMock.mockReset();
});

describe("AgentChat", () => {
  it("shows an empty-state prompt before any messages", () => {
    mockChat({ messages: [] });
    render(<AgentChat agentId="pr-reviewer" agentName="PR Reviewer" />);
    expect(screen.getByText(/Send a message to start a conversation with PR Reviewer/)).toBeInTheDocument();
  });

  it("shows the thinking indicator while the request is submitted, before any assistant message exists", () => {
    mockChat({ messages: [textMessage("u1", "user", "hi")], status: "submitted" });
    render(<AgentChat agentId="pr-reviewer" agentName="PR Reviewer" />);
    expect(screen.getByRole("status", { name: "PR Reviewer is thinking" })).toBeInTheDocument();
  });

  it("keeps the thinking indicator while streaming has started but no text has arrived yet", () => {
    mockChat({
      messages: [textMessage("u1", "user", "hi"), textMessage("a1", "assistant", "")],
      status: "streaming",
    });
    render(<AgentChat agentId="pr-reviewer" agentName="PR Reviewer" />);
    expect(screen.getByRole("status", { name: "PR Reviewer is thinking" })).toBeInTheDocument();
  });

  it("hands off from the indicator to rendered text once the first token arrives", () => {
    mockChat({
      messages: [textMessage("u1", "user", "hi"), textMessage("a1", "assistant", "Looks good")],
      status: "streaming",
    });
    render(<AgentChat agentId="pr-reviewer" agentName="PR Reviewer" />);
    expect(screen.queryByRole("status", { name: "PR Reviewer is thinking" })).not.toBeInTheDocument();
    expect(screen.getByTestId("streamdown")).toHaveTextContent("Looks good");
  });

  it("renders user messages as plain text, not through the markdown renderer", () => {
    mockChat({ messages: [textMessage("u1", "user", "**not markdown**")], status: "ready" });
    render(<AgentChat agentId="pr-reviewer" agentName="PR Reviewer" />);
    expect(screen.getByText("**not markdown**")).toBeInTheDocument();
    expect(screen.queryByTestId("streamdown")).not.toBeInTheDocument();
  });

  it("shows Stop instead of Send while busy, and clicking it calls stop()", async () => {
    const user = userEvent.setup();
    mockChat({
      messages: [textMessage("u1", "user", "hi"), textMessage("a1", "assistant", "partial answer")],
      status: "streaming",
    });
    render(<AgentChat agentId="pr-reviewer" agentName="PR Reviewer" />);

    expect(screen.queryByRole("button", { name: "Send" })).not.toBeInTheDocument();
    const stopButton = screen.getByRole("button", { name: "Stop" });
    await user.click(stopButton);
    expect(stop).toHaveBeenCalledTimes(1);

    // The partial assistant content stays visible — stopping must not drop it.
    expect(screen.getByText("partial answer")).toBeInTheDocument();
  });

  it("disables the input while busy and re-enables it once ready", () => {
    mockChat({ messages: [], status: "streaming" });
    const { rerender } = render(<AgentChat agentId="pr-reviewer" agentName="PR Reviewer" />);
    expect(screen.getByRole("textbox", { name: "Message PR Reviewer" })).toBeDisabled();

    mockChat({ messages: [], status: "ready" });
    rerender(<AgentChat agentId="pr-reviewer" agentName="PR Reviewer" />);
    expect(screen.getByRole("textbox", { name: "Message PR Reviewer" })).toBeEnabled();
  });

  it("sends the typed message and clears the input, and a second send works after that", async () => {
    const user = userEvent.setup();
    mockChat({ messages: [], status: "ready" });
    render(<AgentChat agentId="pr-reviewer" agentName="PR Reviewer" />);

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
    render(<AgentChat agentId="pr-reviewer" agentName="PR Reviewer" />);

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
    render(<AgentChat agentId="pr-reviewer" agentName="PR Reviewer" />);

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
    render(<AgentChat agentId="pr-reviewer" agentName="PR Reviewer" />);

    expect(screen.getByRole("alert")).toHaveTextContent("The agent failed to respond. Please try again.");
    expect(screen.getByRole("textbox", { name: "Message PR Reviewer" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
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
    render(<AgentChat agentId="incident-summarizer" agentName="Incident Summarizer" />);

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
    render(<AgentChat agentId="incident-summarizer" agentName="Incident Summarizer" />);

    expect(screen.queryByRole("status", { name: "Incident Summarizer is thinking" })).not.toBeInTheDocument();
    expect(screen.getByText("Reading incident details…")).toBeInTheDocument();
  });

  it("shows a jump-to-latest control once the user scrolls away from the bottom", () => {
    mockChat({ messages: [textMessage("u1", "user", "hi")], status: "ready" });
    render(<AgentChat agentId="pr-reviewer" agentName="PR Reviewer" />);

    const container = screen.getByTestId("messages-scroll");
    Object.defineProperty(container, "scrollHeight", { value: 1000, configurable: true });
    Object.defineProperty(container, "clientHeight", { value: 300, configurable: true });
    Object.defineProperty(container, "scrollTop", { value: 0, configurable: true, writable: true });

    expect(screen.queryByRole("button", { name: /Jump to latest/ })).not.toBeInTheDocument();

    fireEvent.scroll(container);
    expect(screen.getByRole("button", { name: /Jump to latest/ })).toBeInTheDocument();
  });
});
