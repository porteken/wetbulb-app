import { ChartSkeleton } from "@/components/app/chart-skeleton";
import { APP_CONFIG } from "@/lib/constants";

export const LocationPageSkeleton = () => (
  <div className="min-h-screen">
    <div aria-hidden="true" className="glass-panel-muted">
      <div className="mx-auto flex h-16 w-full max-w-[1700px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <span className="brand-gradient-text text-lg font-black tracking-tight">
          {APP_CONFIG.NAME}
        </span>
        <div className="h-9 w-40 animate-pulse rounded-full graph-surface-panel" />
      </div>
    </div>

    <main
      aria-busy="true"
      aria-label="Loading location data"
      className="mx-auto w-full max-w-[1700px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10"
    >
      <div className="mb-8 h-24 animate-pulse overflow-hidden rounded-4xl glass-panel" />

      <div className="grid items-stretch gap-8 lg:grid-cols-2 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.25fr)] 2xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.35fr)]">
        <div className="h-[420px]">
          <ChartSkeleton />
        </div>
        <div className="h-[420px]">
          <ChartSkeleton />
        </div>
      </div>
    </main>
  </div>
);
