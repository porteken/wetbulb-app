"use client";

import { cn } from "@/lib/utils";
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";
import { Popover } from "radix-ui";
import * as React from "react";

interface MultiSelectOption {
  label: string;
  value: string;
}

interface MultiSelectProps {
  className?: string;
  data: MultiSelectOption[];
  disabled?: boolean;
  label?: string;
  onChange?: (value: string[]) => void;
  placeholder?: string;
  searchable?: boolean;
  value: string[];
  "data-testid"?: string;
}

const getSelectionLabel = (
  value: string[],
  data: MultiSelectOption[],
  placeholder: string,
): string => {
  if (value.length === 0) {
    return placeholder;
  }
  if (value.length === 1) {
    const selectedValue = value[0] ?? placeholder;
    return (
      data.find((option) => option.value === selectedValue)?.label ??
      selectedValue
    );
  }
  return `${value.length} selected`;
};

export function MultiSelect({
  className,
  data,
  disabled,
  label,
  onChange,
  placeholder = "Select options",
  searchable = false,
  value,
  "data-testid": testId,
}: Readonly<MultiSelectProps>) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    let frame: number | undefined;
    if (open && searchable) {
      frame = requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }
    return () => {
      if (frame !== undefined) {
        cancelAnimationFrame(frame);
      }
    };
  }, [open, searchable]);

  const filteredData = React.useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return normalizedSearch === ""
      ? data
      : data.filter((option) =>
          option.label.toLowerCase().includes(normalizedSearch),
        );
  }, [data, searchTerm]);

  const selectedValues = React.useMemo(() => new Set(value), [value]);
  const selectionLabel = getSelectionLabel(value, data, placeholder);

  const toggleValue = (optionValue: string) => {
    onChange?.(
      selectedValues.has(optionValue)
        ? value.filter((item) => item !== optionValue)
        : [...value, optionValue],
    );
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <span className="text-sm leading-none font-medium">{label}</span>
      )}
      <Popover.Root
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setSearchTerm("");
        }}
        open={open}
      >
        <Popover.Trigger asChild>
          <button
            aria-expanded={open}
            aria-haspopup="listbox"
            className={cn(
              "flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm outline-none transition-colors",
              "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:hover:bg-input/50",
              value.length === 0 && "text-muted-foreground",
            )}
            data-testid={testId}
            disabled={disabled}
            type="button"
          >
            <span className="truncate">{selectionLabel}</span>
            <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            className="z-[12000] max-h-72 w-(--radix-popover-trigger-width) min-w-48 overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
            sideOffset={4}
          >
            {searchable && (
              <input
                aria-label={`Search ${label ?? "options"}`}
                className="mb-1 h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                }}
                placeholder="Search..."
                ref={searchInputRef}
                value={searchTerm}
              />
            )}
            {value.length > 0 && (
              <button
                className="mb-1 flex w-full items-center justify-center gap-1 rounded-md border-b px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={() => {
                  onChange?.([]);
                }}
                type="button"
              >
                <XIcon className="size-3" />
                Clear all
              </button>
            )}
            <div aria-label={label ?? "Options"}>
              {filteredData.map((option) => {
                const selected = selectedValues.has(option.value);
                return (
                  <button
                    aria-pressed={selected}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-accent focus-visible:bg-accent"
                    key={option.value}
                    onClick={() => {
                      toggleValue(option.value);
                    }}
                    type="button"
                  >
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded border border-input",
                        selected &&
                          "border-primary bg-primary text-primary-foreground",
                      )}
                    >
                      {selected && <CheckIcon className="size-3" />}
                    </span>
                    {option.label}
                  </button>
                );
              })}
              {filteredData.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No results found.
                </p>
              )}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
