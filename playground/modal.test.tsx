import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { Modal } from "./modal";

function ControlledModal() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Example modal">
        <button type="button">First</button>
        <button type="button">Last</button>
      </Modal>
    </div>
  );
}

describe("Modal", () => {
  it("is not rendered when closed", () => {
    render(
      <Modal open={false} onClose={() => {}} title="Hidden">
        <p>content</p>
      </Modal>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders with the correct role, aria-modal, and label when open", () => {
    render(
      <Modal open onClose={() => {}} title="Example modal">
        <p>content</p>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog", { name: "Example modal" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<ControlledModal />);

    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("moves focus into the dialog on open and returns it to the trigger on close", async () => {
    const user = userEvent.setup();
    render(<ControlledModal />);

    const openButton = screen.getByRole("button", { name: "Open" });
    openButton.focus();
    await user.click(openButton);

    expect(screen.getByRole("dialog")).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(openButton).toHaveFocus();
  });

  it("traps Tab focus cycling between the first and last focusable elements", async () => {
    const user = userEvent.setup();
    render(<ControlledModal />);

    await user.click(screen.getByRole("button", { name: "Open" }));

    const firstButton = screen.getByRole("button", { name: "First" });
    const lastButton = screen.getByRole("button", { name: "Last" });
    const closeButton = screen.getByRole("button", { name: "Close dialog" });

    // Tab order inside the dialog: close button -> First -> Last -> wraps to close button.
    closeButton.focus();
    await user.tab();
    expect(firstButton).toHaveFocus();

    await user.tab();
    expect(lastButton).toHaveFocus();

    await user.tab();
    expect(closeButton).toHaveFocus();

    await user.tab({ shift: true });
    expect(lastButton).toHaveFocus();
  });
});
