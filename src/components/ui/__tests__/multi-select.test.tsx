import { MultiSelect } from "@/components/ui/multi-select";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const OPTIONS = [
  { label: "Arizona", value: "AZ" },
  { label: "Texas", value: "TX" },
  { label: "Washington", value: "WA" },
];
const NO_SELECTION: string[] = [];
const ARIZONA_SELECTION = ["AZ"];
const ARIZONA_TEXAS_SELECTION = ["AZ", "TX"];

describe("MultiSelect", () => {
  it("selects and deselects multiple options without closing", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(value: string[]) => void>();

    const { rerender } = render(
      <MultiSelect
        data={OPTIONS}
        label="State/Province"
        onChange={onChange}
        value={NO_SELECTION}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Select options" }));
    await user.click(screen.getByRole("button", { name: "Arizona" }));
    expect(onChange).toHaveBeenLastCalledWith(["AZ"]);

    rerender(
      <MultiSelect
        data={OPTIONS}
        label="State/Province"
        onChange={onChange}
        value={ARIZONA_SELECTION}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Texas" }));
    expect(onChange).toHaveBeenLastCalledWith(["AZ", "TX"]);

    rerender(
      <MultiSelect
        data={OPTIONS}
        label="State/Province"
        onChange={onChange}
        value={ARIZONA_TEXAS_SELECTION}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Arizona" }));
    expect(onChange).toHaveBeenLastCalledWith(["TX"]);
  });

  it("filters options by search text", async () => {
    const user = userEvent.setup();
    render(
      <MultiSelect
        data={OPTIONS}
        label="State/Province"
        searchable
        value={NO_SELECTION}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Select options" }));
    await user.type(screen.getByRole("textbox"), "tex");

    expect(screen.getByRole("button", { name: "Texas" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Arizona" }),
    ).not.toBeInTheDocument();
  });
});
