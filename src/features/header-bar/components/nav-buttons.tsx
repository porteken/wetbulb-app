"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

interface NavButtonsProperties {
  buildUrl: (path: string, includeSearchParameters?: boolean) => string;
}

export const NavButtons: React.FC<NavButtonsProperties> = ({ buildUrl }) => {
  const pathname = usePathname();

  const isActivePath = (path: string): boolean => pathname === path;

  return (
    <>
      <Button aria-label="Navigate to map view" asChild variant="ghost">
        <Link
          aria-current={isActivePath("/") ? "page" : undefined}
          className={cn(
            "rounded-full px-3 py-2",
            isActivePath("/") && "bg-accent font-semibold text-foreground",
          )}
          href={buildUrl("/")}
        >
          Map
        </Link>
      </Button>

      <Button aria-label="Navigate to rankings page" asChild variant="ghost">
        <Link
          aria-current={isActivePath("/rankings") ? "page" : undefined}
          className={cn(
            "rounded-full px-3 py-2",
            isActivePath("/rankings") &&
              "bg-accent font-semibold text-foreground",
          )}
          href={buildUrl("/rankings")}
        >
          Rankings
        </Link>
      </Button>

      <Button aria-label="Navigate to about page" asChild variant="ghost">
        <Link
          aria-current={isActivePath("/about") ? "page" : undefined}
          className={cn(
            "rounded-full px-3 py-2",
            isActivePath("/about") && "bg-accent font-semibold text-foreground",
          )}
          href={buildUrl("/about")}
        >
          About
        </Link>
      </Button>
    </>
  );
};
