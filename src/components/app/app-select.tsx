"use client";

/* oxlint-disable react-perf/jsx-no-new-function-as-prop */

import {
  Select as SelectRoot,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { SearchIcon, XIcon } from "lucide-react";
import * as React from "react";

interface SelectOption {
  disabled?: boolean;
  key?: string;
  label: string;
  value?: string;
}

interface SelectGroupOption {
  group: string;
  items: SelectOption[];
  key?: string;
}

interface AppSelectProps {
  className?: string;
  contentClassName?: string;
  clearable?: boolean;
  data: (SelectOption | SelectGroupOption)[];
  disabled?: boolean;
  label?: string;
  onChange?: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  searchable?: boolean;
  value?: string;
  size?: "sm" | "default";
  "data-testid"?: string;
}

export function AppSelect({
  className,
  contentClassName,
  clearable,
  data,
  disabled,
  label,
  onChange,
  onClear,
  placeholder,
  searchable,
  value,
  size,
  "data-testid": testId,
}: AppSelectProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    let cleanup: (() => void) | undefined;

    if (open && searchable) {
      const frame = requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
      cleanup = () => {
        cancelAnimationFrame(frame);
      };
    }
    return () => {
      cleanup?.();
    };
  }, [open, searchable]);

  const filteredData = React.useMemo(() => {
    if (!searchTerm) return data;
    const lowerSearch = searchTerm.toLowerCase();

    return data
      .map((item) => {
        if ("group" in item) {
          const groupMatch = item.group.toLowerCase().includes(lowerSearch);
          const items = item.items.filter(
            (option) =>
              groupMatch || option.label.toLowerCase().includes(lowerSearch),
          );
          return items.length > 0 ? { ...item, items } : null;
        }
        return item.label.toLowerCase().includes(lowerSearch) ? item : null;
      })
      .filter((item) => item !== null);
  }, [data, searchTerm]);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </label>
      )}
      <div className="relative flex items-center gap-2">
        <SelectRoot
          disabled={disabled}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            if (!nextOpen) setSearchTerm("");
          }}
          onValueChange={onChange}
          open={open}
          value={value ?? ""}
        >
          <SelectTrigger className="w-full" data-testid={testId} size={size}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className={contentClassName}>
            {searchable && (
              <div className="sticky top-0 z-10 flex items-center border-b bg-popover px-3 py-2">
                <SearchIcon className="mr-2 size-4 shrink-0 opacity-50" />
                <input
                  className="flex h-8 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                  onKeyDown={(event) => {
                    event.stopPropagation();
                  }}
                  placeholder="Search..."
                  ref={searchInputRef}
                  value={searchTerm}
                />
              </div>
            )}
            {filteredData.map((item, index) => {
              if ("group" in item) {
                return (
                  <SelectGroup key={item.key ?? `group-${index}`}>
                    <SelectLabel data-testid="searchable-select-group-label">
                      {item.group}
                    </SelectLabel>
                    {item.items.map((option, optionIndex) => (
                      <SelectItem
                        data-testid="searchable-select-option"
                        disabled={option.disabled}
                        key={
                          option.key ?? option.value ?? `item-${optionIndex}`
                        }
                        value={option.value ?? option.key ?? ""}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                );
              }
              return (
                <SelectItem
                  data-testid="searchable-select-option"
                  disabled={item.disabled}
                  key={item.key ?? item.value ?? `item-${index}`}
                  value={item.value ?? item.key ?? ""}
                >
                  {item.label}
                </SelectItem>
              );
            })}
            {filteredData.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No results found.
              </div>
            )}
          </SelectContent>
        </SelectRoot>
        {clearable && value && (
          <button
            className="absolute right-8 flex size-4 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none disabled:pointer-events-none"
            onClick={(event) => {
              event.preventDefault();
              onClear?.();
            }}
            type="button"
          >
            <XIcon className="size-3" />
            <span className="sr-only">Clear</span>
          </button>
        )}
      </div>
    </div>
  );
}
