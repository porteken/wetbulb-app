"use client";

import { PageShell } from "@/components/app/page-shell";
import { useTemperatureUnit } from "@/components/app/unit-provider";
import { WetbulbIndexLegend } from "@/components/app/wetbulb-index-legend";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import {
  setRankingsWetbulbLevel,
  setRankingsSeason,
  setRankingsState,
  setRankingsYear,
} from "@/lib/actions/actions";
import {
  GRAPH_SEASONS,
  normalizeGraphSeason,
  type GraphSeason,
  type TemperatureUnit,
} from "@/lib/constants";
import { YearOptions } from "@/lib/utils/select-options";
import {
  celsiusDeltaToFahrenheit,
  convertFromCelsius,
} from "@/lib/utils/temperature";
import {
  getWetbulbInfo,
  WETBULB_INDEX_LEGEND_ITEMS,
} from "@/lib/utils/wetbulb-index";
import * as Sentry from "@sentry/nextjs";
import { cva } from "class-variance-authority";
import { useRouter } from "next/navigation";
import React, { memo, useCallback, useMemo, useTransition } from "react";

import type { LocationOptionSection } from "@/types/types";

const RANK_THREE = 3;

const formatWetbulbValue = (value: number, unit: TemperatureUnit): string =>
  `${convertFromCelsius(value, unit).toFixed(1)}°${unit}`;
const getWetbulbRange = (
  p10: number,
  p90: number,
  unit: TemperatureUnit,
): string =>
  `${convertFromCelsius(p10, unit).toFixed(1)}-${convertFromCelsius(p90, unit).toFixed(1)}`;
const convertChangeFrom2000 = (
  changeFrom2000: number | undefined,
  unit: TemperatureUnit,
): number | undefined => {
  if (changeFrom2000 === undefined) {
    return undefined;
  }

  return unit === "F"
    ? celsiusDeltaToFahrenheit(changeFrom2000)
    : changeFrom2000;
};
const colorMapping = (value: number) => {
  if (value > 0) {
    return "text-red-600 dark:text-red-400";
  } else if (value < 0) {
    return "text-blue-600 dark:text-blue-400";
  }

  return "text-muted-foreground";
};

interface SelectOption {
  label: string;
  value: string;
}

const YEAR_OPTIONS = YearOptions().map(({ key, label }) => ({
  label,
  value: key,
}));

const RANKINGS_WETBULB_LEVELS = WETBULB_INDEX_LEGEND_ITEMS.map((item) => ({
  label: item.level,
  value: item.level,
}));

const SEASON_OPTIONS = GRAPH_SEASONS.map((season) => ({
  label: season,
  value: season,
}));

interface RankingItem {
  avg_wetbulb: number;
  changeFrom2000: number | undefined;
  city: string;
  FutureValueLower: number | undefined;
  FutureValueUpper: number | undefined;
  location_id: number;
  max_wetbulb: number | undefined;
  p10: number | undefined;
  p90: number | undefined;
  rank: number;
  state: string;
}

type SortColumn =
  | "avg_wetbulb"
  | "change"
  | "city"
  | "max_wetbulb"
  | "rank"
  | "state";

function compareRankingItems(
  a: RankingItem,
  b: RankingItem,
  column: SortColumn,
): number {
  switch (column) {
    case "avg_wetbulb": {
      return a.avg_wetbulb - b.avg_wetbulb;
    }
    case "change": {
      return (a.changeFrom2000 ?? 0) - (b.changeFrom2000 ?? 0);
    }
    case "city": {
      return a.city.localeCompare(b.city);
    }
    case "max_wetbulb": {
      return (a.max_wetbulb ?? 0) - (b.max_wetbulb ?? 0);
    }
    case "rank": {
      return b.avg_wetbulb - a.avg_wetbulb;
    }
    case "state": {
      return a.state.localeCompare(b.state);
    }
    default: {
      return 0;
    }
  }
}

