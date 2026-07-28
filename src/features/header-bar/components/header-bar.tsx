"use client";

import { BasisToggle } from "@/components/app/basis-toggle";
import { RegionToggle } from "@/components/app/region-toggle";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { UnitToggle } from "@/components/app/unit-toggle";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { APP_CONFIG } from "@/lib/constants";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useCallback, useMemo } from "react";

import { NavButtons } from "./nav-buttons";

import type { NavProperties } from "@/types/types";

interface LocationItem {
  key: number;
  state: string;
  title: string;
}

const GitHubMark = (): React.ReactElement => (
  <svg
    aria-hidden="true"
    className="size-4"
    fill="currentColor"
    viewBox="0 0 24 24"
  >
    <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1.17-.02-2.12-3.2.69-3.88-1.36-3.88-1.36-.52-1.33-1.27-1.68-1.27-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.75 1.18 1.75 1.18 1.02 1.75 2.68 1.24 3.33.95.1-.74.4-1.24.72-1.52-2.55-.29-5.24-1.27-5.24-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.47.11-3.06 0 0 .97-.31 3.17 1.18a10.9 10.9 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.24 2.77.12 3.06.74.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.38-5.25 5.67.41.35.78 1.04.78 2.1 0 1.52-.02 2.74-.02 3.11 0 .31.21.68.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
  </svg>
);

const HeaderActions = (): React.ReactElement => (
  <div className="flex flex-wrap items-center gap-2">
    <Button
      aria-label="View source code on GitHub"
      asChild
      size="sm"
      variant="outline"
    >
      <a href={APP_CONFIG.GITHUB_URL} rel="noopener noreferrer" target="_blank">
        <GitHubMark />
        <span className="hidden sm:inline">GitHub</span>
      </a>
    </Button>
    <BasisToggle />
    <RegionToggle />
    <UnitToggle />
    <ThemeToggle />
  </div>
);

const HeaderBarComponent = ({
  compact = false,
  id,
  LocationOptions,
}: NavProperties): React.ReactElement => {
  const router = useRouter();
  const searchParameters = useSearchParams();

  const buildUrl = useCallback(
    (path: string, includeSearchParameters = true) => {
      const baseUrl = path;
      if (includeSearchParameters && searchParameters.toString() !== "") {
        return `${baseUrl}?${searchParameters.toString()}`;
      }

      return baseUrl;
    },
    [searchParameters],
  );

  const handleCityChange = useCallback(
    (value: string) => {
      router.push(`/${value}`);
    },
    [router],
  );

  const handleClear = useCallback(() => {
    router.push(buildUrl("/", true));
  }, [router, buildUrl]);

  const groupedCities = useMemo(() => {
    const options = Array.isArray(LocationOptions) ? LocationOptions : [];

    const allCities = options.flatMap((section) =>
      (Array.isArray(section.items) ? section.items : []).map((item) => ({
        key: item.key,
        state: section.title,
        title: item.title,
      })),
    );

    const grouped: Record<string, LocationItem[]> = {};
    for (const city of allCities) {
      const group = grouped[city.state] ?? [];
      group.push(city);
      grouped[city.state] = group;
    }

    const sortedStates = Object.keys(grouped).toSorted((a, b) =>
      a.localeCompare(b),
    );
    return sortedStates.map((state) => ({
      group: state,
      items: (grouped[state] ?? []).toSorted((a, b) =>
        a.title.localeCompare(b.title),
      ),
    }));
  }, [LocationOptions]);

  const currentCity = useMemo(() => {
    if (id === undefined) {
      return null;
    }
    return groupedCities
      .flatMap((group) => group.items)
      .find((city) => city.key === id);
  }, [id, groupedCities]);

  const selectData = useMemo(
    () =>
      groupedCities.map((group) => ({
        group: group.group,
        items: group.items.map((city) => ({
          key: `city-${city.key}`,
          label: city.title,
          value: city.key.toString(),
        })),
        key: `group-${group.group}`,
      })),
    [groupedCities],
  );

  return (
    <header className="sticky top-0 z-20 w-full border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-primary/60 to-transparent" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {compact ? (
          <div className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <NavButtons buildUrl={buildUrl} />
            </div>
            <HeaderActions />
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-primary">
                  <Link
                    className="rounded-md transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                    href={buildUrl("/")}
                  >
                    {APP_CONFIG.NAME}
                  </Link>
                </h1>
              </div>
              <div className="hidden sm:block">
                <HeaderActions />
              </div>
            </div>

            <div className="rounded-3xl p-3 glass-panel-muted sm:p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <Select
                  className="w-full lg:max-w-xl"
                  clearable
                  data={selectData}
                  data-testid="city-selector"
                  onChange={handleCityChange}
                  onClear={handleClear}
                  placeholder={
                    id !== undefined && id >= 0 ? "Change City" : "Select City"
                  }
                  searchable
                  value={currentCity?.key.toString()}
                />

                <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-start">
                  <NavButtons buildUrl={buildUrl} />
                  <div className="sm:hidden">
                    <HeaderActions />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

HeaderBarComponent.displayName = "HeaderBar";

export const HeaderBar = React.memo(HeaderBarComponent);
