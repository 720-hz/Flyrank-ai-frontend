import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Disclosure } from "./disclosure";

describe("Disclosure", () => {
  it("starts collapsed with aria-expanded=false and the panel hidden", () => {
    render(
      <Disclosure summary="More info">
        <p>Hidden detail</p>
      </Disclosure>,
    );

    const button = screen.getByRole("button", { name: "More info" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Hidden detail")).not.toBeVisible();
  });

  it("respects defaultOpen", () => {
    render(
      <Disclosure summary="More info" defaultOpen>
        <p>Visible detail</p>
      </Disclosure>,
    );

    expect(screen.getByRole("button", { name: "More info" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByText("Visible detail")).toBeVisible();
  });

  it("toggles open/closed on click, syncing aria-expanded and panel visibility", async () => {
    const user = userEvent.setup();
    render(
      <Disclosure summary="More info">
        <p>Detail</p>
      </Disclosure>,
    );

    const button = screen.getByRole("button", { name: "More info" });
    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Detail")).toBeVisible();

    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Detail")).not.toBeVisible();
  });

  it("toggles via the keyboard using native button activation (Enter and Space)", async () => {
    const user = userEvent.setup();
    render(
      <Disclosure summary="More info">
        <p>Detail</p>
      </Disclosure>,
    );

    await user.tab();
    expect(screen.getByRole("button", { name: "More info" })).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(screen.getByText("Detail")).toBeVisible();

    await user.keyboard(" ");
    expect(screen.getByText("Detail")).not.toBeVisible();
  });
});
