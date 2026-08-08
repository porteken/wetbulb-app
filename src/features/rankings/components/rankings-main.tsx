"use client";

import { AppPagination as Pagination } from "@/components/app/app-pagination";
import { AppSelect as Select } from "@/components/app/app-select";
import { useWetbulbBasis } from "@/components/app/basis-provider";
import { PageShell } from "@/components/app/page-shell";
import { useTemperatureUnit } from "@/components/app/unit-provider";
import { WetbulbIndexLegend } from "@/components/app/wetbulb-index-legend";
import { MultiSelect } from "@/components/ui/multi-select";
import { useToast } from "@/components/ui/toast";
import {
  setRankingsWetbulbLevel,
  setRankingsSeason,
  setRankingsState,
  setRankingsYear,
} from "@/lib/actions/actions";
import {
  DATA_REGION_LABELS,
  GRAPH_CONFIG,
  GRAPH_SEASONS,
  normalizeGraphSeason,
  type DataRegion,
  type GraphSeason,
  type TemperatureUnit,
} from "@/lib/constants";
import { isCurrentYearRankingAvailable } from "@/lib/utils/season-availability";
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
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useTransition,
} from "react";

import type { LocationOptionSection } from "@/types/types";

const RANK_THREE = 3;

const formatWetbulbValue = (value: number, unit: TemperatureUnit): string =>
  `${convertFromCelsius(value, unit).toFixed(1)}°${unit}`;
const getWetbulbRange = (
  p5: number,
  p95: number,
  unit: TemperatureUnit,
): string =>
  `${convertFromCelsius(p5, unit).toFixed(1)}-${convertFromCelsius(p95, unit).toFixed(1)}`;
