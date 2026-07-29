"use client";

import { Button } from "@/components/ui/button";
import { Monitor, MoonStar, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";

const THEME_ORDER = ["system", "light", "dark"] as const;
type Theme = (typeof THEME_ORDER)[number];

const isTheme = (value: string | undefined): value is Theme =>
  THEME_ORDER.some((theme) => theme === value);

export const ThemeToggle = () => {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme: Theme = mounted && isTheme(theme) ? theme : "system";
  const currentThemeIndex = THEME_ORDER.indexOf(currentTheme);
  const nextTheme =
    THEME_ORDER[(currentThemeIndex + 1) % THEME_ORDER.length] ?? "system";
  const themeLabel =
    currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1);
  const label = mounted
    ? `Theme: ${themeLabel}. Switch to ${nextTheme} mode`
    : "Select color theme";

  const handleToggle = React.useCallback(() => {
    setTheme(nextTheme);
  }, [setTheme, nextTheme]);

  return (
    <Button
      aria-label={label}
      className="justify-center sm:min-w-35"
      onClick={handleToggle}
      size="sm"
      type="button"
      variant="outline"
    >
      {currentTheme === "dark" ? (
        <MoonStar className="size-4" />
      ) : currentTheme === "light" ? (
        <SunMedium className="size-4" />
      ) : (
        <Monitor className="size-4" />
      )}
      <span className="hidden sm:inline">{mounted ? themeLabel : "Theme"}</span>
    </Button>
  );
};
