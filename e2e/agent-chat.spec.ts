import { expect, test } from "@playwright/test";
import { fulfillWithAssistantReply, fulfillWithError } from "./mock-ui-message-stream";

/**
 * End-to-end coverage of the console's primary flow: land on the dashboard, get to an
 * agent via the real nav, send it a message, and see a real streamed reply render. The
 * one network boundary that would otherwise call Anthropic — this agent's own chat route
 * — is intercepted and fulfilled by hand (see mock-ui-message-stream.ts), so this suite
 * never calls the real AI API and never needs a real ANTHROPIC_API_KEY, in CI or anywhere
 * else. Everything else (routing, the nav, the chat UI, scroll/focus/disabled states) is
 * the real app, driven by a real browser.
 */
test.describe("primary flow: dashboard -> agent -> chat", () => {
  test("navigates to an agent via the nav, sends a message, and renders the streamed reply", async ({
    page,
  }) => {
    await page.route("**/api/agents/pr-reviewer/chat", (route) =>
      fulfillWithAssistantReply(
        route,
        "The diff looks solid — one nit: the new helper isn't covered by a test yet.",
      ),
    );

    await page.goto("/");
    await page.getByRole("link", { name: "Agents" }).click();
    await expect(page.getByRole("heading", { name: "Agents", level: 1 })).toBeVisible();

    await page.getByRole("link", { name: /PR Reviewer/ }).click();
    await expect(page.getByRole("heading", { name: "PR Reviewer", level: 1 })).toBeVisible();

    const textbox = page.getByRole("textbox", { name: "Message PR Reviewer" });
    await textbox.fill("Here's a diff adding a new helper function, any concerns?");
    await page.getByRole("button", { name: "Send" }).click();

    // The reply itself, fully arrived. (The busy "Stop" button in between is exercised
    // deterministically by agent-chat.test.tsx's component tests, which control the mocked
    // response's timing directly — here the mocked route resolves in one network tick, so
    // asserting that transient state would just be a race.)
    await expect(
      page.getByText("The diff looks solid — one nit: the new helper isn't covered by a test yet."),
    ).toBeVisible();

    // Busy state clears once the stream finishes.
    await expect(page.getByRole("button", { name: "Send" })).toBeVisible();
    await expect(textbox).toBeEnabled();
  });

  test("shows a retry card on a failed turn, and retrying with a working response succeeds", async ({
    page,
  }) => {
    let callCount = 0;
    await page.route("**/api/agents/pr-reviewer/chat", async (route) => {
      callCount += 1;
      if (callCount === 1) {
        await fulfillWithError(route, "Claude is temporarily overloaded. Wait a moment and try again.", 503);
      } else {
        await fulfillWithAssistantReply(route, "Looks good now — no issues found.");
      }
    });

    await page.goto("/agents/pr-reviewer");

    const textbox = page.getByRole("textbox", { name: "Message PR Reviewer" });
    await textbox.fill("Review this diff please.");
    await page.getByRole("button", { name: "Send" }).click();

    // Scoped past text, not just role: Next.js's own route announcer also carries
    // role="alert" (empty, for screen-reader route-change announcements), so a bare
    // getByRole("alert") matches two elements on this page.
    const alert = page.getByRole("alert").filter({ hasText: "Claude is temporarily overloaded" });
    await expect(alert).toContainText("Claude is temporarily overloaded. Wait a moment and try again.");

    await page.getByRole("button", { name: "Retry sending your last message" }).click();

    await expect(page.getByText("Looks good now — no issues found.")).toBeVisible();
    await expect(alert).not.toBeVisible();
  });
});
