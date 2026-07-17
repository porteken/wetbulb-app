"use client";

import { useWetbulbBasis } from "@/components/app/basis-provider";
import { Button } from "@/components/ui/button";
import { useIgnorePersistenceError } from "@/hooks/use-ignore-persistence-error";
import { setWetbulbBasis } from "@/lib/actions/actions";
import { useRouter } from "next/navigation";
import * as React from "react";

export const BasisToggle = () => {
  const { basis, setBasis } = useWetbulbBasis();
  const ignorePersistenceError = useIgnorePersistenceError();
  const router = useRouter();

  const isMax = basis === "max";
  const nextBasis = isMax ? "avg" : "max";
  const label = `Switch to daily ${nextBasis === "max" ? "maximum" : "average"} wetbulb`;

  const handleToggle = React.useCallback(() => {
    setBasis(nextBasis);
    void ignorePersistenceError(setWetbulbBasis(nextBasis));
    router.refresh();
  }, [setBasis, nextBasis, ignorePersistenceError, router]);

  return (
    <Button
      aria-label={label}
      className="min-w-24 justify-center"
      onClick={handleToggle}
      size="sm"
      type="button"
      variant="outline"
    >
      <span>Daily {isMax ? "Max" : "Avg"}</span>
    </Button>
  );
};