function filterRanking(
  item: RankingItem,
  stateFilter: string,
  wetbulbLevelFilter: string,
): boolean {
  if (stateFilter !== "" && item.state !== stateFilter) {
    return false;
  }
  if (wetbulbLevelFilter !== "") {
    const wetbulbInfo = getWetbulbInfo(item.avg_wetbulb);
    if (wetbulbInfo.level !== wetbulbLevelFilter) {
      return false;
    }
  }
  return true;
}

const rankBadgeVariants = cva("border", {
  defaultVariants: {
    rank: "other",
  },
  variants: {
    rank: {
      1: "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-500/40 dark:bg-amber-950 dark:text-amber-200",
      2: "border-slate-300 bg-slate-100 text-slate-900 dark:border-slate-500/40 dark:bg-slate-800 dark:text-slate-100",
      3: "border-orange-300 bg-orange-100 text-orange-900 dark:border-orange-500/40 dark:bg-orange-950 dark:text-orange-200",
      other: "border-border bg-background/80 text-foreground",
    },
  },
});

function getRankBadgeClasses(rank: number): string {
  if (rank === 1 || rank === 2 || rank === RANK_THREE) {
    return rankBadgeVariants({ rank });
  }

  return rankBadgeVariants({ rank: "other" });
}

interface RankingsMainProperties {
  initialWetbulbLevel: string;
  initialSeason: GraphSeason;
  initialState: string;
  initialYear: number;
  LocationOptions: LocationOptionSection[];
  rankings: RankingItem[];
  shouldPersistInitialSeason?: boolean;
}

interface RankingsState {
  currentPage: number;
  wetbulbLevelFilter: string;
  selectedSeason: GraphSeason;
  selectedYear: number;
  sortColumn: SortColumn;
  sortDirection: "asc" | "desc";
  stateFilter: string;
}

type RankingsAction =
  | { column: SortColumn; type: "SET_SORT" }
  | { wetbulbLevel: string; type: "SET_WETBULB_LEVEL_FILTER" }
  | { page: number; type: "SET_PAGE" }
  | { season: GraphSeason; type: "SET_SEASON" }
  | { state: string; type: "SET_STATE_FILTER" }
  | { type: "SET_YEAR"; year: number };

type RankingsDispatch = React.Dispatch<RankingsAction>;
type PersistAction = (...actions: Array<() => Promise<unknown>>) => void;

const createInitialRankingsState = (properties: {
  initialWetbulbLevel: string;
  initialSeason: GraphSeason;
  initialState: string;
  initialYear: number;
}): RankingsState => ({
  currentPage: 1,
  wetbulbLevelFilter: properties.initialWetbulbLevel,
  selectedSeason: properties.initialSeason,
  selectedYear: properties.initialYear,
  sortColumn: "rank",
  sortDirection: "asc",
  stateFilter: properties.initialState,
});

function rankingsReducer(
  state: RankingsState,
  action: RankingsAction,
): RankingsState {
  switch (action.type) {
    case "SET_YEAR": {
      return { ...state, wetbulbLevelFilter: "", selectedYear: action.year };
    }
    case "SET_SEASON": {
      return {
        ...state,
        currentPage: 1,
        wetbulbLevelFilter: "",
        selectedSeason: action.season,
      };
    }
    case "SET_STATE_FILTER": {
      return { ...state, currentPage: 1, stateFilter: action.state };
    }
    case "SET_WETBULB_LEVEL_FILTER": {
      return {
        ...state,
        currentPage: 1,
        wetbulbLevelFilter: action.wetbulbLevel,
      };
    }
    case "SET_SORT": {
      if (state.sortColumn === action.column) {
        return {
          ...state,
          currentPage: 1,
          sortDirection: state.sortDirection === "asc" ? "desc" : "asc",
        };
      }

      return {
        ...state,
        currentPage: 1,
        sortColumn: action.column,
        sortDirection: "asc",
      };
    }
    case "SET_PAGE": {
      return { ...state, currentPage: action.page };
    }
    default: {
      return state;
    }
  }
}

