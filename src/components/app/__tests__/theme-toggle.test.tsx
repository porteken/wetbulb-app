import { fireEvent, render, screen } from "@testing-library/react";
import { useTheme } from "next-themes";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeToggle } from "../theme-toggle";

vi.mock("next-themes", () => ({
  useTheme: vi.fn<typeof useTheme>(),
}));

const mockUseTheme = vi.mocked(useTheme);
const setTheme = vi.fn<ReturnType<typeof useTheme>["setTheme"]>();

describe("ThemeToggle", () => {
  beforeEach(() => {
    setTheme.mockClear();
  });

  it.each([
    ["system", "System", "light"],
    ["light", "Light", "dark"],
    ["dark", "Dark", "system"],
  ])(
    "shows the %s setting and switches to %s",
    (theme, visibleLabel, nextTheme) => {
      mockUseTheme.mockReturnValue({
        resolvedTheme: theme === "system" ? "dark" : theme,
        setTheme,
        theme,
        themes: ["light", "dark", "system"],
        systemTheme: "dark",
        forcedTheme: undefined,
      });

      render(<ThemeToggle />);

      const button = screen.getByRole("button", {
        name: `Theme: ${visibleLabel}. Switch to ${nextTheme} mode`,
      });
      expect(button).toHaveTextContent(visibleLabel);

      fireEvent.click(button);

      expect(setTheme).toHaveBeenCalledWith(nextTheme);
    },
  );
});
