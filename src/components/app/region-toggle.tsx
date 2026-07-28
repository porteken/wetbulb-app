"use client";

import { useDataRegion } from "@/components/app/region-provider";
import { Button } from "@/components/ui/button";
import { useIgnorePersistenceError } from "@/hooks/use-ignore-persistence-error";
import { setDataRegion } from "@/lib/actions/actions";
import { DATA_REGION_LABELS } from "@/lib/constants";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";

const LOCATION_PATHNAME_PATTERN = /^\/\d+$/u;

export const RegionToggle = () => {
  const { region, setRegion } = useDataRegion();
  const ignorePersistenceError = useIgnorePersistenceError();
  const pathname = usePathname();
  const router = useRouter();

  const nextRegion = region === "na" ? "eu" : "na";
  const label = `Switch to ${DATA_REGION_LABELS[nextRegion].name}`;

  const handleToggle = React.useCallback(() => {
    setRegion(nextRegion);
    void ignorePersistenceError(setDataRegion(nextRegion));

    if (LOCATION_PATHNAME_PATTERN.test(pathname)) {
      router.push("/");
      return;
    }

    router.refresh();
  }, [setRegion, nextRegion, ignorePersistenceError, pathname, router]);

  return (
    <Button
      aria-label={label}
      className="justify-center sm:min-w-28"
      onClick={handleToggle}
      size="sm"
      type="button"
      variant="outline"
    >
      <span>{DATA_REGION_LABELS[region].short}</span>
    </Button>
  );
};