interface RankingsFiltersProperties {
  dispatch: RankingsDispatch;
  wetbulbLevelFilter: string;
  wetbulbLevelOptions: SelectOption[];
  isPending: boolean;
  persist: PersistAction;
  selectedSeason: GraphSeason;
  selectedYear: number;
  stateFilter: string;
  stateOptions: SelectOption[];
}

const RankingsFilters = memo(
  ({
    dispatch,
    wetbulbLevelFilter,
    wetbulbLevelOptions,
    isPending,
    persist,
    selectedSeason,
    selectedYear,
    stateFilter,
    stateOptions,
  }: RankingsFiltersProperties) => {
    const handleYearChange = useCallback(
      (value: string) => {
        if (!value) {
          return;
        }

        const year = Number(value);
        const shouldResetWetbulbLevel = wetbulbLevelFilter !== "";

        dispatch({ type: "SET_YEAR", year });
        persist(
          ...(shouldResetWetbulbLevel
            ? [() => setRankingsWetbulbLevel("")]
            : []),
          () => setRankingsYear(year),
        );
      },
      [dispatch, wetbulbLevelFilter, persist],
    );

    const handleSeasonChange = useCallback(
      (value: string) => {
        const season = normalizeGraphSeason(value);
        const shouldResetWetbulbLevel = wetbulbLevelFilter !== "";

        dispatch({ season, type: "SET_SEASON" });
        persist(
          ...(shouldResetWetbulbLevel
            ? [() => setRankingsWetbulbLevel("")]
            : []),
          () => setRankingsSeason(season),
        );
      },
      [dispatch, wetbulbLevelFilter, persist],
    );

    const handleStateChange = useCallback(
      (value: string) => {
        dispatch({ state: value, type: "SET_STATE_FILTER" });
        persist(() => setRankingsState(value));
      },
      [dispatch, persist],
    );

    const handleStateClear = useCallback(() => {
      dispatch({ state: "", type: "SET_STATE_FILTER" });
      persist(() => setRankingsState(""));
    }, [dispatch, persist]);

    const handleWetbulbLevelChange = useCallback(
      (value: string) => {
        dispatch({ wetbulbLevel: value, type: "SET_WETBULB_LEVEL_FILTER" });
        persist(() => setRankingsWetbulbLevel(value));
      },
      [dispatch, persist],
    );

    const handleWetbulbLevelClear = useCallback(() => {
      dispatch({ wetbulbLevel: "", type: "SET_WETBULB_LEVEL_FILTER" });
      persist(() => setRankingsWetbulbLevel(""));
    }, [dispatch, persist]);

    return (
      <section className="mb-6 fade-in-up rounded-3xl p-4 glass-panel [animation-delay:80ms] sm:p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            className="w-full"
            data={YEAR_OPTIONS}
            data-testid="rankings-year-filter"
            disabled={isPending}
            label="Year"
            onChange={handleYearChange}
            value={String(selectedYear)}
          />
          <Select
            className="w-full"
            data={SEASON_OPTIONS}
            data-testid="rankings-season-filter"
            disabled={isPending}
            label="Season"
            onChange={handleSeasonChange}
            value={selectedSeason}
          />
          <Select
            className="w-full"
            clearable
            data={stateOptions}
            data-testid="rankings-state-filter"
            disabled={isPending}
            label="State"
            onChange={handleStateChange}
            onClear={handleStateClear}
            placeholder="All states"
            value={stateFilter}
          />
          <Select
            className="w-full"
            clearable
            data={wetbulbLevelOptions}
            data-testid="rankings-wetbulb-level-filter"
            disabled={isPending}
            label="Avg Wetbulb Level"
            onChange={handleWetbulbLevelChange}
            onClear={handleWetbulbLevelClear}
            placeholder="All levels"
            value={wetbulbLevelFilter}
          />
        </div>
      </section>
    );
  },
);

RankingsFilters.displayName = "RankingsFilters";

interface SortHeaderProperties {
  column: SortColumn;
  currentColumn: SortColumn;
  currentDirection: "asc" | "desc";
  dispatch: RankingsDispatch;
  label: string;
}

