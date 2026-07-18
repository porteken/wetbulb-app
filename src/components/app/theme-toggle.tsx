"use client";

import { Button } from "@/components/ui/button";
import { MoonStar, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";

export const ThemeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkMode = mounted && resolvedTheme === "dark";
  const nextTheme = isDarkMode ? "light" : "dark";
  const themeLabel = isDarkMode ? "Dark" : "Light";
  const label = mounted ? `Switch to ${nextTheme} mode` : "Toggle color theme";

  const handleToggle = React.useCallback(() => {
    setTheme(isDarkMode ? "light" : "dark");
  }, [setTheme, isDarkMode]);

  return (
    <Button
      aria-label={label}
      className="justify-center sm:min-w-35"
      onClick={handleToggle}
      size="sm"
      type="button"
      variant="outline"
    >
      {isDarkMode ? (
        <MoonStar className="size-4" />
      ) : (
        <SunMedium className="size-4" />
      )}
      <span className="hidden sm:inline">{mounted ? themeLabel : "Theme"}</span>
    </Button>
  );
};