const convertChangeFromBaseline = (
  changeFromBaseline: number | undefined,
  unit: TemperatureUnit,
): number | undefined => {
  if (changeFromBaseline === undefined) {
    return undefined;
  }

  return unit === "F"
    ? celsiusDeltaToFahrenheit(changeFromBaseline)
    : changeFromBaseline;
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

const RANKINGS_WETBULB_LEVELS = WETBULB_INDEX_LEGEND_ITEMS.map((item) => ({
  label: item.level,
  value: item.level,
}));

interface RankingItem {
  avg_wetbulb: number;
  changeFromBaseline: number | undefined;
  city: string;
  FutureValueLower: number | undefined;
  FutureValueUpper: number | undefined;
  location_id: number;
  max_wetbulb: number | undefined;
  p5: number | undefined;
  p95: number | undefined;
  rank: number;
  state: string;
}

type SortColumn =
  | "avg_wetbulb"
  | "change"
  | "city"
  | "forecast_range"
  | "max_wetbulb"
  | "rank"
  | "state"
  | "wetbulb_range";

const rankingComparators: Record<
  SortColumn,
  (a: RankingItem, b: RankingItem) => number
> = {
  avg_wetbulb: (a, b) => a.avg_wetbulb - b.avg_wetbulb,
  change: (a, b) => (a.changeFromBaseline ?? 0) - (b.changeFromBaseline ?? 0),
  city: (a, b) => a.city.localeCompare(b.city),
  forecast_range: (a, b) =>
    (a.FutureValueUpper ?? 0) - (b.FutureValueUpper ?? 0),
  max_wetbulb: (a, b) => (a.max_wetbulb ?? 0) - (b.max_wetbulb ?? 0),
  rank: (a, b) => b.avg_wetbulb - a.avg_wetbulb,
  state: (a, b) => a.state.localeCompare(b.state),
  wetbulb_range: (a, b) => (a.p95 ?? 0) - (b.p95 ?? 0),
};

function compareRankingItems(
  a: RankingItem,
  b: RankingItem,
  column: SortColumn,
): number {
  return rankingComparators[column](a, b);
}

function filterRanking(
  item: RankingItem,
  stateFilter: string[],
  wetbulbLevelFilter: string[],
): boolean {
  if (stateFilter.length > 0 && !stateFilter.includes(item.state)) {
    return false;
  }
  if (wetbulbLevelFilter.length > 0) {
    const wetbulbInfo = getWetbulbInfo(item.avg_wetbulb);
    if (!wetbulbLevelFilter.includes(wetbulbInfo.level)) {
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
      2: "border-slate-400 bg-slate-200 text-slate-950 dark:border-slate-200 dark:bg-slate-300 dark:text-slate-950",
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
  baselineYear: number;
  earliestYear: number;
  initialWetbulbLevel: string;
  initialSeason: GraphSeason;
  initialState: string;
  initialYear: number;
  LocationOptions: LocationOptionSection[];
  rankings: RankingItem[];
  region: DataRegion;
  shouldPersistInitialSeason?: boolean;
}

interface RankingsState {
  currentPage: number;
  wetbulbLevelFilter: string[];
  selectedSeason: GraphSeason;
  selectedYear: number;
  sortColumn: SortColumn;
  sortDirection: "asc" | "desc";
  stateFilter: string[];
}

type RankingsAction =
  | { type: "RESET_BASIS_FILTERS" }
  | { column: SortColumn; type: "SET_SORT" }
  | { wetbulbLevels: string[]; type: "SET_WETBULB_LEVEL_FILTER" }
  | { page: number; type: "SET_PAGE" }
  | { season: GraphSeason; type: "SET_SEASON" }
  | { states: string[]; type: "SET_STATE_FILTER" }
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
  wetbulbLevelFilter: properties.initialWetbulbLevel.split(",").filter(Boolean),
  selectedSeason: properties.initialSeason,
  selectedYear: properties.initialYear,
  sortColumn: "rank",
  sortDirection: "asc",
  stateFilter: properties.initialState.split(",").filter(Boolean),
});

function rankingsReducer(
  state: RankingsState,
  action: RankingsAction,
): RankingsState {
  switch (action.type) {
    case "RESET_BASIS_FILTERS": {
      return {
        ...state,
        currentPage: 1,
        stateFilter: [],
        wetbulbLevelFilter: [],
      };
    }
    case "SET_YEAR": {
      return { ...state, wetbulbLevelFilter: [], selectedYear: action.year };
    }
    case "SET_SEASON": {
      return {
        ...state,
        currentPage: 1,
        wetbulbLevelFilter: [],
        selectedSeason: action.season,
      };
    }
    case "SET_STATE_FILTER": {
      return { ...state, currentPage: 1, stateFilter: action.states };
    }
    case "SET_WETBULB_LEVEL_FILTER": {
      return {
        ...state,
        currentPage: 1,
        wetbulbLevelFilter: action.wetbulbLevels,
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
  earliestYear: number;
  wetbulbLevelFilter: string[];
  wetbulbLevelOptions: SelectOption[];
  isPending: boolean;
  persist: PersistAction;
  region: DataRegion;
  selectedSeason: GraphSeason;
  selectedYear: number;
  stateFilter: string[];
  stateOptions: SelectOption[];
}

const RankingsFilters = memo(
  ({
    dispatch,
    earliestYear,
    wetbulbLevelFilter,
    wetbulbLevelOptions,
    isPending,
    persist,
    region,
    selectedSeason,
    selectedYear,
    stateFilter,
    stateOptions,
  }: RankingsFiltersProperties) => {
    const yearOptions = useMemo(
      () =>
        YearOptions({ startYear: earliestYear }).map(({ key, label }) => ({
          label,
          value: key,
        })),
      [earliestYear],
    );
    const seasonOptions = useMemo(
      () =>
        GRAPH_SEASONS.map((season) => {
          const unavailable =
            selectedYear === GRAPH_CONFIG.YEAR_RANGE.END &&
            !isCurrentYearRankingAvailable(season);

          return {
            disabled: unavailable,
            label: unavailable ? `${season} (Insufficient data)` : season,
            value: season,
          };
        }),
      [selectedYear],
    );
    const handleYearChange = useCallback(
      (value: string) => {
        if (!value) {
          return;
        }

        const year = Number(value);
        const shouldResetWetbulbLevel = wetbulbLevelFilter.length > 0;
        const shouldSelectAvailableSeason =
          year === GRAPH_CONFIG.YEAR_RANGE.END &&
          !isCurrentYearRankingAvailable(selectedSeason);
        const availableSeason = shouldSelectAvailableSeason
          ? GRAPH_SEASONS.findLast((season) =>
              isCurrentYearRankingAvailable(season),
            )
          : undefined;

        dispatch({ type: "SET_YEAR", year });
        if (availableSeason) {
          dispatch({ season: availableSeason, type: "SET_SEASON" });
        }
        persist(
          ...(shouldResetWetbulbLevel
            ? [() => setRankingsWetbulbLevel("")]
            : []),
          () => setRankingsYear(year),
          ...(availableSeason
            ? [() => setRankingsSeason(availableSeason)]
            : []),
        );
      },
      [dispatch, wetbulbLevelFilter, persist, selectedSeason],
    );

    const handleSeasonChange = useCallback(
      (value: string) => {
        const season = normalizeGraphSeason(value);
        const shouldResetWetbulbLevel = wetbulbLevelFilter.length > 0;
        const shouldResetYear =
          selectedYear === GRAPH_CONFIG.YEAR_RANGE.END &&
          !isCurrentYearRankingAvailable(season);
        const nextYear = GRAPH_CONFIG.YEAR_RANGE.END - 1;

        dispatch({ season, type: "SET_SEASON" });
        if (shouldResetYear) {
          dispatch({ type: "SET_YEAR", year: nextYear });
        }
        persist(
          ...(shouldResetWetbulbLevel
            ? [() => setRankingsWetbulbLevel("")]
            : []),
          () => setRankingsSeason(season),
          ...(shouldResetYear ? [() => setRankingsYear(nextYear)] : []),
        );
      },
      [dispatch, wetbulbLevelFilter, persist, selectedYear],
    );

    const handleStateChange = useCallback(
      (value: string[]) => {
        dispatch({ states: value, type: "SET_STATE_FILTER" });
        persist(() => setRankingsState(value.join(",")));
      },
      [dispatch, persist],
    );

    const handleWetbulbLevelChange = useCallback(
      (value: string[]) => {
        dispatch({
          type: "SET_WETBULB_LEVEL_FILTER",
          wetbulbLevels: value,
        });
        persist(() => setRankingsWetbulbLevel(value.join(",")));
      },
      [dispatch, persist],
    );

    return (
      <section className="mb-6 fade-in-up rounded-3xl p-4 glass-panel [animation-delay:80ms] sm:p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            className="w-full"
            data={yearOptions}
            data-testid="rankings-year-filter"
            disabled={isPending}
            label="Year"
            onChange={handleYearChange}
            value={String(selectedYear)}
          />
          <Select
            className="w-full"
            data={seasonOptions}
            data-testid="rankings-season-filter"
            disabled={isPending}
            label="Season"
            onChange={handleSeasonChange}
            value={selectedSeason}
          />
          <MultiSelect
            className="w-full"
            data={stateOptions}
            data-testid="rankings-state-filter"
            disabled={isPending}
            label={DATA_REGION_LABELS[region].subdivision}
            onChange={handleStateChange}
            placeholder={DATA_REGION_LABELS[region].subdivisionPlaceholder}
            searchable
            value={stateFilter}
          />
          <MultiSelect
            className="w-full"
            data={wetbulbLevelOptions}
            data-testid="rankings-wetbulb-level-filter"
            disabled={isPending}
            label="Avg Wetbulb Level"
            onChange={handleWetbulbLevelChange}
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
        className="px-3 py-4 text-left text-xs font-medium tracking-[0.15em] text-muted-foreground uppercase"
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
    changeFromBaseline,
    city,
    FutureValueLower,
    FutureValueUpper,
    location_id,
    max_wetbulb,
    p5,
    p95,
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
  const changeFromBaselineInUnit = convertChangeFromBaseline(
    changeFromBaseline,
    unit,
  );

  return (
    <tr
      className="cursor-pointer transition even:bg-background/30 hover:-translate-y-px hover:bg-accent/45 focus-visible:outline-2 focus-visible:outline-ring"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <td className="px-3 py-4 text-sm font-medium whitespace-nowrap text-foreground">
        <span
          className={`inline-flex min-w-10 items-center justify-center rounded-full px-3 py-1 text-xs font-bold ${getRankBadgeClasses(rank)}`}
        >
          {rank}
        </span>
      </td>
      <td className="px-3 py-4 text-sm whitespace-nowrap text-foreground">
        {city}
      </td>
      <td className="px-3 py-4 text-sm whitespace-nowrap text-muted-foreground">
        <span className="rounded-full bg-background/80 px-2.5 py-1 font-medium text-foreground">
          {state}
        </span>
      </td>
      <td className="px-3 py-4 text-sm whitespace-nowrap">
        <span className={`font-semibold ${avgWetbulbInfo.color}`}>
          {formatWetbulbValue(avg_wetbulb, unit)}
        </span>
      </td>
      <td className="px-3 py-4 text-sm whitespace-nowrap">
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
      <td className="px-3 py-4 text-sm whitespace-nowrap text-muted-foreground">
        {p5 !== undefined && p95 !== undefined ? (
          `${getWetbulbRange(p5, p95, unit)}°${unit}`
        ) : (
          <span className="text-muted-foreground">N/A</span>
        )}
      </td>
      <td className="px-3 py-4 text-sm whitespace-nowrap">
        {changeFromBaselineInUnit === undefined ? (
          <span className="text-muted-foreground">N/A</span>
        ) : (
          <span
            className={`font-semibold ${colorMapping(changeFromBaselineInUnit)}`}
          >
            {changeFromBaselineInUnit > 0 ? "+" : ""}
            {changeFromBaselineInUnit.toFixed(1)}°{unit}
          </span>
        )}
      </td>
      <td className="px-3 py-4 text-sm whitespace-nowrap">
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
  baselineYear,
  earliestYear,
  initialWetbulbLevel,
  initialSeason,
  initialState,
  initialYear,
  LocationOptions,
  rankings,
  region,
  shouldPersistInitialSeason = false,
}: Readonly<RankingsMainProperties>) {
  const router = useRouter();
  const { basis } = useWetbulbBasis();
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
  const previousBasis = useRef(basis);

  useEffect(() => {
    if (previousBasis.current === basis) {
      return;
    }

    previousBasis.current = basis;
    dispatch({ type: "RESET_BASIS_FILTERS" });
  }, [basis]);

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
  const [isLegendOpen, setIsLegendOpen] = React.useState(false);
  const handleToggleLegend = useCallback(() => {
    setIsLegendOpen((previous) => !previous);
  }, []);
  const { toast } = useToast();
  const persist = useCallback<PersistAction>(
    (...actions) => {
      startTransition(() => {
        for (const action of actions) {
          void (async () => {
            try {
              await action();
            } catch (error) {
              console.error("Failed to persist rankings preference", error);
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
    const filteredByWetbulbLevel =
      wetbulbLevelFilter.length > 0
        ? rankings.filter((r) =>
            wetbulbLevelFilter.includes(getWetbulbInfo(r.avg_wetbulb).level),
          )
        : rankings;

    const uniqueStates = [
      ...new Set(filteredByWetbulbLevel.map((r) => r.state)),
    ].toSorted((a, b) => a.localeCompare(b));
    return uniqueStates.map((state_) => ({ label: state_, value: state_ }));
  }, [rankings, wetbulbLevelFilter]);

  const wetbulbLevelOptions = useMemo(() => {
    const filteredByState =
      stateFilter.length > 0
        ? rankings.filter((r) => stateFilter.includes(r.state))
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
          earliestYear={earliestYear}
          wetbulbLevelFilter={wetbulbLevelFilter}
          wetbulbLevelOptions={wetbulbLevelOptions}
          isPending={isPending}
          persist={persist}
          region={region}
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
            <div className="rounded-3xl glass-panel xl:sticky xl:top-28 xl:p-6">
              <button
                aria-controls="rankings-wetbulb-index-legend"
                aria-expanded={isLegendOpen}
                className="flex w-full items-center justify-between gap-2 p-4 text-sm font-semibold text-foreground xl:hidden"
                onClick={handleToggleLegend}
                type="button"
              >
                {isLegendOpen ? "Hide Wetbulb Index" : "Show Wetbulb Index"}
                <span aria-hidden="true">{isLegendOpen ? "▲" : "▼"}</span>
              </button>
              <div
                className={`${isLegendOpen ? "block" : "hidden"} p-4 pt-0 xl:block xl:p-0`}
                id="rankings-wetbulb-index-legend"
              >
                <WetbulbIndexLegend />
              </div>
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
                      label={DATA_REGION_LABELS[region].subdivision}
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
                    <SortHeader
                      column="wetbulb_range"
                      currentColumn={sortColumn}
                      currentDirection={sortDirection}
                      dispatch={dispatch}
                      label="Wetbulb Range (5th-95th percentile)"
                    />
                    <SortHeader
                      column="change"
                      currentColumn={sortColumn}
                      currentDirection={sortDirection}
                      dispatch={dispatch}
                      label={`Change from ${baselineYear}`}
                    />
                    <SortHeader
                      column="forecast_range"
                      currentColumn={sortColumn}
                      currentDirection={sortDirection}
                      dispatch={dispatch}
                      label="2100 Forecast Range"
                    />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70 bg-transparent">
                  {paginatedRankings.length === 0 ? (
                    <tr>
                      <td
                        className="px-3 py-12 text-center text-sm text-muted-foreground"
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
