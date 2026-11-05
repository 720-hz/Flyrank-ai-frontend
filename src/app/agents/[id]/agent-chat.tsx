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
import { describeChatError } from "@/lib/ai/chat-error";
import { isToolPart, type ConsoleUIMessage } from "@/lib/ai/console-ui-message";
import { getMessageText } from "@/lib/ai/ui-message-text";
import { useOnlineStatus } from "@/lib/use-online-status";
import { ToolPart } from "./tool-parts";

export interface AgentChatProps {
  agentId: string;
  agentName: string;
  /** Two ready-to-send prompts shown in the first-run empty state (FE-08). */
  examplePrompts: [string, string];
}

/** How close to the bottom (px) counts as "at the bottom" for auto-scroll purposes. */
const BOTTOM_THRESHOLD_PX = 48;

export function AgentChat({ agentId, agentName, examplePrompts }: AgentChatProps) {
  const transport = useMemo(
    () => new DefaultChatTransport<ConsoleUIMessage>({ api: `/api/agents/${agentId}/chat` }),
    [agentId],
  );

  const { messages, sendMessage, regenerate, stop, status, error } = useChat<ConsoleUIMessage>({ transport });

  const [input, setInput] = useState("");
  const [isPinnedToBottom, setIsPinnedToBottom] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isOnline = useOnlineStatus();

  const isBusy = status === "submitted" || status === "streaming";

  // Guards the narrow window between a click and `regenerate()` actually
  // flipping `status` away from "error" (which itself then hides this whole
  // button), so mashing Retry can't fire a second request.
  async function handleRetry() {
    if (isRetrying) return;
    setIsRetrying(true);
    try {
      await regenerate();
    } finally {
      setIsRetrying(false);
    }
  }

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
    if (!text || isBusy || !isOnline) return;
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

  /** Fills the input with an example prompt and focuses it — the user still sends it themselves. */
  function handleExampleClick(prompt: string) {
    setInput(prompt);
    requestAnimationFrame(() => {
      resizeTextarea();
      textareaRef.current?.focus();
    });
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
          <div className="flex h-full flex-col items-start justify-center gap-3">
            <p className="text-sm text-text/60">
              Send a message to start a conversation with {agentName}, or try one of these:
            </p>
            <ul className="flex flex-col gap-2">
              {examplePrompts.map((prompt) => (
                <li key={prompt}>
                  <button
                    type="button"
                    onClick={() => handleExampleClick(prompt)}
                    className="max-w-md rounded-lg border border-main/15 bg-main/[0.03] px-3 py-2 text-left text-sm text-text/80 transition-colors hover:border-main/30 hover:bg-main/5"
                  >
                    {prompt}
                  </button>
                </li>
              ))}
            </ul>
          </div>
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
          <div
            role="alert"
            className="mt-3 flex animate-in fade-in items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 duration-200"
          >
            <p className="text-sm text-red-700">{describeChatError(error).message}</p>
            <button
              type="button"
              onClick={handleRetry}
              disabled={isRetrying}
              aria-label="Retry sending your last message"
              className="shrink-0 rounded-md border border-red-300 bg-background px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
            >
              {isRetrying ? "Retrying…" : "Retry"}
            </button>
          </div>
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

      {!isOnline && (
        <p
          role="status"
          className="shrink-0 border-t border-amber-200 bg-amber-50 px-3 py-1.5 text-center text-xs font-medium text-amber-800"
        >
          You&rsquo;re offline — messages will send once you&rsquo;re back online.
        </p>
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
          disabled={isBusy || !isOnline}
          rows={1}
          placeholder={`Message ${agentName}…`}
          aria-label={`Message ${agentName}`}
          // text-base (16px), not text-sm (14px): iOS Safari auto-zooms the
          // page on focus of any input under 16px, which on a chat screen
          // means every send yanks the viewport in and back out. 16px is
          // below that threshold everywhere it matters, so this stays
          // text-base at every breakpoint instead of shrinking on sm:.
          className="min-h-11 flex-1 resize-none rounded-md border border-main/20 bg-background px-3 py-2 text-base text-text outline-none focus:border-main disabled:opacity-60"
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
            disabled={input.trim().length === 0 || !isOnline}
            className="h-11 shrink-0 rounded-md bg-main px-4 text-sm font-medium text-background disabled:opacity-40"
          >
            Send
          </button>
        )}
      </form>
    </div>
  );
}
