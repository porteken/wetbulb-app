"use client";

import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";
import { Toast as ToastPrimitive } from "radix-ui";
import * as React from "react";

interface ToastMessage {
  description?: string;
  id: string;
  title: string;
  variant?: "default" | "destructive";
}

interface ToastContextValue {
  toast: (message: Omit<ToastMessage, "id">) => void;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(
  undefined,
);

const TOAST_DURATION_MS = 6000;

export function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

  const toast = React.useCallback((message: Omit<ToastMessage, "id">) => {
    setToasts((current) => [
      ...current,
      { ...message, id: crypto.randomUUID() },
    ]);
  }, []);

  const dismiss = React.useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const contextValue = React.useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={contextValue}>
      <ToastPrimitive.Provider duration={TOAST_DURATION_MS}>
        {children}
        {toasts.map((item) => (
          <ToastPrimitive.Root
            className={cn(
              "relative grid gap-1 rounded-lg border p-4 pr-8 shadow-lg data-closed:animate-out data-closed:fade-out-80 data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom-full",
              item.variant === "destructive"
                ? "border-destructive/40 bg-destructive text-white"
                : "border-border bg-popover text-popover-foreground",
            )}
            key={item.id}
            onOpenChange={(open) => {
              if (!open) {
                dismiss(item.id);
              }
            }}
          >
            <ToastPrimitive.Title className="text-sm font-semibold">
              {item.title}
            </ToastPrimitive.Title>
            {item.description && (
              <ToastPrimitive.Description className="text-sm opacity-90">
                {item.description}
              </ToastPrimitive.Description>
            )}
            <ToastPrimitive.Close
              aria-label="Close"
              className="absolute top-2 right-2 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
            >
              <XIcon className="size-4" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed right-0 bottom-0 z-19000 flex w-full max-w-sm flex-col gap-2 p-4 outline-none sm:right-4 sm:bottom-4" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = React.useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return context;
}