const SortHeader = memo(
  ({
    column,
    currentColumn,
    currentDirection,
    dispatch,
    label,
  }: SortHeaderProperties) => {
    const handleClick = useCallback(() => {
      dispatch({ column, type: "SET_SORT" });
    }, [dispatch, column]);

    const isActive = currentColumn === column;
    let ariaSort: "ascending" | "descending" | "none" = "none";
    if (isActive) {
      ariaSort = currentDirection === "asc" ? "ascending" : "descending";
    }

    return (
      <th
        aria-sort={ariaSort}
        className="px-6 py-4 text-left text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase"
      >
        <button
          className="flex cursor-pointer items-center gap-1 transition hover:text-foreground"
          onClick={handleClick}
          type="button"
        >
          {label}
          {isActive && (
            <span aria-hidden="true">
              {currentDirection === "asc" ? "↑" : "↓"}
            </span>
          )}
        </button>
      </th>
    );
  },
);

SortHeader.displayName = "SortHeader";

interface RankingRowProperties {
  item: RankingItem;
  push: (href: string) => void;
  rank: number;
  unit: TemperatureUnit;
}

const RankingRow = memo(({ item, push, rank, unit }: RankingRowProperties) => {
  const {
    avg_wetbulb,
    changeFrom2000,
    city,
    FutureValueLower,
    FutureValueUpper,
    location_id,
    max_wetbulb,
    p10,
    p90,
    state,
  } = item;

  const handleClick = useCallback(() => {
    push(`/${location_id}`);
  }, [push, location_id]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTableRowElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleClick();
      }
    },
    [handleClick],
  );

  const avgWetbulbInfo = getWetbulbInfo(avg_wetbulb);
  const changeFrom2000InUnit = convertChangeFrom2000(changeFrom2000, unit);

  return (
    <tr
      className="cursor-pointer transition even:bg-background/30 hover:-translate-y-px hover:bg-accent/45 focus-visible:outline-2 focus-visible:outline-ring"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-foreground">
        <span
          className={`inline-flex min-w-10 items-center justify-center rounded-full px-3 py-1 text-xs font-bold ${getRankBadgeClasses(rank)}`}
        >
          {rank}
        </span>
      </td>
      <td className="px-6 py-4 text-sm whitespace-nowrap text-foreground">
        {city}
      </td>
      <td className="px-6 py-4 text-sm whitespace-nowrap text-muted-foreground">
        <span className="rounded-full bg-background/80 px-2.5 py-1 font-medium text-foreground">
          {state}
        </span>
      </td>
      <td className="px-6 py-4 text-sm whitespace-nowrap">
        <span className={`font-semibold ${avgWetbulbInfo.color}`}>
          {formatWetbulbValue(avg_wetbulb, unit)}
        </span>
      </td>
      <td className="px-6 py-4 text-sm whitespace-nowrap">
        {max_wetbulb === undefined ? (
          <span className="text-muted-foreground">N/A</span>
        ) : (
          <span
            className={`font-semibold ${getWetbulbInfo(max_wetbulb).color}`}
          >
            {formatWetbulbValue(max_wetbulb, unit)}
          </span>
        )}
      </td>
      <td className="px-6 py-4 text-sm whitespace-nowrap text-muted-foreground">
        {p10 !== undefined && p90 !== undefined ? (
          `${getWetbulbRange(p10, p90, unit)}°${unit}`
        ) : (
          <span className="text-muted-foreground">N/A</span>
        )}
      </td>
      <td className="px-6 py-4 text-sm whitespace-nowrap">
        {changeFrom2000InUnit === undefined ? (
          <span className="text-muted-foreground">N/A</span>
        ) : (
          <span
            className={`font-semibold ${colorMapping(changeFrom2000InUnit)}`}
          >
            {changeFrom2000InUnit > 0 ? "+" : ""}
            {changeFrom2000InUnit.toFixed(1)}°{unit}
          </span>
        )}
      </td>
      <td className="px-6 py-4 text-sm whitespace-nowrap">
        {FutureValueLower !== undefined && FutureValueUpper !== undefined ? (
          <div>
            <span
              className={`font-semibold ${getWetbulbInfo(FutureValueLower).color}`}
            >
              {convertFromCelsius(FutureValueLower, unit).toFixed(1)}
            </span>
            <span className="text-muted-foreground"> - </span>
            <span
              className={`font-semibold ${getWetbulbInfo(FutureValueUpper).color}`}
            >
              {formatWetbulbValue(FutureValueUpper, unit)}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground">N/A</span>
        )}
      </td>
    </tr>
  );
});

