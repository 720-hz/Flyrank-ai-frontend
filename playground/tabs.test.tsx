import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Tabs } from "./tabs";

const ITEMS = [
  { id: "a", label: "Tab A", content: <p>Panel A</p> },
  { id: "b", label: "Tab B", content: <p>Panel B</p> },
  { id: "c", label: "Tab C", content: <p>Panel C</p> },
];

describe("Tabs", () => {
  it("renders a tablist with the first tab selected and its panel visible", () => {
    render(<Tabs items={ITEMS} label="Example tabs" />);

    const tabA = screen.getByRole("tab", { name: "Tab A" });
    expect(tabA).toHaveAttribute("aria-selected", "true");
    expect(tabA).toHaveAttribute("tabIndex", "0");

    expect(screen.getByRole("tab", { name: "Tab B" })).toHaveAttribute("tabIndex", "-1");
    expect(screen.getByText("Panel A")).toBeVisible();
  });

  it("only the selected tab panel is visible", () => {
    render(<Tabs items={ITEMS} label="Example tabs" defaultSelectedId="b" />);

    expect(screen.getByText("Panel B")).toBeVisible();
    expect(screen.queryByText("Panel A")).not.toBeVisible();
    expect(screen.queryByText("Panel C")).not.toBeVisible();
  });

  it("ArrowRight moves selection and focus to the next tab, with wraparound", async () => {
    const user = userEvent.setup();
    render(<Tabs items={ITEMS} label="Example tabs" />);

    screen.getByRole("tab", { name: "Tab A" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Tab B" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Tab B" })).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Tab A" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Tab A" })).toHaveAttribute("aria-selected", "true");
  });

  it("ArrowLeft wraps to the last tab from the first", async () => {
    const user = userEvent.setup();
    render(<Tabs items={ITEMS} label="Example tabs" />);

    screen.getByRole("tab", { name: "Tab A" }).focus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Tab C" })).toHaveFocus();
  });

  it("Home and End jump to the first and last tab", async () => {
    const user = userEvent.setup();
    render(<Tabs items={ITEMS} label="Example tabs" defaultSelectedId="b" />);

    screen.getByRole("tab", { name: "Tab B" }).focus();
    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Tab C" })).toHaveFocus();

    await user.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "Tab A" })).toHaveFocus();
  });
});
