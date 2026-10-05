"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Streamdown } from "streamdown";
import { isToolPart, type ConsoleUIMessage } from "@/lib/ai/console-ui-message";
import { getMessageText } from "@/lib/ai/ui-message-text";
import { ToolPart } from "./tool-parts";

export interface AgentChatProps {
  agentId: string;
  agentName: string;
}

/** How close to the bottom (px) counts as "at the bottom" for auto-scroll purposes. */
const BOTTOM_THRESHOLD_PX = 48;

export function AgentChat({ agentId, agentName }: AgentChatProps) {
  const transport = useMemo(
    () => new DefaultChatTransport<ConsoleUIMessage>({ api: `/api/agents/${agentId}/chat` }),
    [agentId],
  );

  const { messages, sendMessage, stop, status, error } = useChat<ConsoleUIMessage>({ transport });

  const [input, setInput] = useState("");
  const [isPinnedToBottom, setIsPinnedToBottom] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const isBusy = status === "submitted" || status === "streaming";

  const lastMessage = messages[messages.length - 1];
  const lastMessageHasToolPart = lastMessage?.parts.some(isToolPart) ?? false;
  // Once a tool part has started arriving, its own input-streaming card is the
  // "something is happening" signal — the generic thinking-dots indicator would
  // be redundant (and would sit above an empty bubble with nothing in it).
  const isWaitingForFirstToken =
    status === "submitted" ||
    (status === "streaming" &&
      lastMessage?.role === "assistant" &&
      getMessageText(lastMessage).length === 0 &&
      !lastMessageHasToolPart);

  // Auto-scroll: only follow new content while already pinned to the bottom. The
  // moment the user scrolls up, release the pin so streaming text doesn't yank
  // them back down; re-pin once they scroll back to the bottom themselves.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !isPinnedToBottom) return;
    container.scrollTop = container.scrollHeight;
  }, [messages, isPinnedToBottom]);

  function handleScroll() {
    const container = scrollRef.current;
    if (!container) return;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    setIsPinnedToBottom(distanceFromBottom <= BOTTOM_THRESHOLD_PX);
  }

  function scrollToBottom() {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
    setIsPinnedToBottom(true);
  }

  function resizeTextarea() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }

  function handleSend() {
    const text = input.trim();
    if (!text || isBusy) return;
    sendMessage({ text });
    setInput("");
    requestAnimationFrame(resizeTextarea);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    handleSend();
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex h-[min(70dvh,640px)] min-h-[420px] flex-col rounded-lg border border-main/10 bg-background">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        data-testid="messages-scroll"
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 && (
          <p className="text-sm text-text/60">
            Send a message to start a conversation with {agentName}.
          </p>
        )}

        <ul className="flex flex-col gap-3">
          {messages.map((message) => {
            const text = getMessageText(message);
            const isUser = message.role === "user";
            const toolParts = message.parts.filter(isToolPart);

            return (
              <Fragment key={message.id}>
                {(isUser || text.length > 0) && (
                  <li
                    className={`flex animate-in fade-in slide-in-from-bottom-1 duration-200 ${
                      isUser ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                        isUser
                          ? "bg-main text-background"
                          : "border border-main/10 bg-background text-text"
                      }`}
                    >
                      {isUser ? <p className="whitespace-pre-wrap">{text}</p> : <Streamdown>{text}</Streamdown>}
                    </div>
                  </li>
                )}

                {toolParts.map((part) => (
                  <li key={part.toolCallId} className="flex justify-start">
                    <ToolPart part={part} />
                  </li>
                ))}
              </Fragment>
            );
          })}

          {isWaitingForFirstToken && (
            <li className="flex animate-in fade-in justify-start duration-200">
              <div
                role="status"
                aria-label={`${agentName} is thinking`}
                className="flex items-center gap-1 rounded-lg border border-main/10 bg-background px-3 py-2"
              >
                <span className="size-1.5 animate-bounce rounded-full bg-main/60 [animation-delay:-0.3s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-main/60 [animation-delay:-0.15s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-main/60" />
              </div>
            </li>
          )}
        </ul>

        {status === "error" && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {error?.message ?? "Something went wrong. Please try again."}
          </p>
        )}
      </div>

      {!isPinnedToBottom && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="mx-auto -mt-10 mb-2 w-fit rounded-full border border-main/20 bg-background px-3 py-1 text-xs font-medium text-text shadow-sm"
        >
          Jump to latest ↓
        </button>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex shrink-0 items-end gap-2 border-t border-main/10 p-3"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
            resizeTextarea();
          }}
          onKeyDown={handleKeyDown}
          disabled={isBusy}
          rows={1}
          placeholder={`Message ${agentName}…`}
          aria-label={`Message ${agentName}`}
          className="min-h-11 flex-1 resize-none rounded-md border border-main/20 bg-background px-3 py-2 text-sm text-text outline-none focus:border-main disabled:opacity-60"
        />
        {isBusy ? (
          <button
            type="button"
            onClick={() => stop()}
            className="h-11 shrink-0 rounded-md bg-main px-4 text-sm font-medium text-background"
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={input.trim().length === 0}
            className="h-11 shrink-0 rounded-md bg-main px-4 text-sm font-medium text-background disabled:opacity-40"
          >
            Send
          </button>
        )}
      </form>
    </div>
  );
}
