import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import * as React from "react";

/* oxlint-disable react-perf/jsx-no-new-function-as-prop */

interface AppPaginationProps {
  onChange: (page: number) => void;
  total: number;
  value: number;
}

export function AppPagination({ onChange, total, value }: AppPaginationProps) {
  const pages = React.useMemo(() => {
    const items: (number | string)[] = [];
    const maxVisible = 5;
    if (total <= maxVisible) {
      for (let page = 1; page <= total; page++) items.push(page);
    } else {
      items.push(1);
      if (value > 3) items.push("ellipsis-1");
      for (
        let page = Math.max(2, value - 1);
        page <= Math.min(total - 1, value + 1);
        page++
      ) {
        if (!items.includes(page)) items.push(page);
      }
      if (value < total - 2) items.push("ellipsis-2");
      if (!items.includes(total)) items.push(total);
    }
    return items;
  }, [total, value]);

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <Button
            aria-label="Go to previous page"
            className="pl-1.5!"
            disabled={value <= 1}
            onClick={() => {
              onChange(value - 1);
            }}
            size="default"
            type="button"
            variant="ghost"
          >
            <ChevronLeftIcon data-icon="inline-start" />
            <span className="hidden sm:block">Previous</span>
          </Button>
        </PaginationItem>
        {pages.map((page) => (
          <PaginationItem
            key={typeof page === "string" ? page : `page-${page}`}
          >
            {typeof page === "number" ? (
              <Button
                aria-current={page === value ? "page" : undefined}
                data-active={page === value}
                onClick={() => {
                  onChange(page);
                }}
                size="icon"
                type="button"
                variant={page === value ? "outline" : "ghost"}
              >
                {page}
              </Button>
            ) : (
              <PaginationEllipsis />
            )}
          </PaginationItem>
        ))}
        <PaginationItem>
          <Button
            aria-label="Go to next page"
            className="pr-1.5!"
            disabled={value >= total}
            onClick={() => {
              onChange(value + 1);
            }}
            size="default"
            type="button"
            variant="ghost"
          >
            <span className="hidden sm:block">Next</span>
            <ChevronRightIcon data-icon="inline-end" />
          </Button>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
