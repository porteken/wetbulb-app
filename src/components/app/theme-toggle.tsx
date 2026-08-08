"use client";

import { Button } from "@/components/ui/button";
import { Monitor, MoonStar, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";

const THEME_ORDER = ["system", "light", "dark"] as const;
const THEME_VALUES: readonly string[] = THEME_ORDER;
type Theme = (typeof THEME_ORDER)[number];

const isTheme = (value: string | undefined): value is Theme =>
  value !== undefined && THEME_VALUES.includes(value);

const ThemeIcon = ({ theme }: Readonly<{ theme: Theme }>) => {
  if (theme === "dark") return <MoonStar className="size-4" />;
  if (theme === "light") return <SunMedium className="size-4" />;
  return <Monitor className="size-4" />;
};

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
      <ThemeIcon theme={currentTheme} />
      <span className="hidden sm:inline">{mounted ? themeLabel : "Theme"}</span>
    </Button>
  );
};