RankingRow.displayName = "RankingRow";

export function RankingsMain({
  initialWetbulbLevel,
  initialSeason,
  initialState,
  initialYear,
  LocationOptions,
  rankings,
  shouldPersistInitialSeason = false,
}: Readonly<RankingsMainProperties>) {
  const router = useRouter();
  const { unit } = useTemperatureUnit();
  const handlePush = React.useCallback(
    (url: string) => {
      router.push(url);
    },
    [router],
  );

  const [state, dispatch] = React.useReducer(
    rankingsReducer,
    { initialWetbulbLevel, initialSeason, initialState, initialYear },
    createInitialRankingsState,
  );
  const {
    currentPage,
    wetbulbLevelFilter,
    selectedSeason,
    selectedYear,
    sortColumn,
    sortDirection,
    stateFilter,
  } = state;

  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const persist = useCallback<PersistAction>(
    (...actions) => {
      startTransition(() => {
        for (const action of actions) {
          void (async () => {
            try {
              await action();
            } catch (error) {
              console.warn("Failed to persist rankings preference", error);
              Sentry.captureException(error, {
                tags: { errorSource: "persistPreference" },
              });
              toast({
                description: "It will reset next visit.",
                title: "Couldn't save your preference",
                variant: "destructive",
              });
            }
          })();
        }
      });
    },
    [startTransition, toast],
  );

  const itemsPerPage = 20;

  const stateOptions = useMemo(() => {
    const filteredByWetbulbLevel = wetbulbLevelFilter
      ? rankings.filter(
          (r) => getWetbulbInfo(r.avg_wetbulb).level === wetbulbLevelFilter,
        )
      : rankings;

    const uniqueStates = [
      ...new Set(filteredByWetbulbLevel.map((r) => r.state)),
    ].toSorted((a, b) => a.localeCompare(b));
    return uniqueStates.map((state_) => ({ label: state_, value: state_ }));
  }, [rankings, wetbulbLevelFilter]);

  const wetbulbLevelOptions = useMemo(() => {
    const filteredByState = stateFilter
      ? rankings.filter((r) => r.state === stateFilter)
      : rankings;

    const availableLevels = new Set(
      filteredByState.map((r) => getWetbulbInfo(r.avg_wetbulb).level),
    );

    return RANKINGS_WETBULB_LEVELS.filter((option) =>
      availableLevels.has(option.value),
    );
  }, [rankings, stateFilter]);

  const filteredAndSortedRankings = useMemo(() => {
    const filtered = rankings.filter((item) =>
      filterRanking(item, stateFilter, wetbulbLevelFilter),
    );

    return filtered.toSorted((a, b) => {
      const comparison = compareRankingItems(a, b, sortColumn);
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [rankings, stateFilter, wetbulbLevelFilter, sortColumn, sortDirection]);

  const rankByLocation = useMemo(() => {
    const map = new Map<number, number>();
    const sortedByWetbulb = filteredAndSortedRankings.toSorted(
      (a, b) => b.avg_wetbulb - a.avg_wetbulb,
    );
    for (const [index, item] of sortedByWetbulb.entries()) {
      map.set(item.location_id, index + 1);
    }
    return map;
  }, [filteredAndSortedRankings]);

  const paginatedRankings = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedRankings.slice(startIndex, endIndex);
  }, [filteredAndSortedRankings, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedRankings.length / itemsPerPage);

  const handlePageChange = useCallback(
    (page: number) => {
      dispatch({ page, type: "SET_PAGE" });
    },
    [dispatch],
  );

  React.useEffect(() => {
    if (!shouldPersistInitialSeason) {
      return;
    }

    persist(() => setRankingsSeason(initialSeason));
  }, [initialSeason, shouldPersistInitialSeason, persist]);

  return (
    <div className="min-h-screen">
      <PageShell
        LocationOptions={LocationOptions}
        mainClassName="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10"
      >
        <h1 className="mb-8 fade-in-up text-3xl font-black tracking-tight text-primary sm:text-4xl">
          Cities ranked by Average Wetbulb
        </h1>

        <RankingsFilters
          dispatch={dispatch}
          wetbulbLevelFilter={wetbulbLevelFilter}
          wetbulbLevelOptions={wetbulbLevelOptions}
          isPending={isPending}
          persist={persist}
          selectedSeason={selectedSeason}
          selectedYear={selectedYear}
          stateFilter={stateFilter}
          stateOptions={stateOptions}
        />

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            Showing{" "}
            {filteredAndSortedRankings.length === 0
              ? 0
              : (currentPage - 1) * itemsPerPage + 1}
            -
            {Math.min(
              currentPage * itemsPerPage,
              filteredAndSortedRankings.length,
            )}{" "}
            of {filteredAndSortedRankings.length} cities
            {filteredAndSortedRankings.length !== rankings.length &&
              ` (filtered from ${rankings.length} total)`}
          </div>
          {isPending && (
            <div className="rounded-full bg-(--pill-surface) px-3 py-1 text-xs font-semibold text-(--pill-foreground)">
              Refreshing filters…
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6 xl:flex-row">
          <div className="w-full xl:w-64 xl:shrink-0">
            <div className="rounded-3xl p-6 glass-panel xl:sticky xl:top-28">
              <WetbulbIndexLegend />
            </div>
          </div>

          <div className="flex-1 overflow-hidden rounded-3xl glass-panel">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border/70">
                <thead className="bg-background/55 backdrop-blur-xl">
                  <tr>
                    <SortHeader
                      column="rank"
                      currentColumn={sortColumn}
                      currentDirection={sortDirection}
                      dispatch={dispatch}
                      label="Rank"
                    />
                    <SortHeader
                      column="city"
                      currentColumn={sortColumn}
                      currentDirection={sortDirection}
                      dispatch={dispatch}
                      label="City"
                    />
                    <SortHeader
                      column="state"
                      currentColumn={sortColumn}
                      currentDirection={sortDirection}
                      dispatch={dispatch}
                      label="State"
                    />
                    <SortHeader
                      column="avg_wetbulb"
                      currentColumn={sortColumn}
                      currentDirection={sortDirection}
                      dispatch={dispatch}
                      label="Avg Wetbulb"
                    />
                    <SortHeader
                      column="max_wetbulb"
                      currentColumn={sortColumn}
                      currentDirection={sortDirection}
                      dispatch={dispatch}
                      label="Max Wetbulb"
                    />
                    <th className="px-6 py-4 text-left text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
                      Wetbulb Range (10th-90th percentile)
                    </th>
                    <SortHeader
                      column="change"
                      currentColumn={sortColumn}
                      currentDirection={sortDirection}
                      dispatch={dispatch}
                      label="Change from 2000"
                    />
                    <th className="px-6 py-4 text-left text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
                      2100 Forecast Range
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70 bg-transparent">
                  {paginatedRankings.length === 0 ? (
                    <tr>
                      <td
                        className="px-6 py-12 text-center text-sm text-muted-foreground"
                        colSpan={8}
                      >
                        No cities match the current filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedRankings.map((item) => (
                      <RankingRow
                        item={item}
                        key={item.location_id}
                        push={handlePush}
                        rank={rankByLocation.get(item.location_id) ?? item.rank}
                        unit={unit}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <Pagination
              onChange={handlePageChange}
              total={totalPages}
              value={currentPage}
            />
          </div>
        )}
      </PageShell>
    </div>
  );
}
